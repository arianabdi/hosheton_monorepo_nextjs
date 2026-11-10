'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { LuPlus } from 'react-icons/lu';
import { Pagination } from '@my-workspace/components';
import { isRtlLanguage } from '@/app/lib/i18n/config';
import { formatAppNumber } from '@/app/lib/i18n/formatLocaleNumber';
import tabStyles from './MediaProjectList.module.scss';
import pageStyles from '../ProjectsPage.module.scss';
import { getApiErrorMessage } from '../lib/api-client';
import { mediaApi } from '../lib/media-api';
import type { MediaProject, MediaSpace, ProjectUsageSummaryResponse } from '../types/media-api';
import { iransansxvf } from '@my-workspace/fonts/iransansxvf';
import { ProjectItem } from './ProjectItem';
import { ProjectMobileItem } from './ProjectMobileItem';
import { useMobileViewport } from '@/app/hooks/useMobileViewport';
import { SpaceManager } from './SpaceManager';
import { ProjectFilters, PROJECT_FILTER_KEYS, type ProjectFilterState } from './ProjectFilters';
import { ProjectsEmptyShowcase } from './ProjectsEmptyShowcase';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { usePageLoading } from '@/app/components/PageTransition';

export {
    PROJECT_ICON_OPTIONS,
    PROJECT_COLOR_OPTIONS,
    getProjectIcon,
    formatUsd,
    getBudgetUsage,
    resolveProjectSpentCost,
} from './project-list-utils';

/** هر صفحه ۷ پروژه (ثابت) */
const PAGE_SIZE = 7;

export function MediaProjectList() {
    const { t, i18n } = useTranslation('projects');
    const router = useRouter();
    const isMobile = useMobileViewport();
    // صفحه و فیلترها در URL (لینک قابل اشتراک، برگشت مرورگر)
    const searchParams = useSearchParams();
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const limit = PAGE_SIZE;
    const q = searchParams.get('q') ?? '';
    const space = searchParams.get('space') ?? '';
    const status = searchParams.get('status') ?? '';
    const ownership = searchParams.get('ownership') ?? '';
    const budget = searchParams.get('budget') ?? '';
    const deadline = searchParams.get('deadline') ?? '';
    const filters = useMemo<ProjectFilterState>(
        () => ({ q, space, status, ownership, budget, deadline }),
        [q, space, status, ownership, budget, deadline],
    );
    const hasFilters = PROJECT_FILTER_KEYS.some((key) => filters[key]);

    const replaceQuery = useCallback((mutate: (next: URLSearchParams) => void) => {
        const next = new URLSearchParams(searchParams.toString());
        mutate(next);
        next.delete('limit');
        const query = next.toString();
        router.replace(query ? `/projects?${query}` : '/projects', { scroll: false });
    }, [router, searchParams]);
    const setPage = useCallback((nextPage: number) => {
        replaceQuery((next) => {
            if (nextPage > 1) next.set('page', String(nextPage));
            else next.delete('page');
        });
    }, [replaceQuery]);
    // هر تغییر فیلتر صفحه را به ۱ برمی‌گرداند
    const changeFilters = useCallback((patch: Partial<ProjectFilterState>) => {
        replaceQuery((next) => {
            for (const [key, value] of Object.entries(patch)) {
                if (value) next.set(key, value);
                else next.delete(key);
            }
            next.delete('page');
        });
    }, [replaceQuery]);
    const clearFilters = useCallback(() => {
        replaceQuery((next) => {
            PROJECT_FILTER_KEYS.forEach((key) => next.delete(key));
            next.delete('page');
        });
    }, [replaceQuery]);
    const [projects, setProjects] = useState<MediaProject[]>([]);
    const [totalItems, setTotalItems] = useState(0);
    const [spaces, setSpaces] = useState<MediaSpace[]>([]);
    const [loading, setLoading] = useState(true);
    usePageLoading(loading);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // مهمان: پروژه‌ای ندارد — بدون درخواست حساب، همان معرفی خالی؛ «ساخت پروژه» پنجره‌ی ورود را باز می‌کند
    const isGuest = !useAuthStore((state) => state.token);

    const [usageByProject, setUsageByProject] = useState<Record<string, ProjectUsageSummaryResponse | 'loading' | 'error'>>({});
    const requestedUsageRef = React.useRef<Set<string>>(new Set());

    const loadProjectUsage = useCallback((projectId: string) => {
        if (requestedUsageRef.current.has(projectId)) return;
        requestedUsageRef.current.add(projectId);
        setUsageByProject((prev) => ({ ...prev, [projectId]: 'loading' }));
        mediaApi.getProjectUsageSummary(projectId)
            .then((summary) => setUsageByProject((prev) => ({ ...prev, [projectId]: summary })))
            .catch(() => {
                requestedUsageRef.current.delete(projectId);
                setUsageByProject((prev) => ({ ...prev, [projectId]: 'error' }));
            });
    }, []);

    const fetchSpaces = useCallback(async () => {
        if (isGuest) return;
        try {
            const data = await mediaApi.listSpaces();
            setSpaces(data.spaces ?? []);
        } catch {
            // Non-blocking — filter still works with cached/all
        }
    }, [isGuest]);

    // پاسخ درخواست قدیمی (فیلتر عوض شده) روی نتیجهٔ تازه ننشیند
    const requestIdRef = React.useRef(0);
    const fetchProjects = useCallback(async () => {
        if (isGuest) {
            setProjects([]);
            setTotalItems(0);
            setLoading(false);
            return;
        }
        const requestId = ++requestIdRef.current;
        setLoading(true);
        setError(null);
        try {
            const data = await mediaApi.listProjects(
                filters.space,
                { page, limit },
                {
                    q: filters.q,
                    status: filters.status,
                    ownership: filters.ownership,
                    budget: filters.budget,
                    deadline: filters.deadline,
                },
            );
            if (requestId !== requestIdRef.current) return;
            setProjects(data.projects ?? []);
            setTotalItems(data.totalItems ?? 0);
        } catch (err) {
            if (requestId !== requestIdRef.current) return;
            setError(getApiErrorMessage(err, t('load_projects_error')));
        } finally {
            if (requestId === requestIdRef.current) setLoading(false);
        }
    }, [t, isGuest, filters, page, limit]);

    useEffect(() => {
        fetchSpaces();
    }, [fetchSpaces]);

    useEffect(() => {
        void fetchProjects();
    }, [fetchProjects]);

    // صفحه‌ای بعد از آخرین صفحه (مثلاً بعد از حذف) → آخرین صفحهٔ موجود
    const lastPage = Math.max(1, Math.ceil(totalItems / limit));
    useEffect(() => {
        if (!loading && page > lastPage) setPage(lastPage);
    }, [loading, page, lastPage, setPage]);

    const handleDeleteProject = async (project: MediaProject, e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (!confirm(t('delete_confirm', { title: project.title }))) return;

        setSubmitting(true);
        setError(null);
        try {
            await mediaApi.deleteProject(project._id);
            void fetchProjects();
            void fetchSpaces();
        } catch (err) {
            setError(getApiErrorMessage(err, t('delete_error')));
        } finally {
            setSubmitting(false);
        }
    };

    // هنوز هیچ پروژه‌ای نیست: معرفی قابلیت‌ها وسط ارتفاع صفحه
    const showShowcase = !loading && totalItems === 0 && !hasFilters;
    // بار اول متن بارگذاری؛ بعد از آن ردیف‌های قبلی کم‌رنگ می‌مانند
    const firstLoad = loading && projects.length === 0;

    return (
        <div className={`${pageStyles.container} ${pageStyles.rtl} ${showShowcase ? pageStyles.containerFill : ''} ${iransansxvf.className}`}>
            {/* هدر فشرده: عنوان، جستجو، فیلتر، مدیریت فضا و دکمهٔ ساخت در یک ردیف */}
            <header className={pageStyles.header}>
                <div className={pageStyles.headerRow}>
                    <div className={pageStyles.titleBlock}>
                        <h1 className={pageStyles.mainTitle}>{t('title')}</h1>
                        <p className={pageStyles.subtitle}>
                            {t('subtitle')}
                        </p>
                        {/* موبایل: به‌جای توضیح فقط تعداد پروژه‌ها */}
                        {!firstLoad && totalItems > 0 ? (
                            <p className={pageStyles.mobileCount}>
                                {t('card_projects_n', { count: formatAppNumber(totalItems, i18n.language) })}
                            </p>
                        ) : null}
                    </div>
                    {isGuest ? null : (
                    <div className={pageStyles.toolbar}>
                        <ProjectFilters
                            filters={filters}
                            spaces={spaces}
                            onChange={changeFilters}
                            onClear={clearFilters}
                        />
                        <SpaceManager spaces={spaces} onSpacesChange={fetchSpaces} iconOnly />
                    </div>
                    )}
                    <Link
                        href="/projects/new"
                        className={pageStyles.createIconBtn}
                        title={t('create_new')}
                        aria-label={t('create_new')}
                    >
                        <LuPlus size={18} />
                    </Link>
                </div>
            </header>

            {error && (
                <div className={pageStyles.errorBanner}>{error}</div>
            )}

            {firstLoad ? (
                <p className={pageStyles.emptyState}>{t('loading_list')}</p>
            ) : showShowcase ? (
                <div className={pageStyles.emptyCenter}>
                    <ProjectsEmptyShowcase
                        createLabel={spaces.length === 0 ? t('create_after_space') : t('create_new')}
                    />
                </div>
            ) : !loading && projects.length === 0 && hasFilters ? (
                <div className={pageStyles.emptyBox}>
                    <p>{t('empty_filtered')}</p>
                    <button type="button" className={pageStyles.createBtn} onClick={clearFilters}>
                        {t('filter_clear')}
                    </button>
                </div>
            ) : !loading && projects.length === 0 ? (
                <div className={pageStyles.emptyBox}>
                    <p>{t('empty_space')}</p>
                    <Link href="/projects/new" className={pageStyles.createBtn}>
                        <LuPlus size={18} />
                        {spaces.length === 0 ? t('create_after_space') : t('create_new')}
                    </Link>
                </div>
            ) : (
                <>
                <div className={`${tabStyles.projectListView} ${loading ? tabStyles.refreshing : ''}`}>
                    <div className={tabStyles.listHeader}>
                        <span>{t('col_project')}</span>
                        <span>{t('col_desc')}</span>
                        <span>{t('col_metrics')}</span>
                        <span>{t('col_space')}</span>
                        <span>{t('col_usage')}</span>
                        <span>{t('col_deadline')}</span>
                        <span>{t('col_actions')}</span>
                    </div>
                    <div className={tabStyles.projectGrid}>
                        {projects.map((project) => isMobile ? (
                            <ProjectMobileItem
                                key={project._id}
                                project={project}
                                usage={usageByProject[project._id]}
                                onOpen={() => router.push(`/projects/${project._id}`)}
                                onSettings={() => router.push(`/projects/${project._id}/settings/info`)}
                                onDelete={() => handleDeleteProject(project)}
                            />
                        ) : (
                            <ProjectItem
                                key={project._id}
                                project={project}
                                usage={usageByProject[project._id]}
                                onOpen={() => router.push(`/projects/${project._id}`)}
                                onSettings={(e) => {
                                    e.stopPropagation();
                                    router.push(`/projects/${project._id}/settings/info`);
                                }}
                                onDelete={(e) => handleDeleteProject(project, e)}
                                onHover={() => loadProjectUsage(project._id)}
                            />
                        ))}
                    </div>
                </div>
                {/* صفحه‌بندی در یک ردیف: «۱–۷ از N» + شمارهٔ صفحه‌ها؛ تعداد در صفحه ثابت ۷ */}
                <div className={tabStyles.listFooter}>
                    <Pagination
                        rtl={isRtlLanguage(i18n.language)}
                        itemPerPage={limit}
                        currentPage={page}
                        totalItems={totalItems}
                        paginate={setPage}
                        setRowsPerPage={() => undefined}
                        hideRowsPerPage
                        singleRow
                    />
                </div>
                </>
            )}
        </div>
    );
}
