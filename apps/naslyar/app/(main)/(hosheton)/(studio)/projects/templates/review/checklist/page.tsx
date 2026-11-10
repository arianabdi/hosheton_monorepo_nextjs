'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { LuPlus, LuTrash2 } from 'react-icons/lu';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { LoadingState } from '@my-workspace/components';
import {
    templateReviewApi,
    type TemplateReviewChecklistItem,
} from '../../../../lib/template-review-api';
import styles from '../../../../projects/nodes/Providers.module.scss';

export default function TemplateReviewChecklistPage() {
    const [items, setItems] = useState<TemplateReviewChecklistItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [newLabel, setNewLabel] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const data = await templateReviewApi.listReviewChecklistItems();
            setItems(data.items ?? []);
        } catch (error) {
            ErrorToaster(error);
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const handleAdd = async () => {
        const label = newLabel.trim();
        if (!label) return;
        try {
            setSubmitting(true);
            await templateReviewApi.createReviewChecklistItem(label);
            setNewLabel('');
            SuccessToaster({ message: 'آیتم چک‌لیست اضافه شد' });
            await load();
        } catch (error) {
            ErrorToaster(error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleRemove = async (itemId: string) => {
        try {
            setSubmitting(true);
            await templateReviewApi.deleteReviewChecklistItem(itemId);
            SuccessToaster({ message: 'آیتم حذف شد' });
            setItems((prev) => prev.filter((item) => item._id !== itemId));
        } catch (error) {
            ErrorToaster(error);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className={`${styles.container} ${styles.rtl}`}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.mainTitle}>چک‌لیست بررسی قالب</h1>
                    <p className={styles.subtitle}>
                        آیتم‌های این لیست در فرم بررسی قالب نمایش داده می‌شوند. تا زمانی که همه موارد تیک نخورده باشند، دکمه تایید غیرفعال است.
                    </p>
                </div>
                <Link href="/projects/templates/review" className={styles.secondaryBtn}>
                    بازگشت به بررسی قالب‌ها
                </Link>
            </header>

            <div className={styles.card}>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                    <input
                        type="text"
                        value={newLabel}
                        onChange={(e) => setNewLabel(e.target.value)}
                        placeholder="متن آیتم جدید، مثلاً: پیش‌نمایش‌ها با محتوای قالب همخوانی دارند"
                        style={{
                            flex: 1,
                            minWidth: 240,
                            borderRadius: 8,
                            padding: '10px 12px',
                            border: '1px solid var(--border-color)',
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAdd();
                        }}
                    />
                    <button
                        type="button"
                        className={styles.primaryBtn}
                        disabled={submitting || !newLabel.trim()}
                        onClick={handleAdd}
                    >
                        <LuPlus size={16} style={{ marginLeft: 6 }} />
                        افزودن
                    </button>
                </div>

                {loading ? (
                    <LoadingState />
                ) : items.length === 0 ? (
                    <p className={styles.subtitle}>هنوز آیتمی تعریف نشده. برای شروع یک مورد اضافه کنید.</p>
                ) : (
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '0.75rem' }}>
                        {items.map((item, index) => (
                            <li
                                key={item._id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '1rem',
                                    padding: '12px 14px',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: 10,
                                }}
                            >
                                <span>
                                    <strong style={{ marginLeft: 8 }}>{index + 1}.</strong>
                                    {item.label}
                                </span>
                                <button
                                    type="button"
                                    className={styles.secondaryBtn}
                                    disabled={submitting}
                                    onClick={() => handleRemove(item._id)}
                                    aria-label="حذف"
                                >
                                    <LuTrash2 size={16} />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
