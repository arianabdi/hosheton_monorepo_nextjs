'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { HiOutlineUserCircle } from 'react-icons/hi';
import { LuCompass, LuFolderKanban } from 'react-icons/lu';
import { RiMessageAi3Line } from 'react-icons/ri';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { useLoginModalStore } from '@/app/zustand/store/useLoginModalStore';
import { useStudioPersonalChatStore } from '@/app/zustand/store/useStudioPersonalChatStore';
import { isStudioNavActive } from './studioNav';
import styles from './MobileTabBar.module.scss';

/**
 * نوار پایین موبایل — شناور: قرص ساده با سه بخش اصلی (فقط آیکون) + دایرهٔ جدای پروفایل (همیشه آخر).
 * پروفایل منو باز نمی‌کند و
 * مستقیم به تب «اطلاعات حساب» صفحهٔ سازنده می‌رود (مهمان: پنجرهٔ ورود).
 * بقیهٔ بخش‌ها در سایدبار (دکمهٔ منوی نوار بالا) می‌مانند. ارتفاع: --mobile-tabbar-height (globals.css).
 */
export default function MobileTabBar() {
    const pathname = usePathname();
    const { t } = useTranslation('menu');
    const { t: th } = useTranslation('header');
    const userId = useAppStore((s) => s.userId);
    const avatar = useAppStore((s) => s.avatar);
    const fullname = useAppStore((s) => s.fullname);
    const token = useAuthStore((s) => s.token);
    const closePersonalChat = useStudioPersonalChatStore((s) => s.setOpen);
    const loggedIn = Boolean(token && userId);

    const items = [
        { link: '/chat', label: t('studio_chat'), icon: <RiMessageAi3Line size={22} /> },
        { link: '/explore', label: t('explore'), icon: <LuCompass size={22} /> },
        { link: '/projects', label: t('projects'), icon: <LuFolderKanban size={22} /> },
    ];
    const profileActive = Boolean(
        pathname
        && ((userId && pathname.startsWith(`/creators/${userId}`)) || pathname.startsWith('/settings')),
    );
    const profileIcon = loggedIn && avatar
        ? <img src={avatar} alt={fullname || ''} className={styles.avatar} />
        : <HiOutlineUserCircle size={26} aria-hidden />;

    return (
        <nav className={styles.bar}>
            <div className={`${styles.glass} ${styles.pill}`}>
                {items.map((item) => {
                    const active = isStudioNavActive(pathname, item.link);
                    return (
                        <Link
                            key={item.link}
                            href={item.link}
                            className={`${styles.item} ${active ? styles.active : ''}`}
                            aria-current={active ? 'page' : undefined}
                            aria-label={item.label}
                            title={item.label}
                            onClick={() => {
                                if (item.link === '/chat') closePersonalChat(false);
                            }}
                        >
                            {item.icon}
                        </Link>
                    );
                })}
            </div>
            {loggedIn ? (
                <Link
                    href={`/creators/${userId}?tab=profile`}
                    className={`${styles.glass} ${styles.round} ${profileActive ? styles.roundActive : ''}`}
                    aria-current={profileActive ? 'page' : undefined}
                    aria-label={th('profile')}
                    title={th('profile')}
                >
                    {profileIcon}
                </Link>
            ) : (
                <button
                    type="button"
                    className={`${styles.glass} ${styles.round}`}
                    aria-label={th('profile')}
                    title={th('profile')}
                    onClick={() => useLoginModalStore.getState().openLoginModal()}
                >
                    {profileIcon}
                </button>
            )}
        </nav>
    );
}
