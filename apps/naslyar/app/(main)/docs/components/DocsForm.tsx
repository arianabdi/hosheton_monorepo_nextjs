'use client';

import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { Field, LoadingState } from '@my-workspace/components';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import formStyles from '../../blog/components/BlogForm/BlogForm.module.scss';

interface CategoryOption {
    _id: string;
    name: string;
}

interface ParentOption {
    _id: string;
    title: string;
}

interface DocsFormState {
    title: string;
    slug: string;
    content: string;
    categoryId: string;
    parentId: string;
    status: string;
    order: number;
    isPopular: boolean;
    metaTitle: string;
    metaDescription: string;
}

interface DocsFormProps {
    docId?: string;
    onSaved?: () => void;
}

export default function DocsForm({ docId, onSaved }: DocsFormProps) {
    const router = useRouter();
    const isEditing = Boolean(docId);
    const { token } = useAuthStore();
    const { baseUrl } = useAppStore();

    const [isLoading, setIsLoading] = useState(isEditing);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [categories, setCategories] = useState<CategoryOption[]>([]);
    const [parentOptions, setParentOptions] = useState<ParentOption[]>([]);
    const [form, setForm] = useState<DocsFormState>({
        title: '',
        slug: '',
        content: '',
        categoryId: '',
        parentId: '',
        status: 'draft',
        order: 0,
        isPopular: false,
        metaTitle: '',
        metaDescription: '',
    });

    useEffect(() => {
        if (!token) return;
        axios
            .get(`${baseUrl}/api/categories/panel?section=docs`, {
                headers: { authorization: `Bearer ${token}` },
            })
            .then((res) => {
                if (res.data.statusCode === 200) {
                    setCategories(res.data.data.categories || []);
                }
            })
            .catch(ErrorToaster);
    }, [token, baseUrl]);

    useEffect(() => {
        if (!token || !form.categoryId) {
            setParentOptions([]);
            return;
        }

        axios
            .get(`${baseUrl}/api/docs/panel?categoryId=${form.categoryId}&limit=200&page=1`, {
                headers: { authorization: `Bearer ${token}` },
            })
            .then((res) => {
                if (res.data.statusCode === 200) {
                    const items: ParentOption[] = (res.data.data.items || []).filter(
                        (item: ParentOption) => item._id !== docId,
                    );
                    setParentOptions(items);
                }
            })
            .catch(ErrorToaster);
    }, [token, baseUrl, form.categoryId, docId]);

    useEffect(() => {
        if (!isEditing || !token) return;
        setIsLoading(true);
        axios
            .get(`${baseUrl}/api/docs/panel/${docId}`, {
                headers: { authorization: `Bearer ${token}` },
            })
            .then((res) => {
                if (res.data.statusCode === 200) {
                    const data = res.data.data;
                    setForm({
                        title: data.title || '',
                        slug: data.slug || '',
                        content: data.content || '',
                        categoryId: data.categoryId ? String(data.categoryId) : '',
                        parentId: data.parentId ? String(data.parentId) : '',
                        status: data.status || 'draft',
                        order: data.order ?? 0,
                        isPopular: data.isPopular ?? false,
                        metaTitle: data.metaTitle || '',
                        metaDescription: data.metaDescription || '',
                    });
                }
            })
            .catch(ErrorToaster)
            .finally(() => setIsLoading(false));
    }, [isEditing, docId, token, baseUrl]);

    const parentSelectOptions = useMemo(
        () => [
            { label: 'بدون والد (صفحه اصلی موضوع)', value: '' },
            ...parentOptions.map((item) => ({ label: item.title, value: item._id })),
        ],
        [parentOptions],
    );

    const handleSubmit = async () => {
        if (!token) return;
        try {
            setIsSubmitting(true);
            const payload = {
                ...form,
                order: Number(form.order) || 0,
                parentId: form.parentId || null,
            };

            const res = isEditing
                ? await axios.put(`${baseUrl}/api/docs/panel/${docId}`, payload, {
                    headers: { authorization: `Bearer ${token}` },
                })
                : await axios.post(`${baseUrl}/api/docs/panel`, payload, {
                    headers: { authorization: `Bearer ${token}` },
                });

            if (res.data.statusCode === 200) {
                SuccessToaster({ message: isEditing ? 'صفحه مستندات ذخیره شد' : 'صفحه مستندات ایجاد شد' });
                if (onSaved) {
                    onSaved();
                } else {
                    router.push('/docs');
                }
            }
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) return <LoadingState />;

    return (
        <div className={formStyles.section}>
            <div className={formStyles.field}>
                <label>
                    عنوان
                    <Field
                        value={form.title}
                        type="text"
                        className="form-control form-control-sm"
                        onChange={(value) => setForm((prev) => ({ ...prev, title: value }))}
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
                        onChange={(value) =>
                            setForm((prev) => ({
                                ...prev,
                                slug: value.replace(/[^a-zA-Z0-9-_]/g, '').replace(/\s+/g, '-').toLowerCase(),
                            }))
                        }
                    />
                </label>
            </div>

            <div className={formStyles.field}>
                <label>
                    دسته‌بندی
                    <Field
                        value={form.categoryId}
                        type="select"
                        className="form-control form-control-sm"
                        options={categories.map((category) => ({ label: category.name, value: category._id }))}
                        onChange={(value) => setForm((prev) => ({ ...prev, categoryId: value, parentId: '' }))}
                    />
                </label>
            </div>

            <div className={formStyles.field}>
                <label>
                    صفحه والد (زیرمستند)
                    <Field
                        value={form.parentId}
                        type="select"
                        className="form-control form-control-sm"
                        options={parentSelectOptions}
                        onChange={(value) => setForm((prev) => ({ ...prev, parentId: value }))}
                    />
                </label>
            </div>

            <div className={formStyles.field}>
                <label>
                    ترتیب نمایش
                    <Field
                        value={String(form.order)}
                        type="text"
                        className="form-control form-control-sm"
                        onChange={(value) => setForm((prev) => ({ ...prev, order: Number(value) || 0 }))}
                    />
                </label>
            </div>

            <div className={formStyles.field}>
                <label>
                    وضعیت
                    <Field
                        value={form.status}
                        type="select"
                        className="form-control form-control-sm"
                        options={[
                            { label: 'منتشر شده', value: 'published' },
                            { label: 'پیش‌نویس', value: 'draft' },
                        ]}
                        onChange={(value) => setForm((prev) => ({ ...prev, status: value }))}
                    />
                </label>
            </div>

            <div className={formStyles.field} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                    type="checkbox"
                    checked={form.isPopular}
                    onChange={(e) => setForm((prev) => ({ ...prev, isPopular: e.target.checked }))}
                />
                <span>نمایش در موضوعات پرکاربرد</span>
            </div>

            <div className={formStyles.field}>
                <label>
                    محتوا
                    <Field
                        value={form.content}
                        type="editor"
                        className="form-control form-control-sm"
                        onChange={(value) => setForm((prev) => ({ ...prev, content: value }))}
                    />
                </label>
            </div>

            <div className={formStyles.field}>
                <label>
                    عنوان سئو (title)
                    <Field
                        value={form.metaTitle}
                        type="text"
                        className="form-control form-control-sm"
                        onChange={(value: string) => setForm((prev) => ({ ...prev, metaTitle: value }))}
                    />
                    <span className={formStyles.hint}>خالی = «عنوان صفحه | آموزش موضوع». پیشنهاد: کمتر از ۶۰ کاراکتر.</span>
                </label>
            </div>

            <div className={formStyles.field}>
                <label>
                    توضیح سئو (description)
                    <Field
                        value={form.metaDescription}
                        type="text"
                        className="form-control form-control-sm"
                        onChange={(value: string) => setForm((prev) => ({ ...prev, metaDescription: value }))}
                    />
                    <span className={formStyles.hint}>۱۲۰ تا ۱۶۰ کاراکتر؛ خالی = خلاصهٔ خودکار ابتدای متن.</span>
                </label>
            </div>

            <button type="button" className={formStyles.submit} disabled={isSubmitting} onClick={handleSubmit}>
                {isEditing ? 'ذخیره تغییرات' : 'ایجاد صفحه'}
            </button>
        </div>
    );
}
