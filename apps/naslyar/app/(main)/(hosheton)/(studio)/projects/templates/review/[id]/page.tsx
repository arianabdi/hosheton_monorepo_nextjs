'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { LoadingState } from '@my-workspace/components';
import {
    templateReviewApi,
    type MediaWorkflowTemplate,
    type TemplateReviewChecklistItem,
} from '../../../../lib/template-review-api';
import { getHoshetonStudioTemplateViewUrl } from '../../../../lib/studio-template-url';
import TemplatePreviewThumb from '../../../../components/TemplatePreviewThumb';
import styles from '../../../../projects/nodes/Providers.module.scss';
import localStyles from '../TemplateForm.module.scss';

function formatDate(value?: string) {
    if (!value) return '—';
    try {
        return new Date(value).toLocaleString('fa-IR');
    } catch {
        return value;
    }
}

export default function TemplateReviewDetailPage() {
    const params = useParams();
    const router = useRouter();
    const templateId = String(params.id || '');

    const [template, setTemplate] = useState<MediaWorkflowTemplate | null>(null);
    const [checklistItems, setChecklistItems] = useState<TemplateReviewChecklistItem[]>([]);
    const [checkedIds, setCheckedIds] = useState<string[]>([]);
    const [reviewNote, setReviewNote] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const [data, checklist] = await Promise.all([
                templateReviewApi.getById(templateId),
                templateReviewApi.listReviewChecklistItems(),
            ]);
            setTemplate(data);
            setChecklistItems(checklist.items ?? []);
            setCheckedIds([]);
        } catch (error) {
            ErrorToaster(error);
        } finally {
            setLoading(false);
        }
    }, [templateId]);

    useEffect(() => {
        if (templateId) load();
    }, [templateId, load]);

    const allChecklistChecked =
        checklistItems.length > 0 && checklistItems.every((item) => checkedIds.includes(item._id));

    const toggleChecklistItem = (itemId: string) => {
        setCheckedIds((prev) =>
            prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId],
        );
    };

    const handleReview = async (status: 'approved' | 'rejected') => {
        if (status === 'approved' && !allChecklistChecked) {
            ErrorToaster({ message: 'برای تایید، همه موارد چک‌لیست باید تیک بخورند.' });
            return;
        }

        try {
            setSubmitting(true);
            await templateReviewApi.review(templateId, { status, reviewNote: reviewNote.trim() || undefined });
            SuccessToaster({ message: status === 'approved' ? 'قالب تایید و منتشر شد' : 'قالب رد شد' });
            router.push('/projects/templates/review');
        } catch (error) {
            ErrorToaster(error);
            setSubmitting(false);
        }
    };

    if (loading) return <LoadingState />;
    if (!template) return <div className={styles.card}>قالب یافت نشد.</div>;

    const isPending = template.status === 'pending';

    return (
        <div className={`${styles.container} ${styles.rtl}`}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.mainTitle}>بررسی قالب: {template.title}</h1>
                    <p className={styles.subtitle}>
                        {isPending ? 'جزئیات درخواست و تصمیم تایید/رد' : 'مشاهده جزئیات درخواست بررسی‌شده'}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <Link href={`/projects/templates/review/${templateId}/edit`} className={styles.primaryBtn}>
                        ویرایش قالب
                    </Link>
                    <a
                        href={getHoshetonStudioTemplateViewUrl(templateId)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.secondaryBtn}
                    >
                        مشاهده در استودیو
                    </a>
                    <Link href="/projects/templates/review" className={styles.secondaryBtn}>بازگشت به لیست</Link>
                </div>
            </header>

            <div className={styles.card}>
                <p><strong>نسخه:</strong> {template.version ?? 1}</p>
                <p><strong>وضعیت:</strong> {template.status}</p>
                <p><strong>توضیحات:</strong> {template.description || '—'}</p>
                <p><strong>نوع:</strong> {template.kind === 'prompt' ? 'Prompt' : 'Workflow'}</p>
                <p><strong>مدل‌ها:</strong> {(template.aiModels || []).join('، ') || '—'}</p>
                <p><strong>برچسب‌ها:</strong> {(template.tags || []).join('، ') || '—'}</p>
                <p><strong>Nodes/Edges:</strong> {(template.nodes?.length ?? 0)} / {(template.edges?.length ?? 0)}</p>
                <p><strong>ارسال:</strong> {formatDate(template.submittedAt)}</p>
                {template.reviewedAt && <p><strong>بررسی:</strong> {formatDate(template.reviewedAt)}</p>}
                {template.reviewNote && <p><strong>یادداشت بررسی:</strong> {template.reviewNote}</p>}

                {template.promptText && (
                    <div style={{ marginTop: '1rem' }}>
                        <strong>Prompt:</strong>
                        <pre style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>{template.promptText}</pre>
                    </div>
                )}

                {(template.previewMedia || []).length > 0 && (
                    <div style={{ marginTop: '1rem' }}>
                        <strong>پیش‌نمایش‌ها:</strong>
                        <div className={localStyles.mediaStrip} style={{ marginTop: 10 }}>
                            {template.previewMedia!.map((media, idx) => (
                                <TemplatePreviewThumb key={idx} media={media} />
                            ))}
                        </div>
                    </div>
                )}

                {isPending && (
                    <>
                        <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                                <strong>چک‌لیست بررسی</strong>
                                <Link href="/projects/templates/review/checklist" className={styles.secondaryBtn}>
                                    مدیریت آیتم‌ها
                                </Link>
                            </div>

                            {checklistItems.length === 0 ? (
                                <p className={styles.subtitle} style={{ marginTop: 12 }}>
                                    چک‌لیستی تعریف نشده. برای الزام تایید، از{' '}
                                    <Link href="/projects/templates/review/checklist">صفحه مدیریت چک‌لیست</Link>{' '}
                                    آیتم اضافه کنید.
                                </p>
                            ) : (
                                <ul style={{ listStyle: 'none', margin: '12px 0 0', padding: 0, display: 'grid', gap: 10 }}>
                                    {checklistItems.map((item) => (
                                        <li key={item._id}>
                                            <label
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'flex-start',
                                                    gap: 10,
                                                    cursor: 'pointer',
                                                    padding: '10px 12px',
                                                    border: '1px solid var(--border-color)',
                                                    borderRadius: 8,
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={checkedIds.includes(item._id)}
                                                    onChange={() => toggleChecklistItem(item._id)}
                                                    style={{ marginTop: 4 }}
                                                />
                                                <span>{item.label}</span>
                                            </label>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div style={{ marginTop: '1.25rem' }}>
                            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>یادداشت بررسی (اختیاری)</label>
                            <textarea
                                rows={4}
                                value={reviewNote}
                                onChange={(e) => setReviewNote(e.target.value)}
                                placeholder="در صورت رد، دلیل را بنویسید"
                                style={{ width: '100%', borderRadius: 8, padding: 10, border: '1px solid var(--border-color)' }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
                            <button
                                type="button"
                                className={styles.primaryBtn}
                                disabled={submitting || !allChecklistChecked}
                                onClick={() => handleReview('approved')}
                                title={
                                    !allChecklistChecked
                                        ? checklistItems.length === 0
                                            ? 'ابتدا آیتم‌های چک‌لیست را تعریف کنید'
                                            : 'همه موارد چک‌لیست باید تیک بخورند'
                                        : undefined
                                }
                            >
                                تایید و انتشار
                            </button>
                            <button
                                type="button"
                                className={styles.secondaryBtn}
                                disabled={submitting}
                                onClick={() => handleReview('rejected')}
                            >
                                رد درخواست
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
