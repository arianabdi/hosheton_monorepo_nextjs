'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { LuLoader, LuPlus, LuTrash2 } from 'react-icons/lu';
import { Pagination } from '@my-workspace/components';
import { notifyError } from '@/app/lib/errors';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { aiAvatarApi } from '@/app/(developers)/projects/lib/ai-avatar-api';
import type { AiAvatarProfile } from '@/app/(developers)/projects/types/ai-avatar-api';
import { formatAppNumber } from '@/app/lib/i18n/formatLocaleNumber';
import { isRtlLanguage } from '@/app/lib/i18n/config';
import { AvatarIdCard } from './components/AvatarIdCard';
import styles from './avatars.module.scss';
import { usePageLoading } from '@/app/components/PageTransition';

export default function AvatarsPage() {
    const { t, i18n } = useTranslation('avatars');
    const { t: tc } = useTranslation('common');
    const token = useAuthStore((s) => s.token);
    const [loading, setLoading] = useState(true);
    usePageLoading(loading);
    const [avatars, setAvatars] = useState<AiAvatarProfile[]>([]);
    const [pagination, setPagination] = useState({
        itemPerPage: 12,
        currentPage: 1,
        totalItems: 0,
    });

    const load = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const res = await aiAvatarApi.listAvatars({
                page: pagination.currentPage,
                limit: pagination.itemPerPage,
            });
            setAvatars(res.avatars ?? []);
            setPagination((prev) => ({ ...prev, totalItems: res.totalItems ?? 0 }));
        } catch (e) {
            notifyError(e);
        } finally {
            setLoading(false);
        }
    }, [token, pagination.currentPage, pagination.itemPerPage]);

    useEffect(() => {
        load();
    }, [load]);

    const handleDelete = async (e: React.MouseEvent, avatarId: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm(t('delete_confirm'))) return;
        try {
            await aiAvatarApi.deleteAvatar(avatarId);
            await load();
        } catch (err) {
            notifyError(err);
        }
    };

    return (
        <div className={styles.avatarsPage}>
            <header className={styles.workspacePageHeader}>
                <div className={styles.workspacePageHeaderMain}>
                    <span className={styles.pageEyebrow}>{t('studio_eyebrow')}</span>
                    <h1 className={styles.pageTitle}>{t('title')}</h1>
                    <p className={styles.pageLead}>{t('page_lead')}</p>
                </div>
                <Link href="/avatars/new" className={styles.primaryBtn}>
                    <LuPlus /> {t('new')}
                </Link>
            </header>

            {loading ? (
                <div className={styles.loading}>
                    <LuLoader className={styles.spin} /> {tc('loading')}
                </div>
            ) : avatars.length === 0 ? (
                <div className={styles.emptyState}>
                    {t('empty')}
                    <Link href="/avatars/new" className={styles.linkBtn}>
                        {t('first')}
                    </Link>
                </div>
            ) : (
                <>
                    <div className={styles.idCardLane}>
                        <div className={styles.idCardStack}>
                            {avatars.map((avatar) => (
                                <div key={avatar._id} className={styles.idCardWrap}>
                                    <AvatarIdCard avatar={avatar} />
                                    <button
                                        type="button"
                                        className={styles.idCardDelete}
                                        title={tc('delete')}
                                        onClick={(e) => void handleDelete(e, avatar._id)}
                                    >
                                        <LuTrash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className={styles.listFooterWrap}>
                        <span className={styles.totalCount}>
                            {t('count', { count: formatAppNumber(pagination.totalItems, i18n.language) })}
                        </span>
                        <Pagination
                            itemPerPage={pagination.itemPerPage}
                            currentPage={pagination.currentPage}
                            totalItems={pagination.totalItems}
                            rtl={isRtlLanguage(i18n.language)}
                            paginate={(pageNumber) =>
                                setPagination((prev) => ({ ...prev, currentPage: pageNumber }))
                            }
                            setRowsPerPage={(rows) =>
                                setPagination((prev) => ({
                                    ...prev,
                                    itemPerPage: rows,
                                    currentPage: 1,
                                }))
                            }
                        />
                    </div>
                </>
            )}
        </div>
    );
}
