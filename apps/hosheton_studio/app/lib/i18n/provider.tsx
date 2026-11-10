'use client';

import {ReactNode, useEffect} from 'react';
import {I18nextProvider} from 'react-i18next';
import i18n from './index';
import {useAppStore, waitForAppStoreHydration} from '@/app/zustand/store/useAppStore';
import {DEFAULT_LANGUAGE, isAppLanguage, isRtlLanguage, type AppLanguage} from './config';
import {
    CHOSEN_LANG_COOKIE,
    persistChosenLanguageCookie,
    readBrowserCookie,
} from './languageCookies';

function applyDocumentLanguage(lang: string) {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = lang;
    document.documentElement.dir = isRtlLanguage(lang) ? 'rtl' : 'ltr';
}

export function I18nProvider({
    children,
}: {
    children: ReactNode;
}) {
    const lang = useAppStore((s) => s.lang);

    useEffect(() => {
        let cancelled = false;

        async function bootstrapLanguage() {
            await waitForAppStoreHydration();
            if (cancelled) return;

            const state = useAppStore.getState();
            if (state.languageChosen && isAppLanguage(state.lang)) {
                persistChosenLanguageCookie(state.lang);
                syncLanguage(state.lang);
                return;
            }

            const chosenCookie = readBrowserCookie(CHOSEN_LANG_COOKIE);
            if (chosenCookie && isAppLanguage(chosenCookie)) {
                state.setLanguage(chosenCookie);
                syncLanguage(chosenCookie);
                return;
            }

            // زبان پیش‌فرض پلتفرم همیشه فارسی است؛ مگر اینکه کاربر صریحاً زبان دیگری انتخاب کرده باشد.
            useAppStore.getState().applyDetectedLanguage(DEFAULT_LANGUAGE);
            syncLanguage(DEFAULT_LANGUAGE);
        }

        void bootstrapLanguage();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        const nextLang = isAppLanguage(lang) ? lang : DEFAULT_LANGUAGE;
        if (i18n.language !== nextLang) {
            void i18n.changeLanguage(nextLang);
        }
        applyDocumentLanguage(nextLang);
    }, [lang]);

    return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}

export function syncLanguage(lang: string) {
    const nextLang = isAppLanguage(lang) ? lang : DEFAULT_LANGUAGE;
    void i18n.changeLanguage(nextLang);
    applyDocumentLanguage(nextLang);
}
