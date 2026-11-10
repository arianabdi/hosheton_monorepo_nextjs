'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    LuRefreshCw, LuChevronLeft, LuChevronRight, LuCopy, LuDownload,
    LuCircleCheck, LuCircleX, LuClock, LuLoader, LuBan,
} from 'react-icons/lu';
import { mediaApi } from '../../../lib/media-api';
import { getApiErrorMessage } from '../../../lib/api-client';
import { resolveEffectiveRunStatus, resolveJobStateLabel, resolveStageLabel } from '../../../lib/process-run-status';
import { isTerminalRunStatus, subscribeRunLifecycle } from '../../../lib/run-lifecycle-events';
import { formatAppNumber } from '@/app/lib/i18n/formatLocaleNumber';
import { HoshetonError, getHoshetonErrorMessage } from '@/app/lib/errors';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import type { MediaJobLog, MediaRun } from '../../../types/media-api';
import styles from './ProcessLogPanel.module.scss';

const STATUS_KEYS: Record<string, string> = {
    PENDING: 'pending',
    RUNNING: 'running_status',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled',
};

const RUNS_PAGE_SIZE = 20;

const STATUS_ICONS = {
    PENDING: LuClock,
    RUNNING: LuLoader,
    COMPLETED: LuCircleCheck,
    FAILED: LuCircleX,
    CANCELLED: LuBan,
} as const;

function localeFor(lang: string) {
    if (lang === 'fa') return 'fa-IR';
    if (lang === 'ar') return 'ar';
    return lang || undefined;
}

function formatStamp(value: string | undefined, lang: string, withSeconds = false) {
    if (!value) return '';
    try {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        const locale = localeFor(lang);
        const now = new Date();
        const sameDay = date.toDateString() === now.toDateString();
        const time = date.toLocaleTimeString(locale, {
            hour: '2-digit',
            minute: '2-digit',
            ...(withSeconds ? { second: '2-digit' } : {}),
        });
        if (sameDay) return time;
        const day = date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
        return `${day}  ${time}`;
    } catch {
        return value;
    }
}

interface ProcessLogPanelProps {
    projectId: string;
    focusNodeId: string | null;
    focusRunId?: string | null;
    liveLogs: MediaJobLog[];
}

export function ProcessLogPanel({ projectId, focusNodeId, focusRunId, liveLogs }: ProcessLogPanelProps) {
    const { t } = useTranslation('projects');
    const { t: tc } = useTranslation('common');
    const lang = useAppStore((s) => s.lang);
    const [runs, setRuns] = useState<MediaRun[]>([]);
    const [totalRuns, setTotalRuns] = useState(0);
    const [runsPage, setRunsPage] = useState(1);
    const [loadingRuns, setLoadingRuns] = useState(false);
    const [loadingMoreRuns, setLoadingMoreRuns] = useState(false);
    const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
    const [runLogs, setRunLogs] = useState<MediaJobLog[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [view, setView] = useState<'runs' | 'timeline'>('runs');
    const logEndRef = useRef<HTMLDivElement | null>(null);
    const focusedLogRef = useRef<HTMLDivElement | null>(null);

    const fetchRuns = useCallback(async (options?: { reset?: boolean; page?: number }) => {
        const page = options?.page ?? 1;
        const reset = options?.reset ?? page === 1;
        const setLoading = reset ? setLoadingRuns : setLoadingMoreRuns;

        setLoading(true);
        if (reset) setError(null);
        try {
            const { runs: fetched, totalItems } = await mediaApi.listRuns(projectId, {
                page,
                limit: RUNS_PAGE_SIZE,
            });
            const nextRuns = fetched ?? [];
            setTotalRuns(totalItems ?? nextRuns.length);
            setRunsPage(page);
            setRuns((current) => {
                if (reset) return nextRuns;
                const seen = new Set(current.map((run) => run._id));
                const appended = nextRuns.filter((run) => !seen.has(run._id));
                return [...current, ...appended];
            });
            return nextRuns;
        } catch (err) {
            setError(getApiErrorMessage(err, t('load_runs_error')));
            return [];
        } finally {
            setLoading(false);
        }
    }, [projectId, t]);

    const loadMoreRuns = useCallback(() => {
        if (loadingMoreRuns || loadingRuns) return;
        void fetchRuns({ page: runsPage + 1 });
    }, [fetchRuns, loadingMoreRuns, loadingRuns, runsPage]);

    const hasMoreRuns = runs.length < totalRuns;

    const openRun = useCallback(async (runId: string) => {
        setSelectedRunId(runId);
        setView('timeline');
        setLoadingLogs(true);
        setError(null);
        try {
            const { logs } = await mediaApi.getRunLogs(projectId, runId);
            setRunLogs(logs ?? []);
        } catch (err) {
            setError(getApiErrorMessage(err, t('load_logs_error')));
        } finally {
            setLoadingLogs(false);
        }
    }, [projectId, t]);

    useEffect(() => {
        const timer = setTimeout(() => { void fetchRuns({ reset: true }); }, 0);
        return () => clearTimeout(timer);
    }, [fetchRuns]);

    useEffect(() => subscribeRunLifecycle((event) => {
        if (event.projectId !== projectId) return;

        setRuns((current) => current.map((run) => {
            if (run._id !== event.runId) return run;
            return {
                ...run,
                status: event.status,
                errorMessage: event.errorMessage,
                executionOrder: event.executionOrder ?? run.executionOrder,
                nodeResults: event.nodeResults ?? run.nodeResults,
                finalOutput: event.finalOutput ?? run.finalOutput,
            };
        }));

        if (event.status === 'PENDING' || isTerminalRunStatus(event.status)) {
            void fetchRuns({ reset: true });
        }
        if (selectedRunId === event.runId && isTerminalRunStatus(event.status)) {
            void openRun(event.runId);
        }
    }), [fetchRuns, openRun, projectId, selectedRunId]);

    useEffect(() => {
        if (!focusRunId) return;
        void (async () => {
            await fetchRuns({ reset: true });
            await openRun(focusRunId);
        })();
    }, [focusRunId, fetchRuns, openRun]);

    // When an error badge is clicked on a node, jump straight to the most
    // recent run's timeline and highlight/scroll to that node's entries.
    useEffect(() => {
        if (!focusNodeId) return;
        (async () => {
            const fetched = runs.length ? runs : await fetchRuns({ reset: true });
            const latest = fetched[0];
            if (latest) await openRun(latest._id);
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [focusNodeId]);

    const mergedLogs = useMemo(() => {
        const liveForRun = liveLogs.filter((l) => l.runId === selectedRunId);
        const seen = new Set<string>();
        const combined = [...runLogs, ...liveForRun].filter((l) => {
            const key = l._id || `${l.stage}-${l.message}-${l.createdAt}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
        return combined.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
    }, [runLogs, liveLogs, selectedRunId]);

    useEffect(() => {
        if (focusNodeId && focusedLogRef.current) {
            focusedLogRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if (!focusNodeId && logEndRef.current) {
            logEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [mergedLogs, focusNodeId]);

    const selectedRunView = useMemo(() => {
        if (!selectedRunId) return null;
        const run = runs.find((item) => item._id === selectedRunId);
        if (!run) return null;
        const runLogsForStatus = liveLogs.filter((log) => log.runId === run._id);
        return {
            run,
            effectiveStatus: resolveEffectiveRunStatus(run, runLogsForStatus),
            isTimelineExport: Boolean(run.jobId?.startsWith('ve_export_')),
        };
    }, [liveLogs, runs, selectedRunId]);

    // کپی خطا فقط پیام هوشتون است؛ متن خام و stack در پایش خطا (ادمین) ثبت شده است
    const handleCopy = (log: MediaJobLog) => {
        const text = getHoshetonErrorMessage(log.errorDetail?.message || log.message, { kind: 'generation' });
        navigator.clipboard?.writeText(text).catch(() => undefined);
    };

    const refreshing = view === 'runs' ? loadingRuns : loadingLogs;

    return (
        <div className={styles.logPanel}>
            <div className={styles.logPanelHeader}>
                {view === 'timeline' ? (
                    <div className={styles.detailHeading}>
                        <button
                            type="button"
                            className={styles.backBtn}
                            onClick={() => { setView('runs'); setSelectedRunId(null); }}
                        >
                            <LuChevronLeft />
                            <span>{t('back_to_runs')}</span>
                        </button>
                        {selectedRunView && (
                            <div className={styles.detailSummary}>
                                <span
                                    className={styles.detailStatus}
                                    data-status={selectedRunView.isTimelineExport ? undefined : selectedRunView.effectiveStatus}
                                >
                                    {selectedRunView.isTimelineExport
                                        ? t('timeline_export')
                                        : (t(STATUS_KEYS[selectedRunView.effectiveStatus] || selectedRunView.effectiveStatus) || selectedRunView.effectiveStatus)}
                                </span>
                                <span className={styles.detailMeta}>
                                    {selectedRunView.isTimelineExport && (
                                        <span data-status={selectedRunView.effectiveStatus}>
                                            {t(STATUS_KEYS[selectedRunView.effectiveStatus] || selectedRunView.effectiveStatus) || selectedRunView.effectiveStatus}
                                        </span>
                                    )}
                                    <time dateTime={selectedRunView.run.createdAt}>
                                        {formatStamp(selectedRunView.run.createdAt, lang)}
                                    </time>
                                    {(selectedRunView.effectiveStatus === 'PENDING' || selectedRunView.effectiveStatus === 'RUNNING') && selectedRunView.run.jobState && (
                                        <span>
                                            {resolveJobStateLabel(t, selectedRunView.run.jobState, selectedRunView.run.jobStateLabel)}
                                        </span>
                                    )}
                                    {selectedRunView.effectiveStatus === 'COMPLETED' && selectedRunView.run.usage?.totalCost ? (
                                        <span className={styles.runCost} dir="ltr">
                                            ${selectedRunView.run.usage.totalCost.toFixed(4)}
                                        </span>
                                    ) : null}
                                </span>
                                {(selectedRunView.run.errorMessage || selectedRunView.effectiveStatus === 'FAILED') && (
                                    <p className={styles.detailError}>
                                        {selectedRunView.run.errorMessage || t('process_error')}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className={styles.titleBlock}>
                        <span className={styles.logPanelTitle}>{t('recent_runs')}</span>
                        {totalRuns > 0 && (
                            <span className={styles.runCount}>{formatAppNumber(totalRuns, lang)}</span>
                        )}
                    </div>
                )}
                <button
                    type="button"
                    className={styles.refreshBtn}
                    title={tc('refresh')}
                    onClick={() => (view === 'runs' ? fetchRuns({ reset: true }) : selectedRunId && openRun(selectedRunId))}
                >
                    <LuRefreshCw className={refreshing ? styles.spin : undefined} />
                </button>
            </div>

            {error && <div className={styles.logPanelError}>{error}</div>}

            {view === 'runs' ? (
                <div className={styles.runsList}>
                    {loadingRuns && <div className={styles.logPanelEmpty}>{tc('loading')}</div>}
                    {!loadingRuns && runs.length === 0 && (
                        <div className={styles.logPanelEmpty}>{t('no_runs_yet')}</div>
                    )}
                    {runs.map((run) => {
                        const runLogsForStatus = liveLogs.filter((l) => l.runId === run._id);
                        const effectiveStatus = resolveEffectiveRunStatus(run, runLogsForStatus);
                        const isTimelineExport = run.jobId?.startsWith('ve_export_');
                        const statusLabel = t(STATUS_KEYS[effectiveStatus] || effectiveStatus) || effectiveStatus;
                        const jobLabel = run.jobState
                            ? resolveJobStateLabel(t, run.jobState, run.jobStateLabel)
                            : '';
                        const showJob = (effectiveStatus === 'PENDING' || effectiveStatus === 'RUNNING') && !!jobLabel;
                        const showCost = !isTimelineExport && effectiveStatus === 'COMPLETED' && !!run.usage?.totalCost;
                        const StatusIcon = STATUS_ICONS[effectiveStatus] ?? LuClock;
                        return (
                            <button
                                key={run._id}
                                type="button"
                                className={styles.runRow}
                                data-status={effectiveStatus}
                                onClick={() => openRun(run._id)}
                            >
                                <span className={`${styles.runIcon} ${effectiveStatus === 'RUNNING' ? styles.runIconSpin : ''}`}>
                                    <StatusIcon />
                                </span>
                                <span className={styles.runCopy}>
                                    <span className={styles.runTitle}>
                                        {isTimelineExport ? (
                                            <span>{t('timeline_export')}</span>
                                        ) : null}
                                        <span className={styles.runStatusWord}>{statusLabel}</span>
                                        {showJob && (
                                            <span className={styles.runTitleExtra}>
                                                {' · '}{jobLabel}
                                            </span>
                                        )}
                                        {showCost && run.usage?.totalCost != null && (
                                            <span className={styles.runTitleExtra} dir="ltr">
                                                {' — $'}{run.usage.totalCost.toFixed(4)}
                                            </span>
                                        )}
                                    </span>
                                    <span className={styles.runMeta}>
                                        <time dateTime={run.createdAt}>{formatStamp(run.createdAt, lang)}</time>
                                        {showJob && (
                                            <span>{t('job_colon', { label: jobLabel })}</span>
                                        )}
                                        {(run.errorMessage || effectiveStatus === 'FAILED') && (
                                            <HoshetonError error={run.errorMessage} kind="generation">
                                                {(e) => <span className={styles.runError}>{e.message}</span>}
                                            </HoshetonError>
                                        )}
                                    </span>
                                </span>
                                <LuChevronRight className={styles.runChevron} />
                            </button>
                        );
                    })}
                    {hasMoreRuns && (
                        <button
                            type="button"
                            className={styles.loadMoreBtn}
                            onClick={loadMoreRuns}
                            disabled={loadingMoreRuns}
                        >
                            {loadingMoreRuns ? tc('loading') : tc('more')}
                        </button>
                    )}
                </div>
            ) : (
                <div className={styles.timeline}>
                    {loadingLogs && <div className={styles.logPanelEmpty}>{t('loading_logs')}</div>}
                    {!loadingLogs && mergedLogs.length === 0 && (
                        <div className={styles.logPanelEmpty}>{t('no_logs')}</div>
                    )}
                    {mergedLogs.length > 0 && (
                        <div className={styles.timelineTrack}>
                            {mergedLogs.map((log, idx) => {
                                const isFocused = focusNodeId && log.nodeId === focusNodeId;
                                const stageIsMisleading = log.stage === 'completed' && log.level === 'error';
                                const nodeLabel = log.nodeId
                                    ? t('node_colon', { name: log.nodeType || log.nodeId })
                                    : log.nodeType;
                                return (
                                    <div
                                        key={log._id || idx}
                                        ref={isFocused ? focusedLogRef : undefined}
                                        className={`${styles.logEntry} ${isFocused ? styles.logEntryFocused : ''}`}
                                        data-level={log.level}
                                    >
                                        <span className={styles.logMarker} data-level={log.level} />
                                        <div className={styles.logEntryBody}>
                                            <div className={styles.logEntryHead}>
                                                <span className={`${styles.logEntryStage} ${stageIsMisleading ? styles.logEntryStageError : ''}`}>
                                                    {resolveStageLabel(t, log)}
                                                </span>
                                                {nodeLabel && <span className={styles.logEntryNode}>{nodeLabel}</span>}
                                                <time className={styles.logEntryTime} dateTime={log.createdAt}>
                                                    {formatStamp(log.createdAt, lang, true)}
                                                </time>
                                            </div>
                                            {log.level === 'error' ? (
                                                // لاگ خطا متن خام worker/ارائه‌دهنده دارد — فقط پیام هوشتون نمایش داده می‌شود
                                                <HoshetonError error={log.errorDetail?.message || log.message} kind="generation">
                                                    {(e) => (
                                                        <div className={styles.logEntryError}>
                                                            <span>{e.message}</span>
                                                            <button type="button" className={styles.logCopyBtn} onClick={() => handleCopy(log)} title={t('copy_error')}>
                                                                <LuCopy />
                                                            </button>
                                                        </div>
                                                    )}
                                                </HoshetonError>
                                            ) : (
                                                <p className={styles.logEntryMessage}>{log.message}</p>
                                            )}
                                            {typeof log.meta?.progress === 'number' && (
                                                <span className={styles.logEntryProgress}>
                                                    {log.meta.progressEstimated === true ? t('approx') : ''}
                                                    {t('percent', { value: formatAppNumber(log.meta.progress as number, lang) })}
                                                </span>
                                            )}
                                            {typeof log.meta?.outputUrl === 'string' && (
                                                <a
                                                    href={String(log.meta.outputUrl)}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className={styles.logDownloadLink}
                                                >
                                                    <LuDownload />
                                                    {t('download_file')}
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    <div ref={logEndRef} />
                </div>
            )}
        </div>
    );
}
