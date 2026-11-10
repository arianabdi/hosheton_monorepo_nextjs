'use client';

import React from 'react';
import Image from 'next/image';
import styles from './AuthLoadingScreen.module.scss';
import logoLight from "@/app/assets/hooshetun/logo-light.svg";
import logoDark from "@/app/assets/hooshetun/logo-dark.svg";
import { iransans } from "@my-workspace/fonts/iransans";
import { useAppStore } from "@/app/zustand/store/useAppStore";
import { useTranslation } from 'react-i18next';

interface AuthLoadingScreenProps {
    text?: string;
}

export function AuthLoadingScreen({ text }: AuthLoadingScreenProps) {
    const theme = useAppStore((s) => s.theme);
    const { t } = useTranslation('common');
    const message = text ?? t('checking_account');

    return (
        <div className={`${styles.loadingScreen} ${iransans.className}`}>
            <div className={styles.logoWrap}>
                <Image
                    src={theme === 'dark' ? logoLight : logoDark}
                    alt={t('brand')}
                    className={styles.logo}
                    width={160}
                    height={160}
                    priority
                />
            </div>
            <div className={styles.spinner} aria-hidden="true" />
            <p className={styles.text}>{message}</p>
        </div>
    );
}
