'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BiBell } from 'react-icons/bi';
import { notificationApi } from '@/app/(marketplace)/lib/marketplace-api';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { useTranslation } from 'react-i18next';
import { formatAppDate } from '@/app/lib/i18n/formatLocaleNumber';
import styles from './NotificationPopup.module.scss';

interface NotificationItem {
    _id: string;
    title?: string;
    message?: string;
    url?: string;
    isRead?: boolean;
    type?: string;
    createdAt?: string;
}

type NotificationPopupProps = {
    variant?: 'icon' | 'menuItem';
};

export default function NotificationPopup({ variant = 'icon' }: NotificationPopupProps) {
    const router = useRouter();
    const { t, i18n } = useTranslation('header');
    const { t: tc } = useTranslation('common');
    const { token } = useAuthStore();
    const [open, setOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const fetchUnread = useCallback(async () => {
        if (!token) return;
        try {
            const data = await notificationApi.getUnreadCount();
            setUnreadCount(data.count ?? 0);
        } catch { /* silent */ }
    }, [token]);

    const fetchNotifications = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const data = await notificationApi.list({ limit: 15 }) as any;
            setNotifications(data.notifications ?? []);
            setUnreadCount(data.unreadCount ?? 0);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchUnread();
        const interval = setInterval(fetchUnread, 60000);
        return () => clearInterval(interval);
    }, [fetchUnread]);

    useEffect(() => {
        if (open) fetchNotifications();
    }, [open, fetchNotifications]);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    if (!token) return null;

    const handleClick = async (n: NotificationItem) => {
        if (!n.isRead) {
            await notificationApi.markAsRead(n._id);
            setUnreadCount((c) => Math.max(0, c - 1));
        }
        setOpen(false);
        if (n.url) router.push(n.url);
    };

    const handleMarkAll = async () => {
        await notificationApi.markAllAsRead();
        setUnreadCount(0);
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    };

    return (
        <div className={`${styles.wrapper} ${variant === 'menuItem' ? styles.menuWrapper : ''}`} ref={ref}>
            {variant === 'menuItem' ? (
                <button
                    type="button"
                    className={styles.menuItemBtn}
                    onClick={() => setOpen((v) => !v)}
                >
                    <span className={styles.menuItemStart}>
                        <BiBell size={18} />
                        <span>{t('notifications')}</span>
                    </span>
                    {unreadCount > 0 && (
                        <span className={styles.menuBadge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
                    )}
                </button>
            ) : (
                <button
                    type="button"
                    className={styles.bellBtn}
                    onClick={() => setOpen((v) => !v)}
                    aria-label={t('notifications')}
                >
                    <BiBell size={24} color="var(--icon-color)" />
                    {unreadCount > 0 && (
                        <span className={styles.badge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
                    )}
                </button>
            )}

            {open && (
                <div className={`${styles.dropdown} ${variant === 'menuItem' ? styles.dropdownMenu : ''}`}>
                    <div className={styles.dropdownHeader}>
                        <span>{t('notifications')}</span>
                        {unreadCount > 0 && (
                            <button type="button" onClick={handleMarkAll}>{t('mark_all_read')}</button>
                        )}
                    </div>
                    <div className={styles.list}>
                        {loading ? (
                            <p className={styles.empty}>{tc('loading')}</p>
                        ) : notifications.length === 0 ? (
                            <p className={styles.empty}>{t('no_notifications')}</p>
                        ) : (
                            notifications.map((n) => (
                                <button
                                    key={n._id}
                                    type="button"
                                    className={`${styles.item} ${!n.isRead ? styles.unread : ''}`}
                                    onClick={() => handleClick(n)}
                                >
                                    {n.title && <strong>{n.title}</strong>}
                                    <p>{n.message}</p>
                                    {n.createdAt && (
                                        <time>{formatAppDate(n.createdAt, i18n.language)}</time>
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
