'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import styles from './PlatformIcons.module.scss';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { sanitizeSvg, SvgMarkup } from '../ai-modes/modeIcons';
import { PlatformIconItem } from './usePlatformIcons';

/**
 * تب «آیکون‌های عمومی» در تنظیمات هوش مصنوعی (/ai-settings) — کتابخانه SVG سراسری.
 * ادمین نام و SVG را همین‌جا اضافه می‌کند؛ هنگام تنظیم آیکون مدل یا گزینه‌های select تنظیمات،
 * SVG و شناسه آیکون انتخاب‌شده در فیلد مقصد ذخیره می‌شود (platformIconId). با ویرایش SVG، بک‌اند
 * همه‌ی مدل‌ها و پریست‌های متصل را هم به‌روز می‌کند؛ با حذف، شکل می‌ماند ولی اتصال قطع می‌شود.
 */
export default function PlatformIconsManager() {
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const [items, setItems] = useState<PlatformIconItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [newName, setNewName] = useState('');
    const [newSvg, setNewSvg] = useState('');
    const [adding, setAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editSvg, setEditSvg] = useState('');
    const [savingId, setSavingId] = useState<string | null>(null);

    const loadItems = async () => {
        if (!token || !baseUrl) return;
        try {
            const res = await axios.get(`${baseUrl}/api/platform-icons`, {
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
        if (!newName.trim() || !sanitizeSvg(newSvg) || !token) return;
        try {
            setAdding(true);
            const res = await axios.post(
                `${baseUrl}/api/platform-icons`,
                { name: newName.trim(), iconSvg: newSvg.trim() },
                { headers: { authorization: `Bearer ${token}` } },
            );
            if (res.data.statusCode === 200) {
                setItems((prev) => [...prev, res.data.data]);
                setNewName('');
                setNewSvg('');
                SuccessToaster({ message: 'آیکون عمومی اضافه شد' });
            }
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setAdding(false);
        }
    };

    const handleUpdate = async (iconId: string) => {
        if (!editName.trim() || !sanitizeSvg(editSvg) || !token) return;
        try {
            setSavingId(iconId);
            const res = await axios.put(
                `${baseUrl}/api/platform-icons/${iconId}`,
                { name: editName.trim(), iconSvg: editSvg.trim() },
                { headers: { authorization: `Bearer ${token}` } },
            );
            if (res.data.statusCode === 200) {
                setItems((prev) => prev.map((item) => (item._id === iconId ? { ...item, name: editName.trim(), iconSvg: editSvg.trim() } : item)));
                setEditingId(null);
                const syncedModels = Number(res.data.data?.synced?.models || 0);
                SuccessToaster({
                    message: syncedModels > 0
                        ? `آیکون ویرایش شد و در ${syncedModels} مدل به‌روز شد`
                        : 'آیکون ویرایش شد',
                });
            }
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setSavingId(null);
        }
    };

    const handleDelete = async (iconId: string) => {
        if (!token) return;
        if (!window.confirm('این آیکون از کتابخانه عمومی حذف می‌شود. مدل‌هایی که از آن استفاده کرده‌اند همین شکل را نگه می‌دارند ولی دیگر با ویرایش کتابخانه به‌روز نمی‌شوند. مطمئن هستید؟')) return;
        try {
            setSavingId(iconId);
            const res = await axios.delete(`${baseUrl}/api/platform-icons/${iconId}`, {
                headers: { authorization: `Bearer ${token}` },
            });
            if (res.data.statusCode === 200) {
                setItems((prev) => prev.filter((item) => item._id !== iconId));
                SuccessToaster({ message: 'آیکون حذف شد' });
            }
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setSavingId(null);
        }
    };

    return (
        <div>
            <div className={styles.addBlock}>
                <label className={styles.nameField}>
                    <span className={styles.fieldLabel}>نام آیکون</span>
                    <input
                        type="text"
                        className={styles.nameInput}
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="مثلاً: 4K، 16:9، OpenAI"
                        aria-label="نام آیکون"
                    />
                    <span className={styles.hint}>
                        برای این‌که موقع انتخاب در تنظیمات مدل معلوم باشد این آیکون برای چیست.
                    </span>
                </label>
                <div className={styles.addRow}>
                    <textarea
                        className={styles.svgInput}
                        rows={4}
                        dir="ltr"
                        placeholder="<svg>...</svg>"
                        value={newSvg}
                        onChange={(e) => setNewSvg(e.target.value)}
                        aria-label="SVG آیکون جدید"
                    />
                    <div className={styles.previewBox}>
                        {sanitizeSvg(newSvg) ? <SvgMarkup svg={newSvg} /> : null}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                        type="button"
                        className={styles.btn}
                        onClick={handleAdd}
                        disabled={adding || !newName.trim() || !sanitizeSvg(newSvg)}
                    >
                        {adding ? '...' : 'افزودن آیکون'}
                    </button>
                    <span className={styles.hint}>
                        فقط مارکاپ SVG؛ تگ script و رویدادهای on* به‌صورت خودکار حذف می‌شوند.
                    </span>
                </div>
            </div>

            <div className={styles.listBlock}>
                <p className={styles.listTitle}>آیکون‌های اضافه‌شده ({items.length})</p>
                {loading ? (
                    <p className={styles.hint}>در حال بارگذاری...</p>
                ) : items.length === 0 ? (
                    <p className={styles.hint}>هنوز آیکونی اضافه نشده است. اولین آیکون را با فرم بالا اضافه کنید.</p>
                ) : (
                    items.map((item) => (
                        <div key={item._id} className={styles.iconRow}>
                            {editingId === item._id ? (
                                <>
                                    <input
                                        type="text"
                                        className={styles.nameInput}
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        aria-label="ویرایش نام آیکون"
                                        style={{ flex: '0 1 180px' }}
                                    />
                                    <textarea
                                        className={styles.svgInput}
                                        rows={3}
                                        dir="ltr"
                                        value={editSvg}
                                        onChange={(e) => setEditSvg(e.target.value)}
                                        aria-label="ویرایش SVG آیکون"
                                        style={{ flex: 1 }}
                                    />
                                    <div className={styles.previewBox} style={{ flexBasis: 44, width: 44, height: 44 }}>
                                        {sanitizeSvg(editSvg) ? <SvgMarkup svg={editSvg} /> : null}
                                    </div>
                                    <div className={styles.rowActions}>
                                        <button
                                            type="button"
                                            className={styles.btn}
                                            onClick={() => handleUpdate(item._id)}
                                            disabled={savingId === item._id || !editName.trim() || !sanitizeSvg(editSvg)}
                                        >
                                            ذخیره
                                        </button>
                                        <button
                                            type="button"
                                            className={styles.btn}
                                            onClick={() => setEditingId(null)}
                                        >
                                            انصراف
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className={styles.iconThumb}>
                                        <SvgMarkup svg={item.iconSvg} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div className={styles.iconName}>{item.name}</div>
                                        <code className={styles.hint} style={{ direction: 'ltr', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {item.iconSvg.slice(0, 60)}
                                        </code>
                                    </div>
                                    <div className={styles.rowActions}>
                                        <button
                                            type="button"
                                            className={styles.btn}
                                            onClick={() => {
                                                setEditingId(item._id);
                                                setEditName(item.name || '');
                                                setEditSvg(item.iconSvg);
                                            }}
                                            disabled={savingId === item._id}
                                        >
                                            ویرایش
                                        </button>
                                        <button
                                            type="button"
                                            className={`${styles.btn} ${styles.dangerBtn}`}
                                            onClick={() => handleDelete(item._id)}
                                            disabled={savingId === item._id}
                                        >
                                            حذف
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
