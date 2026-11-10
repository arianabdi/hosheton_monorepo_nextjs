import { INVOICE_PURPOSE_LABEL, INVOICE_TYPE_LABEL } from './invoice-labels';

export interface InvoiceListFilters {
    status: string;
    type: string;
    purpose: string;
    userId: string;
    query: string;
}

export const DEFAULT_INVOICE_FILTERS: InvoiceListFilters = {
    status: 'all',
    type: 'all',
    purpose: 'all',
    userId: '',
    query: '',
};

export interface InvoiceFilterRow {
    _id: string;
    userId: string;
    type: string;
    amount: number;
    status: string;
    metadata?: { description?: string; purpose?: string };
    createdAt?: string;
}

export function hasActiveInvoiceFilters(filters: InvoiceListFilters): boolean {
    return (
        filters.status !== 'all'
        || filters.type !== 'all'
        || filters.purpose !== 'all'
        || Boolean(filters.userId.trim())
        || Boolean(filters.query.trim())
    );
}

export function countActiveInvoiceFilterDimensions(filters: InvoiceListFilters): number {
    let n = 0;
    if (filters.status !== 'all') n += 1;
    if (filters.type !== 'all') n += 1;
    if (filters.purpose !== 'all') n += 1;
    if (filters.userId.trim()) n += 1;
    if (filters.query.trim()) n += 1;
    return n;
}

export type InvoiceUserLookup = Record<string, { name: string; email: string } | undefined>;

export function applyInvoiceFilters(
    rows: InvoiceFilterRow[],
    filters: InvoiceListFilters,
    userLookup: InvoiceUserLookup = {},
): InvoiceFilterRow[] {
    const q = filters.query.trim().toLowerCase();
    const uid = filters.userId.trim();

    return rows.filter((inv) => {
        if (filters.status !== 'all' && inv.status !== filters.status) return false;
        if (filters.type !== 'all' && inv.type !== filters.type) return false;
        if (filters.purpose !== 'all') {
            const p = inv.metadata?.purpose || '';
            if (p !== filters.purpose) return false;
        }
        if (uid && String(inv.userId || '') !== uid) return false;
        if (q) {
            const user = userLookup[inv.userId];
            const hay = [
                user?.name,
                user?.email,
                inv.metadata?.description,
                inv.metadata?.purpose,
                inv.status,
                inv.type,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            if (!hay.includes(q)) return false;
        }
        return true;
    });
}

export function getInvoiceFilterChips(
    filters: InvoiceListFilters,
    options?: { userLabel?: string },
): { key: keyof InvoiceListFilters; label: string }[] {
    const chips: { key: keyof InvoiceListFilters; label: string }[] = [];
    const statusLabels: Record<string, string> = {
        pending: 'در انتظار پرداخت',
        paid: 'پرداخت شده',
        failed: 'ناموفق',
        canceled: 'لغو شده',
        expired: 'منقضی شده',
        awaiting_receipt: 'منتظر رسید',
        awaiting_review: 'در انتظار بررسی',
        rejected: 'رد شده',
    };
    const purposeLabels: Record<string, string> = INVOICE_PURPOSE_LABEL;

    if (filters.status !== 'all') {
        chips.push({ key: 'status', label: `وضعیت: ${statusLabels[filters.status] || filters.status}` });
    }
    if (filters.type !== 'all') {
        chips.push({ key: 'type', label: `نوع: ${INVOICE_TYPE_LABEL[filters.type] || filters.type}` });
    }
    if (filters.purpose !== 'all') {
        chips.push({ key: 'purpose', label: `منبع: ${purposeLabels[filters.purpose] || filters.purpose}` });
    }
    if (filters.userId.trim()) {
        const label = options?.userLabel?.trim() || filters.userId.trim();
        chips.push({ key: 'userId', label: `کاربر: ${label}` });
    }
    if (filters.query.trim()) {
        chips.push({ key: 'query', label: `جستجو: ${filters.query.trim()}` });
    }
    return chips;
}
