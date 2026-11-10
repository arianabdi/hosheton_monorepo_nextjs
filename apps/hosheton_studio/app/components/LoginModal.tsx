'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { LuLock } from 'react-icons/lu';
import { ModalHelper } from '@my-workspace/components';
import { useTranslation } from 'react-i18next';
import { useLoginModalStore } from '@/app/zustand/store/useLoginModalStore';
import styles from './LoginModal.module.scss';

export default function LoginModal() {
    const router = useRouter();
    const { t } = useTranslation('auth');
    const open = useLoginModalStore((s) => s.open);
    const returnTo = useLoginModalStore((s) => s.returnTo);
    const closeLoginModal = useLoginModalStore((s) => s.closeLoginModal);

    const goToLogin = () => {
        const next = returnTo ? `?next=${encodeURIComponent(returnTo)}` : '';
        closeLoginModal();
        router.push(`/login${next}`);
    };

    return (
        <ModalHelper
            open={open}
            onClose={closeLoginModal}
            size="sm"
            sheetTitle={t('auth_required_title')}
            props={{
                style: {
                    background: 'var(--input-background-color)',
                    color: 'var(--body-text-color)',
                    maxWidth: 400,
                    borderRadius: 20,
                    overflow: 'hidden',
                },
            }}
            component={
                <div className={styles.panel}>
                    <div className={styles.iconWrap} aria-hidden>
                        <LuLock size={24} strokeWidth={1.75} />
                    </div>
                    <h2 className={styles.title}>{t('auth_required_title')}</h2>
                    <p className={styles.body}>{t('auth_required_body')}</p>
                    <div className={styles.actions}>
                        <button type="button" className={styles.primary} onClick={goToLogin}>
                            {t('login_btn')}
                        </button>
                        <button type="button" className={styles.secondary} onClick={closeLoginModal}>
                            {t('auth_required_continue')}
                        </button>
                    </div>
                </div>
            }
        />
    );
}
