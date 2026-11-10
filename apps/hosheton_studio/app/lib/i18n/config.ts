export const SUPPORTED_LANGUAGES = [
    {code: 'fa', label: 'فارسی', nativeLabel: 'فارسی'},
    {code: 'en', label: 'English', nativeLabel: 'English'},
    {code: 'ar', label: 'Arabic', nativeLabel: 'العربية'},
    {code: 'es', label: 'Spanish', nativeLabel: 'Español'},
    {code: 'de', label: 'German', nativeLabel: 'Deutsch'},
    {code: 'fr', label: 'French', nativeLabel: 'Français'},
    {code: 'ru', label: 'Russian', nativeLabel: 'Русский'},
    {code: 'ja', label: 'Japanese', nativeLabel: '日本語'},
    {code: 'zh', label: 'Chinese', nativeLabel: '中文'},
    {code: 'tr', label: 'Turkish', nativeLabel: 'Türkçe'},
] as const;

export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number]['code'];

export const RTL_LANGUAGES: AppLanguage[] = ['fa', 'ar'];

export const DEFAULT_LANGUAGE: AppLanguage = 'fa';

export const FALLBACK_LANGUAGE: AppLanguage = 'en';

export const NAMESPACES = [
    'common',
    'header',
    'menu',
    'auth',
    'settings',
    'support',
    'wallet',
    'payment',
    'usage',
    'projects',
    'templates',
    'marketplace',
    'messages',
    'assets',
    'avatars',
    'starter',
    'notifications',
    'videoEditor',
    'adsVideo',
    'templateTags',
    'systemDesign',
    // پیام‌های خطای هوشتون — فقط از طریق app/lib/errors خوانده شوند
    'errors',
] as const;

export type AppNamespace = (typeof NAMESPACES)[number];

export function isRtlLanguage(lang: string): boolean {
    return RTL_LANGUAGES.includes(lang as AppLanguage);
}

export function isAppLanguage(lang: string): lang is AppLanguage {
    return SUPPORTED_LANGUAGES.some((l) => l.code === lang);
}
