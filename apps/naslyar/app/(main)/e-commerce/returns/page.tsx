'use client';

import ModuleGuide from '../components/ModuleGuide';
import { ECOMMERCE_GUIDES } from '../components/guides';

import React, { useCallback, useEffect, useState } from 'react';
import { Container, Wrapper } from '@/app/(main)/layout';
import { LoadingState } from '@my-workspace/components';
import { ErrorToaster, SuccessToaster, toFarsiNumber } from '@my-workspace/utils';
import styles from '../Ecommerce.module.scss';
import { fetchReturns, updateReturnStatus } from '../e-commerce-api';
import { EcReturnRequest, EcReturnStatus, RETURN_STATUS_LABELS, formatDate } from '../e-commerce.types';

const statusBadge: Record<EcReturnStatus, string> = {
    requested: styles.badgeWarning,
    approved: styles.badgeInfo,
    rejected: styles.badgeDanger,
    received: styles.badgeInfo,
    inspected: styles.badgeInfo,
    refunded: styles.badgeSuccess,
    cancelled: styles.badgeMuted,
};

/** گام‌های بعدی مجاز برای هر وضعیت (هم‌راستا با RMA بک‌اند) */
const NEXT_RETURN_STATUSES: Record<string, EcReturnStatus[]> = {
    requested: ['approved', 'rejected'],
    approved: ['received'],
    rejected: [],
    received: ['inspected', 'refunded'],
    inspected: ['refunded'],
    refunded: [],
    cancelled: [],
};

export default function ReturnsPage() {
    const [returns, setReturns] = useState<EcReturnRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const res: any = await fetchReturns(statusFilter ? { status: statusFilter } : undefined);
            setReturns(res?.returns || []);
        } catch (error) {
            ErrorToaster(error);
        } finally {
            setLoading(false);
        }
    }, [statusFilter]);

    useEffect(() => {
        load();
    }, [load]);

    const setStatus = async (request: EcReturnRequest, status: EcReturnStatus) => {
        const inspectionNote =
            status === 'inspected' ? window.prompt('نتیجه بازرسی را وارد کنید:') ?? '' : undefined;
        if (status === 'inspected' && inspectionNote === '') {
            // بازرسی بدون توضیح هم مجاز است
        }
        try {
            await updateReturnStatus(request._id, status, inspectionNote);
            SuccessToaster({ message: 'وضعیت درخواست بروزرسانی شد' });
            load();
        } catch (error) {
            ErrorToaster(error);
        }
    };

    return (
        <Container>
            <Wrapper>
                <div className={`${styles.container} ${styles.rtl}`}>
                    <header className={styles.header}>
                        <div>
                            <h1 className={styles.mainTitle}>مرجوعی‌ها (RMA)</h1>
                            <p className={styles.subtitle}>
                                مدیریت درخواست‌های مرجوعی — با «دریافت شده» کالا به انبار برمی‌گردد
                            </p>
                        </div>
                    </header>

                    <ModuleGuide guide={ECOMMERCE_GUIDES.returns} />

                    <div className={styles.toolbar}>
                        <select className={styles.selectInput} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                            <option value="">همه وضعیت‌ها</option>
                            {(Object.keys(RETURN_STATUS_LABELS) as EcReturnStatus[]).map((s) => (
                                <option key={s} value={s}>{RETURN_STATUS_LABELS[s]}</option>
                            ))}
                        </select>
                        <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>{toFarsiNumber(returns.length)} درخواست</span>
                    </div>

                    {loading ? (
                        <LoadingState />
                    ) : returns.length === 0 ? (
                        <div className={styles.emptyState}>درخواست مرجوعی‌ای ثبت نشده است.</div>
                    ) : (
                        <div className={styles.tableWrap}>
                            <table className={styles.dataTable}>
                                <thead>
                                    <tr>
                                        <th>شماره درخواست</th>
                                        <th>اقلام</th>
                                        <th>دلیل</th>
                                        <th>وضعیت</th>
                                        <th>تاریخ</th>
                                        <th>اقدام</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {returns.map((request) => (
                                        <tr key={request._id}>
                                            <td className={styles.cellLtr} style={{ fontWeight: 700 }}>{request.requestNumber}</td>
                                            <td>
                                                {(request.items || []).map((item, i) => (
                                                    <div key={i} style={{ fontSize: '0.8rem' }}>
                                                        {item.title} × {toFarsiNumber(item.quantity)}
                                                    </div>
                                                ))}
                                            </td>
                                            <td style={{ maxWidth: 220 }}>{request.reason || '—'}</td>
                                            <td>
                                                <span className={`${styles.badge} ${statusBadge[request.status]}`}>
                                                    {RETURN_STATUS_LABELS[request.status]}
                                                </span>
                                            </td>
                                            <td>{formatDate(request.createdAt)}</td>
                                            <td>
                                                <div className={styles.cellActions}>
                                                    {(NEXT_RETURN_STATUSES[request.status] || []).map((next) => (
                                                        <button key={next} className={styles.smallBtn} onClick={() => setStatus(request, next)}>
                                                            {RETURN_STATUS_LABELS[next]}
                                                        </button>
                                                    ))}
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
