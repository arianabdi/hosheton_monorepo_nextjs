'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import {
    LuTrash2,
    LuSend,
    LuPlay,
    LuClock,
    LuGlobe,
    LuLock,
    LuLayers,
    LuGitBranch,
    LuCalendar,
    LuEye,
    LuPencil,
} from 'react-icons/lu';
import { formatAppDate, formatAppNumber } from '@/app/lib/i18n/formatLocaleNumber';
import styles from './MyTemplatesList.module.scss';
import type { MediaTemplateStatus, MediaWorkflowTemplate } from '../types/media-api';

const STATUS_KEY: Record<MediaTemplateStatus, 'draft' | 'pending_review' | 'approved' | 'rejected'> = {
    draft: 'draft',
    pending: 'pending_review',
    approved: 'approved',
    rejected: 'rejected',
};

const STATUS_CLASS: Record<MediaTemplateStatus, string> = {
    draft: 'statusDraft',
    pending: 'statusPending',
    approved: 'statusApproved',
    rejected: 'statusRejected',
};

interface TemplateItemProps {
    template: MediaWorkflowTemplate;
    busy: boolean;
    onSubmitReview: () => void;
    onUse: () => void;
    onDelete: () => void;
}

export function TemplateItem({
    template,
    busy,
    onSubmitReview,
    onUse,
    onDelete,
}: TemplateItemProps) {
    const { t, i18n } = useTranslation('projects');
    const { t: tc } = useTranslation('common');
    const nodeCount = template.nodes?.length ?? 0;
    const edgeCount = template.edges?.length ?? 0;
    const lang = i18n.language;

    return (
        <div className={styles.templateCard}>
            <div className={styles.colTemplate}>
                <div className={styles.templateIdentity}>
                    <div className={styles.templateIcon}>
                        <LuLayers size={18} />
                    </div>
                    <div>
                        <h3>
                            {template.title}
                            {template.version ? ` ${t('version_paren', { version: formatAppNumber(template.version, lang) })}` : ''}
                        </h3>
                        <span className={`${styles.statusBadge} ${styles[STATUS_CLASS[template.status]]}`}>
                            {t(STATUS_KEY[template.status])}
                        </span>
                    </div>
                </div>
            </div>

            <div className={styles.colDescription}>
                <p className={styles.templateDesc}>
                    {template.description || t('no_desc')}
                </p>
                {template.status === 'rejected' && template.reviewNote && (
                    <div className={styles.reviewNote}>{t('reject_reason', { note: template.reviewNote })}</div>
                )}
            </div>

            <div className={styles.colWorkflow}>
                <div className={styles.workflowStat}>
                    <LuLayers size={15} />
                    <span>{formatAppNumber(nodeCount, lang)} Node</span>
                </div>
                <div className={styles.workflowStat}>
                    <LuGitBranch size={15} />
                    <span>{formatAppNumber(edgeCount, lang)} Edge</span>
                </div>
            </div>

            <div className={styles.colVisibility}>
                <span className={styles.visibilityTag}>
                    {template.visibility === 'public' ? (
                        <><LuGlobe size={14} /> {t('public')}</>
                    ) : (
                        <><LuLock size={14} /> {t('private')}</>
                    )}
                </span>
            </div>

            <div className={styles.colUsage}>
                <span className={styles.usageCount}>{formatAppNumber(template.usageCount ?? 0, lang)}</span>
                <span className={styles.usageLabel}>{t('usage_times')}</span>
            </div>

            <div className={styles.colDates}>
                <span className={styles.dateRow}>
                    <LuCalendar size={14} />
                    {t('created_on', { date: formatAppDate(template.createdAt, lang) })}
                </span>
                <span className={styles.dateRow}>
                    <LuClock size={14} />
                    {t('updated_on', { date: formatAppDate(template.updatedAt || template.createdAt, lang) })}
                </span>
            </div>

            <div className={styles.colActions}>
                <Link href={`/templates/${template._id}/view`} className={styles.useBtn}>
                    <LuEye size={14} /> {tc('view')}
                </Link>
                {template.kind === 'prompt' && template.status !== 'pending' && (
                    <Link href={`/templates/${template._id}/edit`} className={styles.reviewBtn}>
                        <LuPencil size={14} /> {tc('edit')}
                    </Link>
                )}
                {(template.status === 'draft' || template.status === 'rejected') && (
                    <button
                        type="button"
                        className={styles.reviewBtn}
                        disabled={busy}
                        onClick={onSubmitReview}
                    >
                        <LuSend size={14} /> {t('submit_review')}
                    </button>
                )}
                <button
                    type="button"
                    className={styles.useBtn}
                    disabled={busy}
                    onClick={onUse}
                >
                    <LuPlay size={14} /> {t('use')}
                </button>
                <button
                    type="button"
                    className={styles.deleteBtn}
                    disabled={busy}
                    onClick={onDelete}
                    title={tc('delete')}
                >
                    <LuTrash2 size={15} />
                </button>
            </div>

            <div className={styles.mobileMeta}>
                <span className={styles.visibilityTag}>
                    {template.visibility === 'public' ? <><LuGlobe size={13} /> {t('public')}</> : <><LuLock size={13} /> {t('private')}</>}
                </span>
                <span>{t('nodes_edges', { nodes: formatAppNumber(nodeCount, lang), edges: formatAppNumber(edgeCount, lang) })}</span>
                <span>{t('used_n', { count: formatAppNumber(template.usageCount ?? 0, lang) })}</span>
                <span><LuClock size={13} /> {formatAppDate(template.updatedAt || template.createdAt, lang)}</span>
            </div>

            <div className={styles.mobileActions}>
                <Link href={`/templates/${template._id}/view`} className={styles.useBtn}>
                    <LuEye size={14} /> {tc('view')}
                </Link>
                {template.kind === 'prompt' && template.status !== 'pending' && (
                    <Link href={`/templates/${template._id}/edit`} className={styles.reviewBtn}>
                        <LuPencil size={14} /> {tc('edit')}
                    </Link>
                )}
                {(template.status === 'draft' || template.status === 'rejected') && (
                    <button type="button" className={styles.reviewBtn} disabled={busy} onClick={onSubmitReview}>
                        <LuSend size={14} /> {t('submit_review')}
                    </button>
                )}
                <button type="button" className={styles.useBtn} disabled={busy} onClick={onUse}>
                    <LuPlay size={14} /> {t('create_project')}
                </button>
                <button type="button" className={styles.deleteBtn} disabled={busy} onClick={onDelete}>
                    <LuTrash2 size={15} />
                </button>
            </div>
        </div>
    );
}
