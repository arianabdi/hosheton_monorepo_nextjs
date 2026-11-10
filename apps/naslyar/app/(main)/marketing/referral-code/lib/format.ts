import type { AdminUserSummary } from './referral.types';

const numberFormat = new Intl.NumberFormat('fa-IR');
const dateFormat = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' });
const dateTimeFormat = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' });

export const formatNumber = (value: number) => numberFormat.format(value || 0);
export const formatToman = (value: number) => `${numberFormat.format(Math.round(value || 0))} تومان`;

export function formatDate(iso?: string | null, withTime = false): string {
    if (!iso) return '—';
    const date = new Date(iso);
    return isNaN(date.getTime()) ? '—' : (withTime ? dateTimeFormat : dateFormat).format(date);
}

/** نام کاربر برای جدول ادمین؛ کاربر بی‌نام با موبایل، و حذف‌شده با «—» */
export function userLabel(user: AdminUserSummary | null): { name: string; detail: string } {
    if (!user) return { name: 'کاربر حذف‌شده', detail: '' };
    return { name: user.fullName || user.mobile || 'بدون نام', detail: user.fullName ? user.mobile : '' };
}

/** «<input type="datetime-local">» ↔ ISO */
export function isoToLocalInput(value: string | null): string {
    if (!value) return '';
    const date = new Date(value);
    if (isNaN(date.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function localInputToIso(value: string): string | null {
    if (!value) return null;
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date.toISOString();
}
