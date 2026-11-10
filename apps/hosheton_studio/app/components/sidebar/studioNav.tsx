'use client';

import type { ReactNode } from 'react';
import {
    LuCompass,
    LuFolderKanban,
    LuGauge,
    LuImages,
    LuLayoutTemplate,
    LuLifeBuoy,
    LuSparkles,
    LuTags,
    LuWallet,
} from 'react-icons/lu';
import { useTranslation } from 'react-i18next';
import { RiMessageAi3Line } from 'react-icons/ri';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { canUseDeveloperTools } from '@/app/lib/user-roles';

export type StudioNavItem = {
    text?: string;
    link?: string;
    href?: string;
    external?: boolean;
    /** When true, guests see the auth-required prompt instead of navigating. */
    requiresAuth?: boolean;
    /** When true, the item is only shown to admin/super-admin users. */
    adminOnly?: boolean;
    /** بج کوچک کنار عنوان — مثلاً «به‌زودی» */
    badge?: string;
    icon?: ReactNode;
    section?: string;
    divider?: boolean;
    subMenu?: StudioNavItem[];
};

const icon = { size: 18 };

export function useStudioNav(): StudioNavItem[] {
    const { t } = useTranslation('menu');
    const roles = useAppStore((state) => state.roles);
    const isAdmin = canUseDeveloperTools(roles);
    // مهمان همه‌ی بخش‌ها را می‌بیند (صفحه‌های حساب با پنل ورود)؛ فقط چت و قالب‌ها (بخش سازنده) پنجره‌ی ورود دارند
    const items: StudioNavItem[] = [
        { text: t('starter'), link: '/starter', icon: <LuSparkles {...icon} /> },
        { text: t('studio_chat'), link: '/chat', icon: <RiMessageAi3Line {...icon} /> },
        // ویدیوهای تبلیغاتی از منوی اصلی منتقل شدند به منوی developer (DeveloperMenu) — دسترسی هم‌چنان فقط ادمین‌ها
        { text: t('explore'), link: '/explore', icon: <LuCompass {...icon} /> },
        { text: t('projects'), link: '/projects', icon: <LuFolderKanban {...icon} /> },
        { text: t('templates'), link: '/templates', icon: <LuLayoutTemplate {...icon} /> },
        { text: t('assets'), link: '/assets', icon: <LuImages {...icon} /> },
        // بلاگ و آموزش‌ها از منوی پروفایل باز می‌شوند (layout جدای app/(blog)، بدون این سایدبار)
        { section: t('account') },
        { text: t('pricing'), link: '/ai-model-pricing', icon: <LuTags {...icon} /> },
        { text: t('usage'), link: '/usage', icon: <LuGauge {...icon} /> },
        { text: t('wallet'), link: '/wallet', icon: <LuWallet {...icon} /> },
        { text: t('support'), link: '/support', icon: <LuLifeBuoy {...icon} /> },
        // «سرویس‌های بیشتر» (هوشتون ایجنت) فعلاً مخفی است
    ];
    return items.filter((item) => !item.adminOnly || isAdmin);
}

/** @deprecated Use useStudioNav() so labels follow the active language. */
export const STUDIO_NAV: StudioNavItem[] = [];

export function isStudioNavActive(pathname: string | null | undefined, link?: string) {
    if (!pathname || !link) return false;
    if (link === '/starter') return pathname === '/starter' || pathname === '/';
    if (link === '/chat') return pathname === '/chat' || pathname.startsWith('/chat/');
    if (link === '/explore') return pathname.startsWith('/explore');
    if (link === '/projects') return pathname === '/projects' || pathname.startsWith('/projects/new');
    return pathname === link || pathname.startsWith(`${link}/`);
}
