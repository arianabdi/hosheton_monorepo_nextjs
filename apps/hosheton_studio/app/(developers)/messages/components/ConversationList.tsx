'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
    LuArchive,
    LuArchiveRestore,
    LuArrowLeft,
    LuArrowRight,
    LuBan,
    LuCheckCheck,
    LuImage,
    LuLayoutTemplate,
    LuPaperclip,
    LuPin,
    LuPinOff,
    LuSearch,
    LuSearchX,
    LuTrash2,
    LuUserCog,
    LuX,
} from 'react-icons/lu';
import type { ConversationItem } from '@/app/(marketplace)/lib/types';
import { HoshetonError } from '@/app/lib/errors';
import { formatAppNumber } from '@/app/lib/i18n/formatLocaleNumber';
import RowActionMenu, { type RowActionMenuItem } from '@/app/components/common/RowActionMenu/RowActionMenu';
import { formatListTime } from '../lib/dm-format';
import { InboxEmptyHint } from './InboxEmptyHint';
import { DmAvatar } from './DmAvatar';
import styles from '../Messages.module.scss';

export type PendingPeer = { _id: string; fullName: string; avatar: string };

export type ListFolder = 'inbox' | 'archived';

export type ConversationAction = 'read' | 'pin' | 'unpin' | 'archive' | 'unarchive' | 'delete';

type Props = {
    /** همهٔ گفتگوهای قابل‌دیدن (هر دو پوشه)؛ تقسیم بر اساس `archived` همین‌جاست */
    conversations: ConversationItem[];
    loading: boolean;
    loadError: unknown;
    onRetry: () => void;
    selectedId: string | null;
    pendingTo: PendingPeer | null;
    query: string;
    onQueryChange: (value: string) => void;
    folder: ListFolder;
    onFolderChange: (folder: ListFolder) => void;
    typing: Record<string, boolean>;
    online: Record<string, boolean>;
    onSelect: (id: string) => void;
    onAction: (conversation: ConversationItem, action: ConversationAction) => void;
};

export function ConversationList({
    conversations,
    loading,
    loadError,
    onRetry,
    selectedId,
    pendingTo,
    query,
    onQueryChange,
    folder,
    onFolderChange,
    typing,
    online,
    onSelect,
    onAction,
}: Props) {
    const { t, i18n } = useTranslation('messages');
    const lang = i18n.language;
    const rtl = i18n.dir(lang) === 'rtl';
    const searchRef = useRef<HTMLInputElement>(null);

    const archivedList = useMemo(() => conversations.filter((c) => c.archived), [conversations]);
    const archivedUnread = archivedList.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
    const folderList = useMemo(
        () => conversations.filter((c) => (folder === 'archived' ? c.archived : !c.archived)),
        [conversations, folder],
    );

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return folderList;
        return folderList.filter((c) => (c.otherUser?.fullName || '').toLowerCase().includes(q)
            || (c.lastMessagePreview || '').toLowerCase().includes(q)
            || (c.template?.title || '').toLowerCase().includes(q)
            || (c.persona?.fullName || '').toLowerCase().includes(q));
    }, [folderList, query]);

    // Ctrl/⌘+K از هر جای صفحه جستجو را فوکوس می‌کند
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                searchRef.current?.focus();
                searchRef.current?.select();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    const clearSearch = () => {
        onQueryChange('');
        searchRef.current?.focus();
    };

    // ⋯ هر ردیف: خوانده‌شده، سنجاق، بایگانی، حذف (مخرب آخر و قرمز)
    const rowActions = (c: ConversationItem): RowActionMenuItem[] => [
        ...(c.unreadCount > 0 ? [{ label: t('mark_read'), icon: <LuCheckCheck size={15} />, onClick: () => onAction(c, 'read') }] : []),
        ...(!c.archived ? [c.pinnedAt
            ? { label: t('unpin'), icon: <LuPinOff size={15} />, onClick: () => onAction(c, 'unpin') }
            : { label: t('pin'), icon: <LuPin size={15} />, onClick: () => onAction(c, 'pin') }] : []),
        c.archived
            ? { label: t('unarchive'), icon: <LuArchiveRestore size={15} />, onClick: () => onAction(c, 'unarchive') }
            : { label: t('archive'), icon: <LuArchive size={15} />, onClick: () => onAction(c, 'archive') },
        { label: t('delete_chat'), icon: <LuTrash2 size={15} />, onClick: () => onAction(c, 'delete'), danger: true },
    ];

    const renderRow = (c: ConversationItem) => {
        const name = c.otherUser?.fullName || t('user');
        const unread = c.unreadCount > 0;
        const isTyping = typing[c._id];
        return (
            <li key={c._id} className={styles.convRow}>
                <button
                    type="button"
                    className={`${styles.convItem} ${selectedId === c._id ? styles.convActive : ''} ${unread ? styles.convUnread : ''}`}
                    aria-current={selectedId === c._id ? 'true' : undefined}
                    onClick={() => onSelect(c._id)}
                >
                    <DmAvatar name={name} src={c.otherUser?.avatar} online={c.otherUser ? online[c.otherUser._id] : false} />
                    <div className={styles.convBody}>
                        <div className={styles.convTop}>
                            <span className={styles.convName}>{name}</span>
                            <span className={styles.convMeta}>
                                {c.pinnedAt && <LuPin size={12} className={styles.pinIcon} aria-label={t('pinned')} />}
                                <time className={styles.convTime} dateTime={c.lastMessageAt || undefined}>
                                    {formatListTime(c.lastMessageAt, lang, t)}
                                </time>
                            </span>
                        </div>
                        <div className={styles.convBottom}>
                            {isTyping ? (
                                <p className={`${styles.convPreview} ${styles.convTyping}`}>{t('typing')}</p>
                            ) : (
                                <p className={styles.convPreview}>
                                    {c.blockedByMe || c.blockedMe ? <LuBan size={12} className={styles.previewIcon} aria-hidden /> : null}
                                    {c.lastAttachmentKind ? (
                                        <>
                                            {c.lastAttachmentKind === 'image' || c.lastAttachmentKind === 'video'
                                                ? <LuImage size={12} className={styles.previewIcon} aria-hidden />
                                                : <LuPaperclip size={12} className={styles.previewIcon} aria-hidden />}
                                            {c.lastMessagePreview || t(`attachment_${c.lastAttachmentKind}`)}
                                        </>
                                    ) : (c.lastMessagePreview || '—')}
                                </p>
                            )}
                            {unread && (
                                <span className={styles.unreadBadge} aria-label={t('unread_total', { count: c.unreadCount })}>
                                    {c.unreadCount > 99 ? formatAppNumber('99+', lang) : formatAppNumber(c.unreadCount, lang)}
                                </span>
                            )}
                        </div>
                        {(c.persona || c.template?.title) && (
                            <span className={styles.convTags}>
                                {c.persona && (
                                    // فقط ادمین‌ها این را می‌گیرند: پیام به کدام کاربر نمایشی آمده
                                    <span className={styles.convPersona} title={t('persona_hint', { defaultValue: 'گفتگوی کاربر نمایشی — پاسخ شما از طرف او ارسال می‌شود' })}>
                                        <LuUserCog size={11} />
                                        <span>{t('persona_to', { name: c.persona.fullName, defaultValue: 'به {{name}}' })}</span>
                                    </span>
                                )}
                                {c.template?.title && (
                                    <span className={styles.convTemplate}>
                                        <LuLayoutTemplate size={11} />
                                        <span>{c.template.title}</span>
                                    </span>
                                )}
                            </span>
                        )}
                    </div>
                </button>
                <RowActionMenu
                    items={rowActions(c)}
                    ariaLabel={t('row_actions', { name })}
                    className={styles.convMenu}
                />
            </li>
        );
    };

    let body: React.ReactNode;
    if (loading && !conversations.length) {
        // ردیف‌های ثابت جای‌نگهدار (بدون shimmer)
        body = (
            <div className={styles.listSkeleton} aria-hidden>
                {Array.from({ length: 6 }, (_, i) => (
                    <div key={i} className={styles.skeletonRow}>
                        <span className={styles.skeletonAvatar} />
                        <span className={styles.skeletonLines}><b /><b /></span>
                    </div>
                ))}
            </div>
        );
    } else if (loadError && !conversations.length) {
        body = (
            <div className={styles.listState}>
                <HoshetonError error={loadError} fallback={t('load_error')}>
                    {(e) => <p className={styles.stateText}>{e.message}</p>}
                </HoshetonError>
                <button type="button" className={styles.ghostBtn} onClick={onRetry}>{t('retry_load')}</button>
            </div>
        );
    } else if (!conversations.length && !pendingTo) {
        body = <InboxEmptyHint />;
    } else {
        const archiveEntry = folder === 'inbox' && archivedList.length > 0 && !query.trim() ? (
            <li>
                <button type="button" className={styles.archiveEntry} onClick={() => onFolderChange('archived')}>
                    <span className={styles.archiveEntryIcon}><LuArchive size={18} /></span>
                    <span className={styles.archiveEntryText}>
                        <strong>{t('archived_folder')}</strong>
                        <small>{t('archived_count', { count: formatAppNumber(archivedList.length, lang) as unknown as number })}</small>
                    </span>
                    {archivedUnread > 0 && (
                        <span className={`${styles.unreadBadge} ${styles.unreadBadgeMuted}`}>
                            {archivedUnread > 99 ? formatAppNumber('99+', lang) : formatAppNumber(archivedUnread, lang)}
                        </span>
                    )}
                </button>
            </li>
        ) : null;

        let empty: React.ReactNode = null;
        if (!filtered.length && !(pendingTo && folder === 'inbox')) {
            empty = query.trim() ? (
                <div className={styles.listState}>
                    <LuSearchX size={22} className={styles.stateIcon} aria-hidden />
                    <p className={styles.stateText}>{t('list_no_match')}</p>
                    <button type="button" className={styles.ghostBtn} onClick={clearSearch}>{t('clear_search')}</button>
                </div>
            ) : (
                <div className={styles.listState}>
                    <LuArchive size={22} className={styles.stateIcon} aria-hidden />
                    <p className={styles.stateText}>{t(folder === 'archived' ? 'archive_empty' : 'inbox_all_archived')}</p>
                </div>
            );
        }

        body = (
            <>
                <ul className={styles.convList}>
                    {archiveEntry}
                    {pendingTo && !selectedId && folder === 'inbox' && (
                        <li>
                            <button type="button" className={`${styles.convItem} ${styles.convActive}`} aria-current="true">
                                <DmAvatar name={pendingTo.fullName} src={pendingTo.avatar} online={online[pendingTo._id]} />
                                <div className={styles.convBody}>
                                    <div className={styles.convTop}>
                                        <span className={styles.convName}>{pendingTo.fullName}</span>
                                    </div>
                                    <p className={styles.convPreview}>{t('new_thread_hint')}</p>
                                </div>
                            </button>
                        </li>
                    )}
                    {filtered.map(renderRow)}
                </ul>
                {empty}
            </>
        );
    }

    return (
        <aside className={styles.sidebar}>
            {/* فقط جستجو؛ هم‌ارتفاع هدر گفتگو تا خط زیر هر دو ستون یکی باشد */}
            <header className={styles.sidebarHeader}>
                <div className={styles.search} role="search">
                    <LuSearch size={16} className={styles.searchIcon} aria-hidden />
                    <input
                        ref={searchRef}
                        type="search"
                        className={styles.searchInput}
                        value={query}
                        onChange={(e) => onQueryChange(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Escape' && query) {
                                e.preventDefault();
                                onQueryChange('');
                            }
                        }}
                        placeholder={t(folder === 'archived' ? 'search_archived' : 'search')}
                        aria-label={t('search')}
                        autoComplete="off"
                        spellCheck={false}
                    />
                    {query ? (
                        <>
                            <span className={styles.searchCount} aria-live="polite">{formatAppNumber(filtered.length, lang)}</span>
                            <button type="button" className={styles.searchClear} onClick={clearSearch} aria-label={t('clear_search')}>
                                <LuX size={14} />
                            </button>
                        </>
                    ) : (
                        <kbd className={styles.searchKbd} aria-hidden>Ctrl K</kbd>
                    )}
                </div>
            </header>

            {folder === 'archived' && (
                <div className={styles.folderBar}>
                    <button type="button" className={styles.folderBack} onClick={() => onFolderChange('inbox')} aria-label={t('archived_back')}>
                        {rtl ? <LuArrowRight size={17} /> : <LuArrowLeft size={17} />}
                    </button>
                    <LuArchive size={15} aria-hidden />
                    <span>{t('archived_folder')}</span>
                    <small>{formatAppNumber(archivedList.length, lang)}</small>
                </div>
            )}

            <div className={`${styles.listScroll} ${loading && conversations.length ? styles.listRefreshing : ''}`}>
                {body}
            </div>
        </aside>
    );
}
