'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { ModalHelper } from '@my-workspace/components';
import { SuccessToaster } from '@my-workspace/utils';
import { marketplaceApi } from '@/app/(marketplace)/lib/marketplace-api';
import type {
    ConversationItem,
    DirectAttachment,
    DirectMessageItem,
    DirectReplyRef,
    MessageReportReason,
} from '@/app/(marketplace)/lib/types';
import { acquireStudioSocket, type StudioSocketHandle } from '@/app/(developers)/projects/lib/createStudioSocket';
import { notifyError } from '@/app/lib/errors';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useDirectMessagesStore } from '@/app/zustand/store/useDirectMessagesStore';
import { useDirectMessagesRealtime } from '@/app/hooks/useDirectMessagesRealtime';
import { ConversationList, type ConversationAction, type ListFolder, type PendingPeer } from './components/ConversationList';
import { ThreadView, MESSAGE_MAX_LENGTH, type ThreadState } from './components/ThreadView';
import type { ReadyAttachment } from './components/Composer';
import { ConversationInfoPanel } from './components/ConversationInfoPanel';
import { DeleteMessageDialog } from './components/DeleteMessageDialog';
import { ReportDialog } from './components/ReportDialog';
import { BlockDialog } from './components/BlockDialog';
import { DeleteChatDialog } from './components/DeleteChatDialog';
import { MediaViewer } from './components/MediaViewer';
import { ForwardDialog } from './components/ForwardDialog';
import styles from './Messages.module.scss';

type Presence = { online: boolean; lastSeenAt: string | null };

const EMPTY_THREAD: ThreadState = {
    messages: [],
    hasMore: false,
    loading: false,
    loadingOlder: false,
    error: null,
    firstUnreadId: null,
};

/** طرف مقابل ۶ ثانیه بی‌خبر = دیگر نمی‌نویسد (فرستنده هر ۳ ثانیه تمدید می‌کند) */
const TYPING_TTL_MS = 6_000;
const TYPING_RESEND_MS = 3_000;
const TYPING_IDLE_MS = 4_000;
const INFO_OPEN_KEY = 'hosheton.messages.infoOpen';
const LINK_PATTERN = /https?:\/\//i;

function timeOf(value: string | null | undefined): number {
    const time = value ? new Date(value).getTime() : 0;
    return Number.isFinite(time) ? time : 0;
}

/** سنجاق‌شده‌ها بالا (جدیدترین سنجاق اول)، بقیه بر اساس آخرین پیام */
function sortConversations(list: ConversationItem[]): ConversationItem[] {
    return [...list].sort((a, b) => (timeOf(b.pinnedAt) - timeOf(a.pinnedAt))
        || (timeOf(b.lastMessageAt) - timeOf(a.lastMessageAt)));
}

const PINS_MAX = 5;

function upsertConversation(list: ConversationItem[], item: ConversationItem): ConversationItem[] {
    const current = list.find((c) => c._id === item._id);
    return sortConversations([{ ...current, ...item }, ...list.filter((c) => c._id !== item._id)]);
}

/** n پیام آخرِ طرف مقابل خوانده‌نشده‌اند — اولینشان جای جداکنندهٔ «پیام‌های جدید» است */
function findFirstUnreadId(messages: DirectMessageItem[], unread: number): string | null {
    if (unread <= 0) return null;
    let seen = 0;
    let id: string | null = null;
    for (let i = messages.length - 1; i >= 0 && seen < unread; i -= 1) {
        if (!messages[i].isMine) {
            seen += 1;
            id = messages[i]._id;
        }
    }
    return id;
}

/** خلاصهٔ پیام برای نقل‌قول پیام خوش‌بینانه (سرور همین را ذخیره می‌کند) */
function toReplyRef(message: DirectMessageItem): DirectReplyRef {
    const first = message.attachments?.[0];
    return {
        _id: message._id,
        senderId: message.senderId,
        isMine: message.isMine,
        body: (message.body || '').slice(0, 200),
        attachmentKind: first?.kind || '',
        attachmentName: first?.name || '',
    };
}

function isLocalOnly(message: DirectMessageItem): boolean {
    return Boolean(message.pending || message.failed);
}

/** پیامی که فهرست «فایل‌ها و لینک‌ها»ی پنل اطلاعات را عوض می‌کند */
function touchesShared(message: DirectMessageItem): boolean {
    return Boolean(message.attachments?.length) || LINK_PATTERN.test(message.body || '');
}

/** پنل اطلاعات فقط در صفحهٔ پهن (ستون سوم) پیش‌فرض باز است؛ در عرض کمتر روی گفتگو می‌افتد */
const INFO_COLUMN_MIN_WIDTH = 1280;

function readInfoPreference(): boolean {
    if (window.innerWidth < INFO_COLUMN_MIN_WIDTH) return false;
    try {
        return localStorage.getItem(INFO_OPEN_KEY) !== '0';
    } catch {
        return true;
    }
}

export default function MessagesPage() {
    const { t } = useTranslation('messages');
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = useAuthStore((s) => s.token);
    const userId = useAppStore((s) => s.userId);
    useDirectMessagesRealtime();
    const setUnreadTotal = useDirectMessagesStore((s) => s.setUnreadTotal);

    const selectedId = searchParams.get('conversation');
    const toUserId = searchParams.get('to');
    // پوشهٔ فهرست در URL تا با برگشت مرورگر و تازه‌سازی حفظ شود
    const folder: ListFolder = searchParams.get('folder') === 'archived' ? 'archived' : 'inbox';

    const [conversations, setConversations] = useState<ConversationItem[]>([]);
    const [listLoading, setListLoading] = useState(true);
    const [listError, setListError] = useState<unknown>(null);
    const [threads, setThreads] = useState<Record<string, ThreadState>>({});
    const [pendingTo, setPendingTo] = useState<PendingPeer | null>(null);
    const [drafts, setDrafts] = useState<Record<string, string>>({});
    const [typingMap, setTypingMap] = useState<Record<string, boolean>>({});
    const [presence, setPresence] = useState<Record<string, Presence>>({});
    const [connected, setConnected] = useState(true);
    const [query, setQuery] = useState('');
    const [deleteTargets, setDeleteTargets] = useState<DirectMessageItem[] | null>(null);
    // پاسخ در حال نوشتن برای هر گفتگو؛ بازارسال = پیام‌های انتخاب‌شده تا انتخاب مقصد
    const [replyTargets, setReplyTargets] = useState<Record<string, DirectMessageItem>>({});
    const [forwardTarget, setForwardTarget] = useState<DirectMessageItem[] | null>(null);
    const [reportTarget, setReportTarget] = useState<{ message?: DirectMessageItem } | null>(null);
    const [blockConfirmOpen, setBlockConfirmOpen] = useState(false);
    const [deleteChatTarget, setDeleteChatTarget] = useState<ConversationItem | null>(null);
    const [viewer, setViewer] = useState<{ items: DirectAttachment[]; index: number } | null>(null);
    // ترجیح باز/بسته بودن پنل اطلاعات برای همین مرورگر (پیش‌فرض باز)
    const [infoOpen, setInfoOpen] = useState(() => (typeof window === 'undefined' ? true : readInfoPreference()));
    const [sharedVersion, setSharedVersion] = useState(0);

    const socketRef = useRef<StudioSocketHandle | null>(null);
    const selectedRef = useRef(selectedId);
    selectedRef.current = selectedId;
    const conversationsRef = useRef(conversations);
    conversationsRef.current = conversations;
    const threadsRef = useRef(threads);
    threadsRef.current = threads;
    const typingTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
    const typingSentRef = useRef<{ id: string; at: number } | null>(null);
    const typingIdleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const threadKey = selectedId || (pendingTo ? `to:${pendingTo._id}` : null);
    const selectedConversation = conversations.find((c) => c._id === selectedId) || null;
    const blocked = Boolean(selectedConversation?.blockedByMe || selectedConversation?.blockedMe);

    const toggleInfo = useCallback(() => {
        setInfoOpen((prev) => {
            const next = !prev;
            // فقط انتخاب در حالت ستونی به خاطر سپرده می‌شود؛ کشوی عرض کم موقتی است
            if (window.innerWidth >= INFO_COLUMN_MIN_WIDTH) {
                try {
                    localStorage.setItem(INFO_OPEN_KEY, next ? '1' : '0');
                } catch {
                    // ذخیره نشد؛ فقط همین جلسه
                }
            }
            return next;
        });
    }, []);

    // ── داده ──────────────────────────────────────────────────────────

    const loadConversations = useCallback(async () => {
        setListLoading(true);
        try {
            const data = await marketplaceApi.listConversations();
            setConversations(sortConversations(data.conversations ?? []));
            setListError(null);
        } catch (err) {
            setListError(err);
        } finally {
            setListLoading(false);
        }
    }, []);

    useEffect(() => {
        if (token) void loadConversations();
    }, [token, loadConversations]);

    const loadThread = useCallback(async (id: string) => {
        setThreads((prev) => ({ ...prev, [id]: { ...(prev[id] ?? EMPTY_THREAD), loading: true, error: null } }));
        try {
            const data = await marketplaceApi.getMessages(id);
            const fetched = data.messages ?? [];
            // سرور شمارش پیش از «خوانده شد» را برمی‌گرداند (لینک مستقیم، پیش از رسیدن فهرست)
            const unreadBefore = data.unreadBefore
                ?? conversationsRef.current.find((c) => c._id === id)?.unreadCount
                ?? 0;
            setThreads((prev) => {
                const existing = prev[id] ?? EMPTY_THREAD;
                const oldestFetched = fetched[0]?._id;
                // پیام‌های قدیمی‌تری که قبلاً بارگذاری شده بودند و پیام‌های محلی (در حال ارسال/ناموفق) بمانند
                const older = oldestFetched
                    ? existing.messages.filter((m) => !isLocalOnly(m) && m._id < oldestFetched)
                    : [];
                const local = existing.messages.filter((m) => isLocalOnly(m) && !fetched.some((f) => f._id === m._id));
                return {
                    ...prev,
                    [id]: {
                        messages: [...older, ...fetched, ...local],
                        hasMore: older.length ? existing.hasMore : data.hasMore,
                        loading: false,
                        loadingOlder: false,
                        error: null,
                        firstUnreadId: unreadBefore > 0 ? findFirstUnreadId(fetched, unreadBefore) : existing.firstUnreadId,
                    },
                };
            });
            if (data.conversation) {
                setConversations((prev) => upsertConversation(prev, { ...data.conversation, unreadCount: 0 }));
            }
            // سرور هم dm:unread می‌فرستد؛ این فقط برای واکنش فوری نشان است
            if (unreadBefore > 0) setUnreadTotal(useDirectMessagesStore.getState().unreadTotal - unreadBefore);
        } catch (err) {
            setThreads((prev) => ({ ...prev, [id]: { ...(prev[id] ?? EMPTY_THREAD), loading: false, error: err } }));
        }
    }, [setUnreadTotal]);

    // هر بار گفتگو باز می‌شود: کش فوراً نمایش داده می‌شود و پس‌زمینه تازه می‌شود
    useEffect(() => {
        if (token && selectedId) void loadThread(selectedId);
    }, [token, selectedId, loadThread]);

    // جداکنندهٔ «پیام‌های جدید» فقط برای همان یک بار باز کردن است
    const prevSelectedRef = useRef<string | null>(null);
    useEffect(() => {
        const prev = prevSelectedRef.current;
        if (prev && prev !== selectedId) {
            setThreads((all) => (all[prev] ? { ...all, [prev]: { ...all[prev], firstUnreadId: null } } : all));
        }
        prevSelectedRef.current = selectedId;
    }, [selectedId]);

    const loadOlder = useCallback(async () => {
        const id = selectedRef.current;
        if (!id) return;
        const thread = threadsRef.current[id];
        const oldest = thread?.messages.find((m) => !isLocalOnly(m));
        if (!thread?.hasMore || thread.loadingOlder || !oldest) return;
        setThreads((prev) => ({ ...prev, [id]: { ...prev[id], loadingOlder: true } }));
        try {
            const data = await marketplaceApi.getMessages(id, { before: oldest._id });
            setThreads((prev) => {
                const current = prev[id] ?? EMPTY_THREAD;
                const fresh = (data.messages ?? []).filter((n) => !current.messages.some((o) => o._id === n._id));
                return { ...prev, [id]: { ...current, messages: [...fresh, ...current.messages], hasMore: data.hasMore, loadingOlder: false } };
            });
        } catch (err) {
            setThreads((prev) => ({ ...prev, [id]: { ...prev[id], loadingOlder: false } }));
            notifyError(err, { fallback: t('load_messages_error') });
        }
    }, [t]);

    const markRead = useCallback((id: string) => {
        setConversations((prev) => prev.map((c) => (c._id === id ? { ...c, unreadCount: 0 } : c)));
        marketplaceApi.markConversationRead(id)
            .then((res) => setUnreadTotal(res.count))
            .catch(() => undefined);
    }, [setUnreadTotal]);

    // برگشت به تب: پیام‌هایی که در پس‌زمینه رسیده‌اند خوانده شوند
    useEffect(() => {
        const onVisible = () => {
            if (document.visibilityState !== 'visible') return;
            const id = selectedRef.current;
            const current = conversationsRef.current.find((c) => c._id === id);
            if (id && current && current.unreadCount > 0) markRead(id);
        };
        document.addEventListener('visibilitychange', onVisible);
        return () => document.removeEventListener('visibilitychange', onVisible);
    }, [markRead]);

    // ── سوکت ──────────────────────────────────────────────────────────

    const requestPresence = useCallback((ids: string[]) => {
        const socket = socketRef.current?.socket;
        const unique = [...new Set(ids.filter(Boolean))];
        if (!socket?.connected || !unique.length) return;
        socket.emit('dm:presence', { userIds: unique }, (res: { users?: Array<Presence & { userId: string }> }) => {
            if (!Array.isArray(res?.users)) return;
            setPresence((prev) => {
                const next = { ...prev };
                for (const u of res.users ?? []) next[u.userId] = { online: u.online, lastSeenAt: u.lastSeenAt };
                return next;
            });
        });
    }, []);

    const peerIds = useMemo(() => {
        const ids = conversations.map((c) => c.otherUser?._id || '');
        if (pendingTo) ids.push(pendingTo._id);
        return [...new Set(ids.filter(Boolean))].sort().join(',');
    }, [conversations, pendingTo]);

    const peerIdsRef = useRef(peerIds);
    peerIdsRef.current = peerIds;

    useEffect(() => {
        if (peerIds) requestPresence(peerIds.split(','));
    }, [peerIds, requestPresence]);

    useEffect(() => {
        if (!token) return;
        const handle = acquireStudioSocket(token);
        if (!handle) return;
        socketRef.current = handle;
        const socket = handle.socket;
        let hadConnection = socket.connected;
        const timers = typingTimers.current;

        const setTyping = (conversationId: string, typing: boolean) => {
            const existing = timers.get(conversationId);
            if (existing) clearTimeout(existing);
            if (typing) {
                timers.set(conversationId, setTimeout(() => setTyping(conversationId, false), TYPING_TTL_MS));
            } else {
                timers.delete(conversationId);
            }
            setTypingMap((prev) => (Boolean(prev[conversationId]) === typing ? prev : { ...prev, [conversationId]: typing }));
        };

        const onMessage = ({ conversation, message }: { conversation: ConversationItem; message: DirectMessageItem }) => {
            if (!conversation || !message) return;
            const id = conversation._id;
            const isOpen = selectedRef.current === id;
            const visible = document.visibilityState === 'visible';
            const readNow = isOpen && visible && !message.isMine;
            setConversations((prev) => upsertConversation(prev, readNow ? { ...conversation, unreadCount: 0 } : conversation));
            setThreads((prev) => {
                const thread = prev[id];
                if (!thread || thread.messages.some((m) => m._id === message._id)) return prev;
                let messages: DirectMessageItem[];
                // پیام خودم که هنوز پاسخ REST آن نرسیده: نسخهٔ موقت را جایگزین کن
                const pendingIndex = message.isMine
                    ? thread.messages.findIndex((m) => m.pending && m.body === message.body
                        && (m.attachments?.length ?? 0) === (message.attachments?.length ?? 0))
                    : -1;
                if (pendingIndex >= 0) {
                    messages = [...thread.messages];
                    messages[pendingIndex] = message;
                } else {
                    messages = [...thread.messages.filter((m) => !isLocalOnly(m)), message, ...thread.messages.filter(isLocalOnly)];
                }
                const firstUnreadId = isOpen && !visible && !message.isMine && !thread.firstUnreadId
                    ? message._id
                    : thread.firstUnreadId;
                return { ...prev, [id]: { ...thread, messages, firstUnreadId } };
            });
            if (!message.isMine) setTyping(id, false);
            if (readNow) markRead(id);
            if (isOpen && touchesShared(message)) setSharedVersion((v) => v + 1);
        };

        const onConversation = ({ conversation }: { conversation: ConversationItem }) => {
            if (!conversation) return;
            setConversations((prev) => upsertConversation(prev, conversation));
            if (conversation.blockedMe || conversation.blockedByMe) setTyping(conversation._id, false);
        };

        const onRead = ({ conversationId, readAt }: { conversationId: string; readAt: string }) => {
            setThreads((prev) => {
                const thread = prev[conversationId];
                if (!thread) return prev;
                return {
                    ...prev,
                    [conversationId]: {
                        ...thread,
                        messages: thread.messages.map((m) => (m.isMine && !m.readAt && !isLocalOnly(m) ? { ...m, readAt } : m)),
                    },
                };
            });
            setConversations((prev) => prev.map((c) => (c._id === conversationId ? { ...c, otherUnreadCount: 0 } : c)));
        };

        const onConversationRead = ({ conversationId }: { conversationId: string }) => {
            setConversations((prev) => prev.map((c) => (c._id === conversationId ? { ...c, unreadCount: 0 } : c)));
        };

        const onDeleted = ({ conversationId, messageId }: { conversationId: string; messageId: string }) => {
            let affectedShared = false;
            setThreads((prev) => {
                const thread = prev[conversationId];
                if (!thread) return prev;
                const removed = thread.messages.find((m) => m._id === messageId);
                affectedShared = Boolean(removed && touchesShared(removed));
                return { ...prev, [conversationId]: { ...thread, messages: thread.messages.filter((m) => m._id !== messageId) } };
            });
            if (selectedRef.current === conversationId && affectedShared) setSharedVersion((v) => v + 1);
        };

        // «حذف برای من» از تب دیگر همین کاربر
        const onConversationRemoved = ({ conversationId }: { conversationId: string }) => {
            if (conversationId) removeConversationRef.current(conversationId);
        };

        const onTyping = ({ conversationId, typing }: { conversationId: string; typing: boolean }) => {
            if (conversationId) setTyping(conversationId, typing !== false);
        };

        const onPresence = (p: Presence & { userId: string }) => {
            if (p?.userId) setPresence((prev) => ({ ...prev, [p.userId]: { online: p.online, lastSeenAt: p.lastSeenAt } }));
        };

        const onConnect = () => {
            setConnected(true);
            requestPresence(peerIdsRef.current.split(','));
            // اتصال دوباره: رویدادهای از دست رفته را با REST جبران کن
            if (hadConnection) {
                void loadConversations();
                if (selectedRef.current) void loadThread(selectedRef.current);
            }
            hadConnection = true;
        };
        const onDisconnect = () => setConnected(false);

        socket.on('dm:message', onMessage);
        socket.on('dm:conversation', onConversation);
        socket.on('dm:read', onRead);
        socket.on('dm:conversation-read', onConversationRead);
        socket.on('dm:deleted', onDeleted);
        socket.on('dm:conversation-removed', onConversationRemoved);
        socket.on('dm:typing', onTyping);
        socket.on('dm:presence', onPresence);
        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        // سوکت مشترک ممکن است از قبل وصل باشد (منوی پروفایل) — رویداد connect دیگر نمی‌آید
        if (socket.connected) requestPresence(peerIdsRef.current.split(','));

        return () => {
            socket.off('dm:message', onMessage);
            socket.off('dm:conversation', onConversation);
            socket.off('dm:read', onRead);
            socket.off('dm:conversation-read', onConversationRead);
            socket.off('dm:deleted', onDeleted);
            socket.off('dm:conversation-removed', onConversationRemoved);
            socket.off('dm:typing', onTyping);
            socket.off('dm:presence', onPresence);
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            timers.forEach((timer) => clearTimeout(timer));
            timers.clear();
            handle.release();
            socketRef.current = null;
        };
    }, [token, loadConversations, loadThread, markRead, requestPresence]);

    // ── «در حال نوشتن…» من ────────────────────────────────────────────

    const stopTyping = useCallback(() => {
        if (typingIdleTimer.current) clearTimeout(typingIdleTimer.current);
        typingIdleTimer.current = null;
        const sent = typingSentRef.current;
        if (sent) socketRef.current?.socket.emit('dm:typing', { conversationId: sent.id, typing: false });
        typingSentRef.current = null;
    }, []);

    useEffect(() => stopTyping, [selectedId, stopTyping]);

    const onDraftChange = (value: string) => {
        if (!threadKey) return;
        setDrafts((prev) => ({ ...prev, [threadKey]: value }));
        if (!selectedId || blocked) return;
        if (!value.trim()) {
            stopTyping();
            return;
        }
        const now = Date.now();
        const sent = typingSentRef.current;
        if (!sent || sent.id !== selectedId || now - sent.at > TYPING_RESEND_MS) {
            socketRef.current?.socket.emit('dm:typing', { conversationId: selectedId, typing: true });
            typingSentRef.current = { id: selectedId, at: now };
        }
        if (typingIdleTimer.current) clearTimeout(typingIdleTimer.current);
        typingIdleTimer.current = setTimeout(stopTyping, TYPING_IDLE_MS);
    };

    // ── ناوبری ────────────────────────────────────────────────────────

    const folderRef = useRef(folder);
    folderRef.current = folder;

    const messagesUrl = useCallback((conversationId: string | null, nextFolder: ListFolder = folderRef.current) => {
        const params = new URLSearchParams();
        if (nextFolder === 'archived') params.set('folder', 'archived');
        if (conversationId) params.set('conversation', conversationId);
        const query = params.toString();
        return query ? `/messages?${query}` : '/messages';
    }, []);

    const selectConversation = useCallback((id: string) => {
        setPendingTo(null);
        router.replace(messagesUrl(id), { scroll: false });
    }, [router, messagesUrl]);

    const goBack = () => {
        setPendingTo(null);
        router.replace(messagesUrl(null), { scroll: false });
    };

    const changeFolder = useCallback((next: ListFolder) => {
        setQuery('');
        router.replace(messagesUrl(selectedRef.current, next), { scroll: false });
    }, [router, messagesUrl]);

    /** گفتگو از فهرست من رفت (حذف برای من، در این تب یا تب دیگر) */
    const removeConversation = useCallback((id: string) => {
        setConversations((prev) => prev.filter((c) => c._id !== id));
        setThreads((prev) => {
            if (!prev[id]) return prev;
            const next = { ...prev };
            delete next[id];
            return next;
        });
        if (selectedRef.current === id) router.replace(messagesUrl(null), { scroll: false });
    }, [router, messagesUrl]);

    const removeConversationRef = useRef(removeConversation);
    removeConversationRef.current = removeConversation;

    // آخرین گفتگوی بایگانی بیرون آمد → برگشت به صندوق
    const archivedCount = conversations.filter((c) => c.archived).length;
    useEffect(() => {
        if (folder === 'archived' && !listLoading && archivedCount === 0) changeFolder('inbox');
    }, [folder, listLoading, archivedCount, changeFolder]);

    // ── سنجاق / بایگانی / حذف ─────────────────────────────────────────

    const organize = useCallback(async (c: ConversationItem, action: 'pin' | 'unpin' | 'archive' | 'unarchive') => {
        if (action === 'pin') {
            const pinned = conversationsRef.current.filter((x) => x.pinnedAt && !x.archived && x._id !== c._id).length;
            if (pinned >= PINS_MAX) {
                notifyError({ message: t('pin_limit', { max: PINS_MAX }) });
                return;
            }
        }
        try {
            const res = await marketplaceApi.organizeConversation(c._id, action);
            if (res.conversation) setConversations((prev) => upsertConversation(prev, res.conversation));
            if (action === 'archive' || action === 'unarchive') {
                SuccessToaster({ message: t(action === 'archive' ? 'chat_archived' : 'chat_unarchived') });
            }
        } catch (err) {
            notifyError(err, { fallback: t('organize_error') });
        }
    }, [t]);

    const onConversationAction = (c: ConversationItem, action: ConversationAction) => {
        if (action === 'read') markRead(c._id);
        else if (action === 'delete') setDeleteChatTarget(c);
        else void organize(c, action);
    };

    const confirmDeleteChat = async () => {
        const target = deleteChatTarget;
        if (!target) return;
        try {
            await marketplaceApi.deleteConversation(target._id);
            removeConversation(target._id);
            setDeleteChatTarget(null);
            SuccessToaster({ message: t('chat_deleted') });
        } catch (err) {
            notifyError(err, { fallback: t('delete_chat_error') });
        }
    };

    // ?to=<userId> از صفحهٔ قالب/پروفایل: گفتگوی موجود باز شود، وگرنه گفتگوی تازه
    useEffect(() => {
        if (!toUserId || toUserId === userId) {
            setPendingTo(null);
            return;
        }
        if (listLoading) return;
        const existing = conversations.find((c) => c.otherUser?._id === toUserId);
        if (existing) {
            selectConversation(existing._id);
            return;
        }
        let cancelled = false;
        marketplaceApi.getCreatorProfile(toUserId)
            .then((profile) => {
                if (cancelled) return;
                setPendingTo({
                    _id: profile.creator._id,
                    fullName: profile.creator.fullName,
                    avatar: profile.creator.avatar,
                });
            })
            .catch(() => {
                if (!cancelled) setPendingTo(null);
            });
        return () => { cancelled = true; };
    }, [toUserId, userId, conversations, listLoading, selectConversation]);

    // ── ارسال / حذف ───────────────────────────────────────────────────

    const sendText = useCallback(async (
        body: string,
        attachments: ReadyAttachment[],
        retryOf?: DirectMessageItem,
        replyTo?: DirectReplyRef | null,
    ) => {
        const convId = selectedRef.current;
        const target = pendingTo;
        const key = convId || (target ? `to:${target._id}` : null);
        if (!key || (!convId && !target)) return;

        const tempId = retryOf?._id || `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const temp: DirectMessageItem = {
            _id: tempId,
            conversationId: convId || '',
            senderId: userId || '',
            body,
            attachments,
            replyTo: replyTo || null,
            createdAt: new Date().toISOString(),
            readAt: null,
            isMine: true,
            pending: true,
        };
        setThreads((prev) => {
            const thread = prev[key] ?? { ...EMPTY_THREAD };
            return { ...prev, [key]: { ...thread, messages: [...thread.messages.filter((m) => m._id !== tempId), temp] } };
        });

        const outgoing = attachments.map((a) => ({ fileId: a.fileId, width: a.width, height: a.height }));
        try {
            const res = convId
                ? await marketplaceApi.replyMessage(convId, body, outgoing, replyTo?._id)
                : await marketplaceApi.sendMessage({ creatorUserId: target!._id, body, attachments: outgoing });
            const realId = res.conversationId;
            const sent = res.message;
            setThreads((prev) => {
                const thread = prev[key] ?? EMPTY_THREAD;
                const hasReal = thread.messages.some((m) => m._id === sent._id);
                const hasTemp = thread.messages.some((m) => m._id === tempId);
                let messages = hasReal
                    ? thread.messages.filter((m) => m._id !== tempId)
                    : thread.messages.map((m) => (m._id === tempId ? sent : m));
                if (!hasReal && !hasTemp) messages = [...messages, sent];
                if (key === realId) return { ...prev, [realId]: { ...thread, messages } };
                // گفتگوی تازه ساخته شد: رشتهٔ موقت به شناسهٔ واقعی منتقل می‌شود
                const next = { ...prev };
                delete next[key];
                const existing = prev[realId];
                const merged = [...(existing?.messages ?? []), ...messages.filter((m) => !existing?.messages.some((e) => e._id === m._id))];
                next[realId] = { ...(existing ?? EMPTY_THREAD), messages: merged };
                return next;
            });
            if (res.conversation) setConversations((prev) => upsertConversation(prev, res.conversation as ConversationItem));
            if (touchesShared(sent)) setSharedVersion((v) => v + 1);
            if (!convId) {
                setDrafts((prev) => {
                    const next = { ...prev };
                    delete next[key];
                    return next;
                });
                selectConversation(realId);
            }
        } catch (err) {
            setThreads((prev) => {
                const thread = prev[key];
                if (!thread) return prev;
                return {
                    ...prev,
                    [key]: {
                        ...thread,
                        messages: thread.messages.map((m) => (m._id === tempId ? { ...m, pending: false, failed: true, error: err } : m)),
                    },
                };
            });
            notifyError(err, { fallback: t('send_error') });
        }
    }, [pendingTo, userId, selectConversation, t]);

    const handleSend = (attachments: ReadyAttachment[]) => {
        if (!threadKey) return;
        const body = (drafts[threadKey] || '').trim();
        if ((!body && !attachments.length) || body.length > MESSAGE_MAX_LENGTH) return;
        setDrafts((prev) => ({ ...prev, [threadKey]: '' }));
        stopTyping();
        const replyTarget = replyTargets[threadKey];
        if (replyTarget) clearReply(threadKey);
        void sendText(body, attachments, undefined, replyTarget ? toReplyRef(replyTarget) : null);
    };

    const clearReply = (key: string) => {
        setReplyTargets((prev) => {
            if (!prev[key]) return prev;
            const next = { ...prev };
            delete next[key];
            return next;
        });
    };

    const startReply = useCallback((message: DirectMessageItem) => {
        const key = selectedRef.current;
        if (!key || message.pending || message.failed) return;
        setReplyTargets((prev) => ({ ...prev, [key]: message }));
    }, []);

    const copyMessages = async (list: DirectMessageItem[]) => {
        const text = list.map((m) => m.body).filter(Boolean).join('\n\n');
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            SuccessToaster({ message: t('copied') });
        } catch (err) {
            notifyError(err);
        }
    };

    const openForward = useCallback((list: DirectMessageItem[]) => {
        const sendable = list.filter((m) => !isLocalOnly(m));
        if (sendable.length) setForwardTarget(sendable);
    }, []);

    const submitForward = async (targetIds: string[]) => {
        const sourceId = selectedRef.current;
        const list = forwardTarget;
        if (!sourceId || !list?.length) return;
        try {
            const res = await marketplaceApi.forwardMessages({
                conversationId: sourceId,
                messageIds: list.map((m) => m._id),
                targetConversationIds: targetIds,
            });
            const ok = res.results.filter((r) => r.ok);
            for (const r of ok) {
                if (r.conversation) setConversations((prev) => upsertConversation(prev, r.conversation as ConversationItem));
            }
            if (!ok.length) {
                notifyError({ message: t('forward_error') });
                return;
            }
            setForwardTarget(null);
            if (ok.length < res.results.length) notifyError({ message: t('forward_partial') });
            else SuccessToaster({ message: t('forward_done') });
            // یک مقصد: مثل تلگرام به همان گفتگو برو
            if (targetIds.length === 1 && ok[0].conversationId !== sourceId) selectConversation(ok[0].conversationId);
        } catch (err) {
            notifyError(err, { fallback: t('forward_error') });
        }
    };

    const discardMessage = (message: DirectMessageItem) => {
        if (!threadKey) return;
        setThreads((prev) => {
            const thread = prev[threadKey];
            if (!thread) return prev;
            return { ...prev, [threadKey]: { ...thread, messages: thread.messages.filter((m) => m._id !== message._id) } };
        });
    };

    const copyMessage = async (message: DirectMessageItem) => {
        try {
            await navigator.clipboard.writeText(message.body);
            SuccessToaster({ message: t('copied') });
        } catch (err) {
            notifyError(err);
        }
    };

    const confirmDelete = async () => {
        const targets = deleteTargets;
        const id = selectedRef.current;
        if (!targets?.length || !id) return;
        const removed: string[] = [];
        let failure: unknown = null;
        for (const target of targets) {
            try {
                await marketplaceApi.deleteMessage(id, target._id);
                removed.push(target._id);
            } catch (err) {
                failure = err;
            }
        }
        if (removed.length) {
            setThreads((prev) => {
                const thread = prev[id];
                if (!thread) return prev;
                return { ...prev, [id]: { ...thread, messages: thread.messages.filter((m) => !removed.includes(m._id)) } };
            });
            if (targets.some((m) => removed.includes(m._id) && touchesShared(m))) setSharedVersion((v) => v + 1);
            // پاسخ به پیامی که حذف شد لغو شود
            if (replyTargets[id] && removed.includes(replyTargets[id]._id)) clearReply(id);
        }
        if (failure) {
            notifyError(failure, { fallback: t('delete_error') });
            setDeleteTargets(targets.filter((m) => !removed.includes(m._id)));
            return;
        }
        setDeleteTargets(null);
    };

    // ── مسدود / گزارش ─────────────────────────────────────────────────

    const setBlockedState = async (value: boolean) => {
        const id = selectedRef.current;
        if (!id) return;
        try {
            const res = await marketplaceApi.setConversationBlocked(id, value);
            if (res.conversation) setConversations((prev) => upsertConversation(prev, res.conversation as ConversationItem));
            if (value) stopTyping();
            SuccessToaster({ message: t(value ? 'blocked_done' : 'unblocked_done') });
            setBlockConfirmOpen(false);
        } catch (err) {
            notifyError(err, { fallback: t('block_error') });
        }
    };

    const submitReport = async (payload: { reason: MessageReportReason; details: string; block: boolean }) => {
        const id = selectedRef.current;
        if (!id) return;
        try {
            const res = await marketplaceApi.reportConversation(id, {
                ...payload,
                messageId: reportTarget?.message?._id,
            });
            if (res.blocked) {
                setConversations((prev) => prev.map((c) => (c._id === id ? { ...c, blockedByMe: true } : c)));
                stopTyping();
            }
            SuccessToaster({ message: t(res.alreadyReported ? 'report_already' : 'report_sent') });
            setReportTarget(null);
        } catch (err) {
            notifyError(err, { fallback: t('report_error') });
        }
    };

    if (!token) return null;

    const peer = selectedConversation?.otherUser || (selectedId ? null : pendingTo);
    const peerId = peer?._id || '';
    const threadOpen = Boolean(selectedId || pendingTo);
    const showInfo = infoOpen && Boolean(peer);
    const peerName = peer?.fullName || t('user');

    return (
        <div className={styles.page}>
            <div className={`${styles.layout} ${threadOpen ? styles.layoutThreadOpen : ''} ${showInfo ? styles.layoutInfoOpen : ''}`}>
                <ConversationList
                    conversations={conversations}
                    loading={listLoading}
                    loadError={listError}
                    onRetry={() => void loadConversations()}
                    selectedId={selectedId}
                    pendingTo={pendingTo}
                    query={query}
                    onQueryChange={setQuery}
                    typing={typingMap}
                    online={Object.fromEntries(Object.entries(presence).map(([id, p]) => [id, p.online]))}
                    folder={folder}
                    onFolderChange={changeFolder}
                    onSelect={selectConversation}
                    onAction={onConversationAction}
                />
                <ThreadView
                    key={threadKey || 'idle'}
                    conversation={selectedConversation}
                    pendingTo={selectedId ? null : pendingTo}
                    selecting={Boolean(selectedId) && !selectedConversation}
                    thread={threadKey ? threads[threadKey] ?? (selectedId ? { ...EMPTY_THREAD, loading: true } : EMPTY_THREAD) : null}
                    presence={peerId ? presence[peerId] : undefined}
                    typing={Boolean(selectedId && typingMap[selectedId])}
                    connected={connected}
                    draft={threadKey ? drafts[threadKey] || '' : ''}
                    infoOpen={showInfo}
                    onToggleInfo={toggleInfo}
                    onDraftChange={onDraftChange}
                    onSend={handleSend}
                    onBack={goBack}
                    onLoadOlder={() => void loadOlder()}
                    onRetryLoad={() => selectedId && void loadThread(selectedId)}
                    onRetryMessage={(m) => void sendText(m.body, m.attachments ?? [], m, m.replyTo)}
                    onDiscardMessage={discardMessage}
                    onDeleteMessage={(m) => setDeleteTargets([m])}
                    onDeleteMessages={(list) => setDeleteTargets(list)}
                    onCopyMessage={(m) => void copyMessage(m)}
                    onCopyMessages={(list) => void copyMessages(list)}
                    onForward={openForward}
                    replyTarget={threadKey ? replyTargets[threadKey] ?? null : null}
                    onReply={startReply}
                    onCancelReply={() => threadKey && clearReply(threadKey)}
                    onReport={(message) => setReportTarget({ message })}
                    onBlock={() => setBlockConfirmOpen(true)}
                    onConversationAction={onConversationAction}
                    onUnblock={() => void setBlockedState(false)}
                    onOpenMedia={(items, index) => setViewer({ items, index })}
                />
                {showInfo && peer && (
                    <>
                        <button type="button" className={styles.infoBackdrop} onClick={toggleInfo} aria-label={t('info_close')} tabIndex={-1} />
                        <div className={styles.infoSlot}>
                            <ConversationInfoPanel
                                key={selectedConversation?._id || peer._id}
                                conversation={selectedConversation}
                                peer={peer}
                                presence={presence[peer._id]}
                                sharedVersion={sharedVersion}
                                onClose={toggleInfo}
                                onOpenMedia={(items, index) => setViewer({ items, index })}
                                onBlock={() => setBlockConfirmOpen(true)}
                                onUnblock={() => void setBlockedState(false)}
                                onReport={() => setReportTarget({})}
                            />
                        </div>
                    </>
                )}
            </div>

            <ModalHelper
                open={Boolean(deleteTargets?.length)}
                onClose={() => setDeleteTargets(null)}
                size="sm"
                sheetTitle={t('delete_confirm_title')}
                component={deleteTargets?.length ? (
                    <DeleteMessageDialog
                        count={deleteTargets.length}
                        preview={deleteTargets.map((m) => (m.body
                            ? (m.body.length > 160 ? `${m.body.slice(0, 160)}…` : m.body)
                            : (m.attachments ?? []).map((a) => a.name).join('، '))).join('\n')}
                        onCancel={() => setDeleteTargets(null)}
                        onConfirm={confirmDelete}
                    />
                ) : null}
            />

            <ModalHelper
                open={Boolean(forwardTarget)}
                onClose={() => setForwardTarget(null)}
                size="sm"
                sheetTitle={t('forward_title')}
                component={forwardTarget ? (
                    <ForwardDialog
                        conversations={conversations}
                        count={forwardTarget.length}
                        onCancel={() => setForwardTarget(null)}
                        onSubmit={submitForward}
                    />
                ) : null}
            />

            <ModalHelper
                open={Boolean(reportTarget)}
                onClose={() => setReportTarget(null)}
                size="md"
                sheetTitle={t('report_user')}
                closeOnOverlayClick={false}
                component={reportTarget ? (
                    <ReportDialog
                        name={peerName}
                        messagePreview={reportTarget.message
                            ? (reportTarget.message.body || (reportTarget.message.attachments ?? []).map((a) => a.name).join('، ')).slice(0, 200)
                            : undefined}
                        alreadyBlocked={Boolean(selectedConversation?.blockedByMe)}
                        onCancel={() => setReportTarget(null)}
                        onSubmit={submitReport}
                    />
                ) : null}
            />

            <ModalHelper
                open={blockConfirmOpen}
                onClose={() => setBlockConfirmOpen(false)}
                size="sm"
                sheetTitle={t('block_user')}
                component={blockConfirmOpen ? (
                    <BlockDialog
                        name={peerName}
                        onCancel={() => setBlockConfirmOpen(false)}
                        onConfirm={() => setBlockedState(true)}
                    />
                ) : null}
            />

            <ModalHelper
                open={Boolean(deleteChatTarget)}
                onClose={() => setDeleteChatTarget(null)}
                size="sm"
                sheetTitle={t('delete_chat')}
                component={deleteChatTarget ? (
                    <DeleteChatDialog
                        name={deleteChatTarget.otherUser?.fullName || t('user')}
                        onCancel={() => setDeleteChatTarget(null)}
                        onConfirm={confirmDeleteChat}
                    />
                ) : null}
            />

            {viewer && <MediaViewer items={viewer.items} index={viewer.index} onClose={() => setViewer(null)} />}
        </div>
    );
}
