import { create } from 'zustand';
import type { TemplatePreviewMedia } from '@/app/(developers)/projects/types/media-api';
import type { MarketplacePreviewMedia } from '@/app/(marketplace)/lib/types';
import type { StudioMediaRef } from '@/app/(developers)/projects/lib/studio-media';

export const PERSONAL_CHAT_INJECT_KEY = 'personal';

export type StudioChatInjectPayload = {
    prompt?: string;
    attachments?: TemplatePreviewMedia[];
};

export type StudioCanvasInsert =
    | { kind: 'prompt'; promptText: string }
    | { kind: 'assetRef'; media: MarketplacePreviewMedia }
    /** یک یا چند فایل (مثلاً از گالری) — همه، با هر نوع رسانه، در یک نود reference */
    | { kind: 'assetRefs'; items: StudioMediaRef[] };

const injectKey = (projectId: string) => `studio-chat-inject:${projectId}`;

/** `notify: false` فقط ذخیره می‌کند (مثلاً متن مهمان تا بعد از ورود)؛ چت باز آن را همین حالا مصرف نمی‌کند */
export function writeStudioChatInject(projectId: string, payload: StudioChatInjectPayload, options?: { notify?: boolean }) {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(injectKey(projectId), JSON.stringify(payload));
    if (options?.notify === false) return;
    window.dispatchEvent(new CustomEvent('studio-chat-inject', { detail: { projectId } }));
}

export function readStudioChatInject(projectId: string): StudioChatInjectPayload | null {
    if (typeof window === 'undefined') return null;
    const raw = sessionStorage.getItem(injectKey(projectId));
    if (!raw) return null;
    try {
        return JSON.parse(raw) as StudioChatInjectPayload;
    } catch {
        return null;
    }
}

export function clearStudioChatInject(projectId: string) {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(injectKey(projectId));
}

type StudioExploreStore = {
    open: boolean;
    setOpen: (open: boolean) => void;
    toggle: () => void;
    pendingCanvasInsert: StudioCanvasInsert | null;
    queueCanvasInsert: (insert: StudioCanvasInsert) => void;
    clearCanvasInsert: () => void;
    reset: () => void;
};

export const useStudioExploreStore = create<StudioExploreStore>((set) => ({
    open: false,
    setOpen: (open) => set({ open }),
    toggle: () => set((state) => ({ open: !state.open })),
    pendingCanvasInsert: null,
    queueCanvasInsert: (insert) => set({ pendingCanvasInsert: insert, open: false }),
    clearCanvasInsert: () => set({ pendingCanvasInsert: null }),
    reset: () => set({ open: false, pendingCanvasInsert: null }),
}));
