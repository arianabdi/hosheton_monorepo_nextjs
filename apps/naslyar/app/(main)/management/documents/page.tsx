'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import tabStyles from '../../marketing/automation/Automation.module.scss';
import parentStyles from '../../marketing/Marketing.module.scss';
import styles from './Documents.module.scss';
import { Container, Wrapper } from '@/app/(main)/layout';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { ErrorToaster } from '@my-workspace/utils';
import { LoadingState } from '@my-workspace/components';
import { exploreFiles, loadDocumentsStore } from './documents-api';

export default function DocumentsDashboardPage() {
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalFiles: 0,
        pendingApprovals: 0,
        expiring: 0,
        storageMb: 0,
    });
    const [recent, setRecent] = useState<{ fileName: string; action: string; at: string }[]>([]);

    const load = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const [store, explore] = await Promise.all([
                loadDocumentsStore(baseUrl, token),
                exploreFiles(baseUrl, token, { limit: 200 }),
            ]);
            const now = Date.now();
            const expiring = Object.values(store.fileMeta).filter((m) => {
                if (!m.expiresAt) return false;
                const diff = new Date(m.expiresAt).getTime() - now;
                return diff > 0 && diff < 30 * 86400000;
            }).length;
            const storageBytes = explore.files.reduce((s, f) => s + (f.size || 0), 0);
            setStats({
                totalFiles: explore.totalItems,
                pendingApprovals: store.workflowInstances.filter((w) => w.status === 'pending').length,
                expiring,
                storageMb: Math.round(storageBytes / (1024 * 1024)),
            });
            setRecent(store.recentActivity.slice(0, 8));
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, [baseUrl, token]);

    useEffect(() => {
        void load();
    }, [load]);

    if (loading) return <LoadingState />;

    return (
        <Container>
            <Wrapper>
                <div className={`${parentStyles.container} ${parentStyles.rtl}`}>
                    <header className={parentStyles.header}>
                        <div>
                            <h1 className={parentStyles.mainTitle}>داشبورد اسناد</h1>
                            <p className={parentStyles.subtitle}>خلاصه وضعیت اسناد سازمان و دسترسی سریع</p>
                        </div>
                        <Link href="/management/documents/explorer" className={parentStyles.primaryBtn}>
                            آپلود / مخزن
                        </Link>
                    </header>
                    <div className={styles.statsStrip}>
                        <div className={styles.statsStripItem}>
                            <div className={styles.statsStripValue}>{stats.totalFiles}</div>
                            <div className={styles.statsStripLabel}>کل اسناد</div>
                        </div>
                        <div className={styles.statsStripItem}>
                            <div className={styles.statsStripValue}>{stats.pendingApprovals}</div>
                            <div className={styles.statsStripLabel}>در انتظار تأیید</div>
                        </div>
                        <div className={styles.statsStripItem}>
                            <div className={styles.statsStripValue}>{stats.expiring}</div>
                            <div className={styles.statsStripLabel}>در حال انقضا</div>
                        </div>
                        <div className={styles.statsStripItem}>
                            <div className={styles.statsStripValue}>{stats.storageMb}</div>
                            <div className={styles.statsStripLabel}>حجم (MB)</div>
                        </div>
                    </div>
                    <div className={parentStyles.overviewGrid}>
                        <div className={parentStyles.overviewCard}>
                            <h3>میانبرها</h3>
                            <div className={styles.shortcutList}>
                                <Link href="/management/documents/explorer" className={styles.shortcutLink}>
                                    <span className={styles.shortcutDot} aria-hidden />
                                    مخزن اسناد
                                </Link>
                                <Link href="/management/documents/workflows" className={styles.shortcutLink}>
                                    <span className={styles.shortcutDot} aria-hidden />
                                    کارتابل
                                </Link>
                                <Link href="/management/documents/sharing" className={styles.shortcutLink}>
                                    <span className={styles.shortcutDot} aria-hidden />
                                    اشتراک‌گذاری
                                </Link>
                                <Link href="/management/documents/archive" className={styles.shortcutLink}>
                                    <span className={styles.shortcutDot} aria-hidden />
                                    آرشیو
                                </Link>
                            </div>
                        </div>
                        <div className={parentStyles.overviewCard}>
                            <h3>فعالیت اخیر</h3>
                            {recent.length === 0 ? <p>فعالیتی ثبت نشده</p> : recent.map((r, i) => (
                                <div key={i} className={tabStyles.stepItem}>{r.fileName} — {r.action} — {new Date(r.at).toLocaleString('fa-IR')}</div>
                            ))}
                        </div>
                    </div>
                </div>
            </Wrapper>
        </Container>
    );
}
