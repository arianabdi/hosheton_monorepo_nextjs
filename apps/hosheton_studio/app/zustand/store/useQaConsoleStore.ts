'use client';

import { create } from 'zustand';

interface QaConsoleState {
    open: boolean;
    openQaConsole: () => void;
    closeQaConsole: () => void;
}

/**
 * استور گلوبال کنسول QA — الگوی useLoginModalStore:
 * کنسول یک‌بار در (developers)/layout نصب می‌شود و از هر جای اپ با openQaConsole باز می‌شود.
 */
export const useQaConsoleStore = create<QaConsoleState>((set) => ({
    open: false,
    openQaConsole: () => set({ open: true }),
    closeQaConsole: () => set({ open: false }),
}));
