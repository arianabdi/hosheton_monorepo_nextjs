'use client';

import React, { useCallback, useEffect, useState } from 'react';
import styles from '../Automation.module.scss';
import parentStyles from '../../Marketing.module.scss';
import { Container, Wrapper } from '@/app/(main)/layout';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { LoadingState } from '@my-workspace/components';
import { createAutomationId, loadAnalytics, saveAnalytics } from '../automation-api';
import type { AbTest, AutomationAnalytics } from '../automation.types';

export default function AnalyticsPage() {
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [analytics, setAnalytics] = useState<AutomationAnalytics | null>(null);

    const load = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const { value } = await loadAnalytics(baseUrl, token);
            setAnalytics(value);
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, [baseUrl, token]);

    useEffect(() => {
        void load();
    }, [load]);

    const updateField = async (patch: Partial<AutomationAnalytics>) => {
        if (!token || !analytics) return;
        try {
            const next = { ...analytics, ...patch };
            await saveAnalytics(baseUrl, token, next);
            setAnalytics(next);
            SuccessToaster({ message: 'ذخیره شد' });
        } catch (e) {
            ErrorToaster(e);
        }
    };

    const addAbTest = async () => {
        if (!analytics || !token) return;
        const test: AbTest = {
            id: createAutomationId('ab'),
            name: 'تست A/B جدید',
            triggerId: '',
            variants: [
                { id: createAutomationId('v'), name: 'متن A', patternId: '', sent: 0, delivered: 0, conversions: 0 },
                { id: createAutomationId('v'), name: 'متن B', patternId: '', sent: 0, delivered: 0, conversions: 0 },
            ],
            isActive: true,
            createdAt: new Date().toISOString(),
        };
        await updateField({ abTests: [...analytics.abTests, test] });
    };

    if (loading || !analytics) return <LoadingState />;

    return (
        <Container>
            <Wrapper>
                <div className={`${parentStyles.container} ${parentStyles.rtl}`}>
                    <header className={parentStyles.header}>
                        <div>
                            <h1 className={parentStyles.mainTitle}>گزارشات و نرخ تبدیل</h1>
                            <p className={parentStyles.subtitle}>عملکرد SMS، ROI و تست‌های A/B</p>
                        </div>
                    </header>
                    <div className={parentStyles.statsBar}>
                        <div className={parentStyles.statCard}><div className={parentStyles.statValue}>{analytics.totalSent}</div><div className={parentStyles.statLabel}>کل ارسال</div></div>
                        <div className={parentStyles.statCard}><div className={parentStyles.statValue}>{analytics.totalDelivered}</div><div className={parentStyles.statLabel}>تحویل‌شده</div></div>
                        <div className={parentStyles.statCard}><div className={parentStyles.statValue}>{analytics.totalFailed}</div><div className={parentStyles.statLabel}>ناموفق</div></div>
                        <div className={parentStyles.statCard}><div className={parentStyles.statValue}>{analytics.roiPercent}%</div><div className={parentStyles.statLabel}>ROI</div></div>
                    </div>
                    <div className={parentStyles.formCard} style={{ marginBottom: '1.5rem' }}>
                        <h3 className={parentStyles.formSectionTitle}>آمار کلی (قابل ویرایش MVP)</h3>
                        <div className={parentStyles.field}>
                            <label>هزینه کل (تومان)</label>
                            <input type="number" value={analytics.totalCost} onChange={(e) => setAnalytics({ ...analytics, totalCost: Number(e.target.value) })} />
                        </div>
                        <div className={parentStyles.field}>
                            <label>تعداد تبدیل</label>
                            <input type="number" value={analytics.conversionCount} onChange={(e) => setAnalytics({ ...analytics, conversionCount: Number(e.target.value) })} />
                        </div>
                        <div className={parentStyles.field}>
                            <label>ROI (%)</label>
                            <input type="number" value={analytics.roiPercent} onChange={(e) => setAnalytics({ ...analytics, roiPercent: Number(e.target.value) })} />
                        </div>
                        <button type="button" className={parentStyles.primaryBtn} onClick={() => void updateField(analytics)}>ذخیره آمار</button>
                    </div>
                    <div className={parentStyles.formCard}>
                        <div className={parentStyles.header} style={{ marginBottom: '1rem' }}>
                            <h3 className={parentStyles.formSectionTitle} style={{ margin: 0, border: 0, padding: 0 }}>تست‌های A/B</h3>
                            <button type="button" className={parentStyles.secondaryBtn} onClick={() => void addAbTest()}>+ تست جدید</button>
                        </div>
                        <div className={styles.tableWrap}>
                            <table className={styles.dataTable}>
                                <thead>
                                    <tr>
                                        <th>نام تست</th>
                                        <th>متغیر</th>
                                        <th>ارسال</th>
                                        <th>تحویل</th>
                                        <th>تبدیل</th>
                                        <th>نرخ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {analytics.abTests.length === 0 ? (
                                        <tr><td colSpan={6} style={{ textAlign: 'center', opacity: 0.7 }}>تست A/B ثبت نشده</td></tr>
                                    ) : (
                                        analytics.abTests.flatMap((t) =>
                                            t.variants.map((v) => (
                                                <tr key={`${t.id}-${v.id}`}>
                                                    <td>{t.name}</td>
                                                    <td>{v.name}</td>
                                                    <td>{v.sent}</td>
                                                    <td>{v.delivered}</td>
                                                    <td>{v.conversions}</td>
                                                    <td>{v.sent > 0 ? `${Math.round((v.conversions / v.sent) * 100)}%` : '—'}</td>
                                                </tr>
                                            )),
                                        )
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </Wrapper>
        </Container>
    );
}
