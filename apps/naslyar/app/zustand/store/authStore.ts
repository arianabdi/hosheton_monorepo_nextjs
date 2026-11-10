// store/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { fetchMyPermissions } from '@/app/(main)/users/access-api';

export interface AuthUser {
    id: string;
    email: string;
    name: string;
    username?: string;
    mobile?: string;
    roles?: string[];
    accessRoleId?: string | null;
    accessRoleName?: string | null;
}

interface AuthState {
    token: string | null;
    user: AuthUser | null;
    permissions: string[];
    isSuperAdmin: boolean;
    isLoading: boolean;
    isVerifying: boolean;

    setAuth: (token: string, user: AuthUser, permissions?: string[], isSuperAdmin?: boolean) => void;
    setPermissions: (permissions: string[], accessRoleId?: string | null, accessRoleName?: string | null, isSuperAdmin?: boolean) => void;
    logout: () => Promise<void>;
    initializeAuth: () => Promise<void>;
    verifyToken: (token: string) => Promise<boolean>;
    refreshPermissions: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            token: null,
            user: null,
            permissions: [],
            isSuperAdmin: false,
            isLoading: true,
            isVerifying: false,

            setAuth: (token, user, permissions = [], isSuperAdmin = false) => {
                set({
                    token,
                    user,
                    permissions,
                    isSuperAdmin,
                    isLoading: false,
                });
            },

            setPermissions: (permissions, accessRoleId, accessRoleName, isSuperAdmin = false) => {
                set((state) => ({
                    permissions,
                    isSuperAdmin,
                    user: state.user
                        ? {
                              ...state.user,
                              accessRoleId: accessRoleId ?? state.user.accessRoleId,
                              accessRoleName: accessRoleName ?? state.user.accessRoleName,
                          }
                        : state.user,
                }));
            },

            logout: async () => {
                set({
                    token: null,
                    user: null,
                    permissions: [],
                    isSuperAdmin: false,
                    isLoading: false,
                });
                localStorage.removeItem('auth-storage');
            },

            refreshPermissions: async () => {
                const { token } = get();
                if (!token) return;
                try {
                    const data = await fetchMyPermissions();
                    get().setPermissions(
                        data.permissions || [],
                        data.accessRoleId,
                        data.accessRoleName,
                        data.isSuperAdmin,
                    );
                } catch {
                    /* ignore */
                }
            },

            verifyToken: async (token: string): Promise<boolean> => {
                const { baseUrl } = useAppStore.getState();
                const apiUrl = baseUrl || process.env.NEXT_PUBLIC_API_URL || '';
                try {
                    const res = await axios.get(`${apiUrl}/api/user/check`, {
                        headers: { authorization: `Bearer ${token}` },
                    });

                    if (res.status === 200 || res.status === 201) {
                        const userData = res.data?.data?.user;
                        if (userData) {
                            set((state) => ({
                                user: {
                                    id: String(userData._id),
                                    email: userData.email || '',
                                    name: userData.fullName || userData.username || '',
                                    username: userData.username,
                                    mobile: userData.mobile,
                                    roles: userData.roles,
                                    accessRoleId: userData.accessRoleId,
                                    accessRoleName: userData.accessRoleName,
                                },
                                permissions: userData.permissions || state.permissions,
                                isSuperAdmin: userData.isSuperAdmin || state.isSuperAdmin,
                            }));
                        }
                        return true;
                    }
                    return false;
                } catch (error) {
                    if (axios.isAxiosError(error) && error.response?.status === 401) {
                        return false;
                    }
                    return true;
                }
            },

            initializeAuth: async () => {
                set({ isLoading: true, isVerifying: true });

                const { token, verifyToken, logout, refreshPermissions } = get();

                if (!token) {
                    set({ isLoading: false, isVerifying: false });
                    return;
                }

                const isValid = await verifyToken(token);

                if (!isValid) {
                    await logout();
                } else {
                    await refreshPermissions();
                }

                set({ isLoading: false, isVerifying: false });
            },
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({
                token: state.token,
                user: state.user,
                permissions: state.permissions,
                isSuperAdmin: state.isSuperAdmin,
            }),
        },
    ),
);
