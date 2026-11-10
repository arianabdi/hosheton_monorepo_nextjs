'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LuPlus, LuRefreshCw } from 'react-icons/lu';
import { ErrorToaster, SuccessToaster, toFarsiNumber } from '@my-workspace/utils';
import { LoadingState, Pagination } from '@my-workspace/components';
import SimpleLineTabs from '@/app/components/SimpleLineTabs/SimpleLineTabs';
import { templateReviewApi, type MediaWorkflowTemplate } from '../../../lib/template-review-api';
import { getCoverMedia, mediaThumbSrc } from '../../../lib/template-media';
import { getHoshetonStudioTemplateViewUrl } from '../../../lib/studio-template-url';
import HrRowActionMenu from '@/app/(main)/management/hr/components/HrRowActionMenu';
import TemplatesGuide from './TemplatesGuide';
import styles from '../../../projects/nodes/Providers.module.scss';
import localStyles from './TemplateForm.module.scss';

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'draft';

const STATUS_OPTIONS: { id: StatusFilter; label: string }[] = [
    { id: 'all', label: 'همه' },
    { id: 'pending', label: 'در انتظار' },
    { id: 'approved', label: 'تایید شده' },
    { id: 'rejected', label: 'رد شده' },
    { id: 'draft', label: 'پیش‌نویس' },
];

const STATUS_LABEL: Record<string, string> = {
    pending: 'در انتظار',
    approved: 'تایید شده',
    rejected: 'رد شده',
    draft: 'پیش‌نویس',
};

function formatDate(value?: string) {
    if (!value) return '—';
    try {
        return new Intl.DateTimeFormat('fa-IR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }).format(new Date(value));
    } catch {
        return value;
    }
}

function ellipsize(value?: string, max = 36) {
    const text = (value || '').trim();
    if (!text) return '—';
    return text.length > max ? `${text.slice(0, max)}…` : text;
}

export default function TemplateReviewListPage({ embedded = false }: { embedded?: boolean }) {
    const router = useRouter();
    const [items, setItems] = useState<MediaWorkflowTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [pagination, setPagination] = useState({
        itemPerPage: 10,
        currentPage: 1,
        totalItems: 0,
        lastUpdateBy: '',
    });

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const res = await templateReviewApi.listReviewQueue({
                status: statusFilter,
                page: pagination.currentPage,
                limit: pagination.itemPerPage,
            });
            setItems(res.templates ?? []);
            setPagination((prev) => ({
                ...prev,
                totalItems: res.total ?? 0,
                lastUpdateBy: 'pagination',
            }));
        } catch (error) {
            setItems([]);
            ErrorToaster(error);
        } finally {
            setLoading(false);
        }
    }, [statusFilter, pagination.currentPage, pagination.itemPerPage]);

    useEffect(() => {
        load();
    }, [load]);

    const handleStatusChange = (status: StatusFilter) => {
        setStatusFilter(status);
        setPagination((prev) => ({ ...prev, currentPage: 1, lastUpdateBy: 'filter' }));
    };

    const handleDeleteTemplate = async (item: MediaWorkflowTemplate) => {
        if (deletingId) return;
        if (!window.confirm(`قالب «${item.title}» و تمام تصاویر آن از فضای ذخیره‌سازی حذف شود؟`)) return;
        try {
            setDeletingId(item._id);
            await templateReviewApi.adminRemove(item._id);
            SuccessToaster({ message: 'قالب حذف شد.' });
            await load();
        } catch {
            ErrorToaster({ message: 'حذف ناموفق' });
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className={`${styles.container} ${styles.rtl}`}>
            {!embedded && (
                <header className={styles.header}>
                    <div>
                        <h1 className={styles.mainTitle}>قالب‌ها</h1>
                        <p className={styles.subtitle}>
                            فهرست قالب‌ها. با افزودن قالب می‌توانید مستقیم منتشر کنید.
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                        <Link href="/projects/templates/review/featured" className={styles.secondaryBtn}>
                            قالب‌های منتخب چت
                        </Link>
                        <Link href="/projects/templates/review/new" className={styles.primaryBtn}>
                            <LuPlus size={16} /> افزودن قالب
                        </Link>
                        <button type="button" className={styles.secondaryBtn} onClick={() => load()}>
                            <LuRefreshCw size={16} /> بروزرسانی
                        </button>
                    </div>
                </header>
            )}

            {!embedded && <TemplatesGuide />}

            {embedded && (
                <div className={styles.tableToolbar}>
                    <Link href="/projects/templates/review/new" className={styles.primaryBtn}>
                        <LuPlus size={16} /> افزودن قالب
                    </Link>
                    <button type="button" className={styles.secondaryBtn} onClick={() => load()}>
                        <LuRefreshCw size={16} /> بروزرسانی
                    </button>
                </div>
            )}

            <SimpleLineTabs
                tabs={STATUS_OPTIONS}
                activeTab={statusFilter}
                onChange={(id) => handleStatusChange(id as StatusFilter)}
            />

            {loading ? (
                <LoadingState />
            ) : items.length === 0 ? (
                <div className={styles.emptyStateBox}>قالبی با این فیلتر یافت نشد.</div>
            ) : (
                <div className={styles.tableWrapper}>
                    <table className={`${styles.table} ${styles.compactTable}`}>
                        <thead>
                            <tr>
                                <th className={localStyles.listCoverCell}></th>
                                <th>عنوان</th>
                                <th>نسخه</th>
                                <th>وضعیت</th>
                                <th>نوع</th>
                                <th>مدل‌ها</th>
                                <th>ارسال</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item) => {
                                const cover = getCoverMedia(item.previewMedia);
                                const coverSrc = cover ? mediaThumbSrc(cover) : '';
                                return (
                                    <tr key={item._id}>
                                        <td className={localStyles.listCoverCell}>
                                            <div className={`${localStyles.listCover} ${coverSrc ? '' : localStyles.listCoverEmpty}`}>
                                                {coverSrc ? (
                                                    cover?.type === 'video' ? (
                                                        <video src={coverSrc} muted playsInline preload="metadata" />
                                                    ) : (
                                                        <img src={coverSrc} alt={item.title} />
                                                    )
                                                ) : null}
                                            </div>
                                        </td>
                                        <td className={styles.ellipsisCell} title={item.title}>{ellipsize(item.title, 40)}</td>
                                        <td>{item.version ? toFarsiNumber(String(item.version)) : '—'}</td>
                                        <td>{STATUS_LABEL[item.status] || item.status}</td>
                                        <td>{item.kind === 'prompt' ? 'Prompt' : 'Workflow'}</td>
                                        <td className={styles.ellipsisCell} title={(item.aiModels || []).join('، ')}>
                                            {ellipsize((item.aiModels || []).join('، '), 28)}
                                        </td>
                                        <td>{formatDate(item.submittedAt || item.createdAt)}</td>
                                        <td>
                                            <HrRowActionMenu
                                                rowId={item._id}
                                                items={[
                                                    {
                                                        label: item.status === 'pending' ? 'بررسی' : 'جزئیات',
                                                        onClick: () => router.push(`/projects/templates/review/${item._id}`),
                                                    },
                                                    {
                                                        label: 'ویرایش',
                                                        onClick: () => router.push(`/projects/templates/review/${item._id}/edit`),
                                                    },
                                                    {
                                                        label: 'مشاهده در استودیو',
                                                        onClick: () => window.open(getHoshetonStudioTemplateViewUrl(item._id), '_blank', 'noopener,noreferrer'),
                                                    },
                                                    {
                                                        label: 'حذف (قالب)',
                                                        danger: true,
                                                        onClick: () => void handleDeleteTemplate(item),
                                                    },
                                                ]}
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <p className={styles.subtitle} style={{ margin: 0 }}>
                    {toFarsiNumber(pagination.totalItems)} مورد
                </p>
                <Pagination
                    itemPerPage={pagination.itemPerPage}
                    currentPage={pagination.currentPage}
                    totalItems={pagination.totalItems}
                    rtl
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
        </div>
    );
}
