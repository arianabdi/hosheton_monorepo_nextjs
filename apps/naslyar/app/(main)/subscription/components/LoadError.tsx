'use client';

import { TbAlertTriangle } from 'react-icons/tb';
import etr from '../../error-tracking/ErrorTracking.module.scss';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import styles from '../Subscription.module.scss';

/**
 * Turns a failed admin request into a message the admin can act on — instead of an empty state that
 * pretends there is no data. 404 on /api/subscription/admin/* = the app's API runs an older core.
 */
export function describeLoadError(error: unknown): { title: string; hint: string } {
    const e = error as { response?: { status?: number; data?: { message?: string } }; message?: string; code?: string } | null;
    const status = e?.response?.status;
    if (!e?.response) {
        return {
            title: 'API اپ در دسترس نیست',
            hint: 'سرور API این اپ پاسخ نمی‌دهد (خاموش، در حال ری‌استارت یا آدرس اشتباه). API را اجرا کنید و دوباره تلاش کنید.',
        };
    }
    if (status === 404) {
        return {
            title: 'API این اپ نسخه جدید ماژول اشتراک را ندارد',
            hint: 'این بخش از پنل به endpointهای تازه‌ای نیاز دارد که هنوز روی API این اپ نیستند. API را با آخرین کد (libs/core/src/subscription) دوباره build و deploy/ری‌استارت کنید.',
        };
    }
    if (status === 401 || status === 403) {
        return { title: 'دسترسی ندارید', hint: 'نشست شما منقضی شده یا نقش ادمین ندارید. دوباره وارد شوید.' };
    }
    return { title: 'دریافت اطلاعات ناموفق بود', hint: e?.response?.data?.message || e?.message || 'خطای نامشخص' };
}

export default function LoadError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
    const { baseUrl } = useAppStore();
    const { title, hint } = describeLoadError(error);
    return (
        <div className={etr.tableEmpty} role="alert">
            <TbAlertTriangle className={styles.warn} size={18} />
            <div>
                <strong>{title}</strong>
                <div>{hint}</div>
                {baseUrl ? <div className={`${styles.muted} ${styles.ltr}`}>{baseUrl}</div> : null}
            </div>
            <button type="button" className={etr.linkBtn} onClick={onRetry}>تلاش دوباره</button>
        </div>
    );
}
