'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { refreshWalletFromApi, useWalletStore } from '@/app/zustand/store/walletStore';
import { acquireStudioSocket } from '../(developers)/projects/lib/createStudioSocket';
import { isTerminalRunStatus, subscribeRunLifecycle } from '../(developers)/projects/lib/run-lifecycle-events';

interface WalletUpdatedPayload {
    balance: number;
    reservedBalance: number;
    availableBalance: number;
    currency: string;
    reason?: string;
}

/**
 * Keeps the wallet store live:
 * - initial REST snapshot + refresh on tab focus;
 * - `wallet:updated` socket events (admin credit, gateway recharge, AI settle/hold/release)
 *   pushed through the shared studio socket;
 * - a debounced REST refresh whenever a generation run reaches a terminal state,
 *   so the balance reflects delivery even if a realtime event was missed.
 */
export function useWalletRealtime(): void {
    const token = useAuthStore((s) => s.token);

    useEffect(() => {
        if (!token) {
            useWalletStore.getState().reset();
            return;
        }

        refreshWalletFromApi();

        const handle = acquireStudioSocket(token);
        const onWalletUpdated = (payload: WalletUpdatedPayload) => {
            if (payload && Number.isFinite(Number(payload.balance))) {
                useWalletStore.getState().setFromSocket(payload);
            }
        };
        handle?.socket.on('wallet:updated', onWalletUpdated);

        let refreshTimer: ReturnType<typeof setTimeout> | null = null;
        const unsubscribeRuns = subscribeRunLifecycle((event) => {
            if (!isTerminalRunStatus(event.status)) return;
            if (refreshTimer) clearTimeout(refreshTimer);
            refreshTimer = setTimeout(() => {
                refreshTimer = null;
                void refreshWalletFromApi();
            }, 1_500);
        });

        const onVisible = () => {
            if (document.visibilityState === 'visible') void refreshWalletFromApi();
        };
        document.addEventListener('visibilitychange', onVisible);
        window.addEventListener('focus', onVisible);

        return () => {
            handle?.socket.off('wallet:updated', onWalletUpdated);
            handle?.release();
            unsubscribeRuns();
            if (refreshTimer) clearTimeout(refreshTimer);
            document.removeEventListener('visibilitychange', onVisible);
            window.removeEventListener('focus', onVisible);
        };
    }, [token]);
}
