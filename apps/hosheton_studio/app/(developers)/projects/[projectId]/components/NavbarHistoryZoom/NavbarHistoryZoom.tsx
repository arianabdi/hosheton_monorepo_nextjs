'use client';

import { LuMinus, LuPlus, LuRotateCcw, LuRotateCw } from 'react-icons/lu';
import { useTranslation } from 'react-i18next';
import { formatAppNumber } from '@/app/lib/i18n/formatLocaleNumber';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import styles from './NavbarHistoryZoom.module.scss';

interface NavbarHistoryZoomProps {
    canUndo: boolean;
    canRedo: boolean;
    zoomPercent: number;
    onUndo: () => void;
    onRedo: () => void;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onZoomReset: () => void;
}

export function NavbarHistoryZoom({
    canUndo,
    canRedo,
    zoomPercent,
    onUndo,
    onRedo,
    onZoomIn,
    onZoomOut,
    onZoomReset,
}: NavbarHistoryZoomProps) {
    const { t } = useTranslation('projects');
    const lang = useAppStore((s) => s.lang);
    const zoomLabel = formatAppNumber(zoomPercent, lang);

    return (
        <div className={styles.root}>
            <button
                type="button"
                className={styles.toolBtn}
                title={t('undo_ctrl')}
                aria-label={t('undo')}
                onClick={onUndo}
                disabled={!canUndo}
            >
                <LuRotateCcw />
            </button>

            <button
                type="button"
                className={styles.toolBtn}
                title={t('redo_ctrl')}
                aria-label={t('redo')}
                onClick={onRedo}
                disabled={!canRedo}
            >
                <LuRotateCw />
            </button>

            <div className={styles.zoomControls}>
                <button
                    type="button"
                    className={styles.zoomBtn}
                    title={t('zoom_out')}
                    aria-label={t('zoom_out')}
                    onClick={onZoomOut}
                >
                    <LuMinus />
                </button>

                <button
                    type="button"
                    className={styles.zoomLabel}
                    title={t('zoom_reset')}
                    aria-label={t('zoom_in_pct', { percent: zoomLabel })}
                    onClick={onZoomReset}
                    style={{ direction: 'ltr' }}
                >
                    {t('percent', { value: zoomLabel })}
                </button>

                <button
                    type="button"
                    className={styles.zoomBtn}
                    title={t('zoom_in')}
                    aria-label={t('zoom_in')}
                    onClick={onZoomIn}
                >
                    <LuPlus />
                </button>
            </div>
        </div>
    );
}
