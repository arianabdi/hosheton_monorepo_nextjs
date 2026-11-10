'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { TbRocket } from 'react-icons/tb';
import { ErrorToaster, toFarsiNumber, ConvertDateToCalendarString } from '@my-workspace/utils';
import { LoadingState, Pagination } from '@my-workspace/components';
import TableEmptyState from '@/app/(main)/components/TableEmptyState';
import ReleasesGuide from '../../components/ReleasesGuide';
import TabIntro from '../../components/TabIntro';
import { useCachedState, useErrorTracking } from '../../lib/ErrorTrackingProvider';
import { fetchReleases } from '../../error-tracking-api';
import { EtrRelease } from '../../error-tracking.types';
import styles from '../../ErrorTracking.module.scss';

export default function ErrorTrackingReleasesPage() {
    const { baseUrl, token, projects } = useErrorTracking();

    const [releases, setReleases, cached] = useCachedState<EtrRelease[]>('releases:rows', []);
    const [projectFilter, setProjectFilter] = useState('');
    const [loading, setLoading] = useState(!cached);
    const [pagination, setPagination] = useState({ itemPerPage: 10, currentPage: 1, totalItems: 0 });

    const loadReleases = useCallback(async (page: number, limit: number, projectId: string) => {
        if (!token) return;
        try {
            setLoading(true);
            const data = await fetchReleases(baseUrl, token, projectId || undefined, page, limit);
            setReleases(data.releases || []);
            setPagination((prev) => ({ ...prev, totalItems: data.totalItems || 0, currentPage: page }));
        } catch (err) {
            ErrorToaster(err);
        } finally {
            setLoading(false);
        }
    }, [baseUrl, token, setReleases]);

    useEffect(() => {
        loadReleases(pagination.currentPage, pagination.itemPerPage, projectFilter);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pagination.currentPage, pagination.itemPerPage, projectFilter, loadReleases]);

    return (
        <>
            <TabIntro>آمار خطاهای هر Deploy — نسخه از فیلد release در SDK می‌آید.</TabIntro>
            <ReleasesGuide />

            <div className={styles.filterContainer}>
                <div className={styles.filterGrid}>
                    <div className={styles.filterItem}>
                        <label>پروژه:</label>
                        <select
                            className={styles.filterSelect}
                            value={projectFilter}
                            onChange={(e) => {
                                setProjectFilter(e.target.value);
                                setPagination((prev) => ({ ...prev, currentPage: 1 }));
                            }}
                        >
                            <option value="">همه پروژه‌ها</option>
                            {projects.map((project) => (
                                <option key={project._id} value={project._id}>{project.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {loading && !releases.length ? (
                <LoadingState />
            ) : releases.length === 0 ? (
                <TableEmptyState
                    icon={<TbRocket size={32} />}
                    title="نسخه‌ای ثبت نشده"
                    description="وقتی SDK با فیلد release رویداد بفرستد، نسخه‌ها به‌صورت خودکار اینجا ساخته می‌شوند."
                    primaryHref="/error-tracking/issues"
                    primaryLabel="مشاهده مشکلات"
                    secondaryHref="/error-tracking/projects"
                    secondaryLabel="پروژه‌ها"
                />
            ) : (
                <div className={styles.tableWrap}>
                    <table className={styles.dataTable}>
                        <thead>
                            <tr>
                                <th>نسخه</th>
                                <th>پروژه</th>
                                <th>شاخه / Commit</th>
                                <th>رویدادها</th>
                                <th>مشکلات جدید</th>
                                <th>اولین رویداد</th>
                                <th>آخرین رویداد</th>
                            </tr>
                        </thead>
                        <tbody>
                            {releases.map((release) => {
                                const project = projects.find((p) => p._id === release.projectId);
                                return (
                                    <tr key={release._id}>
                                        <td data-label="نسخه" className={styles.issueTitleCell} dir="ltr">{release.version}</td>
                                        <td data-label="پروژه" className={styles.cellMuted}>{project?.name || '—'}</td>
                                        <td data-label="شاخه / Commit" className={styles.cellMuted} dir="ltr">
                                            {release.branch || '—'} {release.commitSha ? `/ ${release.commitSha.slice(0, 7)}` : ''}
                                        </td>
                                        <td data-label="رویدادها">{toFarsiNumber(release.eventCount)}</td>
                                        <td data-label="مشکلات جدید">
                                            <span className={`${styles.statusBadge} ${release.newIssueCount > 0 ? styles.statusRegressed : styles.statusResolved}`}>
                                                {toFarsiNumber(release.newIssueCount)}
                                            </span>
                                        </td>
                                        <td data-label="اولین رویداد" className={styles.cellMuted}>{toFarsiNumber(ConvertDateToCalendarString(release.firstEventAt))}</td>
                                        <td data-label="آخرین رویداد" className={styles.cellMuted}>{toFarsiNumber(ConvertDateToCalendarString(release.lastEventAt))}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {releases.length > 0 && (
                <div className={styles.paginationSpace}>
                    <Pagination
                        itemPerPage={pagination.itemPerPage}
                        currentPage={pagination.currentPage}
                        totalItems={pagination.totalItems}
                        setRowsPerPage={(num) => setPagination((prev) => ({ ...prev, itemPerPage: num, currentPage: 1 }))}
                        paginate={(page) => setPagination((prev) => ({ ...prev, currentPage: page }))}
                        rtl
                    />
                </div>
            )}
        </>
    );
}
