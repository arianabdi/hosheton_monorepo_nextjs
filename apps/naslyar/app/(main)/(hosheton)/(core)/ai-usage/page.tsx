'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Line,
    LineChart,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import {
    LuArrowDown,
    LuArrowUp,
    LuArrowUpDown,
    LuChevronDown,
    LuCircleCheck,
    LuCircleHelp,
    LuClock3,
    LuRefreshCw,
    LuSearch,
    LuX,
} from 'react-icons/lu';
import { Container, Wrapper } from '@/app/(main)/layout';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { ErrorToaster, SuccessToaster, toFarsiNumber } from '@my-workspace/utils';
import { LoadingState, Pagination } from '@my-workspace/components';
import SimpleLineTabs from '@/app/components/SimpleLineTabs/SimpleLineTabs';
import shared from '../providers/Providers.module.scss';
import styles from './AiUsage.module.scss';
import AiUsageGuide from './components/AiUsageGuide';
import AsyncFilterCombobox, { type FilterOption } from './components/AsyncFilterCombobox';

// ----------------------------- تایپ‌های پاسخ api/studio/admin/ai-usage -----------------------------

type Basis = 'charged' | 'base';

interface MoneyStats {
    count: number;
    chargedUsd: number;
    quotedUsd: number;
    /** مبلغ مقایسه: کسر از کاربر، یا در حالت «بدون مارکاپ» همان مبلغ منهای مارکاپ اعمال‌شده */
    amountUsd: number;
    resolvedCount: number;
    resolvedAmountUsd: number;
    vendorCostUsd: number;
    profitUsd: number;
    profitPercent: number | null;
    marginPercent: number | null;
    lossCount: number;
    pendingCount: number;
    unavailableCount: number;
    quoteMismatchCount: number;
    quoteDiffUsd: number;
    markupUnknownCount: number;
    userCount: number;
}

interface Overview {
    basis: Basis;
    totals: MoneyStats;
    daily: Array<MoneyStats & { date: string }>;
    byModel: Array<MoneyStats & { modelId: string; modelName: string; providerName: string }>;
    byProvider: Array<MoneyStats & { providerName: string }>;
    byUser: Array<MoneyStats & { userId: string; userName: string; userEmail: string }>;
    profitDistribution: Array<{ from: number | null; count: number; profitUsd: number }>;
}

interface UsageRecord {
    _id: string;
    createdAt: string;
    userId: string;
    userName?: string;
    userEmail?: string;
    runId?: string;
    modelId?: string;
    modelName?: string;
    providerName: string;
    providerRequestId?: string;
    chargeSource: 'quote' | 'estimate';
    paidFrom: 'wallet' | 'project_budget';
    quotedUsd?: number;
    chargedUsd: number;
    markupPercent?: number;
    amountUsd: number;
    vendorCostUsd?: number;
    vendorCostStatus: 'pending' | 'resolved' | 'unavailable';
    vendorCostSource?: string;
    vendorCostNote?: string;
    amountProfitUsd?: number | null;
    amountProfitPercent?: number | null;
    quoteDiffUsd?: number | null;
}

// ----------------------------- قالب‌بندی -----------------------------

/** همان دقت نمایش قیمت در چت استودیو: ≥$1 دو رقم، ≥$0.01 چهار رقم، کمتر شش رقم */
function usd(value?: number | null): string {
    if (value == null || !Number.isFinite(value)) return '—';
    const abs = Math.abs(value);
    const digits = abs >= 1 ? 2 : abs >= 0.01 ? 4 : 6;
    return `${value < 0 ? '−' : ''}$${abs.toFixed(digits)}`;
}

function pct(value?: number | null): string {
    if (value == null || !Number.isFinite(value)) return '—';
    const sign = value > 0 ? '+' : value < 0 ? '−' : '';
    return `${sign}${toFarsiNumber(Math.abs(value).toFixed(1))}٪`;
}

function count(value?: number | null): string {
    return toFarsiNumber(String(value ?? 0));
}

function shortDate(iso: string): string {
    return iso?.slice(5).replace('-', '/') || '';
}

/** متن‌هایی که با مبنای مقایسه عوض می‌شوند */
const BASIS_TEXT: Record<Basis, {
    amount: string;
    profit: string;
    profitPercent: string;
    profitChart: string;
    modelChart: string;
    modelChartHint: string;
    gain: string;
    loss: string;
}> = {
    charged: {
        amount: 'کسر از کاربر',
        profit: 'سود',
        profitPercent: 'سود ٪',
        profitChart: 'سود روزانه',
        modelChart: 'سود به تفکیک مدل',
        modelChartHint: 'درصد سود روی هزینه واقعی. مدل قرمز یعنی کمتر از هزینه می‌فروشیم.',
        gain: 'سود',
        loss: 'زیان',
    },
    base: {
        amount: 'مبلغ بدون مارکاپ',
        profit: 'اختلاف فرمول',
        profitPercent: 'خطای فرمول ٪',
        profitChart: 'اختلاف روزانه فرمول با هزینه واقعی',
        modelChart: 'خطای فرمول به تفکیک مدل',
        modelChartHint: 'مارکاپ (اختصاصی مدل یا عمومی) کنار گذاشته شده؛ فقط دقت فرمول قیمت دیده می‌شود. قرمز = فرمول کمتر از هزینه واقعی حساب می‌کند، آبی = بیشتر.',
        gain: 'فرمول بیشتر از هزینه',
        loss: 'فرمول کمتر از هزینه',
    },
};

const RANGES = [
    { id: '7', label: '۷ روز' },
    { id: '30', label: '۳۰ روز' },
    { id: '90', label: '۹۰ روز' },
    { id: 'all', label: 'همه' },
];

const OUTCOMES = [
    { id: '', label: 'همه' },
    { id: 'loss', label: 'زیان‌ده' },
    { id: 'profit', label: 'سودده' },
    { id: 'mismatch', label: 'اختلاف نمایش و کسر' },
];

const RECORD_SORTS = [
    { id: 'createdAt', label: 'زمان' },
    { id: 'amount', label: 'مبلغ مقایسه' },
    { id: 'charged', label: 'کسر از کاربر' },
    { id: 'vendor', label: 'هزینه واقعی' },
    { id: 'profit', label: 'سود / اختلاف (مبلغ)' },
    { id: 'profitPercent', label: 'سود / اختلاف (درصد)' },
    { id: 'quoteDiff', label: 'اختلاف نمایش و کسر' },
];

const DISTRIBUTION_RANGES: Record<string, string> = {
    '-1000000': 'کمتر از −۵۰٪',
    '-50': '−۵۰ تا −۲۰٪',
    '-20': '−۲۰ تا −۵٪',
    '-5': '±۵٪',
    '5': '+۵ تا +۲۰٪',
    '20': '+۲۰ تا +۵۰٪',
    '50': '+۵۰ تا +۱۰۰٪',
    '100': 'بیش از +۱۰۰٪',
};

const STATUS_META = {
    resolved: { label: 'دریافت شد', icon: LuCircleCheck, className: styles.statusResolved },
    pending: { label: 'در انتظار', icon: LuClock3, className: styles.statusPending },
    unavailable: { label: 'نامشخص', icon: LuCircleHelp, className: styles.statusUnavailable },
} as const;

const SOURCE_LABELS: Record<string, string> = {
    provider_response: 'از پاسخ ارائه‌دهنده',
    provider_api: 'از API ارائه‌دهنده',
    model_config: 'از تنظیمات مدل',
};

function polarityColor(value: number | null | undefined, neutralBand = 0): string {
    if (value == null || Math.abs(value) <= neutralBand) return 'var(--polarity-neutral)';
    return value > 0 ? 'var(--polarity-gain)' : 'var(--polarity-loss)';
}

// ----------------------------- tooltip ها -----------------------------

function DailyTooltip({ active, payload, basis }: {
    active?: boolean;
    payload?: Array<{ payload: Overview['daily'][number] }>;
    basis: Basis;
}) {
    const row = active ? payload?.[0]?.payload : undefined;
    if (!row) return null;
    const text = BASIS_TEXT[basis];
    return (
        <div className={styles.tooltip}>
            <strong>{row.date}</strong>
            <div className={styles.tooltipRow}><span>{text.amount}</span><b>{usd(row.amountUsd)}</b></div>
            <div className={styles.tooltipRow}><span>هزینه واقعی</span><b>{usd(row.vendorCostUsd)}</b></div>
            <div className={styles.tooltipRow}><span>{text.profit}</span><b>{usd(row.profitUsd)}</b></div>
            <div className={styles.tooltipRow}><span>پردازش</span><b>{count(row.count)}</b></div>
            {row.resolvedCount < row.count ? (
                <div className={styles.tooltipRow}>
                    <span>بدون هزینه واقعی</span><b>{count(row.count - row.resolvedCount)}</b>
                </div>
            ) : null}
        </div>
    );
}

function ModelTooltip({ active, payload, basis }: {
    active?: boolean;
    payload?: Array<{ payload: Overview['byModel'][number] }>;
    basis: Basis;
}) {
    const row = active ? payload?.[0]?.payload : undefined;
    if (!row) return null;
    const text = BASIS_TEXT[basis];
    return (
        <div className={styles.tooltip}>
            <strong>{row.modelName}</strong>
            <div className={styles.tooltipRow}><span>ارائه‌دهنده</span><b>{row.providerName}</b></div>
            <div className={styles.tooltipRow}><span>{text.profitPercent}</span><b>{pct(row.profitPercent)}</b></div>
            <div className={styles.tooltipRow}><span>{text.amount}</span><b>{usd(row.resolvedAmountUsd)}</b></div>
            <div className={styles.tooltipRow}><span>هزینه واقعی</span><b>{usd(row.vendorCostUsd)}</b></div>
            <div className={styles.tooltipRow}><span>پردازش</span><b>{count(row.resolvedCount)}</b></div>
        </div>
    );
}

function DistributionTooltip({ active, payload }: {
    active?: boolean;
    payload?: Array<{ payload: { label: string; count: number; profitUsd: number } }>;
}) {
    const row = active ? payload?.[0]?.payload : undefined;
    if (!row) return null;
    return (
        <div className={styles.tooltip}>
            <strong>{row.label}</strong>
            <div className={styles.tooltipRow}><span>پردازش</span><b>{count(row.count)}</b></div>
            <div className={styles.tooltipRow}><span>جمع</span><b>{usd(row.profitUsd)}</b></div>
        </div>
    );
}

/** سرستون قابل مرتب‌سازی با aria-sort */
function SortHeader({ label, field, sort, dir, onSort }: {
    label: string;
    field: string;
    sort: string;
    dir: 'asc' | 'desc';
    onSort: (field: string) => void;
}) {
    const activeSort = sort === field;
    const Icon = !activeSort ? LuArrowUpDown : dir === 'asc' ? LuArrowUp : LuArrowDown;
    return (
        <th aria-sort={activeSort ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
            <button type="button" className={`${styles.sortBtn} ${activeSort ? styles.sortActive : ''}`} onClick={() => onSort(field)}>
                {label}
                <Icon size={12} aria-hidden />
            </button>
        </th>
    );
}

/** یک خط برچسب/مقدار در پنل جزئیات ردیف */
function DetailItem({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className={styles.detailItem}>
            <span className={styles.detailLabel}>{label}</span>
            <span className={styles.detailValue}>{children}</span>
        </div>
    );
}

/**
 * ردیف فشردهٔ پردازش: فقط ستون‌های تصمیم‌گیری (زمان، کاربر، مدل، مبلغ‌ها، سود)؛
 * کلیک روی ردیف شناسه‌ها، مبلغ نمایش‌داده، مارکاپ و جزئیات هزینه واقعی را زیرش باز می‌کند.
 */
function RecordRow({ record, basis, expanded, onToggle, refreshing, onRefresh }: {
    record: UsageRecord;
    basis: Basis;
    expanded: boolean;
    onToggle: () => void;
    refreshing: boolean;
    onRefresh: () => void;
}) {
    const text = BASIS_TEXT[basis];
    const status = STATUS_META[record.vendorCostStatus] || STATUS_META.pending;
    const StatusIcon = status.icon;
    const mismatch = (record.quoteDiffUsd ?? 0) > 0.0000005;
    const created = new Date(record.createdAt);
    const userLabel = record.userName || record.userEmail || record.userId;
    const detailId = `usage-record-${record._id}`;
    const colSpan = basis === 'base' ? 8 : 7;

    return (
        <>
            <tr
                className={`${styles.recordRow} ${expanded ? styles.recordRowOpen : ''} ${mismatch ? styles.mismatchRow : ''}`}
                onClick={(event) => {
                    if ((event.target as HTMLElement).closest('button, a')) return;
                    onToggle();
                }}
            >
                <td className={styles.expandCol} data-label="">
                    <button
                        type="button"
                        className={styles.expandBtn}
                        aria-expanded={expanded}
                        aria-controls={detailId}
                        aria-label={expanded ? 'بستن جزئیات' : 'نمایش جزئیات'}
                        onClick={onToggle}
                    >
                        <LuChevronDown size={15} aria-hidden />
                    </button>
                </td>
                <td data-label="زمان">
                    <span className={styles.cellPrimary}>{created.toLocaleDateString('fa-IR')}</span>
                    <span className={styles.cellSecondary}>{created.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</span>
                </td>
                <td data-label="کاربر" className={styles.truncateCell}>
                    <span className={styles.cellPrimary} title={record.userEmail || userLabel}>{userLabel}</span>
                    {record.paidFrom === 'project_budget' ? <span className={styles.cellSecondary}>بودجه پروژه</span> : null}
                </td>
                <td data-label="مدل" className={styles.truncateCell}>
                    <span className={`${styles.cellPrimary} ${shared.modelName}`} title={record.modelName}>{record.modelName || '—'}</span>
                    <span className={styles.cellSecondary}>{record.providerName}</span>
                </td>
                <td data-label="کسر از کاربر">
                    <span className={styles.money}>{usd(record.chargedUsd)}</span>
                    {mismatch ? <span className={styles.mismatchFlag} title="مبلغ کسرشده با مبلغ نمایش‌داده فرق دارد">≠ نمایش</span> : null}
                </td>
                {basis === 'base' ? (
                    <td data-label="بدون مارکاپ"><span className={styles.money}>{usd(record.amountUsd)}</span></td>
                ) : null}
                <td data-label="هزینه واقعی">
                    {record.vendorCostStatus === 'resolved' ? (
                        <span className={`${styles.statusBadge} ${status.className}`} title={status.label}>
                            <StatusIcon size={13} aria-hidden />
                            <span className={styles.money}>{usd(record.vendorCostUsd)}</span>
                        </span>
                    ) : (
                        <span className={`${styles.statusBadge} ${status.className}`}>
                            <StatusIcon size={13} aria-hidden />
                            {status.label}
                        </span>
                    )}
                </td>
                <td data-label={text.profit}>
                    {record.amountProfitUsd != null ? (
                        <span className={styles.profitCell} style={{ color: polarityColor(record.amountProfitUsd) }}>
                            <span className={styles.money}>{usd(record.amountProfitUsd)}</span>
                            <span className={styles.cellSecondary} dir="ltr">{pct(record.amountProfitPercent)}</span>
                        </span>
                    ) : <span className={styles.muted}>—</span>}
                </td>
            </tr>
            {expanded ? (
                <tr className={styles.recordDetailRow} id={detailId}>
                    <td colSpan={colSpan}>
                        <div className={styles.recordDetail}>
                            <div className={styles.detailGroup}>
                                <h4>شناسه‌ها</h4>
                                <DetailItem label="شماره پردازش"><code className={styles.idText}>{record.runId || '—'}</code></DetailItem>
                                <DetailItem label="شناسه ارائه‌دهنده"><code className={styles.idText}>{record.providerRequestId || 'ثبت نشده'}</code></DetailItem>
                                <DetailItem label="کاربر">{record.userName || '—'}</DetailItem>
                                {record.userEmail ? <DetailItem label="ایمیل"><span className={styles.idText}>{record.userEmail}</span></DetailItem> : null}
                                <DetailItem label="زمان کامل">{created.toLocaleString('fa-IR')}</DetailItem>
                            </div>
                            <div className={styles.detailGroup}>
                                <h4>مبلغ‌ها</h4>
                                <DetailItem label="نمایش‌داده به کاربر">
                                    {record.chargeSource === 'quote'
                                        ? <span className={styles.money}>{usd(record.quotedUsd)}</span>
                                        : <span className={styles.muted}>بدون مبلغ پیش از ارسال (تخمینی)</span>}
                                </DetailItem>
                                <DetailItem label="کسر از کاربر"><span className={styles.money}>{usd(record.chargedUsd)}</span></DetailItem>
                                <DetailItem label="مارکاپ">
                                    {record.markupPercent != null ? `${toFarsiNumber(String(record.markupPercent))}٪` : 'نامشخص'}
                                </DetailItem>
                                <DetailItem label="بدون مارکاپ"><span className={styles.money}>{usd(record.amountUsd)}</span></DetailItem>
                                <DetailItem label="اختلاف نمایش و کسر">
                                    {record.chargeSource !== 'quote'
                                        ? '—'
                                        : mismatch
                                            ? <span className={`${styles.money} ${styles.lossText}`}>{usd(record.quoteDiffUsd)}</span>
                                            : <span className={styles.muted}>بدون اختلاف</span>}
                                </DetailItem>
                                <DetailItem label="پرداخت از">{record.paidFrom === 'project_budget' ? 'بودجه پروژه' : 'کیف پول'}</DetailItem>
                            </div>
                            <div className={styles.detailGroup}>
                                <h4>هزینه واقعی و سود</h4>
                                <DetailItem label="وضعیت">
                                    <span className={`${styles.statusBadge} ${status.className}`}>
                                        <StatusIcon size={13} aria-hidden />
                                        {status.label}
                                    </span>
                                </DetailItem>
                                {record.vendorCostSource ? (
                                    <DetailItem label="منبع">{SOURCE_LABELS[record.vendorCostSource] || record.vendorCostSource}</DetailItem>
                                ) : null}
                                <DetailItem label="هزینه واقعی">
                                    {record.vendorCostStatus === 'resolved' ? <span className={styles.money}>{usd(record.vendorCostUsd)}</span> : '—'}
                                </DetailItem>
                                <DetailItem label={text.profit}>
                                    {record.amountProfitUsd != null ? (
                                        <span style={{ color: polarityColor(record.amountProfitUsd) }}>
                                            <span className={styles.money}>{usd(record.amountProfitUsd)}</span> · <span dir="ltr">{pct(record.amountProfitPercent)}</span>
                                        </span>
                                    ) : '—'}
                                </DetailItem>
                                {record.vendorCostNote ? <p className={styles.detailNote}>{record.vendorCostNote}</p> : null}
                                <div className={styles.detailActions}>
                                    <button
                                        type="button"
                                        className={styles.linkBtn}
                                        onClick={onRefresh}
                                        disabled={refreshing || !record.providerRequestId}
                                        title={record.providerRequestId ? 'هزینه واقعی دوباره از ارائه‌دهنده پرسیده می‌شود' : 'شناسه ارائه‌دهنده ثبت نشده'}
                                    >
                                        <LuRefreshCw size={13} aria-hidden />
                                        {refreshing ? 'در حال استعلام…' : 'استعلام دوباره هزینه واقعی'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </td>
                </tr>
            ) : null}
        </>
    );
}

type ModelSortKey = 'amountUsd' | 'vendorCostUsd' | 'profitUsd' | 'profitPercent' | 'count';

// ----------------------------- صفحه -----------------------------

function AiReportsPage() {
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const router = useRouter();
    const pathname = usePathname();
    const params = useSearchParams();

    // همه فیلترها در URL — لینک صفحه قابل اشتراک است و با بازگشت مرورگر حفظ می‌شود
    const tab = params.get('tab') === 'records' ? 'records' : 'overview';
    const range = params.get('range') || '30';
    const basis: Basis = params.get('basis') === 'base' ? 'base' : 'charged';
    const providerName = params.get('provider') || '';
    const outcome = params.get('outcome') || '';
    const modelFilter: FilterOption | null = params.get('model')
        ? { value: params.get('model') as string, label: params.get('modelLabel') || (params.get('model') as string) }
        : null;
    const userFilter: FilterOption | null = params.get('user')
        ? { value: params.get('user') as string, label: params.get('userLabel') || (params.get('user') as string) }
        : null;
    const statusFilter = params.get('status') || '';
    const search = params.get('q') || '';
    const sort = params.get('sort') || 'createdAt';
    const dir: 'asc' | 'desc' = params.get('dir') === 'asc' ? 'asc' : 'desc';
    const page = Math.max(1, Number(params.get('page')) || 1);
    const limit = [10, 25, 50, 100].includes(Number(params.get('limit'))) ? Number(params.get('limit')) : 25;

    // Latest query string: two updates in the same tick (Pagination calls setRowsPerPage
    // then paginate(1)) must build on each other, not on the same stale render.
    const queryRef = useRef(params.toString());
    useEffect(() => {
        queryRef.current = params.toString();
    }, [params]);

    const setParams = useCallback((patch: Record<string, string | number | null>, resetPage = true) => {
        const next = new URLSearchParams(queryRef.current);
        for (const [key, value] of Object.entries(patch)) {
            if (value == null || value === '') next.delete(key);
            else next.set(key, String(value));
        }
        if (resetPage && !('page' in patch)) next.delete('page');
        const query = next.toString();
        queryRef.current = query;
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }, [pathname, router]);

    const [overview, setOverview] = useState<Overview | null>(null);
    const [loading, setLoading] = useState(true);
    const [records, setRecords] = useState<UsageRecord[]>([]);
    const [recordsTotal, setRecordsTotal] = useState(0);
    const [recordsLoading, setRecordsLoading] = useState(false);
    const [searchInput, setSearchInput] = useState(search);
    const [refreshingId, setRefreshingId] = useState('');
    const [reconciling, setReconciling] = useState(false);
    const [modelSort, setModelSort] = useState<{ key: ModelSortKey; dir: 'asc' | 'desc' }>({ key: 'profitPercent', dir: 'asc' });

    useEffect(() => setSearchInput(search), [search]);

    const headers = useMemo(() => ({ authorization: `Bearer ${token}` }), [token]);

    const filterParams = useMemo(() => {
        const query: Record<string, string> = { basis };
        if (range !== 'all') query.from = new Date(Date.now() - Number(range) * 86_400_000).toISOString();
        if (providerName) query.providerName = providerName;
        if (modelFilter) query.modelId = modelFilter.value;
        if (userFilter) query.userId = userFilter.value;
        if (outcome) query.outcome = outcome;
        return query;
        // modelFilter / userFilter are rebuilt each render — depend on their ids.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [basis, range, providerName, modelFilter?.value, userFilter?.value, outcome]);

    const loadOverview = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const res = await axios.get(`${baseUrl}/api/studio/admin/ai-usage/overview`, { headers, params: filterParams });
            setOverview(res.data?.data || null);
        } catch (error) {
            ErrorToaster(error);
        } finally {
            setLoading(false);
        }
    }, [baseUrl, filterParams, headers, token]);

    const loadRecords = useCallback(async () => {
        if (!token) return;
        try {
            setRecordsLoading(true);
            const res = await axios.get(`${baseUrl}/api/studio/admin/ai-usage/records`, {
                headers,
                params: {
                    ...filterParams,
                    page,
                    limit,
                    sort,
                    dir,
                    ...(statusFilter ? { vendorCostStatus: statusFilter } : {}),
                    ...(search ? { search } : {}),
                },
            });
            setRecords(res.data?.data?.items || []);
            setRecordsTotal(res.data?.data?.total || 0);
        } catch (error) {
            ErrorToaster(error);
        } finally {
            setRecordsLoading(false);
        }
    }, [baseUrl, dir, filterParams, headers, limit, page, search, sort, statusFilter, token]);

    useEffect(() => {
        void loadOverview();
    }, [loadOverview]);

    useEffect(() => {
        if (tab === 'records') void loadRecords();
    }, [tab, loadRecords]);

    const loadModelOptions = useCallback(async (query: string): Promise<FilterOption[]> => {
        const res = await axios.get(`${baseUrl}/api/studio/admin/ai-usage/models/search`, { headers, params: { q: query } });
        return (res.data?.data || []).map((row: { modelId: string; modelName: string; providerName: string; count: number }) => ({
            value: row.modelId,
            label: row.modelName,
            hint: row.providerName,
            meta: `${count(row.count)} پردازش`,
        }));
    }, [baseUrl, headers]);

    const loadUserOptions = useCallback(async (query: string): Promise<FilterOption[]> => {
        const res = await axios.get(`${baseUrl}/api/studio/admin/ai-usage/users/search`, { headers, params: { q: query } });
        return (res.data?.data || []).map((row: { userId: string; name: string; email: string; mobile: string; count: number }) => ({
            value: row.userId,
            label: row.name || row.email || row.mobile || row.userId,
            hint: row.email || row.mobile,
            meta: `${count(row.count)} پردازش`,
        }));
    }, [baseUrl, headers]);

    const refreshRecord = async (record: UsageRecord) => {
        try {
            setRefreshingId(record._id);
            const res = await axios.post(
                `${baseUrl}/api/studio/admin/ai-usage/records/${record._id}/refresh-vendor-cost`,
                {},
                { headers },
            );
            const next = res.data?.data as UsageRecord | undefined;
            if (next?.vendorCostStatus === 'resolved') SuccessToaster({ message: 'هزینه واقعی دریافت شد' });
            else ErrorToaster({ message: next?.vendorCostNote || 'ارائه‌دهنده هنوز مبلغی گزارش نکرده است' });
            await loadRecords();
        } catch (error) {
            ErrorToaster(error);
        } finally {
            setRefreshingId('');
        }
    };

    const reconcileNow = async () => {
        try {
            setReconciling(true);
            const res = await axios.post(`${baseUrl}/api/studio/admin/ai-usage/reconcile-pending`, {}, { headers });
            SuccessToaster({ message: `${count(res.data?.data?.checked)} پردازش استعلام شد` });
            await Promise.all([loadOverview(), tab === 'records' ? loadRecords() : Promise.resolve()]);
        } catch (error) {
            ErrorToaster(error);
        } finally {
            setReconciling(false);
        }
    };

    // ردیف‌های بازشده — چند ردیف هم‌زمان می‌توانند باز باشند تا مقایسه راحت باشد
    const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
    const toggleExpanded = (id: string) => {
        setExpandedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const onRecordSort = (field: string) => {
        if (sort === field) setParams({ dir: dir === 'asc' ? 'desc' : 'asc' });
        else setParams({ sort: field, dir: 'desc' });
    };

    const text = BASIS_TEXT[basis];
    const totals = overview?.totals;

    const modelRows = useMemo(() => {
        const rows = [...(overview?.byModel || [])];
        const factor = modelSort.dir === 'asc' ? 1 : -1;
        rows.sort((a, b) => {
            const av = a[modelSort.key];
            const bv = b[modelSort.key];
            // مدل بدون هزینه واقعی همیشه آخر
            if (av == null && bv == null) return 0;
            if (av == null) return 1;
            if (bv == null) return -1;
            return (Number(av) - Number(bv)) * factor;
        });
        return rows;
    }, [overview, modelSort]);

    const modelChartRows = useMemo(
        () => modelRows.filter((row) => row.resolvedCount > 0 && row.profitPercent != null).slice(0, 15),
        [modelRows],
    );

    const distribution = useMemo(
        () => (overview?.profitDistribution || [])
            .filter((row) => row.from != null)
            .map((row) => ({ ...row, label: DISTRIBUTION_RANGES[String(row.from)] || String(row.from) })),
        [overview],
    );

    const activeFilters: Array<{ key: string; label: string; clear: Record<string, null> }> = [];
    if (providerName) activeFilters.push({ key: 'provider', label: `ارائه‌دهنده: ${providerName}`, clear: { provider: null } });
    if (modelFilter) activeFilters.push({ key: 'model', label: `مدل: ${modelFilter.label}`, clear: { model: null, modelLabel: null } });
    if (userFilter) activeFilters.push({ key: 'user', label: `کاربر: ${userFilter.label}`, clear: { user: null, userLabel: null } });
    if (outcome) {
        const label = OUTCOMES.find((item) => item.id === outcome)?.label || outcome;
        activeFilters.push({ key: 'outcome', label: `نتیجه: ${label}`, clear: { outcome: null } });
    }
    if (tab === 'records' && statusFilter) {
        const label = STATUS_META[statusFilter as keyof typeof STATUS_META]?.label || statusFilter;
        activeFilters.push({ key: 'status', label: `هزینه واقعی: ${label}`, clear: { status: null } });
    }
    if (tab === 'records' && search) activeFilters.push({ key: 'q', label: `جستجو: ${search}`, clear: { q: null } });

    const clearAll = () => setParams({
        provider: null, model: null, modelLabel: null, user: null, userLabel: null, outcome: null, status: null, q: null,
    });

    const toggleModelSort = (key: ModelSortKey) => setModelSort((prev) => (
        prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' }
    ));

    return (
        <Container>
            <Wrapper>
                <div className={`${shared.container} ${shared.rtl} ${styles.vizRoot}`}>
                    <div className={shared.header}>
                        <div>
                            <h1 className={shared.mainTitle}>گزارش‌ها</h1>
                            <p className={shared.subtitle}>
                                مبلغ نمایش‌داده به کاربر، مبلغ کسرشده و هزینه واقعی ارائه‌دهنده برای هر پردازش هوش مصنوعی.
                            </p>
                        </div>
                        <button type="button" className={shared.secondaryBtn} onClick={reconcileNow} disabled={reconciling}>
                            <LuRefreshCw size={14} />
                            {reconciling ? 'در حال استعلام…' : 'استعلام هزینه‌های در انتظار'}
                        </button>
                    </div>

                    <AiUsageGuide />

                    {/* ---------------- فیلترها ---------------- */}
                    <section className={styles.filterPanel} aria-label="فیلترها">
                        <div className={styles.filterTopRow}>
                            <div className={styles.segmentGroup}>
                                <span className={styles.segmentLabel}>بازه</span>
                                <div className={styles.segmented} role="radiogroup" aria-label="بازه زمانی">
                                    {RANGES.map((item) => (
                                        <button
                                            key={item.id}
                                            type="button"
                                            role="radio"
                                            aria-checked={range === item.id}
                                            className={range === item.id ? styles.segmentActive : ''}
                                            onClick={() => setParams({ range: item.id === '30' ? null : item.id })}
                                        >
                                            {item.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className={styles.segmentGroup}>
                                <span className={styles.segmentLabel}>مبنای مقایسه با هزینه واقعی</span>
                                <div className={styles.segmented} role="radiogroup" aria-label="مبنای مقایسه">
                                    <button
                                        type="button"
                                        role="radio"
                                        aria-checked={basis === 'charged'}
                                        className={basis === 'charged' ? styles.segmentActive : ''}
                                        onClick={() => setParams({ basis: null }, false)}
                                    >
                                        با مارکاپ (کسر از کاربر)
                                    </button>
                                    <button
                                        type="button"
                                        role="radio"
                                        aria-checked={basis === 'base'}
                                        className={basis === 'base' ? styles.segmentActive : ''}
                                        onClick={() => setParams({ basis: 'base' }, false)}
                                    >
                                        بدون مارکاپ (دقت فرمول)
                                    </button>
                                </div>
                            </div>
                        </div>
                        {basis === 'base' ? (
                            <p className={styles.basisNote}>
                                مارکاپی که روی هر پردازش اعمال شده (اختصاصی مدل یا عمومی) از مبلغ کسرشده برداشته شده است.
                                عدد مثبت یعنی فرمول بیشتر از هزینه واقعی حساب می‌کند و منفی یعنی کمتر.
                                {totals?.markupUnknownCount
                                    ? ` برای ${count(totals.markupUnknownCount)} پردازش درصد مارکاپ ثبت نشده و بدون کسر مارکاپ لحاظ شده است.`
                                    : ''}
                            </p>
                        ) : null}

                        <div className={styles.filterRow}>
                            <div className={styles.selectField}>
                                <label htmlFor="usage-provider">ارائه‌دهنده</label>
                                <select
                                    id="usage-provider"
                                    value={providerName}
                                    onChange={(event) => setParams({ provider: event.target.value || null })}
                                >
                                    <option value="">همه</option>
                                    {(overview?.byProvider || []).map((row) => (
                                        <option key={row.providerName} value={row.providerName}>{row.providerName}</option>
                                    ))}
                                    {providerName && !(overview?.byProvider || []).some((row) => row.providerName === providerName)
                                        ? <option value={providerName}>{providerName}</option>
                                        : null}
                                </select>
                            </div>
                            <AsyncFilterCombobox
                                label="مدل"
                                placeholder="نام مدل را بنویسید…"
                                value={modelFilter}
                                onChange={(option) => setParams({ model: option?.value || null, modelLabel: option?.label || null })}
                                loadOptions={loadModelOptions}
                                minChars={0}
                                emptyText="مدلی با این نام در گزارش‌ها نیست"
                            />
                            <AsyncFilterCombobox
                                label="کاربر"
                                placeholder="بخشی از نام یا ایمیل…"
                                value={userFilter}
                                onChange={(option) => setParams({ user: option?.value || null, userLabel: option?.label || null })}
                                loadOptions={loadUserOptions}
                                minChars={2}
                                minCharsHint="حداقل ۲ حرف از نام، ایمیل یا موبایل بنویسید"
                                emptyText="کاربری با این مشخصات در گزارش‌ها پیدا نشد"
                            />
                            <div className={styles.selectField}>
                                <label htmlFor="usage-outcome">نتیجه</label>
                                <select
                                    id="usage-outcome"
                                    value={outcome}
                                    onChange={(event) => setParams({ outcome: event.target.value || null })}
                                >
                                    {OUTCOMES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                                </select>
                            </div>
                        </div>

                        {activeFilters.length ? (
                            <div className={styles.activeFilters} aria-live="polite">
                                <span className={styles.activeLabel}>فیلترهای فعال:</span>
                                {activeFilters.map((item) => (
                                    <span key={item.key} className={styles.activeChip}>
                                        {item.label}
                                        <button type="button" onClick={() => setParams(item.clear)} aria-label={`حذف ${item.label}`}>
                                            <LuX size={12} />
                                        </button>
                                    </span>
                                ))}
                                <button type="button" className={styles.clearAll} onClick={clearAll}>پاک کردن همه</button>
                            </div>
                        ) : null}
                    </section>

                    {loading && !overview ? <LoadingState /> : null}

                    {totals ? (
                        <div className={`${styles.statsRow} ${loading ? styles.stale : ''}`}>
                            <div className={styles.stat}>
                                <span className={styles.statLabel}>{text.amount}</span>
                                <span className={styles.statValue}>{usd(totals.amountUsd)}</span>
                                <span className={styles.statSub}>
                                    {count(totals.count)} پردازش · {count(totals.userCount)} کاربر
                                    {basis === 'base' ? ` · کسر ${usd(totals.chargedUsd)}` : ''}
                                </span>
                            </div>
                            <div className={styles.stat}>
                                <span className={styles.statLabel}>هزینه واقعی</span>
                                <span className={styles.statValue}>{usd(totals.vendorCostUsd)}</span>
                                {totals.resolvedCount < totals.count ? (
                                    <span className={styles.statSub} title="ارائه‌دهنده هنوز مبلغ این پردازش‌ها را گزارش نکرده">
                                        {count(totals.count - totals.resolvedCount)} پردازش بدون مبلغ
                                    </span>
                                ) : null}
                            </div>
                            <div className={styles.stat}>
                                <span className={styles.statLabel}>{text.profit}</span>
                                <span className={styles.statValueRow}>
                                    <span className={styles.statValue} style={{ color: polarityColor(totals.profitUsd) }}>{usd(totals.profitUsd)}</span>
                                    <span className={styles.statPct} dir="ltr" title="نسبت به هزینه واقعی">{pct(totals.profitPercent)}</span>
                                </span>
                                {totals.lossCount ? (
                                    <span className={`${styles.statSub} ${styles.statSubWarn}`}>
                                        {count(totals.lossCount)} پردازش {basis === 'base' ? 'کمتر از هزینه' : 'زیان‌ده'}
                                    </span>
                                ) : null}
                            </div>
                            <div className={styles.stat}>
                                <span className={styles.statLabel}>اختلاف نمایش و کسر</span>
                                <span
                                    className={styles.statValue}
                                    style={totals.quoteMismatchCount ? { color: 'var(--polarity-loss)' } : undefined}
                                    title={totals.quoteMismatchCount ? `مجموع اختلاف: ${usd(totals.quoteDiffUsd)}` : 'باید صفر باشد'}
                                >
                                    {count(totals.quoteMismatchCount)}
                                </span>
                                {totals.pendingCount || totals.unavailableCount ? (
                                    <span className={styles.statSub}>
                                        {[
                                            totals.pendingCount ? `${count(totals.pendingCount)} در انتظار` : '',
                                            totals.unavailableCount ? `${count(totals.unavailableCount)} نامشخص` : '',
                                        ].filter(Boolean).join(' · ')}
                                    </span>
                                ) : null}
                            </div>
                        </div>
                    ) : null}

                    <SimpleLineTabs
                        tabs={[{ id: 'overview', label: 'نمای کلی' }, { id: 'records', label: 'پردازش‌ها' }]}
                        activeTab={tab}
                        onChange={(next) => setParams({ tab: next === 'overview' ? null : next }, false)}
                    />

                    {tab === 'overview' && overview ? (
                        <>
                            <section className={styles.chartCard}>
                                <div className={styles.sectionHead}>
                                    <div>
                                        <h3>{text.amount} در برابر هزینه واقعی (روزانه)</h3>
                                        <p>
                                            فاصله دو خط {basis === 'base' ? 'خطای فرمول قیمت' : 'سود ما'} است. هزینه واقعی فقط برای
                                            پردازش‌هایی است که ارائه‌دهنده مبلغ را گزارش کرده است.
                                        </p>
                                    </div>
                                    <div className={styles.legend}>
                                        <span className={styles.legendItem}>
                                            <span className={styles.swatchLine} style={{ background: 'var(--series-charged)' }} />
                                            {text.amount}
                                        </span>
                                        <span className={styles.legendItem}>
                                            <span className={styles.swatchLine} style={{ background: 'var(--series-vendor)' }} />
                                            هزینه واقعی
                                        </span>
                                    </div>
                                </div>
                                {overview.daily.length ? (
                                    <div className={styles.chartBox}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={overview.daily} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                                                <CartesianGrid stroke="var(--grid-line)" vertical={false} />
                                                <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11, fill: 'currentColor' }} tickLine={false} axisLine={false} />
                                                <YAxis tickFormatter={(value) => usd(Number(value))} tick={{ fontSize: 11, fill: 'currentColor' }} tickLine={false} axisLine={false} width={72} />
                                                <Tooltip content={<DailyTooltip basis={basis} />} cursor={{ stroke: 'var(--grid-line)', strokeWidth: 1 }} />
                                                <Line type="monotone" dataKey="amountUsd" stroke="var(--series-charged)" strokeWidth={2} dot={overview.daily.length < 3 ? { r: 4 } : false} activeDot={{ r: 4 }} />
                                                <Line type="monotone" dataKey="vendorCostUsd" stroke="var(--series-vendor)" strokeWidth={2} dot={overview.daily.length < 3 ? { r: 4 } : false} activeDot={{ r: 4 }} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                ) : <div className={styles.chartEmpty}>با این فیلترها پردازشی ثبت نشده است.</div>}
                            </section>

                            <div className={styles.twoCol}>
                                <section className={styles.chartCard}>
                                    <div className={styles.sectionHead}>
                                        <div>
                                            <h3>{text.profitChart}</h3>
                                            <p>آبی {text.gain}، قرمز {text.loss} (فقط پردازش‌های دارای هزینه واقعی).</p>
                                        </div>
                                    </div>
                                    {overview.daily.some((row) => row.resolvedCount > 0) ? (
                                        <div className={styles.chartBox}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={overview.daily} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                                                    <CartesianGrid stroke="var(--grid-line)" vertical={false} />
                                                    <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11, fill: 'currentColor' }} tickLine={false} axisLine={false} />
                                                    <YAxis tickFormatter={(value) => usd(Number(value))} tick={{ fontSize: 11, fill: 'currentColor' }} tickLine={false} axisLine={false} width={72} />
                                                    <ReferenceLine y={0} stroke="currentColor" strokeOpacity={0.35} />
                                                    <Tooltip content={<DailyTooltip basis={basis} />} cursor={{ fill: 'var(--grid-line)' }} />
                                                    <Bar dataKey="profitUsd" radius={[4, 4, 0, 0]} maxBarSize={28}>
                                                        {overview.daily.map((row) => (
                                                            <Cell key={row.date} fill={polarityColor(row.profitUsd)} />
                                                        ))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    ) : <div className={styles.chartEmpty}>هنوز هزینه واقعی هیچ پردازشی دریافت نشده است.</div>}
                                </section>

                                <section className={styles.chartCard}>
                                    <div className={styles.sectionHead}>
                                        <div>
                                            <h3>پراکندگی {basis === 'base' ? 'خطای فرمول' : 'سود'} هر پردازش</h3>
                                            <p>تعداد پردازش در هر بازه درصدی نسبت به هزینه واقعی.</p>
                                        </div>
                                    </div>
                                    {distribution.length ? (
                                        <div className={styles.chartBox}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={distribution} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                                                    <CartesianGrid stroke="var(--grid-line)" vertical={false} />
                                                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'currentColor' }} tickLine={false} axisLine={false} interval={0} angle={-20} textAnchor="end" height={54} />
                                                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'currentColor' }} tickLine={false} axisLine={false} width={40} />
                                                    <Tooltip content={<DistributionTooltip />} cursor={{ fill: 'var(--grid-line)' }} />
                                                    <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={36}>
                                                        {distribution.map((row) => (
                                                            <Cell
                                                                key={String(row.from)}
                                                                fill={row.from === -5 ? 'var(--polarity-neutral)' : polarityColor(row.from as number)}
                                                            />
                                                        ))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    ) : <div className={styles.chartEmpty}>هنوز هزینه واقعی هیچ پردازشی دریافت نشده است.</div>}
                                </section>
                            </div>

                            <section className={styles.section}>
                                <div className={styles.chartCard}>
                                <div className={styles.sectionHead}>
                                    <div>
                                        <h3>{text.modelChart}</h3>
                                        <p>{text.modelChartHint} ترتیب نمودار همان ترتیب جدول زیر است.</p>
                                    </div>
                                </div>
                                {modelChartRows.length ? (
                                    <div className={styles.chartBoxTall} style={{ height: Math.max(160, modelChartRows.length * 34 + 40) }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={modelChartRows} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                                                <CartesianGrid stroke="var(--grid-line)" horizontal={false} />
                                                <XAxis type="number" tickFormatter={(value) => `${value}%`} tick={{ fontSize: 11, fill: 'currentColor' }} tickLine={false} axisLine={false} />
                                                <YAxis type="category" dataKey="modelName" width={190} tick={{ fontSize: 11, fill: 'currentColor' }} tickLine={false} axisLine={false} />
                                                <ReferenceLine x={0} stroke="currentColor" strokeOpacity={0.35} />
                                                <Tooltip content={<ModelTooltip basis={basis} />} cursor={{ fill: 'var(--grid-line)' }} />
                                                <Bar dataKey="profitPercent" radius={4} maxBarSize={18}>
                                                    {modelChartRows.map((row) => (
                                                        <Cell key={`${row.modelId}-${row.providerName}`} fill={polarityColor(row.profitPercent, 5)} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                ) : <div className={styles.chartEmpty}>هنوز مدلی با هزینه واقعی ثبت‌شده نیست.</div>}
                                </div>

                                {modelRows.length ? (
                                    <div className={styles.tableScroll}>
                                        <table className={shared.table}>
                                            <thead>
                                                <tr>
                                                    <th>مدل</th>
                                                    <SortHeader label="پردازش" field="count" sort={modelSort.key} dir={modelSort.dir} onSort={(f) => toggleModelSort(f as ModelSortKey)} />
                                                    <SortHeader label={text.amount} field="amountUsd" sort={modelSort.key} dir={modelSort.dir} onSort={(f) => toggleModelSort(f as ModelSortKey)} />
                                                    <SortHeader label="هزینه واقعی" field="vendorCostUsd" sort={modelSort.key} dir={modelSort.dir} onSort={(f) => toggleModelSort(f as ModelSortKey)} />
                                                    <SortHeader label={text.profit} field="profitUsd" sort={modelSort.key} dir={modelSort.dir} onSort={(f) => toggleModelSort(f as ModelSortKey)} />
                                                    <SortHeader label={text.profitPercent} field="profitPercent" sort={modelSort.key} dir={modelSort.dir} onSort={(f) => toggleModelSort(f as ModelSortKey)} />
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {modelRows.map((row) => (
                                                    <tr key={`${row.modelId}-${row.providerName}`}>
                                                        <td data-label="مدل">
                                                            <button
                                                                type="button"
                                                                className={styles.inlineLink}
                                                                onClick={() => setParams({ model: row.modelId, modelLabel: row.modelName })}
                                                                title="فیلتر روی این مدل"
                                                            >
                                                                {row.modelName}
                                                            </button>
                                                            <span className={styles.note}>{row.providerName}</span>
                                                        </td>
                                                        <td data-label="پردازش">{count(row.count)}</td>
                                                        <td data-label={text.amount}><span className={styles.money}>{usd(row.amountUsd)}</span></td>
                                                        <td data-label="هزینه واقعی">
                                                            <span className={styles.money}>{usd(row.vendorCostUsd)}</span>
                                                            {row.resolvedCount < row.count
                                                                ? <span className={styles.note}>{count(row.count - row.resolvedCount)} بدون مبلغ واقعی</span>
                                                                : null}
                                                        </td>
                                                        <td data-label={text.profit}><span className={styles.money}>{usd(row.profitUsd)}</span></td>
                                                        <td data-label={text.profitPercent}>{pct(row.profitPercent)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : null}
                            </section>

                            <div className={styles.twoCol}>
                                <section className={styles.section}>
                                    <div className={styles.sectionHead}>
                                        <div><h3>ارائه‌دهنده‌ها</h3></div>
                                    </div>
                                    <div className={styles.tableScroll}>
                                        <table className={shared.table}>
                                            <thead>
                                                <tr>
                                                    <th>ارائه‌دهنده</th>
                                                    <th>پردازش</th>
                                                    <th>{text.amount}</th>
                                                    <th>هزینه واقعی</th>
                                                    <th>{text.profitPercent}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {overview.byProvider.map((row) => (
                                                    <tr key={row.providerName}>
                                                        <td data-label="ارائه‌دهنده" className={shared.modelName}>{row.providerName}</td>
                                                        <td data-label="پردازش">{count(row.count)}</td>
                                                        <td data-label={text.amount}><span className={styles.money}>{usd(row.amountUsd)}</span></td>
                                                        <td data-label="هزینه واقعی"><span className={styles.money}>{usd(row.vendorCostUsd)}</span></td>
                                                        <td data-label={text.profitPercent}>{pct(row.profitPercent)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </section>

                                <section className={styles.section}>
                                    <div className={styles.sectionHead}>
                                        <div><h3>پرمصرف‌ترین کاربران</h3></div>
                                    </div>
                                    <div className={styles.tableScroll}>
                                        <table className={shared.table}>
                                            <thead>
                                                <tr>
                                                    <th>کاربر</th>
                                                    <th>پردازش</th>
                                                    <th>کسر از کاربر</th>
                                                    <th>{text.profit}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {overview.byUser.map((row) => (
                                                    <tr key={row.userId}>
                                                        <td data-label="کاربر">
                                                            <button
                                                                type="button"
                                                                className={styles.inlineLink}
                                                                onClick={() => setParams({ user: row.userId, userLabel: row.userName || row.userEmail || row.userId })}
                                                                title="فیلتر روی این کاربر"
                                                            >
                                                                {row.userName || row.userEmail || '—'}
                                                            </button>
                                                            {row.userEmail ? <span className={styles.idText}>{row.userEmail}</span> : null}
                                                        </td>
                                                        <td data-label="پردازش">{count(row.count)}</td>
                                                        <td data-label="کسر از کاربر"><span className={styles.money}>{usd(row.chargedUsd)}</span></td>
                                                        <td data-label={text.profit}><span className={styles.money}>{usd(row.profitUsd)}</span></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </section>
                            </div>
                        </>
                    ) : null}

                    {tab === 'records' ? (
                        <section className={styles.section}>
                            <div className={shared.tableToolbar}>
                                <form
                                    className={shared.searchBar}
                                    role="search"
                                    onSubmit={(event) => {
                                        event.preventDefault();
                                        setParams({ q: searchInput.trim() || null });
                                    }}
                                >
                                    <LuSearch size={15} />
                                    <input
                                        value={searchInput}
                                        onChange={(event) => setSearchInput(event.target.value)}
                                        placeholder="شماره پردازش (runId)، شناسه ارائه‌دهنده یا نام مدل + Enter"
                                        aria-label="جستجوی پردازش"
                                    />
                                </form>
                                <div className={styles.toolbarGroup}>
                                    <div className={styles.selectField}>
                                        <label htmlFor="usage-status">هزینه واقعی</label>
                                        <select
                                            id="usage-status"
                                            value={statusFilter}
                                            onChange={(event) => setParams({ status: event.target.value || null })}
                                        >
                                            <option value="">همه</option>
                                            <option value="resolved">دریافت شد</option>
                                            <option value="pending">در انتظار</option>
                                            <option value="unavailable">نامشخص</option>
                                        </select>
                                    </div>
                                    <div className={styles.selectField}>
                                        <label htmlFor="usage-sort">مرتب‌سازی</label>
                                        <div className={styles.sortControl}>
                                            <select
                                                id="usage-sort"
                                                value={sort}
                                                onChange={(event) => setParams({ sort: event.target.value === 'createdAt' ? null : event.target.value })}
                                            >
                                                {RECORD_SORTS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                                            </select>
                                            <button
                                                type="button"
                                                className={styles.dirBtn}
                                                onClick={() => setParams({ dir: dir === 'asc' ? null : 'asc' })}
                                                aria-label={dir === 'asc' ? 'ترتیب: کمترین اول' : 'ترتیب: بیشترین اول'}
                                                title={dir === 'asc' ? 'کمترین اول' : 'بیشترین اول'}
                                            >
                                                {dir === 'asc' ? <LuArrowUp size={14} /> : <LuArrowDown size={14} />}
                                                {dir === 'asc' ? 'کمترین' : 'بیشترین'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <p className={styles.resultCount} aria-live="polite">
                                {recordsLoading ? 'در حال بارگذاری…' : `${count(recordsTotal)} پردازش`}
                            </p>

                            {recordsLoading && !records.length ? <LoadingState /> : null}
                            {!recordsLoading && !records.length ? (
                                <div className={styles.chartEmpty}>
                                    پردازشی با این فیلترها پیدا نشد.
                                    {activeFilters.length ? (
                                        <> <button type="button" className={styles.inlineLink} onClick={clearAll}>پاک کردن فیلترها</button></>
                                    ) : null}
                                </div>
                            ) : null}

                            {records.length ? (
                                <div className={`${styles.tableScroll} ${recordsLoading ? styles.stale : ''}`}>
                                    <p className={styles.recordsHint}>روی هر ردیف بزنید تا شناسه‌ها، مبلغ نمایش‌داده، مارکاپ و جزئیات هزینه واقعی همان پردازش زیرش باز شود.</p>
                                    <table className={`${shared.table} ${styles.recordsTable}`}>
                                        <thead>
                                            <tr>
                                                <th className={styles.expandCol} aria-label="باز کردن جزئیات" />
                                                <SortHeader label="زمان" field="createdAt" sort={sort} dir={dir} onSort={onRecordSort} />
                                                <th>کاربر</th>
                                                <th>مدل</th>
                                                <SortHeader label="کسر از کاربر" field="charged" sort={sort} dir={dir} onSort={onRecordSort} />
                                                {basis === 'base'
                                                    ? <SortHeader label="بدون مارکاپ" field="amount" sort={sort} dir={dir} onSort={onRecordSort} />
                                                    : null}
                                                <SortHeader label="هزینه واقعی" field="vendor" sort={sort} dir={dir} onSort={onRecordSort} />
                                                <SortHeader label={text.profit} field="profit" sort={sort} dir={dir} onSort={onRecordSort} />
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {records.map((record) => (
                                                <RecordRow
                                                    key={record._id}
                                                    record={record}
                                                    basis={basis}
                                                    expanded={expandedIds.has(record._id)}
                                                    onToggle={() => toggleExpanded(record._id)}
                                                    refreshing={refreshingId === record._id}
                                                    onRefresh={() => refreshRecord(record)}
                                                />
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : null}

                            {records.length ? (
                                <div className={styles.paginationWrap}>
                                    <Pagination
                                        rtl
                                        itemPerPage={limit}
                                        currentPage={page}
                                        totalItems={recordsTotal}
                                        setRowsPerPage={(next: number) => setParams({ limit: next === 25 ? null : next })}
                                        paginate={(next: number) => setParams({ page: next === 1 ? null : next }, false)}
                                        rowsPerPageOptions={[10, 25, 50, 100]}
                                    />
                                </div>
                            ) : null}
                        </section>
                    ) : null}
                </div>
            </Wrapper>
        </Container>
    );
}

export default function AiReportsPageRoute() {
    // useSearchParams needs a Suspense boundary for prerendering (Next.js docs).
    return (
        <Suspense fallback={<LoadingState />}>
            <AiReportsPage />
        </Suspense>
    );
}
