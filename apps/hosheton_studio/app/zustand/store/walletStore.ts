'use client';

import { create } from 'zustand';
import axios from 'axios';
import { useAuthStore } from './authStore';

interface WalletState {
    balance: number | null;
    availableBalance: number | null;
    reservedBalance: number;
    currency: string;
    walletStatus: string | null;
    /** True when the last fetch/realtime update came from the live socket. */
    lastSource: 'rest' | 'socket' | null;

    setFromApi: (data: {
        balance?: number;
        availableBalance?: number;
        reservedBalance?: number;
        status?: string;
        currency?: string;
    }) => void;
    setFromSocket: (data: {
        balance: number;
        reservedBalance: number;
        availableBalance: number;
        currency: string;
    }) => void;
    reset: () => void;
}

/**
 * Single source of truth for the logged-in user's wallet snapshot.
 * Fed by `useWalletRealtime` (REST refresh + `wallet:updated` socket events);
 * the sidebar pill, wallet page and usage page all read from here so a
 * charge or an AI settle is visible everywhere instantly.
 */
export const useWalletStore = create<WalletState>()((set) => ({
    balance: null,
    availableBalance: null,
    reservedBalance: 0,
    currency: 'USD',
    walletStatus: null,
    lastSource: null,

    setFromApi: (data) =>
        set((state) => ({
            balance: data.balance !== undefined ? Number(data.balance) : state.balance,
            availableBalance: data.availableBalance !== undefined
                ? Number(data.availableBalance)
                : data.balance !== undefined
                    ? Number(data.balance)
                    : state.availableBalance,
            reservedBalance: data.reservedBalance !== undefined ? Number(data.reservedBalance) : state.reservedBalance,
            walletStatus: data.status ?? state.walletStatus,
            currency: (data.currency || state.currency || 'USD').toUpperCase(),
            lastSource: 'rest',
        })),

    setFromSocket: (data) =>
        set({
            balance: Number(data.balance),
            availableBalance: Number(data.availableBalance),
            reservedBalance: Number(data.reservedBalance) || 0,
            currency: String(data.currency || 'USD').toUpperCase(),
            lastSource: 'socket',
        }),

    reset: () =>
        set({
            balance: null,
            availableBalance: null,
            reservedBalance: 0,
            walletStatus: null,
            lastSource: null,
        }),
}));

/** Pulls the wallet snapshot over REST into the store (initial load / focus). */
export async function refreshWalletFromApi(): Promise<void> {
    const { token, user } = useAuthStore.getState();
    if (!token) {
        useWalletStore.getState().reset();
        return;
    }
    void user;
    try {
        const res = await axios.get(
            `${process.env.NEXT_PUBLIC_API_URL}/api/billing/wallet/balance`,
            { headers: { authorization: `Bearer ${token}` } },
        );
        if (res.data?.statusCode === 200 && res.data.data) {
            useWalletStore.getState().setFromApi(res.data.data);
        }
    } catch {
        // keep the previous snapshot; realtime updates and focus refresh will retry
    }
}
