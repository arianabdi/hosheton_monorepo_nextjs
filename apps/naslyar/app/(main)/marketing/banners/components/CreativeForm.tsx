'use client';

import { useState } from 'react';
import { LuImagePlus, LuUpload } from 'react-icons/lu';
import FilePickerModal from '@/app/(main)/files/components/FilePickerModal';
import {
    CREATIVE_DEVICE_LABELS,
    CTA_OPEN_MODE_LABELS,
    EMPTY_CREATIVE_FORM,
    type BannerCreativeForm,
    type CreativeAsset,
    type CreativeDeviceType,
    type CtaOpenModeType,
} from '../banners.types';
import parentStyles from '../../Marketing.module.scss';
import hrStyles from '../../../management/hr/Hr.module.scss';
import styles from '../Banners.module.scss';

const DEVICE_ORDER: CreativeDeviceType[] = ['desktop', 'tablet', 'mobile'];

const DEVICE_HINTS: Record<CreativeDeviceType, string> = {
    desktop: 'نسخه عریض مانیتور. اگر فقط همین را بگذارید، تبلت و موبایل هم از آن استفاده می‌کنند.',
    tablet: 'نسخه متوسط. اختیاری است؛ اگر نباشد دسکتاپ جایگزین می‌شود.',
    mobile: 'نسخه باریک گوشی. برای نوارهای افقی بهتر است ارتفاع بیشتری نسبت به دسکتاپ داشته باشد.',
};

export interface CreativeFormProps {
    initial?: BannerCreativeForm;
    editMode?: boolean;
    saving?: boolean;
    onSubmit: (form: BannerCreativeForm) => void;
    onCancel?: () => void;
    submitLabel?: string;
}

function measureImage(
    imageUrl: string,
    file: { size?: number; mimetype?: string },
    device: CreativeDeviceType,
    onReady: (asset: CreativeAsset) => void,
) {
    const img = new Image();
    img.onload = () => {
        onReady({
            device,
            imageUrl,
            width: img.naturalWidth,
            height: img.naturalHeight,
            fileSize: file.size || 0,
            mime: file.mimetype || '',
        });
    };
    img.onerror = () => {
        onReady({
            device,
            imageUrl,
            width: 0,
            height: 0,
            fileSize: file.size || 0,
            mime: file.mimetype || '',
        });
    };
    img.src = imageUrl;
}

/**
 * فرم ایجاد/ویرایش خلاقیت — بخش‌بندی‌شده: هویت، فایل دستگاه‌ها، فراخوان اقدام.
 */
export default function CreativeForm({
    initial,
    saving = false,
    onSubmit,
    onCancel,
    submitLabel = 'ذخیره خلاقیت',
}: CreativeFormProps) {
    const [form, setForm] = useState<BannerCreativeForm>(initial || EMPTY_CREATIVE_FORM);
    const [tagsInput, setTagsInput] = useState((initial?.tags || []).join(', '));
    const [pickingDevice, setPickingDevice] = useState<CreativeDeviceType | null>(null);

    const handleFilePicked = (files: { path?: string; size?: number; mimetype?: string }[]) => {
        if (!pickingDevice || files.length === 0) return;
        const file = files[0];
        const imageUrl = file.path || '';
        measureImage(imageUrl, file, pickingDevice, (asset) => {
            setForm((prev) => ({
                ...prev,
                assets: [...prev.assets.filter((a) => a.device !== pickingDevice), asset],
            }));
        });
    };

    const removeAsset = (device: CreativeDeviceType) => {
        setForm((prev) => ({ ...prev, assets: prev.assets.filter((a) => a.device !== device) }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            ...form,
            title: form.title.trim(),
            tags: tagsInput
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean),
        });
    };

    return (
        <form onSubmit={handleSubmit}>
            <h3 className={parentStyles.formSectionTitle}>هویت خلاقیت</h3>
            <div className={hrStyles.formRow}>
                <div className={parentStyles.field}>
                    <label>عنوان داخلی *</label>
                    <input
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        placeholder="مثلاً بنر حراج تابستان"
                        required
                    />
                    <p className={hrStyles.fieldHint}>
                        نامی که در فهرست و هنگام اتصال به بنر می‌بینید؛ روی تصویر سایت نمایش داده نمی‌شود.
                    </p>
                </div>
                <div className={parentStyles.field}>
                    <label>زبان محتوا</label>
                    <select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}>
                        <option value="fa">فارسی</option>
                        <option value="en">انگلیسی</option>
                        <option value="ar">عربی</option>
                    </select>
                    <p className={hrStyles.fieldHint}>
                        زبان متن روی تصویر و دکمه. در هدف‌گیری بنر می‌توانید همین زبان را محدود کنید.
                    </p>
                </div>
            </div>
            <div className={parentStyles.field}>
                <label>تگ‌ها (با کاما جدا کنید)</label>
                <input
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="تابستان, تخفیف, ارتقا"
                />
                <p className={hrStyles.fieldHint}>برای فیلتر کردن در فهرست؛ روی سایت دیده نمی‌شود.</p>
            </div>
            <label className={parentStyles.toggleLabel} style={{ marginBottom: '0.35rem' }}>
                <span>فعال</span>
                <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                />
            </label>
            <p className={hrStyles.fieldHint} style={{ marginBottom: '1.25rem' }}>
                خلاقیت غیرفعال در هیچ بنری نشان داده نمی‌شود — حتی اگر بنر متصل فعال باشد.
            </p>

            <h3 className={parentStyles.formSectionTitle}>فایل تصویر هر دستگاه *</h3>
            <p className={hrStyles.fieldHintBlock} style={{ marginBottom: '0.85rem' }}>
                نسبت پیشنهادی را از جزئیات جایگاه بردارید. حداقل یک دستگاه لازم است؛ ابعاد بعد از انتخاب از مدیریت
                فایل به‌صورت خودکار پر می‌شود.
            </p>
            <div className={styles.assetsBox}>
                {DEVICE_ORDER.map((device) => {
                    const asset = form.assets.find((a) => a.device === device);
                    return (
                        <div key={device} className={styles.assetRow}>
                            <strong style={{ fontSize: '0.8rem', minWidth: '60px' }}>
                                {CREATIVE_DEVICE_LABELS[device]}
                            </strong>
                            {asset?.imageUrl ? (
                                <>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={asset.imageUrl}
                                        alt={CREATIVE_DEVICE_LABELS[device]}
                                        className={styles.assetPreview}
                                    />
                                    <span className={styles.assetMeta}>
                                        {asset.width > 0 ? `${asset.width}×${asset.height}` : 'ابعاد نامشخص'}
                                        {asset.fileSize ? ` — ${Math.round(asset.fileSize / 1024)}KB` : ''}
                                    </span>
                                    <button
                                        type="button"
                                        className={styles.smallBtn}
                                        onClick={() => setPickingDevice(device)}
                                    >
                                        <LuUpload /> تغییر
                                    </button>
                                    <button
                                        type="button"
                                        className={parentStyles.deleteBtn}
                                        onClick={() => removeAsset(device)}
                                    >
                                        حذف
                                    </button>
                                </>
                            ) : (
                                <button
                                    type="button"
                                    className={parentStyles.secondaryBtn}
                                    onClick={() => setPickingDevice(device)}
                                >
                                    <LuImagePlus /> انتخاب از فایل‌ها
                                </button>
                            )}
                            <p className={styles.assetHint}>{DEVICE_HINTS[device]}</p>
                        </div>
                    );
                })}
            </div>

            <h3 className={parentStyles.formSectionTitle}>فراخوان اقدام (CTA)</h3>
            <div className={hrStyles.formRow}>
                <div className={parentStyles.field}>
                    <label>متن دکمه</label>
                    <input
                        value={form.ctaText}
                        onChange={(e) => setForm({ ...form, ctaText: e.target.value })}
                        placeholder="همین حالا بخر"
                    />
                    <p className={hrStyles.fieldHint}>
                        روی بعضی جایگاه‌ها (مثل کارت اکسپلور) به‌صورت دکمه روی تصویر دیده می‌شود. کوتاه نگه دارید.
                    </p>
                </div>
                <div className={parentStyles.field}>
                    <label>لینک مقصد</label>
                    <input
                        className={styles.ltrInput}
                        value={form.ctaUrl}
                        onChange={(e) => setForm({ ...form, ctaUrl: e.target.value })}
                        placeholder="https://studio.hosheton.com/pricing"
                        dir="ltr"
                    />
                    <p className={hrStyles.fieldHint}>آدرس صفحه بعد از کلیک. مسیر داخلی استودیو یا لینک خارجی.</p>
                </div>
            </div>
            <div className={hrStyles.formRow}>
                <div className={parentStyles.field}>
                    <label>حالت باز شدن</label>
                    <select
                        value={form.openMode}
                        onChange={(e) => setForm({ ...form, openMode: e.target.value as CtaOpenModeType })}
                    >
                        {Object.entries(CTA_OPEN_MODE_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>
                                {v}
                            </option>
                        ))}
                    </select>
                    <p className={hrStyles.fieldHint}>تب جدید برای لینک خارجی بهتر است تا کاربر از استودیو خارج نشود.</p>
                </div>
                <div className={parentStyles.field}>
                    <label>متن جایگزین (Alt)</label>
                    <input
                        value={form.alt}
                        onChange={(e) => setForm({ ...form, alt: e.target.value })}
                        placeholder="پیشنهاد ارتقای حساب حرفه‌ای"
                    />
                    <p className={hrStyles.fieldHint}>برای سئو و وقتی تصویر لود نشود خوانده می‌شود. موضوع بنر را بنویسید.</p>
                </div>
            </div>

            <div className={hrStyles.formNoteBox}>
                <strong>بعد از ذخیره:</strong> این خلاقیت در فهرست کتابخانه می‌ماند تا از{' '}
                بخش بنرها آن را به جایگاه وصل کنید. بدون بنر فعال، تصویر روی سایت دیده نمی‌شود.
            </div>

            <div className={parentStyles.formActions}>
                <button
                    type="submit"
                    className={parentStyles.primaryBtn}
                    disabled={saving || !form.title.trim() || form.assets.length === 0}
                >
                    {saving ? 'در حال ذخیره...' : submitLabel}
                </button>
                {onCancel ? (
                    <button type="button" className={parentStyles.secondaryBtn} onClick={onCancel}>
                        انصراف
                    </button>
                ) : null}
            </div>

            <FilePickerModal
                open={pickingDevice !== null}
                onClose={() => setPickingDevice(null)}
                onSelect={handleFilePicked}
                accept="images"
                title={`انتخاب تصویر بنر — ${pickingDevice ? CREATIVE_DEVICE_LABELS[pickingDevice] : ''}`}
                confirmLabel="انتخاب این تصویر"
            />
        </form>
    );
}

export function creativeToForm(creative: {
    title: string;
    alt?: string;
    ctaText?: string;
    ctaUrl?: string;
    openMode: BannerCreativeForm['openMode'];
    tags?: string[];
    language?: string;
    assets?: CreativeAsset[];
    isActive: boolean;
}): BannerCreativeForm {
    return {
        title: creative.title,
        alt: creative.alt || '',
        ctaText: creative.ctaText || '',
        ctaUrl: creative.ctaUrl || '',
        openMode: creative.openMode,
        tags: creative.tags || [],
        language: creative.language || 'fa',
        assets: creative.assets || [],
        isActive: creative.isActive,
    };
}
