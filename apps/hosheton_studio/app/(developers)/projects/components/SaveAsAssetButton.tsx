'use client';

import { useState } from 'react';
import { LuBookmarkPlus } from 'react-icons/lu';
import { useTranslation } from 'react-i18next';
import { studioAssetsApi, type StudioAssetType } from '../lib/studio-assets-api';
import { getApiErrorMessage } from '../lib/api-client';
import styles from './NodeSettingsPanel.module.scss';

interface SaveAsAssetButtonProps {
    type: StudioAssetType;
    payload: Record<string, unknown>;
    disabled?: boolean;
    label?: string;
}

export function SaveAsAssetButton({ type, payload, disabled, label }: SaveAsAssetButtonProps) {
    const { t } = useTranslation('projects');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [savedOk, setSavedOk] = useState(false);

    const handleSave = async () => {
        const defaultName = t(type);
        const name = window.prompt(t('asset_name_prompt'), defaultName);
        if (!name?.trim()) return;

        setSaving(true);
        setMessage(null);
        setSavedOk(false);
        try {
            await studioAssetsApi.create({
                type,
                name: name.trim(),
                payload: payload as never,
            });
            setMessage(t('save_ok'));
            setSavedOk(true);
        } catch (err) {
            setMessage(getApiErrorMessage(err, t('save_err')));
            setSavedOk(false);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={styles.fieldGroup}>
            <button
                type="button"
                className={styles.runNodeBtn}
                style={{ background: 'transparent', color: 'inherit', border: '1px dashed var(--input-border-color)' }}
                disabled={disabled || saving}
                onClick={handleSave}
            >
                <LuBookmarkPlus /> {label || t('save_as_asset')}
            </button>
            {message && (
                <p className={styles.matrixHint} style={{ color: savedOk ? 'var(--brand-color)' : '#ff4757' }}>
                    {message}
                </p>
            )}
        </div>
    );
}
