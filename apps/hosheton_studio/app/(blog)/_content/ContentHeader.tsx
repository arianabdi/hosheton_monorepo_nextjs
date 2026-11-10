'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { LuArrowLeft } from 'react-icons/lu';
import LogoDark from '@/app/assets/hooshetun/logo-dark.svg';
import LogoLight from '@/app/assets/hooshetun/logo-light.svg';
import ProfileMenu from '@/app/components/header/components/ProfileMenu/ProfileMenu';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { BLOG_BASE_PATH, DOCS_BASE_PATH } from '@/app/(marketplace)/lib/content-api';
import styles from './content.module.scss';

/** هدر بلاگ و آموزش‌ها — جای سایدبار استودیو (الگوی blog2: لوگو، منو، اکشن‌ها و خط زیرین پررنگ) */
export function ContentHeader() {
    const pathname = usePathname() || '';
    const theme = useAppStore((state) => state.theme);
    const { t } = useTranslation('header');
    const { t: tBrand } = useTranslation('common');

    const links = [
        { href: BLOG_BASE_PATH, label: t('blog') },
        { href: DOCS_BASE_PATH, label: t('docs') },
    ];

    return (
        <header className={styles.header}>
            {/* لوگو و منوی بلاگ/مستندات کنار هم در ابتدای هدر */}
            <div className={styles.brand}>
                <Link href="/explore" className={styles.logo} aria-label={tBrand('brand_studio')}>
                    <Image src={theme === 'dark' ? LogoLight : LogoDark} alt={tBrand('brand')} priority />
                </Link>
                <nav className={styles.nav} aria-label={t('content_nav')}>
                    {links.map((link) => {
                        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={active ? styles.navLinkActive : undefined}
                                aria-current={active ? 'page' : undefined}
                            >
                                {link.label}
                            </Link>
                        );
                    })}
                </nav>
            </div>
            <div className={styles.actions}>
                <Link href="/chat" className={styles.studioLink}>
                    {t('open_studio')}
                    <LuArrowLeft size={15} aria-hidden />
                </Link>
                <ProfileMenu iconSize={26} contentArea />
            </div>
        </header>
    );
}
