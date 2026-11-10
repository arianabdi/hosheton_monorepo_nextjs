// store/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';
import { useAppStore } from './useAppStore';
import { mapApiUserToProfile } from '@/app/lib/user-roles';

interface User {
    id: string;
    email: string;
    name: string;
}

type TokenCheck = 'valid' | 'invalid' | 'unavailable';

interface AuthState {
    token: string | null;
    user: User | null;
    isLoading: boolean;
    isVerifying: boolean;

    setAuth: (token: string, user: User) => void;
    logout: () => Promise<void>;
    initializeAuth: () => Promise<void>;
    verifyToken: (token: string) => Promise<TokenCheck>;
}

/** exp داخل JWT (ثانیه). null یعنی قابل خواندن نیست و نباید به‌خاطر آن نشست پاک شود. */
function readTokenExpiryMs(token: string): number | null {
    const segment = token.split('.')[1];
    if (!segment || typeof atob !== 'function') return null;
    try {
        const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
        const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
        const payload = JSON.parse(atob(padded)) as { exp?: unknown };
        const exp = Number(payload.exp);
        return Number.isFinite(exp) ? exp * 1000 : null;
    } catch {
        return null;
    }
}

function isRejectedSession(status?: number, message?: unknown): boolean {
    if (status === 401 || status === 403) return true;
    return message === 'no_user_found';
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            token: null,
            user: null,
            isLoading: true,
            isVerifying: false,

            setAuth: (token, user) => {
                set({ token, user, isLoading: false });
            },

            logout: async () => {
                set({ token: null, user: null, isLoading: false });
                useAppStore.getState().logout();
                localStorage.removeItem('auth-storage');
            },

            verifyToken: async (token: string): Promise<TokenCheck> => {
                const expiresAt = readTokenExpiryMs(token);
                if (expiresAt !== null && expiresAt <= Date.now()) {
                    return 'invalid';
                }

                try {
                    const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/user/check`, {
                        headers: { authorization: `Bearer ${token}` },
                        timeout: 10000,
                        validateStatus: () => true,
                    });

                    if (res.status === 200 && res.data?.statusCode === 200) {
                        return 'valid';
                    }
                    if (isRejectedSession(res.status, res.data?.message)) {
                        return 'invalid';
                    }
                    return 'unavailable';
                } catch (error) {
                    if (axios.isAxiosError(error) && isRejectedSession(error.response?.status, error.response?.data?.message)) {
                        return 'invalid';
                    }
                    console.warn('Session kept: auth API unreachable', error);
                    return 'unavailable';
                }
            },

            initializeAuth: async () => {
                set({ isLoading: true, isVerifying: true });
                await waitForAuthHydration();

                const { token, verifyToken, logout } = get();

                if (!token) {
                    set({ isLoading: false, isVerifying: false });
                    return;
                }

                const check = await verifyToken(token);

                if (check === 'invalid') {
                    await logout();
                    set({ isLoading: false, isVerifying: false });
                    return;
                }

                if (check === 'unavailable') {
                    set({ isLoading: false, isVerifying: false });
                    return;
                }

                try {
                    const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/user`, {
                        headers: { authorization: `Bearer ${token}` },
                    });
                    const user = res.data?.data?.user;
                    if (user) {
                        useAppStore.getState().setProfile(mapApiUserToProfile(user));
                    }
                } catch (error) {
                    console.error('Failed to hydrate user profile:', error);
                }

                set({ isLoading: false, isVerifying: false });
            }
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({ token: state.token, user: state.user }),
        }
    )
);

function waitForAuthHydration(): Promise<void> {
    if (typeof window === 'undefined') return Promise.resolve();
    if (useAuthStore.persist.hasHydrated()) return Promise.resolve();
    return new Promise((resolve) => {
        let settled = false;
        const finish = () => {
            if (settled) return;
            settled = true;
            window.clearTimeout(timeout);
            unsub();
            resolve();
        };
        const timeout = window.setTimeout(finish, 2000);
        const unsub = useAuthStore.persist.onFinishHydration(finish);
        if (useAuthStore.persist.hasHydrated()) finish();
    });
}