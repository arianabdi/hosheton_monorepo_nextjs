'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { MdOutlineGroups3 } from 'react-icons/md';
import { CgTrash } from 'react-icons/cg';
import { SuccessToaster } from '@my-workspace/utils';
import { notifyError } from '@/app/lib/errors';
import { formatAppNumber } from '@/app/lib/i18n/formatLocaleNumber';
import styles from './members.module.scss';
import { mediaApi } from '../../../lib/media-api';
import { getMemberUserId } from '../../../lib/current-user';
import type { MediaMemberSearchUser, MediaProjectMember } from '../../../types/media-api';

export default function MediaProjectMembersSettings() {
    const { t, i18n } = useTranslation('projects');
    const { t: tc } = useTranslation('common');
    const { projectId } = useParams<{ projectId: string }>();

    const [members, setMembers] = useState<MediaProjectMember[]>([]);
    const [canManage, setCanManage] = useState(false);
    const [loading, setLoading] = useState(true);
    const [searching, setSearching] = useState(false);

    const [inviteEmail, setInviteEmail] = useState('');
    const [searchResults, setSearchResults] = useState<MediaMemberSearchUser[]>([]);
    const [authorityByUser, setAuthorityByUser] = useState<Record<string, 'admin' | 'member' | 'guest'>>({});
    const [addingUserId, setAddingUserId] = useState<string | null>(null);

    const authorityOptions: { value: 'admin' | 'member' | 'guest'; label: string }[] = [
        { value: 'admin', label: t('manager') },
        { value: 'member', label: t('member') },
        { value: 'guest', label: t('guest') },
    ];

    const getAuthorityLabel = (authority?: string): string => {
        switch (authority) {
            case 'admin': return t('manager');
            case 'member': return t('member');
            case 'guest': return t('guest');
            case 'owner': return t('owner');
            default: return authority || t('member');
        }
    };

    const loadMembers = useCallback(async () => {
        if (!projectId) return;
        try {
            setLoading(true);
            const [{ project }, membersRes] = await Promise.all([
                mediaApi.getProject(projectId),
                mediaApi.listMembers(projectId),
            ]);
            setCanManage(Boolean(membersRes.viewerCanManage ?? project.canManage ?? project.isOwner));
            setMembers(membersRes.members || []);
        } catch (err) {
            notifyError(err, { fallback: t('load_members_error') });
        } finally {
            setLoading(false);
        }
    }, [projectId, t]);

    useEffect(() => { loadMembers(); }, [loadMembers]);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteEmail.trim() || !projectId) return;
        try {
            setSearching(true);
            const res = await mediaApi.searchMemberCandidates(projectId, inviteEmail.trim());
            const users = res.users || [];
            setSearchResults(users);
            setAuthorityByUser((prev) => {
                const next = { ...prev };
                for (const u of users) {
                    if (!next[u._id]) next[u._id] = 'member';
                }
                return next;
            });
        } catch (err) {
            notifyError(err, { fallback: t('search_user_error') });
        } finally {
            setSearching(false);
        }
    };

    const handleAddMember = async (userId: string) => {
        if (!projectId) return;
        const authority = authorityByUser[userId] || 'member';
        try {
            setAddingUserId(userId);
            await mediaApi.addMember(projectId, userId, { authority });
            SuccessToaster({ message: t('member_added') });
            setSearchResults((prev) => prev.filter((u) => u._id !== userId));
            setAuthorityByUser((prev) => {
                const next = { ...prev };
                delete next[userId];
                return next;
            });
            if (searchResults.length <= 1) setInviteEmail('');
            await loadMembers();
        } catch (err) {
            notifyError(err, { fallback: t('add_member_error') });
        } finally {
            setAddingUserId(null);
        }
    };

    const handleUpdateAuthority = async (memberUserId: string, authority: string) => {
        if (!projectId) return;
        try {
            await mediaApi.updateMember(projectId, memberUserId, { authority });
            await loadMembers();
        } catch (err) {
            notifyError(err, { fallback: t('edit_access_error') });
        }
    };

    const handleRemoveMember = async (member: MediaProjectMember) => {
        if (member.isOwner || !projectId) return;
        if (!confirm(t('remove_member_confirm', { name: member.fullName || member.email }))) return;
        try {
            await mediaApi.removeMember(projectId, getMemberUserId(member));
            SuccessToaster({ message: t('member_removed') });
            await loadMembers();
        } catch (err) {
            notifyError(err, { fallback: t('remove_member_error') });
        }
    };

    const isAlreadyMember = (userId: string) =>
        members.some((m) => getMemberUserId(m) === String(userId));

    const getInitials = (member: { initials?: string; fullName?: string; email?: string }): string => {
        if (member.initials) return member.initials;
        const name = member.fullName?.trim();
        if (name) {
            const parts = name.split(/\s+/);
            if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
            return name.slice(0, 2).toUpperCase();
        }
        return (member.email || '??').slice(0, 2).toUpperCase();
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.headerIcon}>
                    <MdOutlineGroups3 size={28} />
                </div>
                <div className={styles.headerText}>
                    <h2>{t('members')}</h2>
                    <p>{t('members_lead')}</p>
                </div>
            </div>

            <hr className={styles.divider} />

            {!canManage && !loading && (
                <div className={styles.readonlyNotice}>
                    {t('member_readonly_invite')}
                </div>
            )}

            {canManage && (
                <>
                    <div className={styles.sectionTitle}>{t('invite')}</div>
                    <form onSubmit={handleSearch} className={styles.inviteForm}>
                        <div className={styles.inviteSearchRow}>
                            <div className={styles.inputGroup}>
                                <label>{t('email_label')}</label>
                                <input
                                    type="email"
                                    placeholder="name@company.com"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    className={styles.input}
                                />
                            </div>
                            <button type="submit" className={styles.inviteBtn} disabled={searching || !inviteEmail.trim()}>
                                {searching ? t('searching') : tc('search')}
                            </button>
                        </div>
                    </form>

                    {searchResults.length > 0 && (
                        <div className={styles.searchResults}>
                            {searchResults.map((u) => (
                                <div key={u._id} className={styles.searchResultRow}>
                                    <div className={styles.memberInfo}>
                                        <div className={styles.avatar}>
                                            {u.avatar ? (
                                                <img src={u.avatar} alt={u.fullName} className={styles.avatarImage} />
                                            ) : (
                                                getInitials({ fullName: u.fullName, email: u.email })
                                            )}
                                        </div>
                                        <div className={styles.memberMeta}>
                                            <span className={styles.memberName}>{u.fullName || u.email}</span>
                                            <span className={styles.memberEmail}>{u.email}</span>
                                        </div>
                                    </div>
                                    {isAlreadyMember(u._id) ? (
                                        <span className={styles.alreadyMember}>{t('member')}</span>
                                    ) : (
                                        <div className={styles.searchResultActions}>
                                            <select
                                                className={styles.resultAuthoritySelect}
                                                value={authorityByUser[u._id] || 'member'}
                                                onChange={(e) => setAuthorityByUser((prev) => ({
                                                    ...prev,
                                                    [u._id]: e.target.value as 'admin' | 'member' | 'guest',
                                                }))}
                                            >
                                                {authorityOptions.map((opt) => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                            <button
                                                type="button"
                                                className={styles.inviteBtn}
                                                disabled={addingUserId === u._id}
                                                onClick={() => handleAddMember(u._id)}
                                            >
                                                {addingUserId === u._id ? t('adding') : tc('add')}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            <div className={styles.sectionTitle} style={{ marginTop: '40px' }}>
                {t('current_members', { count: formatAppNumber(members.length, i18n.language) })}
            </div>

            {loading ? (
                <p className={styles.loadingText}>{tc('loading')}</p>
            ) : (
                <div className={styles.membersList}>
                    {members.map((member) => (
                        <div key={getMemberUserId(member)} className={styles.memberRow}>
                            <div className={styles.memberInfo}>
                                <div className={styles.avatar}>
                                    {member.avatar ? (
                                        <img src={member.avatar} alt={member.fullName} className={styles.avatarImage} />
                                    ) : (
                                        getInitials(member)
                                    )}
                                </div>
                                <div className={styles.memberMeta}>
                                    <span className={styles.memberName}>{member.fullName || member.email}</span>
                                    <span className={styles.memberEmail}>{member.email}</span>
                                </div>
                            </div>

                            <div className={styles.memberRolesGrid}>
                                {!member.isOwner && canManage ? (
                                    <div className={styles.permissionTag}>
                                        <span className={styles.tagLabel}>{t('access')}</span>
                                        <select
                                            className={styles.inlineSelect}
                                            value={member.authority || 'member'}
                                            onChange={(e) => handleUpdateAuthority(getMemberUserId(member), e.target.value)}
                                        >
                                            {authorityOptions.map((opt) => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                ) : (
                                    <div className={styles.permissionTag}>
                                        <span className={styles.tagLabel}>{t('access')}</span>
                                        <span className={styles.tagValue}>{getAuthorityLabel(member.authority)}</span>
                                    </div>
                                )}
                            </div>

                            <div className={styles.memberActions}>
                                {!member.isOwner && canManage && (
                                    <button
                                        type="button"
                                        className={styles.removeBtn}
                                        onClick={() => handleRemoveMember(member)}
                                    >
                                        <CgTrash color={'#9f2142'} size={18} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
