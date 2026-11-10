import type { ChatEntry } from './ChatPanel';

// ────────────────────────────── Types ──────────────────────────────

/** یک گفتگوی ذخیره‌شده برای پروژه‌ی فعال — تاریخچه‌ی چت سمت کلاینت نگه داشته می‌شود */
export interface ChatSession {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
    entries: ChatEntry[];
}

// ────────────────────────────── Consts ──────────────────────────────

const KEY_PREFIX = 'ads2.chatHistory.v1.';
const MAX_SESSIONS_PER_PROJECT = 30;
const MAX_ENTRIES_PER_SESSION = 200;
const TITLE_MAX_LENGTH = 64;

// ────────────────────────────── Helpers ──────────────────────────────

function storageKey(projectId: string): string {
    // شناسه‌ی Mongo — فقط نویسه‌های امن کلید؛ محافظت در برابر ورودی غیرمنتظره
    return KEY_PREFIX + String(projectId).replace(/[^a-zA-Z0-9_-]/g, '');
}

/** تیتر گفتگو از اولین پیام کاربر — در نبودش برچسب تاریخ */
function deriveTitle(entries: ChatEntry[]): string {
    const firstUser = entries.find((entry) => entry.role === 'user');
    const text = (firstUser?.text || '').replace(/\s+/g, ' ').trim();
    if (text) return text.length > TITLE_MAX_LENGTH ? `${text.slice(0, TITLE_MAX_LENGTH)}…` : text;
    return '';
}

function parseSessions(raw: string | null): ChatSession[] {
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((item): item is ChatSession => {
            const session = item as ChatSession;
            return Boolean(
                session
                && typeof session.id === 'string'
                && typeof session.updatedAt === 'string'
                && Array.isArray(session.entries),
            );
        });
    } catch {
        return [];
    }
}

function persist(projectId: string, sessions: ChatSession[]): ChatSession[] {
    const trimmed = sessions
        .slice()
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, MAX_SESSIONS_PER_PROJECT);
    try {
        window.localStorage.setItem(storageKey(projectId), JSON.stringify(trimmed));
        return trimmed;
    } catch {
        // پر شدن سهمیه — از قدیمی‌ترین‌ها می‌سازیم تا آخرین گفتگوها همیشه بمانند
        for (let drop = 1; drop < trimmed.length; drop += 1) {
            try {
                window.localStorage.setItem(storageKey(projectId), JSON.stringify(trimmed.slice(0, trimmed.length - drop)));
                return trimmed.slice(0, trimmed.length - drop);
            } catch {
                // تلاش بعدی
            }
        }
        return trimmed;
    }
}

// ────────────────────────────── API ──────────────────────────────

/** گفتگوهای ذخیره‌شده‌ی پروژه — تازه‌ترین اول */
export function listChatSessions(projectId: string | null | undefined): ChatSession[] {
    if (!projectId || typeof window === 'undefined') return [];
    return parseSessions(window.localStorage.getItem(storageKey(projectId)));
}

/**
 * به‌روزرسانی/ساخت گفتگوی جاری — آیتم‌های entry محدود می‌شوند و تیتر فقط برای
 * گفتگوی بی‌نام از اولین پیام کاربر ساخته می‌شود. شناسه‌ی مؤثر برمی‌گردد
 * (null = ذخیره ممکن نشد) تا caller همگام بماند.
 */
export function saveChatSession(
    projectId: string,
    sessionId: string | null,
    entries: ChatEntry[],
): ChatSession | null {
    if (typeof window === 'undefined' || !entries.length) return null;
    const now = new Date().toISOString();
    const safeEntries = entries.slice(-MAX_ENTRIES_PER_SESSION);
    const existing = parseSessions(window.localStorage.getItem(storageKey(projectId)));
    const current = sessionId ? existing.find((session) => session.id === sessionId) : undefined;
    const session: ChatSession = {
        id: current?.id || `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: current?.title || deriveTitle(entries),
        createdAt: current?.createdAt || now,
        updatedAt: now,
        entries: safeEntries,
    };
    const merged = [session, ...existing.filter((item) => item.id !== session.id)];
    persist(projectId, merged);
    return session;
}

/** حذف یک گفتگو — لیست به‌روزشده برمی‌گردد */
export function deleteChatSession(projectId: string, sessionId: string): ChatSession[] {
    if (typeof window === 'undefined') return [];
    const remaining = parseSessions(window.localStorage.getItem(storageKey(projectId)))
        .filter((session) => session.id !== sessionId);
    return persist(projectId, remaining);
}
