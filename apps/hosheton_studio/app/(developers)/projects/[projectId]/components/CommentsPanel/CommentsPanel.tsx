'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { LuLoader, LuMousePointerClick, LuPaperclip, LuSend, LuTrash2, LuX } from 'react-icons/lu';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { getCurrentUserId } from '../../../lib/current-user';
import { mediaApi } from '../../../lib/media-api';
import { getApiErrorMessage } from '../../../lib/api-client';
import { uploadFileInChunks, resolveUploadedFileRef } from '../../lib/chunk-uploader';
import { buildPublicFileUrl } from '../../lib/file-url';
import { formatAppDate } from '@/app/lib/i18n/formatLocaleNumber';
import { useCommentsRealtime } from '../../../hooks/useCommentsRealtime';
import { VoiceMessage } from './VoiceMessage';
import type { MediaComment, MediaCommentAttachment } from '../../../types/media-api';
import styles from './CommentsPanel.module.scss';

function getInitials(name?: string, fallback = '?') {
    const trimmed = name?.trim();
    if (!trimmed) return fallback;
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return trimmed.slice(0, 2).toUpperCase();
}

const AUDIO_EXT_RE = /\.(mp3|wav|ogg|oga|m4a|aac|opus|webm)(?:[?#]|$)/i;
const IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|avif|bmp|svg)(?:[?#]|$)/i;

const attachmentUrl = (att: MediaCommentAttachment) =>
    att.url || buildPublicFileUrl(att.fileKey || '');

const isAudioAttachment = (att: MediaCommentAttachment) =>
    AUDIO_EXT_RE.test(att.fileName || '')
    || AUDIO_EXT_RE.test(att.url || '')
    || AUDIO_EXT_RE.test(att.fileKey || '');

const isImageAttachment = (att: MediaCommentAttachment) =>
    IMAGE_EXT_RE.test(att.fileName || '')
    || IMAGE_EXT_RE.test(att.url || '')
    || IMAGE_EXT_RE.test(att.fileKey || '');

/**
 * Single merge point for both delivery paths (REST response + `comment:new`
 * socket event). The gateway broadcasts to the sender's room too, so the
 * REST reply and the realtime event race — without this upsert the sender
 * sees every own message twice.
 */
function upsertComment(list: MediaComment[], incoming: MediaComment): MediaComment[] {
    const id = String(incoming?._id || '');
    if (!id) return list;
    const exists = list.some((c) => String(c._id) === id);
    const merged = exists
        ? list.map((c) => (String(c._id) === id ? { ...c, ...incoming } : c))
        : [...list, incoming];
    return [...merged].sort((a, b) => {
        const ta = new Date(a.createdAt || 0).getTime();
        const tb = new Date(b.createdAt || 0).getTime();
        return ta - tb;
    });
}

interface CommentsPanelProps {
    projectId: string;
}

export function CommentsPanel({ projectId }: CommentsPanelProps) {
    const { t } = useTranslation('projects');
    const { t: tc } = useTranslation('common');
    const authToken = useAuthStore((s) => s.token);
    const appToken = useAppStore((s) => s.token);
    const lang = useAppStore((s) => s.lang);
    const token = authToken || appToken;
    const currentUserId = getCurrentUserId();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const listEndRef = useRef<HTMLDivElement | null>(null);

    const [comments, setComments] = useState<MediaComment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [text, setText] = useState('');
    const [pendingAttachments, setPendingAttachments] = useState<MediaCommentAttachment[]>([]);
    const [uploading, setUploading] = useState(false);
    const [sending, setSending] = useState(false);
    /** Which project the current `comments` snapshot belongs to. */
    const loadedProjectRef = useRef('');

    const load = useCallback(async () => {
        const switching = loadedProjectRef.current !== projectId;
        if (switching) setLoading(true);
        setError(null);
        try {
            const { comments: fetched } = await mediaApi.listComments(projectId);
            setComments((prev) => {
                // Merge so a socket event landing mid-refetch is never lost;
                // drop the old snapshot entirely when the project changed.
                let merged = loadedProjectRef.current === projectId ? prev : [];
                for (const comment of fetched ?? []) merged = upsertComment(merged, comment);
                return merged;
            });
            loadedProjectRef.current = projectId;
        } catch (err) {
            setError(getApiErrorMessage(err, t('load_comments_error')));
        } finally {
            setLoading(false);
        }
    }, [projectId, t]);

    useEffect(() => {
        void load();
    }, [load]);

    useEffect(() => {
        listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [comments.length]);

    const handleAttach = async (file: File) => {
        if (!token) return;
        setUploading(true);
        setError(null);
        try {
            const result = await uploadFileInChunks({
                file,
                token,
                metadata: { source: 'media-studio-comment' },
            });
            const { fileId, fileKey } = resolveUploadedFileRef(result);
            if (!fileId) throw new Error(t('no_file_id'));
            setPendingAttachments((prev) => [...prev, {
                fileId,
                fileKey,
                fileName: file.name,
                url: buildPublicFileUrl(fileKey),
            }]);
        } catch (err) {
            setError(getApiErrorMessage(err, t('attach_error')));
        } finally {
            setUploading(false);
        }
    };

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleAttach(file);
        e.target.value = '';
    };

    const removePendingAttachment = (idx: number) => {
        setPendingAttachments((prev) => prev.filter((_, i) => i !== idx));
    };

    const handleSend = async () => {
        const trimmed = text.trim();
        if ((!trimmed && pendingAttachments.length === 0) || sending) return;
        setSending(true);
        setError(null);
        try {
            const created = await mediaApi.addComment(projectId, {
                text: trimmed,
                attachments: pendingAttachments,
            });
            // Deduped on purpose: the socket `comment:new` broadcast reaches the
            // sender as well and usually wins the race against this REST reply.
            setComments((prev) => upsertComment(prev, created));
            setText('');
            setPendingAttachments([]);
        } catch (err) {
            setError(getApiErrorMessage(err, t('send_comment_error')));
        } finally {
            setSending(false);
        }
    };

    const handleDelete = async (commentId: string) => {
        if (!confirm(t('delete_comment_confirm'))) return;
        try {
            await mediaApi.deleteComment(projectId, commentId);
            setComments((prev) => prev.filter((c) => c._id !== commentId));
        } catch (err) {
            setError(getApiErrorMessage(err, t('delete_comment_error')));
        }
    };

    // Realtime comment updates over the shared project socket (dedup by _id).
    useCommentsRealtime(projectId, {
        onCommentNew: (comment) => {
            setComments((prev) => upsertComment(prev, comment));
        },
        onCommentDeleted: (commentId) => {
            setComments((prev) => prev.filter((c) => c._id !== commentId));
        },
        onReconnect: () => {
            void load();
        },
    });

    return (
        <div className={styles.commentsPanel}>
            {error && <div className={styles.commentsError}>{error}</div>}

            <div className={styles.commentsList}>
                {loading && comments.length === 0 && (
                    <div className={styles.commentsEmpty}>{tc('loading')}</div>
                )}
                {!loading && comments.length === 0 && (
                    <div className={styles.emptyChat}>
                        {/* موشن سبک فقط با CSS (هم‌سبک حالت خالی تنظیمات نود): پیام اول تایپ و ارسال می‌شود،
                            حباب با «بوم» بالا می‌پرد و طرف مقابل در حال نوشتن است */}
                        <div className={styles.emptyChatArt} aria-hidden>
                            <span className={styles.emptyChatBubble}>
                                <b />
                                <b />
                                <span className={styles.emptyChatFlash} />
                            </span>
                            <span className={styles.emptyChatTyping}>
                                <i />
                                <i />
                                <i />
                            </span>
                            <span className={styles.emptyChatComposer}>
                                <span className={styles.emptyChatDraft} />
                                <span className={styles.emptyChatSend}><LuSend /></span>
                            </span>
                            <span className={styles.emptyChatRipple} />
                            <span className={styles.emptyChatBurst}>
                                <i /><i /><i /><i /><i /><i /><i /><i />
                            </span>
                            <LuMousePointerClick className={styles.emptyChatCursor} />
                        </div>
                        <p className={styles.emptyChatText}>{t('no_comments')}</p>
                    </div>
                )}
                {comments.map((comment) => {
                    const isMine = comment.author?._id === currentUserId;
                    const rowClass = isMine
                        ? `${styles.commentRow} ${styles.rowOwn}`
                        : `${styles.commentRow} ${styles.rowOther}`;
                    const stackClass = isMine ? styles.stackOwn : styles.stackOther;
                    const bubbleClass = isMine ? styles.bubbleOwn : styles.bubbleOther;
                    const plainTextOnly = comment.text
                        && (comment.attachments?.length ?? 0) === 0;

                    return (
                        <div key={comment._id} className={rowClass}>
                            <div className={stackClass}>
                                {!isMine && (
                                    <span className={styles.messageMeta}>
                                        <span className={styles.messageAuthor}>
                                            {comment.author?.fullName || tc('user')}
                                        </span>
                                        <span className={styles.messageTime}>
                                            {formatAppDate(comment.createdAt, lang)}
                                        </span>
                                    </span>
                                )}

                                {plainTextOnly ? (
                                    <div className={`${styles.messageBubble} ${bubbleClass}`}>
                                        <p className={styles.messageText}>{comment.text}</p>
                                    </div>
                                ) : (
                                    <div className={`${styles.messageGroup}`}>
                                        {comment.text && (
                                            <div className={`${styles.messageBubble} ${bubbleClass}`}>
                                                <p className={styles.messageText}>{comment.text}</p>
                                            </div>
                                        )}
                                        {(comment.attachments ?? []).map((att, idx) => {
                                            const url = attachmentUrl(att);
                                            if (isAudioAttachment(att)) {
                                                return (
                                                    <VoiceMessage
                                                        key={idx}
                                                        src={url}
                                                        seed={`${comment._id}:${idx}`}
                                                        title={att.fileName || t('voice_message')}
                                                    />
                                                );
                                            }
                                            if (isImageAttachment(att)) {
                                                return (
                                                    <a
                                                        key={idx}
                                                        href={url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className={`${styles.messageBubble} ${styles.imageBubble} ${bubbleClass}`}
                                                    >
                                                        <img src={url} alt={att.fileName || ''} loading="lazy" />
                                                    </a>
                                                );
                                            }
                                            return (
                                                <a
                                                    key={idx}
                                                    href={url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className={`${styles.messageBubble} ${bubbleClass} ${styles.fileBubble}`}
                                                >
                                                    <LuPaperclip size={12} />
                                                    <span>{att.fileName || t('attachment')}</span>
                                                </a>
                                            );
                                        })}
                                    </div>
                                )}

                                {isMine && (
                                    <span className={`${styles.messageFoot} ${styles.footOwn}`}>
                                        <span className={styles.messageTime}>
                                            {formatAppDate(comment.createdAt, lang)}
                                        </span>
                                        <button
                                            type="button"
                                            className={styles.messageDeleteBtn}
                                            onClick={() => handleDelete(comment._id)}
                                            title={t('delete_comment')}
                                        >
                                            <LuTrash2 size={11} />
                                        </button>
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
                <div ref={listEndRef} />
            </div>

            <div className={styles.composer}>
                {pendingAttachments.length > 0 && (
                    <div className={styles.pendingAttachments}>
                        {pendingAttachments.map((att, idx) => (
                            <div key={idx} className={styles.pendingAttachment}>
                                <LuPaperclip size={11} />
                                <span>{att.fileName}</span>
                                <button type="button" onClick={() => removePendingAttachment(idx)}>
                                    <LuX size={11} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className={styles.composerRow}>
                    <input
                        ref={fileInputRef}
                        type="file"
                        className={styles.hiddenInput}
                        onChange={onFileChange}
                    />
                    <button
                        type="button"
                        className={styles.attachBtn}
                        title={t('attach_file')}
                        disabled={uploading}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {uploading ? <LuLoader className={styles.spin} /> : <LuPaperclip />}
                    </button>
                    <textarea
                        className={styles.composerTextarea}
                        placeholder={t('comment_placeholder')}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        rows={1}
                    />
                    <button
                        type="button"
                        className={styles.sendBtn}
                        disabled={sending || uploading || (!text.trim() && pendingAttachments.length === 0)}
                        onClick={handleSend}
                        title={tc('send')}
                    >
                        {sending ? <LuLoader className={styles.spin} /> : <LuSend />}
                    </button>
                </div>
            </div>
        </div>
    );
}
