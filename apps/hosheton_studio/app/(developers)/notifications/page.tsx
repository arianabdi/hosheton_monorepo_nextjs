'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LuBell, LuCheckCheck } from 'react-icons/lu';
import { notifyError } from '@/app/lib/errors';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { notificationApi } from '@/app/(marketplace)/lib/marketplace-api';
import { usePageLoading } from '@/app/components/PageTransition';
import { useTranslation } from 'react-i18next';
import { formatAppDate } from '@/app/lib/i18n/formatLocaleNumber';
import styles from './NotificationsPage.module.scss';

type NotificationItem = {
    _id: string;
    title?: string;
    message?: string;
    url?: string;
    isRead?: boolean;
    type?: string;
    createdAt?: string;
};

export default function NotificationsPage() {
    const { t, i18n } = useTranslation('notifications');
    const { t: tc } = useTranslation('common');
    const { t: th } = useTranslation('header');
    const router = useRouter();
    const { token } = useAuthStore();
    const [items, setItems] = useState<NotificationItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    usePageLoading(loading);

    const load = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const data = await notificationApi.list({ page: 1, limit: 50 }) as any;
            setItems(data.notifications ?? []);
            setUnreadCount(data.unreadCount ?? 0);
        } catch (error) {
            notifyError(error);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        load();
    }, [load]);

    const openItem = async (item: NotificationItem) => {
        if (!item.isRead) {
            try {
                await notificationApi.markAsRead(item._id);
                setItems((prev) => prev.map((n) => (n._id === item._id ? { ...n, isRead: true } : n)));
                setUnreadCount((c) => Math.max(0, c - 1));
            } catch (error) {
                notifyError(error);
            }
        }
        if (item.url) router.push(item.url);
    };

    const markAll = async () => {
        try {
            await notificationApi.markAllAsRead();
            setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (error) {
            notifyError(error);
        }
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>{t('title')}</h1>
                    <p className={styles.subtitle}>
                        {unreadCount > 0 ? t('unread', { count: unreadCount }) : t('all_read')}
                    </p>
                </div>
                {unreadCount > 0 && (
                    <button type="button" className={styles.markAllBtn} onClick={markAll}>
                        <LuCheckCheck size={16} />
                        {th('mark_all_read')}
                    </button>
                )}
            </header>

            {loading ? (
                <p className={styles.empty}>{tc('loading')}</p>
            ) : items.length === 0 ? (
                <div className={styles.emptyCard}>
                    <LuBell size={28} />
                    <p>{t('empty')}</p>
                </div>
            ) : (
                <div className={styles.list}>
                    {items.map((item) => (
                        <button
                            key={item._id}
                            type="button"
                            className={`${styles.item} ${item.isRead ? '' : styles.unread}`}
                            onClick={() => openItem(item)}
                        >
                            {!item.isRead && <span className={styles.dot} />}
                            <div className={styles.body}>
                                {item.title ? <strong>{item.title}</strong> : null}
                                {item.message ? <p>{item.message}</p> : null}
                                <time>{formatAppDate(item.createdAt, i18n.language)}</time>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
