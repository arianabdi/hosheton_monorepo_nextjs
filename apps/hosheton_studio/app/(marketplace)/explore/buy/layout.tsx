'use client';

import type { ComponentType, ReactNode } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { LuArrowLeft, LuArrowRight } from 'react-icons/lu';
import { iransansxvf } from '@my-workspace/fonts/iransansxvf';
import { isRtlLanguage } from '@/app/lib/i18n/config';
import BrandMiniIcon from '@/app/components/header/BrandMiniIcon';
import MiniIconLight from '@/app/assets/hooshetun/mini-icon-light.svg';
import styles from './BuyCheckoutLayout.module.scss';

function TopbarLogo() {
    if (typeof MiniIconLight === 'function') {
        const Icon = MiniIconLight as ComponentType<{ className?: string }>;
        return <Icon className={styles.logo} />;
    }
    return <BrandMiniIcon className={styles.logo} size={18} />;
}

export default function BuyCheckoutLayout({ children }: { children: ReactNode }) {
    const { t, i18n } = useTranslation('marketplace');
    const rtl = isRtlLanguage(i18n.language);

    return (
        <div className={`${styles.shell} ${iransansxvf.className}`} dir={rtl ? 'rtl' : 'ltr'}>
            <header className={styles.topbar}>
                <div className={styles.topbarInner}>
                    <div className={styles.brand}>
                        <TopbarLogo />
                        <span className={styles.title}>{t('checkout_heading')}</span>
                    </div>
                    <Link href="/explore" className={styles.back}>
                        {rtl ? <LuArrowRight size={15} /> : <LuArrowLeft size={15} />}
                        <span>{t('checkout_continue')}</span>
                    </Link>
                </div>
            </header>
            {children}
        </div>
    );
}
