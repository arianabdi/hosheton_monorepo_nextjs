'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from '../../Marketing.module.scss';
import { Container, Wrapper } from '@/app/(main)/layout';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { LoadingState } from '@my-workspace/components';
import AnalyticsConnectionForm from '../AnalyticsConnectionForm';
import { loadConnections, saveConnections } from '../../marketing-api';
import type { AnalyticsConnection, ConnectionFormValues } from '../../marketing.types';

export default function EditConnectionPage() {
    const router = useRouter();
    const params = useParams<{ id: string }>();
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const [connection, setConnection] = useState<AnalyticsConnection | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    const load = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const { connections } = await loadConnections(baseUrl, token);
            const found = connections.find((c) => c._id === params.id);
            if (!found) {
                setNotFound(true);
                return;
            }
            setConnection(found);
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, [baseUrl, token, params.id]);

    useEffect(() => {
        load();
    }, [load]);

    const handleSubmit = async (values: ConnectionFormValues) => {
        if (!token || !connection) return;
        try {
            const { connections } = await loadConnections(baseUrl, token);
            const next = connections.map((c) =>
                c._id === connection._id
                    ? {
                          ...c,
                          platform: values.platform,
                          title: values.title,
                          propertyName: values.propertyName,
                          propertyId: values.propertyId,
                          embedUrl: values.embedUrl,
                          notes: values.notes,
                          isActive: values.isActive,
                          updatedAt: new Date().toISOString(),
                      }
                    : c,
            );
            await saveConnections(baseUrl, token, next);
            SuccessToaster({ message: 'اتصال به‌روزرسانی شد' });
            router.push('/marketing/connections');
        } catch (e) {
            ErrorToaster(e);
        }
    };

    return (
        <Container>
            <Wrapper>
                <div className={`${styles.container} ${styles.rtl}`}>
                    <header className={styles.header}>
                        <div>
                            <h1 className={styles.mainTitle}>ویرایش اتصال آنالیتیکس</h1>
                            <p className={styles.subtitle}>اطلاعات اتصال و لینک Embed را به‌روزرسانی کنید.</p>
                        </div>
                    </header>

                    {loading ? (
                        <LoadingState />
                    ) : notFound ? (
                        <div className={styles.emptyState}>
                            اتصال موردنظر پیدا نشد. احتمالاً حذف شده است.
                            <br />
                            <Link href="/marketing/connections" className={styles.secondaryBtn} style={{ marginTop: 12 }}>
                                بازگشت به اتصال‌ها
                            </Link>
                        </div>
                    ) : connection ? (
                        <AnalyticsConnectionForm
                            initialValues={{
                                platform: connection.platform,
                                title: connection.title,
                                propertyName: connection.propertyName,
                                propertyId: connection.propertyId,
                                embedUrl: connection.embedUrl,
                                notes: connection.notes,
                                isActive: connection.isActive,
                            }}
                            submitLabel="ذخیره تغییرات"
                            onSubmit={handleSubmit}
                        />
                    ) : null}
                </div>
            </Wrapper>
        </Container>
    );
}
