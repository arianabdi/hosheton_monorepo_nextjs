'use client';

import { useRouter } from 'next/navigation';
import { LuZap } from 'react-icons/lu';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { useWalletStore } from '@/app/zustand/store/walletStore';
import { useWalletRealtime } from '@/app/hooks/useWalletRealtime';
import ProfileMenu from '@/app/components/header/components/ProfileMenu/ProfileMenu';
import UsagePopup from '@/app/components/header/components/UsagePopup/UsagePopup';
import { useTranslation } from 'react-i18next';
import { formatAppNumber } from '@/app/lib/i18n/formatLocaleNumber';
import styles from './SidebarFooter.module.scss';

export default function SidebarFooter() {
    const router = useRouter();
    const { t } = useTranslation('menu');
    const { i18n } = useTranslation();
    const { token } = useAuthStore();
    // Live wallet snapshot — updated by `wallet:updated` socket events,
    // run-completion refreshes and tab-focus REST refreshes.
    const balance = useWalletStore((s) => s.availableBalance ?? s.balance);
    const currency = useWalletStore((s) => s.currency);
    useWalletRealtime();

    if (!token) {
        return (
            <div className={styles.footer}>
                <div className={styles.row}>
                    <ProfileMenu placement="top" />
                    <button type="button" className={styles.loginBtn} onClick={() => router.push('/login')}>
                        {t('login')}
                    </button>
                </div>
            </div>
        );
    }

    const isRial = currency === 'IRT' || currency === 'IRR';
    const displayBalance =
        balance == null
            ? '—'
            : isRial
                ? formatAppNumber(Number(balance).toFixed(0), i18n.language)
                : `$${formatAppNumber(Number(balance).toFixed(2), i18n.language)}`;

    return (
        <div className={styles.footer}>
            <div className={styles.row}>
                <ProfileMenu placement="top" />
                <div className={styles.creditPill}>
                    <button
                        type="button"
                        className={styles.addCredits}
                        onClick={() => router.push('/wallet')}
                    >
                        {t('add_credit')}
                    </button>
                    <div className={styles.balanceWrap}>
                        <UsagePopup
                            placement="top"
                            trigger={
                                <span className={styles.balanceBtn}>
                                    <LuZap size={13} />
                                    <span>{displayBalance}</span>
                                </span>
                            }
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
