import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { acquireStudioSocket, type StudioSocketHandle } from '../lib/createStudioSocket';
import type {
    MediaJobLog,
    MediaRun,
    StudioChat,
    StudioChatListItem,
    StudioChatMessage,
    StudioMediaMention,
    TemplatePreviewMedia,
    StudioChatMediaKind,
    StudioChatSettings,
} from '../types/media-api';
import type { AiProviderLog } from '../types/developer-api';
import { publishRunLifecycle } from '../lib/run-lifecycle-events';

function normalizeRunStatus(status?: string): MediaRun['status'] | undefined {
    if (
        status === 'PENDING'
        || status === 'RUNNING'
        || status === 'COMPLETED'
        || status === 'FAILED'
        || status === 'CANCELLED'
    ) {
        return status;
    }
    return undefined;
}

export type ChatRealtimeMessageEvent = {
    chatId: string;
    projectId?: string;
    userId?: string;
    message: StudioChatMessage;
};

export type ChatRealtimeUpdatedEvent = {
    chatId: string;
    projectId?: string;
    userId?: string;
    chat: StudioChatListItem;
};

export type ChatRealtimeMessagesRemovedEvent = {
    chatId: string;
    userId?: string;
    messageIds: string[];
};

export type ChatRealtimeDeletedEvent = {
    chatId: string;
    userId?: string;
};

/** وضعیت واقعی یک نوبت در حال تولید — پاسخ chat:status (job صف + آخرین لاگ) */
export type ChatTurnStatus = {
    messageId: string;
    runId: string;
    /** recovered/lost: سرور نوبت یتیم را همان لحظه تحویل/FAILED کرد (chat:message هم می‌آید) */
    state: 'queued' | 'running' | 'unknown' | 'recovered' | 'lost';
    progress: number | null;
    message: string;
    startedAt: string | null;
    lastActivityAt: string | null;
};

export type ChatStatusAck = {
    ok: boolean;
    error?: string;
    turns: ChatTurnStatus[];
};

export type ChatNodeProgressEvent = {
    runId: string;
    nodeId?: string;
    progress: number;
    status?: string;
    estimated?: boolean;
};

export type ChatTurnAck = {
    ok: boolean;
    chat?: StudioChat;
    error?: string;
};

type ChatSendPayload = {
    chatId: string;
    projectId?: string;
    promptText: string;
    mentionRefs?: StudioMediaMention[];
    /** Price the user confirmed — the server charges exactly this. */
    quotedUsd?: number;
};

type ChatRetryPayload = {
    chatId: string;
    projectId?: string;
    assistantMessageId: string;
    clientRequestId: string;
    mode: 'retry' | 'edit';
    promptText?: string;
    mentionRefs?: StudioMediaMention[];
    attachments?: TemplatePreviewMedia[];
    mediaKind?: StudioChatMediaKind;
    settings?: StudioChatSettings;
};

type ChatRealtimeOptions = {
    onChatMessage?: (event: ChatRealtimeMessageEvent) => void;
    onChatUpdated?: (event: ChatRealtimeUpdatedEvent) => void;
    onChatDeleted?: (event: ChatRealtimeDeletedEvent) => void;
    /** پیام‌هایی که از گفتگو حذف شدند (نوبت ناموفق) — همه تب‌های باز همان‌ها را برمی‌دارند */
    onChatMessagesRemoved?: (event: ChatRealtimeMessagesRemovedEvent) => void;
    onJobLog?: (log: MediaJobLog) => void;
    onRunTerminal?: (event: {
        runId: string;
        status: MediaRun['status'];
        error?: string;
        /** Chat the failed run belongs to (present on chat-generation runs). */
        chatId?: string;
    }) => void;
    onProviderLog?: (event: {
        action: 'created' | 'updated';
        log: AiProviderLog;
    }) => void;
    onConnectionChange?: (connected: boolean) => void;
    /** درصد پیشرفت provider (fal/Atlas/Seedance) — همان رویداد node:progress بوم */
    onNodeProgress?: (event: ChatNodeProgressEvent) => void;
};

const CHAT_TURN_ACK_TIMEOUT = 20_000;

/** Moves this consumer's registered rooms to the wanted ones (undefined = leave). */
function syncRooms(
    handle: StudioSocketHandle,
    joinedRef: { current: { projectId?: string; chatId?: string } },
    projectId: string | undefined,
    chatId: string | undefined,
) {
    const joined = joinedRef.current;
    if (joined.chatId !== chatId) {
        if (joined.chatId) handle.leaveRoom('chat', joined.chatId);
        if (chatId) handle.joinRoom('chat', chatId);
    }
    if (joined.projectId !== projectId) {
        if (joined.projectId) handle.leaveRoom('project', joined.projectId);
        if (projectId) handle.joinRoom('project', projectId);
    }
    joinedRef.current = { projectId, chatId };
}

/**
 * Realtime channel for the studio chat. The connection lives exactly as long
 * as the calling chat surface (ChatSessionProvider) is mounted — joining the
 * project room and the active chat room, then disconnecting on unmount.
 */
export function useChatRealtime(
    projectId: string | undefined,
    activeChatId: string | undefined,
    options?: ChatRealtimeOptions,
) {
    const token = useAuthStore((s) => s.token);
    const optionsRef = useRef(options);
    const projectIdRef = useRef(projectId);
    const activeChatIdRef = useRef(activeChatId);
    /** Rooms this consumer has registered with the shared handle (independent of connection state). */
    const joinedRef = useRef<{ projectId?: string; chatId?: string }>({});
    const handleRef = useRef<StudioSocketHandle | null>(null);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        optionsRef.current = options;
    }, [options]);
    useEffect(() => {
        projectIdRef.current = projectId;
    }, [projectId]);
    useEffect(() => {
        activeChatIdRef.current = activeChatId;
    }, [activeChatId]);

    useEffect(() => {
        if (!token) {
            optionsRef.current?.onConnectionChange?.(false);
            return;
        }

        // Shared studio socket — chat, project canvas, comments and the wallet
        // listener all multiplex this single connection.
        const handle = acquireStudioSocket(token);
        if (!handle) return;
        handleRef.current = handle;
        const socket: Socket = handle.socket;

        const setConnectedState = (value: boolean) => {
            setConnected(value);
            optionsRef.current?.onConnectionChange?.(value);
        };

        // Membership is registered once per room; the socket manager replays it on
        // every reconnect, so connect events must not join again (ref-counts would drift).
        syncRooms(handle, joinedRef, projectIdRef.current, activeChatIdRef.current);

        const onConnect = () => setConnectedState(true);
        const onDisconnect = () => setConnectedState(false);
        const onConnectError = () => setConnectedState(false);

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('connect_error', onConnectError);

        if (socket.connected) setConnectedState(true);

        const publish = (payload: {
            runId?: string;
            projectId?: string;
            chatId?: string;
            status?: string;
            error?: string;
            executionOrder?: string[];
            nodeResults?: Record<string, unknown>;
            finalOutput?: Record<string, unknown>;
        }) => {
            const status = normalizeRunStatus(payload.status);
            if (!status || !payload.runId) return;
            publishRunLifecycle({
                projectId: payload.projectId || projectIdRef.current || '',
                runId: payload.runId,
                status,
                errorMessage: payload.error,
                executionOrder: payload.executionOrder,
                nodeResults: payload.nodeResults,
                finalOutput: payload.finalOutput,
            });
            if (status === 'COMPLETED' || status === 'FAILED' || status === 'CANCELLED') {
                optionsRef.current?.onRunTerminal?.({
                    runId: payload.runId,
                    status,
                    error: payload.error,
                    chatId: payload.chatId,
                });
            }
        };

        const onJobLog = (payload: MediaJobLog) => {
            optionsRef.current?.onJobLog?.(payload);
        };
        const onProviderLog = (payload: {
            action: 'created' | 'updated';
            log: AiProviderLog;
        }) => {
            optionsRef.current?.onProviderLog?.(payload);
        };
        const onChatMessage = (payload: ChatRealtimeMessageEvent) => {
            optionsRef.current?.onChatMessage?.(payload);
        };
        const onChatUpdated = (payload: ChatRealtimeUpdatedEvent) => {
            optionsRef.current?.onChatUpdated?.(payload);
        };
        const onChatDeleted = (payload: ChatRealtimeDeletedEvent) => {
            optionsRef.current?.onChatDeleted?.(payload);
        };
        const onChatMessagesRemoved = (payload: ChatRealtimeMessagesRemovedEvent) => {
            if (payload?.chatId && payload.messageIds?.length) optionsRef.current?.onChatMessagesRemoved?.(payload);
        };
        const onNodeProgress = (payload: ChatNodeProgressEvent) => {
            if (payload?.runId) optionsRef.current?.onNodeProgress?.(payload);
        };

        socket.on('run:status', publish);
        socket.on('run:complete', publish);
        socket.on('job:log', onJobLog);
        socket.on('developer:provider-log', onProviderLog);
        socket.on('chat:message', onChatMessage);
        socket.on('chat:updated', onChatUpdated);
        socket.on('chat:deleted', onChatDeleted);
        socket.on('node:progress', onNodeProgress);
        socket.on('chat:messages-removed', onChatMessagesRemoved);

        return () => {
            // The socket is shared and survives this unmount (ref-counted grace
            // window) — listeners left attached here would stack up on every
            // remount and deliver the same event to stale handlers.
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('connect_error', onConnectError);
            socket.off('run:status', publish);
            socket.off('run:complete', publish);
            socket.off('job:log', onJobLog);
            socket.off('developer:provider-log', onProviderLog);
            socket.off('chat:message', onChatMessage);
            socket.off('chat:updated', onChatUpdated);
            socket.off('chat:deleted', onChatDeleted);
            socket.off('node:progress', onNodeProgress);
            socket.off('chat:messages-removed', onChatMessagesRemoved);
            setConnectedState(false);
            syncRooms(handle, joinedRef, undefined, undefined);
            handle.release();
            handleRef.current = null;
        };
    }, [token]);

    // Keep room membership in sync when the visible chat/project changes
    // without tearing the connection down.
    useEffect(() => {
        const handle = handleRef.current;
        if (handle) syncRooms(handle, joinedRef, projectId, activeChatId);
    }, [projectId, activeChatId]);

    /**
     * Resolves `null` only when the socket is not usable so the caller can
     * fall back to REST. Once the event is dispatched the promise always
     * settles with the server ack (never falls back — that would double-send).
     */
    const emitChatTurn = useCallback((
        event: 'chat:send' | 'chat:retry' | 'chat:sync',
        payload: ChatSendPayload | ChatRetryPayload | { chatId: string; projectId?: string },
    ): Promise<ChatTurnAck | null> => {
        const socket = handleRef.current?.socket;
        if (!socket || !socket.connected) return Promise.resolve(null);
        return new Promise((resolve) => {
            let settled = false;
            const timer = window.setTimeout(() => {
                if (settled) return;
                settled = true;
                resolve({ ok: false, error: 'REALTIME_TIMEOUT' });
            }, CHAT_TURN_ACK_TIMEOUT);
            socket.emit(event, payload, (response?: ChatTurnAck) => {
                if (settled) return;
                settled = true;
                window.clearTimeout(timer);
                resolve(response || { ok: false, error: 'REALTIME_BAD_ACK' });
            });
        });
    }, []);

    const emitChatSend = useCallback((payload: ChatSendPayload) => (
        emitChatTurn('chat:send', payload)
    ), [emitChatTurn]);

    const emitChatRetry = useCallback((payload: ChatRetryPayload) => (
        emitChatTurn('chat:retry', payload)
    ), [emitChatTurn]);

    /**
     * Catch-up over the socket (never REST): asks the server for the current
     * chat so a turn that terminated while the client was disconnected is
     * recovered through the same realtime channel.
     */
    const emitChatSync = useCallback((payload: { chatId: string; projectId?: string }) => (
        emitChatTurn('chat:sync', payload)
    ), [emitChatTurn]);

    /**
     * وضعیت واقعی نوبت‌های در حال تولید از روی سرور (فقط سوکت، فقط وقتی صدا زده شود — نه polling).
     * سوکت قطع باشد null برمی‌گردد و درخواستی زده نمی‌شود.
     */
    const emitChatStatus = useCallback((chatId: string): Promise<ChatStatusAck | null> => {
        const socket = handleRef.current?.socket;
        if (!socket || !socket.connected || !chatId) return Promise.resolve(null);
        return new Promise((resolve) => {
            let settled = false;
            const timer = window.setTimeout(() => {
                if (settled) return;
                settled = true;
                resolve(null);
            }, CHAT_TURN_ACK_TIMEOUT);
            socket.emit('chat:status', { chatId }, (response?: ChatStatusAck) => {
                if (settled) return;
                settled = true;
                window.clearTimeout(timer);
                resolve(response || null);
            });
        });
    }, []);

    return { connected, emitChatSend, emitChatRetry, emitChatSync, emitChatStatus };
}
