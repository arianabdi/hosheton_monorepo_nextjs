'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import io, { Socket } from 'socket.io-client';
import styles from './TicketChat.module.scss';
import { useAuthStore } from "@/app/zustand/store/authStore";
import { ErrorToaster, SuccessToaster } from "@my-workspace/utils";
import { useAppStore } from "@/app/zustand/store/useAppStore";
import { RiAttachment2, RiCloseLine, RiDownload2Line, RiFile3Line } from 'react-icons/ri';
import SupportGuide from '../components/SupportGuide';
import TicketRowMenu from '../components/TicketRowMenu';
import TicketEditModal from '../components/TicketEditModal';
import {
    SUPPORT_STATUS_LABELS,
    SupportCategory,
    SupportMessageItem,
    SupportTicketItem,
    formatFileSize,
    getAttachmentKind,
    getAttachmentName,
    replyToTicket,
    resolveAttachmentUrl,
    uploadChatAttachment,
    updateTicketStatus,
} from '../lib/support-api';

export default function UserTicketChatRoom() {
    const router = useRouter();
    const { ticketId } = useParams();
    const { token } = useAuthStore();
    const { baseUrl } = useAppStore();

    const [ticket, setTicket] = useState<SupportTicketItem | null>(null);
    const [categories, setCategories] = useState<SupportCategory[]>([]);
    const [messages, setMessages] = useState<SupportMessageItem[]>([]);
    const [replyText, setReplyText] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [editOpen, setEditOpen] = useState(false);

    // اتصال وب‌سوکت و آپلود پیوست
    const [connected, setConnected] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);

    const chatBodyRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const socketRef = useRef<Socket | null>(null);

    const appendMessage = useCallback((msg: SupportMessageItem) => {
        if (!msg?._id) return;
        setMessages(prev => (prev.some(m => m._id === msg._id) ? prev : [...prev, msg]));
    }, []);

    // واکشی اطلاعات تیکت و آرشیو مسیج‌ها + دسته‌بندی‌ها برای منوی اکشن
    const fetchTicketDetails = useCallback(async () => {
        if (!token || !ticketId) return;
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || baseUrl}/api/support/ticket/${ticketId}`, {
                headers: { authorization: `Bearer ${token}` },
            });
            const json = await res.json();
            if (json.statusCode === 200) {
                setTicket(json.data.ticket);
                setMessages(json.data.messages || []);
            }
        } catch (error) {
            ErrorToaster(error);
        } finally {
            setLoading(false);
        }
    }, [token, ticketId, baseUrl]);

    const loadCategories = useCallback(async () => {
        if (!token) return;
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || baseUrl}/api/support/admin/categories`, {
                headers: { authorization: `Bearer ${token}` },
            });
            const json = await res.json();
            if (json.statusCode === 200) setCategories(json.data || []);
        } catch {
            /* دسته‌بندی برای نمایش اختیاری است */
        }
    }, [token, baseUrl]);

    // اسکرول خودکار به انتهای چت پس از دریافت پیام جدید
    useEffect(() => {
        if (chatBodyRef.current) {
            chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
        }
    }, [messages]);

    useEffect(() => {
        if (token) {
            fetchTicketDetails();
            loadCategories();
        }
    }, [token, fetchTicketDetails, loadCategories]);

    // ==================== وب‌سوکت — چت لحظه‌ای ====================
    useEffect(() => {
        if (!token || !ticketId) return;
        const apiBase = (baseUrl || process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');
        if (!apiBase) return;

        const socket = io(`${apiBase}/support`, {
            auth: { token },
            transports: ['websocket'],
            reconnection: true,
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            setConnected(true);
            socket.emit('support:join', { ticketId });
        });
        socket.on('disconnect', () => setConnected(false));

        // پیام جدید هر عضو اتاق (کاربر یا پشتیبان دیگر) بلافاصله نمایش داده می‌شود
        socket.on('support:message', (msg: SupportMessageItem) => appendMessage(msg));

        // تغییر وضعیت/دسته‌بندی/اولویت توسط ادمین دیگر یا خود کاربر
        socket.on('support:ticket', (updated: SupportTicketItem) => {
            if (updated?._id) setTicket(prev => (prev ? { ...prev, ...updated } : updated));
        });

        return () => {
            socket.emit('support:leave', { ticketId });
            socket.disconnect();
            socketRef.current = null;
        };
    }, [token, ticketId, baseUrl, appendMessage]);

    // ==================== ارسال پاسخ + پیوست ====================
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const picked = Array.from(e.target.files || []);
        e.target.value = '';
        if (picked.length) setSelectedFiles(prev => [...prev, ...picked].slice(0, 10));
    };

    const removeSelectedFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSendMessage = async (e?: React.MouseEvent<HTMLButtonElement>) => {
        if (e) e.preventDefault();
        if ((!replyText.trim() && selectedFiles.length === 0) || sending) return;

        try {
            setSending(true);

            const attachmentUrls: string[] = [];
            for (let i = 0; i < selectedFiles.length; i++) {
                setUploadProgress({ current: i + 1, total: selectedFiles.length });
                attachmentUrls.push(await uploadChatAttachment(baseUrl, token, selectedFiles[i]));
            }
            setUploadProgress(null);

            // DTO سرور content خالی را نمی‌پذیرد — وقتی فقط فایل ارسال می‌شود
            const content = replyText.trim() || '📎 پیوست';
            const message = await replyToTicket(baseUrl, token, ticketId as string, content, attachmentUrls);
            appendMessage(message);
            setReplyText('');
            setSelectedFiles([]);
        } catch (error) {
            ErrorToaster(error);
            setUploadProgress(null);
        } finally {
            setSending(false);
        }
    };

    // کنترل کلیدهای کیبورد روی Textarea
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            void handleSendMessage();
        }
    };

    const quickClose = async () => {
        try {
            const updated = await updateTicketStatus(baseUrl, token, ticketId as string, 'closed');
            setTicket(prev => (prev ? { ...prev, ...updated } : updated));
            SuccessToaster('تیکت بسته شد.');
        } catch (error) {
            ErrorToaster(error);
        }
    };

    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'open':
            case 'pending':
                return styles.badgePending;
            case 'resolved':
                return styles.badgeSuccess;
            case 'closed':
                return styles.statusClosed;
            default:
                return styles.statusClosed;
        }
    };

    const formatMessageTime = (dateString?: string) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleTimeString('fa-IR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className={`${styles.container} ${styles.rtl}`}>
                <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--body-text-color)' }}>
                    در حال بارگذاری ایمن چت‌روم پشتیبانی...
                </p>
            </div>
        );
    }

    const isClosed = ticket?.status === 'closed';

    return (
        <div className={`${styles.container} ${styles.rtl}`}>
            <header className={styles.header}>
                <h1 className={styles.mainTitle}>اتاق گفتگو و حل مسئله</h1>
                <p className={styles.subtitle}>پاسخ‌های شما با وب‌سوکت بلافاصله برای کاربر نمایش داده می‌شود.</p>
            </header>

            <SupportGuide variant="chat" />

            <div className={styles.chatSection}>
                <div className={styles.chatHeader}>
                    <div className={styles.ticketBadge}>
                        <span className={styles.ticketTitle}>{ticket?.title}</span>
                        <span className={getStatusBadgeClass(ticket?.status || '')}>
                            {SUPPORT_STATUS_LABELS[ticket?.status || ''] || ticket?.status}
                        </span>
                        {ticket?.categoryId ? (
                            <span className={styles.headerCategory}>
                                <span className={styles.categoryDot} style={{ backgroundColor: ticket.categoryId.color }} />
                                {ticket.categoryId.title}
                            </span>
                        ) : null}
                        <span className={`${styles.connectionBadge} ${connected ? styles.connected : ''}`}>
                            {connected ? '● متصل (لحظه‌ای)' : '○ در حال اتصال...'}
                        </span>
                    </div>

                    <div className={styles.headerTools}>
                        <TicketRowMenu
                            rowId={String(ticketId)}
                            ariaLabel="عملیات چت"
                            items={[
                                { label: '⚙️ ویرایش وضعیت و دسته‌بندی', onClick: () => setEditOpen(true) },
                                ...(!isClosed ? [{ label: '🔒 بستن سریع تیکت', onClick: () => void quickClose() }] : []),
                            ]}
                        />
                        <button className={styles.backBtn} onClick={() => router.push('/support')}>
                            بازگشت به لیست تیکت‌ها →
                        </button>
                    </div>
                </div>

                <div className={styles.chatBody} ref={chatBodyRef}>
                    {messages.map((msg: SupportMessageItem) => {
                        const isAgent = msg.senderRole === 'agent' || msg.senderRole === 'system';

                        return (
                            <div
                                key={msg._id}
                                className={`${styles.messageWrapper} ${isAgent ? styles.agentWrapper : styles.userWrapper}`}
                            >
                                <div className={styles.messageGroup}>
                                    {/* dir=auto جهت هر پیام از متن خودش تشخیص داده می‌شود */}
                                    <div className={`${styles.messageBubble} ${isAgent ? styles.agentBubble : styles.userBubble}`}>
                                        <p className={styles.msgContent} dir="auto">{msg.content}</p>

                                        {msg.attachments?.length ? (
                                            <div className={styles.attachmentsGrid}>
                                                {msg.attachments.map((fileUrl: string, fIdx: number) => {
                                                    const url = resolveAttachmentUrl(fileUrl);
                                                    const kind = getAttachmentKind(url);
                                                    const name = getAttachmentName(url) || 'فایل پیوست';
                                                    if (kind === 'image') {
                                                        return (
                                                            <div key={fIdx} className={styles.attachmentImageWrap}>
                                                                <a href={url} target="_blank" rel="noreferrer" className={styles.attachmentImage}>
                                                                    <img src={url} alt={name} loading="lazy" />
                                                                </a>
                                                                <a href={url} download className={styles.attachmentDownload} title="دانلود تصویر">
                                                                    <RiDownload2Line size={14} />
                                                                </a>
                                                            </div>
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
                                                        <div key={fIdx} className={styles.attachmentFileRow}>
                                                            <RiFile3Line size={18} />
                                                            <span className={styles.attachmentFileName} title={name}>{name}</span>
                                                            <a href={url} download className={styles.attachmentFileDownload}>
                                                                <RiDownload2Line size={14} />
                                                                دانلود
                                                            </a>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : null}
                                    </div>
                                    <div className={styles.msgMeta}>
                                        <span className={styles.senderName}>
                                            {isAgent ? 'پشتیبان سیستم' : msg.senderDetails?.fullName || 'کاربر پلتفرم'}
                                        </span>
                                        <span className={styles.metaDot}>•</span>
                                        <span className={styles.msgTime}>{formatMessageTime(msg.createdAt)}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {isClosed ? (
                    <div className={styles.closedNote}>
                        🔒 این تیکت توسط کارشناسان مختومه اعلام شده است. در صورت بروز مشکل مجدد، تیکت جدیدی باز کنید.
                    </div>
                ) : (
                    <div className={styles.chatFooter}>
                        {uploadProgress ? (
                            <div className={styles.uploadingNote}>
                                در حال آپلود پیوست {uploadProgress.current} از {uploadProgress.total}...
                            </div>
                        ) : null}

                        {selectedFiles.length ? (
                            <div className={styles.selectedFiles}>
                                {selectedFiles.map((file, idx) => (
                                    <span key={`${file.name}-${idx}`} className={styles.fileChip}>
                                        <RiFile3Line size={14} />
                                        <span className={styles.chipName} title={file.name}>{file.name}</span>
                                        <span className={styles.chipSize}>{formatFileSize(file.size)}</span>
                                        <button
                                            type="button"
                                            className={styles.chipRemove}
                                            onClick={() => removeSelectedFile(idx)}
                                            disabled={sending}
                                            title="حذف فایل"
                                        >
                                            <RiCloseLine size={14} />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        ) : null}

                        <div className={styles.inputContainer}>
                            <input ref={fileInputRef} type="file" multiple hidden onChange={handleFileChange} />

                            <textarea
                                className={styles.chatInput}
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="پاسخ خود را اینجا بنویسید..."
                                disabled={sending}
                                rows={2}
                            />

                            <button
                                type="button"
                                className={styles.inlineUpload}
                                onClick={() => fileInputRef.current?.click()}
                                disabled={sending}
                                title="پیوست عکس یا فایل"
                            >
                                <RiAttachment2 size={20} />
                            </button>

                            <button
                                type="button"
                                onClick={() => void handleSendMessage()}
                                className={styles.sendBtn}
                                disabled={(!replyText.trim() && selectedFiles.length === 0) || sending}
                            >
                                {sending ? '...' : 'ارسال'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <TicketEditModal
                open={editOpen}
                onClose={() => setEditOpen(false)}
                categories={categories}
                ticket={ticket}
                baseUrl={baseUrl}
                token={token}
                onSaved={(updated) => {
                    setTicket(prev => (prev ? { ...prev, ...updated } : updated));
                    if (updated.status === 'closed') {
                        SuccessToaster('تیکت بسته شد.');
                    }
                }}
            />
        </div>
    );
}
