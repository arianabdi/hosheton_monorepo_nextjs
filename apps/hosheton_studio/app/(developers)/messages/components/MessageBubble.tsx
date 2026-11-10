'use client';

import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    LuCheck,
    LuCheckCheck,
    LuCircleAlert,
    LuClock3,
    LuCopy,
    LuFlag,
    LuForward,
    LuListChecks,
    LuReply,
    LuRotateCw,
    LuTrash2,
} from 'react-icons/lu';
import type { DirectAttachment, DirectMessageItem, DirectReplyRef } from '@/app/(marketplace)/lib/types';
import RowActionMenu, { type RowActionMenuItem } from '@/app/components/common/RowActionMenu/RowActionMenu';
import { formatClock, splitLinks } from '../lib/dm-format';
import { MessageAttachments } from './MessageAttachments';
import styles from '../Messages.module.scss';

type Props = {
    message: DirectMessageItem;
    groupedWithPrev: boolean;
    groupedWithNext: boolean;
    /** نام طرف مقابل — برچسب نقل‌قول پاسخ به پیام او */
    peerName: string;
    selectMode: boolean;
    selected: boolean;
    highlighted: boolean;
    onRetry: (message: DirectMessageItem) => void;
    onDiscard: (message: DirectMessageItem) => void;
    onDelete: (message: DirectMessageItem) => void;
    onCopy: (message: DirectMessageItem) => void;
    onReport: (message: DirectMessageItem) => void;
    onReply: (message: DirectMessageItem) => void;
    onForward: (message: DirectMessageItem) => void;
    onToggleSelect: (message: DirectMessageItem) => void;
    onJumpTo: (messageId: string) => void;
    onOpenMedia: (media: DirectAttachment[], index: number) => void;
};

/** متن کوتاه نقل‌قول: متن پیام یا نوع/نام پیوست */
export function replySnippet(ref: Pick<DirectReplyRef, 'body' | 'attachmentKind' | 'attachmentName'>, t: (key: string) => string) {
    if (ref.body) return ref.body;
    if (!ref.attachmentKind) return '';
    const kind = t(`attachment_${ref.attachmentKind}`);
    return ref.attachmentKind === 'file' && ref.attachmentName ? `${kind} · ${ref.attachmentName}` : kind;
}

function MessageBubbleBase({
    message,
    groupedWithPrev,
    groupedWithNext,
    peerName,
    selectMode,
    selected,
    highlighted,
    onRetry,
    onDiscard,
    onDelete,
    onCopy,
    onReport,
    onReply,
    onForward,
    onToggleSelect,
    onJumpTo,
    onOpenMedia,
}: Props) {
    const { t, i18n } = useTranslation('messages');
    const m = message;
    const attachments = m.attachments ?? [];
    const mediaOnly = !m.body && attachments.length > 0 && attachments.every((a) => a.kind === 'image' || a.kind === 'video')
        && !m.replyTo && !m.forwardedFrom;
    const local = Boolean(m.pending || m.failed);

    // کار مخرب آخر و قرمز (قانون منوی ⋯)
    const actions: RowActionMenuItem[] = [];
    if (m.failed) actions.push({ label: t('retry'), icon: <LuRotateCw size={15} />, onClick: () => onRetry(m) });
    if (!local) actions.push({ label: t('reply'), icon: <LuReply size={15} />, onClick: () => onReply(m) });
    if (!m.pending && m.body) actions.push({ label: t('copy'), icon: <LuCopy size={15} />, onClick: () => onCopy(m) });
    if (!local) {
        actions.push({ label: t('forward'), icon: <LuForward size={15} />, onClick: () => onForward(m) });
        actions.push({ label: t('select_message'), icon: <LuListChecks size={15} />, onClick: () => onToggleSelect(m) });
    }
    if (m.failed) actions.push({ label: t('discard'), icon: <LuTrash2 size={15} />, onClick: () => onDiscard(m), danger: true });
    else if (m.isMine && !m.pending) {
        actions.push({ label: t('delete_message'), icon: <LuTrash2 size={15} />, onClick: () => onDelete(m), danger: true });
    } else if (!m.isMine) {
        actions.push({ label: t('report_message'), icon: <LuFlag size={15} />, onClick: () => onReport(m), danger: true });
    }

    let statusIcon: React.ReactNode = null;
    let statusLabel = '';
    if (m.isMine) {
        if (m.failed) {
            statusLabel = t('status_failed');
            statusIcon = <LuCircleAlert size={13} />;
        } else if (m.pending) {
            statusLabel = t('status_sending');
            statusIcon = <LuClock3 size={12} />;
        } else if (m.readAt) {
            statusLabel = t('status_read');
            statusIcon = <LuCheckCheck size={14} />;
        } else {
            statusLabel = t('status_sent');
            statusIcon = <LuCheck size={14} />;
        }
    }

    const className = [
        styles.bubbleRow,
        m.isMine ? styles.rowMine : styles.rowTheirs,
        groupedWithPrev ? styles.groupedPrev : '',
    ].join(' ');

    const bubbleClass = [
        styles.bubble,
        m.isMine ? styles.mine : styles.theirs,
        groupedWithNext ? styles.groupedNext : '',
        attachments.length ? styles.bubbleWithMedia : '',
        mediaOnly ? styles.bubbleMediaOnly : '',
        m.pending ? styles.bubblePending : '',
        m.failed ? styles.bubbleFailed : '',
    ].join(' ');

    const selectable = selectMode && !local;
    const lineClass = [
        styles.msgLine,
        selectMode ? styles.msgLineSelecting : '',
        selected ? styles.msgLineSelected : '',
        highlighted ? styles.msgLineFlash : '',
    ].join(' ');

    const reply = m.replyTo;

    return (
        <div
            className={lineClass}
            data-message-id={m._id}
            onClick={selectable ? () => onToggleSelect(m) : undefined}
            onDoubleClick={!selectMode && !local ? () => onReply(m) : undefined}
            role={selectable ? 'checkbox' : undefined}
            aria-checked={selectable ? selected : undefined}
        >
            {selectMode && (
                <span className={`${styles.selectCheck} ${selected ? styles.selectCheckOn : ''}`} aria-hidden>
                    {selected && <LuCheck size={13} />}
                </span>
            )}
            <div className={className}>
                <div className={bubbleClass}>
                    {m.forwardedFrom && (
                        <span className={styles.forwardedLabel}>
                            <LuForward size={12} aria-hidden />
                            <span dir="auto">{t('forwarded_from', { name: m.forwardedFrom.name })}</span>
                        </span>
                    )}
                    {reply && (
                        <button
                            type="button"
                            className={styles.replyQuote}
                            onClick={(e) => {
                                if (selectMode) return;
                                e.stopPropagation();
                                onJumpTo(reply._id);
                            }}
                            tabIndex={selectMode ? -1 : 0}
                        >
                            <span className={styles.replyQuoteName}>{reply.isMine ? t('you') : peerName}</span>
                            <span className={styles.replyQuoteText} dir="auto">{replySnippet(reply, t)}</span>
                        </button>
                    )}
                    {attachments.length > 0 && (
                        <MessageAttachments
                            attachments={attachments}
                            onOpenMedia={selectMode ? () => undefined : onOpenMedia}
                        />
                    )}
                    {m.body && (
                        <p className={styles.bubbleText} dir="auto">
                            {splitLinks(m.body).map((part, i) => (part.type === 'link' ? (
                                <a
                                    key={i}
                                    href={part.value}
                                    target="_blank"
                                    rel="noopener noreferrer nofollow"
                                    onClick={selectMode ? (e) => e.preventDefault() : undefined}
                                >
                                    {part.value}
                                </a>
                            ) : (
                                <span key={i}>{part.value}</span>
                            )))}
                        </p>
                    )}
                </div>
                {/* ساعت و وضعیت ارسال بیرون حباب، کنار آن (پایین‌چین) */}
                <span className={styles.bubbleMeta}>
                    {/* فقط نمای ادمین گفتگوی کاربر نمایشی: کدام ادمین این را از طرف پرسونا نوشت */}
                    {m.sentByName && <span className={styles.sentBy}>{m.sentByName}</span>}
                    {statusIcon && (
                        m.failed ? (
                            <button type="button" className={styles.statusFailed} onClick={() => onRetry(m)} title={statusLabel} aria-label={statusLabel}>
                                {statusIcon}
                            </button>
                        ) : (
                            <span className={`${styles.statusIcon} ${m.readAt ? styles.statusRead : ''}`} title={statusLabel} aria-label={statusLabel}>
                                {statusIcon}
                            </span>
                        )
                    )}
                    <time dateTime={m.createdAt}>{formatClock(m.createdAt, i18n.language)}</time>
                </span>
                {actions.length > 0 && !selectMode && (
                    <RowActionMenu items={actions} ariaLabel={t('message_actions')} className={styles.bubbleMenu} />
                )}
            </div>
        </div>
    );
}

export const MessageBubble = memo(MessageBubbleBase);
