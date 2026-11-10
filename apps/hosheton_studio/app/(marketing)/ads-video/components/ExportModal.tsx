'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LuDownload, LuLoaderCircle } from 'react-icons/lu';
import { ModalHelper } from '@my-workspace/components';
import { adsVideoApi, type AdsExportJob, type AdsProject } from '../lib/ads-video-api';
import styles from '../AdsVideo.module.scss';

export interface ExportModalProps {
    open: boolean;
    project: AdsProject | null;
    onClose(): void;
    onStarted?(job: AdsExportJob): void;
}

/**
 * خروجی‌گیری نهایی: صداگذاری کات‌ها + رندر ffmpeg در پس‌زمینه و پیگیری وضعیت با polling.
 */
export function ExportModal({ open, project, onClose, onStarted }: ExportModalProps) {
    const { t, i18n } = useTranslation('adsVideo');
    const [resolution, setResolution] = useState('1080p');
    const [fps, setFps] = useState<number>(30);
    const [includeVoiceover, setIncludeVoiceover] = useState(true);
    const [includeSfx, setIncludeSfx] = useState(true);
    const [starting, setStarting] = useState(false);
    const [exports, setExports] = useState<AdsExportJob[]>([]);
    const [error, setError] = useState('');
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const statusLabel = (status: string) => t(`status_${status}`, { defaultValue: status });

    const refresh = useCallback(async () => {
        if (!project) return;
        try {
            const res = await adsVideoApi.listExports(project._id);
            setExports(res.exports || []);
        } catch {
            /* polling error ignored */
        }
    }, [project]);

    useEffect(() => {
        if (!open || !project) return;
        setFps(project.fps || 30);
        void refresh();
        pollRef.current = setInterval(() => void refresh(), 4000);
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = null;
        };
    }, [open, project, refresh]);

    const start = async () => {
        if (!project) return;
        setStarting(true);
        setError('');
        try {
            const res = await adsVideoApi.startExport(project._id, {
                resolution,
                fps,
                includeVoiceover,
                includeSfx,
            });
            onStarted?.(res.export);
            await refresh();
        } catch (err) {
            const message = (err as { response?: { data?: { message?: string } } } | null)?.response?.data?.message;
            setError(message || t('err_export_start'));
        } finally {
            setStarting(false);
        }
    };

    const hasActive = exports.some((item) => item.status === 'queued' || item.status === 'rendering');

    return (
        <ModalHelper
            open={open}
            onClose={onClose}
            size="md"
            sheetTitle={t('export_title')}
            component={(
                <div className={styles.modalTheme}>
                    <div className={styles.modalHead}>
                        <h3>{t('export_title')}</h3>
                    </div>

                    <div className={styles.exportForm}>
                        <label>
                            {t('export_quality')}
                            <select value={resolution} onChange={(e) => setResolution(e.target.value)}>
                                <option value="1080p">1080p</option>
                                <option value="720p">720p</option>
                            </select>
                        </label>
                        <label>
                            {t('export_fps')}
                            <select value={fps} onChange={(e) => setFps(Number(e.target.value))}>
                                <option value={24}>24</option>
                                <option value={25}>25</option>
                                <option value={30}>30</option>
                                <option value={60}>60</option>
                            </select>
                        </label>
                        <label className={styles.checkRow}>
                            <input type="checkbox" checked={includeVoiceover} onChange={(e) => setIncludeVoiceover(e.target.checked)} />
                            {t('export_voiceover')}
                        </label>
                        <label className={styles.checkRow}>
                            <input type="checkbox" checked={includeSfx} onChange={(e) => setIncludeSfx(e.target.checked)} />
                            {t('export_sfx')}
                        </label>
                        <button type="button" className={styles.primaryBtn} disabled={starting || !project} onClick={() => void start()}>
                            {starting ? <LuLoaderCircle size={14} className={styles.spin} /> : null}
                            {t('export_start')}
                        </button>
                        {error && <div className={styles.formError}>{error}</div>}
                    </div>

                    <div className={styles.exportList}>
                        <h4>
                            {t('export_previous')} {hasActive && <span className={styles.pulse}>{t('export_rendering')}</span>}
                        </h4>
                        {exports.length === 0 ? (
                            <div className={styles.modalEmpty}>{t('export_empty')}</div>
                        ) : (
                            <ul>
                                {exports.map((item) => (
                                    <li key={item.jobId} className={styles.exportRow}>
                                        <span className={`${styles.exportStatus} ${styles[`status_${item.status}`]}`}>
                                            {statusLabel(item.status)}
                                        </span>
                                        <span className={styles.exportMeta}>
                                            {item.resolution} · {item.fps}fps
                                            {item.durationSeconds ? ` · ${item.durationSeconds}s` : ''}
                                            {item.status === 'rendering' && item.progress ? ` · ${item.progress}` : ''}
                                        </span>
                                        <span className={styles.exportDate}>
                                            {item.createdAt ? new Date(item.createdAt).toLocaleString(i18n.language) : ''}
                                        </span>
                                        {item.status === 'completed' && item.videoUrl && (
                                            <a className={styles.primaryBtn} href={item.videoUrl} target="_blank" rel="noreferrer">
                                                <LuDownload size={13} />
                                                {t('download')}
                                            </a>
                                        )}
                                        {item.status === 'failed' && item.error && (
                                            <span className={styles.exportError} title={item.error}>{item.error}</span>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}
        />
    );
}

export default ExportModal;
