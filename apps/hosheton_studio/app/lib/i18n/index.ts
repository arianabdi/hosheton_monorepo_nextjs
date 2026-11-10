import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';
import {
    DEFAULT_LANGUAGE,
    FALLBACK_LANGUAGE,
    NAMESPACES,
    type AppLanguage,
} from './config';
import fa from './locales/fa.json';
import en from './locales/en.json';
import ar from './locales/ar.json';
import es from './locales/es.json';
import de from './locales/de.json';
import fr from './locales/fr.json';
import ru from './locales/ru.json';
import ja from './locales/ja.json';
import zh from './locales/zh.json';
import tr from './locales/tr.json';

const resources = {
    fa,
    en,
    ar,
    es,
    de,
    fr,
    ru,
    ja,
    zh,
    tr,
} as Record<AppLanguage, Record<string, unknown>>;

if (!i18n.isInitialized) {
    i18n.use(initReactI18next).init({
        resources: Object.fromEntries(
            Object.entries(resources).map(([lang, data]) => [
                lang,
                Object.fromEntries(NAMESPACES.map((ns) => [ns, (data as Record<string, unknown>)[ns] || {}])),
            ]),
        ),
        lng: DEFAULT_LANGUAGE,
        fallbackLng: FALLBACK_LANGUAGE,
        ns: [...NAMESPACES],
        defaultNS: 'common',
        interpolation: {escapeValue: false},
        react: {useSuspense: false},
    });
}

export default i18n;
