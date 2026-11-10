import axios from 'axios';

/**
 * Storage connection (S3) — endpoints on core:
 * GET    /api/file/storage-settings          current config (secrets never returned)
 * PUT    /api/file/storage-settings          save; enabling runs a live test first
 * POST   /api/file/storage-settings/test     upload → public read → delete
 * GET    /api/file/storage-settings/status   file records per storage (active + fallbacks)
 * GET    /api/file/storage-settings/locate   which storage really holds a key / URL
 * DELETE /api/file/storage-settings/retired  stop reading old files from a replaced storage
 */

export interface StorageSettings {
    enabled: boolean;
    endpoint: string;
    region: string;
    bucket: string;
    accessKey: string;
    /** write-only: empty means "keep the stored secret" */
    secretKey: string;
    forcePathStyle: boolean;
    publicBaseUrl: string;
    requestTimeoutMs: number;
}

/** A storage that was active before and got replaced — still read for its old files. */
export interface RetiredStorageView {
    endpoint: string;
    bucket: string;
    publicBase: string;
    retiredAt: string;
    hasCredentials: boolean;
}

export interface StorageSettingsView extends StorageSettings {
    hasSecretKey: boolean;
    retired: RetiredStorageView[];
    runtime: {
        source: 'database' | 'env';
        endpoint: string;
        bucket: string;
        publicBase: string;
        /** read-only storages old files are read from (`env` or `retired:<endpoint>/<bucket>`) */
        fallbacks: Array<{ id: string; label: string; publicBase: string }>;
    };
}

export interface StorageDistributionRow {
    /** active | env | retired:… | other */
    id: string;
    label: string;
    publicBase: string;
    active: boolean;
    files: number;
    bytes: number;
}

export interface StorageLocateResult {
    key: string;
    found: boolean;
    storage: { id: string; label: string; active: boolean } | null;
    publicUrl: string | null;
}

export interface StorageTestResult {
    ok: boolean;
    publicBase: string;
    steps: Array<{ step: 'upload' | 'public-read' | 'delete'; ok: boolean; latencyMs: number; error?: string }>;
}

function authHeaders(token: string) {
    return { headers: { authorization: `Bearer ${token}` } };
}

function unwrap<T>(res: { data?: { statusCode?: number; message?: string; data?: T } }, fallback: string): T {
    if (res?.data?.statusCode !== 200) {
        throw new Error(res?.data?.message || fallback);
    }
    return res.data.data as T;
}

export async function getStorageSettings(baseUrl: string, token: string): Promise<StorageSettingsView> {
    const res = await axios.get(`${baseUrl}/api/file/storage-settings`, authHeaders(token));
    return unwrap(res, 'دریافت تنظیمات استوریج ناموفق بود');
}

export async function saveStorageSettings(
    baseUrl: string,
    token: string,
    settings: StorageSettings,
): Promise<StorageSettingsView> {
    const res = await axios.put(`${baseUrl}/api/file/storage-settings`, settings, authHeaders(token));
    return unwrap(res, 'ذخیره تنظیمات استوریج ناموفق بود');
}

export async function testStorageSettings(
    baseUrl: string,
    token: string,
    settings: StorageSettings,
): Promise<StorageTestResult> {
    const res = await axios.post(`${baseUrl}/api/file/storage-settings/test`, settings, authHeaders(token));
    return unwrap(res, 'تست استوریج ناموفق بود');
}

export async function getStorageStatus(baseUrl: string, token: string): Promise<StorageDistributionRow[]> {
    const res = await axios.get(`${baseUrl}/api/file/storage-settings/status`, authHeaders(token));
    return unwrap<{ storages: StorageDistributionRow[] }>(res, 'دریافت وضعیت فایل‌ها ناموفق بود').storages || [];
}

export async function locateStorageObject(baseUrl: string, token: string, key: string): Promise<StorageLocateResult> {
    const res = await axios.get(
        `${baseUrl}/api/file/storage-settings/locate?key=${encodeURIComponent(key)}`,
        authHeaders(token),
    );
    return unwrap(res, 'جستجوی فایل ناموفق بود');
}

export async function removeRetiredStorage(
    baseUrl: string,
    token: string,
    storage: { endpoint: string; bucket: string },
): Promise<StorageSettingsView> {
    const res = await axios.delete(`${baseUrl}/api/file/storage-settings/retired`, {
        ...authHeaders(token),
        data: storage,
    });
    return unwrap(res, 'حذف استوریج قبلی ناموفق بود');
}

// ─── نگهداری استوریج: انتقال امن، بک‌آپ و بازگردانی (api/file/storage-maintenance) ───

export type StorageJobKind = 'transfer' | 'backup' | 'restore';
export type StorageJobStatus = 'queued' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

export interface StorageJob {
    _id: string;
    kind: StorageJobKind;
    status: StorageJobStatus;
    label: string;
    params: Record<string, unknown>;
    total: number;
    processed: number;
    copied: number;
    skipped: number;
    failed: number;
    bytes: number;
    relinked: number;
    failures?: Array<{ key: string; fileId?: string; code: string; message: string; at: string }>;
    error: string;
    startedBy: string;
    startedAt: string | null;
    finishedAt: string | null;
    createdAt: string;
}

export interface TransferCandidate {
    _id: string;
    originalname?: string;
    name?: string;
    key?: string;
    path?: string;
    size?: number;
    mimetype?: string;
    createdAt?: string;
    isThumbnail?: boolean;
}

export interface TransferCandidatesPage {
    source: { id: string; label: string; publicBase: string };
    rows: TransferCandidate[];
    totalItems: number;
    totalBytes: number;
    page: number;
    limit: number;
}

export interface StorageBackupSettings {
    endpoint: string;
    region: string;
    bucket: string;
    accessKey: string;
    secretKey: string;
    forcePathStyle: boolean;
    prefixes: string[];
}

export interface StorageBackupView extends StorageBackupSettings {
    hasSecretKey: boolean;
    configured: boolean;
    defaultPrefixes: string[];
}

const MAINTENANCE = '/api/file/storage-maintenance';

export async function getTransferCandidates(
    baseUrl: string,
    token: string,
    query: { sourceId: string; kind?: string; search?: string; page?: number; limit?: number },
): Promise<TransferCandidatesPage> {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== '') params.set(key, String(value));
    });
    const res = await axios.get(`${baseUrl}${MAINTENANCE}/transfer/candidates?${params}`, authHeaders(token));
    return unwrap(res, 'دریافت فهرست فایل‌ها ناموفق بود');
}

export async function startTransfer(
    baseUrl: string,
    token: string,
    body: { sourceId: string; fileIds?: string[]; kind?: string },
): Promise<StorageJob> {
    const res = await axios.post(`${baseUrl}${MAINTENANCE}/transfer`, body, authHeaders(token));
    return unwrap(res, 'شروع انتقال ناموفق بود');
}

export async function rollbackFileTransfer(baseUrl: string, token: string, fileId: string): Promise<{ fileId: string; path: string }> {
    const res = await axios.post(`${baseUrl}${MAINTENANCE}/files/${fileId}/rollback`, {}, authHeaders(token));
    return unwrap(res, 'بازگرداندن آدرس فایل ناموفق بود');
}

export async function getBackupSettings(baseUrl: string, token: string): Promise<StorageBackupView> {
    const res = await axios.get(`${baseUrl}${MAINTENANCE}/backup`, authHeaders(token));
    return unwrap(res, 'دریافت تنظیمات بک‌آپ ناموفق بود');
}

export async function saveBackupSettings(baseUrl: string, token: string, body: StorageBackupSettings): Promise<StorageBackupView> {
    const res = await axios.put(`${baseUrl}${MAINTENANCE}/backup`, body, authHeaders(token));
    return unwrap(res, 'ذخیرهٔ تنظیمات بک‌آپ ناموفق بود');
}

export async function testBackupSettings(baseUrl: string, token: string, body: StorageBackupSettings): Promise<{ ok: boolean; error?: string }> {
    const res = await axios.post(`${baseUrl}${MAINTENANCE}/backup/test`, body, authHeaders(token));
    return unwrap(res, 'تست استوریج بک‌آپ ناموفق بود');
}

export async function startBackup(baseUrl: string, token: string, prefixes?: string[]): Promise<StorageJob> {
    const res = await axios.post(`${baseUrl}${MAINTENANCE}/backup/run`, { prefixes }, authHeaders(token));
    return unwrap(res, 'شروع بک‌آپ ناموفق بود');
}

export async function startRestore(baseUrl: string, token: string, body: { prefixes?: string[]; relink: boolean }): Promise<StorageJob> {
    const res = await axios.post(`${baseUrl}${MAINTENANCE}/restore`, body, authHeaders(token));
    return unwrap(res, 'شروع بازگردانی ناموفق بود');
}

export async function listStorageJobs(baseUrl: string, token: string): Promise<StorageJob[]> {
    const res = await axios.get(`${baseUrl}${MAINTENANCE}/jobs?limit=20`, authHeaders(token));
    return unwrap<{ jobs: StorageJob[] }>(res, 'دریافت کارها ناموفق بود').jobs || [];
}

export async function getStorageJob(baseUrl: string, token: string, id: string): Promise<StorageJob> {
    const res = await axios.get(`${baseUrl}${MAINTENANCE}/jobs/${id}`, authHeaders(token));
    return unwrap(res, 'دریافت کار ناموفق بود');
}

export async function storageJobAction(
    baseUrl: string,
    token: string,
    id: string,
    action: 'pause' | 'resume' | 'cancel',
): Promise<StorageJob> {
    const res = await axios.post(`${baseUrl}${MAINTENANCE}/jobs/${id}/${action}`, {}, authHeaders(token));
    return unwrap(res, 'تغییر وضعیت کار ناموفق بود');
}
