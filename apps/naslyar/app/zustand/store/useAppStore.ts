import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
}

interface ApplicationState {
    appName: string;
    /** Login option id (e.g. hosheton_studio, lingeeko). */
    appVariant: string;
    /** Human-readable label shown next to logo (e.g. هوشتون · Studio). */
    name: string;
    baseUrl: string;
    appLogo: string;
}

interface AuthState {
    token: string | null;
}

interface I18nState {
    lang: 'fa' | 'en'; // add more languages as needed
}

// Combined store type
interface AppStore extends AppearanceState, ProfileState, ApplicationState, AuthState, I18nState {
    sidebarOpen: boolean;

    // Appearance actions
    setTheme: (theme: 'dark' | 'light') => void;
    setFont: (font: string) => void;
    setSidebarOpen: (open: boolean) => void;
    toggleSidebar: () => void;

    // Profile actions
    setProfile: (profile: Partial<ProfileState>) => void;
    setApplication: (application: Partial<ApplicationState>) => void;
    resetProfile: () => void;

    // Auth actions
    setToken: (token: string | null) => void;
    logout: () => void;

    // I18n actions
    setLanguage: (lang: 'fa' | 'en') => void;
}

// ===================== Default values =====================
const defaultAppearance: AppearanceState = {
    theme: 'light',
    font: 'Inter',
};

const defaultProfile: ProfileState = {
    avatar: '',
    username: '',
    email: '',
    fullname: '',
    userId: '',
};

const defaultApplication: ApplicationState = {
    appName: '',
    appVariant: '',
    name: '',
    baseUrl: '',
    appLogo: '',
};

const defaultAuth: AuthState = {
    token: null,
};

const defaultI18n: I18nState = {
    lang: 'fa', // Persian as default
};

// ===================== Zustand Store with Persistence =====================
export const useAppStore = create<AppStore>()(
    persist(
        (set) => ({
            // --- initial states ---
            ...defaultAppearance,
            ...defaultProfile,
            ...defaultApplication,
            ...defaultAuth,
            ...defaultI18n,
            sidebarOpen: false,

            // --- appearance actions ---
            setTheme: (theme) => set({ theme }),
            setFont: (font) => set({ font }),
            setSidebarOpen: (open) => set({ sidebarOpen: open }),
            toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

            // --- profile actions ---
            setProfile: (profile) => set((state) => ({ ...state, ...profile })),
            resetProfile: () => set({ ...defaultProfile }),
            setApplication: (application) => set((state) => ({ ...state, ...application })),

            // --- auth actions ---
            setToken: (token) => set({ token }),
            logout: () => set({ token: null, ...defaultProfile, ...defaultApplication }), // clear token & profile on logout

            // --- i18n actions ---
            setLanguage: (lang) => set({ lang }),
        }),
        {
            name: 'app-storage', // unique key for localStorage
            partialize: (state) => ({
                // only persist these fields (omit sensitive data if needed)
                theme: state.theme,
                font: state.font,
                avatar: state.avatar,
                username: state.username,
                email: state.email,
                fullname: state.fullname,
                appName: state.appName,
                appVariant: state.appVariant,
                name: state.name,
                baseUrl: state.baseUrl,
                appLogo: state.appLogo,
                userId: state.userId,
                lang: state.lang,
                token: state.token,
                // NOTE: token is purposely NOT persisted for security.
                // tokens should live in memory or httpOnly cookie.
            }),
        }
    )
);