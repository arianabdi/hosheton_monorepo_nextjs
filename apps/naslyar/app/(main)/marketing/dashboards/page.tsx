'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import styles from '../Marketing.module.scss';
import { Container, Wrapper } from '@/app/(main)/layout';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { ErrorToaster } from '@my-workspace/utils';
import { LoadingState } from '@my-workspace/components';
import { loadConnections } from '../marketing-api';
import { getPlatformDefinition } from '../platform.definitions';
import type { AnalyticsConnection } from '../marketing.types';

const IFRAME_SANDBOX =
    'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-storage-access-by-user-activation';

function DashboardsContent() {
    const searchParams = useSearchParams();
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const [connections, setConnections] = useState<AnalyticsConnection[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<string>('');
    const [frameLoaded, setFrameLoaded] = useState(false);

    useEffect(() => {
        if (!token) return;
        setLoading(true);
        loadConnections(baseUrl, token)
            .then(({ connections: data }) => setConnections(data))
            .catch(ErrorToaster)
            .finally(() => setLoading(false));
    }, [baseUrl, token]);

    // اعمال اتصال انتخابی از query param هنگام اولین بارگذاری
    useEffect(() => {
        const requested = searchParams.get('connection');
        if (requested) {
            setSelectedId(requested);
        } else if (connections.length > 0) {
            setSelectedId((prev) => prev || connections[0]._id);
        }
    }, [searchParams, connections]);

    const activeConnections = useMemo(() => connections.filter((c) => c.isActive), [connections]);

    const selected =
        activeConnections.find((c) => c._id === selectedId) ||
        activeConnections[0] ||
        null;

    useEffect(() => {
        setFrameLoaded(false);
    }, [selected?._id]);

    if (loading) {
        return <LoadingState />;
    }

    return (
        <div className={`${styles.container} ${styles.rtl}`}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.mainTitle}>داشبوردهای آنالیتیکس</h1>
                    <p className={styles.subtitle}>
                        داشبورد بومی هر پروژه اینجا جاسازی شده است. اتصال موردنظر را انتخاب کنید — بدون نیاز به لاگین
                        گوگل قابل مشاهده است.
                    </p>
                </div>
                <Link href="/marketing/connections" className={styles.secondaryBtn}>
                    مدیریت اتصال‌ها
                </Link>
            </header>

            {activeConnections.length === 0 ? (
                <div className={styles.emptyState}>
                    اتصال فعالی برای نمایش وجود ندارد.
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
                <>
                    <div className={styles.dashboardToolbar}>
                        <select
                            className={styles.dashboardSelect}
                            value={selected?._id || ''}
                            onChange={(e) => setSelectedId(e.target.value)}
                        >
                            {activeConnections.map((conn) => (
                                <option key={conn._id} value={conn._id}>
                                    {conn.title || getPlatformDefinition(conn.platform).label}
                                </option>
                            ))}
                        </select>
                        {selected && (
                            <Link href={`/marketing/connections/${selected._id}`} className={styles.editLink} style={{ width: 'auto', paddingInline: '1.2rem' }}>
                                ویرایش اتصال
                            </Link>
                        )}
                    </div>

                    {selected ? (
                        <div className={styles.dashboardFrame}>
                            <div className={styles.dashboardFrameHeader}>
                                <h3>{selected.title || getPlatformDefinition(selected.platform).label}</h3>
                                <span className={`${styles.badge} ${styles.badgePlatform}`}>
                                    {getPlatformDefinition(selected.platform).label}
                                </span>
                            </div>
                            <div className={styles.iframeWrap}>
                                {!frameLoaded && <div className={styles.frameLoading}>در حال بارگذاری داشبورد...</div>}
                                <iframe
                                    key={selected._id}
                                    src={selected.embedUrl}
                                    title={selected.title}
                                    allowFullScreen
                                    sandbox={IFRAME_SANDBOX}
                                    onLoad={() => setFrameLoaded(true)}
                                />
                            </div>
                        </div>
                    ) : null}
                </>
            )}
        </div>
    );
}

export default function MarketingDashboardsPage() {
    return (
        <Container>
            <Wrapper>
                <Suspense fallback={<LoadingState />}>
                    <DashboardsContent />
                </Suspense>
            </Wrapper>
        </Container>
    );
}
