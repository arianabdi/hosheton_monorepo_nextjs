'use client';

import React from 'react';
import styles from './AuthLoadingScreen.module.scss';
import { NaslyarLogo } from '@/assets/images/svg/naslyar_logo';
import { iransansxvf } from '@my-workspace/fonts/iransansxvf';

interface AuthLoadingScreenProps {
    text?: string;
}

export function AuthLoadingScreen({
    text = 'در حال بررسی وضعیت حساب شما...',
}: AuthLoadingScreenProps) {
    return (
        <div className={`${styles.loadingScreen} ${styles.rtl} ${iransansxvf.className}`}>
            <div
                className={styles.logoWrap}
                dangerouslySetInnerHTML={{ __html: NaslyarLogo }}
            />
            <div className={styles.spinner} aria-hidden="true" />
            <p className={styles.text}>{text}</p>
        </div>
    );
}
