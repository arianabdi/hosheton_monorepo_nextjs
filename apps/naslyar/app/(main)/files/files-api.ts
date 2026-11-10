import axios from 'axios';
import type { FileBrowseStats, FileCategory, FileListQuery, FileManagerFile, FileOwnerOption, FileSource } from './files.types';

/**
 * کلاینت API ماژول فایل — endpoints سمت core:
 * GET  /api/file/explore            لیست همه فایل‌ها (بدون limit = همه رکوردها)
 * GET  /api/file/explore/delete/:id حذف نرم + حذف از استوریج
 * GET  /api/file/:id                جزئیات یک فایل
 */

export const CATEGORY_EXTENSIONS: Record<Exclude<FileCategory, 'all' | 'other'>, string[]> = {
    images: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'avif', 'ico', 'heic'],
    videos: ['mp4', 'mov', 'webm', 'avi', 'mkv', 'wmv', 'flv', 'm4v', 'mpg', 'mpeg'],
    audios: ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'wma'],
    documents: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'rtf', 'md'],
};

export async function listFiles(
    baseUrl: string,
    token: string,
    query?: FileListQuery,
): Promise<{ files: FileManagerFile[]; totalItems: number }> {
    const params: Record<string, string | number> = query
        ? {
            page: query.page || 1,
            limit: query.limit || 24,
        }
        : { page: 1, limit: 5000 };
    if (query?.q) params.q = query.q;
    if (query?.bucket) params.bucket = query.bucket;
    if (query?.userId) params.userId = query.userId;
    if (query?.email) params.email = query.email;
    if (query?.minSize) params.minSize = query.minSize;
    if (query?.maxSize) params.maxSize = query.maxSize;
    if (query?.from) params.from = query.from;
    if (query?.to) params.to = query.to;
    if (query?.includeRelated) params.includeRelated = 'true';
    if (query?.variant === 'thumbnail') params.isThumbnail = 'true';
    if (query?.variant === 'original') params.role = 'original';
    if (query?.variant === 'chat-optimized') params.role = 'chat-optimized';

    const res = await axios.get(`${baseUrl}/api/file/explore`, {
        params,
        headers: { authorization: `Bearer ${token}` },
    });
    if (res?.data?.statusCode !== 200) {
        throw new Error(res?.data?.message || 'دریافت فایل‌ها ناموفق بود');
    }
    const files: FileManagerFile[] = Array.isArray(res.data.data?.files) ? res.data.data.files : [];
    const visible = query ? files : files.filter((file) => !file.isThumbnail);
    return { files: visible, totalItems: res.data.data?.totalItems ?? visible.length };
}

/** سرویس فعلی فهرست ادمین استودیو را ندارد (اپ‌های غیر استودیو) — برگشت به /api/file/explore */
export class AdminFilesUnavailableError extends Error {}

/**
 * GET /api/studio/admin/files — همهٔ فایل‌های همهٔ کاربران در یک فهرست: آپلودها + خروجی‌های تولیدی مدل‌ها
 * (خروجی‌ها در جدول files نیستند؛ API از اجراهای استودیو می‌خواند و همان شکل رکورد فایل را برمی‌گرداند).
 */
export async function listAdminFiles(
    baseUrl: string,
    token: string,
    query: FileListQuery & { source?: FileSource },
): Promise<{ files: FileManagerFile[]; totalItems: number }> {
    const params: Record<string, string | number> = { page: query.page || 1, limit: query.limit || 24 };
    for (const key of ['q', 'bucket', 'userId', 'email', 'from', 'to', 'minSize', 'maxSize'] as const) {
        if (query[key]) params[key] = query[key] as string | number;
    }
    if (query.variant && query.variant !== 'all') params.variant = query.variant;
    if (query.source && query.source !== 'all') params.source = query.source;
    try {
        const res = await axios.get(`${baseUrl}/api/studio/admin/files`, {
            params,
            headers: { authorization: `Bearer ${token}` },
        });
        if (res?.data?.statusCode !== 200) {
            throw new Error(res?.data?.message || 'دریافت فایل‌ها ناموفق بود');
        }
        return {
            files: Array.isArray(res.data.data?.files) ? res.data.data.files : [],
            totalItems: res.data.data?.totalItems ?? 0,
        };
    } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
            throw new AdminFilesUnavailableError('این سرویس فهرست ادمین فایل‌ها را ندارد');
        }
        throw error;
    }
}

/** پیشنهاد کاربر برای فیلتر «کاربر» (ایمیل، نام یا موبایل) — در سرویس‌های غیر استودیو فهرست خالی */
export async function searchFileOwners(baseUrl: string, token: string, q: string): Promise<FileOwnerOption[]> {
    try {
        const res = await axios.get(`${baseUrl}/api/studio/admin/files/users`, {
            params: { q },
            headers: { authorization: `Bearer ${token}` },
        });
        return Array.isArray(res.data?.data) ? res.data.data : [];
    } catch {
        return [];
    }
}

export async function getFileStats(baseUrl: string, token: string): Promise<FileBrowseStats> {
    const res = await axios.get(`${baseUrl}/api/file/explore/stats`, {
        headers: { authorization: `Bearer ${token}` },
    });
    if (res?.data?.statusCode !== 200) {
        throw new Error(res?.data?.message || 'دریافت آمار فایل‌ها ناموفق بود');
    }
    const data = res.data.data || {};
    return {
        all: data.all || { count: 0, totalSize: 0 },
        buckets: data.buckets || {},
    };
}

export async function deleteFile(baseUrl: string, token: string, id: string): Promise<void> {
    const res = await axios.get(`${baseUrl}/api/file/explore/delete/${id}`, {
        headers: { authorization: `Bearer ${token}` },
    });
    if (res?.data?.statusCode !== 200) {
        throw new Error(res?.data?.message || 'حذف فایل ناموفق بود');
    }
}

/** تشخیص دسته‌بندی یک فایل از روی پسوند و mimetype */
export function detectFileCategory(file: FileManagerFile): Exclude<FileCategory, 'all'> {
    const ext = (file.ext || file.name?.split('.').pop() || '').toLowerCase().replace('.', '');
    for (const [category, exts] of Object.entries(CATEGORY_EXTENSIONS)) {
        if (exts.includes(ext)) return category as Exclude<FileCategory, 'all'>;
    }
    const mimetype = file.mimetype || '';
    if (mimetype.startsWith('image/')) return 'images';
    if (mimetype.startsWith('video/')) return 'videos';
    if (mimetype.startsWith('audio/')) return 'audios';
    if (mimetype === 'application/pdf' || mimetype.includes('document') || mimetype.includes('sheet')) {
        return 'documents';
    }
    return 'other';
}
