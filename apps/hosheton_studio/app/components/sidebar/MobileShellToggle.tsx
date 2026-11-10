'use client';

import { useEffect } from 'react';
import { IoMdMenu } from 'react-icons/io';
import { usePathname } from 'next/navigation';
import { useMobileShellStore } from '@/app/zustand/store/useMobileShellStore';
import { useTranslation } from 'react-i18next';
import styles from './MobileShellToggle.module.scss';

type Props = {
    mode?: 'sidebar' | 'editor';
    variant?: 'fixed' | 'inline';
};

export default function MobileShellToggle({ mode = 'sidebar', variant = 'fixed' }: Props) {
    const { t } = useTranslation('common');
    const pathname = usePathname();
    const {
        sidebarOpen,
        editorPanelOpen,
        toggleSidebar,
        toggleEditorPanel,
        closeAll,
    } = useMobileShellStore();

    useEffect(() => {
        closeAll();
    }, [pathname, closeAll]);

    const isOpen = mode === 'editor' ? editorPanelOpen : sidebarOpen;

    return (
        <button
            type="button"
            className={`${styles.toggle} ${styles[variant]} ${isOpen ? styles.active : ''}`}
            onClick={mode === 'editor' ? toggleEditorPanel : toggleSidebar}
            aria-label={mode === 'editor' ? t('open_editor_panel') : t('open_menu')}
            aria-expanded={isOpen}
        >
            <IoMdMenu size={22} color="var(--icon-color)" />
        </button>
    );
}
