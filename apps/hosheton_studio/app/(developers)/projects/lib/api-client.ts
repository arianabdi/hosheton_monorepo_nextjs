import axios, { AxiosInstance } from 'axios';
import { detectStatusIssue, getHoshetonErrorMessage, markServerReachable, reportStatusIssue } from '@/app/lib/errors';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { GuestActionBlockedError, isGuestActionBlocked, promptGuestLogin } from '@/app/components/guest/guestAccess';

/**
 * بنر وضعیت اتصال (app/lib/errors/status): هر پاسخ سرور یعنی اتصال برقرار است؛
 * قطعی (حتی در درخواست بی‌صدا) بنر را باز می‌کند. هر axios.create جدید در اپ از این رد شود.
 */
export function attachStatusInterceptors(client: AxiosInstance): AxiosInstance {
    client.interceptors.response.use(
        (response) => {
            markServerReachable();
            return response;
        },
        (error: unknown) => {
            const issue = detectStatusIssue(error);
            if (issue) void reportStatusIssue(issue);
            else if ((error as { response?: { status?: number } })?.response?.status) markServerReachable();
            return Promise.reject(error);
        },
    );
    return client;
}

/** `allowGuest`: endpoint عمومی نوشتنی که مهمان هم می‌تواند صدا بزند (مثل تخمین هزینه) */
export function createApiClient(options?: { allowGuest?: boolean }): AxiosInstance {
    const authToken = useAuthStore.getState().token;
    const appToken = useAppStore.getState().token;
    const token = authToken || appToken;

    const client = axios.create({
        baseURL: process.env.NEXT_PUBLIC_API_URL,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    });
    // مهمان (بدون ورود) هر کار نوشتنی (ساختن، ذخیره، آپلود…) بخواهد: پنجره‌ی ورود، بدون درخواست به سرور
    if (!token && !options?.allowGuest) {
        client.interceptors.request.use((config) => {
            const method = String(config.method || 'get').toLowerCase();
            if (method === 'get' || method === 'head' || method === 'options') return config;
            promptGuestLogin();
            return Promise.reject(new GuestActionBlockedError());
        });
    }
    return attachStatusInterceptors(client);
}

export type ApiResponse<T> = {
    data: T;
    statusCode: number;
    message?: string;
};

export function unwrapApiData<T>(res: { data: ApiResponse<T> }): T {
    return res.data.data;
}

/**
 * پیام قابل نمایش خطای API — همیشه پیام هوشتون (app/lib/errors):
 * پیام تمیز خود API همان، متن خام ارائه‌دهنده/فنی ← پیام دسته‌بندی‌شده، خطای عمومی ← fallback صفحه.
 */
export function getApiErrorMessage(err: unknown, fallback?: string): string {
    // اقدام مسدود مهمان: پنجره‌ی ورود باز است، پیام خطا لازم نیست
    if (isGuestActionBlocked(err)) return '';
    if (err == null) return fallback || getHoshetonErrorMessage(err);
    return getHoshetonErrorMessage(err, { kind: 'request', fallback });
}
