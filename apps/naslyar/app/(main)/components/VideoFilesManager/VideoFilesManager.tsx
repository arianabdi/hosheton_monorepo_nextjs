'use client';

import React, { useMemo, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import styles from './VideoFilesManager.module.scss';
import { ErrorToaster, toFarsiNumber } from '@my-workspace/utils';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useUploadQueueStore } from '@/app/zustand/store/useUploadQueueStore';

interface VideoFile {
    _id: string;
    resolution: string;
    fileId: string;
    size: number;
}

interface Props {
    id: string;
    filmId: any;
    filmName?: string;
    seasonId?: any;
    episodeId?: any;
    episodeTitle?: string;
    videos: VideoFile[];
    contentType?: 'MOVIE' | 'SERIES';
    onUpdate: () => void;
}

const RESOLUTIONS = ['1080p', '720p', '480p', '360p', '240p'];

const formatSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${['B', 'KB', 'MB', 'GB'][i]}`;
};

export default function VideoFilesManager({
    id,
    filmId,
    filmName,
    videos = [],
    contentType = 'MOVIE',
    seasonId,
    episodeId,
    episodeTitle,
    onUpdate,
}: Props) {
    const { baseUrl } = useAppStore();
    const addJobs = useUploadQueueStore((state) => state.addJobs);
    const queueJobs = useUploadQueueStore((state) => state.jobs);
    const setSidebarOpen = useUploadQueueStore((state) => state.setSidebarOpen);

    const [resolution, setResolution] = useState('');
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [isAddingToQueue, setIsAddingToQueue] = useState(false);

    const inputUniqueId = `video-file-input-${id || episodeId || seasonId || Math.random().toString(36).substring(2, 9)}`;

    const relatedQueueJobs = useMemo(
        () =>
            queueJobs.filter(
                (job) =>
                    job.filmId === filmId &&
                    (job.episodeId || null) === (episodeId || null) &&
                    (job.seasonId || null) === (seasonId || null) &&
                    job.status !== 'completed'
            ),
        [queueJobs, filmId, episodeId, seasonId]
    );

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;
        setSelectedFiles(Array.from(e.target.files));
    };

    const handleAddToQueue = async () => {
        if (!filmId) return toast.error('لطفا ابتدا فیلم را ایجاد کنید');
        if (!resolution) return toast.error('رزولوشن را مشخص کنید');
        if (selectedFiles.length === 0) return toast.error('حداقل یک فایل انتخاب کنید');

        setIsAddingToQueue(true);

        try {
            await addJobs(
                selectedFiles.map((file) => ({
                    file,
                    filmId,
                    filmName,
                    seasonId: seasonId || null,
                    episodeId: episodeId || null,
                    episodeTitle,
                    resolution,
                    contentType,
                }))
            );

            toast.success(`${toFarsiNumber(selectedFiles.length)} فایل به صف آپلود اضافه شد`);
            setSelectedFiles([]);
            setSidebarOpen(true);
        } catch (error) {
            console.error(error);
            toast.error('خطا در افزودن فایل‌ها به صف آپلود');
        } finally {
            setIsAddingToQueue(false);
        }
    };

    const handleDelete = async (videoId: string, res: string) => {
        if (!confirm(`آیا از حذف ویدیو ${res} مطمئن هستید؟`)) return;

        try {
            await axios.delete(
                contentType === 'MOVIE'
                    ? `${baseUrl}/api/films/${filmId}/videos/${videoId}`
                    : `${baseUrl}/api/films/${filmId}/videos/${seasonId}/${episodeId}/${videoId}`
            );
            toast.success('ویدیو حذف شد');
            onUpdate();
        } catch (err: any) {
            toast.error('خطا در حذف ویدیو');
        }
    };

    return (
        <div className={`${styles.wrapper} ${!filmId ? styles.disabled : ''}`}>
            <div className={styles.header}>
                <h4>
                    آپلود شده ها <span>({toFarsiNumber(videos.length) || '۰'})</span>
                </h4>
                {!filmId && <span className={styles.alertText}>ابتدا اطلاعات فیلم را ثبت کنید</span>}
            </div>

            {videos.length > 0 && (
                <div className={styles.tagCloud}>
                    {videos.map((video) => (
                        <div key={video._id} className={styles.videoTag} title={`ID: ${video.fileId}`}>
                            <div className={styles.tagContent}>
                                <span className={styles.tagRes}>{video.resolution}</span>
                                <span className={styles.tagSize}>{video._id}</span>
                            </div>
                            <div className={styles.tagContent}>
                                <span className={styles.tagSize}>{formatSize(video.size)}</span>
                                <button
                                    onClick={() => handleDelete(video._id, video.resolution)}
                                    className={styles.tagDelete}
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {relatedQueueJobs.length > 0 && (
                <div className={styles.queueHint}>
                    <span>
                        {toFarsiNumber(relatedQueueJobs.length)} فایل در صف آپلود این بخش فعال است. مدیریت کامل از
                        سایدبار صف انجام می‌شود.
                    </span>
                    <button type="button" onClick={() => setSidebarOpen(true)} className={styles.openQueueBtn}>
                        نمایش صف
                    </button>
                </div>
            )}

            <div className={styles.actionRow}>
                <select
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    className={styles.select}
                    disabled={!filmId || isAddingToQueue}
                >
                    <option value="">رزولوشن</option>
                    {RESOLUTIONS.map((item) => (
                        <option key={item} value={item}>
                            {item}
                        </option>
                    ))}
                </select>

                <div className={styles.uploadZone}>
                    <input
                        type="file"
                        id={inputUniqueId}
                        accept="video/*"
                        multiple
                        onChange={handleFileChange}
                        disabled={!filmId || isAddingToQueue}
                        className={styles.hiddenInput}
                    />
                    <label htmlFor={inputUniqueId} className={styles.uploadLabel}>
                        {selectedFiles.length > 0 ? (
                            <span className={styles.previewInfo} title={selectedFiles.map((file) => file.name).join(', ')}>
                                🎥 {toFarsiNumber(selectedFiles.length)} فایل انتخاب شده
                            </span>
                        ) : (
                            <span>📁 انتخاب یک یا چند فایل ویدیو...</span>
                        )}
                    </label>
                    {selectedFiles.length > 0 && !isAddingToQueue && (
                        <button
                            className={styles.clearFile}
                            onClick={() => setSelectedFiles([])}
                            type="button"
                        >
                            ✕
                        </button>
                    )}
                </div>

                <button
                    onClick={handleAddToQueue}
                    disabled={!filmId || selectedFiles.length === 0 || !resolution || isAddingToQueue}
                    className={styles.submitBtn}
                    type="button"
                >
                    {isAddingToQueue ? 'در حال افزودن...' : 'افزودن به صف آپلود'}
                </button>
            </div>

            {selectedFiles.length > 0 && (
                <div className={styles.selectedFilesList}>
                    {selectedFiles.slice(0, 5).map((file) => (
                        <div key={`${file.name}-${file.size}-${file.lastModified}`} className={styles.selectedFileItem}>
                            <span>{file.name}</span>
                            <span>{formatSize(file.size)}</span>
                        </div>
                    ))}
                    {selectedFiles.length > 5 && (
                        <div className={styles.selectedFileItem}>
                            و {toFarsiNumber(selectedFiles.length - 5)} فایل دیگر...
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
