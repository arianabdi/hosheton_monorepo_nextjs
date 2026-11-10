'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { acquireStudioSocket } from '../lib/createStudioSocket';
import type { MediaComment } from '../types/media-api';

/**
 * Realtime comments over the shared media-studio socket.
 * Backed by `comment:new` / `comment:deleted` gateway events; the REST
 * load in CommentsPanel stays the initial source of truth and both
 * sources merge through the same `_id`-deduped upsert.
 */
export function useCommentsRealtime(
    projectId: string,
    handlers: {
        onCommentNew: (comment: MediaComment) => void;
        onCommentDeleted: (commentId: string) => void;
        /** Fired after a (re)connect — catch up on messages missed while offline. */
        onReconnect?: () => void;
    },
) {
    const token = useAuthStore((s) => s.token);

    useEffect(() => {
        if (!projectId || !token) return;
        const handle = acquireStudioSocket(token);
        if (!handle) return;
        const socket = handle.socket;

        handle.joinRoom('project', projectId);

        const onCommentNew = (payload: { projectId?: string; comment?: MediaComment }) => {
            if (payload?.projectId !== projectId || !payload.comment) return;
            handlers.onCommentNew(payload.comment);
        };
        const onCommentDeleted = (payload: { projectId?: string; commentId?: string }) => {
            if (payload?.projectId !== projectId || !payload.commentId) return;
            handlers.onCommentDeleted(payload.commentId);
        };
        const onConnect = () => handlers.onReconnect?.();

        socket.on('comment:new', onCommentNew);
        socket.on('comment:deleted', onCommentDeleted);
        socket.on('connect', onConnect);

        return () => {
            // The socket itself is shared/ref-counted — leaving the listeners
            // attached would make every remount handle the same event twice.
            socket.off('comment:new', onCommentNew);
            socket.off('comment:deleted', onCommentDeleted);
            socket.off('connect', onConnect);
            handle.leaveRoom('project', projectId);
            handle.release();
        };
        // handlers are stable-enough callables from setState wrappers
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId, token]);
}
