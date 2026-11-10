'use client';

import { create } from 'zustand';

type LoginModalState = {
    open: boolean;
    returnTo?: string;
    openLoginModal: (returnTo?: string) => void;
    closeLoginModal: () => void;
};

export const useLoginModalStore = create<LoginModalState>((set) => ({
    open: false,
    returnTo: undefined,
    openLoginModal: (returnTo) => set({ open: true, returnTo }),
    closeLoginModal: () => set({ open: false, returnTo: undefined }),
}));

export function requireAuthOrLogin(
    token: string | null | undefined,
    returnTo?: string,
): boolean {
    if (token) return true;
    useLoginModalStore.getState().openLoginModal(returnTo);
    return false;
}
