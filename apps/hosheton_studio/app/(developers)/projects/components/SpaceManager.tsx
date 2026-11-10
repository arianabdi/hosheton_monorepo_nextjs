'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { LuFolderPlus, LuX } from 'react-icons/lu';
import { formatAppNumber } from '@/app/lib/i18n/formatLocaleNumber';
import { getApiErrorMessage } from '../lib/api-client';
import { mediaApi } from '../lib/media-api';
import type { MediaSpace } from '../types/media-api';
import styles from './SpaceManager.module.scss';

interface SpaceManagerProps {
    spaces: MediaSpace[];
    onSpacesChange: () => void;
    /** فقط آیکون (مربع ۳۸px، بدون متن) — هدر فشردهٔ صفحهٔ پروژه‌ها */
    iconOnly?: boolean;
}

export function SpaceManager({ spaces, onSpacesChange, iconOnly = false }: SpaceManagerProps) {
    const { t, i18n } = useTranslation('projects');
    const { t: tc } = useTranslation('common');
    const [open, setOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    const closeModal = useCallback(() => {
        if (saving) return;
        setOpen(false);
        setError(null);
    }, [saving]);

    useEffect(() => {
        if (!open) return;

        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closeModal();
        };
        window.addEventListener('keydown', onKeyDown);

        return () => {
            document.body.style.overflow = prevOverflow;
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [open, closeModal]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || saving) return;

        setSaving(true);
        setError(null);
        try {
            await mediaApi.createSpace({
                name: name.trim(),
                description: description.trim(),
            });
            setName('');
            setDescription('');
            onSpacesChange();
        } catch (err) {
            setError(getApiErrorMessage(err, t('create_space_error')));
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <button
                type="button"
                className={`${styles.toggleBtn} ${iconOnly ? styles.toggleBtnIconOnly : ''}`}
                onClick={() => setOpen(true)}
                title={t('manage_spaces')}
                aria-label={t('manage_spaces')}
            >
                <LuFolderPlus size={16} />
                <span className={styles.toggleLabel}>{t('manage_spaces')}</span>
            </button>

            {mounted && open && createPortal(
                <div className={styles.modalOverlay} onClick={closeModal} role="presentation">
                    <div
                        className={styles.modal}
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="space-manager-title"
                    >
                        <div className={styles.modalHeader}>
                            <div>
                                <h2 id="space-manager-title">{t('spaces_title')}</h2>
                                <p>{t('spaces_desc')}</p>
                            </div>
                            <button
                                type="button"
                                className={styles.closeBtn}
                                onClick={closeModal}
                                aria-label={tc('close')}
                                disabled={saving}
                            >
                                <LuX size={20} />
                            </button>
                        </div>

                        <div className={styles.modalBody}>
                            {spaces.length > 0 ? (
                                <ul className={styles.spaceList}>
                                    {spaces.map((space) => (
                                        <li key={space._id}>
                                            <div>
                                                <span className={styles.spaceName}>{space.name}</span>
                                                {space.description ? (
                                                    <span className={styles.spaceDesc}>{space.description}</span>
                                                ) : null}
                                            </div>
                                            <span className={styles.spaceCount}>{t('space_count', { count: formatAppNumber(space.projectCount ?? 0, i18n.language) })}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className={styles.emptyState}>
                                    {t('no_spaces')}
                                </div>
                            )}

                            <form className={styles.form} onSubmit={handleCreate}>
                                <h3 className={styles.formTitle}>{t('add_space_title')}</h3>
                                <div className={styles.field}>
                                    <label htmlFor="space-name">{t('space_name')}</label>
                                    <input
                                        id="space-name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder={t('space_name_ph')}
                                        disabled={saving}
                                        required
                                    />
                                </div>
                                <div className={styles.field}>
                                    <label htmlFor="space-desc">{tc('description')}</label>
                                    <textarea
                                        id="space-desc"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        rows={2}
                                        placeholder={t('space_desc_ph')}
                                        disabled={saving}
                                    />
                                </div>
                                {error && <p className={styles.error}>{error}</p>}
                                <div className={styles.formActions}>
                                    <button type="submit" className={styles.submitBtn} disabled={saving || !name.trim()}>
                                        {saving ? tc('saving') : t('add_space')}
                                    </button>
                                    <button type="button" className={styles.cancelBtn} onClick={closeModal} disabled={saving}>
                                        {tc('close')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>,
                document.body,
            )}
        </>
    );
}
