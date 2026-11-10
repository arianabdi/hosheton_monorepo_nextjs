// support/lib/support-api.ts — لایه تمیز ارتباط با بک‌اند ماژول Support مونو‌ریپو
import axios from 'axios';

export interface SupportCategory {
    _id: string;
    title: string;
    color: string;
    description?: string;
    ticketCount?: number;
    createdAt?: string;
}

export interface SupportCategoryRef {
    _id: string;
    title: string;
    color: string;
}

export interface SupportTicketItem {
    _id: string;
    title: string;
    status: string;
    priority: string;
    categoryId?: SupportCategoryRef | null;
    createdAt?: string;
    updatedAt?: string;
}

export interface SupportMessageItem {
    _id: string;
    content: string;
    senderRole: string;
    senderId?: string;
    createdAt?: string;
    attachments?: string[];
    senderDetails?: { fullName?: string; avatar?: string; email?: string } | null;
}

export interface SupportTicketFilters {
    search?: string;
    status?: string;
    priority?: string;
    categoryId?: string;
    startDate?: string;
    endDate?: string;
}

export const SUPPORT_STATUS_LABELS: Record<string, string> = {
    open: 'باز',
    pending: 'در حال بررسی',
    resolved: 'پاسخ داده شده',
    closed: 'بسته شده',
};

export const SUPPORT_PRIORITY_LABELS: Record<string, string> = {
    low: 'کم',
    medium: 'متوسط',
    high: 'فوری',
};

export const DEFAULT_CATEGORIES = [
    { title: 'تسویه حساب', color: '#10b981', description: 'موضوعات مالی، تسویه و پرداخت‌ها' },
    { title: 'مسائل فنی', color: '#7b58fd', description: 'خطاها و مشکلات فنی پلتفرم' },
    { title: 'پیشنهاد و انتقاد', color: '#f59e0b', description: 'نظرات و پیشنهادات کاربران' },
];

const api = (baseUrl: string) => String(baseUrl || process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');

const headers = (token: string | null | undefined) => ({ authorization: `Bearer ${token}` });

function unwrap<T>(res: { data: { data?: T } }): T {
    return res.data?.data as T;
}

// ============================ تیکت‌ها ============================

export async function fetchAdminTickets(
    baseUrl: string,
    token: string | null | undefined,
    filters: SupportTicketFilters,
    page: number,
    limit: number,
): Promise<{ items: SupportTicketItem[]; total: number; page: number; limit: number }> {
    const query = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(filters.search && { search: filters.search }),
        ...(filters.status && { status: filters.status }),
        ...(filters.priority && { priority: filters.priority }),
        ...(filters.categoryId && { categoryId: filters.categoryId }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
    });
    const res = await axios.get(`${api(baseUrl)}/api/support/admin?${query.toString()}`, { headers: headers(token) });
    return unwrap(res);
}

export async function fetchTicketDetails(
    baseUrl: string,
    token: string | null | undefined,
    ticketId: string,
): Promise<{ ticket: SupportTicketItem; messages: SupportMessageItem[] }> {
    const res = await axios.get(`${api(baseUrl)}/api/support/ticket/${ticketId}`, { headers: headers(token) });
    return unwrap(res);
}

export async function replyToTicket(
    baseUrl: string,
    token: string | null | undefined,
    ticketId: string,
    content: string,
    attachments?: string[],
): Promise<SupportMessageItem> {
    const res = await axios.post(
        `${api(baseUrl)}/api/support/ticket/${ticketId}/reply`,
        { content, ...(attachments?.length ? { attachments } : {}) },
        { headers: headers(token) },
    );
    return unwrap(res);
}

export async function updateTicketStatus(baseUrl: string, token: string | null | undefined, ticketId: string, status: string): Promise<SupportTicketItem> {
    const res = await axios.put(
        `${api(baseUrl)}/api/support/admin/ticket/${ticketId}/status`,
        { status },
        { headers: headers(token) },
    );
    return unwrap(res);
}

/** آپدیت عملیاتی از منوی اکشن — وضعیت/اولویت/دسته‌بندی در یک فراخوانی */
export async function updateTicketAdmin(
    baseUrl: string,
    token: string | null | undefined,
    ticketId: string,
    patch: { status?: string; priority?: string; categoryId?: string | null },
): Promise<SupportTicketItem> {
    const res = await axios.put(
        `${api(baseUrl)}/api/support/admin/ticket/${ticketId}/details`,
        patch,
        { headers: headers(token) },
    );
    return unwrap(res);
}

// ============================ دسته‌بندی‌ها ============================

export async function listCategories(baseUrl: string, token: string | null | undefined): Promise<SupportCategory[]> {
    const res = await axios.get(`${api(baseUrl)}/api/support/admin/categories`, { headers: headers(token) });
    return unwrap(res) || [];
}

export async function createCategory(baseUrl: string, token: string | null | undefined, payload: { title: string; color?: string; description?: string }): Promise<SupportCategory> {
    const res = await axios.post(`${api(baseUrl)}/api/support/admin/categories`, payload, { headers: headers(token) });
    return unwrap(res);
}

export async function updateCategory(baseUrl: string, token: string | null | undefined, categoryId: string, payload: { title?: string; color?: string; description?: string }): Promise<SupportCategory> {
    const res = await axios.put(`${api(baseUrl)}/api/support/admin/categories/${categoryId}`, payload, { headers: headers(token) });
    return unwrap(res);
}

export async function deleteCategory(baseUrl: string, token: string | null | undefined, categoryId: string): Promise<{ deleted: boolean }> {
    const res = await axios.delete(`${api(baseUrl)}/api/support/admin/categories/${categoryId}`, { headers: headers(token) });
    return unwrap(res);
}

// ============================ پیوست‌ها ============================

/** آپلود فایل/عکس پیوست چت — خروجی URL عمومی برای ذخیره در attachments پیام */
export async function uploadChatAttachment(baseUrl: string, token: string | null | undefined, file: File): Promise<string> {
    const form = new FormData();
    form.append('file', file, file.name);
    const res = await axios.post(`${api(baseUrl)}/api/file/multer/upload`, form, {
        headers: { ...headers(token), 'Content-Type': 'multipart/form-data' },
    });
    const data = unwrap<{ original?: { path?: string } }>(res);
    const url = data?.original?.path;
    if (!url) throw new Error('UPLOAD_FAILED');
    return url;
}

// آدرس‌های جدید به‌صورت URL عمومی کامل ذخیره می‌شوند؛ آدرس‌های قدیمی نسبی بودند
export const resolveAttachmentUrl = (url: string) =>
    /^https?:\/\//i.test(url)
        ? url
        : `${api(process.env.NEXT_PUBLIC_API_URL || '')}/${String(url).replace(/^\/+/, '')}`;

export type AttachmentKind = 'image' | 'video' | 'file';

export const getAttachmentKind = (url: string): AttachmentKind => {
    const clean = url.split('?')[0].toLowerCase();
    if (/\.(jpe?g|png|gif|webp|bmp|svg|avif)$/.test(clean)) return 'image';
    if (/\.(mp4|webm|mov|m4v|avi|mkv)$/.test(clean)) return 'video';
    return 'file';
};

export const getAttachmentName = (url: string) => {
    try {
        const last = decodeURIComponent(url.split('?')[0].split('/').pop() || '');
        return last.replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i, '');
    } catch {
        return '';
    }
};

export const formatFileSize = (bytes: number) => {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
    if (bytes >= 1024) return `${Math.round(bytes / 1024)}KB`;
    return `${bytes}B`;
};
