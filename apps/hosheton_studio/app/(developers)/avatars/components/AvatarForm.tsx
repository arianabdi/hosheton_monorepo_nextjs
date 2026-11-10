'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LuLoader, LuUserCheck } from 'react-icons/lu';
import { notifyError } from '@/app/lib/errors';
import type { AiAvatarPlatform } from '@/app/(developers)/projects/types/ai-avatar-api';
import {
    CARD_EYES_OPTIONS,
    CARD_HAIR_OPTIONS,
    type AvatarCardProfileForm,
} from '../avatar-card-profile';
import { AVATAR_PLATFORM_META } from '../avatar-platform';
import { CharacterSheetUpload, type CharacterSheetImage } from './CharacterSheetUpload';
import styles from '../avatars.module.scss';

const PLATFORMS: AiAvatarPlatform[] = ['seedance', 'byteplus'];

export interface AvatarFormValues {
    name: string;
    description: string;
    platform: AiAvatarPlatform;
    cardPortrait: CharacterSheetImage | null;
    portraitCleared: boolean;
    assetImages: CharacterSheetImage[];
    cardProfile: AvatarCardProfileForm;
}

interface AvatarFormProps {
    mode: 'create' | 'edit';
    initial: AvatarFormValues;
    saving?: boolean;
    embedded?: boolean;
    onSubmit: (values: AvatarFormValues) => Promise<void>;
    onCancel?: () => void;
    onValuesChange?: (values: AvatarFormValues) => void;
}

export function AvatarForm({
    mode,
    initial,
    saving,
    embedded,
    onSubmit,
    onCancel,
    onValuesChange,
}: AvatarFormProps) {
    const { t } = useTranslation('avatars');
    const { t: tc } = useTranslation('common');
    const [name, setName] = useState(initial.name);
    const [description, setDescription] = useState(initial.description);
    const [platform, setPlatform] = useState(initial.platform);
    const [cardPortrait, setCardPortrait] = useState<CharacterSheetImage | null>(initial.cardPortrait);
    const [portraitCleared, setPortraitCleared] = useState(initial.portraitCleared ?? false);
    const [assetImages, setAssetImages] = useState(initial.assetImages);
    const [cardProfile, setCardProfile] = useState(initial.cardProfile);
    const [uploadingPortrait, setUploadingPortrait] = useState(false);
    const [uploadingAssets, setUploadingAssets] = useState(false);

    useEffect(() => {
        onValuesChange?.({
            name,
            description,
            platform,
            cardPortrait,
            portraitCleared,
            assetImages,
            cardProfile,
        });
    }, [name, description, platform, cardPortrait, portraitCleared, assetImages, cardProfile, onValuesChange]);

    const patchProfile = (patch: Partial<AvatarCardProfileForm>) => {
        setCardProfile((prev) => ({ ...prev, ...patch }));
    };

    const countEditableAssets = (images: CharacterSheetImage[]) =>
        images.filter((img) => !img.readOnly).length;

    const handleSubmit = async () => {
        if (!name.trim()) {
            notifyError(new Error(t('name_required')));
            return;
        }

        const editableAssets = assetImages.filter((img) => !img.readOnly);
        const assetFileKeys = editableAssets.map((img) => img.fileKey).filter(Boolean);
        const assetUrls = editableAssets
            .filter((img) => !img.fileKey)
            .map((img) => img.externalUrl || img.previewUrl)
            .filter(Boolean);

        if (!assetFileKeys.length && !assetUrls.length) {
            notifyError(new Error(t('asset_required')));
            return;
        }

        if (!cardProfile.dob.trim()) {
            notifyError(new Error(t('dob_required')));
            return;
        }

        await onSubmit({
            name: name.trim(),
            description: description.trim(),
            platform,
            cardPortrait,
            portraitCleared,
            assetImages,
            cardProfile,
        });
    };

    const body = (
        <>
            {!embedded && (
                <h2 className={styles.cardTitle}>
                    {mode === 'create' ? t('new_character') : t('edit_character')}
                </h2>
            )}

            {mode === 'create' && (
                <>
                    <div className={styles.panelHead}>
                        <p className={styles.panelDesc}>
                            {t('platform_once')}
                        </p>
                    </div>
                    <div className={styles.platformPicker}>
                        {PLATFORMS.map((p) => {
                            const meta = AVATAR_PLATFORM_META[p];
                            const selected = platform === p;
                            return (
                                <button
                                    key={p}
                                    type="button"
                                    className={`${styles.platformOption} ${selected ? styles.platformOptionActive : ''}`}
                                    style={{ ['--platform-accent' as string]: meta.accent }}
                                    onClick={() => setPlatform(p)}
                                >
                                    <span className={styles.platformOptionMark}>{meta.short}</span>
                                    <span>{meta.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </>
            )}

            {mode === 'edit' && embedded && (
                <div className={styles.readonlyPlatform}>
                    <span className={styles.label}>{t('platform')}</span>
                    <span
                        className={styles.readonlyPlatformBadge}
                        style={{ ['--platform-accent' as string]: AVATAR_PLATFORM_META[platform].accent }}
                    >
                        {AVATAR_PLATFORM_META[platform].label}
                    </span>
                    <p className={styles.fieldHelp}>{t('platform_locked')}</p>
                </div>
            )}

            {mode === 'edit' && !embedded && (
                <>
                    <div className={styles.platformPicker}>
                        {PLATFORMS.map((p) => {
                            const meta = AVATAR_PLATFORM_META[p];
                            const selected = platform === p;
                            return (
                                <button
                                    key={p}
                                    type="button"
                                    className={`${styles.platformOption} ${selected ? styles.platformOptionActive : ''}`}
                                    style={{ ['--platform-accent' as string]: meta.accent }}
                                    disabled
                                    onClick={() => setPlatform(p)}
                                >
                                    <span className={styles.platformOptionMark}>{meta.short}</span>
                                    <span>{meta.label}</span>
                                </button>
                            );
                        })}
                    </div>
                    <p className={styles.formHint}>{t('platform_locked')}</p>
                </>
            )}

            <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="avatar-name">
                    {t('character_name')}
                </label>
                <p className={styles.fieldHelp}>{t('name_split_full')}</p>
                <input
                    id="avatar-name"
                    className={styles.input}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('name_ph')}
                />
            </div>

            <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="avatar-desc">
                    {t('desc_optional')}
                </label>
                <textarea
                    id="avatar-desc"
                    className={styles.textarea}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t('notes_ph')}
                />
            </div>

            <div className={`${styles.fieldGroup} ${styles.mediaSection}`}>
                <span className={styles.sectionLabel}>{t('portrait')}</span>
                <p className={styles.fieldHelp}>
                    {t('portrait_help')}
                </p>
                <CharacterSheetUpload
                    images={cardPortrait ? [cardPortrait] : []}
                    onChange={(imgs) => {
                        const next = imgs[0] ?? null;
                        setCardPortrait(next);
                        setPortraitCleared(!next);
                    }}
                    onUploadingChange={setUploadingPortrait}
                    multiple={false}
                    maxImages={1}
                    dropzoneLabel={t('upload_portrait')}
                />
            </div>

            <div className={`${styles.fieldGroup} ${styles.mediaSection}`}>
                <span className={styles.sectionLabel}>{t('assets_section')}</span>
                <p className={styles.fieldHelp}>
                    {t('assets_help')}
                </p>
                <CharacterSheetUpload
                    images={assetImages}
                    onChange={setAssetImages}
                    onUploadingChange={setUploadingAssets}
                    showProviderBadge
                    dropzoneLabel={t('dropzone_asset')}
                />
                {countEditableAssets(assetImages) === 0 && assetImages.some((i) => i.readOnly) && (
                    <p className={styles.fieldHelp}>
                        {t('assets_readonly_help')}
                    </p>
                )}
            </div>

            <div className={styles.fieldGroup}>
                <span className={styles.label}>{t('card_specs')}</span>
                <p className={styles.fieldHelp}>
                    {t('card_specs_help')}
                </p>
                <div className={styles.profileGrid}>
                    <div className={styles.profileField}>
                        <label className={styles.profileLabel} htmlFor="card-sex">
                            SEX
                        </label>
                        <select
                            id="card-sex"
                            className={styles.input}
                            value={cardProfile.sex}
                            onChange={(e) => patchProfile({ sex: e.target.value as AvatarCardProfileForm['sex'] })}
                        >
                            <option value="M">M</option>
                            <option value="F">F</option>
                        </select>
                    </div>
                    <div className={styles.profileField}>
                        <label className={styles.profileLabel} htmlFor="card-hair">
                            HAIR
                        </label>
                        <select
                            id="card-hair"
                            className={styles.input}
                            value={cardProfile.hair}
                            onChange={(e) => patchProfile({ hair: e.target.value as AvatarCardProfileForm['hair'] })}
                        >
                            {CARD_HAIR_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                    {o.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className={styles.profileField}>
                        <label className={styles.profileLabel} htmlFor="card-eyes">
                            EYES
                        </label>
                        <select
                            id="card-eyes"
                            className={styles.input}
                            value={cardProfile.eyes}
                            onChange={(e) => patchProfile({ eyes: e.target.value as AvatarCardProfileForm['eyes'] })}
                        >
                            {CARD_EYES_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                    {o.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className={styles.profileField}>
                        <label className={styles.profileLabel} htmlFor="card-hgt">
                            HGT
                        </label>
                        <input
                            id="card-hgt"
                            className={styles.input}
                            value={cardProfile.height}
                            onChange={(e) => patchProfile({ height: e.target.value })}
                            placeholder={`5'10"`}
                        />
                    </div>
                    <div className={styles.profileField}>
                        <label className={styles.profileLabel} htmlFor="card-wgt">
                            WGT (lb)
                        </label>
                        <input
                            id="card-wgt"
                            type="number"
                            min={50}
                            max={500}
                            className={styles.input}
                            value={cardProfile.weightLb}
                            onChange={(e) =>
                                patchProfile({ weightLb: Number(e.target.value) || 0 })
                            }
                        />
                    </div>
                    <div className={styles.profileField}>
                        <label className={styles.profileLabel} htmlFor="card-dob">
                            DOB
                        </label>
                        <input
                            id="card-dob"
                            className={styles.input}
                            value={cardProfile.dob}
                            onChange={(e) => patchProfile({ dob: e.target.value })}
                            placeholder="MM/DD/YYYY"
                        />
                    </div>
                </div>
            </div>

            <div className={styles.formActions}>
                <button
                    type="button"
                    className={styles.primaryBtn}
                    disabled={saving || uploadingPortrait || uploadingAssets}
                    onClick={() => void handleSubmit()}
                >
                    {saving ? <LuLoader className={styles.spin} /> : <LuUserCheck />}
                    {mode === 'create' ? t('register') : t('save_changes')}
                </button>
                {onCancel && (
                    <button type="button" className={styles.secondaryBtn} onClick={onCancel}>
                        {tc('cancel')}
                    </button>
                )}
            </div>
        </>
    );

    if (embedded) {
        return <div className={styles.formEmbedded}>{body}</div>;
    }

    return <div className={styles.formCard}>{body}</div>;
}
