import type { AiAvatarStatus } from '@/app/(developers)/projects/types/ai-avatar-api';
import { formatAppDate } from '@/app/lib/i18n/formatLocaleNumber';

export const STATUS_LABELS: Record<AiAvatarStatus, string> = {
    draft: 'status_draft',
    admin_pending: 'status_admin_pending',
    verification_pending: 'status_verification_pending',
    verification_failed: 'status_verification_failed',
    asset_uploading: 'status_asset_uploading',
    asset_review: 'status_asset_review',
    active: 'status_active',
    rejected: 'status_rejected',
    error: 'status_error',
};

/** English copy for ID card face only */
export const STATUS_LABELS_EN: Record<AiAvatarStatus, string> = {
    draft: 'DRAFT',
    admin_pending: 'ADMIN REVIEW',
    verification_pending: 'VERIFYING',
    verification_failed: 'VERIFY FAILED',
    asset_uploading: 'READY',
    asset_review: 'IN REVIEW',
    active: 'ACTIVE',
    rejected: 'REJECTED',
    error: 'ERROR',
};

export function statusTone(status: AiAvatarStatus): 'active' | 'draft' | 'pending' | 'error' {
    if (status === 'active') return 'active';
    if (status === 'draft' || status === 'asset_uploading') return 'draft';
    if (
        status.includes('pending') ||
        status === 'asset_review' ||
        status === 'admin_pending'
    ) {
        return 'pending';
    }
    return 'error';
}

export function formatAvatarDate(value?: string, lang?: string): string {
    if (!value) return '—';
    try {
        if (lang) return formatAppDate(value, lang);
        return new Date(value).toLocaleDateString();
    } catch {
        return value;
    }
}

export function formatAvatarDateEn(value?: string): string {
    if (!value) return '—';
    try {
        const d = new Date(value);
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${dd}.${mm}.${yyyy}`;
    } catch {
        return value;
    }
}

export function avatarDisplayId(id: string): string {
    const compact = id.replace(/\W/g, '').toUpperCase();
    return compact.slice(-7).padStart(7, '0');
}
