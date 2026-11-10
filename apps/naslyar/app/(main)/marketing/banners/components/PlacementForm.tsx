'use client';

import { useState } from 'react';
import { LuLock, LuLockOpen } from 'react-icons/lu';
import {
    BANNER_PAGE_TYPE_LABELS,
    type BannerPageType,
    type BannerPlacementForm,
} from '../banners.types';
import parentStyles from '../../Marketing.module.scss';
import hrStyles from '../../../management/hr/Hr.module.scss';
import styles from '../Banners.module.scss';

const FORMAT_OPTIONS = ['jpg', 'png', 'webp', 'gif', 'mp4'];

/** «2.74:1» یا «16:9» یا عدد → نسبت عددی عرض/ارتفاع؛ نامعتبر = ۰ */
export function parseRatio(value: string): number {
    const t = (value || '').trim();
    if (!t) return 0;
    const m = /^([\d.]+)\s*:\s*([\d.]+)$/.exec(t);
    if (m && Number(m[2]) > 0) return Number(m[1]) / Number(m[2]);
    const n = Number(t);
    return Number.isFinite(n) && n > 0 ? n : 0;
}

export function formatRatio(ratio: number): string {
    return `${Math.round(ratio * 100) / 100}:1`;
}

export interface PlacementFormProps {
    initial: BannerPlacementForm;
    editMode?: boolean;
    saving?: boolean;
    onSubmit: (form: BannerPlacementForm) => void;
    onCancel?: () => void;
    submitLabel?: string;
}

/**
 * فرم ایجاد/ویرایش جایگاه — بخش‌بندی هویت، ابعاد و نمایش.
 */
export default function PlacementForm({
    initial,
    editMode = false,
    saving = false,
    onSubmit,
    onCancel,
    submitLabel = 'ذخیره جایگاه',
}: PlacementFormProps) {
    const [form, setForm] = useState<BannerPlacementForm>(initial);
    const [aspectLocked, setAspectLocked] = useState(false);
    const [ratio, setRatio] = useState(0);

    const toggleLock = () => {
        const next = !aspectLocked;
        setAspectLocked(next);
        if (next) {
            let r = parseRatio(form.aspectRatio || '');
            if (!(r > 0) && form.allowedHeight > 0) r = form.allowedWidth / form.allowedHeight;
            setRatio(r);
            if (r > 0) setForm((f) => ({ ...f, aspectRatio: formatRatio(r) }));
        }
    };

    const applyWidth = (raw: number) => {
        const width = Math.max(0, raw);
        setForm((f) => {
            if (!aspectLocked || !(ratio > 0)) return { ...f, allowedWidth: width };
            const height = Math.max(1, Math.round(width / ratio));
            return { ...f, allowedWidth: width, allowedHeight: height, aspectRatio: formatRatio(width / height) };
        });
    };

    const applyHeight = (raw: number) => {
        const height = Math.max(0, raw);
        setForm((f) => {
            if (!aspectLocked || !(ratio > 0)) return { ...f, allowedHeight: height };
            const width = Math.max(1, Math.round(height * ratio));
            return { ...f, allowedWidth: width, allowedHeight: height, aspectRatio: formatRatio(width / height) };
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            ...form,
            key: form.key.trim(),
            name: form.name.trim(),
        });
    };

    const disabled = saving || !form.key.trim() || !form.name.trim();

    return (
        <form onSubmit={handleSubmit}>
            <h3 className={parentStyles.formSectionTitle}>شناسه و نام</h3>
            <div className={hrStyles.formRow}>
                <div className={parentStyles.field}>
                    <label>Key (شناسه یکتا) *</label>
                    <input
                        className={styles.ltrInput}
                        value={form.key}
                        onChange={(e) => setForm({ ...form, key: e.target.value })}
                        placeholder="studio.sidebar.square"
                        required
                        disabled={editMode}
                        dir="ltr"
                    />
                    <p className={hrStyles.fieldHint}>
                        {editMode
                            ? 'پس از ساخت قابل تغییر نیست چون در کد استودیو قفل شده است.'
                            : 'باید دقیقاً با key در کد hosheton_studio یکی باشد. نقطه و حروف کوچک، مثل studio.chat.input.below'}
                    </p>
                </div>
                <div className={parentStyles.field}>
                    <label>نام نمایشی *</label>
                    <input
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="مربع پایین سایدبار"
                        required
                    />
                    <p className={hrStyles.fieldHint}>نام فارسی که در فهرست و هنگام انتخاب جایگاه در فرم بنر دیده می‌شود.</p>
                </div>
            </div>
            <div className={parentStyles.field}>
                <label>توضیح برای مارکتر</label>
                <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={2}
                    placeholder="باکس مربعی انتهای منوی کناری — زیر آیتم‌ها و بالای پروفایل"
                />
                <p className={hrStyles.fieldHint}>کمک می‌کند تیم بداند این جایگاه روی کدام صفحه و کجای چیدمان است.</p>
            </div>
            <div className={parentStyles.field}>
                <label>نوع صفحه</label>
                <select
                    value={form.pageType}
                    onChange={(e) => setForm({ ...form, pageType: e.target.value as BannerPageType })}
                >
                    {Object.entries(BANNER_PAGE_TYPE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                            {v}
                        </option>
                    ))}
                </select>
                <p className={hrStyles.fieldHint}>
                    برای دسته‌بندی در پنل است. صفحات استودیو معمولاً «سایر» یا «صفحه اصلی» هستند.
                </p>
            </div>

            <h3 className={parentStyles.formSectionTitle} style={{ marginTop: '0.5rem' }}>
                ابعاد مجاز
            </h3>
            <p className={hrStyles.fieldHintBlock} style={{ marginBottom: '0.75rem' }}>
                این اعداد راهنمای طراح‌اند؛ نمایش نهایی با عرض ظرف صفحه کش می‌آید. با قفل نسبت، تغییر عرض ارتفاع را
                خودکار هم‌نسبت می‌کند.
            </p>
            <div className={styles.lockToggle}>
                <button
                    type="button"
                    className={`${styles.lockBtn} ${aspectLocked ? styles.locked : ''}`}
                    onClick={toggleLock}
                    title={aspectLocked ? 'نسبت قفل است — تغییر عرض، ارتفاع را خودکار تنظیم می‌کند' : 'نسبت آزاد است'}
                >
                    {aspectLocked ? <LuLock /> : <LuLockOpen />}
                    {aspectLocked ? 'نسبت قفل شده' : 'قفل کردن نسبت'}
                </button>
                {aspectLocked && !(ratio > 0) ? (
                    <span className={styles.lockHint}>نسبت معتبر نیست — مثلاً 8:1 یا 16:9 وارد کنید</span>
                ) : null}
            </div>
            <div className={hrStyles.formRow}>
                <div className={parentStyles.field}>
                    <label>عرض مجاز (px)</label>
                    <input
                        type="number"
                        min={0}
                        value={form.allowedWidth}
                        onChange={(e) => applyWidth(Number(e.target.value))}
                    />
                    <p className={hrStyles.fieldHint}>عرض پیشنهادی فایل. برای سایدبار معمولاً ۲۴۰، برای نوار چت ۹۶۰.</p>
                </div>
                <div className={parentStyles.field}>
                    <label>ارتفاع مجاز (px){aspectLocked && ratio > 0 ? ' — خودکار' : ''}</label>
                    <input
                        type="number"
                        min={0}
                        value={form.allowedHeight}
                        onChange={(e) => applyHeight(Number(e.target.value))}
                        readOnly={aspectLocked && ratio > 0}
                    />
                    <p className={hrStyles.fieldHint}>
                        {aspectLocked && ratio > 0
                            ? 'چون نسبت قفل است، با تغییر عرض خودش عوض می‌شود.'
                            : 'ارتفاع پیشنهادی فایل در همان نسبت جایگاه.'}
                    </p>
                </div>
            </div>
            <div className={parentStyles.field}>
                <label>نسبت تصویر</label>
                <input
                    className={styles.ltrInput}
                    value={form.aspectRatio}
                    onChange={(e) => {
                        const v = e.target.value;
                        setForm((f) => ({ ...f, aspectRatio: v }));
                        setRatio(parseRatio(v));
                    }}
                    placeholder="8:1"
                    dir="ltr"
                />
                <p className={hrStyles.fieldHint}>مثل 1:1 برای مربع سایدبار، 8:1 برای نوار زیر چت، 0.8:1 برای کارت اکسپلور.</p>
            </div>

            <h3 className={parentStyles.formSectionTitle} style={{ marginTop: '0.5rem' }}>
                نمایش و فرمت
            </h3>
            <div className={parentStyles.field}>
                <label>فرمت‌های مجاز</label>
                <div className={styles.tagRow} style={{ marginTop: 0 }}>
                    {FORMAT_OPTIONS.map((f) => {
                        const checked = form.formats.includes(f);
                        return (
                            <label key={f} className={`${styles.formatChip} ${checked ? styles.selected : ''}`}>
                                <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            formats: e.target.checked
                                                ? [...form.formats, f]
                                                : form.formats.filter((x) => x !== f),
                                        })
                                    }
                                />
                                {f}
                            </label>
                        );
                    })}
                </div>
                <p className={hrStyles.fieldHint}>طراح باید فایل را با یکی از این فرمت‌ها در خلاقیت آپلود کند. jpg و webp برای عکس کافی‌اند.</p>
            </div>
            <label className={parentStyles.toggleLabel} style={{ marginBottom: '0.35rem' }}>
                <span>چند بنر همزمان (carousel)</span>
                <input
                    type="checkbox"
                    checked={form.supportsMultiple}
                    onChange={(e) => setForm({ ...form, supportsMultiple: e.target.checked })}
                />
            </label>
            <p className={hrStyles.fieldHint} style={{ marginBottom: '1rem' }}>
                اگر خاموش باشد Renderer فقط یک بنر برنده برمی‌گرداند. جایگاه‌های فعلی استودیو همگی تکی هستند.
            </p>

            <div className={hrStyles.formNoteBox}>
                <strong>بعد از ذخیره:</strong> marکتر از بخش بنرها این جایگاه را انتخاب می‌کند. تا وقتی بنر فعال وصل
                نشود، در استودیو با «نمایش لوکیشن بنرها» فقط کادر خالی دیده می‌شود.
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
