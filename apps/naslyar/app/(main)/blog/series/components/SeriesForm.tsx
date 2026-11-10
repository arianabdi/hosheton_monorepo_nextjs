'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Field, LoadingState, ModalHelper } from '@my-workspace/components';
import { ErrorToaster, SuccessToaster, toFarsiNumber } from '@my-workspace/utils';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import listStyles from '../../Blog.module.scss';
import formStyles from '../../components/BlogForm/BlogForm.module.scss';
import seriesStyles from '../Series.module.scss';
import AddPostToSeriesModal from '../components/AddPostToSeriesModal';
import BlogSectionGuide from '../../components/BlogSectionGuide';

interface SeriesPostItem {
    _id: string;
    title: string;
    order: string;
}

interface SeriesFormProps {
    seriesId?: string;
}

export default function SeriesForm({ seriesId }: SeriesFormProps) {
    const router = useRouter();
    const isEditing = Boolean(seriesId);
    const { token } = useAuthStore();
    const { baseUrl } = useAppStore();

    const [isLoading, setIsLoading] = useState(isEditing);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [data, setData] = useState({ title: '', slug: '', description: '' });
    const [ids, setIds] = useState<SeriesPostItem[]>([]);

    useEffect(() => {
        if (!isEditing || !token) return;
        setIsLoading(true);
        axios
            .get(`${baseUrl}/api/series/${seriesId}`, { headers: { authorization: `Bearer ${token}` } })
            .then((res) => {
                if (res.data.statusCode === 200) {
                    const payload = res.data.data;
                    setData({
                        title: payload.title || '',
                        slug: payload.slug || '',
                        description: payload.description || '',
                    });
                    setIds(payload.ids || []);
                }
            })
            .catch(ErrorToaster)
            .finally(() => setIsLoading(false));
    }, [isEditing, seriesId, token, baseUrl]);

    const moveItem = (index: number, direction: 'up' | 'down') => {
        const target = direction === 'up' ? index - 1 : index + 1;
        if (target < 0 || target >= ids.length) return;
        const next = [...ids];
        [next[index], next[target]] = [next[target], next[index]];
        setIds(next.map((item, i) => ({ ...item, order: String(i + 1) })));
    };

    const removeItem = (order: string) => {
        setIds((prev) => prev.filter((i) => i.order !== order).map((item, index) => ({ ...item, order: String(index + 1) })));
    };

    const handleSubmit = async () => {
        if (!token) return;
        try {
            setIsSubmitting(true);
            const payload = { ...data, ids };
            const res = isEditing
                ? await axios.put(`${baseUrl}/api/series/${seriesId}`, payload, { headers: { authorization: `Bearer ${token}` } })
                : await axios.post(`${baseUrl}/api/series`, payload, { headers: { authorization: `Bearer ${token}` } });

            if (res.data.statusCode === 200) {
                SuccessToaster({ message: `سری با موفقیت ${isEditing ? 'ویرایش' : 'ایجاد'} شد` });
                router.push('/blog/series');
            }
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) return <LoadingState />;

    return (
        <div className={`${listStyles.container} ${seriesStyles.rtl}`}>
            <ModalHelper
                open={isModalOpen}
                onOpen={() => setIsModalOpen(true)}
                onClose={() => setIsModalOpen(false)}
                component={
                    <AddPostToSeriesModal
                        items={ids}
                        onClose={() => setIsModalOpen(false)}
                        onAdd={(item) => {
                            setIds((prev) => [...prev, { ...item, order: String(prev.length + 1) }]);
                            setIsModalOpen(false);
                        }}
                    />
                }
            />

            <header className={listStyles.header}>
                <div>
                    <h1 className={listStyles.mainTitle}>{isEditing ? 'ویرایش سری مقالات' : 'سری مقالات جدید'}</h1>
                    <p className={listStyles.subtitle}>چند مقاله مرتبط را در یک سری قرار دهید.</p>
                </div>
                <Link href="/blog/series" className={listStyles.secondaryBtn}>بازگشت</Link>
            </header>

            <BlogSectionGuide guideKey="newSeries" compact />

            <div className={formStyles.section}>
                <div className={formStyles.field}>
                    <label>عنوان<Field value={data.title} type="text" className="form-control form-control-sm" onChange={(e) => setData((p) => ({ ...p, title: e }))} /></label>
                </div>
                <div className={formStyles.field}>
                    <label>شناسه (slug)<Field value={data.slug} type="text" className="form-control form-control-sm" onChange={(e) => setData((p) => ({ ...p, slug: e.replace(/[^a-zA-Z0-9-_]/g, '').toLowerCase() }))} /></label>
                </div>
                <div className={formStyles.field}>
                    <label>توضیحات<Field value={data.description} type="textarea" className="form-control form-control-sm" onChange={(e) => setData((p) => ({ ...p, description: e }))} /></label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem' }}>لیست مقالات</h3>
                    <button type="button" className={listStyles.primaryBtn} onClick={() => setIsModalOpen(true)}>+ افزودن مقاله</button>
                </div>

                <div className={seriesStyles.postList}>
                    {ids.length === 0 ? (
                        <p className={formStyles.hint}>هنوز مقاله‌ای اضافه نشده است.</p>
                    ) : (
                        ids.map((item, index) => (
                            <div key={`${item._id}-${item.order}`} className={seriesStyles.postItem}>
                                <span>{toFarsiNumber(item.order)} — {item.title}</span>
                                <div className={seriesStyles.postItemActions}>
                                    <button type="button" className={seriesStyles.moveBtn} onClick={() => moveItem(index, 'up')}>↑</button>
                                    <button type="button" className={seriesStyles.moveBtn} onClick={() => moveItem(index, 'down')}>↓</button>
                                    <button type="button" className={listStyles.deleteBtn} onClick={() => removeItem(item.order)}>حذف</button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <button type="button" className={formStyles.submit} disabled={isSubmitting} onClick={handleSubmit}>
                    {isEditing ? 'ذخیره تغییرات' : 'ایجاد سری'}
                </button>
            </div>
        </div>
    );
}
