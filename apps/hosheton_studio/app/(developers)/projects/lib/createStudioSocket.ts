'use client';

import io, { Socket } from 'socket.io-client';

/**
 * Single source of truth for the studio realtime connection.
 *
 * Chat (`useChatRealtime`), the media workflow (`useMediaStudioSocket`),
 * comments (`useCommentsRealtime`) and the wallet balance listener
 * (`useWalletRealtime`) all share ONE socket through `acquireStudioSocket`.
 * Each feature only registers its own event listeners and joins the rooms
 * it needs — the manager owns the connection lifecycle:
 *
 * - one socket per auth token per tab (auth + namespace stay consistent);
 * - ref-counted acquire/release: the socket disconnects only when the last
 *   consumer unmounts (with a grace window so route changes don't reconnect);
 * - ref-counted room membership with automatic re-join after reconnect.
 */

export const MEDIA_STUDIO_NAMESPACE = '/media-studio';

export type StudioRoomKind = 'project' | 'chat';

const RELEASE_GRACE_MS = 5_000;

interface SocketEntry {
    socket: Socket;
    /** kind → room id → consumer count */
    rooms: Map<StudioRoomKind, Map<string, number>>;
    releaseTimer?: ReturnType<typeof setTimeout>;
}

const entries = new Map<string, SocketEntry>();

function roomEventName(kind: StudioRoomKind, join: boolean): string {
    if (kind === 'project') return join ? 'join-project' : 'leave-project';
    return join ? 'join-chat' : 'leave-chat';
}

function roomEventPayload(kind: StudioRoomKind, id: string): Record<string, string> {
    return kind === 'project' ? { projectId: id } : { chatId: id };
}

function emitRoomJoin(entry: SocketEntry, kind: StudioRoomKind, id: string): void {
    if (!entry.socket.connected) return;
    entry.socket.emit(roomEventName(kind, true), roomEventPayload(kind, id));
}

function replayActiveRooms(entry: SocketEntry): void {
    for (const [kind, rooms] of entry.rooms) {
        for (const [id, count] of rooms) {
            if (count > 0) emitRoomJoin(entry, kind, id);
        }
    }
}

function disposeEntry(token: string, entry: SocketEntry): void {
    if (entry.releaseTimer) clearTimeout(entry.releaseTimer);
    entries.delete(token);
    entry.socket.disconnect();
}

export interface StudioSocketHandle {
    socket: Socket;
    /** Joins (or bumps the ref-count of) a room; re-joined automatically on reconnect. */
    joinRoom(kind: StudioRoomKind, id: string): void;
    /** Drops one consumer's membership; emits leave only when the last consumer leaves. */
    leaveRoom(kind: StudioRoomKind, id: string): void;
    /** Releases the connection; actual disconnect happens after a grace period. */
    release(): void;
}

/**
 * socket.io-client treats the URL pathname as the NAMESPACE and always
 * handshakes at the engine path (`/socket.io` by default). NEXT_PUBLIC_API_URL
 * may carry a reverse-proxy prefix (`https://api.hosheton.com/studio`) — if it
 * leaked into the URL, the client would request namespace `/studio/media-studio`
 * and bypass the proxy prefix on the handshake, so the socket could never
 * connect. Split the origin from the base path: namespace stays
 * `/media-studio`, and the proxy prefix moves into the `path` option
 * (`/studio/socket.io` in production, plain `/socket.io` in dev).
 */
function resolveSocketEndpoint(): { origin: string; path: string } {
    const raw = String(process.env.NEXT_PUBLIC_API_URL || '').trim().replace(/\/+$/, '');
    try {
        const parsed = new URL(raw);
        const basePath = parsed.pathname.replace(/\/+$/, '');
        return {
            origin: `${parsed.protocol}//${parsed.host}`,
            path: `${basePath}/socket.io`,
        };
    } catch {
        return { origin: raw, path: '/socket.io' };
    }
}

export function acquireStudioSocket(token: string | undefined | null): StudioSocketHandle | null {
    const trimmed = String(token || '').trim();
    if (!trimmed || typeof window === 'undefined') return null;

    let entry = entries.get(trimmed);
    if (entry) {
        if (entry.releaseTimer) {
            clearTimeout(entry.releaseTimer);
            entry.releaseTimer = undefined;
        }
    } else {
        const endpoint = resolveSocketEndpoint();
        // Polling first, then upgrade: the CDN in front of the API (ParsPack)
        // can break the WebSocket handshake (e.g. 101 without `Upgrade`), and a
        // websocket-only client then never connects — chat results never arrive.
        // Long-polling always works through the CDN; the upgrade to websocket
        // happens transparently whenever the edge allows it.
        const socket = io(`${endpoint.origin}${MEDIA_STUDIO_NAMESPACE}`, {
            auth: { token: trimmed },
            transports: ['polling', 'websocket'],
            path: endpoint.path,
        });
        entry = { socket, rooms: new Map() };
        socket.on('connect', () => replayActiveRooms(entry as SocketEntry));
        entries.set(trimmed, entry);
    }

    const acquired = entry;
    return {
        socket: acquired.socket,
        joinRoom(kind, id) {
            const cleanId = String(id || '').trim();
            if (!cleanId) return;
            let rooms = acquired.rooms.get(kind);
            if (!rooms) {
                rooms = new Map();
                acquired.rooms.set(kind, rooms);
            }
            const next = (rooms.get(cleanId) || 0) + 1;
            rooms.set(cleanId, next);
            if (next === 1) emitRoomJoin(acquired, kind, cleanId);
        },
        leaveRoom(kind, id) {
            const cleanId = String(id || '').trim();
            if (!cleanId) return;
            const rooms = acquired.rooms.get(kind);
            const count = rooms?.get(cleanId) || 0;
            if (!rooms || count <= 0) return;
            if (count <= 1) {
                rooms.delete(cleanId);
                if (acquired.socket.connected) {
                    acquired.socket.emit(roomEventName(kind, false), roomEventPayload(kind, cleanId));
                }
            } else {
                rooms.set(cleanId, count - 1);
            }
        },
        release() {
            const stillOpen = [...acquired.rooms.values()].some((rooms) => rooms.size > 0);
            if (!stillOpen && !acquired.releaseTimer) {
                acquired.releaseTimer = setTimeout(() => disposeEntry(trimmed, acquired), RELEASE_GRACE_MS);
            }
        },
    };
}

export type { Socket };
