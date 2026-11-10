'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import styles from '../../SupportPage.module.scss';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { notifyError } from '@/app/lib/errors';
import { RiAttachment2, RiCloseLine, RiFile3Line } from 'react-icons/ri';
import {
    supportApi,
    SupportMessage,
    SupportTicket,
    SUPPORT_MAX_FILES,
    SUPPORT_MAX_FILE_SIZE,
} from '@/app/(developers)/support/lib/support-api';
import { isRtlLanguage } from '@/app/lib/i18n/config';

// آدرس‌های جدید به‌صورت URL عمومی کامل ذخیره می‌شوند؛ آدرس‌های قدیمی نسبی بودند
const resolveAttachmentUrl = (url: string) =>
    /^https?:\/\//i.test(url) ? url : `${process.env.NEXT_PUBLIC_API_URL}/${String(url).replace(/^\/+/, '')}`;

type AttachmentKind = 'image' | 'video' | 'file';

const getAttachmentKind = (url: string): AttachmentKind => {
    const clean = url.split('?')[0].toLowerCase();
    if (/\.(jpe?g|png|gif|webp|bmp|svg|avif)$/.test(clean)) return 'image';
    if (/\.(mp4|webm|mov|m4v|avi|mkv)$/.test(clean)) return 'video';
    return 'file';
};

const getAttachmentName = (url: string) => {
    try {
        const last = decodeURIComponent(url.split('?')[0].split('/').pop() || '');
        return last.replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i, '');
    } catch {
        return '';
    }
};

const formatFileSize = (bytes: number) => {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
    if (bytes >= 1024) return `${Math.round(bytes / 1024)}KB`;
    return `${bytes}B`;
};

export default function SupportTicketPage() {
    const { t, i18n } = useTranslation('support');
    const { t: tc } = useTranslation('common');
    const router = useRouter();
    const params = useParams();
    const ticketId = String(params.id || '');
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const rtl = isRtlLanguage(i18n.language);
    const timeLocale = i18n.language === 'ar' ? 'ar' : rtl ? 'fa-IR' : i18n.language;

    const [ticketInfo, setTicketInfo] = useState<SupportTicket | null>(null);
    const [chatMessages, setChatMessages] = useState<SupportMessage[]>([]);
    const [replyContent, setReplyContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (chatMessages.length > 0) {
            scrollToBottom();
        }
    }, [chatMessages]);

    const loadTicketDetails = useCallback(async () => {
        if (!ticketId) return;
        try {
            setLoading(true);
            const data = await supportApi.getTicket(ticketId);
            setTicketInfo(data.ticket);
            setChatMessages(data.messages || []);
        } catch (error) {
            notifyError(error);
        } finally {
            setLoading(false);
        }
    }, [ticketId]);

    useEffect(() => {
        loadTicketDetails();
    }, [loadTicketDetails]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const picked = Array.from(e.target.files || []);
        e.target.value = '';
        if (!picked.length) return;

        const accepted = picked.filter((f) => f.size <= SUPPORT_MAX_FILE_SIZE);
        const tooLarge = picked.length - accepted.length;
        if (tooLarge > 0) {
            notifyError(new Error(t('file_too_large', { name: picked.find((f) => f.size > SUPPORT_MAX_FILE_SIZE)?.name, size: 20 })));
        }

        const room = Math.max(0, SUPPORT_MAX_FILES - selectedFiles.length);
        setSelectedFiles([...selectedFiles, ...accepted.slice(0, room)]);
        if (accepted.length > room) {
            notifyError(new Error(t('max_files_reached', { count: SUPPORT_MAX_FILES })));
        }
    };

    const removeSelectedFile = (index: number) => {
        setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSendReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!replyContent.trim() && selectedFiles.length === 0) || uploadProgress) return;

        try {
            setLoading(true);

            const attachmentUrls: string[] = [];
            for (let i = 0; i < selectedFiles.length; i++) {
                setUploadProgress({ current: i + 1, total: selectedFiles.length });
                attachmentUrls.push(await supportApi.uploadAttachment(selectedFiles[i]));
            }
            setUploadProgress(null);

            // DTO سرور content خالی را نمی‌پذیرد — وقتی فقط فایل ارسال می‌شود
            const content = replyContent.trim() || t('attachment_default_content');
            await supportApi.replyToTicket(ticketId, content, attachmentUrls);
            setReplyContent('');
            setSelectedFiles([]);
            await loadTicketDetails();
        } catch (error) {
            notifyError(error);
        } finally {
            setUploadProgress(null);
            setLoading(false);
        }
    };

    const getStatusLabel = (status?: string) => {
        switch (status) {
            case 'resolved':
                return { text: t('resolved'), className: styles.badgeSuccess };
            case 'closed':
                return { text: t('closed_status'), className: styles.badgePending };
            case 'pending':
                return { text: t('reviewing'), className: styles.badgePending };
            default:
                return { text: t('open'), className: styles.badgePending };
        }
    };

    const statusInfo = getStatusLabel(ticketInfo?.status);

    return (
        <div className={`${styles.container} ${rtl ? styles.rtl : ''}`}>
            <header className={styles.header}>
                <h1 className={styles.mainTitle}>
                    {t('ticket_title', { title: ticketInfo?.title || tc('loading') })}
                </h1>
                <p className={styles.subtitle}>{t('thread_subtitle')}</p>
            </header>

            <div className={styles.layoutGrid}>
                <section className={styles.chatSection}>
                    <div className={styles.chatHeader}>
                        <div className={styles.ticketBadge}>
                            <span className={styles.statusLabel}>{t('ticket_status')}</span>
                            <span className={statusInfo.className}>{statusInfo.text}</span>
                        </div>
                        {/* فقط در موبایل نمایش داده می‌شود — جایگزین عنوان بزرگ بالای صفحه */}
                        <span className={styles.mobileTicketTitle} title={ticketInfo?.title || ''}>
                            {ticketInfo?.title || tc('loading')}
                        </span>
                        <button className={styles.backBtn} onClick={() => router.push('/support')}>
                            {t('back_to_list')}
                        </button>
                    </div>

                    <div className={styles.chatBody}>
                        {loading && chatMessages.length === 0 ? (
                            <div className={styles.loadingWrapper}>
                                <p>{t('loading_messages')}</p>
                            </div>
                        ) : (
                            chatMessages.map((msg) => {
                                const isAgent = msg.senderRole === 'agent';
                                return (
                                    <div
                                        key={msg._id}
                                        className={`${styles.messageWrapper} ${isAgent ? styles.agentWrapper : styles.userWrapper}`}
                                    >
                                        <div className={styles.messageGroup}>
                                            <div className={`${styles.messageBubble} ${isAgent ? styles.agentBubble : styles.userBubble}`}>
                                                {/* dir=auto جهت هر پیام را از متن خودش می‌گیرد تا پیام انگلیسی در رابط فارسی (و برعکس) درست رندر شود */}
                                                <p className={styles.msgContent} dir="auto">
                                                    {msg.content}
                                                </p>

                                                {msg.attachments?.length ? (
                                                    <div className={styles.attachmentsGrid}>
                                                        {msg.attachments.map((fileUrl, fIdx) => {
                                                            const url = resolveAttachmentUrl(fileUrl);
                                                            const kind = getAttachmentKind(url);
                                                            if (kind === 'image') {
                                                                return (
                                                                    <a
                                                                        key={fIdx}
                                                                        href={url}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className={styles.attachmentImage}
                                                                    >
                                                                        <img src={url} alt={getAttachmentName(url) || t('file_attachment')} loading="lazy" />
                                                                    </a>
                                                                );
                                                            }
                                                            if (kind === 'video') {
                                                                return (
                                                                    <video
                                                                        key={fIdx}
                                                                        className={styles.attachmentVideo}
                                                                        src={url}
                                                                        controls
                                                                        preload="metadata"
                                                                    />
                                                                );
                                                            }
                                                            return (
                                                                <a
                                                                    key={fIdx}
                                                                    href={url}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className={styles.attachmentFile}
                                                                >
                                                                    <RiFile3Line size={18} />
                                                                    <span className={styles.attachmentFileName}>
                                                                        {getAttachmentName(url) || t('file_attachment')}
                                                                    </span>
                                                                </a>
                                                            );
                                                        })}
                                                    </div>
                                                ) : null}
                                            </div>
                                            <div className={styles.msgMeta}>
                                                <span className={styles.senderName}>{isAgent ? t('agent') : t('you')}</span>
                                                <span className={styles.metaDot}>•</span>
                                                <span className={styles.msgTime}>
                                                    {msg.createdAt
                                                        ? new Date(msg.createdAt).toLocaleTimeString(timeLocale, {
                                                              hour: '2-digit',
                                                              minute: '2-digit',
                                                          })
                                                        : tc('empty_dash')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <form className={styles.chatFooter} onSubmit={handleSendReply}>
                        {uploadProgress && (
                            <div className={styles.uploadingNote}>
                                {t('uploading_attachments', {
                                    current: uploadProgress.current,
                                    total: uploadProgress.total,
                                })}
                            </div>
                        )}

                        {selectedFiles.length > 0 && (
                            <div className={styles.selectedFiles}>
                                {selectedFiles.map((file, idx) => (
                                    <span key={`${file.name}-${idx}`} className={styles.fileChip}>
                                        <RiFile3Line size={14} />
                                        <span className={styles.chipName} title={file.name}>
                                            {file.name}
                                        </span>
                                        <span className={styles.chipSize}>{formatFileSize(file.size)}</span>
                                        <button
                                            type="button"
                                            className={styles.chipRemove}
                                            onClick={() => removeSelectedFile(idx)}
                                            disabled={!!uploadProgress}
                                            title={t('remove_file')}
                                        >
                                            <RiCloseLine size={14} />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}

                        <div className={styles.inputContainer}>
                            <input
                                type="text"
                                placeholder={t('reply_placeholder')}
                                className={styles.chatInput}
                                value={replyContent}
                                onChange={(e) => setReplyContent(e.target.value)}
                                disabled={loading}
                            />

                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                hidden
                                onChange={handleFileChange}
                            />

                            <button
                                type="button"
                                className={styles.inlineUpload}
                                onClick={() => fileInputRef.current?.click()}
                                disabled={!!uploadProgress || selectedFiles.length >= SUPPORT_MAX_FILES}
                                title={
                                    selectedFiles.length >= SUPPORT_MAX_FILES
                                        ? t('max_files_reached', { count: SUPPORT_MAX_FILES })
                                        : t('attach_file')
                                }
                            >
                                <RiAttachment2 size={20} />
                            </button>

                            <button
                                type="submit"
                                className={styles.sendBtn}
                                disabled={loading || !!uploadProgress || (!replyContent.trim() && selectedFiles.length === 0)}
                            >
                                {uploadProgress ? '...' : t('send')}
                            </button>
                        </div>
                    </form>
                </section>
            </div>
        </div>
    );
}
