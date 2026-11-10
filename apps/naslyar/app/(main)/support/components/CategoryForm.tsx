'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import parentStyles from '../../marketing/Marketing.module.scss';
import styles from '../Support.module.scss';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import {
    SupportCategory,
    createCategory,
    updateCategory,
} from '../lib/support-api';

const COLOR_PRESETS = ['#7b58fd', '#10b981', '#f59e0b', '#ef4444', '#2563eb', '#0d9488', '#db2777', '#64748b'];

type Props = {
    /** حالت ویرایش — دسته‌بندی موجود برای پیش‌پر کردن فرم */
    category?: SupportCategory | null;
};

/**
 * فرم ایجاد/ویرایش دسته‌بندی تیکت — صفحه مستقل، هم‌سبک فرم «افزودن نیروی انسانی»
 */
export default function CategoryForm({ category = null }: Props) {
    const router = useRouter();
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const isEdit = Boolean(category);

    const [title, setTitle] = useState('');
    const [color, setColor] = useState('#7b58fd');
    const [description, setDescription] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (category) {
            setTitle(category.title || '');
            setColor(category.color || '#7b58fd');
            setDescription(category.description || '');
        }
    }, [category]);

    const save = async () => {
        if (!title.trim()) {
            ErrorToaster(new Error('عنوان دسته‌بندی الزامی است.'));
            return;
        }
        try {
            setSaving(true);
            if (isEdit && category) {
                await updateCategory(baseUrl, token, category._id, {
                    title: title.trim(),
                    color,
                    description: description.trim(),
                });
                SuccessToaster('دسته‌بندی با موفقیت ویرایش شد.');
            } else {
                await createCategory(baseUrl, token, {
                    title: title.trim(),
                    color,
                    description: description.trim(),
                });
                SuccessToaster('دسته‌بندی جدید ایجاد شد.');
            }
            router.push('/support/categories');
        } catch (error) {
            ErrorToaster(error);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={`${parentStyles.container} ${parentStyles.rtl}`}>
            <header className={parentStyles.header}>
                <div>
                    <h1 className={parentStyles.mainTitle}>
                        {isEdit ? `ویرایش دسته‌بندی: ${category?.title}` : 'دسته‌بندی جدید'}
                    </h1>
                    <p className={parentStyles.subtitle}>
                        {isEdit
                            ? 'عنوان، رنگ نشان یا توضیحات دسته‌بندی را اصلاح کنید.'
                            : 'یک دسته موضوعی برای سازمان‌دهی تیکت‌ها بسازید — مثل «تسویه حساب» یا «مسائل فنی».'}
                    </p>
                </div>
                <Link href="/support/categories" className={styles.secondaryBtn}>
                    بازگشت به فهرست →
                </Link>
            </header>

            <div className={parentStyles.formCard}>
                <h3 className={parentStyles.formSectionTitle}>اطلاعات دسته‌بندی</h3>

                <div className={parentStyles.field}>
                    <label>عنوان دسته‌بندی *</label>
                    <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="مثلاً: تسویه حساب"
                    />
                    <p className={parentStyles.fieldHint}>
                        عنوان کوتاه و مشخص که در جدول تیکت‌ها، فیلترها و فرم ویرایش تیکت نمایش داده می‌شود.
                        عنوان‌های تکراری پذیرفته نمی‌شوند.
                    </p>
                </div>

                <div className={parentStyles.field}>
                    <label>رنگ نشان</label>
                    <div className={styles.colorFieldRow}>
                        <input
                            type="color"
                            value={color}
                            onChange={(e) => setColor(e.target.value)}
                            className={styles.colorPickerInput}
                            aria-label="انتخاب رنگ"
                        />
                        <div className={styles.colorPresets}>
                            {COLOR_PRESETS.map((preset) => (
                                <button
                                    key={preset}
                                    type="button"
                                    className={`${styles.colorPreset} ${color.toLowerCase() === preset ? styles.colorPresetActive : ''}`}
                                    style={{ backgroundColor: preset }}
                                    onClick={() => setColor(preset)}
                                    aria-label={`رنگ ${preset}`}
                                    title={`رنگ ${preset}`}
                                />
                            ))}
                        </div>
                        <span className={styles.colorPreview} style={{ backgroundColor: color }} />
                    </div>
                    <p className={parentStyles.fieldHint}>
                        رنگ نشان کنار عنوان دسته‌بندی در جدول تیکت‌ها است؛ رنگ‌های متمایز برای دسته‌های مختلف
                        تشخیص را سریع‌تر می‌کند.
                    </p>
                </div>

                <div className={parentStyles.field}>
                    <label>توضیحات (اختیاری)</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="این دسته برای چه موضوعی است؟ مثلاً: موضوعات مالی، تسویه و پرداخت‌ها"
                    />
                    <p className={parentStyles.fieldHint}>
                        یادداشت داخلی برای همکاران پشتیبانی درباره محدوده‌ی این دسته.
                    </p>
                </div>

                <div className={styles.formNoteBox}>
                    <strong>بعد از ثبت:</strong> این دسته در ستون «دسته‌بندی» جدول تیکت‌ها، فیلترهای پیشرفته و
                    فرم ویرایش هر تیکت (منوی ⋯) قابل استفاده است. عنوان و رنگ بعداً از «ویرایش» قابل تغییر است.
                </div>

                <div className={styles.formActionsRow}>
                    <button
                        type="button"
                        className={parentStyles.primaryBtn}
                        disabled={saving || !title.trim()}
                        onClick={() => void save()}
                    >
                        {saving ? 'در حال ذخیره...' : isEdit ? 'ذخیره تغییرات' : 'ایجاد دسته‌بندی'}
                    </button>
                    <Link href="/support/categories" className={styles.secondaryBtn}>
                        انصراف
                    </Link>
                </div>
            </div>
        </div>
    );
}
