'use client';

import React, { useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Field } from '@my-workspace/components';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import styles from '@/app/(main)/blog/Blog.module.scss';
import formStyles from '@/app/(main)/blog/components/BlogForm/BlogForm.module.scss';
import iconStyles from '../CategoryIconPreview.module.scss';
import {
    fieldToCoverImages,
    serializeCategoryMeta,
} from '../lib/category-meta';

export default function NewMarketplaceCategoryPage() {
    const router = useRouter();
    const { token } = useAuthStore();
    const { baseUrl } = useAppStore();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [form, setForm] = useState({ name: '', slug: '', description: '', coverImages: '', icon: '', iconUrl: '' });

    const handleSubmit = async () => {
        if (!token) return;
        try {
            setIsSubmitting(true);
            const description = serializeCategoryMeta({
                text: form.description.trim(),
                coverImages: fieldToCoverImages(form.coverImages),
                icon: form.icon.trim(),
                iconUrl: form.iconUrl.trim(),
            });
            const res = await axios.post(
                `${baseUrl}/api/categories/panel`,
                { name: form.name, slug: form.slug, description, section: 'marketplace' },
                { headers: { authorization: `Bearer ${token}` } },
            );
            if (res.data.statusCode === 200) {
                SuccessToaster({ message: 'دسته‌بندی با موفقیت ایجاد شد' });
                router.push('/projects/marketplace/categories');
            }
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={`${styles.container} ${styles.rtl}`}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.mainTitle}>دسته‌بندی جدید</h1>
                    <p className={styles.subtitle}>دسته‌ای برای فیلتر و کارت‌های افقی صفحه ایده‌ها بسازید.</p>
                </div>
                <Link href="/projects/marketplace/categories" className={styles.secondaryBtn}>بازگشت</Link>
            </header>

            <div className={formStyles.section}>
                <div className={formStyles.field}>
                    <label>
                        نام
                        <Field
                            value={form.name}
                            type="text"
                            className="form-control form-control-sm"
                            onChange={(e) => setForm((p) => ({ ...p, name: e }))}
                        />
                    </label>
                </div>
                <div className={formStyles.field}>
                    <label>
                        شناسه (slug)
                        <Field
                            value={form.slug}
                            type="text"
                            className="form-control form-control-sm"
                            onChange={(e) => setForm((p) => ({
                                ...p,
                                slug: e.replace(/[^a-zA-Z0-9-_]/g, '').replace(/\s+/g, '-').toLowerCase(),
                            }))}
                        />
                    </label>
                </div>
                <div className={formStyles.field}>
                    <label>
                        توضیحات کوتاه
                        <Field
                            value={form.description}
                            type="text"
                            className="form-control form-control-sm"
                            onChange={(e) => setForm((p) => ({ ...p, description: e }))}
                        />
                    </label>
                </div>
                <div className={formStyles.field}>
                    <label>
                        تصاویر کاور (هر URL در یک خط)
                        <Field
                            value={form.coverImages}
                            type="text"
                            className="form-control form-control-sm"
                            onChange={(e) => setForm((p) => ({ ...p, coverImages: e }))}
                        />
                    </label>
                </div>
                <div className={formStyles.field}>
                    <label>
                        آیکون SVG (paste)
                        <textarea
                            rows={5}
                            className="form-control form-control-sm"
                            dir="ltr"
                            value={form.icon}
                            placeholder="<svg>...</svg>"
                            onChange={(e) => setForm((p) => ({ ...p, icon: e.target.value }))}
                        />
                        <small style={{ color: '#64748b', fontSize: 12 }}>در صفحه ایده‌ها فقط آیکون و نام دسته نمایش داده می‌شود.</small>
                    </label>
                </div>
                <div className={formStyles.field}>
                    <label>
                        آدرس آیکون (URL)
                        <Field
                            value={form.iconUrl}
                            type="text"
                            className="form-control form-control-sm"
                            dir="ltr"
                            placeholder="https://cdn.example.com/icons/cat.svg"
                            onChange={(e) => setForm((p) => ({ ...p, iconUrl: e }))}
                        />
                    </label>
                </div>
                {(form.icon || form.iconUrl) && (
                    <div className={formStyles.field}>
                        <label>پیش‌نمایش آیکون</label>
                        <div className={iconStyles.preview}>
                            {form.iconUrl ? (
                                <img src={form.iconUrl} alt="category icon" className={iconStyles.previewImg} />
                            ) : (
                                <div dangerouslySetInnerHTML={{ __html: form.icon }} />
                            )}
                        </div>
                    </div>
                )}
                <button type="button" className={formStyles.submit} disabled={isSubmitting} onClick={handleSubmit}>
                    ایجاد دسته‌بندی
                </button>
            </div>
        </div>
    );
}
