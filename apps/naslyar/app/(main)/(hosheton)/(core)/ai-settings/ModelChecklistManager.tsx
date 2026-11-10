'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import styles from './OpsSettings.module.scss';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';

type ChecklistItem = {
    _id: string;
    title: string;
};

/**
 * مدیریت آیتم‌های چک‌لیست سراسری مدل‌ها (تب «چک‌لیست مدل‌ها» در تنظیمات هوش مصنوعی).
 * این آیتم‌ها به ازای همه مدل‌ها در جدول models به صورت پیشرفت دایره‌ای نمایش داده می‌شوند.
 */
export default function ModelChecklistManager() {
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const [items, setItems] = useState<ChecklistItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [newTitle, setNewTitle] = useState('');
    const [adding, setAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [savingId, setSavingId] = useState<string | null>(null);

    const loadItems = async () => {
        if (!token || !baseUrl) return;
        try {
            const res = await axios.get(`${baseUrl}/api/provider-model-checklists`, {
                headers: { authorization: `Bearer ${token}` },
            });
            if (res.data.statusCode === 200) {
                setItems(res.data.data?.items || []);
            }
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadItems();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, baseUrl]);

    const handleAdd = async () => {
        const title = newTitle.trim();
        if (!title || !token) return;
        try {
            setAdding(true);
            const res = await axios.post(
                `${baseUrl}/api/provider-model-checklists`,
                { title },
                { headers: { authorization: `Bearer ${token}` } },
            );
            if (res.data.statusCode === 200) {
                setItems((prev) => [...prev, res.data.data]);
                setNewTitle('');
                SuccessToaster({ message: 'آیتم چک‌لیست اضافه شد' });
            }
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setAdding(false);
        }
    };

    const handleRename = async (itemId: string) => {
        const title = editTitle.trim();
        if (!title || !token) return;
        try {
            setSavingId(itemId);
            const res = await axios.put(
                `${baseUrl}/api/provider-model-checklists/${itemId}`,
                { title },
                { headers: { authorization: `Bearer ${token}` } },
            );
            if (res.data.statusCode === 200) {
                setItems((prev) => prev.map((item) => (item._id === itemId ? { ...item, title } : item)));
                setEditingId(null);
                SuccessToaster({ message: 'آیتم ویرایش شد' });
            }
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setSavingId(null);
        }
    };

    const handleDelete = async (itemId: string) => {
        if (!token) return;
        if (!window.confirm('این آیتم از چک‌لیست همه مدل‌ها هم حذف می‌شود. مطمئن هستید؟')) return;
        try {
            setSavingId(itemId);
            const res = await axios.delete(`${baseUrl}/api/provider-model-checklists/${itemId}`, {
                headers: { authorization: `Bearer ${token}` },
            });
            if (res.data.statusCode === 200) {
                setItems((prev) => prev.filter((item) => item._id !== itemId));
                SuccessToaster({ message: 'آیتم چک‌لیست حذف شد' });
            }
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setSavingId(null);
        }
    };

    return (
        <section className={styles.card}>
            <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>چک‌لیست مدل‌ها</h2>
                <p className={styles.cardDesc}>
                    آیتم‌های این چک‌لیست به ازای همه مدل‌ها در جدول «مدل‌ها» نمایش داده می‌شود و ادمین می‌تواند تیک هر آیتم را به ازای هر مدل بزند.
                </p>
            </div>

            <div className={styles.listBlock}>
                <div className={styles.chatRow}>
                    <input
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        onKeyDown={(e) => {
                            // جلوگیری از submit فرم تنظیمات هنگام Enter
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAdd();
                            }
                        }}
                        placeholder="عنوان آیتم جدید (مثلاً: بررسی قیمت‌گذاری)"
                        aria-label="عنوان آیتم جدید"
                    />
                    <button
                        type="button"
                        className={styles.iconBtn}
                        onClick={handleAdd}
                        disabled={adding || !newTitle.trim()}
                        title="افزودن آیتم"
                    >
                        {adding ? '...' : '+'}
                    </button>
                </div>

                {loading ? (
                    <p className={styles.listHint}>در حال بارگذاری...</p>
                ) : items.length === 0 ? (
                    <p className={styles.listHint}>هنوز آیتمی تعریف نشده است. اولین آیتم را اضافه کنید.</p>
                ) : (
                    <ul className={styles.checklistList}>
                        {items.map((item, i) => (
                            <li key={item._id} className={styles.chatRow}>
                                {editingId === item._id ? (
                                    <>
                                        <input
                                            type="text"
                                            value={editTitle}
                                            onChange={(e) => setEditTitle(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    handleRename(item._id);
                                                }
                                                if (e.key === 'Escape') setEditingId(null);
                                            }}
                                            autoFocus
                                            aria-label="عنوان آیتم"
                                        />
                                        <button
                                            type="button"
                                            className={styles.iconBtn}
                                            onClick={() => handleRename(item._id)}
                                            disabled={savingId === item._id || !editTitle.trim()}
                                            title="ذخیره"
                                        >
                                            ✓
                                        </button>
                                        <button
                                            type="button"
                                            className={styles.iconBtn}
                                            onClick={() => setEditingId(null)}
                                            title="انصراف"
                                        >
                                            ✕
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <span className={styles.checklistIndex}>{i + 1}.</span>
                                        <span className={styles.checklistTitle}>{item.title}</span>
                                        <button
                                            type="button"
                                            className={styles.iconBtn}
                                            onClick={() => {
                                                setEditingId(item._id);
                                                setEditTitle(item.title);
                                            }}
                                            disabled={savingId === item._id}
                                            title="ویرایش"
                                        >
                                            ✎
                                        </button>
                                        <button
                                            type="button"
                                            className={`${styles.iconBtn} ${styles.deleteIconBtn}`}
                                            onClick={() => handleDelete(item._id)}
                                            disabled={savingId === item._id}
                                            title="حذف"
                                        >
                                            🗑
                                        </button>
                                    </>
                                )}
                            </li>
                        ))}
                    </ul>
                )}

                <p className={styles.listHint}>
                    حذف یک آیتم، آن را از چک‌لیست همه مدل‌ها نیز برداشته و درصد پیشرفت آن‌ها را به‌روز می‌کند.
                </p>
            </div>
        </section>
    );
}
