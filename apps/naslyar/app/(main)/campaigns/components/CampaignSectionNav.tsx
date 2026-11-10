'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from '../Campaigns.module.scss';

const SECTIONS = [
    { href: '/campaigns', label: 'کمپین‌ها' },
    { href: '/campaigns/runs', label: 'اجراها' },
];

export default function CampaignSectionNav() {
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
