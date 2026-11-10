'use client';

import { useCallback, useEffect, useState } from 'react';
import { Pagination } from '@my-workspace/components';
import { useTranslation } from 'react-i18next';
import { formatAppDate, formatAppNumber } from '@/app/lib/i18n/formatLocaleNumber';
import { isRtlLanguage } from '@/app/lib/i18n/config';
import { LuEye } from 'react-icons/lu';
import Link from 'next/link';
import { mediaApi } from '@/app/(developers)/projects/lib/media-api';
import { getApiErrorMessage } from '@/app/(developers)/projects/lib/api-client';
import type { MediaWorkflowTemplate } from '@/app/(developers)/projects/types/media-api';
import pageStyles from '@/app/(developers)/projects/ProjectsPage.module.scss';
import styles from '../TemplatesHub.module.scss';
import { usePageLoading } from '@/app/components/PageTransition';

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

const STATUS_TABS: { id: StatusFilter; key: string }[] = [
    { id: 'all', key: 'all' },
    { id: 'pending', key: 'pending' },
    { id: 'approved', key: 'approved' },
    { id: 'rejected', key: 'rejected' },
];

const STATUS_KEYS: Record<string, string> = {
    pending: 'pending_review',
    approved: 'approved',
    rejected: 'rejected',
};

function statusClass(status: string, stylesMap: typeof styles) {
    if (status === 'approved') return stylesMap.statusApproved;
    if (status === 'rejected') return stylesMap.statusRejected;
    return stylesMap.statusPending;
}

export default function TemplateReviewRequestsPage() {
    const { t, i18n } = useTranslation('templates');
    const { t: tc } = useTranslation('common');
    const { t: tp } = useTranslation('projects');
    const [items, setItems] = useState<MediaWorkflowTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    usePageLoading(loading);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [pagination, setPagination] = useState({
        itemPerPage: 8,
        currentPage: 1,
        totalItems: 0,
        lastUpdateBy: '',
    });

    const load = useCallback(async (updater: string) => {
        setLoading(true);
        setError(null);
        try {
            const res = await mediaApi.listReviewRequests({
                status: statusFilter,
                page: pagination.currentPage,
                limit: pagination.itemPerPage,
            });
            setItems(res.templates ?? []);
            setPagination((prev) => ({
                ...prev,
                totalItems: res.total ?? 0,
                ...(updater === 'filter' ? { currentPage: 1, lastUpdateBy: updater } : { lastUpdateBy: updater }),
            }));
        } catch (err) {
            setError(getApiErrorMessage(err, t('load_requests_error')));
        } finally {
            setLoading(false);
        }
    }, [statusFilter, pagination.currentPage, pagination.itemPerPage, t]);

    useEffect(() => {
        load('pagination');
    }, [statusFilter, pagination.currentPage, pagination.itemPerPage]);

    const handleStatusChange = (status: StatusFilter) => {
        setStatusFilter(status);
        setPagination((prev) => ({ ...prev, currentPage: 1, lastUpdateBy: 'filter' }));
    };

    return (
        <>
            <div className={styles.filterTabs}>
                {STATUS_TABS.map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        className={`${styles.filterTab} ${statusFilter === tab.id ? styles.filterTabActive : ''}`}
                        onClick={() => handleStatusChange(tab.id)}
                    >
                        {t(tab.key)}
                    </button>
                ))}
            </div>

            {error && <div className={styles.error}>{error}</div>}

            {loading ? (
                <p className={pageStyles.emptyState}>{tc('loading')}</p>
            ) : items.length === 0 ? (
                <p className={pageStyles.emptyState}>{t('no_requests_filter')}</p>
            ) : (
                <>
                    <div className={styles.reviewList}>
                        {items.map((item) => (
                            <article key={item._id} className={styles.reviewCard}>
                                <div className={styles.reviewHeader}>
                                    <div>
                                        <h2 className={styles.reviewTitle}>{item.title}</h2>
                                        <p className={styles.reviewDescription}>{item.description || tp('no_desc')}</p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                        <span className={`${styles.statusBadge} ${statusClass(item.status, styles)}`}>
                                            {t(STATUS_KEYS[item.status] || item.status)}
                                        </span>
                                        <Link href={`/templates/${item._id}/view`} className={styles.secondaryBtn}>
                                            <LuEye size={14} /> {tc('view')}
                                        </Link>
                                    </div>
                                </div>

                                <div className={styles.reviewMeta}>
                                    <div className={styles.metaItem}>
                                        <span className={styles.metaLabel}>{t('col_version')}</span>
                                        <span className={styles.metaValue}>{formatAppNumber(item.version ?? 1, i18n.language)}</span>
                                    </div>
                                    <div className={styles.metaItem}>
                                        <span className={styles.metaLabel}>{t('col_kind')}</span>
                                        <span className={styles.metaValue}>{item.kind === 'prompt' ? 'Prompt' : 'Workflow'}</span>
                                    </div>
                                    <div className={styles.metaItem}>
                                        <span className={styles.metaLabel}>{t('submitted')}</span>
                                        <span className={styles.metaValue}>{formatAppDate(item.submittedAt, i18n.language)}</span>
                                    </div>
                                    <div className={styles.metaItem}>
                                        <span className={styles.metaLabel}>{t('reviewed')}</span>
                                        <span className={styles.metaValue}>{formatAppDate(item.reviewedAt, i18n.language)}</span>
                                    </div>
                                </div>

                                {item.reviewNote && (
                                    <div className={styles.reviewNoteBox}>
                                        <strong>{t('admin_note')}</strong> {item.reviewNote}
                                    </div>
                                )}
                            </article>
                        ))}
                    </div>

                    <div className={styles.listFooter}>
                        <span className={styles.totalCount}>
                            {t('requests_n', { count: formatAppNumber(pagination.totalItems, i18n.language) })}
                        </span>
                        <Pagination
                            itemPerPage={pagination.itemPerPage}
                            currentPage={pagination.currentPage}
                            totalItems={pagination.totalItems}
                            rtl={isRtlLanguage(i18n.language)}
                            paginate={(pageNumber) =>
                                setPagination((prev) => ({ ...prev, currentPage: pageNumber, lastUpdateBy: 'pagination' }))
                            }
                            setRowsPerPage={(rows) =>
                                setPagination((prev) => ({
                                    ...prev,
                                    itemPerPage: rows,
                                    currentPage: 1,
                                    lastUpdateBy: 'pagination',
                                }))
                            }
                        />
                    </div>
                </>
            )}
        </>
    );
}
