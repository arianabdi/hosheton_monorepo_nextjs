'use client';

import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { ModalCloseButton } from '@my-workspace/components';
import {
    LuArchive,
    LuArchiveRestore,
    LuArrowDown,
    LuArrowLeft,
    LuArrowRight,
    LuBan,
    LuCopy,
    LuFlag,
    LuForward,
    LuInfo,
    LuLayoutTemplate,
    LuPin,
    LuPinOff,
    LuTrash2,
    LuUpload,
    LuUser,
} from 'react-icons/lu';
import type { ConversationItem, DirectAttachment, DirectMessageItem } from '@/app/(marketplace)/lib/types';
import { templateDetailPath } from '@/app/(marketplace)/lib/explore-detail';
import { HoshetonError, notifyError } from '@/app/lib/errors';
import { formatAppNumber } from '@/app/lib/i18n/formatLocaleNumber';
import RowActionMenu, { type RowActionMenuItem } from '@/app/components/common/RowActionMenu/RowActionMenu';
import { dayKey, formatBytes, formatDayLabel, formatLastSeen } from '../lib/dm-format';
import { ATTACHMENTS_MAX, ATTACHMENT_MAX_BYTES, filesFromTransfer, shouldTakePaste, useAttachmentUploads } from '../hooks/useAttachmentUploads';
import { Composer, type ReadyAttachment } from './Composer';
import { DmAvatar } from './DmAvatar';
import { MessageBubble } from './MessageBubble';
import { ThreadEmptyHint } from './ThreadEmptyHint';
import type { ConversationAction, PendingPeer } from './ConversationList';
import styles from '../Messages.module.scss';

export { MESSAGE_MAX_LENGTH } from './Composer';

const GROUP_WINDOW_MS = 5 * 60 * 1000;
const NEAR_BOTTOM_PX = 140;

export type ThreadState = {
    messages: DirectMessageItem[];
    hasMore: boolean;
    loading: boolean;
    loadingOlder: boolean;
    error: unknown;
    /** اولین پیام خوانده‌نشده هنگام باز کردن — جداکنندهٔ «پیام‌های جدید» */
    firstUnreadId: string | null;
};

type Props = {
    conversation: ConversationItem | null;
    pendingTo: PendingPeer | null;
    /** گفتگو از URL انتخاب شده ولی هنوز در فهرست نیست (لینک مستقیم/اعلان) */
    selecting: boolean;
    thread: ThreadState | null;
    presence: { online: boolean; lastSeenAt: string | null } | undefined;
    typing: boolean;
    connected: boolean;
    draft: string;
    infoOpen: boolean;
    onToggleInfo: () => void;
    onDraftChange: (value: string) => void;
    onSend: (attachments: ReadyAttachment[]) => void;
    onBack: () => void;
    onLoadOlder: () => void;
    onRetryLoad: () => void;
    onRetryMessage: (message: DirectMessageItem) => void;
    onDiscardMessage: (message: DirectMessageItem) => void;
    onDeleteMessage: (message: DirectMessageItem) => void;
    onDeleteMessages: (messages: DirectMessageItem[]) => void;
    onCopyMessage: (message: DirectMessageItem) => void;
    onCopyMessages: (messages: DirectMessageItem[]) => void;
    onForward: (messages: DirectMessageItem[]) => void;
    /** پیامی که کامپوزر در حال پاسخ به آن است */
    replyTarget: DirectMessageItem | null;
    onReply: (message: DirectMessageItem) => void;
    onCancelReply: () => void;
    onReport: (message?: DirectMessageItem) => void;
    onBlock: () => void;
    onUnblock: () => void;
    onConversationAction: (conversation: ConversationItem, action: ConversationAction) => void;
    onOpenMedia: (media: DirectAttachment[], index: number) => void;
};

export function ThreadView({
    conversation,
    pendingTo,
    selecting,
    thread,
    presence,
    typing,
    connected,
    draft,
    infoOpen,
    onToggleInfo,
    onDraftChange,
    onSend,
    onBack,
    onLoadOlder,
    onRetryLoad,
    onRetryMessage,
    onDiscardMessage,
    onDeleteMessage,
    onDeleteMessages,
    onCopyMessage,
    onCopyMessages,
    onForward,
    replyTarget,
    onReply,
    onCancelReply,
    onReport,
    onBlock,
    onUnblock,
    onConversationAction,
    onOpenMedia,
}: Props) {
    const { t, i18n } = useTranslation('messages');
    const router = useRouter();
    const lang = i18n.language;
    const rtl = i18n.dir(lang) === 'rtl';
    const scrollerRef = useRef<HTMLDivElement>(null);
    const topSentinelRef = useRef<HTMLDivElement>(null);
    const nearBottomRef = useRef(true);
    const prevHeightRef = useRef<number | null>(null);
    const lastCountRef = useRef(0);
    const lastTailRef = useRef<string | null>(null);
    const dragDepth = useRef(0);
    const [newBelow, setNewBelow] = useState(0);
    const [showJump, setShowJump] = useState(false);
    const [dragging, setDragging] = useState(false);
    // انتخاب چندتایی پیام‌ها (کپی / بازارسال / حذف) — با عوض‌شدن گفتگو ThreadView از نو ساخته می‌شود
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [flashId, setFlashId] = useState<string | null>(null);
    const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const peer = conversation?.otherUser || pendingTo;
    const conversationKey = conversation?._id || (pendingTo ? `to:${pendingTo._id}` : '');
    const messages = thread?.messages ?? [];
    const blockedByMe = Boolean(conversation?.blockedByMe);
    const blockedMe = Boolean(conversation?.blockedMe);
    const canAttach = Boolean(peer) && !blockedByMe && !blockedMe;

    // انتخاب‌شده‌ها به ترتیب زمانی؛ پیامی که حذف شد خودبه‌خود از انتخاب بیرون می‌رود
    const selectedMessages = messages.filter((m) => selectedIds.includes(m._id));
    const selectMode = selectedMessages.length > 0;
    const clearSelection = useCallback(() => setSelectedIds([]), []);
    const toggleSelect = useCallback((message: DirectMessageItem) => {
        if (message.pending || message.failed) return;
        setSelectedIds((prev) => (prev.includes(message._id)
            ? prev.filter((id) => id !== message._id)
            : [...prev, message._id]));
    }, []);

    const forwardOne = useCallback((message: DirectMessageItem) => onForward([message]), [onForward]);

    // Escape: اول انتخاب، بعد پاسخ لغو شود
    useEffect(() => {
        if (!selectMode && !replyTarget) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape' || document.querySelector('[role="dialog"]')) return;
            if (selectMode) clearSelection();
            else onCancelReply();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [selectMode, replyTarget, clearSelection, onCancelReply]);

    // کلیک روی نقل‌قول: پرش به پیام اصلی و درخشش کوتاه
    const jumpTo = useCallback((messageId: string) => {
        const target = scrollerRef.current?.querySelector(`[data-message-id="${CSS.escape(messageId)}"]`);
        if (!target) {
            notifyError({ message: t('reply_unavailable') });
            return;
        }
        target.scrollIntoView({ block: 'center', behavior: 'smooth' });
        if (flashTimer.current) clearTimeout(flashTimer.current);
        setFlashId(messageId);
        flashTimer.current = setTimeout(() => setFlashId(null), 1400);
    }, [t]);

    useEffect(() => () => {
        if (flashTimer.current) clearTimeout(flashTimer.current);
    }, []);

    const runOnSelection = (action: (list: DirectMessageItem[]) => void) => {
        action(selectedMessages);
        clearSelection();
    };
    const canDeleteSelection = selectMode && selectedMessages.every((m) => m.isMine && !m.pending && !m.failed);
    const canCopySelection = selectedMessages.some((m) => m.body);

    const uploads = useAttachmentUploads(useCallback((rejection) => {
        if (rejection.reason === 'too_many') {
            notifyError({ message: t('too_many_files', { max: formatAppNumber(ATTACHMENTS_MAX, i18n.language) }) });
        } else {
            notifyError({ message: t('file_too_large', { name: rejection.file?.name || '', max: formatBytes(ATTACHMENT_MAX_BYTES, i18n.language) }) });
        }
    }, [t, i18n.language]));

    const addFilesRef = useRef(uploads.add);
    useEffect(() => {
        addFilesRef.current = uploads.add;
    }, [uploads.add]);

    // Ctrl+V فایل از هر جای صفحه (نه فقط وقتی فوکوس روی کادر پیام است)
    useEffect(() => {
        if (!canAttach) return;
        const onPaste = (event: ClipboardEvent) => {
            const files = filesFromTransfer(event.clipboardData);
            if (!files.length) return;
            const composer = document.querySelector('[data-dm-composer]');
            if (!shouldTakePaste(event.target, composer)) return;
            event.preventDefault();
            addFilesRef.current(files);
            composer?.querySelector('textarea')?.focus({ preventScroll: true });
        };
        window.addEventListener('paste', onPaste);
        return () => window.removeEventListener('paste', onPaste);
    }, [canAttach]);

    // فایلی که بیرون از گفتگو رها شود مرورگر را از صفحه بیرون نبرد؛ کشیدن نیمه‌کاره هالهٔ رهاکردن را جا نگذارد
    useEffect(() => {
        const isFileDrag = (e: DragEvent) => Array.from(e.dataTransfer?.types || []).includes('Files');
        const guard = (e: DragEvent) => {
            // گفتگو خودش قبول کرده (defaultPrevented)؛ جای دیگر: نشانگر «رها نمی‌شود»
            if (!isFileDrag(e) || e.defaultPrevented) return;
            e.preventDefault();
            if (e.dataTransfer) e.dataTransfer.dropEffect = 'none';
        };
        const reset = (e: DragEvent) => {
            guard(e);
            dragDepth.current = 0;
            setDragging(false);
        };
        window.addEventListener('dragover', guard);
        window.addEventListener('drop', reset);
        window.addEventListener('dragend', reset);
        return () => {
            window.removeEventListener('dragover', guard);
            window.removeEventListener('drop', reset);
            window.removeEventListener('dragend', reset);
        };
    }, []);

    const scrollToBottom = useCallback((smooth = false) => {
        const el = scrollerRef.current;
        if (!el) return;
        el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
        setNewBelow(0);
    }, []);

    // باز شدن گفتگو: به جداکنندهٔ «پیام‌های جدید» یا انتهای گفتگو برو
    const openedRef = useRef<string>('');
    useLayoutEffect(() => {
        if (!conversationKey || thread?.loading) return;
        if (openedRef.current === conversationKey) return;
        openedRef.current = conversationKey;
        lastCountRef.current = messages.length;
        lastTailRef.current = messages[messages.length - 1]?._id ?? null;
        setNewBelow(0);
        const divider = scrollerRef.current?.querySelector('[data-unread-divider]') as HTMLElement | null;
        if (divider && scrollerRef.current) {
            scrollerRef.current.scrollTop = Math.max(0, divider.offsetTop - 24);
        } else {
            scrollToBottom();
        }
    }, [conversationKey, thread?.loading, messages, scrollToBottom]);

    // پیام تازه در انتها: اگر پایین هستیم یا پیام خودم است بچسب به پایین، وگرنه شمارندهٔ «پیام جدید»
    useLayoutEffect(() => {
        if (openedRef.current !== conversationKey) return;
        const tail = messages[messages.length - 1];
        const tailId = tail?._id ?? null;
        const grewAtEnd = tailId !== lastTailRef.current && messages.length >= lastCountRef.current;
        const prevHeight = prevHeightRef.current;
        if (prevHeight !== null && scrollerRef.current) {
            // پیام‌های قدیمی‌تر بالا اضافه شدند — جای فعلی خواننده حفظ شود
            scrollerRef.current.scrollTop += scrollerRef.current.scrollHeight - prevHeight;
            prevHeightRef.current = null;
        } else if (grewAtEnd && tail) {
            if (tail.isMine || nearBottomRef.current) scrollToBottom(true);
            else setNewBelow((n) => n + 1);
        }
        lastCountRef.current = messages.length;
        lastTailRef.current = tailId;
    }, [messages, conversationKey, scrollToBottom]);

    // «در حال نوشتن» طرف مقابل وقتی پایین هستیم دیده شود
    useEffect(() => {
        if (typing && nearBottomRef.current) scrollToBottom(true);
    }, [typing, scrollToBottom]);

    // بارگذاری قبلی‌ها ناموفق بود (پیام‌ها عوض نشدند) — جبران اسکرول بعدی را اشتباه اعمال نکن
    useEffect(() => {
        if (!thread?.loadingOlder) prevHeightRef.current = null;
    }, [thread?.loadingOlder]);

    const loadOlder = useCallback(() => {
        if (!thread?.hasMore || thread.loadingOlder || thread.loading) return;
        prevHeightRef.current = scrollerRef.current?.scrollHeight ?? null;
        onLoadOlder();
    }, [thread, onLoadOlder]);

    // بارگذاری خودکار پیام‌های قبلی با رسیدن به بالای گفتگو
    useEffect(() => {
        const root = scrollerRef.current;
        const target = topSentinelRef.current;
        if (!root || !target || !thread?.hasMore) return;
        const observer = new IntersectionObserver((entries) => {
            if (entries.some((e) => e.isIntersecting)) loadOlder();
        }, { root, rootMargin: '120px 0px 0px 0px' });
        observer.observe(target);
        return () => observer.disconnect();
    }, [thread?.hasMore, loadOlder, conversationKey]);

    const onScroll = () => {
        const el = scrollerRef.current;
        if (!el) return;
        const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
        nearBottomRef.current = distance < NEAR_BOTTOM_PX;
        setShowJump(distance > NEAR_BOTTOM_PX * 2);
        if (nearBottomRef.current) setNewBelow(0);
    };

    const backButton = (
        <button type="button" className={styles.backBtn} onClick={onBack} aria-label={t('back')}>
            {rtl ? <LuArrowRight size={18} /> : <LuArrowLeft size={18} />}
        </button>
    );

    const skeleton = (
        <div className={styles.threadSkeleton} aria-hidden>
            {[60, 40, 72, 52, 34].map((w, i) => (
                <span key={i} className={i % 2 ? styles.skeletonMine : styles.skeletonTheirs} style={{ width: `${w}%` }} />
            ))}
        </div>
    );

    if (!peer && selecting) {
        return (
            <section className={styles.thread}>
                <header className={styles.threadHeader}>
                    {backButton}
                    <span className={styles.skeletonAvatar} />
                    <span className={styles.skeletonLines}><b /></span>
                </header>
                {thread?.error ? (
                    <div className={styles.threadState}>
                        <HoshetonError error={thread.error} fallback={t('load_messages_error')}>
                            {(e) => <p className={styles.stateText}>{e.message}</p>}
                        </HoshetonError>
                        <button type="button" className={styles.ghostBtn} onClick={onRetryLoad}>{t('retry_load')}</button>
                    </div>
                ) : skeleton}
            </section>
        );
    }

    if (!peer) {
        return (
            <section className={`${styles.thread} ${styles.threadIdle}`}>
                <ThreadEmptyHint title={t('thread_empty_title')} text={t('thread_empty_hint')} />
            </section>
        );
    }

    const name = peer.fullName || t('user');
    const template = conversation?.template || null;

    let status: React.ReactNode = null;
    if (typing) status = <span className={styles.statusTyping}>{t('typing')}</span>;
    else if (presence?.online) status = <span className={styles.statusOnline}>{t('online')}</span>;
    else if (presence?.lastSeenAt) status = <span>{t('last_seen', { time: formatLastSeen(presence.lastSeenAt, lang, t) })}</span>;
    else if (conversation?.role) status = <span>{t(conversation.role === 'creator' ? 'role_buyer' : 'role_creator')}</span>;

    // ⋯ گفتگو: ناوبری اول، مسدود/گزارش آخر (گزارش قرمز)
    const headerActions: RowActionMenuItem[] = [
        { label: t('view_profile'), icon: <LuUser size={15} />, onClick: () => router.push(`/creators/${peer._id}`) },
        ...(template ? [{
            label: t('view_template'),
            icon: <LuLayoutTemplate size={15} />,
            onClick: () => router.push(templateDetailPath({ _id: template._id, slug: template.slug })),
        }] : []),
        ...(conversation ? [
            ...(!conversation.archived ? [conversation.pinnedAt
                ? { label: t('unpin'), icon: <LuPinOff size={15} />, onClick: () => onConversationAction(conversation, 'unpin') }
                : { label: t('pin'), icon: <LuPin size={15} />, onClick: () => onConversationAction(conversation, 'pin') }] : []),
            conversation.archived
                ? { label: t('unarchive'), icon: <LuArchiveRestore size={15} />, onClick: () => onConversationAction(conversation, 'unarchive') }
                : { label: t('archive'), icon: <LuArchive size={15} />, onClick: () => onConversationAction(conversation, 'archive') },
            blockedByMe
                ? { label: t('unblock_user'), icon: <LuBan size={15} />, onClick: onUnblock }
                : { label: t('block_user'), icon: <LuBan size={15} />, onClick: onBlock },
            { label: t('delete_chat'), icon: <LuTrash2 size={15} />, onClick: () => onConversationAction(conversation, 'delete'), danger: true },
            { label: t('report_user'), icon: <LuFlag size={15} />, onClick: () => onReport(), danger: true },
        ] : []),
    ];

    const renderMessages = () => {
        if (thread?.loading && !messages.length) return skeleton;
        if (thread?.error && !messages.length) {
            return (
                <div className={styles.threadState}>
                    <HoshetonError error={thread.error} fallback={t('load_messages_error')}>
                        {(e) => <p className={styles.stateText}>{e.message}</p>}
                    </HoshetonError>
                    <button type="button" className={styles.ghostBtn} onClick={onRetryLoad}>{t('retry_load')}</button>
                </div>
            );
        }
        if (!messages.length) {
            return (
                <div className={styles.threadState}>
                    <ThreadEmptyHint
                        title={conversation ? t('no_messages') : t('new_thread_title', { name })}
                        text={t('new_thread_hint')}
                    />
                </div>
            );
        }

        return (
            <>
                <div ref={topSentinelRef} className={styles.topSentinel} />
                {thread?.hasMore && (
                    <button type="button" className={styles.loadOlder} onClick={loadOlder} disabled={thread.loadingOlder}>
                        {thread.loadingOlder ? t('loading_older') : t('load_older')}
                    </button>
                )}
                {messages.map((m, index) => {
                    const prev = messages[index - 1];
                    const next = messages[index + 1];
                    const newDay = !prev || dayKey(prev.createdAt) !== dayKey(m.createdAt);
                    const groupedWithPrev = Boolean(prev) && !newDay && prev.senderId === m.senderId
                        && new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() < GROUP_WINDOW_MS;
                    const groupedWithNext = Boolean(next) && next.senderId === m.senderId
                        && dayKey(next.createdAt) === dayKey(m.createdAt)
                        && new Date(next.createdAt).getTime() - new Date(m.createdAt).getTime() < GROUP_WINDOW_MS;
                    return (
                        <Fragment key={m._id}>
                            {newDay && (
                                <div className={styles.daySeparator} role="separator">
                                    <span>{formatDayLabel(m.createdAt, lang, t)}</span>
                                </div>
                            )}
                            {thread?.firstUnreadId === m._id && (
                                <div className={styles.unreadDivider} data-unread-divider role="separator">
                                    <span>{t('new_messages')}</span>
                                </div>
                            )}
                            <MessageBubble
                                message={m}
                                groupedWithPrev={groupedWithPrev && thread?.firstUnreadId !== m._id}
                                groupedWithNext={groupedWithNext && thread?.firstUnreadId !== next?._id}
                                peerName={name}
                                selectMode={selectMode}
                                selected={selectedIds.includes(m._id)}
                                highlighted={flashId === m._id}
                                onRetry={onRetryMessage}
                                onDiscard={onDiscardMessage}
                                onDelete={onDeleteMessage}
                                onCopy={onCopyMessage}
                                onReport={onReport}
                                onReply={onReply}
                                onForward={forwardOne}
                                onToggleSelect={toggleSelect}
                                onJumpTo={jumpTo}
                                onOpenMedia={onOpenMedia}
                            />
                        </Fragment>
                    );
                })}
                {typing && (
                    <div className={styles.typingBubble} aria-label={t('typing')}>
                        <i /><i /><i />
                    </div>
                )}
            </>
        );
    };

    const hasFiles = (e: React.DragEvent) => Array.from(e.dataTransfer?.types || []).includes('Files');

    return (
        <section
            className={styles.thread}
            onDragEnter={(e) => {
                if (!canAttach || !hasFiles(e)) return;
                e.preventDefault();
                dragDepth.current += 1;
                setDragging(true);
            }}
            onDragOver={(e) => {
                if (canAttach && hasFiles(e)) e.preventDefault();
            }}
            onDragLeave={() => {
                if (!dragDepth.current) return;
                dragDepth.current -= 1;
                if (!dragDepth.current) setDragging(false);
            }}
            onDrop={(e) => {
                if (!canAttach || !hasFiles(e)) return;
                e.preventDefault();
                dragDepth.current = 0;
                setDragging(false);
                uploads.add(filesFromTransfer(e.dataTransfer));
            }}
        >
            {selectMode ? (
                // نوار انتخاب جای هدر: لغو | شمارنده | کپی، بازارسال، حذف
                <header className={`${styles.threadHeader} ${styles.selectionBar}`}>
                    <ModalCloseButton placement="inline" size="sm" onClick={clearSelection} aria-label={t('cancel_selection')} />
                    <span className={styles.selectionCount}>
                        {t('selected_count', { count: formatAppNumber(selectedMessages.length, lang) as unknown as number })}
                    </span>
                    {canCopySelection && (
                        <button
                            type="button"
                            className={styles.headerIconBtn}
                            onClick={() => runOnSelection(onCopyMessages)}
                            aria-label={t('copy')}
                            title={t('copy')}
                        >
                            <LuCopy size={17} />
                        </button>
                    )}
                    <button
                        type="button"
                        className={styles.headerIconBtn}
                        onClick={() => runOnSelection(onForward)}
                        aria-label={t('forward')}
                        title={t('forward')}
                    >
                        <LuForward size={18} />
                    </button>
                    {canDeleteSelection && (
                        <button
                            type="button"
                            className={`${styles.headerIconBtn} ${styles.headerIconDanger}`}
                            onClick={() => runOnSelection(onDeleteMessages)}
                            aria-label={t('delete_message')}
                            title={t('delete_message')}
                        >
                            <LuTrash2 size={17} />
                        </button>
                    )}
                </header>
            ) : (
            <header className={styles.threadHeader}>
                {backButton}
                <button type="button" className={styles.peer} onClick={onToggleInfo} aria-expanded={infoOpen} aria-label={t('info_open')}>
                    <DmAvatar name={name} src={peer.avatar} online={presence?.online} />
                    <span className={styles.peerText}>
                        <strong>{name}</strong>
                        {status && <small className={styles.peerStatus}>{status}</small>}
                    </span>
                </button>
                {conversation?.persona && (
                    // فقط ادمین: پیام‌ها از طرف این کاربر نمایشی فرستاده می‌شوند
                    <span
                        className={styles.personaChip}
                        title={t('persona_hint', { defaultValue: 'گفتگوی کاربر نمایشی — پاسخ شما از طرف او ارسال می‌شود' })}
                    >
                        <DmAvatar name={conversation.persona.fullName} src={conversation.persona.avatar} size="sm" />
                        <span>{t('persona_as', { name: conversation.persona.fullName, defaultValue: 'از طرف {{name}}' })}</span>
                    </span>
                )}
                <button
                    type="button"
                    className={`${styles.headerIconBtn} ${infoOpen ? styles.headerIconBtnActive : ''}`}
                    onClick={onToggleInfo}
                    aria-pressed={infoOpen}
                    aria-label={t('info_open')}
                    title={t('info_open')}
                >
                    <LuInfo size={18} />
                </button>
                <RowActionMenu items={headerActions} ariaLabel={t('conversation_actions')} />
            </header>
            )}

            {!connected && <div className={styles.reconnecting} role="status">{t('reconnecting')}</div>}

            <div className={styles.messagesWrap}>
                <div
                    className={`${styles.messages} ${thread?.loading && messages.length ? styles.messagesRefreshing : ''}`}
                    ref={scrollerRef}
                    onScroll={onScroll}
                    role="log"
                    aria-live="polite"
                >
                    {renderMessages()}
                </div>
                {(showJump || newBelow > 0) && messages.length > 0 && (
                    <button type="button" className={styles.jumpBtn} onClick={() => scrollToBottom(true)} aria-label={t('jump_latest')}>
                        <LuArrowDown size={17} />
                        {newBelow > 0 && <span className={styles.jumpCount}>{formatAppNumber(newBelow, lang)}</span>}
                    </button>
                )}
                {dragging && (
                    <div className={styles.dropOverlay} aria-hidden>
                        <LuUpload size={26} />
                        <span>{t('drop_files')}</span>
                    </div>
                )}
            </div>

            <Composer
                draft={draft}
                onDraftChange={onDraftChange}
                onSend={onSend}
                uploads={uploads}
                blockedByMe={blockedByMe}
                blockedMe={blockedMe}
                onUnblock={onUnblock}
                focusKey={conversationKey}
                replyTarget={replyTarget}
                replyName={replyTarget ? (replyTarget.isMine ? t('you') : name) : ''}
                onCancelReply={onCancelReply}
            />
        </section>
    );
}
