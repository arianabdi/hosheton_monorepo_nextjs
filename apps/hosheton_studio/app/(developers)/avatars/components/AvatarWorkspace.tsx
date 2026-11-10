'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { LuLoader, LuPlus, LuTrash2 } from 'react-icons/lu';
import { notifyError } from '@/app/lib/errors';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { aiAvatarApi } from '@/app/(developers)/projects/lib/ai-avatar-api';
import type { AiAvatarProfile } from '@/app/(developers)/projects/types/ai-avatar-api';
import { formatAppNumber } from '@/app/lib/i18n/formatLocaleNumber';
import { getSelectedIdFromPath, syncAvatarWorkspaceUrl } from '../avatar-workspace-url';
import { AvatarDetailPanel } from './AvatarDetailPanel';
import { AvatarEmptyState } from './AvatarEmptyState';
import { AvatarIdCard } from './AvatarIdCard';
import styles from '../avatars.module.scss';

const ALL_AVATARS_LIMIT = 500;

export function AvatarWorkspace() {
    const { t, i18n } = useTranslation('avatars');
    const { t: tc } = useTranslation('common');
    const token = useAuthStore((s) => s.token);
    const [listLoading, setListLoading] = useState(true);
    const [avatars, setAvatars] = useState<AiAvatarProfile[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(() => {
        if (typeof window === 'undefined') return null;
        return getSelectedIdFromPath(window.location.pathname);
    });
    const autoSelectAppliedRef = useRef(false);

    const load = useCallback(async () => {
        if (!token) return;
        setListLoading(true);
        try {
            const res = await aiAvatarApi.listAvatars({
                page: 1,
                limit: ALL_AVATARS_LIMIT,
            });
            setAvatars(res.avatars ?? []);
        } catch (e) {
            notifyError(e);
        } finally {
            setListLoading(false);
        }
    }, [token]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        const onPopState = () => {
            setSelectedId(getSelectedIdFromPath(window.location.pathname));
        };
        window.addEventListener('popstate', onPopState);
        return () => window.removeEventListener('popstate', onPopState);
    }, []);

    useEffect(() => {
        if (autoSelectAppliedRef.current || listLoading || avatars.length === 0) return;
        if (selectedId && avatars.some((a) => a._id === selectedId)) return;

        autoSelectAppliedRef.current = true;
        const firstId = avatars[0]._id;
        setSelectedId(firstId);
        syncAvatarWorkspaceUrl(firstId);
    }, [listLoading, avatars, selectedId]);

    const handleSelect = (avatarId: string) => {
        if (avatarId === selectedId) return;
        setSelectedId(avatarId);
        syncAvatarWorkspaceUrl(avatarId);
    };

    const handleAvatarUpdated = (updated: AiAvatarProfile) => {
        setAvatars((prev) => prev.map((a) => (a._id === updated._id ? updated : a)));
    };

    const handleDelete = async (e: React.MouseEvent, avatarId: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm(t('delete_confirm'))) return;
        try {
            await aiAvatarApi.deleteAvatar(avatarId);
            const remaining = avatars.filter((a) => a._id !== avatarId);
            setAvatars(remaining);
            if (selectedId === avatarId) {
                const nextId = remaining[0]?._id ?? null;
                setSelectedId(nextId);
                syncAvatarWorkspaceUrl(nextId);
            }
        } catch (err) {
            notifyError(err);
        }
    };

    return (
        <div className={`${styles.avatarsPage} ${styles.avatarsWorkspacePage}`}>
            {listLoading ? (
                <div className={styles.loading}>
                    <LuLoader className={styles.spin} /> {tc('loading')}
                </div>
            ) : avatars.length === 0 ? (
                <AvatarEmptyState />
            ) : (
                <div className={styles.workspaceLayout}>
                    <aside className={styles.workspaceListPane}>
                        <div className={styles.workspaceListHead}>
                            <div>
                                <h1 className={styles.workspaceListTitle}>{t('list_title')}</h1>
                                <span className={styles.workspaceListCount}>
                                    {t('count', { count: formatAppNumber(avatars.length, i18n.language) })}
                                </span>
                            </div>
                            <Link href="/avatars/new" className={styles.listAddButton}>
                                <LuPlus />
                                {tc('add')}
                            </Link>
                        </div>

                        <div className={styles.workspaceCardsScroll}>
                            <div className={styles.idCardLane}>
                                <div className={styles.idCardStack}>
                                    {avatars.map((avatar) => (
                                        <div
                                            key={avatar._id}
                                            className={`${styles.idCardWrap} ${
                                                selectedId === avatar._id ? styles.idCardWrapSelected : ''
                                            }`}
                                        >
                                            <AvatarIdCard
                                                avatar={avatar}
                                                selected={selectedId === avatar._id}
                                                onSelect={handleSelect}
                                            />
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
                        </div>
                    </aside>

                    <main className={styles.workspaceDetailPane}>
                        {selectedId ? (
                            <AvatarDetailPanel
                                avatarId={selectedId}
                                compact
                                onAvatarUpdated={handleAvatarUpdated}
                            />
                        ) : (
                            <div className={styles.detailInfoCard}>
                                <div className={styles.detailPlaceholder}>
                                    <p className={styles.detailPlaceholderTitle}>{t('select_character')}</p>
                                </div>
                            </div>
                        )}
                    </main>
                </div>
            )}
        </div>
    );
}
