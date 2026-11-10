'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LuLayoutGrid, LuRotateCcw } from 'react-icons/lu';
import { type DockTabId, type SingletonPanelId } from '../../hooks/useEditorLayout';
import styles from './PanelLayoutMenu.module.scss';

type PanelLayoutMenuProps = {
    isPanelVisible: (panel: SingletonPanelId) => boolean;
    isTabVisible: (tab: DockTabId) => boolean;
    onTogglePanel: (panel: SingletonPanelId) => void;
    onToggleTab: (tab: DockTabId) => void;
    onFloatPanel: (panel: SingletonPanelId) => void;
    onReset: () => void;
};

export default function PanelLayoutMenu({
    isPanelVisible,
    isTabVisible,
    onTogglePanel,
    onToggleTab,
    onFloatPanel,
    onReset,
}: PanelLayoutMenuProps) {
    const { t } = useTranslation('videoEditor');
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const onPointerDown = (event: PointerEvent) => {
            if (rootRef.current?.contains(event.target as Node)) return;
            setOpen(false);
        };
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false);
        };
        window.addEventListener('pointerdown', onPointerDown, true);
        window.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('pointerdown', onPointerDown, true);
            window.removeEventListener('keydown', onKey);
        };
    }, [open]);

    const panelRows: Array<{ id: SingletonPanelId; label: string }> = [
        { id: 'media', label: t('panel_media') },
        { id: 'preview', label: t('panel_preview') },
        { id: 'timeline', label: t('panel_timeline') },
        { id: 'chat', label: t('panel_chat') },
    ];
    const tabRows: Array<{ id: DockTabId; label: string }> = [
        { id: 'logs', label: t('panel_logs') },
        { id: 'settings', label: t('panel_settings') },
        { id: 'export', label: t('panel_export') },
    ];

    const hiddenCount = panelRows.filter((row) => !isPanelVisible(row.id)).length
        + tabRows.filter((row) => !isTabVisible(row.id)).length;

    return (
        <div className={styles.wrap} ref={rootRef}>
            <button
                type="button"
                className={`${styles.trigger} ${open ? styles.triggerOpen : ''}`}
                onClick={() => setOpen((value) => !value)}
                title={t('layout_menu')}
                aria-label={t('layout_menu')}
                aria-expanded={open}
            >
                <LuLayoutGrid />
                {hiddenCount > 0 && <span className={styles.badge}>{hiddenCount}</span>}
            </button>

            {open && (
                <div className={styles.menu} role="menu">
                    <p className={styles.menuTitle}>{t('layout_menu')}</p>
                    <p className={styles.menuSection}>{t('layout_windows')}</p>
                    {panelRows.map((row) => {
                        const visible = isPanelVisible(row.id);
                        return (
                            <div key={row.id} className={styles.row}>
                                <label className={styles.visibilityToggle}>
                                    <input
                                        type="checkbox"
                                        checked={visible}
                                        onChange={() => onTogglePanel(row.id)}
                                    />
                                    <span>{row.label}</span>
                                </label>
                                <button
                                    type="button"
                                    className={styles.floatBtn}
                                    disabled={!visible}
                                    title={t('float_panel')}
                                    onClick={() => onFloatPanel(row.id)}
                                >
                                    {t('float_panel')}
                                </button>
                            </div>
                        );
                    })}
                    <p className={styles.menuSection}>{t('layout_tabs')}</p>
                    {tabRows.map((row) => {
                        const visible = isTabVisible(row.id);
                        return (
                            <div key={row.id} className={styles.row}>
                                <label className={styles.visibilityToggle}>
                                    <input
                                        type="checkbox"
                                        checked={visible}
                                        onChange={() => onToggleTab(row.id)}
                                    />
                                    <span>{row.label}</span>
                                </label>
                            </div>
                        );
                    })}
                    <button
                        type="button"
                        className={styles.resetBtn}
                        onClick={() => {
                            onReset();
                            setOpen(false);
                        }}
                    >
                        <LuRotateCcw />
                        <span>{t('layout_reset')}</span>
                    </button>
                </div>
            )}
        </div>
    );
}
