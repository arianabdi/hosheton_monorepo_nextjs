'use client';

import React, { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { LuDownload, LuCircleHelp, LuLoader, LuCheck, LuCircleAlert } from 'react-icons/lu';
import { mediaApi } from '@/app/(developers)/projects/lib/media-api';
import { getApiErrorMessage } from '@/app/(developers)/projects/lib/api-client';
import { resolveStageLabel } from '@/app/(developers)/projects/lib/process-run-status';
import type { MediaJobLog } from '@/app/(developers)/projects/types/media-api';
import nodeStyles from '@/app/(developers)/projects/components/NodeSettingsPanel.module.scss';
import styles from './VideoEditorExportPanel.module.scss';
import { MobileEditorScreen, mobileEditorStyles } from './MobileEditor/MobileEditor';

type ExportPhase = 'idle' | 'saving' | 'starting' | 'rendering' | 'done' | 'error';

type VideoEditorExportPanelProps = {
    projectId: string;
    onBeforeExport?: () => Promise<void>;
    onExportStarted?: (runId: string) => void;
    liveLogs?: MediaJobLog[];
    /** Mobile: render as a full-screen export page (settings above, sticky button below). */
    screen?: {
        title: string;
        icon?: ReactNode;
        dir: 'rtl' | 'ltr';
        onClose: () => void;
        secondaryAction?: ReactNode;
    };
    /** Export settings shown above the status blocks on the mobile page. */
    children?: ReactNode;
};

export function VideoEditorExportPanel({
    projectId,
    onBeforeExport,
    onExportStarted,
    liveLogs = [],
    screen,
    children,
}: VideoEditorExportPanelProps) {
    const { t } = useTranslation('videoEditor');
    const { t: tp } = useTranslation('projects');
    const [phase, setPhase] = useState<ExportPhase>('idle');
    const [error, setError] = useState<string | null>(null);
    const [activeRunId, setActiveRunId] = useState<string | null>(null);
    const [exportLogs, setExportLogs] = useState<MediaJobLog[]>([]);
    const [outputUrl, setOutputUrl] = useState<string | null>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const stopPolling = useCallback(() => {
        if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }
    }, []);

    const mergeLogs = useCallback((fetched: MediaJobLog[], runId: string) => {
        const liveForRun = liveLogs.filter((log) => log.runId === runId);
        const seen = new Set<string>();
        return [...fetched, ...liveForRun]
            .filter((log) => {
                const key = log._id || `${log.stage}-${log.message}-${log.createdAt}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            })
            .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
    }, [liveLogs]);

    const applyLogs = useCallback((logs: MediaJobLog[]) => {
        setExportLogs(logs);

        const completed = [...logs].reverse().find(
            (log) => log.stage === 'completed' && typeof log.meta?.outputUrl === 'string',
        );
        const failed = [...logs].reverse().find(
            (log) => log.stage === 'failed' || (log.level === 'error' && log.stage !== 'completed'),
        );

        if (completed?.meta?.outputUrl) {
            setOutputUrl(String(completed.meta.outputUrl));
            setPhase('done');
            stopPolling();
            return;
        }

        if (failed) {
            setError(failed.errorDetail?.message || failed.message);
            setPhase('error');
            stopPolling();
        }
    }, [stopPolling]);

    const pollRun = useCallback((runId: string) => {
        // Progress is driven primarily by the live `job:log` socket events
        // (merged via liveLogs); this slow poll is only a reconnect fallback.
        stopPolling();
        pollRef.current = setInterval(() => {
            void mediaApi.getRunLogs(projectId, runId)
                .then(({ logs }) => applyLogs(mergeLogs(logs ?? [], runId)))
                .catch(() => undefined);
        }, 10000);
    }, [applyLogs, mergeLogs, projectId, stopPolling]);

    useEffect(() => {
        if (!activeRunId) return;
        setExportLogs((current) => mergeLogs(current, activeRunId));
    }, [activeRunId, liveLogs, mergeLogs]);

    useEffect(() => () => stopPolling(), [stopPolling]);

    const handleExport = async () => {
        setPhase('saving');
        setError(null);
        setOutputUrl(null);
        setExportLogs([]);
        setActiveRunId(null);
        stopPolling();

        try {
            if (onBeforeExport) {
                await onBeforeExport();
            }

            setPhase('starting');
            const result = await mediaApi.exportVideoEditor(projectId);
            setActiveRunId(result.runId);
            setPhase('rendering');
            onExportStarted?.(result.runId);

            const { logs } = await mediaApi.getRunLogs(projectId, result.runId);
            applyLogs(mergeLogs(logs ?? [], result.runId));
            pollRun(result.runId);
        } catch (err) {
            setError(getApiErrorMessage(err));
            setPhase('error');
            stopPolling();
        }
    };

    const isBusy = phase === 'saving' || phase === 'starting' || phase === 'rendering';

    const exportLabel = (
        <>
            {isBusy ? <LuLoader className={styles.spin} /> : <LuDownload />}
            {phase === 'saving' && t('saving_timeline')}
            {phase === 'starting' && t('starting_export')}
            {phase === 'rendering' && t('rendering_mp4')}
            {(phase === 'idle' || phase === 'done' || phase === 'error') && t('build_mp4')}
        </>
    );

    const statusBlocks = (
        <>
            {phase === 'rendering' && (
                <p className={styles.statusHint}>
                    {t('render_bg')}
                </p>
            )}

            {error && (
                <p className={styles.error}>
                    <LuCircleAlert style={{ verticalAlign: -2, marginInlineEnd: 4 }} />
                    {error}
                </p>
            )}

            {phase === 'done' && outputUrl && (
                <div className={`${styles.resultBox} ${styles.resultSuccess}`}>
                    <p>
                        <LuCheck style={{ verticalAlign: -2, marginInlineEnd: 4 }} />
                        {t('mp4_ready')}
                    </p>
                    <a href={outputUrl} target="_blank" rel="noreferrer" className={styles.downloadLink}>
                        {t('download_file')}
                    </a>
                </div>
            )}

            {exportLogs.length > 0 && (
                <div className={styles.progressBox}>
                    <div className={styles.progressTitle}>{t('export_progress')}</div>
                    <ul className={styles.progressList}>
                        {exportLogs.map((log, idx) => (
                            <li
                                key={log._id || idx}
                                className={`${styles.progressItem} ${styles[`level_${log.level}`] ?? ''}`}
                            >
                                <span className={styles.progressStage}>{resolveStageLabel(tp, log)}</span>
                                <span className={styles.progressMessage}>{log.message}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {activeRunId && (
                <p className={nodeStyles.panelMeta}>
                    {t('run_id', { id: activeRunId })}
                </p>
            )}
        </>
    );

    if (screen) {
        return (
            <MobileEditorScreen
                title={screen.title}
                icon={screen.icon}
                dir={screen.dir}
                onClose={screen.onClose}
                footer={(
                    <>
                        <button
                            type="button"
                            className={mobileEditorStyles.primaryBtn}
                            onClick={handleExport}
                            disabled={isBusy}
                        >
                            {exportLabel}
                        </button>
                        {screen.secondaryAction}
                    </>
                )}
            >
                {children}
                {statusBlocks}
            </MobileEditorScreen>
        );
    }

    return (
        <div className={nodeStyles.settingsPanel}>
            <h3 className={nodeStyles.panelTitle}>
                <LuDownload style={{ verticalAlign: -2, marginInlineEnd: 6 }} />
                {t('export_final')}
            </h3>

            <div className={styles.guideBox}>
                <div className={styles.guideTitle}>
                    <LuCircleHelp />
                    {t('short_guide')}
                </div>
                <ol className={styles.guideList}>
                    <li>{t('save_guide')}</li>
                    <li>{t('preview_guide')}</li>
                    <li>{t('export_guide')}</li>
                </ol>
            </div>

            <button
                type="button"
                className={styles.exportBtn}
                onClick={handleExport}
                disabled={isBusy}
            >
                {exportLabel}
            </button>

            {statusBlocks}
        </div>
    );
}
