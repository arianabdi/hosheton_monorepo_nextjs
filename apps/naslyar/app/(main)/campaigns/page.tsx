'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { LuPencil, LuPlay, LuPlus, LuTrash2 } from 'react-icons/lu';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { LoadingState } from '@my-workspace/components';
import { Container, Wrapper } from '@/app/(main)/layout';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { isoToJalaliString } from '@/app/(main)/accounting/jalali.client';
import {
    CAMPAIGN_FLOW_STATUS_LABELS,
    CAMPAIGN_TRIGGER_TYPE_LABELS,
    type CampaignFlow,
} from './campaigns.types';
import { deleteFlow, listFlows } from './campaigns-api';
import CampaignSectionNav from './components/CampaignSectionNav';
import CampaignsGuide from './components/CampaignsGuide';
import parentStyles from '../marketing/Marketing.module.scss';
import styles from './Campaigns.module.scss';

export default function CampaignsPage() {
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();

    const [flows, setFlows] = useState<CampaignFlow[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            setFlows(await listFlows(baseUrl, token));
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, [baseUrl, token]);

    useEffect(() => {
        void load();
    }, [load]);

    const handleDelete = async (flow: CampaignFlow) => {
        if (!confirm(`کمپین «${flow.name}» حذف شود؟`)) return;
        try {
            await deleteFlow(baseUrl, token!, flow._id);
            SuccessToaster({ message: 'کمپین حذف شد' });
            await load();
        } catch (e) {
            ErrorToaster(e);
        }
    };

    if (loading && flows.length === 0) return <LoadingState />;

    return (
        <Container>
            <Wrapper>
                <div className={`${parentStyles.container} ${parentStyles.rtl}`}>
                    <header className={parentStyles.header}>
                        <div>
                            <h1 className={parentStyles.mainTitle}>کمپین‌ها</h1>
                            <p className={parentStyles.subtitle}>
                                فلو خودکار پیامک، کیف پول، تخفیف و شرط — مستقل از بنرها
                            </p>
                        </div>
                        <Link href="/campaigns/new" className={parentStyles.primaryBtn}>
                            <LuPlus /> کمپین جدید
                        </Link>
                    </header>

                    <CampaignSectionNav />

                    <CampaignsGuide />

                    {flows.length === 0 ? (
                        <div className={styles.emptyState}>
                            هنوز کمپینی نساخته‌اید —
                            {' '}<Link href="/campaigns/new">اولین فلو را بچینید</Link>
                        </div>
                    ) : (
                        <div className={styles.tableWrap}>
                            <table className={styles.dataTable}>
                                <thead>
                                    <tr>
                                        <th>نام</th>
                                        <th>تریگر</th>
                                        <th>تعداد نودها</th>
                                        <th>وضعیت</th>
                                        <th>آخرین به‌روزرسانی</th>
                                        <th>عملیات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {flows.map((flow) => (
                                        <tr key={flow._id}>
                                            <td data-label="نام" style={{ fontWeight: 600 }}>
                                                {flow.name}
                                                {flow.description && (
                                                    <div style={{ fontSize: '0.72rem', opacity: 0.6 }}>
                                                        {flow.description}
                                                    </div>
                                                )}
                                            </td>
                                            <td data-label="تریگر">
                                                {CAMPAIGN_TRIGGER_TYPE_LABELS[flow.triggerType]}
                                                {flow.triggerType === 'event' && flow.triggerEvent && (
                                                    <span className={styles.keyBadge} style={{ marginRight: '0.4rem' }}>
                                                        {flow.triggerEvent}
                                                    </span>
                                                )}
                                            </td>
                                            <td data-label="تعداد نودها">{flow.nodes?.length || 0}</td>
                                            <td data-label="وضعیت">
                                                <span className={`${styles.statusBadge} ${styles[flow.status] || ''}`}>
                                                    {CAMPAIGN_FLOW_STATUS_LABELS[flow.status]}
                                                </span>
                                            </td>
                                            <td data-label="آخرین به‌روزرسانی" className={styles.muted}>{isoToJalaliString(flow.updatedAt)}</td>
                                            <td data-label="عملیات">
                                                <div className={styles.inlineActions}>
                                                    <Link
                                                        href={`/campaigns/${flow._id}/edit`}
                                                        className={styles.smallBtn}
                                                        style={{ textDecoration: 'none' }}
                                                    >
                                                        <LuPencil /> ویرایش
                                                    </Link>
                                                    <Link
                                                        href={`/campaigns/runs?flowId=${flow._id}`}
                                                        className={styles.smallBtn}
                                                        style={{ textDecoration: 'none' }}
                                                    >
                                                        <LuPlay /> اجراها
                                                    </Link>
                                                    <button
                                                        type="button"
                                                        className={parentStyles.deleteBtn}
                                                        onClick={() => handleDelete(flow)}
                                                    >
                                                        <LuTrash2 /> حذف
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </Wrapper>
        </Container>
    );
}
