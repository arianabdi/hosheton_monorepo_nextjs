'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from '../Banners.module.scss';

const SECTIONS = [
    { href: '/marketing/banners', label: 'نمای کلی' },
    { href: '/marketing/banners/placements', label: 'جایگاه‌ها' },
    { href: '/marketing/banners/creatives', label: 'خلاقیت‌ها' },
    { href: '/marketing/banners/list', label: 'بنرها' },
    { href: '/marketing/banners/analytics', label: 'آمار' },
];

export default function BannerSectionNav() {
    const pathname = usePathname();
    return (
        <nav className={styles.sectionNav}>
            {SECTIONS.map((s) => (
                <Link
                    key={s.href}
                    href={s.href}
                    className={`${styles.sectionNavLink} ${pathname === s.href ? styles.active : ''}`}
                >
                    {s.label}
                </Link>
            ))}
        </nav>
    );
}
