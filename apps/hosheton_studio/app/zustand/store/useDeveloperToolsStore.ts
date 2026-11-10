'use client';

import { create } from 'zustand';

interface DeveloperToolsState {
    open: boolean;
    openDeveloperTools: () => void;
    closeDeveloperTools: () => void;
    toggleDeveloperTools: () => void;
}

/**
 * استور گلوبال Developer Tools — الگوی useQaConsoleStore:
 * پنل یک‌بار در layout نصب می‌شود و از منوی کنار سایدبار با openDeveloperTools باز می‌شود.
 */
export const useDeveloperToolsStore = create<DeveloperToolsState>((set) => ({
    open: false,
    openDeveloperTools: () => set({ open: true }),
    closeDeveloperTools: () => set({ open: false }),
    toggleDeveloperTools: () => set((state) => ({ open: !state.open })),
}));
