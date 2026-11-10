import axios from 'axios';

/**
 * API client of the «دیتابیس و بک‌آپ» module (libs/core/src/database-admin on every app API).
 * Shared by every tab — add new calls here, never inline axios in a page.
 */

/** core = دیتابیس اصلی اپ؛ studio = دیتابیس دوم (فقط اپ‌هایی که دو دیتابیس جدا دارند) */
export type DbTarget = 'core' | 'studio';
export type RestoreMode = 'test' | 'replace' | 'missing';
export type BackupPurpose = 'manual' | 'cron' | 'pre-restore' | 'uploaded';

export interface DbInfo {
    id: DbTarget;
    label: string;
    database: string;
    available: boolean;
    collections: string[];
}

export interface ToolStatus {
    ok: boolean;
    version?: string;
    binary: string;
    error?: string;
}

export interface Overview {
    databases: DbInfo[];
    tools: { mongodump: ToolStatus; mongorestore: ToolStatus; serverVersion?: string };
}

export interface NotifyResult {
    channel: string;
    chatId: string;
    ok: boolean;
    parts?: number;
    error?: string;
    network?: boolean;
}

export interface BackupRow {
    _id: string;
    filename: string;
    size?: number;
    createdAt?: string;
    /** when the data was taken (an uploaded file: the original backup time) */
    takenAt?: string;
    db: DbTarget;
    database?: string;
    format: 'bson' | 'json';
    trigger: 'manual' | 'cron';
    purpose: BackupPurpose;
    partial: boolean;
    collections: string[];
    collectionCount: number;
    documentCount: number;
    collectionStats: Record<string, number>;
    durationMs?: number;
    toolVersion?: string;
    /** name of the file the admin uploaded (purpose 'uploaded') */
    originalName?: string | null;
    notified?: { at: string; results: NotifyResult[] } | null;
    /** safety backups: the backup whose restore they protect */
    restoreOf?: string | null;
}

export interface RestoreResult {
    mode: RestoreMode;
    db?: DbTarget;
    targetDatabase: string;
    sourceDatabase: string;
    restored: number;
    failed: number;
    collections: Record<string, { expected?: number; restored: number; failed: number; countAfter?: number }>;
    verified?: boolean;
    safetyBackupFileId?: string;
    durationMs: number;
    summary: string;
    sourceFileId?: string;
    sourceAt?: string;
}

/** What a running job reports: phase + done/total collections, raw tool lines for «جزئیات فنی». */
export type JobPhase = 'dump' | 'safety' | 'download' | 'restore' | 'verify';
export interface JobProgress {
    phase: JobPhase;
    done: number;
    total: number;
    lines: string[];
}

export interface JobLogRow {
    _id: string;
    jobId: string;
    jobName: string;
    status: 'active' | 'completed' | 'failed' | 'stalled' | 'waiting';
    data?: {
        op?: 'dump' | 'restore';
        trigger?: 'manual' | 'cron';
        db?: DbTarget;
        mode?: RestoreMode;
        fileId?: string;
        collections?: string[];
        userId?: string;
        userName?: string;
        sourceName?: string;
        sourceAt?: string;
    };
    /** dump: DumpResult (fileId, filename, size, documentCount…); restore: RestoreResult; failed restore: { restoreInfo } */
    result?: any;
    failedReason?: string;
    processedAt?: string;
    finishedAt?: string;
    createdAt?: string;
    updatedAt?: string;
    /** resolved by the API from data.userId */
    userName?: string | null;
}

export interface JobState {
    jobId: string;
    state: string;
    progress?: JobProgress | number;
    log: JobLogRow | null;
}

export interface TestDbInfo {
    database: string;
    exists: boolean;
    collections: Record<string, number>;
}

export interface Summary {
    lastBackup: { _id: string; at: string; purpose: BackupPurpose; documents: number; size?: number } | null;
    lastScheduledAt: string | null;
    count: number;
    totalBytes: number;
    schedules: Array<{ db: DbTarget; database: string; enabled: boolean; schedule: string; nextRunAt: string | null; retentionCount: number }>;
    delivery: Array<'telegram' | 'bale'>;
    lastFailure: { at: string; label: string; reason: string } | null;
    activeJob: {
        jobId: string;
        op: 'dump' | 'restore';
        mode?: RestoreMode;
        db: DbTarget;
        fileId?: string;
        sourceAt?: string;
        startedAt: string | null;
        state: string;
    } | null;
    /** a real restore in the last 24 h whose safety backup still exists — «برگرداندن به قبل» */
    lastRestore: {
        jobId: string;
        status: 'completed' | 'failed';
        at: string;
        db: DbTarget;
        mode: RestoreMode;
        sourceAt?: string;
        safetyBackupFileId: string;
        safetyCollections: number;
        liveTouched: boolean;
    } | null;
    /** `<db>_restoretest` copies that exist */
    testCopies: Array<{ db: DbTarget; database: string; collections: number; documents: number; fileId: string | null; sourceAt: string | null; at: string | null }>;
}

export interface BackupSetting {
    enabled: boolean;
    schedule: 'hourly' | 'every6hours' | 'daily' | 'weekly' | 'custom';
    cron?: string;
    hour?: number;
    minute?: number;
    weekday?: number;
    collections: string[];
    retentionCount: number;
}

export interface ScheduleInfo {
    db: DbTarget;
    label: string;
    database: string;
    collections: string[];
    setting: BackupSetting;
    /** the schedule as a cron expression (Asia/Tehran) */
    cron: string | null;
    nextRunAt: string | null;
    lastAutoBackup: { _id: string; at: string; size?: number; documents: number; notified: BackupRow['notified'] } | null;
    lastAutoFailure: { at: string; reason: string } | null;
}

/** Recommended defaults the schedule tab offers in one click. */
export const RECOMMENDED_SCHEDULE: Partial<BackupSetting> = { enabled: true, schedule: 'daily', hour: 3, minute: 0, retentionCount: 14, collections: [] };

const base = (baseUrl: string) => `${baseUrl}/api/database-admin`;
const auth = (token: string) => ({ headers: { authorization: `Bearer ${token}` } });

// ── overview / summary ───────────────────────────────────────────────────────

export async function fetchOverview(baseUrl: string, token: string): Promise<Overview> {
    const res = await axios.get(`${base(baseUrl)}/overview`, auth(token));
    const data: Overview = res.data.data;
    // the panel always names a database by its real name (older APIs send «دیتابیس اصلی/دوم»)
    return { ...data, databases: (data.databases || []).map(withDbName) };
}

const withDbName = <T extends { label: string; database: string }>(d: T): T => ({ ...d, label: d.database || d.label });

export async function fetchSummary(baseUrl: string, token: string): Promise<Summary> {
    const res = await axios.get(`${base(baseUrl)}/summary`, auth(token));
    return res.data.data;
}

// ── backups ──────────────────────────────────────────────────────────────────

export async function fetchBackups(baseUrl: string, token: string, query: Record<string, string | number>) {
    const params = new URLSearchParams(Object.entries(query).filter(([, v]) => v !== '' && v !== undefined).map(([k, v]) => [k, String(v)]));
    const res = await axios.get(`${base(baseUrl)}/backups?${params}`, auth(token));
    return res.data.data as { items: BackupRow[]; totalItems: number; page: number; limit: number };
}

/** Latest full, restorable backup (BSON, not partial, not a safety copy) of a database. */
export async function fetchLatestFullBackup(baseUrl: string, token: string, db?: DbTarget): Promise<BackupRow | null> {
    const res = await fetchBackups(baseUrl, token, { full: 1, limit: 1, page: 1, sort: 'createdAt', dir: 'desc', ...(db ? { db } : {}) });
    return res.items[0] || null;
}

export async function fetchBackup(baseUrl: string, token: string, fileId: string): Promise<BackupRow | null> {
    const res = await axios.get(`${base(baseUrl)}/backups/${fileId}`, auth(token)).catch(() => null);
    return res?.data?.data || null;
}

export async function runBackup(baseUrl: string, token: string, body: { db: DbTarget; collections?: string[] }) {
    const res = await axios.post(`${base(baseUrl)}/backup/run`, body, auth(token));
    return res.data.data as { jobId: string };
}

/**
 * `confirm: true` is enough for a replace into the same database (a safety backup is taken first);
 * when the file belongs to another database the API wants that database's name typed.
 */
export async function runRestore(
    baseUrl: string,
    token: string,
    fileId: string,
    body: { db: DbTarget; mode: RestoreMode; collections?: string[]; safetyBackup?: boolean; confirm?: string | boolean },
) {
    const res = await axios.post(`${base(baseUrl)}/backups/${fileId}/restore`, body, auth(token));
    return res.data.data as { jobId: string };
}

export async function deleteBackup(baseUrl: string, token: string, fileId: string) {
    await axios.delete(`${base(baseUrl)}/backups/${fileId}`, auth(token));
}

export async function notifyBackup(baseUrl: string, token: string, fileId: string) {
    const res = await axios.post(`${base(baseUrl)}/backups/${fileId}/notify`, {}, { ...auth(token), timeout: 15 * 60_000 });
    return res.data.data as { sent: boolean; message: string };
}

/**
 * Hands the file to the browser's own download manager (progress, resume, any size) through a
 * 10-minute link — backups are private on the storage, so there is no public URL.
 */
export async function downloadBackup(baseUrl: string, token: string, row: Pick<BackupRow, '_id'>) {
    const res = await axios.post(`${base(baseUrl)}/backups/${row._id}/download-link`, {}, auth(token));
    const a = document.createElement('a');
    a.href = `${baseUrl}${res.data.data.path}`;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
}

// ── upload a downloaded backup (or its Telegram/Bale parts) ──────────────────

export interface UploadProgress {
    stage: 'upload' | 'check';
    sentBytes: number;
    totalBytes: number;
}

export type UploadOutcome =
    | {
          ok: true;
          fileId: string;
          filename: string;
          originalName: string;
          database: string;
          gzip: boolean;
          size: number;
          collections: number;
          documentCount: number;
          toolVersion?: string;
          serverVersion?: string;
      }
    | { ok: false; message: string };

const PART_RE = /(?:\.part[-_]?|\.)(\d{1,4})$/i;

/** Orders Telegram/Bale parts (…part01, …part02) and says what is missing — before anything is sent. */
export function arrangeFiles(files: File[]): { files: File[]; error?: string } {
    if (files.length <= 1) return { files };
    const nums = files.map((f) => f.name.match(PART_RE)?.[1]);
    if (nums.some((n) => n === undefined)) return { files, error: 'چند فایل فقط وقتی پذیرفته می‌شود که بخش‌های یک بک‌آپ باشند (…part01، …part02).' };
    const sorted = files.map((f, i) => ({ f, n: Number(nums[i]) })).sort((a, b) => a.n - b.n);
    for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].n !== sorted[i - 1].n + 1) {
            return { files, error: `بخش ${String(sorted[i - 1].n + 1).padStart(2, '0')} انتخاب نشده؛ همهٔ بخش‌ها را با هم انتخاب کنید.` };
        }
    }
    return { files: sorted.map((s) => s.f) };
}

/**
 * Uploads in 8 MB chunks (fits behind CDNs), resumes after a dropped connection, then the API
 * joins the parts, checks the archive (exact document counts, checksums) and stores it as a backup.
 * Validation problems come back as `{ ok: false, message }` in Persian.
 */
export async function uploadBackupFiles(
    baseUrl: string,
    token: string,
    picked: File[],
    onProgress: (p: UploadProgress) => void,
    signal?: AbortSignal,
): Promise<UploadOutcome> {
    const { files, error } = arrangeFiles(picked);
    if (error) return { ok: false, message: error };
    const head = new Uint8Array(await files[0].slice(0, 4).arrayBuffer());
    const gz = head[0] === 0x1f && head[1] === 0x8b;
    const archive = head[0] === 0x6d && head[1] === 0xe2 && head[2] === 0x99 && head[3] === 0x81;
    if (!gz && !archive) {
        return { ok: false, message: 'این فایل، فایل بک‌آپ دیتابیس نیست. فایلی را انتخاب کنید که از همین پنل یا تلگرام/بله دانلود کرده‌اید (.archive.gz).' };
    }

    const init = await axios.post(`${base(baseUrl)}/backups/upload`, { files: files.map((f) => ({ name: f.name, size: f.size })) }, { ...auth(token), signal });
    const { uploadId, chunkSize } = init.data.data as { uploadId: string; chunkSize: number };
    const totalBytes = files.reduce((s, f) => s + f.size, 0);
    let sentBefore = 0;

    try {
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            let offset = 0;
            let attempts = 0;
            while (offset < file.size) {
                const end = Math.min(file.size, offset + chunkSize);
                try {
                    const res = await axios.put(`${base(baseUrl)}/backups/upload/${uploadId}/chunk?file=${i}&offset=${offset}`, file.slice(offset, end), {
                        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/octet-stream' },
                        signal,
                        timeout: 5 * 60_000,
                    });
                    offset = Number(res.data.data.received);
                    attempts = 0;
                } catch (e) {
                    if (signal?.aborted || ++attempts > 5) throw e;
                    await new Promise((r) => setTimeout(r, 1500 * attempts));
                    // ask the server where it is, then continue from there
                    const st = await axios.get(`${base(baseUrl)}/backups/upload/${uploadId}`, { ...auth(token), signal }).catch(() => null);
                    const got = st?.data?.data?.files?.[i]?.received;
                    if (typeof got === 'number') offset = got;
                }
                onProgress({ stage: 'upload', sentBytes: sentBefore + offset, totalBytes });
            }
            sentBefore += file.size;
        }
        onProgress({ stage: 'check', sentBytes: totalBytes, totalBytes });
        const done = await axios.post(`${base(baseUrl)}/backups/upload/${uploadId}/complete`, {}, { ...auth(token), signal, timeout: 30 * 60_000 });
        return done.data.data as UploadOutcome;
    } catch (e) {
        axios.delete(`${base(baseUrl)}/backups/upload/${uploadId}`, auth(token)).catch(() => undefined);
        throw e;
    }
}

// ── jobs ─────────────────────────────────────────────────────────────────────

export async function fetchJob(baseUrl: string, token: string, jobId: string): Promise<JobState> {
    const res = await axios.get(`${base(baseUrl)}/backup-jobs/${jobId}`, auth(token));
    return res.data.data;
}

export async function fetchJobs(baseUrl: string, token: string, query: Record<string, string | number>) {
    const params = new URLSearchParams(Object.entries(query).filter(([, v]) => v !== '').map(([k, v]) => [k, String(v)]));
    const res = await axios.get(`${base(baseUrl)}/backup-jobs?${params}`, auth(token));
    return res.data.data as { jobs: JobLogRow[]; totalItems: number };
}

// ── restore-test copy ────────────────────────────────────────────────────────

export async function fetchTestDb(baseUrl: string, token: string, db: DbTarget): Promise<TestDbInfo> {
    const res = await axios.get(`${base(baseUrl)}/restore-test-db?db=${db}`, auth(token));
    return res.data.data;
}

export async function dropTestDb(baseUrl: string, token: string, db: DbTarget) {
    await axios.post(`${base(baseUrl)}/restore-test-db/drop`, { db }, auth(token));
}

// ── automatic backup schedule ────────────────────────────────────────────────

export async function fetchSchedule(baseUrl: string, token: string): Promise<ScheduleInfo[]> {
    const res = await axios.get(`${base(baseUrl)}/schedule`, auth(token));
    return (res.data.data.databases as ScheduleInfo[]).map(withDbName);
}

/** Saves only what is sent; the API keeps lastRunAt and rejects an invalid cron. */
export async function saveSchedule(baseUrl: string, token: string, db: DbTarget, patch: Partial<BackupSetting>): Promise<ScheduleInfo> {
    const res = await axios.patch(`${base(baseUrl)}/schedule/${db}`, patch, auth(token));
    return res.data.data;
}

// ── explorer ─────────────────────────────────────────────────────────────────

export interface ExplorerTargetQuery {
    db: DbTarget;
    /** browse `<db>_restoretest` */
    test?: boolean;
}

export interface CollectionSummary {
    name: string;
    type: 'collection' | 'view';
    count: number | null;
    size?: number | null;
    storageSize?: number | null;
    avgObjSize?: number | null;
    indexes?: number | null;
    indexSize?: number | null;
}

export interface CollectionDetails {
    name: string;
    indexes: any[];
    options: any;
    schema: { sampled: number; fields: Array<{ path: string; presence: number; types: string[] }> };
}

export interface QueryPlan {
    stages: string[];
    indexes: string[];
    collscan: boolean;
    inMemorySort: boolean;
    docsExamined: number | null;
    keysExamined: number | null;
    returned: number | null;
    timeMs: number | null;
}

export interface QueryResult {
    op: 'find' | 'aggregate' | 'count' | 'distinct';
    docs: any[];
    total: number | null;
    skip: number;
    limit: number;
    durationMs: number;
    plan: QueryPlan | null;
    suggestions: Array<{ kind: 'index'; keys: Record<string, number>; spec: string; reason: string }>;
}

export type WriteOp = 'updateOne' | 'updateMany' | 'replaceOne' | 'deleteOne' | 'deleteMany' | 'insertMany';

const xp = (baseUrl: string) => `${base(baseUrl)}/explorer`;

export async function explorerCollections(baseUrl: string, token: string, t: ExplorerTargetQuery) {
    const res = await axios.get(`${xp(baseUrl)}/collections?db=${t.db}&test=${!!t.test}`, auth(token));
    return res.data.data as {
        database: string;
        collections: CollectionSummary[];
        stats: { dataSize: number; storageSize: number; indexSize: number; objects: number } | null;
    };
}

export async function explorerCollection(baseUrl: string, token: string, t: ExplorerTargetQuery, name: string) {
    const res = await axios.get(`${xp(baseUrl)}/collection?db=${t.db}&test=${!!t.test}&name=${encodeURIComponent(name)}`, auth(token));
    return res.data.data as CollectionDetails;
}

export async function explorerQuery(baseUrl: string, token: string, t: ExplorerTargetQuery, body: Record<string, unknown>) {
    const res = await axios.post(`${xp(baseUrl)}/query`, { ...t, ...body }, { ...auth(token), timeout: 60_000 });
    return res.data.data as QueryResult;
}

export async function explorerWrite(baseUrl: string, token: string, t: ExplorerTargetQuery, body: Record<string, unknown>) {
    const res = await axios.post(`${xp(baseUrl)}/write`, { ...t, ...body }, { ...auth(token), timeout: 120_000 });
    return res.data.data as Record<string, any>;
}

export async function explorerSaveDocument(baseUrl: string, token: string, t: ExplorerTargetQuery, collection: string, document: string) {
    const res = await axios.post(`${xp(baseUrl)}/document`, { ...t, collection, document }, auth(token));
    return res.data.data as { modified: number; doc: any };
}

export async function explorerDeleteDocument(baseUrl: string, token: string, t: ExplorerTargetQuery, collection: string, id: string) {
    const res = await axios.post(`${xp(baseUrl)}/document/delete`, { ...t, collection, id }, auth(token));
    return res.data.data as { deleted: number };
}

export async function explorerIndex(
    baseUrl: string,
    token: string,
    t: ExplorerTargetQuery,
    body: { collection: string; action: 'create' | 'drop'; keys?: string; name?: string; unique?: boolean },
) {
    const res = await axios.post(`${xp(baseUrl)}/index`, { ...t, ...body }, { ...auth(token), timeout: 300_000 });
    return res.data.data;
}

export async function explorerAudit(baseUrl: string, token: string, limit = 50) {
    const res = await axios.get(`${xp(baseUrl)}/audit?limit=${limit}`, auth(token));
    return res.data.data.rows as any[];
}

// ── Telegram / Bale delivery ─────────────────────────────────────────────────

export type NotifyChannelId = 'telegram' | 'bale';

export interface NotifyChannelSetting {
    enabled: boolean;
    botToken: string;
    hasToken?: boolean;
    chatIds: string[];
    apiBase: string;
    proxyUrl?: string;
    hasProxy?: boolean;
    partSizeMB: number;
}

export interface NotifySetting {
    channels: Record<NotifyChannelId, NotifyChannelSetting>;
    sendOn: Record<'cron' | 'manual' | 'pre-restore', boolean>;
    onFailure: boolean;
}

export async function fetchNotify(baseUrl: string, token: string): Promise<NotifySetting> {
    const res = await axios.get(`${base(baseUrl)}/notify`, auth(token));
    return res.data.data;
}

export async function saveNotify(baseUrl: string, token: string, value: NotifySetting): Promise<NotifySetting> {
    const res = await axios.patch(`${base(baseUrl)}/notify`, value, auth(token));
    return res.data.data;
}

/** Test one messenger (or all enabled); each result carries a Persian `error` and `network` when the server can't reach it. */
export async function testNotify(baseUrl: string, token: string, channel?: NotifyChannelId) {
    const res = await axios.post(`${base(baseUrl)}/notify/test`, channel ? { channel } : {}, { ...auth(token), timeout: 60_000 });
    return res.data.data.results as NotifyResult[];
}
