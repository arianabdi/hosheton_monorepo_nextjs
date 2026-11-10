'use client';

import MobileHeaderBrand from '@/app/components/header/MobileHeaderBrand';
import { DeveloperMenu } from '@/app/components/developer-menu';
import { useMobileShellStore } from '@/app/zustand/store/useMobileShellStore';
import styles from './MobileAppBar.module.scss';

type MobileAppBarProps = {
    menuMode?: 'sidebar' | 'editor';
};

export default function MobileAppBar({ menuMode = 'sidebar' }: MobileAppBarProps) {
    const sidebarOpen = useMobileShellStore((state) => state.sidebarOpen);

    return (
        <header className={styles.bar} dir="ltr">
            <div className={styles.leading}>
                {!(menuMode === 'sidebar' && sidebarOpen) && (
                    <MobileHeaderBrand menuMode={menuMode} fixedLayout />
                )}
            </div>
            <div className={styles.end}>
                {/* جای آواتار پروفایل — پروفایل در موبایل در فوتر سایدبار کنار «افزودن اعتبار» است */}
                <DeveloperMenu placement="inline" />
            </div>
        </header>
    );
}
