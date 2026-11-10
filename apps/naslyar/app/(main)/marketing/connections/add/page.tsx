'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../../Marketing.module.scss';
import { Container, Wrapper } from '@/app/(main)/layout';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import AnalyticsConnectionForm from '../AnalyticsConnectionForm';
import { loadConnections, saveConnections, createConnectionId } from '../../marketing-api';
import type { ConnectionFormValues } from '../../marketing.types';

const EMPTY_VALUES: ConnectionFormValues = {
    platform: 'ga4',
    title: '',
    propertyName: '',
    propertyId: '',
    embedUrl: '',
    notes: '',
    isActive: true,
};

export default function AddConnectionPage() {
    const router = useRouter();
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (values: ConnectionFormValues) => {
        if (!token) return;
        try {
            const { connections } = await loadConnections(baseUrl, token);
            const now = new Date().toISOString();
            const next = [
                {
                    _id: createConnectionId(),
                    platform: values.platform,
                    title: values.title,
                    propertyName: values.propertyName,
                    propertyId: values.propertyId,
                    embedUrl: values.embedUrl,
                    notes: values.notes,
                    isActive: values.isActive,
                    createdAt: now,
                    updatedAt: now,
                },
                ...connections,
            ];
            await saveConnections(baseUrl, token, next);
            SuccessToaster({ message: 'اتصال آنالیتیکس ایجاد شد' });
            router.push('/marketing/connections');
        } catch (e) {
            ErrorToaster(e);
            setError('خطا در ذخیره اتصال. لطفاً دوباره تلاش کنید.');
        }
    };

    return (
        <Container>
            <Wrapper>
                <div className={`${styles.container} ${styles.rtl}`}>
                    <header className={styles.header}>
                        <div>
                            <h1 className={styles.mainTitle}>اتصال جدید آنالیتیکس</h1>
                            <p className={styles.subtitle}>
                                پلتفرم را انتخاب کنید و لینک Embed گزارش Looker Studio را وارد کنید.
                            </p>
                        </div>
                    </header>
                    {error ? <p className={styles.fieldError}>{error}</p> : null}
                    <AnalyticsConnectionForm
                        initialValues={EMPTY_VALUES}
                        submitLabel="ایجاد اتصال"
                        onSubmit={handleSubmit}
                    />
                </div>
            </Wrapper>
        </Container>
    );
}
