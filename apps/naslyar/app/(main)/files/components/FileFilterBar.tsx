'use client';

import { useEffect, useState, type ReactNode } from 'react';
import {
    LuCalendar,
    LuCheck,
    LuChevronDown,
    LuFilterX,
    LuHardDrive,
    LuLayers,
    LuSearch,
    LuSparkles,
    LuUser,
    LuX,
} from 'react-icons/lu';
import { ModalHelper } from '@my-workspace/components';
import type { FileOwnerOption, FileSource, FileVariantFilter } from '../files.types';
import styles from '../Files.module.scss';

/** همهٔ فیلترهای پیشرفتهٔ صفحه فایل‌ها (جستجو و دسته‌بندی جدا هستند) */
export interface FileFilters {
    source: FileSource;
    /** کاربر انتخاب‌شده از پیشنهادها (userId دارد) یا بخشی از ایمیل که تایپ شده */
    owner: { email: string; name?: string; userId?: string } | null;
    variant: FileVariantFilter;
    size: string;
    minKb: string;
    maxKb: string;
    date: string;
    from: string;
    to: string;
}

export const EMPTY_FILE_FILTERS: FileFilters = {
    source: 'all',
    owner: null,
    variant: 'all',
    size: '',
    minKb: '',
    maxKb: '',
    date: '',
    from: '',
    to: '',
};

const SOURCE_OPTIONS: Array<{ id: FileSource; title: string; hint: string }> = [
    { id: 'all', title: 'همه فایل‌ها', hint: 'آپلودها و ساخته‌های هوش مصنوعی با هم' },
    { id: 'uploaded', title: 'آپلودشده', hint: 'فایل‌هایی که کاربران یا ادمین بالا آورده‌اند' },
    { id: 'generated', title: 'ساخته‌شده با هوش مصنوعی', hint: 'عکس، ویدیو و صدای تولیدشده در استودیو — فقط مشاهده' },
];

const VARIANT_OPTIONS: Array<{ id: FileVariantFilter; title: string; hint: string }> = [
    { id: 'all', title: 'همه نسخه‌ها', hint: 'فایل اصلی و نسخه‌های ساخته‌شده از آن' },
    { id: 'original', title: 'فقط فایل اصلی', hint: 'بدون بندانگشتی و نسخهٔ بهینه' },
    { id: 'chat-optimized', title: 'بهینه‌شده برای چت', hint: 'نسخهٔ سبک‌شده برای ارسال به مدل' },
    { id: 'thumbnail', title: 'بندانگشتی', hint: 'تصویر کوچک پیش‌نمایش' },
];

const SIZE_OPTIONS: Array<{ id: string; title: string; min?: number; max?: number }> = [
    { id: '', title: 'هر حجمی' },
    { id: 'xs', title: 'کمتر از 100 KB', max: 100 },
    { id: 'sm', title: '100 KB تا 1 MB', min: 100, max: 1024 },
    { id: 'md', title: '1 تا 10 MB', min: 1024, max: 10 * 1024 },
    { id: 'lg', title: 'بیشتر از 10 MB', min: 10 * 1024 },
];

const DATE_OPTIONS: Array<{ id: string; title: string; days?: number }> = [
    { id: '', title: 'همه زمان‌ها' },
    { id: 'today', title: 'امروز', days: 0 },
    { id: '7', title: '۷ روز اخیر', days: 7 },
    { id: '30', title: '۳۰ روز اخیر', days: 30 },
    { id: '90', title: '۹۰ روز اخیر', days: 90 },
];

/** تبدیل فیلترها به پارامترهای API (حجم به بایت، تاریخ‌های نسبی به ISO) */
export function filtersToQuery(filters: FileFilters) {
    const sizePreset = SIZE_OPTIONS.find((item) => item.id === filters.size && item.id);
    const minKb = sizePreset ? sizePreset.min : filters.size === 'custom' ? Number(filters.minKb) || undefined : undefined;
    const maxKb = sizePreset ? sizePreset.max : filters.size === 'custom' ? Number(filters.maxKb) || undefined : undefined;

    let from: string | undefined;
    let to: string | undefined;
    const datePreset = DATE_OPTIONS.find((item) => item.id === filters.date && item.id);
    if (datePreset) {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        start.setDate(start.getDate() - (datePreset.days || 0));
        from = start.toISOString();
    } else if (filters.date === 'custom') {
        from = filters.from || undefined;
        to = filters.to ? `${filters.to}T23:59:59.999Z` : undefined;
    }

    return {
        source: filters.source,
        variant: filters.variant,
        userId: filters.owner?.userId,
        email: filters.owner && !filters.owner.userId ? filters.owner.email : undefined,
        minSize: minKb ? Math.round(minKb * 1024) : undefined,
        maxSize: maxKb ? Math.round(maxKb * 1024) : undefined,
        from,
        to,
    };
}

export function countActiveFilters(filters: FileFilters): number {
    return [
        filters.source !== 'all',
        Boolean(filters.owner),
        filters.variant !== 'all',
        Boolean(filters.size),
        Boolean(filters.date),
    ].filter(Boolean).length;
}

type PanelId = 'owner' | 'source' | 'variant' | 'size' | 'date';

export default function FileFilterBar({
    value,
    onChange,
    showSource,
    resultCount,
    loadOwners,
}: {
    value: FileFilters;
    onChange: (next: FileFilters) => void;
    /** منبع فقط وقتی سرویس خروجی تولیدی دارد */
    showSource: boolean;
    resultCount: number;
    loadOwners: (q: string) => Promise<FileOwnerOption[]>;
}) {
    const [panel, setPanel] = useState<{ id: PanelId; anchor: HTMLElement } | null>(null);
    const close = () => setPanel(null);
    const patch = (changes: Partial<FileFilters>) => {
        onChange({ ...value, ...changes });
        close();
    };

    const sourceTitle = SOURCE_OPTIONS.find((item) => item.id === value.source)?.title || '';
    const variantTitle = VARIANT_OPTIONS.find((item) => item.id === value.variant)?.title || '';
    const sizeTitle = value.size === 'custom'
        ? [value.minKb && `از ${value.minKb} KB`, value.maxKb && `تا ${value.maxKb} KB`].filter(Boolean).join(' ')
        : SIZE_OPTIONS.find((item) => item.id === value.size)?.title || '';
    const dateTitle = value.date === 'custom'
        ? [value.from && `از ${value.from}`, value.to && `تا ${value.to}`].filter(Boolean).join(' ')
        : DATE_OPTIONS.find((item) => item.id === value.date)?.title || '';
    // نسخه فقط برای آپلودها معنی دارد
    const showVariant = value.source !== 'generated';
    const activeCount = countActiveFilters(value);

    const chip = (id: PanelId, icon: ReactNode, label: string, display: string, active: boolean, clear: () => void) => (
        <div className={`${styles.filterChip} ${active ? styles.filterChipActive : ''}`}>
            <button
                type="button"
                className={styles.filterChipMain}
                aria-haspopup="dialog"
                aria-expanded={panel?.id === id}
                onClick={(event) => setPanel({ id, anchor: event.currentTarget })}
            >
                {icon}
                <span className={styles.filterChipLabel}>{label}</span>
                <span className={styles.filterChipValue} dir="auto">{display}</span>
                <LuChevronDown className={styles.filterChipCaret} aria-hidden />
            </button>
            {active ? (
                <button type="button" className={styles.filterChipClear} aria-label={`حذف فیلتر ${label}`} onClick={clear}>
                    <LuX />
                </button>
            ) : null}
        </div>
    );

    const renderPanel = () => {
        if (!panel) return null;
        switch (panel.id) {
            case 'owner':
                return <OwnerPanel value={value.owner} loadOwners={loadOwners} onPick={(owner) => patch({ owner })} />;
            case 'source':
                return (
                    <OptionPanel
                        title="منبع فایل"
                        options={SOURCE_OPTIONS}
                        selected={value.source}
                        onPick={(id) => patch({ source: id as FileSource, ...(id === 'generated' ? { variant: 'all' as FileVariantFilter, size: '' } : {}) })}
                    />
                );
            case 'variant':
                return <OptionPanel title="نسخهٔ فایل" options={VARIANT_OPTIONS} selected={value.variant} onPick={(id) => patch({ variant: id as FileVariantFilter })} />;
            case 'size':
                return (
                    <PresetPanel
                        title="حجم فایل"
                        options={SIZE_OPTIONS}
                        selected={value.size}
                        onPick={(id) => patch({ size: id, minKb: '', maxKb: '' })}
                        customLabel="حجم دلخواه (KB)"
                        custom={{ a: value.minKb, b: value.maxKb, type: 'number', aLabel: 'از', bLabel: 'تا' }}
                        onCustom={(a, b) => patch({ size: a || b ? 'custom' : '', minKb: a, maxKb: b })}
                        hint={value.source !== 'uploaded' ? 'خروجی‌های هوش مصنوعی حجم ثبت‌شده ندارند؛ با این فیلتر فقط آپلودها می‌مانند.' : undefined}
                    />
                );
            case 'date':
                return (
                    <PresetPanel
                        title="تاریخ ساخت یا آپلود"
                        options={DATE_OPTIONS}
                        selected={value.date}
                        onPick={(id) => patch({ date: id, from: '', to: '' })}
                        customLabel="بازهٔ دلخواه"
                        custom={{ a: value.from, b: value.to, type: 'date', aLabel: 'از', bLabel: 'تا' }}
                        onCustom={(a, b) => patch({ date: a || b ? 'custom' : '', from: a, to: b })}
                    />
                );
        }
    };

    return (
        <section className={styles.filterBar} aria-label="فیلترهای فایل">
            <div className={styles.filterChips}>
                {chip('owner', <LuUser />, 'کاربر', value.owner ? value.owner.email || value.owner.name || '' : 'همه کاربران', Boolean(value.owner), () => onChange({ ...value, owner: null }))}
                {showSource && chip('source', <LuSparkles />, 'منبع', sourceTitle, value.source !== 'all', () => onChange({ ...value, source: 'all' }))}
                {showVariant && chip('variant', <LuLayers />, 'نسخه', variantTitle, value.variant !== 'all', () => onChange({ ...value, variant: 'all' }))}
                {chip('size', <LuHardDrive />, 'حجم', sizeTitle || 'هر حجمی', Boolean(value.size), () => onChange({ ...value, size: '', minKb: '', maxKb: '' }))}
                {chip('date', <LuCalendar />, 'تاریخ', dateTitle || 'همه زمان‌ها', Boolean(value.date), () => onChange({ ...value, date: '', from: '', to: '' }))}
            </div>
            <div className={styles.filterSummary}>
                <span>{resultCount.toLocaleString('en-US')} فایل</span>
                {activeCount ? (
                    <button type="button" className={styles.filterReset} onClick={() => onChange(EMPTY_FILE_FILTERS)}>
                        <LuFilterX /> پاک کردن {activeCount > 1 ? `${activeCount} فیلتر` : 'فیلتر'}
                    </button>
                ) : null}
            </div>

            <ModalHelper
                open={Boolean(panel)}
                onClose={close}
                type="popup"
                targetElement={panel?.anchor}
                sheetTitle="فیلتر فایل‌ها"
                component={renderPanel()}
            />
        </section>
    );
}

function OptionPanel({
    title,
    options,
    selected,
    onPick,
}: {
    title: string;
    options: Array<{ id: string; title: string; hint?: string }>;
    selected: string;
    onPick: (id: string) => void;
}) {
    return (
        <div className={styles.filterPanel}>
            <h4 className={styles.filterPanelTitle}>{title}</h4>
            <OptionList options={options} selected={selected} onPick={onPick} />
        </div>
    );
}

function PresetPanel({
    title,
    options,
    selected,
    onPick,
    customLabel,
    custom,
    onCustom,
    hint,
}: {
    title: string;
    options: Array<{ id: string; title: string }>;
    selected: string;
    onPick: (id: string) => void;
    customLabel: string;
    custom: { a: string; b: string; type: 'number' | 'date'; aLabel: string; bLabel: string };
    onCustom: (a: string, b: string) => void;
    hint?: string;
}) {
    const [a, setA] = useState(custom.a);
    const [b, setB] = useState(custom.b);
    return (
        <div className={styles.filterPanel}>
            <h4 className={styles.filterPanelTitle}>{title}</h4>
            <OptionList options={options} selected={selected} onPick={onPick} compact />
            <form
                className={styles.filterCustom}
                onSubmit={(event) => {
                    event.preventDefault();
                    onCustom(a.trim(), b.trim());
                }}
            >
                <span className={styles.filterCustomLabel}>{customLabel}</span>
                <div className={styles.filterCustomRow}>
                    <label>
                        <span>{custom.aLabel}</span>
                        <input type={custom.type} inputMode={custom.type === 'number' ? 'numeric' : undefined} min={0} value={a} onChange={(event) => setA(event.target.value)} dir="ltr" />
                    </label>
                    <label>
                        <span>{custom.bLabel}</span>
                        <input type={custom.type} inputMode={custom.type === 'number' ? 'numeric' : undefined} min={0} value={b} onChange={(event) => setB(event.target.value)} dir="ltr" />
                    </label>
                </div>
                <button type="submit" className={styles.filterApply}>اعمال</button>
            </form>
            {hint ? <p className={styles.filterPanelHint}>{hint}</p> : null}
        </div>
    );
}

function OptionList({
    options,
    selected,
    onPick,
    compact = false,
}: {
    options: Array<{ id: string; title: string; hint?: string }>;
    selected: string;
    onPick: (id: string) => void;
    compact?: boolean;
}) {
    return (
        <div className={styles.filterOptions} role="listbox">
            {options.map((option) => (
                <button
                    key={option.id || 'none'}
                    type="button"
                    role="option"
                    aria-selected={selected === option.id}
                    className={`${styles.filterOption} ${compact ? styles.filterOptionCompact : ''} ${selected === option.id ? styles.filterOptionActive : ''}`}
                    onClick={() => onPick(option.id)}
                >
                    <span className={styles.filterOptionText}>
                        <strong>{option.title}</strong>
                        {option.hint ? <small>{option.hint}</small> : null}
                    </span>
                    {selected === option.id ? <LuCheck className={styles.filterOptionCheck} aria-hidden /> : null}
                </button>
            ))}
        </div>
    );
}

/** انتخاب کاربر: تایپ ایمیل/نام → پیشنهادها؛ Enter = جستجوی همان متن در ایمیل‌ها */
function OwnerPanel({
    value,
    loadOwners,
    onPick,
}: {
    value: FileFilters['owner'];
    loadOwners: (q: string) => Promise<FileOwnerOption[]>;
    onPick: (owner: FileFilters['owner']) => void;
}) {
    const [text, setText] = useState(value?.email || '');
    const [options, setOptions] = useState<FileOwnerOption[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const q = text.trim();
        if (q.length < 2) return;
        let active = true;
        const timer = window.setTimeout(() => {
            setLoading(true);
            loadOwners(q)
                .then((rows) => active && setOptions(rows))
                .finally(() => active && setLoading(false));
        }, 280);
        return () => {
            active = false;
            window.clearTimeout(timer);
        };
    }, [text, loadOwners]);

    const query = text.trim();
    const shown = query.length < 2 ? [] : options;

    return (
        <div className={styles.filterPanel}>
            <h4 className={styles.filterPanelTitle}>فایل‌های کدام کاربر؟</h4>
            <form
                className={styles.filterSearch}
                onSubmit={(event) => {
                    event.preventDefault();
                    if (query) onPick({ email: query });
                }}
            >
                <LuSearch aria-hidden />
                <input
                    autoFocus
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    placeholder="ایمیل، نام یا موبایل…"
                    aria-label="جستجوی کاربر"
                    dir="auto"
                />
            </form>
            <div className={styles.filterOptions} role="listbox">
                {value ? (
                    <button type="button" className={`${styles.filterOption} ${styles.filterOptionCompact}`} onClick={() => onPick(null)}>
                        <span className={styles.filterOptionText}><strong>همه کاربران</strong></span>
                    </button>
                ) : null}
                {shown.map((user) => (
                    <button
                        key={user.userId}
                        type="button"
                        role="option"
                        aria-selected={value?.userId === user.userId}
                        className={`${styles.filterOption} ${value?.userId === user.userId ? styles.filterOptionActive : ''}`}
                        onClick={() => onPick({ email: user.email || user.name, name: user.name, userId: user.userId })}
                    >
                        <span className={styles.filterOwnerAvatar} aria-hidden>{(user.name || user.email || '?').slice(0, 1).toUpperCase()}</span>
                        <span className={styles.filterOptionText}>
                            <strong>{user.name || user.email}</strong>
                            {user.email ? <small dir="ltr">{user.email}</small> : null}
                        </span>
                        {value?.userId === user.userId ? <LuCheck className={styles.filterOptionCheck} aria-hidden /> : null}
                    </button>
                ))}
                {query.length >= 2 ? (
                    <button type="button" className={`${styles.filterOption} ${styles.filterOptionCompact}`} onClick={() => onPick({ email: query })}>
                        <span className={styles.filterOptionText}>
                            <strong>همهٔ ایمیل‌های شامل «<bdi>{query}</bdi>»</strong>
                            <small>مثلاً gmail.com برای همه کاربران جیمیل</small>
                        </span>
                    </button>
                ) : (
                    <p className={styles.filterPanelHint}>حداقل دو حرف از ایمیل یا نام کاربر را بنویسید.</p>
                )}
                {loading && !shown.length ? <p className={styles.filterPanelHint}>در حال جستجو…</p> : null}
            </div>
        </div>
    );
}
