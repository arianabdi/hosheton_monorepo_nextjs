'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import {
    downloadBackup,
    fetchJob,
    fetchOverview,
    fetchSummary,
    type BackupRow,
    type DbTarget,
    type JobProgress,
    type JobState,
    type Overview,
    type RestoreMode,
    type Summary,
} from './database-api';
import { explainFailure, formatDateShort, MODE_LABEL } from './format';

export interface TrackedJob {
    jobId: string;
    op: 'dump' | 'restore';
    mode?: RestoreMode;
    db?: DbTarget;
    /** backup a restore uses (for «بازگردانی واقعی» after a test) */
    fileId?: string;
    sourceAt?: string;
    label: string;
    state: JobState | null;
}

/** How the restore dialog opens: from a row (source fixed) or from the header (owner picks). */
export interface RestoreRequest {
    row?: BackupRow;
    /** preselected source when opened without a row */
    source?: 'latest' | 'older' | 'file';
    /** preselected mode (e.g. «بازگردانی واقعی» after a test) */
    mode?: RestoreMode;
}

/** «برگرداندن به قبل»: restore the safety backup taken right before a restore. */
export interface UndoRequest {
    safetyBackupFileId: string;
    db: DbTarget;
    /** when the restore that is being undone happened */
    at?: string;
}

interface DatabaseContextValue {
    baseUrl: string;
    token: string;
    overview: Overview | null;
    overviewFailed: boolean;
    reloadOverview: () => Promise<void>;
    summary: Summary | null;
    reloadSummary: () => Promise<void>;
    /** the job running now (backup/restore) — shown under the header on every tab */
    job: TrackedJob | null;
    jobRunning: boolean;
    trackJob: (job: Omit<TrackedJob, 'state'>, onDone?: (state: JobState) => void) => void;
    dismissJob: () => void;
    /** bumps when a job finishes so tabs refresh their data */
    revision: number;
    bump: () => void;
    cache: Map<string, unknown>;
    restoreRequest: RestoreRequest | null;
    openRestore: (req?: RestoreRequest) => void;
    closeRestore: () => void;
    backupNowOpen: boolean;
    openBackupNow: () => void;
    closeBackupNow: () => void;
    undoRequest: UndoRequest | null;
    requestUndo: (req: UndoRequest) => void;
    closeUndo: () => void;
    download: (row: Pick<BackupRow, '_id'>) => Promise<void>;
}

const DatabaseContext = createContext<DatabaseContextValue | null>(null);

export function jobLabel(op: 'dump' | 'restore', mode?: RestoreMode, sourceAt?: string): string {
    if (op === 'dump') return 'بک‌آپ‌گیری';
    const to = sourceAt ? ` به ${formatDateShort(sourceAt)}` : '';
    if (mode === 'test') return `امتحان بازگردانی${to} در یک کپی جدا`;
    if (mode === 'missing') return `برگرداندن داده‌های پاک‌شده${to ? ` از${to.slice(3)}` : ''}`;
    return `بازگردانی${to}`;
}

export function DatabaseProvider({ children }: { children: ReactNode }) {
    const { baseUrl } = useAppStore();
    const { token: rawToken } = useAuthStore();
    const token = rawToken || '';
    const [overview, setOverview] = useState<Overview | null>(null);
    const [overviewFailed, setOverviewFailed] = useState(false);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [job, setJob] = useState<TrackedJob | null>(null);
    const [revision, setRevision] = useState(0);
    const [restoreRequest, setRestoreRequest] = useState<RestoreRequest | null>(null);
    const [backupNowOpen, setBackupNowOpen] = useState(false);
    const [undoRequest, setUndoRequest] = useState<UndoRequest | null>(null);
    const cacheRef = useRef(new Map<string, unknown>());
    const doneRef = useRef<((state: JobState) => void) | undefined>(undefined);

    const reloadOverview = useCallback(async () => {
        if (!token || !baseUrl) return;
        try {
            setOverview(await fetchOverview(baseUrl, token));
            setOverviewFailed(false);
        } catch {
            setOverviewFailed(true);
        }
    }, [baseUrl, token]);

    const reloadSummary = useCallback(async () => {
        if (!token || !baseUrl) return;
        try {
            setSummary(await fetchSummary(baseUrl, token));
        } catch {
            // the header just shows less; the tabs still work
        }
    }, [baseUrl, token]);

    const trackJob = useCallback((j: Omit<TrackedJob, 'state'>, onDone?: (state: JobState) => void) => {
        doneRef.current = onDone;
        setJob({ ...j, state: null });
    }, []);

    // load once per app; re-attach to a job that is still running (refresh, another tab, phone)
    useEffect(() => {
        if (!token || !baseUrl) return;
        cacheRef.current.clear();
        setOverview(null);
        setSummary(null);
        void reloadOverview();
        fetchSummary(baseUrl, token)
            .then((s) => {
                setSummary(s);
                const a = s.activeJob;
                if (a) trackJob({ jobId: a.jobId, op: a.op, mode: a.mode, db: a.db, fileId: a.fileId, sourceAt: a.sourceAt, label: jobLabel(a.op, a.mode, a.sourceAt) });
            })
            .catch(() => undefined);
    }, [baseUrl, token, reloadOverview, trackJob]);

    const bump = useCallback(() => setRevision((r) => r + 1), []);
    const dismissJob = useCallback(() => setJob(null), []);

    const jobId = job?.jobId;
    useEffect(() => {
        if (!jobId || !token) return;
        let stopped = false;
        let timer: ReturnType<typeof setTimeout>;
        const tick = async () => {
            try {
                const state = await fetchJob(baseUrl, token, jobId);
                if (stopped) return;
                setJob((prev) => (prev && prev.jobId === jobId ? { ...prev, state } : prev));
                if (state.state === 'completed' || state.state === 'failed') {
                    stopped = true;
                    if (state.state === 'completed') {
                        SuccessToaster({ message: state.log?.result?.summary || 'تمام شد' });
                    } else {
                        ErrorToaster({ message: explainFailure(state.log?.failedReason) });
                    }
                    doneRef.current?.(state);
                    doneRef.current = undefined;
                    cacheRef.current.clear();
                    setRevision((r) => r + 1);
                    void reloadSummary();
                    return;
                }
            } catch {
                // a dropped request — ask again on the next tick
            }
            if (!stopped) timer = setTimeout(tick, 1500);
        };
        timer = setTimeout(tick, 600);
        return () => {
            stopped = true;
            clearTimeout(timer);
        };
    }, [jobId, baseUrl, token, reloadSummary]);

    const download = useCallback(
        async (row: Pick<BackupRow, '_id'>) => {
            try {
                await downloadBackup(baseUrl, token, row);
            } catch (e) {
                ErrorToaster(e);
            }
        },
        [baseUrl, token],
    );

    const state = job?.state?.state;
    const jobRunning = !!job && state !== 'completed' && state !== 'failed';

    return (
        <DatabaseContext.Provider
            value={{
                baseUrl,
                token,
                overview,
                overviewFailed,
                reloadOverview,
                summary,
                reloadSummary,
                job,
                jobRunning,
                trackJob,
                dismissJob,
                revision,
                bump,
                cache: cacheRef.current,
                restoreRequest,
                openRestore: (req) => setRestoreRequest(req || {}),
                closeRestore: () => setRestoreRequest(null),
                backupNowOpen,
                openBackupNow: () => setBackupNowOpen(true),
                closeBackupNow: () => setBackupNowOpen(false),
                undoRequest,
                requestUndo: setUndoRequest,
                closeUndo: () => setUndoRequest(null),
                download,
            }}
        >
            {children}
        </DatabaseContext.Provider>
    );
}

export function useDatabase() {
    const ctx = useContext(DatabaseContext);
    if (!ctx) throw new Error('useDatabase must be used inside DatabaseProvider');
    return ctx;
}

/** state that survives switching tabs (previous data shows at once, refresh happens quietly) */
export function useCachedState<T>(key: string, initial: T): [T, (value: T) => void, boolean] {
    const { cache } = useDatabase();
    const had = cache.has(key);
    const [value, setValue] = useState<T>(had ? (cache.get(key) as T) : initial);
    const set = useCallback(
        (next: T) => {
            cache.set(key, next);
            setValue(next);
        },
        [cache, key],
    );
    return [value, set, had];
}

/** progress of the tracked job, or null */
export function jobProgress(job: TrackedJob | null): JobProgress | null {
    const p = job?.state?.progress;
    return p && typeof p === 'object' ? (p as JobProgress) : null;
}

export { MODE_LABEL };
