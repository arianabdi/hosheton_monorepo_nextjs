'use client';

import ModuleGuide from '../components/ModuleGuide';
import { ECOMMERCE_GUIDES } from '../components/guides';

import React, { useCallback, useEffect, useState } from 'react';
import { Container, Wrapper } from '@/app/(main)/layout';
import { LoadingState } from '@my-workspace/components';
import { ErrorToaster, SuccessToaster, toFarsiNumber } from '@my-workspace/utils';
import styles from '../Ecommerce.module.scss';
import { deleteReview, fetchReviews, updateReviewStatus } from '../e-commerce-api';
import { EcReview, REVIEW_STATUS_LABELS } from '../e-commerce.types';

const statusBadge: Record<EcReview['status'], string> = {
    pending: styles.badgeWarning,
    approved: styles.badgeSuccess,
    rejected: styles.badgeDanger,
};

export default function ReviewsPage() {
    const [reviews, setReviews] = useState<EcReview[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const res: any = await fetchReviews(statusFilter ? { status: statusFilter } : undefined);
            setReviews(res?.reviews || []);
        } catch (error) {
            ErrorToaster(error);
        } finally {
            setLoading(false);
        }
    }, [statusFilter]);

    useEffect(() => {
        load();
    }, [load]);

    const setStatus = async (review: EcReview, status: string) => {
        try {
            await updateReviewStatus(review._id, status);
            SuccessToaster({ message: 'وضعیت دیدگاه بروزرسانی شد' });
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
                            <h1 className={styles.mainTitle}>دیدگاه‌های محصولات</h1>
                            <p className={styles.subtitle}>بررسی و تایید نظرات ثبت‌شده توسط مشتریان</p>
                        </div>
                    </header>

                    <ModuleGuide guide={ECOMMERCE_GUIDES.reviews} />

                    <div className={styles.toolbar}>
                        <select className={styles.selectInput} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                            <option value="">همه</option>
                            {(Object.keys(REVIEW_STATUS_LABELS) as EcReview['status'][]).map((s) => (
                                <option key={s} value={s}>{REVIEW_STATUS_LABELS[s]}</option>
                            ))}
                        </select>
                        <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>{toFarsiNumber(reviews.length)} دیدگاه</span>
                    </div>

                    {loading ? (
                        <LoadingState />
                    ) : reviews.length === 0 ? (
                        <div className={styles.emptyState}>دیدگاهی یافت نشد.</div>
                    ) : (
                        <div className={styles.tableWrap}>
                            <table className={styles.dataTable}>
                                <thead>
                                    <tr>
                                        <th>امتیاز</th>
                                        <th>دیدگاه</th>
                                        <th>وضعیت</th>
                                        <th>تاریخ</th>
                                        <th>عملیات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reviews.map((review) => (
                                        <tr key={review._id}>
                                            <td>
                                                <span style={{ color: '#f59e0b', fontWeight: 700 }}>
                                                    {'★'.repeat(review.rating)}
                                                    <span style={{ opacity: 0.3 }}>{'★'.repeat(5 - review.rating)}</span>
                                                </span>
                                                <div style={{ fontSize: '0.72rem', opacity: 0.6 }}>{toFarsiNumber(review.rating)} از ۵</div>
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{review.title || 'بدون عنوان'}</div>
                                                <div style={{ fontSize: '0.8rem', opacity: 0.8, marginTop: '0.25rem' }}>{review.comment}</div>
                                                <div className={styles.cellLtr} style={{ fontSize: '0.7rem', opacity: 0.5, marginTop: '0.25rem' }}>
                                                    {review.productId}
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`${styles.badge} ${statusBadge[review.status]}`}>
                                                    {REVIEW_STATUS_LABELS[review.status]}
                                                </span>
                                            </td>
                                            <td>{toFarsiNumber(new Date(review.createdAt || '').toLocaleDateString('fa-IR'))}</td>
                                            <td>
                                                <div className={styles.cellActions}>
                                                    {review.status !== 'approved' && (
                                                        <button className={styles.smallBtn} onClick={() => setStatus(review, 'approved')}>تایید</button>
                                                    )}
                                                    {review.status !== 'rejected' && (
                                                        <button className={styles.smallBtn} onClick={() => setStatus(review, 'rejected')}>رد</button>
                                                    )}
                                                    <button
                                                        className={styles.deleteBtn}
                                                        onClick={async () => {
                                                            if (!window.confirm('این دیدگاه حذف شود؟')) return;
                                                            try {
                                                                await deleteReview(review._id);
                                                                SuccessToaster({ message: 'حذف شد' });
                                                                load();
                                                            } catch (error) {
                                                                ErrorToaster(error);
                                                            }
                                                        }}
                                                    >
                                                        حذف
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
