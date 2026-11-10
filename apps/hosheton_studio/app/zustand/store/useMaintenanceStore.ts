import { create } from 'zustand';
import { normalizePageMaintenanceRules, type PageMaintenanceRule } from '@my-workspace/utils';

interface MaintenanceState {
    /** حالت نگهداری فعال است؟ تا قبل از اولین چک false است (fail-open) */
    enabled: boolean;
    /** اولین چک وضعیت انجام شده؟ */
    checked: boolean;
    /** عنوان سفارشی صفحه — خالی یعنی عنوان پیش‌فرض ترجمه‌شده */
    title: string;
    /** محتوای سفارشی صفحه — خالی یعنی متن پیش‌فرض ترجمه‌شده */
    content: string;
    /** قانون‌های فعال «بروزرسانی صفحه» — تطبیق با مسیر در PageMaintenanceBoundary */
    pageRules: PageMaintenanceRule[];
    fetchStatus: () => Promise<void>;
}

/**
 * وضعیت سراسری حالت نگهداری — از endpoint عمومی تنظیمات وبسایت خوانده می‌شود
 * (GET /api/system-setting/public/website → data.info.maintenance* و data.pageMaintenance).
 * خطا = غیرفعال تا در نبود endpoint سایت بالا نیاید.
 */
export const useMaintenanceStore = create<MaintenanceState>((set) => ({
    enabled: false,
    checked: false,
    title: '',
    content: '',
    pageRules: [],
    fetchStatus: async () => {
        try {
            const apiUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');
            const res = await fetch(`${apiUrl}/api/system-setting/public/website`, { cache: 'no-store' });
            const body = await res.json();
            // شکل پاسخ: data.info (نگاشت گروه website) — با fallback به خود data
            const data = body?.data || {};
            const info = data.info || data;
            set({
                enabled: Boolean(info.maintenanceEnabled),
                title: String(info.maintenanceTitle || ''),
                content: String(info.maintenanceContent || info.maintenanceMessage || ''),
                pageRules: normalizePageMaintenanceRules(data.pageMaintenance),
                checked: true,
            });
        } catch {
            // endpoint در دسترس نیست — حالت نگهداری را غیرفعال فرض کن
            set({ enabled: false, checked: true });
        }
    },
}));
