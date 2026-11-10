'use client';

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { LuCircleAlert, LuFileText, LuPaperclip, LuPlay, LuReply, LuRotateCw, LuSendHorizontal, LuX } from 'react-icons/lu';
import type { DirectAttachment, DirectMessageItem } from '@/app/(marketplace)/lib/types';
import { replySnippet } from './MessageBubble';
import { formatAppNumber } from '@/app/lib/i18n/formatLocaleNumber';
import { fileExtension, formatBytes } from '../lib/dm-format';
import type { UploadItem } from '../hooks/useAttachmentUploads';
import styles from '../Messages.module.scss';

export const MESSAGE_MAX_LENGTH = 4000;
const COUNTER_FROM = 3500;

/** پیوست آمادهٔ ارسال (آپلود تمام‌شده) — url پیش‌نمایش محلی برای پیام خوش‌بینانه */
export type ReadyAttachment = DirectAttachment;

type Props = {
    draft: string;
    onDraftChange: (value: string) => void;
    onSend: (attachments: ReadyAttachment[]) => void;
    uploads: {
        items: UploadItem[];
        add: (files: File[]) => void;
        remove: (id: string) => void;
        retry: (id: string) => void;
        clear: () => void;
        uploading: boolean;
        hasErrors: boolean;
    };
    blockedByMe: boolean;
    blockedMe: boolean;
    onUnblock: () => void;
    focusKey: string;
    replyTarget: DirectMessageItem | null;
    /** «شما» یا نام طرف مقابل */
    replyName: string;
    onCancelReply: () => void;
};

export function Composer({
    draft,
    onDraftChange,
    onSend,
    uploads,
    blockedByMe,
    blockedMe,
    onUnblock,
    focusKey,
    replyTarget,
    replyName,
    onCancelReply,
}: Props) {
    const { t, i18n } = useTranslation('messages');
    const lang = i18n.language;
    const rtl = i18n.dir(lang) === 'rtl';
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ارتفاع خودکار — با هر تغییر متن و هر تغییر عرض (اولین چیدمان، باز/بسته شدن پنل اطلاعات)
    const fitHeight = useCallback(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    }, []);

    useLayoutEffect(fitHeight, [draft, focusKey, fitHeight]);

    useEffect(() => {
        const el = textareaRef.current;
        if (!el || typeof ResizeObserver === 'undefined') return;
        let width = el.clientWidth;
        const observer = new ResizeObserver(() => {
            if (el.clientWidth === width) return;
            width = el.clientWidth;
            fitHeight();
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, [fitHeight, blockedByMe, blockedMe]);

    useLayoutEffect(() => {
        textareaRef.current?.focus({ preventScroll: true });
    }, [focusKey, replyTarget?._id]);

    if (blockedByMe || blockedMe) {
        return (
            <div className={styles.blockedBar} role="status">
                <LuCircleAlert size={16} aria-hidden />
                <span>{blockedByMe ? t('blocked_by_me') : t('blocked_me')}</span>
                {blockedByMe && (
                    <button type="button" className={styles.ghostBtn} onClick={onUnblock}>{t('unblock_user')}</button>
                )}
            </div>
        );
    }

    const tooLong = draft.length > MESSAGE_MAX_LENGTH;
    const ready = uploads.items.filter((item) => item.status === 'done');
    const canSend = !tooLong
        && !uploads.uploading
        && !uploads.hasErrors
        && (Boolean(draft.trim()) || ready.length > 0);

    const send = () => {
        if (!canSend) return;
        onSend(ready.map((item) => ({
            fileId: item.fileId,
            kind: item.kind,
            url: item.previewUrl,
            name: item.file.name,
            mimetype: item.file.type,
            size: item.file.size,
            width: item.width,
            height: item.height,
        })));
        uploads.clear();
    };

    const showCounter = draft.length >= COUNTER_FROM;

    return (
        <form
            data-dm-composer=""
            className={styles.composer}
            onSubmit={(e) => {
                e.preventDefault();
                send();
            }}
        >
            <input
                ref={fileInputRef}
                type="file"
                multiple
                hidden
                onChange={(e) => {
                    uploads.add(Array.from(e.target.files || []));
                    e.target.value = '';
                }}
            />
            {/* یک کادر واحد: پیوست | متن | ارسال — پیوست‌های در حال آپلود بالای همان کادر */}
            <div className={`${styles.composerBox} ${tooLong ? styles.composerBoxError : ''}`}>
                {replyTarget && (
                    <div className={styles.replyBar}>
                        <LuReply size={16} className={styles.replyBarIcon} aria-hidden />
                        <span className={styles.replyBarText}>
                            <span className={styles.replyQuoteName}>{t('reply_to', { name: replyName })}</span>
                            <span className={styles.replyQuoteText} dir="auto">
                                {replySnippet({
                                    body: replyTarget.body,
                                    attachmentKind: replyTarget.attachments?.[0]?.kind || '',
                                    attachmentName: replyTarget.attachments?.[0]?.name || '',
                                }, t)}
                            </span>
                        </span>
                        <button type="button" className={styles.chipBtn} onClick={onCancelReply} aria-label={t('cancel_reply')} title={t('cancel_reply')}>
                            <LuX size={13} />
                        </button>
                    </div>
                )}
                {uploads.items.length > 0 && (
                    <ul className={styles.uploadList}>
                        {uploads.items.map((item) => (
                            <li key={item.id} className={`${styles.uploadChip} ${item.status === 'error' ? styles.uploadChipError : ''}`}>
                                {item.kind === 'image' && item.previewUrl ? (
                                    <img src={item.previewUrl} alt="" className={styles.uploadThumb} />
                                ) : item.kind === 'video' && item.previewUrl ? (
                                    <span className={styles.uploadThumb}>
                                        <video src={item.previewUrl} muted preload="metadata" />
                                        <LuPlay size={12} className={styles.uploadThumbIcon} />
                                    </span>
                                ) : (
                                    <span className={`${styles.uploadThumb} ${styles.uploadThumbFile}`}>
                                        <LuFileText size={16} />
                                        <small>{fileExtension(item.file.name)}</small>
                                    </span>
                                )}
                                <span className={styles.uploadText}>
                                    <span className={styles.uploadName} dir="auto">{item.file.name}</span>
                                    <span className={styles.uploadMeta}>
                                        {item.status === 'uploading' && `${t('uploading')} ${formatAppNumber(item.progress, lang)}٪`}
                                        {item.status === 'done' && formatBytes(item.file.size, lang)}
                                        {item.status === 'error' && t('upload_failed')}
                                    </span>
                                </span>
                                {item.status === 'uploading' && (
                                    <span className={styles.uploadProgress} style={{ transform: `scaleX(${item.progress / 100})` }} />
                                )}
                                {item.status === 'error' && (
                                    <button type="button" className={styles.chipBtn} onClick={() => uploads.retry(item.id)} aria-label={t('retry')}>
                                        <LuRotateCw size={13} />
                                    </button>
                                )}
                                <button type="button" className={styles.chipBtn} onClick={() => uploads.remove(item.id)} aria-label={t('remove_attachment')}>
                                    <LuX size={13} />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
                <div className={styles.composerRow}>
                    <button
                        type="button"
                        className={styles.composerIconBtn}
                        onClick={() => fileInputRef.current?.click()}
                        aria-label={t('attach_files')}
                        title={t('attach_files')}
                    >
                        <LuPaperclip size={19} />
                    </button>
                    <textarea
                        ref={textareaRef}
                        className={styles.composerInput}
                        value={draft}
                        onChange={(e) => onDraftChange(e.target.value)}
                        placeholder={uploads.items.length ? t('caption_placeholder') : t('composer_placeholder')}
                        aria-label={t('composer_placeholder')}
                        rows={1}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                                e.preventDefault();
                                send();
                            }
                        }}
                    />
                    <button
                        type="submit"
                        className={`${styles.sendBtn} ${canSend ? styles.sendBtnReady : ''}`}
                        disabled={!canSend}
                        aria-label={t('send')}
                        title={t('composer_hint')}
                    >
                        <LuSendHorizontal size={18} className={rtl ? styles.flipIcon : undefined} />
                    </button>
                </div>
            </div>
            {(tooLong || showCounter) && (
                <div className={styles.composerMeta} role={tooLong ? 'alert' : undefined}>
                    {tooLong && <span className={styles.composerError}>{t('too_long', { max: formatAppNumber(MESSAGE_MAX_LENGTH, lang) })}</span>}
                    <span className={`${styles.counter} ${tooLong ? styles.counterOver : ''}`}>
                        {formatAppNumber(draft.length, lang)} / {formatAppNumber(MESSAGE_MAX_LENGTH, lang)}
                    </span>
                </div>
            )}
        </form>
    );
}
