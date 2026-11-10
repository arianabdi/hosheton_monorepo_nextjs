'use client';

import { useCallback, useEffect, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { LuArrowUpRight, LuCrown, LuSearch, LuTrash2, LuX } from 'react-icons/lu';
import { MdOutlineGroups3 } from 'react-icons/md';
import { iransans } from '@my-workspace/fonts/iransans';
import { ModalHelper } from '@my-workspace/components';
import { SuccessToaster } from '@my-workspace/utils';
import { notifyError } from '@/app/lib/errors';
import { mediaApi } from '@/app/(developers)/projects/lib/media-api';
import { getCurrentUserId, getMemberUserId } from '@/app/(developers)/projects/lib/current-user';
import type { MediaMemberSearchUser, MediaProjectMember } from '@/app/(developers)/projects/types/media-api';
import styles from './ProjectMembersMenu.module.scss';

type Authority = 'admin' | 'member' | 'guest';

function getInitials(member: { initials?: string; fullName?: string; email?: string }): string {
    if (member.initials) return member.initials;
    const name = member.fullName?.trim();
    if (name) {
        const parts = name.split(/\s+/);
        if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
        return name.slice(0, 2).toUpperCase();
    }
    return (member.email || '??').slice(0, 2).toUpperCase();
}

function Avatar({ src, label }: { src?: string; label: string }) {
    return (
        <span className={styles.avatar} aria-hidden>
            {src ? <img src={src} alt="" /> : label}
        </span>
    );
}

type ProjectMembersMenuProps = {
    projectId: string;
};

export function ProjectMembersMenu({ projectId }: ProjectMembersMenuProps) {
    const { t } = useTranslation('projects');
    const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
    const [members, setMembers] = useState<MediaProjectMember[]>([]);
    const [canManage, setCanManage] = useState(false);
    const [loading, setLoading] = useState(true);

    const loadMembers = useCallback(async (options?: { silent?: boolean }) => {
        if (!projectId) return;
        try {
            if (!options?.silent) setLoading(true);
            const [{ project }, membersRes] = await Promise.all([
                mediaApi.getProject(projectId),
                mediaApi.listMembers(projectId),
            ]);
            setMembers(membersRes.members || []);
            setCanManage(Boolean(membersRes.viewerCanManage ?? project.canManage ?? project.isOwner));
        } catch (err) {
            notifyError(err, { fallback: t('load_members_error') });
        } finally {
            setLoading(false);
        }
    }, [projectId, t]);

    useEffect(() => {
        void loadMembers();
    }, [loadMembers]);

    const open = Boolean(anchor);

    return (
        <div className={`${styles.wrap} ${iransans.className}`}>
            <button
                type="button"
                className={`${styles.trigger} ${open ? styles.triggerOpen : ''}`}
                // وقتی باز است کلیک دوباره فقط ببندد (کلیک بیرون popup آن را دوباره باز نکند)
                onPointerDown={(event) => { if (open) event.stopPropagation(); }}
                onClick={(event) => {
                    const target = event.currentTarget;
                    setAnchor((current) => (current ? null : target));
                }}
                aria-label={t('members')}
                title={t('members')}
                aria-expanded={open}
            >
                <MdOutlineGroups3 size={18} />
                {members.length > 1 ? (
                    <span className={styles.triggerCount}>{members.length}</span>
                ) : null}
            </button>

            <ModalHelper
                open={open}
                onClose={() => setAnchor(null)}
                type="popup"
                targetElement={anchor ?? undefined}
                height={70}
                hideCloseBtn
                sheetTitle={t('members')}
                component={open ? (
                    <MembersPanel
                        projectId={projectId}
                        members={members}
                        setMembers={setMembers}
                        canManage={canManage}
                        loading={loading}
                        reload={loadMembers}
                        onNavigate={() => setAnchor(null)}
                    />
                ) : null}
            />
        </div>
    );
}

function MembersPanel({
    projectId,
    members,
    setMembers,
    canManage,
    loading,
    reload,
    onNavigate,
}: {
    projectId: string;
    members: MediaProjectMember[];
    setMembers: Dispatch<SetStateAction<MediaProjectMember[]>>;
    canManage: boolean;
    loading: boolean;
    reload: (options?: { silent?: boolean }) => Promise<void>;
    onNavigate: () => void;
}) {
    const { t } = useTranslation('projects');
    const { t: tc } = useTranslation('common');
    const currentUserId = getCurrentUserId();
    const [query, setQuery] = useState('');
    const [searching, setSearching] = useState(false);
    const [searched, setSearched] = useState(false);
    const [results, setResults] = useState<MediaMemberSearchUser[]>([]);
    const [authorityByUser, setAuthorityByUser] = useState<Record<string, Authority>>({});
    const [busyUserId, setBusyUserId] = useState<string | null>(null);
    const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

    const authorityOptions: { value: Authority; label: string }[] = [
        { value: 'admin', label: t('manager') },
        { value: 'member', label: t('member') },
        { value: 'guest', label: t('guest') },
    ];

    const authorityLabel = (authority?: string): string => {
        switch (authority) {
            case 'admin': return t('manager');
            case 'member': return t('member');
            case 'guest': return t('guest');
            case 'owner': return t('owner');
            default: return authority || t('member');
        }
    };

    const isAlreadyMember = (userId: string) =>
        members.some((member) => getMemberUserId(member) === String(userId));

    const handleSearch = async (event: FormEvent) => {
        event.preventDefault();
        const value = query.trim();
        if (!value) return;
        try {
            setSearching(true);
            const res = await mediaApi.searchMemberCandidates(projectId, value);
            const users = res.users || [];
            setResults(users);
            setSearched(true);
            setAuthorityByUser((prev) => {
                const next = { ...prev };
                for (const user of users) if (!next[user._id]) next[user._id] = 'member';
                return next;
            });
        } catch (err) {
            notifyError(err, { fallback: t('search_user_error') });
        } finally {
            setSearching(false);
        }
    };

    const handleAdd = async (userId: string) => {
        const authority = authorityByUser[userId] || 'member';
        try {
            setBusyUserId(userId);
            const added = await mediaApi.addMember(projectId, userId, { authority });
            SuccessToaster({ message: t('member_added') });
            setResults((prev) => prev.filter((user) => user._id !== userId));
            if (results.length <= 1) {
                setQuery('');
                setSearched(false);
            }
            if (added && getMemberUserId(added)) {
                setMembers((prev) => {
                    const id = getMemberUserId(added);
                    if (prev.some((member) => getMemberUserId(member) === id)) return prev;
                    const owner = prev.filter((member) => member.isOwner);
                    const rest = prev.filter((member) => !member.isOwner);
                    return [...owner, added, ...rest];
                });
            }
            await reload({ silent: true });
        } catch (err) {
            notifyError(err, { fallback: t('add_member_error') });
        } finally {
            setBusyUserId(null);
        }
    };

    const handleAuthorityChange = async (member: MediaProjectMember, authority: Authority) => {
        const userId = getMemberUserId(member);
        const previous = member.authority;
        setMembers((prev) => prev.map((item) => (
            getMemberUserId(item) === userId ? { ...item, authority } : item
        )));
        try {
            setBusyUserId(userId);
            await mediaApi.updateMember(projectId, userId, { authority });
        } catch (err) {
            setMembers((prev) => prev.map((item) => (
                getMemberUserId(item) === userId ? { ...item, authority: previous } : item
            )));
            notifyError(err, { fallback: t('edit_access_error') });
        } finally {
            setBusyUserId(null);
        }
    };

    const handleRemove = async (member: MediaProjectMember) => {
        const userId = getMemberUserId(member);
        try {
            setBusyUserId(userId);
            await mediaApi.removeMember(projectId, userId);
            setMembers((prev) => prev.filter((item) => getMemberUserId(item) !== userId));
            SuccessToaster({ message: t('member_removed') });
            await reload({ silent: true });
        } catch (err) {
            notifyError(err, { fallback: t('remove_member_error') });
        } finally {
            setBusyUserId(null);
            setConfirmRemoveId(null);
        }
    };

    return (
        <div className={styles.panel}>
            <div className={styles.head}>
                <div>
                    <p className={styles.title}>
                        {t('members')}
                        {!loading ? <span className={styles.count}>{members.length}</span> : null}
                    </p>
                    <p className={styles.lead}>{canManage ? t('members_lead') : t('member_readonly_invite')}</p>
                </div>
            </div>

            {canManage ? (
                <form onSubmit={handleSearch} className={styles.invite}>
                    <label className={styles.inviteField}>
                        <LuSearch size={14} aria-hidden />
                        <input
                            type="text"
                            inputMode="email"
                            dir="auto"
                            placeholder={t('invite_hint')}
                            value={query}
                            onChange={(event) => {
                                setQuery(event.target.value);
                                if (searched) setSearched(false);
                            }}
                            aria-label={t('invite')}
                        />
                        {query ? (
                            <button
                                type="button"
                                className={styles.clear}
                                aria-label={tc('close')}
                                onClick={() => {
                                    setQuery('');
                                    setResults([]);
                                    setSearched(false);
                                }}
                            >
                                <LuX size={12} />
                            </button>
                        ) : null}
                    </label>
                    <button type="submit" className={styles.inviteBtn} disabled={searching || !query.trim()}>
                        {searching ? t('searching') : tc('search')}
                    </button>
                </form>
            ) : null}

            {canManage && searched && results.length === 0 && !searching ? (
                <p className={styles.note}>{t('members_search_empty')}</p>
            ) : null}

            {canManage && results.length > 0 ? (
                <ul className={`${styles.list} ${styles.results}`}>
                    {results.map((user) => (
                        <li key={user._id} className={styles.row}>
                            <Avatar src={user.avatar} label={getInitials(user)} />
                            <div className={styles.meta}>
                                <span className={styles.name}>{user.fullName || user.email}</span>
                                <span className={styles.sub} dir="ltr">{user.email}</span>
                            </div>
                            {isAlreadyMember(user._id) ? (
                                <span className={styles.roleText}>{t('member')}</span>
                            ) : (
                                <div className={styles.actions}>
                                    <select
                                        className={styles.roleSelect}
                                        value={authorityByUser[user._id] || 'member'}
                                        onChange={(event) => setAuthorityByUser((prev) => ({
                                            ...prev,
                                            [user._id]: event.target.value as Authority,
                                        }))}
                                        aria-label={t('access')}
                                    >
                                        {authorityOptions.map((opt) => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        className={styles.addBtn}
                                        disabled={busyUserId === user._id}
                                        onClick={() => void handleAdd(user._id)}
                                    >
                                        {busyUserId === user._id ? t('adding') : tc('add')}
                                    </button>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            ) : null}

            {loading && !members.length ? (
                <ul className={styles.list} aria-busy>
                    {[0, 1].map((index) => (
                        <li key={index} className={styles.row}>
                            <span className={`${styles.avatar} ${styles.skeleton}`} />
                            <div className={styles.meta}>
                                <span className={`${styles.skeletonLine} ${styles.skeleton}`} />
                                <span className={`${styles.skeletonLine} ${styles.skeletonShort} ${styles.skeleton}`} />
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <ul className={styles.list}>
                    {members.map((member) => {
                        const userId = getMemberUserId(member);
                        const isMe = Boolean(currentUserId) && userId === currentUserId;
                        const editable = canManage && !member.isOwner && !isMe;
                        const confirming = confirmRemoveId === userId;
                        return (
                            <li
                                key={userId}
                                className={`${styles.row} ${member.status === 'suspended' ? styles.rowMuted : ''}`}
                            >
                                <Avatar src={member.avatar} label={getInitials(member)} />
                                <div className={styles.meta}>
                                    <span className={styles.name}>
                                        {member.fullName || member.email}
                                        {isMe ? <span className={styles.you}>{t('members_you')}</span> : null}
                                    </span>
                                    <span className={styles.sub} dir="ltr">
                                        {member.status === 'suspended' ? `${t('members_suspended')} · ` : ''}
                                        {member.email}
                                    </span>
                                </div>

                                {confirming ? (
                                    <div className={styles.confirm}>
                                        <span>{t('members_remove_q')}</span>
                                        <button
                                            type="button"
                                            className={styles.confirmYes}
                                            disabled={busyUserId === userId}
                                            onClick={() => void handleRemove(member)}
                                        >
                                            {tc('remove')}
                                        </button>
                                        <button
                                            type="button"
                                            className={styles.confirmNo}
                                            onClick={() => setConfirmRemoveId(null)}
                                        >
                                            {tc('cancel')}
                                        </button>
                                    </div>
                                ) : member.isOwner ? (
                                    <span className={styles.roleText}>
                                        <LuCrown size={12} aria-hidden />
                                        {t('owner')}
                                    </span>
                                ) : editable ? (
                                    <div className={styles.actions}>
                                        <select
                                            className={styles.roleSelect}
                                            value={member.authority}
                                            disabled={busyUserId === userId}
                                            onChange={(event) => void handleAuthorityChange(member, event.target.value as Authority)}
                                            aria-label={t('access')}
                                        >
                                            {authorityOptions.map((opt) => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                        <button
                                            type="button"
                                            className={styles.remove}
                                            onClick={() => setConfirmRemoveId(userId)}
                                            aria-label={tc('remove')}
                                            title={tc('remove')}
                                        >
                                            <LuTrash2 size={13} />
                                        </button>
                                    </div>
                                ) : (
                                    <span className={styles.roleText}>{authorityLabel(member.authority)}</span>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}

            <Link
                href={`/projects/${projectId}/settings/member`}
                className={styles.footerLink}
                onClick={onNavigate}
            >
                {t('members_manage_all')}
                <LuArrowUpRight size={13} aria-hidden />
            </Link>
        </div>
    );
}
