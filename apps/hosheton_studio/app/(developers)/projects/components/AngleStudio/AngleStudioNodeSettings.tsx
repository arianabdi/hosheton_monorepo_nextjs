'use client';

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LuMaximize2 } from 'react-icons/lu';
import { useConnectedImageMentions } from '../../[projectId]/components/CustomNodes/useConnectedImageMentions';
import type { StudioNodeData } from '../../[projectId]/types/studio';
import {
    defaultAngleStudioState,
    isAngleStudioOn,
    readAngleStudioState,
    withResolvedShots,
    type AngleStudioState,
} from '../../lib/angle-studio';
import { useAngleStudioMode } from '../../lib/useAngleStudioMode';
import AngleStudioPanel from './AngleStudioPanel';
import AngleStudioDialog from './AngleStudioDialog';
import { AngleStudioGlyph } from './AngleStudioGlyph';
import styles from './AngleStudioNodeSettings.module.scss';

/**
 * بخش «زاویه و نور» در سایدبار تنظیمات نود تولید عکس — همان پنل چت (AngleStudioPanel)
 * با دیتای نود. روشن/خاموش روی همان نود؛ پنجرهٔ بزرگ همان پنجرهٔ چت است.
 */
export default function AngleStudioNodeSettings({
    nodeId,
    nodeData,
    readOnly,
    onPatch,
}: {
    nodeId: string;
    nodeData: StudioNodeData;
    readOnly: boolean;
    onPatch: (patch: Partial<StudioNodeData>) => void;
}) {
    const { t } = useTranslation('projects');
    const [dialogOpen, setDialogOpen] = useState(false);
    const modelId = String(nodeData.modelId || '');
    const { mode, loaded, config } = useAngleStudioMode(modelId, Boolean(modelId));
    const on = isAngleStudioOn(nodeData.angleStudio);
    const state = useMemo<AngleStudioState>(
        () => readAngleStudioState(nodeData.angleStudio) || { ...defaultAngleStudioState(), enabled: false },
        [nodeData.angleStudio],
    );
    const source = useConnectedImageMentions(nodeId)[0];
    const sourceUrl = source ? String(source.thumbnailUrlLarge || source.thumbnailUrl || source.url || '') || undefined : undefined;

    const save = (next: AngleStudioState) => {
        onPatch({ angleStudio: withResolvedShots(next, config) as unknown as Record<string, unknown> });
    };

    // مدل انتخاب نشده یا ابزار برای این مدل نیست و خاموش است: چیزی نشان نده
    if (!on && (!modelId || !loaded || !mode)) return null;

    if (!on) {
        return (
            <div className={styles.section}>
                <label className={styles.toggleRow}>
                    <span className={styles.toggleText}>
                        <AngleStudioGlyph size={16} />
                        <span>
                            <span className={styles.toggleTitle}>{t('angle_studio_title')}</span>
                            <span className={styles.toggleHint}>{t('angle_node_toggle_hint')}</span>
                        </span>
                    </span>
                    <input
                        type="checkbox"
                        className={styles.switch}
                        checked={false}
                        disabled={readOnly}
                        onChange={() => save({ ...state, enabled: true })}
                    />
                </label>
            </div>
        );
    }

    const unsupported = Boolean(modelId) && loaded && !mode;

    return (
        <div className={styles.section}>
            <div className={styles.head}>
                <span className={styles.headTitle}>
                    <AngleStudioGlyph size={16} />
                    {t('angle_studio_title')}
                </span>
                <span className={styles.headActions}>
                    <button
                        type="button"
                        className={styles.iconBtn}
                        title={t('angle_open_large')}
                        aria-label={t('angle_open_large')}
                        onClick={() => setDialogOpen(true)}
                    >
                        <LuMaximize2 size={14} />
                    </button>
                    <input
                        type="checkbox"
                        className={styles.switch}
                        checked
                        disabled={readOnly}
                        aria-label={t('angle_turn_off')}
                        onChange={() => save({ ...state, enabled: false })}
                    />
                </span>
            </div>
            {unsupported ? <p className={styles.warning}>{t('angle_model_unsupported')}</p> : null}
            {!modelId ? <p className={styles.hint}>{t('angle_pick_model')}</p> : null}
            {!sourceUrl ? <p className={styles.hint}>{t('angle_node_connect_image')}</p> : null}
            <AngleStudioPanel
                value={state}
                config={config}
                imageUrl={sourceUrl}
                disabled={readOnly}
                compact
                onChange={save}
            />
            {dialogOpen ? (
                <AngleStudioDialog
                    open
                    value={state}
                    config={config}
                    imageUrl={sourceUrl}
                    disabled={readOnly}
                    onChange={save}
                    onTurnOff={() => save({ ...state, enabled: false })}
                    onClose={() => setDialogOpen(false)}
                />
            ) : null}
        </div>
    );
}
