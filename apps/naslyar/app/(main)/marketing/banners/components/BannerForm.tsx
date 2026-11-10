'use client';

import { useState } from 'react';
import Link from 'next/link';
import { isoToJalaliString } from '@/app/(main)/accounting/jalali.client';
import {
    BANNER_STATUS_LABELS,
    EMPTY_BANNER_FORM,
    type Banner,
    type BannerCreative,
    type BannerForm,
    type BannerPlacement,
    type BannerStatusType,
} from '../banners.types';
import parentStyles from '../../Marketing.module.scss';
import hrStyles from '../../../management/hr/Hr.module.scss';
import styles from '../Banners.module.scss';

const RULE_FIELDS = [
    {
        key: 'device',
        label: 'دستگاه',
        hint: 'اگر خالی باشد روی همه دستگاه‌ها نشان داده می‌شود.',
        options: [
            { value: 'desktop', label: 'دسکتاپ' },
            { value: 'tablet', label: 'تبلت' },
            { value: 'mobile', label: 'موبایل' },
        ],
    },
    {
        key: 'language',
        label: 'زبان رابط',
        hint: 'زبان صفحه کاربر در استودیو؛ خالی یعنی همه زبان‌ها.',
        options: [
            { value: 'fa', label: 'فارسی' },
            { value: 'en', label: 'انگلیسی' },
            { value: 'ar', label: 'عربی' },
        ],
    },
    {
        key: 'loggedIn',
        label: 'وضعیت ورود',
        hint: 'مهمان یا کاربر واردشده؛ خالی یعنی هر دو.',
        options: [
            { value: 'true', label: 'فقط واردشده‌ها' },
            { value: 'false', label: 'فقط مهمان‌ها' },
        ],
    },
] as const;

export interface BannerFormProps {
    initial?: BannerForm;
    creatives: BannerCreative[];
    placements: BannerPlacement[];
    saving?: boolean;
    onSubmit: (form: BannerForm) => void;
    onCancel?: () => void;
    submitLabel?: string;
}

/**
 * فرم ایجاد/ویرایش بنر — بخش‌بندی‌شده مثل فرم کارمندان:
 * هویت، اتصال خلاقیت/جایگاه، زمان‌بندی، اولویت، سقف نمایش و هدف‌گیری.
 */
export default function BannerForm({
    initial,
    creatives,
    placements,
    saving = false,
    onSubmit,
    onCancel,
    submitLabel = 'ذخیره بنر',
}: BannerFormProps) {
    const [form, setForm] = useState<BannerForm>(initial || EMPTY_BANNER_FORM);
    const activeCreatives = creatives.filter((c) => c.isActive);
    const selectedCreative = creatives.find((c) => c._id === form.creativeId);
    const selectedThumb =
        selectedCreative?.assets?.find((a) => a.device === 'desktop')?.imageUrl ||
        selectedCreative?.assets?.[0]?.imageUrl ||
        '';

    const togglePlacement = (key: string) => {
        setForm((prev) => ({
            ...prev,
            placementKeys: prev.placementKeys.includes(key)
                ? prev.placementKeys.filter((k) => k !== key)
                : [...prev.placementKeys, key],
        }));
    };

    const getRuleValue = (field: string): string => {
        const clause = form.rules.and.find((r) => field in r);
        if (!clause) return '';
        const v = clause[field];
        return typeof v === 'boolean' ? String(v) : String(v ?? '');
    };

    const setRuleValue = (field: string, value: string) => {
        setForm((prev) => {
            const rest = prev.rules.and.filter((r) => !(field in r));
            const next = value === '' ? rest : [...rest, { [field]: field === 'loggedIn' ? value === 'true' : value }];
            return { ...prev, rules: { and: next } };
        });
    };

    const setFrequencyCap = (key: keyof NonNullable<BannerForm['frequencyCap']>, value: string) => {
        setForm((prev) => {
            const cap = { ...prev.frequencyCap };
            if (value === '' || Number(value) <= 0) delete cap[key];
            else cap[key] = Number(value);
            return { ...prev, frequencyCap: cap };
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            ...form,
            title: form.title.trim(),
            description: form.description?.trim() || '',
            startAt: form.startAt ? new Date(form.startAt).toISOString() : null,
            endAt: form.endAt ? new Date(`${form.endAt}T23:59:59`).toISOString() : null,
        });
    };

    const disabled = saving || !form.title.trim() || !form.creativeId || form.placementKeys.length === 0;

    return (
        <form onSubmit={handleSubmit}>
            <h3 className={parentStyles.formSectionTitle}>هویت بنر</h3>
            <div className={hrStyles.formRow}>
                <div className={parentStyles.field}>
                    <label>عنوان داخلی *</label>
                    <input
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        placeholder="مثلاً حراج تابستان — هیرو چت"
                        required
                    />
                    <p className={hrStyles.fieldHint}>
                        فقط در پنل دیده می‌شود تا کمپین را از بقیه جدا کنید؛ روی تصویر سایت نوشته نمی‌شود.
                    </p>
                </div>
                <div className={parentStyles.field}>
                    <label>وضعیت</label>
                    <select
                        value={form.status}
                        onChange={(e) => setForm({ ...form, status: e.target.value as BannerStatusType })}
                    >
                        {Object.entries(BANNER_STATUS_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>
                                {v}
                            </option>
                        ))}
                    </select>
                    <p className={hrStyles.fieldHint}>
                        فقط وضعیت «فعال» در صفحات hosheton_studio نمایش داده می‌شود. پیش‌نویس را برای آماده‌سازی نگه دارید.
                    </p>
                </div>
            </div>
            <div className={parentStyles.field}>
                <label>توضیح داخلی (اختیاری)</label>
                <textarea
                    value={form.description || ''}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={2}
                    placeholder="مثلاً نوار زیر چت‌باکس — نسخه موبایل جدا دارد"
                />
                <p className={hrStyles.fieldHint}>یادداشت برای تیم مارکتینگ؛ در فهرست بنرها زیر عنوان نشان داده می‌شود.</p>
            </div>

            <h3 className={parentStyles.formSectionTitle} style={{ marginTop: '0.5rem' }}>
                اتصال خلاقیت و جایگاه
            </h3>
            <div className={parentStyles.field}>
                <label>خلاقیت *</label>
                <select
                    value={form.creativeId}
                    onChange={(e) => setForm({ ...form, creativeId: e.target.value })}
                    required
                >
                    <option value="">— انتخاب کنید —</option>
                    {activeCreatives.map((c) => (
                        <option key={c._id} value={c._id}>
                            {c.title}
                        </option>
                    ))}
                </select>
                {creatives.length === 0 ? (
                    <p className={hrStyles.fieldHint}>
                        هنوز خلاقیتی نیست. اول از{' '}
                        <Link href="/marketing/banners/creatives/new">افزودن خلاقیت</Link> فایل بنر را بسازید.
                    </p>
                ) : activeCreatives.length === 0 ? (
                    <p className={hrStyles.fieldHint}>
                        همه خلاقیت‌ها غیرفعال‌اند. یکی را در{' '}
                        <Link href="/marketing/banners/creatives">کتابخانه خلاقیت‌ها</Link> فعال کنید.
                    </p>
                ) : (
                    <p className={hrStyles.fieldHint}>
                        فقط خلاقیت‌های فعال در فهرست هستند. یک خلاقیت را می‌توانید به چند بنر وصل کنید.
                    </p>
                )}
                {selectedCreative ? (
                    <div className={styles.creativePreview}>
                        {selectedThumb ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={selectedThumb} alt="" className={styles.bannerThumb} />
                        ) : (
                            <div className={styles.thumbFallback}>—</div>
                        )}
                        <div className={styles.creativePreviewInfo}>
                            <strong>{selectedCreative.title}</strong>
                            <span>
                                {selectedCreative.ctaText || 'بدون متن دکمه'}
                                {selectedCreative.assets?.length
                                    ? ` — ${selectedCreative.assets.length} نسخه تصویر`
                                    : ''}
                            </span>
                        </div>
                    </div>
                ) : null}
            </div>

            <div className={parentStyles.field}>
                <label>جایگاه‌ها * (می‌توانید چندتا انتخاب کنید)</label>
                {placements.length === 0 ? (
                    <p className={hrStyles.fieldHint}>
                        جایگاهی ثبت نشده. اول از <Link href="/marketing/banners/placements/new">جایگاه جدید</Link>{' '}
                        یک لوکیشن با key استودیو بسازید.
                    </p>
                ) : (
                    <div className={styles.placementGrid}>
                        {placements.map((p) => {
                            const checked = form.placementKeys.includes(p.key);
                            return (
                                <label
                                    key={p.key}
                                    className={`${styles.placementOption} ${checked ? styles.selected : ''}`}
                                >
                                    <input type="checkbox" checked={checked} onChange={() => togglePlacement(p.key)} />
                                    <span className={styles.placementOptionBody}>
                                        <span className={styles.placementOptionName}>{p.name}</span>
                                        <span className={styles.placementOptionMeta}>
                                            <span className={styles.keyBadge}>{p.key}</span>
                                            {p.allowedWidth > 0
                                                ? `  ${p.allowedWidth}×${p.allowedHeight}${p.aspectRatio ? ` · ${p.aspectRatio}` : ''}`
                                                : ''}
                                        </span>
                                    </span>
                                </label>
                            );
                        })}
                    </div>
                )}
                <p className={hrStyles.fieldHint}>
                    هر جایگاه انتخاب‌شده همان خلاقیت را در آن محل نشان می‌دهد. برای دو تصویر متفاوت، دو بنر جدا بسازید.
                </p>
            </div>

            <h3 className={parentStyles.formSectionTitle} style={{ marginTop: '0.5rem' }}>
                زمان‌بندی نمایش
            </h3>
            <div className={hrStyles.formRow}>
                <div className={parentStyles.field}>
                    <label>شروع (اختیاری)</label>
                    <input
                        type="date"
                        value={form.startAt || ''}
                        onChange={(e) => setForm({ ...form, startAt: e.target.value || null })}
                    />
                    <p className={hrStyles.fieldHint}>
                        {form.startAt ? `از ${isoToJalaliString(form.startAt)}` : 'بدون تاریخ شروع — از همین الان'}
                    </p>
                </div>
                <div className={parentStyles.field}>
                    <label>پایان (اختیاری)</label>
                    <input
                        type="date"
                        value={form.endAt || ''}
                        onChange={(e) => setForm({ ...form, endAt: e.target.value || null })}
                    />
                    <p className={hrStyles.fieldHint}>
                        {form.endAt ? `تا ${isoToJalaliString(form.endAt)}` : 'بدون تاریخ پایان — تا وقتی خودتان متوقف کنید'}
                    </p>
                </div>
            </div>
            <div className={hrStyles.formRow}>
                <div className={parentStyles.field}>
                    <label>ساعت شروع روزانه (۰ تا ۲۳)</label>
                    <input
                        type="number"
                        min={0}
                        max={23}
                        value={form.dailyStartHour}
                        onChange={(e) => setForm({ ...form, dailyStartHour: Number(e.target.value) })}
                    />
                    <p className={hrStyles.fieldHint}>۰ یعنی از نیمه‌شب. برای نمایش تمام‌روز همین ۰ را نگه دارید.</p>
                </div>
                <div className={parentStyles.field}>
                    <label>ساعت پایان روزانه (۱ تا ۲۴)</label>
                    <input
                        type="number"
                        min={1}
                        max={24}
                        value={form.dailyEndHour}
                        onChange={(e) => setForm({ ...form, dailyEndHour: Number(e.target.value) })}
                    />
                    <p className={hrStyles.fieldHint}>۲۴ یعنی تا پایان روز. مثلاً ۹ تا ۱۸ فقط ساعات اداری.</p>
                </div>
            </div>

            <h3 className={parentStyles.formSectionTitle} style={{ marginTop: '0.5rem' }}>
                اولویت و چرخش
            </h3>
            <div className={hrStyles.formRow}>
                <div className={parentStyles.field}>
                    <label>اولویت (۱ تا ۱۰۰)</label>
                    <input
                        type="number"
                        min={1}
                        max={100}
                        value={form.priority}
                        onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
                    />
                    <p className={hrStyles.fieldHint}>
                        اگر چند بنر فعال روی یک جایگاه باشند، عدد بالاتر برنده است. کمپین اصلی را مثلاً ۸۰ بگذارید.
                    </p>
                </div>
                <div className={parentStyles.field}>
                    <label>وزن چرخش (۰ تا ۱۰۰)</label>
                    <input
                        type="number"
                        min={0}
                        max={100}
                        value={form.weight}
                        onChange={(e) => setForm({ ...form, weight: Number(e.target.value) })}
                    />
                    <p className={hrStyles.fieldHint}>
                        بین بنرهای هم‌اولویت، احتمال نمایش به نسبت وزن است. ۷۰ و ۳۰ یعنی تقریباً ۷ به ۳.
                    </p>
                </div>
            </div>

            <h3 className={parentStyles.formSectionTitle} style={{ marginTop: '0.5rem' }}>
                سقف نمایش (اختیاری)
            </h3>
            <p className={hrStyles.fieldHintBlock} style={{ marginBottom: '0.75rem' }}>
                حداکثر دفعاتی که یک کاربر این بنر را می‌بیند. خالی یعنی بدون محدودیت. برای جلوگیری از خستگی مخاطب،
                مثلاً ۳ بار در روز مناسب است.
            </p>
            <div className={styles.freqGrid}>
                <div className={parentStyles.field} style={{ marginBottom: 0 }}>
                    <label>در هر جلسه</label>
                    <input
                        type="number"
                        min={0}
                        value={form.frequencyCap?.perSession ?? ''}
                        onChange={(e) => setFrequencyCap('perSession', e.target.value)}
                    />
                </div>
                <div className={parentStyles.field} style={{ marginBottom: 0 }}>
                    <label>در روز</label>
                    <input
                        type="number"
                        min={0}
                        value={form.frequencyCap?.perDay ?? ''}
                        onChange={(e) => setFrequencyCap('perDay', e.target.value)}
                    />
                </div>
                <div className={parentStyles.field} style={{ marginBottom: 0 }}>
                    <label>در هفته</label>
                    <input
                        type="number"
                        min={0}
                        value={form.frequencyCap?.perWeek ?? ''}
                        onChange={(e) => setFrequencyCap('perWeek', e.target.value)}
                    />
                </div>
                <div className={parentStyles.field} style={{ marginBottom: 0 }}>
                    <label>مجموع برای هر کاربر</label>
                    <input
                        type="number"
                        min={0}
                        value={form.frequencyCap?.perUserLifetime ?? ''}
                        onChange={(e) => setFrequencyCap('perUserLifetime', e.target.value)}
                    />
                </div>
            </div>

            <h3 className={parentStyles.formSectionTitle} style={{ marginTop: '1.5rem' }}>
                قوانین هدف‌گیری (اختیاری)
            </h3>
            <p className={hrStyles.fieldHintBlock} style={{ marginBottom: '0.75rem' }}>
                اگر شرطی انتخاب کنید، همه شرط‌ها باید برقرار باشند تا بنر نشان داده شود. خالی یعنی برای همه.
            </p>
            <div className={styles.ruleGrid}>
                {RULE_FIELDS.map((field) => (
                    <div key={field.key} className={parentStyles.field} style={{ marginBottom: 0 }}>
                        <label>{field.label}</label>
                        <select value={getRuleValue(field.key)} onChange={(e) => setRuleValue(field.key, e.target.value)}>
                            <option value="">همه</option>
                            {field.options.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                        <p className={hrStyles.fieldHint}>{field.hint}</p>
                    </div>
                ))}
            </div>

            <div className={hrStyles.formNoteBox}>
                <strong>بعد از ذخیره:</strong> اگر وضعیت «فعال» باشد و تاریخ/ساعت برقرار باشد، Renderer استودیو همین
                بنر را برای جایگاه‌های انتخاب‌شده برمی‌گرداند. آمار نمایش و کلیک در بخش آمار جمع می‌شود.
            </div>

            <div className={parentStyles.formActions}>
                <button type="submit" className={parentStyles.primaryBtn} disabled={disabled}>
                    {saving ? 'در حال ذخیره...' : submitLabel}
                </button>
                {onCancel ? (
                    <button type="button" className={parentStyles.secondaryBtn} onClick={onCancel}>
                        انصراف
                    </button>
                ) : null}
            </div>
        </form>
    );
}

/** تبدیل رکورد بنر به state فرم */
export function bannerToForm(banner: Banner): BannerForm {
    return {
        title: banner.title,
        description: banner.description || '',
        status: banner.status,
        creativeId: banner.creativeId,
        placementKeys: banner.placementKeys || [],
        priority: banner.priority,
        weight: banner.weight,
        startAt: banner.startAt ? banner.startAt.slice(0, 10) : null,
        endAt: banner.endAt ? banner.endAt.slice(0, 10) : null,
        dailyStartHour: banner.dailyStartHour ?? 0,
        dailyEndHour: banner.dailyEndHour ?? 24,
        frequencyCap: banner.frequencyCap || {},
        rules: banner.rules && Array.isArray(banner.rules.and) ? banner.rules : { and: [] },
    };
}
