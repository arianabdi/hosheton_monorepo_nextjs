'use client'

import React, { useEffect, useRef, useState } from "react";
import styles from "../../providers/Providers.module.scss"; // شل و جدول مشترک با صفحه مدل‌ها
import pricingStyles from "./PricingPage.module.scss";
import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ErrorToaster } from "@my-workspace/utils";
import { toFarsiNumber } from "@my-workspace/utils";
import { ConvertFilterObjectToUrlParam } from "hosheton_chat/app/shared/utils";
import { LoadingState, Pagination } from "@my-workspace/components";
import { useAuthStore } from "@/app/zustand/store/authStore";
import { useAppStore } from "@/app/zustand/store/useAppStore";
import RowActionMenu from "../components/RowActionMenu";

// ----------------------------- تایپ‌های پاسخ سرویس pricing/overview -----------------------------

interface PricingComponent {
    key: string;
    kind: 'input_tokens' | 'output_tokens' | 'cache_read' | 'cache_write' | 'unit_rate' | 'matrix_row' | 'tier' | 'lookup';
    label: string;
    detail?: string;
    per?: string;
    perLabelFa?: string;
    vendorUsd?: number;
    customerUsd?: number;
    isMin?: boolean;
    isMax?: boolean;
    informationalOnly?: boolean;
}

interface PricingScenario {
    label: string;
    vendorUsd: number;
    customerUsd: number;
    breakdown: Record<string, unknown>;
}

interface PricingOverviewModel {
    _id: string;
    name: string;
    displayName?: string;
    providerName?: string;
    class?: string;
    isActive: boolean;
    markupPercent: number | null;
    effectiveMarkupPercent: number;
    markupSource: 'model' | 'global';
    actualCostEnabled: boolean;
    pricingMode: string | null;
    currency: 'USD';
    unitPer: string | null;
    unitLabelFa: string;
    rangeBasis: 'rates' | 'matrix_rows' | 'formula_scenarios' | 'unit' | 'none';
    rangeIsEstimate: boolean;
    minVendorUsd: number | null;
    maxVendorUsd: number | null;
    minCustomerUsd: number | null;
    maxCustomerUsd: number | null;
    components: PricingComponent[];
    scenarioMin?: PricingScenario;
    scenarioMax?: PricingScenario;
    scenarioEvaluated?: number;
    notes: string[];
    notesMarkdown?: string;
}

interface PricingOverviewResponse {
    models: PricingOverviewModel[];
    totalItems: number;
    globalMarkupPercent: number;
}

// ----------------------------- ثابت‌های نمایش -----------------------------

const MODEL_CLASSES = [
    { value: 'text', label: 'متن (LLM)' },
    { value: 'image', label: 'عکس' },
    { value: 'video', label: 'ویدیو' },
    { value: 'audio', label: 'صوت' },
    { value: '3d', label: 'سه‌بعدی' },
    { value: 'embeddings', label: 'Embeddings' },
    { value: 'fine-tuning', label: 'Fine-tuning' },
    { value: 'moderation', label: 'Moderation' },
];

const MARKUP_FILTERS = [
    { value: 'custom', label: 'اختصاصی (دارد)' },
    { value: 'global', label: 'سراسری (ندارد)' },
];

const STATUS_FILTERS = [
    { value: 'true', label: 'فعال' },
    { value: 'false', label: 'غیرفعال' },
];

const MODE_LABELS_FA: Record<string, string> = {
    token: 'توکنی',
    matrix: 'ماتریسی',
    per_unit: 'هر واحد',
    per_second: 'هر ثانیه',
    per_minute: 'هر دقیقه',
    per_hour: 'هر ساعت',
    per_1k_chars: 'هر ۱K کاراکتر',
};

const RANGE_BASIS_LABELS_FA: Record<PricingOverviewModel['rangeBasis'], string> = {
    rates: 'نرخ‌های ثبت‌شده',
    matrix_rows: 'ردیف‌های ماتریس قیمت',
    formula_scenarios: 'ارزیابی فرمول روی ترکیب تنظیمات',
    unit: 'نرخ ثابت واحد',
    none: 'قیمت ثبت نشده',
};

const KIND_LABELS_FA: Record<PricingComponent['kind'], string> = {
    input_tokens: 'ورودی',
    output_tokens: 'خروجی',
    cache_read: 'کش',
    cache_write: 'نوشتن کش',
    matrix_row: 'ردیف ماتریس',
    unit_rate: 'نرخ ثابت',
    tier: 'پله قیمتی',
    lookup: 'جدول نرخ',
};

const KIND_CLASS: Record<PricingComponent['kind'], string> = {
    input_tokens: 'kindInput',
    output_tokens: 'kindOutput',
    cache_read: 'kindCache',
    cache_write: 'kindCache',
    matrix_row: 'kindRow',
    unit_rate: 'kindUnit',
    tier: 'kindTier',
    lookup: 'kindLookup',
};

// ----------------------------- فرمت اعداد -----------------------------

// مطابق نمایش‌های مشتری‌رو (CostEstimatePanel): دلار، ارقام لاتین، LTR، دقت تطبیقی
function formatUsdSmart(value: number | null | undefined): string {
    if (value == null || !Number.isFinite(value)) return '—';
    const abs = Math.abs(value);
    const decimals = abs >= 1 ? 2 : abs >= 0.01 ? 4 : 6;
    return `$${value.toFixed(decimals)}`;
}

function formatRange(min: number | null | undefined, max: number | null | undefined): string {
    if (min == null || max == null || !Number.isFinite(min) || !Number.isFinite(max)) return '—';
    if (Math.abs(max - min) < 1e-12) return formatUsdSmart(min);
    return `${formatUsdSmart(min)} – ${formatUsdSmart(max)}`;
}

function modeBadgeClass(mode: string | null | undefined): string {
    switch (mode) {
        case 'token': return styles.pricingModeToken;
        case 'matrix': return styles.pricingModeMatrix;
        case 'per_second':
        case 'per_minute':
        case 'per_hour': return styles.pricingModeTime;
        case 'per_1k_chars': return styles.pricingModeChars;
        case 'per_unit': return styles.pricingModeUnit;
        default: return styles.pricingModeUnknown;
    }
}

type ModelFilterKey = 'class' | 'markup' | 'isActive';

// ----------------------------- صفحه -----------------------------

export default function ModelsPricingPage() {
    const router = useRouter();
    const { token } = useAuthStore();
    const { baseUrl } = useAppStore();

    const [isLoading, setIsLoading] = useState(false);
    const [data, setData] = useState<PricingOverviewModel[]>([]);
    const [globalMarkupPercent, setGlobalMarkupPercent] = useState<number>(20);
    const [filter, setFilter] = useState<{ class?: string; markup?: string; isActive?: string }>({});
    const [searchInput, setSearchInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const [pagination, setPagination] = useState({
        itemPerPage: 50,
        currentPage: 1,
        totalItems: 0,
        lastUpdateBy: ''
    });

    async function fetchData(updater: string, page = pagination.currentPage) {
        if (!token) return;
        try {
            setIsLoading(true);
            const filterParam = Object.keys(filter).length === 0 ? '' : ConvertFilterObjectToUrlParam(filter);
            const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : '';
            const res = await axios.get(
                `${baseUrl}/api/provider-models/pricing/overview?limit=${pagination.itemPerPage}&page=${page}&includeInactive=true&${filterParam}${searchParam}`,
                { headers: { authorization: `Bearer ${token}` } }
            );

            if (res.data.statusCode === 200) {
                const payload = res.data.data as PricingOverviewResponse;
                setData(payload.models || []);
                setGlobalMarkupPercent(Number(payload.globalMarkupPercent ?? 20));
                setPagination(prev => ({
                    ...prev,
                    totalItems: payload.totalItems || 0,
                    ...(updater === 'filter' ? { currentPage: page } : {}),
                    lastUpdateBy: updater
                }));
            }
            setIsLoading(false);
        } catch (e) {
            ErrorToaster(e);
            setIsLoading(false);
        }
    }

    useEffect(() => {
        fetchData('initializer');
    }, [token]);

    useEffect(() => {
        if (pagination.lastUpdateBy === "pagination") {
            fetchData('pagination');
        }
    }, [pagination.currentPage, pagination.itemPerPage]);

    const lastFilterKey = useRef<string | null>(null);
    useEffect(() => {
        const key = JSON.stringify(filter) + '|' + searchQuery;
        if (lastFilterKey.current === null) {
            lastFilterKey.current = key;
            return;
        }
        if (lastFilterKey.current === key) return;
        lastFilterKey.current = key;
        fetchData('filter', 1);
    }, [filter, searchQuery]);

    useEffect(() => {
        const timer = setTimeout(() => setSearchQuery(searchInput.trim()), 400);
        return () => clearTimeout(timer);
    }, [searchInput]);

    const updateFilter = (key: ModelFilterKey, value: string) => {
        setFilter(prev => {
            const next = { ...prev };
            if (value) next[key] = value;
            else delete next[key];
            return next;
        });
    };

    const activeFilterCount = (['class', 'markup', 'isActive'] as ModelFilterKey[]).filter(key => filter[key]).length;

    const clearFilters = () => {
        setFilter({});
        setSearchInput('');
    };

    const toggleExpand = (id: string) => {
        setExpandedId(prev => (prev === id ? null : id));
    };

    return (
        <div className={`${styles.container} ${styles.rtl}`}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.mainTitle}>قیمت گذاری مدل‌ها</h1>
                    <p className={styles.subtitle}>
                        بازه حداقل و حداکثر قیمت هر مدل برای مشتری، مستقیماً با همان موتوری که صورتحساب واقعی را می‌سازد محاسبه می‌شود.
                        روی هر مدل بزنید تا جزئیات هر قیمت — بابت چه چیزی و با چه نرخی — باز شود.
                    </p>
                </div>
            </header>

            <div className={pricingStyles.globalMarkupBar}>
                <span>💰 مارکاپ سراسری فعلی (billing): <strong>{toFarsiNumber(String(globalMarkupPercent))}٪</strong></span>
                <span style={{ opacity: 0.4 }}>|</span>
                <span>قیمت مشتری = هزینه ارائه‌دهنده × (۱ + مارکاپ)</span>
                <span style={{ opacity: 0.4 }}>|</span>
                <span>مبالغ به <span className={pricingStyles.moneyLtr}>USD</span></span>
            </div>

            <div className={styles.tableToolbar}>
                <div className={styles.toolbarSearchGroup}>
                    <div className={styles.searchBar}>
                        <span aria-hidden="true">🔍</span>
                        <input
                            type="search"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="جستجوی نام مدل (سمت سرور)..."
                            aria-label="جستجوی نام مدل"
                        />
                    </div>
                    <button
                        type="button"
                        className={`${styles.secondaryBtn} ${styles.activeFilterBtn}`}
                        onClick={() => setFiltersOpen(prev => !prev)}
                        aria-expanded={filtersOpen}
                    >
                        فیلترها
                        {activeFilterCount > 0 && (
                            <span className={styles.filterBadge}>{toFarsiNumber(String(activeFilterCount))}</span>
                        )}
                    </button>
                </div>
                <div className={styles.toolbarActionsGroup}>
                    <button
                        type="button"
                        className={styles.secondaryBtn}
                        onClick={() => fetchData('pagination')}
                    >
                        ↻ بروزرسانی
                    </button>
                </div>
            </div>

            {filtersOpen && (
                <div className={styles.filterPanel}>
                    <div className={styles.filterGroup}>
                        <label className={styles.filterLabel} htmlFor="pricing-filter-class">کلاس مدل</label>
                        <select
                            id="pricing-filter-class"
                            className={styles.filterSelect}
                            value={filter.class || ''}
                            onChange={(e) => updateFilter('class', e.target.value)}
                        >
                            <option value="">همه کلاس‌ها</option>
                            {MODEL_CLASSES.map((c) => (
                                <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.filterGroup}>
                        <label className={styles.filterLabel} htmlFor="pricing-filter-markup">مارکاپ</label>
                        <select
                            id="pricing-filter-markup"
                            className={styles.filterSelect}
                            value={filter.markup || ''}
                            onChange={(e) => updateFilter('markup', e.target.value)}
                        >
                            <option value="">همه</option>
                            {MARKUP_FILTERS.map((m) => (
                                <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.filterGroup}>
                        <label className={styles.filterLabel} htmlFor="pricing-filter-status">وضعیت</label>
                        <select
                            id="pricing-filter-status"
                            className={styles.filterSelect}
                            value={filter.isActive || ''}
                            onChange={(e) => updateFilter('isActive', e.target.value)}
                        >
                            <option value="">همه</option>
                            {STATUS_FILTERS.map((s) => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.filterGroup}>
                        <span className={styles.filterLabel}>&nbsp;</span>
                        <button
                            type="button"
                            className={styles.secondaryBtn}
                            onClick={clearFilters}
                            disabled={activeFilterCount === 0 && searchInput === ''}
                        >
                            حذف فیلترها
                        </button>
                    </div>
                </div>
            )}

            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                    <tr>
                        <th>#</th>
                        <th>نام مدل</th>
                        <th>ارائه دهنده</th>
                        <th>کلاس</th>
                        <th>ساختار قیمت</th>
                        <th>بازه قیمت مشتری</th>
                        <th>مارکاپ</th>
                        <th>وضعیت</th>
                        <th>عملیات</th>
                    </tr>
                    </thead>
                    <tbody>
                    {isLoading ? (
                        <tr><td colSpan={9}><LoadingState /></td></tr>
                    ) : data?.length === 0 ? (
                        <tr>
                            <td colSpan={9} className={styles.emptyPlaceholder}>
                                مدلی با این فیلترها پیدا نشد.
                            </td>
                        </tr>
                    ) : (
                        data?.map((item, i) => {
                            const isExpanded = expandedId === item._id;
                            const hasRange = item.minCustomerUsd != null && item.maxCustomerUsd != null;
                            return (
                                <React.Fragment key={item._id || i}>
                                    <tr
                                        className={!item.isActive ? styles.rowInactive : ''}
                                        onClick={() => toggleExpand(item._id)}
                                        style={{ cursor: 'pointer' }}
                                        title="برای دیدن جزئیات قیمت کلیک کنید"
                                    >
                                        <td data-label="#">{toFarsiNumber(((pagination.currentPage - 1) * pagination.itemPerPage) + (i + 1))}</td>
                                        <td data-label="نام مدل" className={styles.modelName}>
                                            {item.displayName || item.name}
                                            <div className={styles.pricingDetail}>{item.name}</div>
                                        </td>
                                        <td data-label="ارائه دهنده"><span className={styles.badgeActive}>{item.providerName || '—'}</span></td>
                                        <td data-label="کلاس" className={styles.timeText}>{item.class || '—'}</td>
                                        <td data-label="ساختار قیمت">
                                            <div className={styles.pricingCell}>
                                                <span className={`${styles.pricingModeBadge} ${modeBadgeClass(item.pricingMode)}`}>
                                                    {item.pricingMode ? (MODE_LABELS_FA[item.pricingMode] || item.pricingMode) : 'بدون قیمت'}
                                                </span>
                                                {item.rangeIsEstimate && (
                                                    <span className={pricingStyles.estimateBadge}>فرمولی · تخمینی</span>
                                                )}
                                            </div>
                                        </td>
                                        <td data-label="بازه قیمت مشتری">
                                            {hasRange ? (
                                                <div className={pricingStyles.rangeCell}>
                                                    <span className={`${pricingStyles.rangeValues} ${item.minCustomerUsd === item.maxCustomerUsd ? pricingStyles.rangeSingle : ''}`}>
                                                        {formatRange(item.minCustomerUsd, item.maxCustomerUsd)}
                                                    </span>
                                                    <span className={pricingStyles.rangeUnit}>{item.unitLabelFa}</span>
                                                </div>
                                            ) : (
                                                <span className={pricingStyles.noPricing}>قیمتی محاسبه نشد</span>
                                            )}
                                        </td>
                                        <td data-label="مارکاپ" className={styles.timeText}>
                                            {toFarsiNumber(String(item.effectiveMarkupPercent))}٪
                                            <div className={pricingStyles.subLabel}>
                                                {item.markupSource === 'model' ? 'اختصاصی مدل' : 'سراسری'}
                                            </div>
                                        </td>
                                        <td data-label="وضعیت">
                                            <span className={item.isActive ? styles.statusLabelOn : styles.statusLabelOff}>
                                                {item.isActive ? 'فعال' : 'غیرفعال'}
                                            </span>
                                        </td>
                                        <td data-label="عملیات" onClick={(e) => e.stopPropagation()}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <button
                                                    type="button"
                                                    className={pricingStyles.expandBtn}
                                                    onClick={() => toggleExpand(item._id)}
                                                    aria-expanded={isExpanded}
                                                >
                                                    جزئیات قیمت
                                                    <span className={`${pricingStyles.chevron} ${isExpanded ? pricingStyles.chevronOpen : ''}`}>▾</span>
                                                </button>
                                                <RowActionMenu
                                                    rowId={item._id}
                                                    items={[
                                                        { label: 'ویرایش مدل و قیمت', onClick: () => router.push(`/models/${item._id}`) },
                                                    ]}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                    {isExpanded && (
                                        <tr className={pricingStyles.breakdownRow}>
                                            <td colSpan={9}>
                                                <PricingBreakdown model={item} globalMarkupPercent={globalMarkupPercent} />
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })
                    )}
                    </tbody>
                </table>
            </div>

            <Pagination
                itemPerPage={pagination.itemPerPage}
                totalItems={pagination.totalItems}
                currentPage={pagination.currentPage}
                paginate={(pageNumber) => {
                    setPagination(prev => ({
                        ...prev,
                        currentPage: pageNumber,
                        lastUpdateBy: "pagination"
                    }));
                }}
                setRowsPerPage={(e) => {
                    setPagination(prev => ({
                        ...prev,
                        lastUpdateBy: "pagination",
                        currentPage: 1,
                        itemPerPage: e
                    }));
                }}
            />
        </div>
    );
}

// ----------------------------- باکس جزئیات زیر مدل -----------------------------

function PricingBreakdown({ model, globalMarkupPercent }: { model: PricingOverviewModel; globalMarkupPercent: number }) {
    const hasScenarios = Boolean(model.scenarioMin && model.scenarioMax);

    return (
        <div className={pricingStyles.breakdownBox}>
            <div className={pricingStyles.breakdownTop}>
                <span className={pricingStyles.breakdownTitle}>
                    🧾 جزئیات قیمت «{model.displayName || model.name}»
                </span>
                <div className={pricingStyles.breakdownActions}>
                    <Link href={`/models/${model._id}`} className={pricingStyles.editLink}>
                        ✎ ویرایش مدل و قیمت
                    </Link>
                </div>
            </div>

            <div className={pricingStyles.chipRow}>
                <span className={pricingStyles.chip}>
                    مبنای محاسبه: {RANGE_BASIS_LABELS_FA[model.rangeBasis]}
                </span>
                <span className={pricingStyles.chip}>
                    مارکاپ مؤثر: <span className={pricingStyles.chipValue}>{toFarsiNumber(String(model.effectiveMarkupPercent))}٪</span>
                    ({model.markupSource === 'model' ? 'اختصاصی مدل' : `سراسری billing — ${toFarsiNumber(String(globalMarkupPercent))}٪`})
                </span>
                <span className={pricingStyles.chip}>
                    ساختار: {model.pricingMode ? (MODE_LABELS_FA[model.pricingMode] || model.pricingMode) : 'تعریف نشده'}
                    {model.unitPer ? ` · ${model.unitLabelFa}` : ''}
                </span>
                {model.actualCostEnabled && (
                    <span className={`${pricingStyles.chip} ${pricingStyles.chipWarn}`}>
                        ⚠ هزینه واقعی از پاسخ ارائه‌دهنده (actualCost) فعال است
                    </span>
                )}
            </div>

            {hasScenarios && (
                <div className={pricingStyles.scenarioGrid}>
                    <div className={pricingStyles.scenarioCard}>
                        <span className={pricingStyles.scenarioHead}>
                            <span className={`${pricingStyles.rangeFlag} ${pricingStyles.rangeFlagMin}`}>ارزان‌ترین</span>
                            ترکیب تنظیمات (تخمینی)
                        </span>
                        <span className={pricingStyles.scenarioLabel}>{model.scenarioMin!.label}</span>
                        <span className={pricingStyles.scenarioAmount}>{formatUsdSmart(model.scenarioMin!.customerUsd)}</span>
                        <span className={pricingStyles.scenarioVendor}>
                            vendor: {formatUsdSmart(model.scenarioMin!.vendorUsd)}
                        </span>
                    </div>
                    <div className={`${pricingStyles.scenarioCard} ${pricingStyles.scenarioCardMax}`}>
                        <span className={pricingStyles.scenarioHead}>
                            <span className={`${pricingStyles.rangeFlag} ${pricingStyles.rangeFlagMax}`}>گران‌ترین</span>
                            ترکیب تنظیمات (تخمینی)
                        </span>
                        <span className={pricingStyles.scenarioLabel}>{model.scenarioMax!.label}</span>
                        <span className={pricingStyles.scenarioAmount}>{formatUsdSmart(model.scenarioMax!.customerUsd)}</span>
                        <span className={pricingStyles.scenarioVendor}>
                            vendor: {formatUsdSmart(model.scenarioMax!.vendorUsd)}
                        </span>
                    </div>
                    {Boolean(model.scenarioEvaluated) && (
                        <span className={pricingStyles.chip}>
                            {toFarsiNumber(String(model.scenarioEvaluated))} ترکیب تنظیمات با موتور واقعی هزینه ارزیابی شد
                        </span>
                    )}
                </div>
            )}

            {model.components.length > 0 && (
                <table className={pricingStyles.componentTable}>
                    <thead>
                    <tr>
                        <th>جزء قیمت</th>
                        <th>توضیح</th>
                        <th>واحد</th>
                        <th>هزینه ارائه‌دهنده</th>
                        <th>قیمت مشتری</th>
                        <th>بازه</th>
                    </tr>
                    </thead>
                    <tbody>
                    {model.components.map((component) => (
                        <tr key={component.key} style={component.informationalOnly ? { opacity: 0.72 } : undefined}>
                            <td>
                                <span className={pricingStyles.componentLabel}>
                                    <span className={`${pricingStyles.componentKindBadge} ${pricingStyles[KIND_CLASS[component.kind]]}`}>
                                        {KIND_LABELS_FA[component.kind]}
                                    </span>
                                    {component.label}
                                </span>
                                {component.informationalOnly && (
                                    <span className={pricingStyles.infoOnlyBadge} style={{ marginInlineStart: '0.4rem' }}>
                                        صرفاً نمایشی — در صورتحساب فعلی اعمال نمی‌شود
                                    </span>
                                )}
                            </td>
                            <td>
                                <div className={pricingStyles.componentDetail}>{component.detail || '—'}</div>
                            </td>
                            <td className={styles.timeText}>{component.perLabelFa || component.per || '—'}</td>
                            <td>
                                <span className={`${pricingStyles.moneyLtr} ${pricingStyles.vendorMoney}`}>
                                    {formatUsdSmart(component.vendorUsd)}
                                </span>
                            </td>
                            <td>
                                <span className={`${pricingStyles.moneyLtr} ${pricingStyles.customerMoney}`}>
                                    {formatUsdSmart(component.customerUsd)}
                                </span>
                            </td>
                            <td>
                                {component.isMin && (
                                    <span className={`${pricingStyles.rangeFlag} ${pricingStyles.rangeFlagMin}`}>ارزان‌ترین نرخ</span>
                                )}
                                {component.isMax && (
                                    <span className={`${pricingStyles.rangeFlag} ${pricingStyles.rangeFlagMax}`}>گران‌ترین نرخ</span>
                                )}
                                {!component.isMin && !component.isMax && '—'}
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            )}

            {model.notes.length > 0 && (
                <ul className={pricingStyles.notesList}>
                    {model.notes.map((note, index) => (
                        <li key={index}>{note}</li>
                    ))}
                </ul>
            )}

            {model.notesMarkdown && (
                <details className={pricingStyles.formulaNotes}>
                    <summary>توضیحات فرمول قیمت این مدل (یادداشت ادمین)</summary>
                    <pre>{model.notesMarkdown}</pre>
                </details>
            )}
        </div>
    );
}
