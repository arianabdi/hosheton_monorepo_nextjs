import axios from 'axios';
import { uploadFileInChunks } from '@/app/utils/chunkUploader/chunkUploader';
import {
    deleteStoredFile,
    deleteUploadJob,
    getAllUploadJobs,
    getStoredFile,
    getUploadJob,
    saveUploadJob,
} from '@/app/utils/uploadQueue/uploadQueueDb';
import type { UploadJob } from '@/app/utils/uploadQueue/types';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';

type JobUpdateListener = (jobs: UploadJob[]) => void;

class UploadQueueProcessor {
    private isProcessing = false;
    private isGloballyPaused = false;
    private abortController: AbortController | null = null;
    private isPausedRef = { current: false };
    private listeners = new Set<JobUpdateListener>();
    private isSubscribed = false;

    subscribe(listener: JobUpdateListener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    ensureListener(listener: JobUpdateListener) {
        if (this.isSubscribed) return () => this.listeners.delete(listener);
        this.isSubscribed = true;
        return this.subscribe(listener);
    }

    private notify(jobs: UploadJob[]) {
        this.listeners.forEach((listener) => listener(jobs));
    }

    private async refreshJobs(): Promise<UploadJob[]> {
        const jobs = await getAllUploadJobs();
        this.notify(jobs);
        return jobs;
    }

    async hydrate() {
        const jobs = await getAllUploadJobs();

        for (const job of jobs) {
            if (job.status === 'uploading') {
                await saveUploadJob({
                    ...job,
                    status: 'pending',
                    updatedAt: Date.now(),
                });
            }
        }

        return this.refreshJobs();
    }

    pauseAll() {
        this.isGloballyPaused = true;
        this.isPausedRef.current = true;
        this.abortController?.abort();
    }

    resumeAll() {
        this.isGloballyPaused = false;
        this.isPausedRef.current = false;
        void this.processNext();
    }

    async pauseJob(jobId: string) {
        const job = await getUploadJob(jobId);
        if (!job) return;

        if (job.status === 'uploading') {
            this.isPausedRef.current = true;
            this.abortController?.abort();
        }

        await saveUploadJob({
            ...job,
            status: 'paused',
            updatedAt: Date.now(),
        });

        await this.refreshJobs();
    }

    async resumeJob(jobId: string) {
        const job = await getUploadJob(jobId);
        if (!job || job.status === 'completed') return;

        await saveUploadJob({
            ...job,
            status: 'pending',
            error: undefined,
            updatedAt: Date.now(),
        });

        this.isGloballyPaused = false;
        this.isPausedRef.current = false;
        await this.refreshJobs();
        void this.processNext();
    }

    async retryJob(jobId: string) {
        await this.resumeJob(jobId);
    }

    async removeJob(jobId: string) {
        const job = await getUploadJob(jobId);
        if (!job) return;

        if (job.status === 'uploading') {
            this.abortController?.abort();
        }

        localStorage.removeItem(job.storageKey);
        await deleteUploadJob(job.id);
        await deleteStoredFile(job.fileId);
        await this.refreshJobs();
    }

    async clearCompleted() {
        const jobs = await getAllUploadJobs();

        for (const job of jobs) {
            if (job.status === 'completed') {
                await deleteUploadJob(job.id);
                await deleteStoredFile(job.fileId);
            }
        }

        await this.refreshJobs();
    }

    async start() {
        if (this.isGloballyPaused) return;
        void this.processNext();
    }

    private async processNext() {
        if (this.isProcessing || this.isGloballyPaused) return;

        const jobs = await getAllUploadJobs();
        const nextJob = jobs.find((job) => job.status === 'pending');

        if (!nextJob) {
            await this.refreshJobs();
            return;
        }

        this.isProcessing = true;
        this.isPausedRef.current = false;
        this.abortController = new AbortController();

        try {
            await this.processJob(nextJob);
        } finally {
            this.isProcessing = false;
            this.abortController = null;

            if (!this.isGloballyPaused) {
                void this.processNext();
            }
        }
    }

    private async processJob(job: UploadJob) {
        const storedFile = await getStoredFile(job.fileId);
        if (!storedFile) {
            await saveUploadJob({
                ...job,
                status: 'failed',
                error: 'فایل در حافظه مرورگر پیدا نشد',
                updatedAt: Date.now(),
            });
            await this.refreshJobs();
            return;
        }

        const { token } = useAuthStore.getState();
        const { baseUrl } = useAppStore.getState();

        if (!token || !baseUrl) {
            await saveUploadJob({
                ...job,
                status: 'paused',
                error: 'برای ادامه آپلود باید وارد حساب شوید',
                updatedAt: Date.now(),
            });
            await this.refreshJobs();
            return;
        }

        const uploadingJob: UploadJob = {
            ...job,
            status: 'uploading',
            error: undefined,
            updatedAt: Date.now(),
        };
        await saveUploadJob(uploadingJob);
        await this.refreshJobs();

        const file = new File([storedFile.blob], storedFile.name, {
            type: storedFile.type,
            lastModified: storedFile.lastModified,
        });

        try {
            const uploadResult = await uploadFileInChunks({
                file,
                token,
                baseUrl,
                storageKey: job.storageKey,
                metadata: {
                    filmId: job.filmId,
                    seasonId: job.seasonId,
                    episodeId: job.episodeId,
                    resolution: job.resolution,
                },
                abortSignal: this.abortController?.signal,
                isPausedRef: this.isPausedRef,
                onProgress: async (progress) => {
                    await saveUploadJob({
                        ...(await getUploadJob(job.id))!,
                        progress,
                        updatedAt: Date.now(),
                    });
                    await this.refreshJobs();
                },
            });

            if (!uploadResult) {
                const currentJob = await getUploadJob(job.id);
                if (!currentJob) return;

                await saveUploadJob({
                    ...currentJob,
                    status: this.isGloballyPaused || this.isPausedRef.current ? 'paused' : 'pending',
                    updatedAt: Date.now(),
                });
                await this.refreshJobs();
                return;
            }

            const targetFileId = uploadResult.fileInfo?._id || uploadResult.original?._id;

            await axios.post(
                `${baseUrl}/api/films/${job.filmId}/videos`,
                {
                    resolution: job.resolution,
                    fileId: targetFileId,
                    seasonId: job.seasonId || null,
                    episodeId: job.episodeId || null,
                    size: file.size,
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            await saveUploadJob({
                ...(await getUploadJob(job.id))!,
                status: 'completed',
                progress: 100,
                updatedAt: Date.now(),
            });

            await deleteStoredFile(job.fileId);
            await this.refreshJobs();
        } catch (error: any) {
            const currentJob = await getUploadJob(job.id);
            if (!currentJob) return;

            const errorMessage =
                error?.response?.data?.error ||
                error?.response?.data?.message ||
                error?.message ||
                'خطا در آپلود';

            await saveUploadJob({
                ...currentJob,
                status: navigator.onLine ? 'failed' : 'pending',
                error: errorMessage,
                updatedAt: Date.now(),
            });
            await this.refreshJobs();
        }
    }
}

export const uploadQueueProcessor = new UploadQueueProcessor();

if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
        uploadQueueProcessor.resumeAll();
    });
}
