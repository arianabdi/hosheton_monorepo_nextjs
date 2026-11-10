'use client';

/**
 * نمای چت (v1 کلاسیک / v2 گالری) — انتخاب per-user که در systemSettings سمت
 * سرور ذخیره می‌شود؛ localStorage فقط به‌عنوان fallback آفلاین/پیش از لود است.
 */

import { useCallback, useEffect, useState } from 'react';
import { providersApi } from '@/app/(developers)/projects/lib/providers-api';

export type ChatView = 'v1' | 'v2';

const STORAGE_KEY = 'studio_chat_view';

function readLocal(): ChatView {
    if (typeof window === 'undefined') return 'v1';
    try {
        return window.localStorage.getItem(STORAGE_KEY) === 'v2' ? 'v2' : 'v1';
    } catch {
        return 'v1';
    }
}

function writeLocal(view: ChatView) {
    try {
        window.localStorage.setItem(STORAGE_KEY, view);
    } catch {
        /* storage unavailable */
    }
}

export function useChatViewPreference() {
    const [view, setViewState] = useState<ChatView>('v1');
    const [ready, setReady] = useState(false);

    useEffect(() => {
        let cancelled = false;
        const localView = readLocal();
        // همه setState ها داخل callback async هستند (نه sync در body افکت)
        providersApi.getChatView()
            .then((serverView) => {
                if (cancelled) return;
                setViewState(serverView);
                writeLocal(serverView);
            })
            .catch(() => {
                if (!cancelled) setViewState(localView);
            })
            .finally(() => {
                if (!cancelled) setReady(true);
            });
        return () => { cancelled = true; };
    }, []);

    const setView = useCallback((next: ChatView) => {
        setViewState(next);
        writeLocal(next);
        providersApi.updateChatView(next).catch(() => undefined);
    }, []);

    return { view, setView, ready };
}
