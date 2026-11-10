'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import MobileShellToggle from '@/app/components/sidebar/MobileShellToggle';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import LogoDark from '@/app/assets/hooshetun/logo-dark.svg';
import LogoLight from '@/app/assets/hooshetun/logo-light.svg';
import BrandMiniIcon from '@/app/components/header/BrandMiniIcon';
import styles from './MobileHeaderBrand.module.scss';

type Props = {
    onLogoClick?: () => void;
    menuMode?: 'sidebar' | 'editor';
    mark?: 'logo' | 'mini';
    fixedLayout?: boolean;
};

export default function MobileHeaderBrand({
    onLogoClick,
    menuMode = 'sidebar',
    mark = 'logo',
    fixedLayout = false,
}: Props) {
    const router = useRouter();
    const { t } = useTranslation('common');
    const { theme } = useAppStore();

    return (
        <div className={`${styles.brand} ${fixedLayout ? styles.brandFixed : ''}`}>
            <MobileShellToggle mode={menuMode} variant="inline" />
            <button
                type="button"
                className={styles.logoBtn}
                onClick={() => {
                    if (onLogoClick) {
                        onLogoClick();
                        return;
                    }
                    router.push('/explore');
                }}
                aria-label={t('brand_studio')}
            >
                {mark === 'mini' ? (
                    <BrandMiniIcon className={styles.miniMark} size={22} />
                ) : (
                    <Image
                        src={theme === 'dark' ? LogoLight : LogoDark}
                        alt={t('brand')}
                        className={styles.brandLogo}
                    />
                )}
            </button>
        </div>
    );
}
