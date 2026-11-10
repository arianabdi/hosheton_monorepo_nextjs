'use client';

import { useTranslation } from 'react-i18next';
import { ModalHelper } from '@my-workspace/components';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { formatAppNumber } from '@/app/lib/i18n/formatLocaleNumber';
import {
    resolveAngleShots,
    type AngleStudioConfig,
    type AngleStudioState,
} from '../../lib/angle-studio';
import AngleStudioPanel from './AngleStudioPanel';
import AnglePreviewStage from './AnglePreviewStage';
import { AngleStudioGlyph } from './AngleStudioGlyph';
import styles from './AngleStudio.module.scss';

function DialogContent({
    value,
    config,
    imageUrl,
    disabled,
    onChange,
    onTurnOff,
    onDone,
}: {
    value: AngleStudioState;
    config: AngleStudioConfig;
    imageUrl?: string;
    disabled?: boolean;
    onChange: (next: AngleStudioState) => void;
    onTurnOff: () => void;
    onDone: () => void;
}) {
    const { t } = useTranslation('projects');
    const lang = useAppStore((s) => s.lang);
    const shots = resolveAngleShots(value, config);
    return (
        <div className={styles.dialog}>
            <header className={styles.dialogHeader}>
                <span className={styles.dialogIcon} aria-hidden><AngleStudioGlyph size={18} /></span>
                <div className={styles.dialogTitles}>
                    <h2 className={styles.dialogTitle}>{t('angle_studio_title')}</h2>
                    <p className={styles.dialogSubtitle}>{t('angle_studio_subtitle')}</p>
                </div>
            </header>
            <div className={styles.dialogBody}>
                {/* نمای در حال ویرایش (در چند نما، state.camera/light همان نمای انتخاب‌شده است) */}
                <AnglePreviewStage imageUrl={imageUrl} camera={value.camera} light={value.light} />
                <AngleStudioPanel
                    value={value}
                    config={config}
                    imageUrl={imageUrl}
                    disabled={disabled}
                    onChange={onChange}
                />
            </div>
            <footer className={styles.dialogFooter}>
                <button type="button" className={styles.ghostBtn} onClick={onTurnOff} disabled={disabled}>
                    {t('angle_turn_off')}
                </button>
                <span className={styles.footerMeta}>
                    {t('angle_outputs_count', { n: formatAppNumber(shots.length, lang) })}
                </span>
                <button type="button" className={styles.primaryBtn} onClick={onDone}>
                    {t('angle_done')}
                </button>
            </footer>
        </div>
    );
}

/** پنجرهٔ کامل «زاویه و نور» (چت و نود) — پیش‌نمایش + پنل کنترل */
export default function AngleStudioDialog({
    open,
    value,
    config,
    imageUrl,
    disabled,
    onChange,
    onTurnOff,
    onClose,
}: {
    open: boolean;
    value: AngleStudioState;
    config: AngleStudioConfig;
    imageUrl?: string;
    disabled?: boolean;
    onChange: (next: AngleStudioState) => void;
    onTurnOff: () => void;
    onClose: () => void;
}) {
    const { t } = useTranslation('projects');
    return (
        <ModalHelper
            open={open}
            onClose={onClose}
            size="lg"
            sheetTitle={t('angle_studio_title')}
            component={open ? (
                <DialogContent
                    value={value}
                    config={config}
                    imageUrl={imageUrl}
                    disabled={disabled}
                    onChange={onChange}
                    onTurnOff={() => {
                        onTurnOff();
                        onClose();
                    }}
                    onDone={onClose}
                />
            ) : null}
        />
    );
}
