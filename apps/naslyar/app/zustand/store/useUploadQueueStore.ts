import { create } from 'zustand';
import {
    addUploadJob,
    getAllUploadJobs,
    resetInterruptedUploadJobs,
} from '@/app/utils/uploadQueue/uploadQueueDb';
import { uploadQueueProcessor } from '@/app/utils/uploadQueue/uploadQueueProcessor';
import type { AddUploadJobInput, UploadJob } from '@/app/utils/uploadQueue/types';

interface UploadQueueState {
    jobs: UploadJob[];
    isHydrated: boolean;
    isSidebarOpen: boolean;
    lastCompletedFilmId: string | null;
    hydrate: () => Promise<void>;
    addJob: (input: AddUploadJobInput) => Promise<UploadJob>;
    addJobs: (inputs: AddUploadJobInput[]) => Promise<UploadJob[]>;
    setJobs: (jobs: UploadJob[]) => void;
    setSidebarOpen: (open: boolean) => void;
    toggleSidebar: () => void;
    pauseAll: () => Promise<void>;
    resumeAll: () => Promise<void>;
    pauseJob: (jobId: string) => Promise<void>;
    resumeJob: (jobId: string) => Promise<void>;
    retryJob: (jobId: string) => Promise<void>;
    removeJob: (jobId: string) => Promise<void>;
    clearCompleted: () => Promise<void>;
}

export const useUploadQueueStore = create<UploadQueueState>((set, get) => ({
    jobs: [],
    isHydrated: false,
    isSidebarOpen: false,
    lastCompletedFilmId: null,

    hydrate: async () => {
        await resetInterruptedUploadJobs();
        const jobs = await uploadQueueProcessor.hydrate();
        set({ jobs, isHydrated: true });

        uploadQueueProcessor.ensureListener((nextJobs) => {
            const previousJobs = get().jobs;
            const newlyCompleted = nextJobs.find(
                (job) =>
                    job.status === 'completed' &&
                    !previousJobs.some((prev) => prev.id === job.id && prev.status === 'completed')
            );

            set({
                jobs: nextJobs,
                lastCompletedFilmId: newlyCompleted?.filmId ?? get().lastCompletedFilmId,
            });
        });

        const hasPending = jobs.some(
            (job) => job.status === 'pending' || job.status === 'failed'
        );

        if (hasPending) {
            set({ isSidebarOpen: true });
            await uploadQueueProcessor.start();
        }
    },

    addJob: async (input) => {
        const job = await addUploadJob(input);
        const jobs = await getAllUploadJobs();
        set({ jobs, isSidebarOpen: true });
        await uploadQueueProcessor.start();
        return job;
    },

    addJobs: async (inputs) => {
        const createdJobs: UploadJob[] = [];

        for (const input of inputs) {
            createdJobs.push(await addUploadJob(input));
        }

        const jobs = await getAllUploadJobs();
        set({ jobs, isSidebarOpen: true });
        await uploadQueueProcessor.start();
        return createdJobs;
    },

    setJobs: (jobs) => set({ jobs }),

    setSidebarOpen: (open) => set({ isSidebarOpen: open }),

    toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

    pauseAll: async () => {
        uploadQueueProcessor.pauseAll();
        const jobs = await getAllUploadJobs();

        for (const job of jobs) {
            if (job.status === 'pending' || job.status === 'uploading') {
                await uploadQueueProcessor.pauseJob(job.id);
            }
        }
    },

    resumeAll: async () => {
        uploadQueueProcessor.resumeAll();
    },

    pauseJob: async (jobId) => {
        await uploadQueueProcessor.pauseJob(jobId);
    },

    resumeJob: async (jobId) => {
        await uploadQueueProcessor.resumeJob(jobId);
    },

    retryJob: async (jobId) => {
        await uploadQueueProcessor.retryJob(jobId);
    },

    removeJob: async (jobId) => {
        await uploadQueueProcessor.removeJob(jobId);
    },

    clearCompleted: async () => {
        await uploadQueueProcessor.clearCompleted();
    },
}));
