'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TbCopy, TbKey, TbPencil, TbPlus, TbTrash, TbWorld } from 'react-icons/tb';
import { ErrorToaster, SuccessToaster, toFarsiNumber } from '@my-workspace/utils';
import { LoadingState } from '@my-workspace/components';
import TableEmptyState from '@/app/(main)/components/TableEmptyState';
import SortHeader from '@/app/components/SortHeader/SortHeader';
import TableSearch from '@/app/components/TableSearch/TableSearch';
import { useUrlTableState } from '@/app/hooks/useUrlTableState';
import ProjectsGuide from '../../components/ProjectsGuide';
import RowActionsMenu from '../../components/RowActionsMenu';
import TabIntro from '../../components/TabIntro';
import { useErrorTracking } from '../../lib/ErrorTrackingProvider';
import { fullDate, relativeTime } from '../../lib/format';
import { deleteProject, rotateProjectKey } from '../../error-tracking-api';
import { EtrProject } from '../../error-tracking.types';
import styles from '../../ErrorTracking.module.scss';

const PLATFORM_LABELS: Record<string, string> = {
    node: 'Node.js',
    browser: 'مرورگر',
    react: 'React',
    nextjs: 'Next.js',
    worker: 'Worker / Queue',
};

const ENV_CLASS: Record<string, string> = {
    production: styles.envProduction,
    staging: styles.envStaging,
    development: styles.envDevelopment,
};

/** کلید طولانی را کوتاه نشان می‌دهد؛ مقدار کامل با کپی و title در دسترس است */
const shortKey = (key: string) => (key.length > 18 ? `${key.slice(0, 8)}…${key.slice(-6)}` : key);

export default function ErrorTrackingProjectsPage() {
    const router = useRouter();
    // پروژه‌ها در layout ماژول یک‌بار خوانده می‌شوند و بین تب‌ها مشترک‌اند
    const { baseUrl, token, projects, projectsLoaded, reloadProjects } = useErrorTracking();
    const loading = !projectsLoaded;
    // فهرست پروژه‌ها کوچک و کامل در Provider است — جستجو/مرتب‌سازی سمت کلاینت
    const table = useUrlTableState('pr_', { sort: 'createdAt', filters: { environment: '' } });

    const environments = useMemo(
        () => Array.from(new Set(projects.map((p) => p.environment).filter(Boolean))).sort(),
        [projects],
    );

    const rows = useMemo(() => {
        const q = table.search.trim().toLowerCase();
        const list = projects.filter((p) => {
            if (table.filters.environment && p.environment !== table.filters.environment) return false;
            if (!q) return true;
            return [p.name, p.slug, p.description, p.publicKey, p.platform].some((v) => v?.toLowerCase().includes(q));
        });
        const sign = table.dir === 'asc' ? 1 : -1;
        return [...list].sort((a, b) => {
            if (table.sort === 'name') return sign * a.name.localeCompare(b.name, 'fa');
            if (table.sort === 'rateLimit') return sign * (a.rateLimitPerMinute - b.rateLimitPerMinute);
            return sign * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        });
    }, [projects, table.search, table.filters.environment, table.sort, table.dir]);

    const handleRotate = async (project: EtrProject) => {
        if (!token) return;
        if (!confirm(`کلید پروژه «${project.name}» عوض شود؟ اپ‌هایی که کلید قبلی را دارند تا به‌روزرسانی، خطا نمی‌فرستند.`)) return;
        try {
            await rotateProjectKey(baseUrl, token, project._id);
            SuccessToaster({ message: 'کلید جدید صادر شد — SDKها را با کلید جدید به‌روزرسانی کنید' });
            reloadProjects();
        } catch (err) {
            ErrorToaster(err);
        }
    };

    const handleDelete = async (project: EtrProject) => {
        if (!token) return;
        if (!confirm(`پروژه «${project.name}» حذف شود؟`)) return;
        try {
            await deleteProject(baseUrl, token, project._id);
            SuccessToaster({ message: 'پروژه حذف شد' });
            reloadProjects();
        } catch (err) {
            ErrorToaster(err);
        }
    };

    const copyKey = async (key: string) => {
        try {
            await navigator.clipboard.writeText(key);
            SuccessToaster({ message: 'کلید کپی شد' });
        } catch {
            ErrorToaster({ message: 'کپی ناموفق بود' });
        }
    };

    const editHref = (project: EtrProject) => `/error-tracking/projects/${project._id}/edit`;

    return (
        <>
            <TabIntro
                actions={(
                    <Link href="/error-tracking/projects/new" className={styles.primaryBtn}>
                        <TbPlus size={16} />پروژه جدید
                    </Link>
                )}
            >
                هر اپ یک پروژه با کلید اتصال (DSN) است.
            </TabIntro>
            <ProjectsGuide />

            {loading ? (
                <LoadingState />
            ) : projects.length === 0 ? (
                <TableEmptyState
                    icon={<TbWorld size={32} />}
                    title="هنوز پروژه‌ای ثبت نشده"
                    description="اولین پروژه را بسازید و کلید اتصال آن را در اپلیکیشن قرار دهید."
                    primaryHref="/error-tracking/projects/new"
                    primaryLabel="ساخت پروژه اول"
                />
            ) : (
                <>
                    <div className={styles.tableToolbar}>
                        <TableSearch
                            className={styles.toolbarSearch}
                            value={table.search}
                            onSearch={table.setSearch}
                            placeholder="جستجوی نام، شناسه یا کلید"
                        />
                        {environments.length > 1 && (
                            <select
                                className={styles.filterSelect}
                                value={table.filters.environment}
                                onChange={(e) => table.setFilter('environment', e.target.value)}
                                aria-label="محیط"
                            >
                                <option value="">همه محیط‌ها</option>
                                {environments.map((env) => (
                                    <option key={env} value={env}>{env}</option>
                                ))}
                            </select>
                        )}
                        <span className={styles.toolbarCount}>{toFarsiNumber(rows.length)} پروژه</span>
                    </div>

                    {rows.length === 0 ? (
                        <div className={styles.tableEmpty}>
                            پروژه‌ای با این جستجو/فیلتر پیدا نشد.
                            <button type="button" className={styles.linkBtn} onClick={table.reset}>
                                حذف فیلترها
                            </button>
                        </div>
                    ) : (
                        <div className={styles.tableWrap}>
                            <table className={`${styles.dataTable} ${styles.projectsTable}`}>
                                <thead>
                                    <tr>
                                        <SortHeader label="پروژه" field="name" sort={table.sort} dir={table.dir} onSort={(f) => table.toggleSort(f, 'asc')} />
                                        <th>محیط</th>
                                        <th title="این کلید را در تنظیمات SDK اپ قرار دهید">کلید اتصال (DSN)</th>
                                        <SortHeader
                                            label="سقف ارسال"
                                            field="rateLimit"
                                            sort={table.sort}
                                            dir={table.dir}
                                            onSort={table.toggleSort}
                                            hint="حداکثر رویدادی که این پروژه در هر دقیقه می‌پذیرد؛ بیشتر از آن دور ریخته می‌شود"
                                        />
                                        <SortHeader label="ایجاد" field="createdAt" sort={table.sort} dir={table.dir} onSort={table.toggleSort} />
                                        <th className={styles.actionsCol} aria-label="عملیات" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((project) => (
                                        <tr key={project._id}>
                                            <td data-label="پروژه">
                                                <div className={styles.projectCell}>
                                                    <span className={styles.projectAvatar} aria-hidden>
                                                        {project.name.trim().charAt(0).toUpperCase()}
                                                    </span>
                                                    <div className={styles.projectText}>
                                                        <Link href={editHref(project)} className={styles.projectName}>
                                                            {project.name}
                                                        </Link>
                                                        <div className={styles.projectMeta}>
                                                            <span>{PLATFORM_LABELS[project.platform] || project.platform}</span>
                                                            {project.description && (
                                                                <>
                                                                    <span className={styles.metaDot} aria-hidden>·</span>
                                                                    <span className={styles.projectDesc} title={project.description}>
                                                                        {project.description}
                                                                    </span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td data-label="محیط">
                                                <span className={`${styles.envBadge} ${ENV_CLASS[project.environment] || ''}`} dir="ltr">
                                                    {project.environment}
                                                </span>
                                            </td>
                                            <td data-label="کلید اتصال">
                                                <button
                                                    type="button"
                                                    className={styles.keyChip}
                                                    onClick={() => copyKey(project.publicKey)}
                                                    title={`${project.publicKey}\nبرای کپی کلیک کنید`}
                                                >
                                                    <code dir="ltr">{shortKey(project.publicKey)}</code>
                                                    <TbCopy size={14} aria-hidden />
                                                </button>
                                            </td>
                                            <td data-label="سقف ارسال" className={styles.cellMuted}>
                                                {toFarsiNumber(project.rateLimitPerMinute)} در دقیقه
                                            </td>
                                            <td data-label="ایجاد" className={styles.cellMuted} title={fullDate(project.createdAt)}>
                                                {relativeTime(project.createdAt)}
                                            </td>
                                            <td data-label="عملیات" className={styles.actionsCol}>
                                                <RowActionsMenu
                                                    items={[
                                                        {
                                                            label: 'ویرایش',
                                                            icon: <TbPencil size={15} />,
                                                            onClick: () => router.push(editHref(project)),
                                                        },
                                                        {
                                                            label: 'کپی کلید اتصال',
                                                            icon: <TbCopy size={15} />,
                                                            onClick: () => copyKey(project.publicKey),
                                                        },
                                                        {
                                                            label: 'صدور کلید جدید',
                                                            icon: <TbKey size={15} />,
                                                            onClick: () => handleRotate(project),
                                                        },
                                                        {
                                                            label: 'حذف پروژه',
                                                            icon: <TbTrash size={15} />,
                                                            onClick: () => handleDelete(project),
                                                            danger: true,
                                                            separated: true,
                                                        },
                                                    ]}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}
        </>
    );
}
