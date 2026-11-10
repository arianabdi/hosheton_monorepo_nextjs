'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import styles from '../Marketing.module.scss';
import { Container, Wrapper } from '@/app/(main)/layout';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { LoadingState } from '@my-workspace/components';
import { loadConnections, saveConnections } from '../marketing-api';
import { getPlatformDefinition } from '../platform.definitions';
import type { AnalyticsConnection } from '../marketing.types';

export default function MarketingConnectionsPage() {
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const [connections, setConnections] = useState<AnalyticsConnection[]>([]);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const { connections: data } = await loadConnections(baseUrl, token);
            setConnections(data);
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, [baseUrl, token]);

    useEffect(() => {
        if (token) {
            refresh();
        }
    }, [token, refresh]);

    const persist = useCallback(
        async (next: AnalyticsConnection[], successMessage: string) => {
            if (!token) return;
            try {
                await saveConnections(baseUrl, token, next);
                SuccessToaster({ message: successMessage });
                setConnections(next);
            } catch (e) {
                ErrorToaster(e);
                await refresh();
            }
        },
        [baseUrl, token, refresh],
    );

    const toggleActive = async (conn: AnalyticsConnection, value: boolean) => {
        await persist(
            connections.map((c) => (c._id === conn._id ? { ...c, isActive: value, updatedAt: new Date().toISOString() } : c)),
            'وضعیت اتصال به‌روزرسانی شد',
        );
    };

    const handleDelete = async (conn: AnalyticsConnection) => {
        if (!confirm(`حذف اتصال «${conn.title}»؟`)) return;
        await persist(
            connections.filter((c) => c._id !== conn._id),
            'اتصال حذف شد',
        );
    };

    const summary = useMemo(
        () => ({
            total: connections.length,
            active: connections.filter((c) => c.isActive).length,
            ga4: connections.filter((c) => c.platform === 'ga4').length,
        }),
        [connections],
    );

    return (
        <Container>
            <Wrapper>
                <div className={`${styles.container} ${styles.rtl}`}>
                    <header className={styles.header}>
                        <div>
                            <h1 className={styles.mainTitle}>اتصال‌های آنالیتیکس</h1>
                            <p className={styles.subtitle}>
                                پلتفرم‌های آنالیتیکس متصل به این پروژه. تیم توسعه تگ و داشبورد را در گوگل آماده می‌کند و
                                تیم مارکتینگ لینک Embed گزارش Looker Studio را ثبت می‌کند — بدون نیاز به لاگین گوگل برای مشاهده.
                            </p>
                        </div>
                        <Link href="/marketing/connections/add" className={styles.primaryBtn}>
                            + اتصال جدید
                        </Link>
                    </header>

                    <div className={styles.statsBar}>
                        <div className={styles.statCard}>
                            <div className={styles.statValue}>{summary.total}</div>
                            <div className={styles.statLabel}>کل اتصال‌ها</div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.statValue}>{summary.active}</div>
                            <div className={styles.statLabel}>اتصال‌های فعال</div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.statValue}>{summary.ga4}</div>
                            <div className={styles.statLabel}>GA4</div>
                        </div>
                    </div>

                    <div className={styles.connectionGrid}>
                        {loading ? (
                            <div className={styles.loadingState}>
                                <LoadingState />
                            </div>
                        ) : connections.length === 0 ? (
                            <div className={styles.emptyState}>
                                هنوز اتصالی ثبت نشده است.
                                <br />
                                <Link
                                    href="/marketing/connections/add"
                                    className={styles.primaryBtn}
                                    style={{ marginTop: 12, display: 'inline-flex' }}
                                >
                                    + اتصال جدید
                                </Link>
                            </div>
                        ) : (
                            connections.map((conn) => {
                                const def = getPlatformDefinition(conn.platform);
                                return (
                                    <article key={conn._id} className={styles.connectionCard}>
                                        <div className={styles.connectionCardHead}>
                                            <div className={styles.platformBox}>{def.shortLabel}</div>
                                            <div className={styles.connectionTitle}>
                                                <h3>{conn.title || 'بدون عنوان'}</h3>
                                                <div className={styles.platformName}>{def.label}</div>
                                            </div>
                                        </div>

                                        <div className={styles.connectionBody}>
                                            <div className={styles.propertyRow}>
                                                <span>Property</span>
                                                <span>{conn.propertyName || '—'}</span>
                                            </div>
                                            <div className={styles.propertyRow}>
                                                <span>Property ID</span>
                                                <span>{conn.propertyId || '—'}</span>
                                            </div>
                                            {conn.notes ? <span>{conn.notes}</span> : null}
                                        </div>

                                        <div className={styles.metaRow}>
                                            <span
                                                className={`${styles.badge} ${
                                                    conn.isActive ? styles.badgeActive : styles.badgeInactive
                                                }`}
                                            >
                                                {conn.isActive ? 'فعال' : 'غیرفعال'}
                                            </span>
                                            <span className={`${styles.badge} ${styles.badgePlatform}`}>
                                                {def.shortLabel}
                                            </span>
                                        </div>

                                        <div className={styles.embedUrlPreview} title={conn.embedUrl}>
                                            {conn.embedUrl}
                                        </div>

                                        <div className={styles.toggleRow}>
                                            <label className={styles.toggleLabel}>
                                                <span>فعال</span>
                                                <input
                                                    type="checkbox"
                                                    checked={conn.isActive}
                                                    onChange={(e) => toggleActive(conn, e.target.checked)}
                                                />
                                            </label>
                                        </div>

                                        <div className={styles.cardActions}>
                                            <Link
                                                href={`/marketing/dashboards?connection=${conn._id}`}
                                                className={styles.viewLink}
                                            >
                                                مشاهده داشبورد
                                            </Link>
                                            <Link href={`/marketing/connections/${conn._id}`} className={styles.editLink}>
                                                ویرایش
                                            </Link>
                                            <button
                                                type="button"
                                                className={styles.deleteBtn}
                                                onClick={() => handleDelete(conn)}
                                            >
                                                حذف
                                            </button>
                                        </div>
                                    </article>
                                );
                            })
                        )}
                    </div>
                </div>
            </Wrapper>
        </Container>
    );
}
