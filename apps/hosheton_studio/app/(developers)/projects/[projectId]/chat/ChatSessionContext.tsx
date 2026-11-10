'use client';

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import { mediaApi } from '@/app/(developers)/projects/lib/media-api';
import { providersApi } from '@/app/(developers)/projects/lib/providers-api';
import { notifyError } from '@/app/lib/errors';
import { isSameChatMedia } from './lib/chat-attachment-kind';
import { findEditableChatTurn, findFailedChatTurn } from './lib/chat-message-turns';
import type {
    MediaJobLog,
    StudioChat,
    StudioChatListItem,
    StudioChatMediaKind,
    StudioChatSettings,
    TemplatePreviewMedia,
    StudioMediaMention,
} from '@/app/(developers)/projects/types/media-api';
import {
    useChatRealtime,
    type ChatRealtimeMessageEvent,
} from '@/app/(developers)/projects/hooks/useChatRealtime';
import type { DeveloperProviderLogEvent } from '@/app/(developers)/projects/context/MediaStudioContext';
import {
    clearStudioChatInject,
    PERSONAL_CHAT_INJECT_KEY,
    readStudioChatInject,
    writeStudioChatInject,
} from '@/app/zustand/store/useStudioExploreStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { promptGuestLogin } from '@/app/components/guest/guestAccess';
import { useChatAttachmentValidation } from './lib/useChatAttachmentValidation';
import { readLastOpenChat, writeLastOpenChat } from './lib/last-open-chat';

export const DEFAULT_CHAT_PANELS = { mode: true, camera: true, lighting: true, angles: true } as const;

const CHAT_PANELS_REFRESH_MS = 5 * 60_000;

export const DEFAULT_CHAT_SETTINGS: StudioChatSettings = {
    providerId: '',
    providerName: '',
    modelId: '',
    model: '',
    modelName: '',
    modelSettings: {},
    aspectRatio: '1:1',
    resolution: '4K',
    zoom: 0,
    extra: '',
    audioMode: '',
    extras: {},
    capabilityMode: '',
    director: { camera: {}, lighting: {} },
    chatPanels: { ...DEFAULT_CHAT_PANELS },
};

type ChatPanelsState = {
    mode: boolean;
    camera: boolean;
    lighting: boolean;
    /** «زاویه و نور» */
    angles: boolean;
};

function overlayChatPanels(settings: StudioChatSettings, panels: ChatPanelsState): StudioChatSettings {
    const director = settings.director && typeof settings.director === 'object' ? settings.director : {};
    return {
        ...settings,
        chatPanels: panels,
        capabilityMode: panels.mode ? settings.capabilityMode : '',
        director: {
            camera: panels.camera && director.camera && typeof director.camera === 'object' ? { ...director.camera } : {},
            lighting: panels.lighting && director.lighting && typeof director.lighting === 'object' ? { ...director.lighting } : {},
        },
        // ابزار «زاویه و نور» با خاموش‌شدن بخشش در naslyar خاموش می‌شود (همان رفتار سرور)
        ...(!panels.angles && settings.angleStudio && typeof settings.angleStudio === 'object'
            ? { angleStudio: { ...settings.angleStudio, enabled: false } }
            : {}),
    };
}

export type PendingUpload = {
    id: string;
    name: string;
    localUrl: string;
    progress: number;
    kind?: 'image' | 'video' | 'audio' | 'file';
    status: 'uploading' | 'failed';
    file: File;
    inputKey?: string;
};

export type ChatSessionScope = { kind: 'project'; projectId: string } | { kind: 'personal' };

/** رویدادهای realtime پنل تاریخچه — از طریق سوکت چت منتشر می‌شوند */
export type ChatHistoryRealtimeEvent =
    | { type: 'updated'; chat: StudioChatListItem }
    | { type: 'deleted'; chatId: string };

type ChatDraftBody = {
    mediaKind?: StudioChatMediaKind;
    promptText?: string;
    attachments?: TemplatePreviewMedia[];
    mentionRefs?: StudioMediaMention[];
    settings?: StudioChatSettings;
};

function resolveScope(scope?: ChatSessionScope, projectId?: string): ChatSessionScope {
    if (scope) return scope;
    return { kind: 'project', projectId: String(projectId || '') };
}

function chatClient(scope: ChatSessionScope) {
    if (scope.kind === 'personal') {
        return {
            getDraft: () => mediaApi.getPersonalChatDraft(),
            list: () => mediaApi.listPersonalChats(),
            create: (body?: { keepDraft?: boolean }) => mediaApi.createPersonalChat(body),
            upsertDraft: (body: ChatDraftBody) => mediaApi.upsertPersonalChatDraft(body),
            get: (id: string) => mediaApi.getPersonalChat(id),
            patch: (id: string, body: ChatDraftBody) => mediaApi.patchPersonalChat(id, body),
            send: (id: string, body?: { promptText?: string; mentionRefs?: StudioMediaMention[]; quotedUsd?: number }) => mediaApi.sendPersonalChat(id, body),
            retry: (id: string, body: Parameters<typeof mediaApi.retryPersonalChat>[1]) => mediaApi.retryPersonalChat(id, body),
            remove: (id: string) => mediaApi.deletePersonalChat(id),
            deleteOutput: (id: string, messageId: string, url: string) => mediaApi.deletePersonalChatOutput(id, messageId, url),
            deleteFailedTurn: (id: string, messageId: string) => mediaApi.deletePersonalChatFailedTurn(id, messageId),
        };
    }
    const projectId = scope.projectId;
    return {
        getDraft: () => mediaApi.getChatDraft(projectId),
        list: () => mediaApi.listChats(projectId),
        create: (body?: { keepDraft?: boolean }) => mediaApi.createChat(projectId, body),
        upsertDraft: (body: ChatDraftBody) => mediaApi.upsertChatDraft(projectId, body),
        get: (id: string) => mediaApi.getChat(projectId, id),
        patch: (id: string, body: ChatDraftBody) => mediaApi.patchChat(projectId, id, body),
        send: (id: string, body?: { promptText?: string; mentionRefs?: StudioMediaMention[]; quotedUsd?: number }) => mediaApi.sendChat(projectId, id, body),
        retry: (id: string, body: Parameters<typeof mediaApi.retryChat>[2]) => mediaApi.retryChat(projectId, id, body),
        remove: (id: string) => mediaApi.deleteChat(projectId, id),
        deleteOutput: (id: string, messageId: string, url: string) => mediaApi.deleteChatOutput(projectId, id, messageId, url),
        deleteFailedTurn: (id: string, messageId: string) => mediaApi.deleteChatFailedTurn(projectId, id, messageId),
    };
}

/** وضعیت زنده یک نوبت در حال تولید (کلید: messageId پیام assistant) */
export type ChatTurnLiveStatus = {
    state: 'queued' | 'running' | 'unknown' | 'checking';
    /** درصد پیشرفت provider؛ null یعنی provider درصد گزارش نمی‌دهد */
    progress: number | null;
    message: string;
};

/** سکوت طولانی یک نوبت در حال تولید (بدون هیچ رویداد سوکت) → یک بار بررسی وضعیت از سوکت */
const TURN_SILENCE_CHECK_MS = 120_000;

type ChatSessionValue = {
    scope: ChatSessionScope;
    projectId: string;
    loading: boolean;
    connectionOk: boolean;
    realtimeConnected: boolean;
    historyRevision: number;
    chat: StudioChat | null;
    promptText: string;
    attachments: TemplatePreviewMedia[];
    mentions: StudioMediaMention[];
    pendingUploads: PendingUpload[];
    mediaKind: StudioChatMediaKind;
    settings: StudioChatSettings;
    hasTranscript: boolean;
    /** کادر متن دارد (به‌روزتر از promptText که هنگام تایپ منتشر نمی‌شود) */
    hasPrompt: boolean;
    canSend: boolean;
    /** کاربر وارد نشده — «ارسال» فقط پنجره‌ی ورود را باز می‌کند */
    isGuest: boolean;
    /** پیام‌های مسدودکننده‌ی ارسال (مثلاً فیلد ترکیبی بدون مقدار) — توسط تولبار منتشر می‌شود */
    composerBlockers: string[];
    setComposerBlockers: (blockers: string[]) => void;
    processing: boolean;
    liveLogs: MediaJobLog[];
    /** درصد/وضعیت زنده نوبت‌های در حال تولید (از node:progress، job:log و chat:status) */
    turnStatus: Record<string, ChatTurnLiveStatus>;
    /** بررسی دستی وضعیت از سوکت — بدون درخواست HTTP */
    checkTurnStatus: () => Promise<void>;
    /** حذف یک خروجی تولیدشده؛ storageDeleted=false یعنی فایل جای دیگری هنوز استفاده می‌شد */
    deleteGeneratedOutput: (messageId: string, url: string) => Promise<{ storageDeleted: boolean } | null>;
    /** حذف نوبت ناموفق از تاریخچه (فایل‌های ورودی پاک نمی‌شوند) */
    deleteFailedTurn: (messageId: string) => Promise<void>;
    setPromptText: (value: string) => void;
    setPromptDocument: (value: string, mentions: StudioMediaMention[]) => void;
    setMediaKind: (kind: StudioChatMediaKind) => void;
    patchSettings: (patch: Partial<StudioChatSettings>) => void;
    addAttachments: (items: TemplatePreviewMedia[]) => void;
    replaceAttachments: (items: TemplatePreviewMedia[]) => void;
    updateAttachment: (item: TemplatePreviewMedia, patch: Partial<TemplatePreviewMedia>) => void;
    removeAttachment: (item: TemplatePreviewMedia) => Promise<void>;
    addPendingUpload: (item: PendingUpload) => void;
    updatePendingUpload: (id: string, patch: Partial<PendingUpload>) => void;
    removePendingUpload: (id: string) => void;
    appendPrompt: (text: string) => void;
    /** Live composer text, including keystrokes that have not been published to React yet. */
    readComposerText: () => string;
    /** quotedUsd = price the user confirmed; the server charges exactly it (or rejects if it changed). */
    send: (options?: { quotedUsd?: number | null }) => Promise<void>;
    sending: boolean;
    retryingMessageId: string | null;
    editingMessageId: string | null;
    retryFailedTurn: (assistantMessageId: string) => Promise<void>;
    /** excludeUrls: ورودی‌هایی که باز نمی‌شوند کنار گذاشته شوند (پنجره «بیشتر بدانید») */
    startEditFailedTurn: (assistantMessageId: string, options?: { excludeUrls?: string[] }) => void;
    /** ویرایش پیام کاربر در چت متنی (نوبت‌های کامل) */
    startEditTurn: (assistantMessageId: string) => void;
    cancelEdit: () => void;
    submitEditedTurn: () => Promise<void>;
    selectChat: (chatId: string) => Promise<void>;
    newChat: () => Promise<void>;
    deleteChat: (chatId: string) => Promise<void>;
    registerProviderLogListener: (
        listener: ((event: DeveloperProviderLogEvent) => void) | null,
    ) => void;
    registerHistoryListener: (
        listener: ((event: ChatHistoryRealtimeEvent) => void) | null,
    ) => void;
};

const ChatSessionContext = createContext<ChatSessionValue | null>(null);

export function useChatSession() {
    const value = useContext(ChatSessionContext);
    if (!value) throw new Error('useChatSession must be used inside ChatSessionProvider');
    return value;
}

/** برای کامپوننت‌هایی که هم داخل چت و هم بیرون آن (مثلاً تنظیمات نود) استفاده می‌شوند */
export function useOptionalChatSession() {
    return useContext(ChatSessionContext);
}

function applyChat(chat: StudioChat | null, panels: ChatPanelsState = DEFAULT_CHAT_PANELS) {
    return {
        promptText: chat?.promptText || '',
        attachments: chat?.attachments || [],
        mentions: chat?.mentionRefs || chat?.mentions || [],
        mediaKind: (chat?.mediaKind || 'image') as StudioChatMediaKind,
        settings: overlayChatPanels({ ...DEFAULT_CHAT_SETTINGS, ...(chat?.settings || {}) }, panels),
    };
}

function sameTranscript(prev: StudioChat | null, next: StudioChat) {
    if (!prev || prev._id !== next._id || prev.status !== next.status) return false;
    const previousMessages = prev.messages || [];
    const nextMessages = next.messages || [];
    if (previousMessages.length !== nextMessages.length) return false;
    for (let i = 0; i < previousMessages.length; i += 1) {
        const before = previousMessages[i];
        const after = nextMessages[i];
        if (before.messageId !== after.messageId) return false;
        if (before.status !== after.status) return false;
        if (before.content !== after.content) return false;
        if ((before.attachments?.length || 0) !== (after.attachments?.length || 0)) return false;
    }
    return true;
}

function sameMentionList(a: StudioMediaMention[], b: StudioMediaMention[]) {
    if (a === b) return true;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
        if (a[i]?.assetId !== b[i]?.assetId || a[i]?.label !== b[i]?.label) return false;
    }
    return true;
}

function hasComposerContent(snap: { promptText: string; attachments: TemplatePreviewMedia[] }) {
    return Boolean(snap.promptText.trim() || snap.attachments.length);
}

function isSettingsReady(settings: StudioChatSettings) {
    return Boolean(String(settings.providerId || '').trim() && String(settings.modelId || '').trim());
}

function hasProcessingMessage(chat: StudioChat | null) {
    return Boolean(chat?.messages?.some((message) => message.role === 'assistant' && message.status === 'processing'));
}

export function ChatSessionProvider({
    projectId,
    scope,
    children,
}: {
    projectId?: string;
    scope?: ChatSessionScope;
    children: ReactNode;
}) {
    const scopeKind = scope?.kind;
    const scopedProjectId = scope?.kind === 'project' ? scope.projectId : projectId;
    const resolvedScope = useMemo<ChatSessionScope>(
        () => resolveScope(
            scopeKind === 'personal' ? { kind: 'personal' } : undefined,
            scopedProjectId,
        ),
        [scopeKind, scopedProjectId],
    );
    const api = useMemo(() => chatClient(resolvedScope), [resolvedScope]);
    const injectProjectId = resolvedScope.kind === 'project' ? resolvedScope.projectId : '';
    const injectScopeId = resolvedScope.kind === 'personal' ? PERSONAL_CHAT_INJECT_KEY : injectProjectId;
    // مهمان کل چت را می‌بیند ولی پیش‌نویسی ذخیره/خوانده نمی‌شود؛ «ارسال» پنجره‌ی ورود را باز می‌کند
    const isGuest = !useAuthStore((state) => state.token);
    const [loading, setLoading] = useState(true);
    const [browserOnline, setBrowserOnline] = useState(
        typeof navigator === 'undefined' ? true : navigator.onLine,
    );
    const [apiReachable, setApiReachable] = useState(true);
    const [historyRevision, setHistoryRevision] = useState(0);
    const [chat, setChat] = useState<StudioChat | null>(null);
    const [promptText, setPromptTextState] = useState('');
    const [hasPrompt, setHasPrompt] = useState(false);
    const promptPublishTimer = useRef(0);
    const [attachments, setAttachments] = useState<TemplatePreviewMedia[]>([]);
    const [mentions, setMentions] = useState<StudioMediaMention[]>([]);
    const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
    const [mediaKind, setMediaKindState] = useState<StudioChatMediaKind>('image');
    const [settings, setSettings] = useState<StudioChatSettings>(DEFAULT_CHAT_SETTINGS);
    const [sending, setSending] = useState(false);
    const [retryingMessageId, setRetryingMessageId] = useState<string | null>(null);
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [composerBlockers, setComposerBlockers] = useState<string[]>([]);
    const [liveLogs, setLiveLogs] = useState<MediaJobLog[]>([]);
    const [turnStatus, setTurnStatus] = useState<Record<string, ChatTurnLiveStatus>>({});
    /** آخرین رویداد سوکت مربوط به نوبت در حال تولید — مبنای تشخیص سکوت */
    const lastTurnActivityRef = useRef(0);
    const dirtyRef = useRef(false);
    const persistTimer = useRef<number | null>(null);
    const persistEpochRef = useRef(0);
    const deletingIds = useRef(new Set<string>());
    const editingMessageIdRef = useRef<string | null>(null);
    const providerLogListenerRef = useRef<((event: DeveloperProviderLogEvent) => void) | null>(null);
    const historyListenerRef = useRef<((event: ChatHistoryRealtimeEvent) => void) | null>(null);
    const selectAbortRef = useRef<AbortController | null>(null);
    const refreshFailStreakRef = useRef(0);
    const snapshotRef = useRef({ promptText: '', attachments, mentions, mediaKind, settings, chat });
    const chatPanelsRef = useRef<ChatPanelsState>({ ...DEFAULT_CHAT_PANELS });
    /** scope whose initial chat has loaded — the open chat is remembered only for it */
    const chatScopeRef = useRef('');

    const connectionOk = browserOnline && apiReachable;
    const bumpHistoryRevision = useCallback(() => {
        setHistoryRevision((value) => value + 1);
    }, []);
    const markApiOk = useCallback(() => {
        refreshFailStreakRef.current = 0;
        setApiReachable(true);
    }, []);
    const markApiFail = useCallback(() => {
        refreshFailStreakRef.current += 1;
        if (refreshFailStreakRef.current >= 2) setApiReachable(false);
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const syncOnline = () => {
            const online = navigator.onLine;
            setBrowserOnline(online);
            if (online) setApiReachable(true);
        };
        syncOnline();
        window.addEventListener('online', syncOnline);
        window.addEventListener('offline', syncOnline);
        return () => {
            window.removeEventListener('online', syncOnline);
            window.removeEventListener('offline', syncOnline);
        };
    }, []);

    useEffect(() => {
        snapshotRef.current = {
            ...snapshotRef.current,
            attachments,
            mediaKind,
            settings,
            chat,
        };
    }, [attachments, mediaKind, settings, chat]);

    const hydrate = useCallback((next: StudioChat | null, options?: { keepComposer?: boolean }) => {
        if (!options?.keepComposer) persistEpochRef.current += 1;
        snapshotRef.current = { ...snapshotRef.current, chat: next };
        setChat(next);
        if (options?.keepComposer) return;
        editingMessageIdRef.current = null;
        setEditingMessageId(null);
        const applied = applyChat(next, chatPanelsRef.current);
        snapshotRef.current = { ...snapshotRef.current, ...applied, chat: next };
        setPromptTextState(applied.promptText);
        setHasPrompt(Boolean(applied.promptText.trim()));
        setAttachments(applied.attachments);
        setMentions(applied.mentions);
        setMediaKindState(applied.mediaKind);
        setSettings(applied.settings);
    }, []);

    useEffect(() => {
        if (!connectionOk) return;
        let cancelled = false;
        const apply = (panels: ChatPanelsState) => {
            chatPanelsRef.current = panels;
            const next = overlayChatPanels(snapshotRef.current.settings, panels);
            snapshotRef.current = { ...snapshotRef.current, settings: next };
            setSettings(next);
        };
        let loadedAt = 0;
        const load = () => {
            loadedAt = Date.now();
            providersApi.getChatPanels()
                .then((panels) => {
                    if (!cancelled) apply(panels);
                })
                .catch(() => { loadedAt = 0; });
        };
        // Admin panel toggles rarely change — refocusing the tab must not refetch each time.
        const reloadIfStale = () => {
            if (document.visibilityState !== 'visible') return;
            if (Date.now() - loadedAt < CHAT_PANELS_REFRESH_MS) return;
            load();
        };
        load();
        document.addEventListener('visibilitychange', reloadIfStale);
        window.addEventListener('focus', reloadIfStale);
        return () => {
            cancelled = true;
            document.removeEventListener('visibilitychange', reloadIfStale);
            window.removeEventListener('focus', reloadIfStale);
        };
    }, [connectionOk]);

    const persist = useCallback(async () => {
        if (isGuest || !browserOnline || !apiReachable) return snapshotRef.current.chat;
        const snap = snapshotRef.current;
        const current = snap.chat;
        const epoch = persistEpochRef.current;
        if (current?._id && deletingIds.current.has(current._id)) return current;
        const body = {
            promptText: snap.promptText,
            attachments: snap.attachments,
            mentionRefs: snap.mentions,
            mediaKind: snap.mediaKind,
            settings: snap.settings,
        };
        const applySaved = (next: StudioChat | null | undefined) => {
            if (!next?._id || epoch !== persistEpochRef.current) return next ?? current;
            snapshotRef.current = { ...snapshotRef.current, chat: next };
            setChat((prev) => (sameTranscript(prev, next) ? prev : next));
            return next;
        };
        try {
            if (current?._id && current.status === 'active') {
                const next = await api.patch(current._id, body);
                markApiOk();
                return applySaved(next);
            }
            if (!current?._id && !hasComposerContent(snap) && !isSettingsReady(snap.settings)) return current;
            const next = await api.upsertDraft(body);
            markApiOk();
            return applySaved(next);
        } catch (error) {
            markApiFail();
            throw error;
        }
    }, [api, apiReachable, browserOnline, isGuest, markApiFail, markApiOk]);

    const schedulePersist = useCallback(() => {
        if (editingMessageIdRef.current) return;
        if (!browserOnline || !apiReachable) return;
        dirtyRef.current = true;
        if (!snapshotRef.current.chat) {
            dirtyRef.current = false;
            void persist().catch(() => undefined);
            return;
        }
        if (persistTimer.current) window.clearTimeout(persistTimer.current);
        persistTimer.current = window.setTimeout(() => {
            persistTimer.current = null;
            if (!dirtyRef.current) return;
            dirtyRef.current = false;
            void persist().catch(() => undefined);
        }, 2500);
    }, [apiReachable, browserOnline, persist]);

    const flushPersist = useCallback(async () => {
        if (editingMessageIdRef.current) return snapshotRef.current.chat;
        if (persistTimer.current) {
            window.clearTimeout(persistTimer.current);
            persistTimer.current = null;
        }
        const snap = snapshotRef.current;
        const shouldSave = dirtyRef.current
            || (!snap.chat?._id && (hasComposerContent(snap) || isSettingsReady(snap.settings)));
        dirtyRef.current = false;
        if (!shouldSave) return snap.chat;
        return persist().catch(() => snap.chat);
    }, [persist]);

    const consumeInject = useCallback(() => {
        if (!injectScopeId) return;
        const payload = readStudioChatInject(injectScopeId);
        if (!payload) return;
        clearStudioChatInject(injectScopeId);
        if (payload.prompt?.trim()) {
            const prev = snapshotRef.current.promptText;
            const next = prev.trim() ? `${prev.trim()}\n${payload.prompt.trim()}` : payload.prompt.trim();
            snapshotRef.current = { ...snapshotRef.current, promptText: next };
            setPromptTextState(next);
            setHasPrompt(Boolean(next.trim()));
        }
        if (payload.attachments?.length) {
            const next = [...snapshotRef.current.attachments, ...payload.attachments];
            snapshotRef.current = { ...snapshotRef.current, attachments: next };
            setAttachments(next);
        }
        schedulePersist();
    }, [injectScopeId, schedulePersist]);

    const consumeInjectRef = useRef(consumeInject);
    useEffect(() => {
        consumeInjectRef.current = consumeInject;
    }, [consumeInject]);

    useEffect(() => {
        let cancelled = false;
        chatScopeRef.current = '';
        // Guest: empty composer, nothing to load (after login this effect reruns and loads the real draft)
        if (isGuest) {
            chatScopeRef.current = injectScopeId;
            hydrate(null);
            consumeInjectRef.current();
            setLoading(false);
            return;
        }
        const frame = window.requestAnimationFrame(() => setLoading(true));
        // The chat the user had open wins over the server default (open draft / latest);
        // a stored chat that is gone or not ours falls back to that default.
        const storedChatId = readLastOpenChat(injectScopeId);
        const loadStored = storedChatId
            ? api.get(storedChatId).then((stored) => (stored?._id === storedChatId ? stored : null)).catch(() => null)
            : Promise.resolve(null);
        loadStored
            .then(async (stored) => stored ?? (await api.getDraft()).chat)
            .then((next) => {
                if (cancelled) return;
                markApiOk();
                chatScopeRef.current = injectScopeId;
                if (!next?._id) writeLastOpenChat(injectScopeId, '');
                hydrate(next);
                consumeInjectRef.current();
            })
            .catch(() => {
                if (!cancelled) {
                    refreshFailStreakRef.current = 2;
                    setApiReachable(false);
                    chatScopeRef.current = injectScopeId;
                    // Keep any existing chat; only clear when we never had one.
                    if (!snapshotRef.current.chat) hydrate(null);
                    consumeInjectRef.current();
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
            window.cancelAnimationFrame(frame);
            if (persistTimer.current) window.clearTimeout(persistTimer.current);
            selectAbortRef.current?.abort();
        };
    }, [api, hydrate, injectScopeId, isGuest, markApiOk]);

    // Remember the open chat per scope so a reload restores it (cleared on delete / empty new chat).
    const openChatId = chat?._id || '';
    useEffect(() => {
        if (!openChatId || chatScopeRef.current !== injectScopeId) return;
        writeLastOpenChat(injectScopeId, openChatId);
    }, [injectScopeId, openChatId]);

    const forgetLastOpenChat = useCallback((chatId: string) => {
        if (readLastOpenChat(injectScopeId) === chatId) writeLastOpenChat(injectScopeId, '');
    }, [injectScopeId]);

    useEffect(() => {
        const onInject = (event: Event) => {
            const detail = (event as CustomEvent<{ projectId?: string }>).detail;
            if (detail?.projectId && detail.projectId !== injectScopeId) return;
            consumeInject();
        };
        window.addEventListener('studio-chat-inject', onInject);
        return () => window.removeEventListener('studio-chat-inject', onInject);
    }, [injectScopeId, consumeInject]);

    useEffect(() => {
        const onLeave = () => {
            if (typeof document !== 'undefined' && document.visibilityState === 'visible') return;
            void flushPersist();
        };
        window.addEventListener('pagehide', onLeave);
        document.addEventListener('visibilitychange', onLeave);
        return () => {
            window.removeEventListener('pagehide', onLeave);
            document.removeEventListener('visibilitychange', onLeave);
        };
    }, [flushPersist]);

    const registerProviderLogListener = useCallback((
        listener: ((event: DeveloperProviderLogEvent) => void) | null,
    ) => {
        providerLogListenerRef.current = listener;
    }, []);

    const registerHistoryListener = useCallback((
        listener: ((event: ChatHistoryRealtimeEvent) => void) | null,
    ) => {
        historyListenerRef.current = listener;
    }, []);

    // پیام realtime (ارسال/تکمیل/شکست) را با ادغام بر اساس messageId داخل ترنسکریپت فعال اعمال می‌کند
    const applyRealtimeMessage = useCallback((event: ChatRealtimeMessageEvent) => {
        const current = snapshotRef.current.chat;
        const message = event?.message;
        if (!current || !message?.messageId || String(current._id) !== String(event.chatId)) return;
        const messages = [...(current.messages || [])];
        const index = messages.findIndex((entry) => entry.messageId && entry.messageId === message.messageId);
        if (index >= 0) messages[index] = { ...messages[index], ...message };
        else messages.push(message);
        hydrate({ ...current, messages } as StudioChat, { keepComposer: true });
    }, [hydrate]);

    /** runId → messageId نوبت در حال تولید چت باز */
    const processingMessageIdForRun = useCallback((runId: string) => {
        const message = (snapshotRef.current.chat?.messages || []).find((entry) => (
            entry.role === 'assistant'
            && entry.status === 'processing'
            && entry.runId
            && String(entry.runId) === String(runId)
        ));
        return message?.messageId || '';
    }, []);

    const patchTurnStatus = useCallback((messageId: string, patch: Partial<ChatTurnLiveStatus>) => {
        if (!messageId) return;
        setTurnStatus((prev) => ({
            ...prev,
            [messageId]: {
                state: 'running',
                progress: prev[messageId]?.progress ?? null,
                message: prev[messageId]?.message || '',
                ...patch,
            },
        }));
    }, []);

    const { connected: realtimeConnected, emitChatSend, emitChatRetry, emitChatSync, emitChatStatus } = useChatRealtime(
        injectProjectId || undefined,
        chat?._id || undefined,
        {
            onConnectionChange: (connected) => {
                if (connected) markApiOk();
            },
            onJobLog: (log) => {
                setLiveLogs((prev) => [...prev.slice(-80), log]);
                const messageId = processingMessageIdForRun(String(log.runId || ''));
                if (!messageId) return;
                lastTurnActivityRef.current = Date.now();
                const progress = Number(log.meta?.progress);
                patchTurnStatus(messageId, {
                    message: log.message || '',
                    ...(Number.isFinite(progress) ? { progress: Math.round(progress) } : {}),
                });
            },
            onNodeProgress: ({ runId, progress }) => {
                const messageId = processingMessageIdForRun(runId);
                if (!messageId) return;
                lastTurnActivityRef.current = Date.now();
                if (Number.isFinite(progress)) patchTurnStatus(messageId, { progress: Math.round(progress) });
            },
            onRunTerminal: ({ runId, chatId, status, error }) => {
                // تشخیص پایان/شکست فقط با رویداد سوکت — هیچ درخواستی خارج از سوکت
                // زده نمی‌شود. رویداد chat:message (با پیوست‌ها و هزینه) منبع اصلی
                // می‌ماند؛ این هندلر تضمین می‌کند نوبتِ پردازش‌کننده حتی اگر آن
                // رویداد گم شود هم از حالت پردازش خارج شود.
                if (status === 'COMPLETED' || !runId) return;
                const current = snapshotRef.current.chat;
                if (!current?._id) return;
                if (chatId && String(current._id) !== String(chatId)) return;
                const messages = current.messages || [];
                const index = messages.findIndex((message) => (
                    message.role === 'assistant'
                    && message.status === 'processing'
                    && (message.runId
                        ? String(message.runId) === String(runId)
                        // پیام بدون runId فقط وقتی قربانی این رویداد است که رویداد
                        // صراحتاً به همین چت تعلق داشته باشد
                        : Boolean(chatId))
                ));
                if (index < 0) return;
                const next = [...messages];
                next[index] = {
                    ...messages[index],
                    status: 'failed',
                    content: error || messages[index].content || '',
                    errorMessage: error || 'STUDIO_CHAT_RUN_FAILED',
                };
                hydrate({ ...current, messages: next } as StudioChat, { keepComposer: true });
            },
            onProviderLog: (event) => {
                providerLogListenerRef.current?.(event);
            },
            onChatMessage: applyRealtimeMessage,
            onChatUpdated: (event) => {
                historyListenerRef.current?.({ type: 'updated', chat: event.chat });
            },
            onChatDeleted: (event) => {
                historyListenerRef.current?.({ type: 'deleted', chatId: event.chatId });
                forgetLastOpenChat(event.chatId);
                if (snapshotRef.current.chat?._id === event.chatId) hydrate(null);
            },
        },
    );

    const publishPromptState = useCallback((value: string) => {
        if (promptPublishTimer.current) {
            window.clearTimeout(promptPublishTimer.current);
            promptPublishTimer.current = 0;
        }
        setPromptTextState(value);
        setHasPrompt(Boolean(value.trim()));
    }, []);

    const setPromptText = useCallback((value: string) => {
        snapshotRef.current = { ...snapshotRef.current, promptText: value };
        publishPromptState(value);
        schedulePersist();
    }, [publishPromptState, schedulePersist]);

    const setPromptDocument = useCallback((value: string, nextMentions: StudioMediaMention[]) => {
        snapshotRef.current = {
            ...snapshotRef.current,
            promptText: value,
            mentions: nextMentions,
        };
        setHasPrompt((prev) => {
            const next = Boolean(value.trim());
            return prev === next ? prev : next;
        });
        setMentions((prev) => (sameMentionList(prev, nextMentions) ? prev : nextMentions));
        schedulePersist();
    }, [schedulePersist]);

    const readComposerText = useCallback(() => snapshotRef.current.promptText, []);

    const setMediaKind = useCallback((kind: StudioChatMediaKind) => {
        // فقط چتِ متنی قفل است: برای تولید عکس/ویدیو/صوت چت جدید لازم است.
        // در چت‌های رسانه‌ای جابه‌جایی بین عکس/ویدیو/صوت در همان چت آزاد است،
        // اما ورود به حالت متن هم نیاز به چت جدید دارد.
        if (snapshotRef.current.chat?.messages?.length) {
            const currentKind = snapshotRef.current.mediaKind;
            if (currentKind === 'text' || kind === 'text') return;
        }
        const resetSettings = kind !== snapshotRef.current.mediaKind;
        const nextSettings = resetSettings
            ? overlayChatPanels({ ...DEFAULT_CHAT_SETTINGS }, chatPanelsRef.current)
            : snapshotRef.current.settings;
        snapshotRef.current = {
            ...snapshotRef.current,
            mediaKind: kind,
            settings: nextSettings,
            // با تغییر نوع، فایل‌ها/منشن‌های نوع قبلی بی‌معنا می‌شوند
            ...(resetSettings ? { attachments: [] as TemplatePreviewMedia[], mentions: [] as StudioMediaMention[] } : {}),
        };
        setMediaKindState(kind);
        if (resetSettings) {
            setSettings(nextSettings);
            setAttachments([]);
            setMentions([]);
        }
        schedulePersist();
    }, [schedulePersist]);

    const patchSettings = useCallback((patch: Partial<StudioChatSettings>) => {
        const next = { ...snapshotRef.current.settings, ...patch };
        snapshotRef.current = { ...snapshotRef.current, settings: next };
        setSettings(next);
        if (editingMessageIdRef.current) return;
        if (!browserOnline || !apiReachable) return;
        dirtyRef.current = true;
        if (persistTimer.current) {
            window.clearTimeout(persistTimer.current);
            persistTimer.current = null;
        }
        void persist().catch(() => undefined);
    }, [apiReachable, browserOnline, persist]);

    const addAttachments = useCallback((items: TemplatePreviewMedia[]) => {
        if (!items.length) return;
        const current = snapshotRef.current.attachments;
        const additions = items.filter((item) => !current.some((existing) => isSameChatMedia(existing, item)));
        if (!additions.length) return;
        const next = [...current, ...additions];
        snapshotRef.current = { ...snapshotRef.current, attachments: next };
        setAttachments(next);
        schedulePersist();
    }, [schedulePersist]);

    const replaceAttachments = useCallback((items: TemplatePreviewMedia[]) => {
        snapshotRef.current = { ...snapshotRef.current, attachments: items };
        setAttachments(items);
        schedulePersist();
    }, [schedulePersist]);

    const updateAttachment = useCallback((item: TemplatePreviewMedia, patch: Partial<TemplatePreviewMedia>) => {
        const next = snapshotRef.current.attachments.map((entry) =>
            entry === item || isSameChatMedia(entry, item) ? { ...entry, ...patch } : entry);
        snapshotRef.current = { ...snapshotRef.current, attachments: next };
        setAttachments(next);
        schedulePersist();
    }, [schedulePersist]);

    const removeAttachment = useCallback(async (item: TemplatePreviewMedia) => {
        const next = snapshotRef.current.attachments.filter((entry) => entry !== item && !isSameChatMedia(entry, item));
        snapshotRef.current = { ...snapshotRef.current, attachments: next };
        setAttachments(next);
        schedulePersist();
        const fileId = String(item.fileId || '').trim();
        const uploadedHere = item.source !== 'gallery' && item.source !== 'generated';
        const stillInThread = (snapshotRef.current.chat?.messages || []).some((message) =>
            (message.attachments || []).some((attachment) => attachment.fileId && attachment.fileId === fileId),
        );
        if (fileId && uploadedHere && !stillInThread) {
            try {
                await mediaApi.deleteOwnedFile(fileId, String(snapshotRef.current.chat?._id || '') || undefined);
            } catch {
                /* already removed from UI */
            }
        }
    }, [schedulePersist]);

    const addPendingUpload = useCallback((item: PendingUpload) => {
        setPendingUploads((prev) => [...prev, item]);
    }, []);

    const updatePendingUpload = useCallback((id: string, patch: Partial<PendingUpload>) => {
        setPendingUploads((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    }, []);

    const removePendingUpload = useCallback((id: string) => {
        setPendingUploads((prev) => {
            const match = prev.find((item) => item.id === id);
            if (match?.localUrl) URL.revokeObjectURL(match.localUrl);
            return prev.filter((item) => item.id !== id);
        });
    }, []);

    const appendPrompt = useCallback((text: string) => {
        const nextChunk = text.trim();
        if (!nextChunk) return;
        const prev = snapshotRef.current.promptText;
        const next = prev.trim() ? `${prev.trim()}\n${nextChunk}` : nextChunk;
        snapshotRef.current = { ...snapshotRef.current, promptText: next };
        publishPromptState(next);
        schedulePersist();
    }, [publishPromptState, schedulePersist]);

    const processing = hasProcessingMessage(chat);
    const uploading = pendingUploads.some((item) => item.status !== 'failed');
    
    // Validate attachments against model constraints
    const { validation: attachmentValidation } = useChatAttachmentValidation(settings, attachments);
    
    const canSend = connectionOk
        && !sending
        && !retryingMessageId
        && !processing
        && !uploading
        && isSettingsReady(settings)
        && composerBlockers.length === 0
        // متن یا حداقل یک پیوست (تحلیل تصویر بدون متن هم مجاز است)
        && Boolean(hasPrompt || attachments.length)
        && attachmentValidation.valid; // ✅ Block send if attachments violate model constraints

    // No polling and no REST fallback: chat:message events are the only source
    // of turn updates while connected. When the socket (re)connects and a turn
    // is still processing, a single socket-side chat:sync recovers anything
    // that terminated while we were offline.
    const wasRealtimeConnectedRef = useRef(false);
    const checkTurnStatusRef = useRef<() => Promise<void>>(async () => undefined);
    useEffect(() => {
        const wasConnected = wasRealtimeConnectedRef.current;
        wasRealtimeConnectedRef.current = realtimeConnected;
        if (!realtimeConnected || wasConnected) return;
        const current = snapshotRef.current.chat;
        if (!current?._id || !hasProcessingMessage(current)) return;
        void emitChatSync({ chatId: current._id, projectId: injectProjectId || undefined })
            .then((ack) => {
                if (ack?.ok && ack.chat) hydrate(ack.chat, { keepComposer: true });
                // هنوز در حال تولید است؟ وضعیت واقعی job (شاید سرور وسط کار قطع شده باشد)
                if (hasProcessingMessage(snapshotRef.current.chat)) void checkTurnStatusRef.current();
            });
    }, [realtimeConnected, emitChatSync, hydrate, injectProjectId]);

    /**
     * وضعیت واقعی نوبت‌های در حال تولید از سوکت (chat:status). نوبت یتیم را خود سرور تحویل/FAILED
     * می‌کند و نتیجه با chat:message می‌رسد. سوکت قطع باشد هیچ درخواستی زده نمی‌شود.
     */
    const statusInFlightRef = useRef(false);
    const checkTurnStatus = useCallback(async () => {
        const current = snapshotRef.current.chat;
        if (!current?._id || !hasProcessingMessage(current) || statusInFlightRef.current) return;
        statusInFlightRef.current = true;
        lastTurnActivityRef.current = Date.now();
        const pendingIds = (current.messages || [])
            .filter((entry) => entry.role === 'assistant' && entry.status === 'processing' && entry.messageId)
            .map((entry) => String(entry.messageId));
        setTurnStatus((prev) => {
            const next = { ...prev };
            for (const id of pendingIds) {
                next[id] = { progress: prev[id]?.progress ?? null, message: prev[id]?.message || '', state: 'checking' };
            }
            return next;
        });
        try {
            const ack = await emitChatStatus(String(current._id));
            setTurnStatus((prev) => {
                const next = { ...prev };
                for (const id of pendingIds) {
                    const turn = ack?.ok ? ack.turns.find((entry) => entry.messageId === id) : undefined;
                    if (!turn) {
                        next[id] = { progress: prev[id]?.progress ?? null, message: prev[id]?.message || '', state: 'unknown' };
                        continue;
                    }
                    if (turn.state === 'lost' || turn.state === 'recovered') {
                        delete next[id];
                        continue;
                    }
                    next[id] = {
                        state: turn.state,
                        progress: turn.progress ?? prev[id]?.progress ?? null,
                        message: turn.message || prev[id]?.message || '',
                    };
                }
                return next;
            });
        } finally {
            statusInFlightRef.current = false;
        }
    }, [emitChatStatus]);

    useEffect(() => {
        checkTurnStatusRef.current = checkTurnStatus;
    }, [checkTurnStatus]);

    // بررسی وضعیت فقط در این لحظه‌ها (بدون polling):
    // ۱) چت با نوبت در حال تولیدِ قدیمی‌تر از یک دقیقه باز شد (مثلاً رفرش بعد از قطعی سرور) — یک بار برای هر نوبت
    // ۲) سوکت دوباره وصل شد (همراه chat:sync بالا)
    // ۳) نوبت مدت طولانی هیچ رویداد سوکتی نداشت (TURN_SILENCE_CHECK_MS)
    const processingKey = (chat?.messages || [])
        .filter((entry) => entry.role === 'assistant' && entry.status === 'processing')
        .map((entry) => entry.messageId)
        .join(',');
    const checkedTurnsRef = useRef(new Set<string>());
    useEffect(() => {
        if (!realtimeConnected || !processingKey) return;
        const fresh = processingKey.split(',').filter((id) => id && !checkedTurnsRef.current.has(id));
        if (!fresh.length) return;
        const messages = snapshotRef.current.chat?.messages || [];
        const stale = fresh.filter((id) => {
            const createdAt = messages.find((entry) => entry.messageId === id)?.createdAt;
            return createdAt ? Date.now() - new Date(createdAt).getTime() > 60_000 : false;
        });
        fresh.forEach((id) => checkedTurnsRef.current.add(id));
        if (stale.length) void checkTurnStatus();
    }, [processingKey, realtimeConnected, checkTurnStatus]);

    useEffect(() => {
        if (!realtimeConnected || !processingKey) return;
        // شروع شمارش سکوت از همین لحظه (نه از رویدادهای چت قبلی)
        lastTurnActivityRef.current = Date.now();
        let timer = 0;
        const arm = () => {
            const wait = Math.max(5_000, lastTurnActivityRef.current + TURN_SILENCE_CHECK_MS - Date.now());
            timer = window.setTimeout(() => {
                if (Date.now() - lastTurnActivityRef.current >= TURN_SILENCE_CHECK_MS) void checkTurnStatus();
                arm();
            }, wait);
        };
        arm();
        return () => window.clearTimeout(timer);
    }, [processingKey, realtimeConnected, checkTurnStatus]);

    const deleteFailedTurn = useCallback(async (messageId: string) => {
        const current = snapshotRef.current.chat;
        if (!current?._id || !messageId) return;
        const res = await api.deleteFailedTurn(String(current._id), messageId);
        if (res?.chat) hydrate(res.chat, { keepComposer: true });
    }, [api, hydrate]);

    const deleteGeneratedOutput = useCallback(async (messageId: string, url: string) => {
        const current = snapshotRef.current.chat;
        if (!current?._id || !messageId || !url) return null;
        const res = await api.deleteOutput(String(current._id), messageId, url);
        if (res?.chat) hydrate(res.chat, { keepComposer: true });
        return { storageDeleted: Boolean(res?.storageDeleted) };
    }, [api, hydrate]);

    const send = useCallback(async (options?: { quotedUsd?: number | null }) => {
        const snap = snapshotRef.current;
        const quotedUsd = typeof options?.quotedUsd === 'number' && Number.isFinite(options.quotedUsd)
            ? options.quotedUsd
            : undefined;
        if (isGuest) {
            // متن نوشته‌شده بعد از ورود دوباره در کادر چت می‌آید
            if (injectScopeId && snap.promptText.trim()) {
                writeStudioChatInject(injectScopeId, { prompt: snap.promptText }, { notify: false });
            }
            promptGuestLogin();
            return;
        }
        if (!connectionOk) return;
        if (sending || hasProcessingMessage(snap.chat) || pendingUploads.some((item) => item.status === 'uploading')) return;
        if (!isSettingsReady(snap.settings)) return;
        if (composerBlockers.length) return;
        // متن یا پیوست (تحلیل تصویر بدون متن) — API هم همین ترکیب را می‌پذیرد
        if (!snap.promptText.trim() && !snap.attachments.length) return;
        setSending(true);
        try {
            let current = snap.chat;
            if (!current?._id) {
                current = await persist();
            } else if (dirtyRef.current || persistTimer.current) {
                if (persistTimer.current) {
                    window.clearTimeout(persistTimer.current);
                    persistTimer.current = null;
                }
                dirtyRef.current = false;
                current = await persist();
            }
            if (!current?._id) return;
            let next: StudioChat | null = null;
            if (realtimeConnected) {
                const ack = await emitChatSend({
                    chatId: current._id,
                    projectId: injectProjectId || undefined,
                    promptText: snap.promptText,
                    mentionRefs: snap.mentions,
                    ...(quotedUsd != null ? { quotedUsd } : {}),
                });
                if (ack && (!ack.ok || !ack.chat)) {
                    throw new Error(ack.error || 'STUDIO_CHAT_SEND_FAILED');
                }
                next = ack?.chat || null;
            }
            if (!next) {
                next = await api.send(current._id, {
                    promptText: snap.promptText,
                    mentionRefs: snap.mentions,
                    ...(quotedUsd != null ? { quotedUsd } : {}),
                });
            }
            markApiOk();
            snapshotRef.current = {
                ...snapshotRef.current,
                chat: next,
                promptText: '',
                attachments: [],
                mentions: [],
            };
            setChat(next);
            if (promptPublishTimer.current) {
                window.clearTimeout(promptPublishTimer.current);
                promptPublishTimer.current = 0;
            }
            setPromptTextState('');
            setHasPrompt(false);
            setAttachments([]);
            setMentions([]);
            // With the socket up, chat:updated already refreshes the history entry.
            if (!realtimeConnected) bumpHistoryRevision();
        } catch (error) {
            markApiFail();
            notifyError(error);
        } finally {
            setSending(false);
        }
    }, [api, bumpHistoryRevision, composerBlockers, connectionOk, emitChatSend, injectProjectId, injectScopeId, isGuest, markApiFail, markApiOk, persist, pendingUploads, realtimeConnected, sending]);

    const runFailedTurn = useCallback(async (
        assistantMessageId: string,
        mode: 'retry' | 'edit',
    ) => {
        const current = snapshotRef.current.chat;
        if (!current?._id || retryingMessageId || hasProcessingMessage(current)) return;
        // ویرایش پیام (چت متنی) روی نوبت‌های complete هم کار می‌کند؛ retry فقط failed
        const turn = mode === 'edit'
            ? findEditableChatTurn(current.messages || [], assistantMessageId)
            : findFailedChatTurn(current.messages || [], assistantMessageId);
        const assistant = turn?.assistant;
        const userMessage = turn?.user;
        if (!assistant?.messageId || !userMessage?.requestSnapshot) return;

        setRetryingMessageId(assistantMessageId);
        try {
            const requestBody = {
                assistantMessageId,
                clientRequestId: crypto.randomUUID(),
                mode,
                ...(mode === 'edit' ? {
                    promptText: snapshotRef.current.promptText,
                    mentionRefs: snapshotRef.current.mentions,
                    attachments: snapshotRef.current.attachments,
                    mediaKind: snapshotRef.current.mediaKind,
                    settings: snapshotRef.current.settings,
                } : {}),
            };
            let next: StudioChat | null = null;
            if (realtimeConnected) {
                const ack = await emitChatRetry({
                    chatId: current._id,
                    projectId: injectProjectId || undefined,
                    ...requestBody,
                });
                if (ack && (!ack.ok || !ack.chat)) {
                    throw new Error(ack.error || 'STUDIO_CHAT_RETRY_FAILED');
                }
                next = ack?.chat || null;
            }
            if (!next) {
                next = await api.retry(current._id, requestBody);
            }
            if (mode === 'edit') {
                editingMessageIdRef.current = null;
                setEditingMessageId(null);
                hydrate(next);
            } else {
                hydrate(next, { keepComposer: true });
            }
        } catch (error) {
            notifyError(error);
            try {
                const next = await api.get(current._id);
                hydrate(next, { keepComposer: true });
            } catch {
                /* preserve the failed turn and edit draft */
            }
        } finally {
            setRetryingMessageId(null);
        }
    }, [api, emitChatRetry, hydrate, injectProjectId, realtimeConnected, retryingMessageId]);

    const retryFailedTurn = useCallback(async (assistantMessageId: string) => {
        await runFailedTurn(assistantMessageId, 'retry');
    }, [runFailedTurn]);

    const beginTurnEdit = useCallback((assistantMessageId: string, requireFailed: boolean, excludeUrls: string[] = []) => {
        if (retryingMessageId) return;
        const current = snapshotRef.current.chat;
        const turn = requireFailed
            ? findFailedChatTurn(current?.messages || [], assistantMessageId)
            : findEditableChatTurn(current?.messages || [], assistantMessageId);
        const userMessage = turn?.user;
        if (!userMessage?.requestSnapshot) return;
        if (persistTimer.current) {
            window.clearTimeout(persistTimer.current);
            persistTimer.current = null;
        }
        dirtyRef.current = false;
        setPendingUploads((items) => {
            items.forEach((item) => {
                if (item.localUrl) URL.revokeObjectURL(item.localUrl);
            });
            return [];
        });
        const editState = {
            promptText: userMessage.requestSnapshot.promptText || userMessage.content || '',
            attachments: (userMessage.requestSnapshot.attachments || [])
                .filter((item) => !excludeUrls.includes(String(item.url || ''))),
            mentions: [...(userMessage.requestSnapshot.mentionRefs || userMessage.mentionRefs || [])],
            mediaKind: userMessage.requestSnapshot.mediaKind,
            settings: overlayChatPanels({
                ...DEFAULT_CHAT_SETTINGS,
                ...userMessage.requestSnapshot.settings,
            }, chatPanelsRef.current),
        };
        editingMessageIdRef.current = assistantMessageId;
        setEditingMessageId(assistantMessageId);
        snapshotRef.current = { ...snapshotRef.current, ...editState };
        setPromptTextState(editState.promptText);
        setHasPrompt(Boolean(editState.promptText.trim()));
        setAttachments(editState.attachments);
        setMentions(editState.mentions);
        setMediaKindState(editState.mediaKind);
        setSettings(editState.settings);
    }, [retryingMessageId]);

    const startEditFailedTurn = useCallback((assistantMessageId: string, options?: { excludeUrls?: string[] }) => {
        beginTurnEdit(assistantMessageId, true, options?.excludeUrls || []);
    }, [beginTurnEdit]);

    /** ویرایش پیام کاربر در چت متنی — نوبت‌های کامل هم قابل ویرایش‌اند */
    const startEditTurn = useCallback((assistantMessageId: string) => {
        if (snapshotRef.current.chat?.mediaKind !== 'text') return;
        beginTurnEdit(assistantMessageId, false);
    }, [beginTurnEdit]);

    const cancelEdit = useCallback(() => {
        if (retryingMessageId) return;
        editingMessageIdRef.current = null;
        setEditingMessageId(null);
        const current = snapshotRef.current.chat;
        const cleared = {
            promptText: '',
            attachments: [] as TemplatePreviewMedia[],
            mentions: [] as StudioMediaMention[],
            mediaKind: (current?.mediaKind || snapshotRef.current.mediaKind) as StudioChatMediaKind,
            settings: overlayChatPanels({
                ...DEFAULT_CHAT_SETTINGS,
                ...(current?.settings || snapshotRef.current.settings),
            }, chatPanelsRef.current),
        };
        snapshotRef.current = { ...snapshotRef.current, ...cleared };
        if (promptPublishTimer.current) {
            window.clearTimeout(promptPublishTimer.current);
            promptPublishTimer.current = 0;
        }
        setPromptTextState('');
        setHasPrompt(false);
        setAttachments([]);
        setMentions([]);
        setMediaKindState(cleared.mediaKind);
        setSettings(cleared.settings);
        if (current?._id) {
            void api.patch(current._id, {
                promptText: '',
                attachments: [],
                mentionRefs: [],
            }).then((next) => hydrate(next, { keepComposer: true })).catch(() => undefined);
        }
    }, [api, hydrate, retryingMessageId]);

    const submitEditedTurn = useCallback(async () => {
        const snap = snapshotRef.current;
        if (!editingMessageId || !snap.promptText.trim()) return;
        if (!isSettingsReady(snap.settings)) return;
        await runFailedTurn(editingMessageId, 'edit');
    }, [editingMessageId, runFailedTurn]);

    const selectChat = useCallback(async (chatId: string) => {
        if (!chatId) return;
        if (snapshotRef.current.chat?._id === chatId) return;
        if (!browserOnline || !apiReachable) {
            notifyError(new Error('Connection lost'));
            return;
        }
        selectAbortRef.current?.abort();
        const controller = new AbortController();
        selectAbortRef.current = controller;
        await flushPersist().catch(() => undefined);
        if (controller.signal.aborted) return;
        try {
            const next = await api.get(chatId);
            if (controller.signal.aborted) return;
            markApiOk();
            dirtyRef.current = false;
            hydrate(next);
        } catch (error) {
            if (controller.signal.aborted) return;
            markApiFail();
            notifyError(error);
        }
    }, [api, apiReachable, browserOnline, flushPersist, hydrate, markApiFail, markApiOk]);

    const newChat = useCallback(async () => {
        if (!connectionOk) {
            notifyError(new Error('Connection lost'));
            return;
        }
        await flushPersist().catch(() => undefined);
        try {
            // "New chat" always lands on the latest draft (backend keeps it intact)
            // so an image-only or half-written draft is never lost.
            const draft = await api.create({});
            markApiOk();
            dirtyRef.current = false;
            if (persistTimer.current) {
                window.clearTimeout(persistTimer.current);
                persistTimer.current = null;
            }
            if (!draft?._id) writeLastOpenChat(injectScopeId, '');
            hydrate(draft ?? null);
            if (draft?._id) bumpHistoryRevision();
        } catch (error) {
            markApiFail();
            notifyError(error);
        }
    }, [api, bumpHistoryRevision, connectionOk, flushPersist, hydrate, injectScopeId, markApiFail, markApiOk]);

    const deleteChat = useCallback(async (chatId: string) => {
        if (!chatId) return;
        if (!connectionOk) {
            notifyError(new Error('Connection lost'));
            return;
        }
        deletingIds.current.add(chatId);
        dirtyRef.current = false;
        if (persistTimer.current) {
            window.clearTimeout(persistTimer.current);
            persistTimer.current = null;
        }
        try {
            await api.remove(chatId);
            markApiOk();
            forgetLastOpenChat(chatId);
            if (snapshotRef.current.chat?._id === chatId) {
                hydrate(null);
            }
            bumpHistoryRevision();
        } catch (error) {
            markApiFail();
            notifyError(error);
            throw error;
        } finally {
            deletingIds.current.delete(chatId);
        }
    }, [api, bumpHistoryRevision, connectionOk, forgetLastOpenChat, hydrate, markApiFail, markApiOk]);

    const hasTranscript = Boolean(chat?.messages?.length);

    const value = useMemo<ChatSessionValue>(() => ({
        scope: resolvedScope,
        projectId: injectProjectId,
        loading,
        connectionOk,
        realtimeConnected,
        historyRevision,
        chat,
        promptText,
        attachments,
        mentions,
        pendingUploads,
        mediaKind,
        settings,
        hasTranscript,
        hasPrompt,
        canSend,
        isGuest,
        composerBlockers,
        setComposerBlockers,
        processing,
        liveLogs,
        turnStatus,
        checkTurnStatus,
        deleteGeneratedOutput,
        deleteFailedTurn,
        setPromptText,
        setPromptDocument,
        setMediaKind,
        patchSettings,
        addAttachments,
        replaceAttachments,
        updateAttachment,
        removeAttachment,
        addPendingUpload,
        updatePendingUpload,
        removePendingUpload,
        appendPrompt,
        readComposerText,
        send,
        sending,
        retryingMessageId,
        editingMessageId,
        retryFailedTurn,
        startEditFailedTurn,
        startEditTurn,
        cancelEdit,
        submitEditedTurn,
        selectChat,
        newChat,
        deleteChat,
        registerProviderLogListener,
        registerHistoryListener,
    }), [
        resolvedScope,
        injectProjectId,
        loading,
        connectionOk,
        realtimeConnected,
        historyRevision,
        chat,
        promptText,
        attachments,
        mentions,
        pendingUploads,
        mediaKind,
        settings,
        hasTranscript,
        hasPrompt,
        canSend,
        isGuest,
        composerBlockers,
        setComposerBlockers,
        processing,
        liveLogs,
        turnStatus,
        checkTurnStatus,
        deleteGeneratedOutput,
        deleteFailedTurn,
        setPromptText,
        setPromptDocument,
        setMediaKind,
        patchSettings,
        addAttachments,
        replaceAttachments,
        updateAttachment,
        removeAttachment,
        addPendingUpload,
        updatePendingUpload,
        removePendingUpload,
        appendPrompt,
        readComposerText,
        send,
        sending,
        retryingMessageId,
        editingMessageId,
        retryFailedTurn,
        startEditFailedTurn,
        startEditTurn,
        cancelEdit,
        submitEditedTurn,
        selectChat,
        newChat,
        deleteChat,
        registerProviderLogListener,
        registerHistoryListener,
    ]);

    return (
        <ChatSessionContext.Provider value={value}>
            {children}
        </ChatSessionContext.Provider>
    );
}
