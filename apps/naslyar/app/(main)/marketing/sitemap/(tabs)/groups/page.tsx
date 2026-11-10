'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LuExternalLink, LuPencil, LuPlus, LuRefreshCw, LuTrash2 } from 'react-icons/lu';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { useSitemap, useSitemapData } from '../../lib/SitemapProvider';
import { EmptyState, SectionIntro, SectionLoading } from '../../components/fields';
import ConfirmDialog from '@/app/components/ConfirmDialog/ConfirmDialog';
import { sitemapHref } from '../../lib/sections';
import { formatNumber } from '../../lib/format';
import { HEALTH_LABELS, LASTMOD_FIELD_LABELS, SOURCE_LABELS } from '../../lib/sitemap.types';
import type { GroupStat } from '../../lib/sitemap.types';
import type { SitemapApi } from '../../lib/sitemap-api';
import parentStyles from '../../../Marketing.module.scss';
import styles from '../../Sitemap.module.scss';

const loadGroups = (api: SitemapApi) => api.getOverview().then((overview) => overview.groups);

/** گروه‌های سایت‌مپ — هر گروه یک منبع محتوایی را با الگوی URL مشخص منتشر می‌کند */
export default function SitemapGroupsPage() {
    const { api, invalidate } = useSitemap();
    const { data: groups, loading } = useSitemapData(loadGroups);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<GroupStat | null>(null);

    const onRegenerate = async (group: GroupStat) => {
        if (!api) return;
        try {
            setBusyId(group._id);
            const result = await api.regenerateGroup(group._id);
            SuccessToaster({ message: `گروه «${group.title}» با ${formatNumber(result.urlsCount)} URL بازتولید شد.` });
            invalidate();
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setBusyId(null);
        }
    };

    const onDelete = async () => {
        if (!api || !deleting) return;
        try {
            setBusyId(deleting._id);
            await api.deleteGroup(deleting._id);
            SuccessToaster({ message: `گروه «${deleting.title}» حذف شد.` });
            setDeleting(null);
            invalidate();
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setBusyId(null);
        }
    };

    return (
        <>
            <SectionIntro topic="groups">
                هر گروه یک نوع محتوا (قالب‌ها، سازنده‌ها، صفحات ثابت…) را با یک الگوی URL به فایل‌های سایت‌مپ تبدیل
                می‌کند. خاموش‌کردن گروه فقط آن را از سایت‌مپ برمی‌دارد و به خود محتوا دست نمی‌زند.
            </SectionIntro>

            <div className={styles.blockHeader}>
                <h2 className={styles.blockTitle}>فهرست گروه‌ها</h2>
                <Link href={sitemapHref.newGroup} className={parentStyles.primaryBtn}>
                    <LuPlus /> گروه جدید
                </Link>
            </div>

            {!groups ? (
                loading ? <SectionLoading /> : <EmptyState>فهرست گروه‌ها دریافت نشد.</EmptyState>
            ) : groups.length === 0 ? (
                <EmptyState>
                    گروهی ثبت نشده — <Link href={sitemapHref.newGroup}>اولین گروه را بسازید</Link>.
                </EmptyState>
            ) : (
                <div className={styles.tableWrap}>
                    <table className={styles.dataTable}>
                        <thead>
                            <tr>
                                <th>گروه</th>
                                <th>منبع و الگوی URL</th>
                                <th>lastmod</th>
                                <th>URLها</th>
                                <th>سلامت</th>
                                <th>عملیات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {groups.map((g) => (
                                <tr key={g._id}>
                                    <td data-label="گروه">
                                        <strong>{g.title}</strong>
                                        <div className={styles.muted}>{g.name}</div>
                                    </td>
                                    <td data-label="منبع و الگوی URL">
                                        <div>{SOURCE_LABELS[g.source] || g.source}</div>
                                        <span className={styles.keyBadge}>{g.urlPattern}</span>
                                    </td>
                                    <td data-label="lastmod" className={styles.muted}>
                                        {LASTMOD_FIELD_LABELS[g.lastmodField] || g.lastmodField}
                                    </td>
                                    <td data-label="URLها" className={styles.numCell}>
                                        {g.enabled ? (
                                            <>
                                                {formatNumber(g.urlsCount)}
                                                <div className={styles.muted}>{formatNumber(g.fileCount)} فایل</div>
                                            </>
                                        ) : (
                                            '—'
                                        )}
                                    </td>
                                    <td data-label="سلامت">
                                        <span className={`${styles.healthBadge} ${styles[g.health]}`}>
                                            {HEALTH_LABELS[g.health]}
                                            {g.issueCount > 0 ? ` (${formatNumber(g.issueCount)})` : ''}
                                        </span>
                                    </td>
                                    <td data-label="عملیات">
                                        <div className={styles.toolbarActions}>
                                            <Link href={sitemapHref.editGroup(g._id)} className={styles.smallBtn}>
                                                <LuPencil /> ویرایش
                                            </Link>
                                            <button
                                                type="button"
                                                className={styles.smallBtn}
                                                disabled={busyId === g._id || !g.enabled}
                                                onClick={() => onRegenerate(g)}
                                            >
                                                <LuRefreshCw /> تولید
                                            </button>
                                            {api && g.fileCount > 0 && (
                                                <a
                                                    href={api.publicPreviewUrl(`${g.name}-1.xml`)}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className={styles.smallBtn}
                                                >
                                                    <LuExternalLink /> XML
                                                </a>
                                            )}
                                            <button
                                                type="button"
                                                className={styles.smallBtn}
                                                disabled={busyId === g._id}
                                                onClick={() => setDeleting(g)}
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

            <ConfirmDialog
                open={!!deleting}
                title="حذف گروه سایت‌مپ"
                tone="danger"
                confirmLabel="حذف گروه"
                busy={!!deleting && busyId === deleting._id}
                onConfirm={onDelete}
                onClose={() => setDeleting(null)}
            >
                گروه «{deleting?.title}» و فایل‌هایش از ایندکس سایت‌مپ حذف می‌شوند. خود محتوا دست‌نخورده می‌ماند و
                بعداً می‌توانید گروهی با همین شناسه دوباره بسازید.
            </ConfirmDialog>
        </>
    );
}
