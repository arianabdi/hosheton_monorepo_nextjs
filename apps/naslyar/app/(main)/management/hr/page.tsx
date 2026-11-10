'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import parentStyles from '../../marketing/Marketing.module.scss';
import styles from './Hr.module.scss';
import { Container, Wrapper } from '@/app/(main)/layout';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { ErrorToaster } from '@my-workspace/utils';
import { LoadingState } from '@my-workspace/components';
import { loadHrStore } from './hr-api';

export default function HrDashboardPage() {
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ employees: 0, departments: 0, roles: 0, activeEmployees: 0 });

    const load = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const store = await loadHrStore(baseUrl, token);
            setStats({
                employees: store.employees.length,
                activeEmployees: store.employees.filter((e) => e.status === 'active').length,
                departments: store.departments.length,
                roles: store.jobRoles.length,
            });
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
                            <h1 className={parentStyles.mainTitle}>منابع انسانی</h1>
                            <p className={parentStyles.subtitle}>مدیریت واحدها، سمت‌ها و کارمندان سازمان</p>
                        </div>
                        <Link href="/management/hr/employees/new" className={parentStyles.primaryBtn}>
                            افزودن نیروی انسانی جدید
                        </Link>
                    </header>
                    <div className={styles.statsStrip}>
                        <div className={styles.statsStripItem}>
                            <div className={styles.statsStripValue}>{stats.activeEmployees.toLocaleString('fa-IR')}</div>
                            <div className={styles.statsStripLabel}>کارمند فعال</div>
                        </div>
                        <div className={styles.statsStripItem}>
                            <div className={styles.statsStripValue}>{stats.departments.toLocaleString('fa-IR')}</div>
                            <div className={styles.statsStripLabel}>واحد سازمانی</div>
                        </div>
                        <div className={styles.statsStripItem}>
                            <div className={styles.statsStripValue}>{stats.roles.toLocaleString('fa-IR')}</div>
                            <div className={styles.statsStripLabel}>سمت</div>
                        </div>
                    </div>
                    <div className={parentStyles.guideGrid}>
                        <div className={parentStyles.guideCard}>
                            <h3>شروع سریع</h3>
                            <div className={styles.shortcutList}>
                                <Link href="/management/hr/departments" className={styles.shortcutLink}>۱. تعریف واحدهای سازمانی</Link>
                                <Link href="/management/hr/roles" className={styles.shortcutLink}>۲. تعریف سمت‌ها (مدیر، کارشناس، …)</Link>
                                <Link href="/management/hr/employees/new" className={styles.shortcutLink}>۳. ثبت نیروی انسانی (دستی یا از کاربران)</Link>
                                <Link href="/management/documents/workflows" className={styles.shortcutLink}>۴. طراحی گردش کار اسناد</Link>
                            </div>
                        </div>
                        <div className={parentStyles.guideCard}>
                            <h3>ارتباط با گردش کار</h3>
                            <p style={{ margin: 0, fontSize: '0.82rem', lineHeight: 1.75, opacity: 0.85 }}>
                                در طراح گردش کار اسناد، هر مرحله به یک <strong>سمت</strong>، <strong>واحد</strong> یا
                                <strong> شخص مشخص</strong> از همین بخش ارجاع داده می‌شود. ابتدا ساختار HR را تکمیل کنید.
                            </p>
                        </div>
                    </div>
                    <p className={styles.guideNote}>
                        حساب‌های ورود سیستم در بخش «کاربران» مدیریت می‌شوند؛ اینجا پروفایل سازمانی (واحد و سمت) را تعریف می‌کنید.
                    </p>
                </div>
            </Wrapper>
        </Container>
    );
}
