'use client'

import React, { Suspense, useEffect, useMemo, useState } from "react";
import styles from "../providers/Providers.module.scss"; // استفاده از همان فایل استایل مشترک
import axios from "axios";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { ErrorToaster, SuccessToaster } from "@my-workspace/utils";
import { toFarsiNumber } from "@my-workspace/utils";
import { LoadingState, Pagination } from "@my-workspace/components";
import { useAuthStore } from "@/app/zustand/store/authStore";
import { useAppStore } from "@/app/zustand/store/useAppStore";
import { useRevisionData } from "@/app/hooks/useRevisionData";
import { useUrlTableState } from "@/app/hooks/useUrlTableState";
import { LuActivity, LuLayers, LuListChecks, LuPercent } from "react-icons/lu";
import FilterChips from "@/app/components/FilterChips/FilterChips";
import ChecklistProgress, { type ChecklistSummary } from "./components/ChecklistProgress";
import RowActionMenu from "./components/RowActionMenu";
import ChecklistCell from "./components/ChecklistCell";

// گزینه‌های فیلتر ستونی — هر آیتم یک ستون از جدول است و به‌راحتی قابل گسترش
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

// پیش‌تنظیم‌های فیلتر درصد پیشرفت چک‌لیست (سمت بک‌اند پشتیبانی می‌شوند)
const CHECKLIST_PROGRESS_FILTERS = [
    { value: 'zero', label: '۰٪ (هیچ‌کدام)' },
    { value: 'lte50', label: '۵۰٪ و کمتر' },
    { value: 'gt50', label: 'بیش از ۵۰٪' },
    { value: 'gte70', label: '۷۰٪ به بالا' },
    { value: 'eq100', label: '۱۰۰٪ (کامل)' },
    { value: 'partial', label: 'نیمه‌کاره (شروع‌شده، ناقص)' },
];

type ModelFilterKey = 'class' | 'markup' | 'isActive' | 'checklistProgress';

const FILTER_KEYS: ModelFilterKey[] = ['class', 'markup', 'isActive', 'checklistProgress'];
const DEFAULT_LIMIT = 50;
/** آخرین state فهرست (فیلتر، جستجو، صفحه) — برگشت از صفحه ویرایش یا منو همان فهرست را نشان دهد */
const LIST_STATE_STORAGE_KEY = 'naslyar.models.list';

function readSavedListQuery(): string {
    try {
        return window.sessionStorage.getItem(LIST_STATE_STORAGE_KEY) || '';
    } catch {
        return '';
    }
}

function saveListQuery(query: string) {
    try {
        window.sessionStorage.setItem(LIST_STATE_STORAGE_KEY, query);
    } catch {
        // حالت خصوصی/مسدود: فقط URL می‌ماند
    }
}

function formatPersianDate(dateString: string) {
    try {
        return new Intl.DateTimeFormat('fa-IR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }).format(new Date(dateString));
    } catch {
        return '---';
    }
}

type ModelRow = Record<string, unknown>;
type ModelsPage = { models: ModelRow[]; totalItems: number };

function ProviderModels() {
    const router = useRouter();
    const params = useSearchParams();
    const { token } = useAuthStore();
    const { baseUrl } = useAppStore();

    const query = params.toString();

    // ورود به /models بدون پارامتر (منو، redirect بعد از ذخیره مدل) → آخرین فیلترهای ذخیره‌شده از اولین رندر
    // اعمال می‌شوند (fallbackQuery)؛ اولین تغییر کاربر همه را در URL می‌نویسد و «پاک کردن همه» بازیابی را لغو می‌کند.
    const [restoreQuery] = useState(() => (typeof window !== 'undefined' && !query ? readSavedListQuery() : ''));
    const [touched, setTouched] = useState(false);
    const fallbackQuery = touched ? '' : restoreQuery;

    // state جدول در URL (لینک قابل اشتراک، بازگشت مرورگر) + ذخیره در sessionStorage
    const table = useUrlTableState('', {
        sort: 'createdAt',
        limit: DEFAULT_LIMIT,
        filters: { class: '', markup: '', isActive: '', checklistProgress: '' },
        fallbackQuery,
    }, [10, 25, 50, 100]);

    const effectiveQuery = query || fallbackQuery;
    useEffect(() => {
        saveListQuery(effectiveQuery);
    }, [effectiveQuery]);

    const [reloadKey, setReloadKey] = useState(0);
    const [checklistTemplates, setChecklistTemplates] = useState<{ _id: string; title: string }[]>([]);

    const apiQuery = useMemo(() => {
        const search = new URLSearchParams({ limit: String(table.limit), page: String(table.page), includeInactive: 'true' });
        FILTER_KEYS.forEach((key) => {
            if (table.filters[key]) search.set(key, table.filters[key]);
        });
        if (table.search) search.set('search', table.search);
        return search.toString();
    }, [table.limit, table.page, table.filters, table.search]);

    const fetcher = useMemo(
        () =>
            token && baseUrl
                ? () =>
                      axios
                          .get(`${baseUrl}/api/provider-models?${apiQuery}`, { headers: { authorization: `Bearer ${token}` } })
                          .then((res): ModelsPage => {
                              if (res.data.statusCode !== 200) throw new Error(res.data.message || 'دریافت مدل‌ها ناموفق بود');
                              return { models: res.data.data.models || [], totalItems: res.data.data.totalItems || 0 };
                          })
                : null,
        [token, baseUrl, apiQuery],
    );
    const { data: listData, setData: setListData, loading: isLoading } = useRevisionData<ModelsPage>(fetcher, reloadKey);
    const data = listData?.models || [];
    const totalItems = listData?.totalItems || 0;
    const updateRows = (update: (rows: ModelRow[]) => ModelRow[]) =>
        setListData((prev) => (prev ? { ...prev, models: update(prev.models) } : prev));

    // جستجو: متن تایپ‌شده محلی، بعد از مکث کوتاه در URL (و با بازیابی/پاک‌کردن همگام می‌شود)
    const [searchInput, setSearchInput] = useState(table.search);
    const [syncedSearch, setSyncedSearch] = useState(table.search);
    if (table.search !== syncedSearch) {
        setSyncedSearch(table.search);
        setSearchInput(table.search);
    }
    useEffect(() => {
        if (searchInput.trim() === table.search) return;
        const timer = setTimeout(() => {
            setTouched(true);
            table.setSearch(searchInput);
        }, 400);
        return () => clearTimeout(timer);
    }, [searchInput, table]);

    // آیتم‌های چک‌لیست سراسری (مدیریت از تنظیمات هوش مصنوعی) — یک‌بار بارگذاری می‌شود
    useEffect(() => {
        if (!token || !baseUrl) return;
        axios
            .get(`${baseUrl}/api/provider-model-checklists`, {
                headers: { authorization: `Bearer ${token}` },
            })
            .then((res) => {
                if (res.data.statusCode === 200) {
                    setChecklistTemplates(res.data.data?.items || []);
                }
            })
            .catch(() => {
                // جدول بدون چک‌لیست هم کار می‌کند — خطا ساکت نادیده گرفته می‌شود
            });
    }, [token, baseUrl]);

    // وضعیت کلی چک‌لیست همهٔ مدل‌های فعال (مستقل از صفحه و فیلتر جدول)
    const [checklistSummary, setChecklistSummary] = useState<ChecklistSummary | null>(null);
    const [summaryLoading, setSummaryLoading] = useState(false);
    // خطا ساکت: جدول بدون این کارت هم کار می‌کند
    const requestChecklistSummary = (): Promise<ChecklistSummary | null> =>
        axios
            .get(`${baseUrl}/api/provider-models/checklist-summary`, { headers: { authorization: `Bearer ${token}` } })
            .then((res) => (res.data.statusCode === 200 ? res.data.data : null))
            .catch(() => null);

    /** بعد از تیک چک‌لیست یا فعال/غیرفعال کردن مدل — کارت تا پاسخ کم‌رنگ می‌ماند */
    const loadChecklistSummary = () => {
        if (!token || !baseUrl) return;
        setSummaryLoading(true);
        requestChecklistSummary()
            .then((next) => next && setChecklistSummary(next))
            .finally(() => setSummaryLoading(false));
    };

    useEffect(() => {
        if (!token || !baseUrl) return;
        let active = true;
        requestChecklistSummary().then((next) => active && next && setChecklistSummary(next));
        return () => {
            active = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, baseUrl]);

    const handleChecklistUpdated = (modelId: string, checkedItemIds: string[]) => {
        updateRows((rows) => rows.map((row) =>
            row._id === modelId ? { ...row, checklistItems: checkedItemIds } : row,
        ));
        loadChecklistSummary();
    };

    const updateFilter = (key: ModelFilterKey, value: string) => {
        setTouched(true);
        table.setFilter(key, value);
    };

    const clearFilters = () => {
        setTouched(true);
        setSearchInput('');
        table.reset();
    };

    const handleEdit = (_id: string) => {
        router.push(`/models/${_id}`);
    };

    const handleDelete = async (_id: string) => {
        const isConfirmed = window.confirm("آیا از حذف این مدل مطمئن هستید؟");
        if (!isConfirmed) return;

        try {
            const res = await axios.delete(`${baseUrl}/api/provider-models/${_id}`, {
                headers: { authorization: `Bearer ${token}` }
            });

            if (res.data.statusCode === 200) {
                SuccessToaster({ message: "مدل با موفقیت حذف شد" });
                setReloadKey((value) => value + 1);
                loadChecklistSummary();
            }
        } catch (e) {
            ErrorToaster(e);
        }
    };

    const isModelActive = (item: { isActive?: boolean }) => item.isActive === true;

    const handleToggleActive = async (item: { _id: string; isActive?: boolean }) => {
        if (!token) return;
        const nextActive = !isModelActive(item);
        try {
            const res = await axios.put(
                `${baseUrl}/api/provider-models/${item._id}`,
                { isActive: nextActive },
                { headers: { authorization: `Bearer ${token}` } },
            );
            if (res.data.statusCode === 200) {
                updateRows((rows) => rows.map((row) =>
                    row._id === item._id ? { ...row, isActive: nextActive } : row,
                ));
                loadChecklistSummary();
                SuccessToaster({
                    message: nextActive ? 'مدل فعال شد و در لیست‌ها نمایش داده می‌شود.' : 'مدل غیرفعال شد.',
                });
            }
        } catch (e) {
            ErrorToaster(e);
        }
    };

    return (
        /* اعمال کلاس styles.container جهت هم‌سایز شدن دقیق پهنای صفحه با لایوت ارائه‌دهندگان */
        <div className={`${styles.container} ${styles.rtl}`}>
            {/* هدر ماژول */}
            <header className={styles.header}>
                <div>
                    <h1 className={styles.mainTitle}>مدیریت مدل‌های هوش مصنوعی</h1>
                    <p className={styles.subtitle}>
                        در این بخش می‌توانید مدل‌های مختلف متصل به ارائه‌دهنده‌ها را تعریف کرده و قیمت‌گذاری توکن‌های ورودی، خروجی و کش را به صورت دقیق مدیریت کنید.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <Link href="/models/new" className={styles.primaryBtn}>
                        + ایجاد مدل جدید
                    </Link>
                </div>
            </header>

            {/* جایگزین توپ‌گرید: باکس راهنمای آموزشی مکانیزم هزینه‌ها و توکن‌ها */}
            <div className={styles.noticeContainer}>
                <div className={styles.noticeHeader}>
                    <div className={styles.noticeTitleGroup}>
                        <span className={styles.noticeIcon}>💸</span>
                        <h2 className={styles.noticeTitle}>راهنمای تخصصی ساختار هزینه و قیمت‌گذاری توکن‌ها (Token Pricing)</h2>
                    </div>
                    <span className={styles.noticeBadge}>مبنای محاسبه: ۱ میلیون توکن</span>
                </div>

                <div className={styles.noticeGrid}>
                    <div className={styles.noticeCard}>
                        <div className={styles.noticeCardHead}>
                            <span className={styles.stepNumber}>In</span>
                            <h3>توکن ورودی (Input Token)</h3>
                        </div>
                        <p>
                            شامل تمام متن ارسالی کاربر، تاریخچه چت (Context) و دستورالعمل‌های سیستم (System Prompt) است. نرخ این توکن معمولاً به دلیل پردازش سبک‌تر، ارزان‌تر از توکن خروجی محاسبه می‌شود.
                        </p>
                    </div>

                    <div className={styles.noticeCard}>
                        <div className={styles.noticeCardHead}>
                            <span className={styles.stepNumber}>Out</span>
                            <h3>توکن خروجی (Output Token)</h3>
                        </div>
                        <p>
                            مربوط به پاسخ تولید شده توسط هوش مصنوعی است. فرآیند تولید توکن خروجی (Generation) به دلیل ماهیت سنگین و توالی محاسبات لایه ماتریسی سرور، بالاترین هزینه را در API به خود اختصاص می‌دهد.
                        </p>
                    </div>

                    <div className={styles.noticeCard}>
                        <div className={styles.noticeCardHead}>
                            <span className={styles.stepNumber}>$$</span>
                            <h3>کش ورودی (Cached Input)</h3>
                        </div>
                        <p>
                            در مدل‌های مدرن (مثل Claude یا Gemini)، اگر دستورات سیستم یا متن‌های طولانی در درخواست‌های متوالی تکرار شوند، در لایه سرور کش شده و هزینه توکن‌های ورودی تکراری تا <strong>۵۰ الی ۸۰ درصد کاهش</strong> می‌یابد.
                        </p>
                    </div>
                </div>

                <div className={styles.noticeFooter}>
                    <p>💡 <strong>نکته ادمین:</strong> مبالغ ثبت شده در جدول زیر را ترجیحاً بر اساس نرخ رسمی ارائه‌دهنده‌ها به ازای هر ۱ میلیون توکن تنظیم کنید تا محاسبات مالی سود پلتفرم دچار نوسان نشود.</p>
                </div>
            </div>

            {/* وضعیت کلی چک‌لیست مدل‌های فعال */}
            <ChecklistProgress
                summary={checklistSummary}
                loading={summaryLoading}
                onFilter={(progress) => {
                    setTouched(true);
                    table.setFilter('isActive', 'true');
                    table.setFilter('checklistProgress', progress);
                }}
            />

            {/* بخش جدول داده‌ها: جستجو + فیلترهای چیپی */}
            <div className={styles.tableToolbar}>
                <div className={styles.toolbarSearchGroup}>
                    <div className={styles.searchBar}>
                        <span aria-hidden="true">🔍</span>
                        <input
                            type="search"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="جستجوی نام مدل..."
                            aria-label="جستجوی نام مدل"
                        />
                    </div>
                </div>
                <div className={styles.toolbarActionsGroup}>
                    <Link href="/models/new" className={styles.primaryBtn}>
                        + ایجاد مدل جدید
                    </Link>
                </div>
            </div>

            <FilterChips
                className={styles.modelFilterChips}
                filters={[
                    { id: 'class', label: 'کلاس', icon: <LuLayers />, value: table.filters.class, allLabel: 'همه کلاس‌ها', options: MODEL_CLASSES },
                    { id: 'isActive', label: 'وضعیت', icon: <LuActivity />, value: table.filters.isActive, allLabel: 'فعال و غیرفعال', options: STATUS_FILTERS },
                    { id: 'markup', label: 'مارکاپ', icon: <LuPercent />, value: table.filters.markup, allLabel: 'همه', options: MARKUP_FILTERS },
                    { id: 'checklistProgress', label: 'چک‌لیست', icon: <LuListChecks />, value: table.filters.checklistProgress, allLabel: 'هر میزان پیشرفت', options: CHECKLIST_PROGRESS_FILTERS },
                ]}
                onChange={(id, value) => updateFilter(id as ModelFilterKey, value)}
                onClearAll={clearFilters}
                summary={`${toFarsiNumber(String(totalItems))} مدل`}
            />

            <div className={styles.tableWrapper}>
                <table className={`${styles.table} ${isLoading && listData ? styles.tableStale : ''}`}>
                    <thead>
                    <tr>
                        <th>#</th>
                        <th>نام مدل</th>
                        <th>ارائه دهنده</th>
                        <th>کلاس مدل</th>
                        <th>وضعیت</th>
                        <th>مارکاپ</th>
                        <th>چک‌لیست</th>
                        <th>تاریخ ایجاد</th>
                        <th>عملیات</th>
                    </tr>
                    </thead>
                    <tbody>
                    {isLoading && !listData ? (
                        <tr><td colSpan={9}><LoadingState /></td></tr>
                    ) : data?.length === 0 ? (
                        <tr>
                            <td colSpan={9} className={styles.emptyPlaceholder}>
                                هیچ مدل هوش مصنوعی یافت نشد.
                                <Link href="/models/new" className={styles.primaryBtn}>
                                    + ایجاد اولین مدل
                                </Link>
                            </td>
                        </tr>
                    ) : (
                        data?.map((item: any, i: number) => (
                            <tr key={item._id || i} className={!isModelActive(item) ? styles.rowInactive : ''}>
                                <td data-label="#">{toFarsiNumber(((table.page - 1) * table.limit) + (i + 1))}</td>
                                <td data-label="نام مدل" className={styles.modelName}>{item.displayName}</td>
                                <td data-label="ارائه دهنده"><span className={styles.badgeActive}>{item.providerName}</span></td>
                                <td data-label="کلاس مدل" className={styles.timeText}>{item.class}</td>
                                <td data-label="وضعیت">
                                    <div className={styles.statusCell}>
                                        <button
                                            type="button"
                                            className={`${styles.statusToggle} ${isModelActive(item) ? styles.statusOn : styles.statusOff}`}
                                            onClick={() => handleToggleActive(item)}
                                            title={isModelActive(item) ? 'کلیک برای غیرفعال کردن' : 'کلیک برای فعال کردن'}
                                        >
                                            <span className={styles.statusKnob} />
                                        </button>
                                        <span className={`${styles.statusLabel} ${isModelActive(item) ? styles.statusLabelOn : styles.statusLabelOff}`}>
                                            {isModelActive(item) ? 'فعال' : 'غیرفعال'}
                                        </span>
                                    </div>
                                </td>
                                <td data-label="مارکاپ" className={styles.timeText}>
                                    {item.markupPercent != null && item.markupPercent !== ''
                                        ? `${toFarsiNumber(String(item.markupPercent))}٪`
                                        : <span title="از مارکاپ سراسری billing استفاده می‌کند">سراسری</span>}
                                </td>
                                <td data-label="چک‌لیست">
                                    <ChecklistCell
                                        model={item}
                                        templates={checklistTemplates}
                                        token={token}
                                        baseUrl={baseUrl}
                                        onUpdated={handleChecklistUpdated}
                                    />
                                </td>
                                <td data-label="تاریخ ایجاد" className={styles.timeText}>{formatPersianDate(item.createdAt)}</td>
                                <td data-label="عملیات">
                                    <RowActionMenu
                                        rowId={item._id}
                                        items={[
                                            { label: 'ویرایش مدل', onClick: () => handleEdit(item._id) },
                                            { label: 'حذف مدل', danger: true, onClick: () => handleDelete(item._id) },
                                        ]}
                                    />
                                </td>
                            </tr>
                        ))
                    )}
                    </tbody>
                </table>
            </div>

            {/* کامپوننت پجینیشن */}
            <Pagination
                rtl
                itemPerPage={table.limit}
                totalItems={totalItems}
                currentPage={table.page}
                paginate={table.setPage}
                setRowsPerPage={(next) => {
                    setTouched(true);
                    table.setLimit(next);
                }}
                rowsPerPageOptions={table.limitOptions}
            />
        </div>
    );
}

// useSearchParams به Suspense نیاز دارد (prerender)
export default function ProviderModelsPage() {
    return (
        <Suspense fallback={<LoadingState />}>
            <ProviderModels />
        </Suspense>
    );
}
