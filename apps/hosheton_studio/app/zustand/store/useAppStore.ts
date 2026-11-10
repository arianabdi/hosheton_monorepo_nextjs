import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_LANGUAGE, isAppLanguage, type AppLanguage } from '@/app/lib/i18n/config';
import { APP_STORAGE_KEY, persistChosenLanguageCookie, persistGeoLanguageCookie } from '@/app/lib/i18n/languageCookies';

// ===================== Types =====================
interface AppearanceState {
    theme: 'dark' | 'light';
    font: string;
}

interface ProfileState {
    avatar: string;
    username: string;
    email: string;
    fullname: string;
    userId: string;
    roles: string[];
}

interface AuthState {
    token: string | null;
}

interface I18nState {
    lang: AppLanguage;
    /** True only after the user picks a language in the UI. Survives close/reopen. */
    languageChosen: boolean;
}

// Combined store type
interface AppStore extends AppearanceState, ProfileState, AuthState, I18nState {
    // Appearance actions
    setTheme: (theme: 'dark' | 'light') => void;
    setFont: (font: string) => void;

    // Profile actions
    setProfile: (profile: Partial<ProfileState>) => void;
    resetProfile: () => void;

    // Auth actions
    setToken: (token: string | null) => void;
    logout: () => void;

    // I18n actions
    setLanguage: (lang: AppLanguage) => void;
    applyDetectedLanguage: (lang: AppLanguage) => void;
}

// ===================== Default values =====================
const defaultAppearance: AppearanceState = {
    // تم پیش‌فرض اپلیکیشن تیره است؛ انتخاب کاربر در app-storage ذخیره می‌شود
    theme: 'dark',
    font: 'Inter',
};

const defaultProfile: ProfileState = {
    avatar: '',
    username: '',
    email: '',
    fullname: '',
    userId: '',
    roles: [],
};

const defaultAuth: AuthState = {
    token: null,
};

const defaultI18n: I18nState = {
    lang: DEFAULT_LANGUAGE,
    languageChosen: false,
};

type PersistedAppState = {
    lang?: string;
    languageChosen?: boolean;
};

// ===================== Zustand Store with Persistence =====================
export const useAppStore = create<AppStore>()(
    persist(
        (set) => ({
            // --- initial states ---
            ...defaultAppearance,
            ...defaultProfile,
            ...defaultAuth,
            ...defaultI18n,

            // --- appearance actions ---
            setTheme: (theme) => set({ theme }),
            setFont: (font) => set({ font }),

            // --- profile actions ---
            setProfile: (profile) => set((state) => ({ ...state, ...profile })),
            resetProfile: () => set({ ...defaultProfile }),

            // --- auth actions ---
            setToken: (token) => set({ token }),
            logout: () => set({ token: null, ...defaultProfile }),

            // --- i18n actions ---
            setLanguage: (lang) => {
                persistChosenLanguageCookie(lang);
                set({ lang, languageChosen: true });
            },
            applyDetectedLanguage: (lang) => {
                persistGeoLanguageCookie(lang);
                set((state) => (state.languageChosen ? state : { lang, languageChosen: false }));
            },
        }),
        {
            name: APP_STORAGE_KEY,
            version: 2,
            migrate: (persisted, version) => {
                const state = (persisted || {}) as PersistedAppState;
                const lang = state.lang && isAppLanguage(state.lang) ? state.lang : DEFAULT_LANGUAGE;
                if (version < 2) {
                    // v1 incorrectly treated auto-detected non-fa as an explicit user choice.
                    return {
                        ...state,
                        lang,
                        languageChosen: Boolean(state.languageChosen) && version >= 1
                            ? false
                            : Boolean(state.languageChosen),
                    };
                }
                return {
                    ...state,
                    lang,
                    languageChosen: Boolean(state.languageChosen),
                };
            },
            partialize: (state) => ({
                theme: state.theme,
                font: state.font,
                avatar: state.avatar,
                username: state.username,
                email: state.email,
                fullname: state.fullname,
                userId: state.userId,
                roles: state.roles,
                lang: state.lang,
                languageChosen: state.languageChosen,
                token: state.token,
            }),
        }
    )
);

export function waitForAppStoreHydration(): Promise<void> {
    if (useAppStore.persist.hasHydrated()) return Promise.resolve();
    return new Promise((resolve) => {
        const unsub = useAppStore.persist.onFinishHydration(() => {
            unsub();
            resolve();
        });
        if (useAppStore.persist.hasHydrated()) {
            unsub();
            resolve();
        }
    });
}
