'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { LuLoader } from 'react-icons/lu';
import { SuccessToaster } from '@my-workspace/utils';
import { notifyError } from '@/app/lib/errors';
import { aiAvatarApi } from '@/app/(developers)/projects/lib/ai-avatar-api';
import type { AiAvatarProfile } from '@/app/(developers)/projects/types/ai-avatar-api';
import { cardProfileFromAvatar } from '../avatar-card-profile';
import {
    avatarToAssetImages,
    avatarToCardPortrait,
    portraitPreviewUrl,
    portraitToPayload,
    sheetImagesToSourcePayload,
} from '../avatar-form-utils';
import { AVATAR_PLATFORM_META, normalizeAvatarPlatform } from '../avatar-platform';
import { AvatarActivationStepper } from './AvatarActivationStepper';
import { AvatarForm, type AvatarFormValues } from './AvatarForm';
import { AvatarIdCardFace } from './AvatarIdCardFace';
import { AvatarWorkflowActions } from './AvatarWorkflowActions';
import styles from '../avatars.module.scss';

function buildPreviewAvatar(base: AiAvatarProfile, values: AvatarFormValues): AiAvatarProfile {
    const portraitUrl = portraitPreviewUrl(values.cardPortrait);

    const editableUrls = values.assetImages
        .filter((img) => !img.readOnly)
        .map((img) => img.externalUrl || img.previewUrl)
        .filter(Boolean) as string[];

    return {
        ...base,
        name: values.name,
        description: values.description,
        previewImageUrl: portraitUrl || base.previewImageUrl,
        sourceImageUrls: editableUrls.length ? editableUrls : base.sourceImageUrls,
        cardProfile: {
            sex: values.cardProfile.sex,
            hair: values.cardProfile.hair,
            eyes: values.cardProfile.eyes,
            height: values.cardProfile.height,
            weightLb: values.cardProfile.weightLb,
            dob: values.cardProfile.dob,
        },
    };
}

interface AvatarDetailPanelProps {
    avatarId: string;
    compact?: boolean;
    onAvatarUpdated?: (avatar: AiAvatarProfile) => void;
}

export function AvatarDetailPanel({ avatarId, compact, onAvatarUpdated }: AvatarDetailPanelProps) {
    const { t } = useTranslation('avatars');
    const { t: tc } = useTranslation('common');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [avatar, setAvatar] = useState<AiAvatarProfile | null>(null);
    const [formPreview, setFormPreview] = useState<AvatarFormValues | null>(null);

    const load = useCallback(async () => {
        if (!avatarId) return;
        setLoading(true);
        try {
            const data = await aiAvatarApi.getAvatar(avatarId);
            setAvatar(data);
            setFormPreview(null);
        } catch (e) {
            notifyError(e);
        } finally {
            setLoading(false);
        }
    }, [avatarId]);

    useEffect(() => {
        setAvatar(null);
        setFormPreview(null);
        load();
    }, [load]);

    const handleSave = async (values: AvatarFormValues) => {
        setSaving(true);
        try {
            const { sourceFileKeys, sourceImageUrls } = sheetImagesToSourcePayload(values.assetImages);
            const portrait = portraitToPayload(values.cardPortrait, {
                omitWhenEmpty: true,
                clearWhenEmpty: values.portraitCleared && !values.cardPortrait,
            });

            const updated = await aiAvatarApi.updateAvatar(avatarId, {
                name: values.name,
                description: values.description,
                sourceFileKeys,
                sourceImageUrls,
                ...portrait,
                cardSex: values.cardProfile.sex,
                cardHair: values.cardProfile.hair,
                cardEyes: values.cardProfile.eyes,
                cardHeight: values.cardProfile.height,
                cardWeightLb: values.cardProfile.weightLb,
                cardDob: values.cardProfile.dob,
            });
            setAvatar(updated);
            onAvatarUpdated?.(updated);
            SuccessToaster({ message: t('saved') });
        } catch (e) {
            notifyError(e);
        } finally {
            setSaving(false);
        }
    };

    const handleValuesChange = useCallback((values: AvatarFormValues) => {
        if (!compact) {
            setFormPreview(values);
        }
    }, [compact]);

    const previewAvatar = useMemo(() => {
        if (compact || !avatar) return avatar;
        if (!formPreview) return avatar;
        return buildPreviewAvatar(avatar, formPreview);
    }, [avatar, formPreview, compact]);

    const platform = avatar ? normalizeAvatarPlatform(avatar.platform) : null;
    const platformMeta = platform ? AVATAR_PLATFORM_META[platform] : null;

    const formInitial = avatar && platform ? {
        name: avatar.name,
        description: avatar.description ?? '',
        platform,
        cardPortrait: avatarToCardPortrait(avatar),
        portraitCleared: false,
        assetImages: avatarToAssetImages(avatar),
        cardProfile: cardProfileFromAvatar(avatar),
    } : null;

    if (compact) {
        return (
            <div className={styles.detailInfoCard}>
                {loading ? (
                    <div className={styles.detailInfoCardLoading}>
                        <LuLoader className={styles.spin} /> {tc('loading')}
                    </div>
                ) : !avatar || !formInitial ? (
                    <p className={styles.detailEmpty}>{t('not_found')}</p>
                ) : (
                    <>
                        {avatar.failureReason && (
                            <div className={styles.errorBox}>{avatar.failureReason}</div>
                        )}

                        <div className={styles.detailFlow}>
                            <section className={styles.detailSection}>
                                <AvatarActivationStepper status={avatar.status} />
                            </section>

                            <div className={styles.detailSectionDivider} />

                            <section className={styles.detailSection}>
                                <div className={styles.detailSectionHead}>
                                    <h3 className={styles.detailSectionTitle}>{t('character_info')}</h3>
                                    <p className={styles.detailSectionDesc}>
                                        {t('character_info_desc')}
                                    </p>
                                </div>
                                <AvatarForm
                                    mode="edit"
                                    embedded
                                    initial={formInitial}
                                    key={`${avatar._id}-${avatar.updatedAt ?? ''}`}
                                    saving={saving}
                                    onSubmit={handleSave}
                                />
                            </section>

                            <div className={styles.detailSectionDivider} />

                            <section className={styles.detailSection}>
                                <div className={styles.detailSectionHead}>
                                    <h3 className={styles.detailSectionTitle}>{t('activate_verify')}</h3>
                                    <p className={styles.detailSectionDesc}>
                                        {t('activate_verify_desc')}
                                    </p>
                                </div>
                                <AvatarWorkflowActions avatar={avatar} onRefresh={load} />
                            </section>
                        </div>
                    </>
                )}
            </div>
        );
    }

    if (loading) {
        return (
            <div className={styles.detailLoading}>
                <LuLoader className={styles.spin} /> {tc('loading')}
            </div>
        );
    }

    if (!avatar || !formInitial || !platformMeta) {
        return <p className={styles.detailEmpty}>{t('not_found')}</p>;
    }

    return (
        <div className={styles.detailPanel}>
            <header className={styles.editTopBar}>
                <div className={styles.editTopBarStart}>
                    <div className={styles.detailTitleRow}>
                        <h2 className={styles.detailTitle}>{avatar.name}</h2>
                        <span
                            className={styles.detailPlatformBadge}
                            style={{ ['--platform-accent' as string]: platformMeta.accent }}
                        >
                            {platformMeta.label}
                        </span>
                    </div>
                    <p className={styles.detailSubtitle}>
                        {t('manage_subtitle')}
                    </p>
                </div>
                {avatar.status === 'active' && (
                    <Link href="/projects" className={styles.primaryBtn}>
                        {t('use_in_project')}
                    </Link>
                )}
            </header>

            <div className={styles.editGrid}>
                <aside className={styles.editPreview}>
                    <p className={styles.editPreviewLabel}>Card preview</p>
                    <AvatarIdCardFace avatar={previewAvatar ?? avatar} className={styles.idCardDetail} />
                    {avatar.failureReason && (
                        <div className={styles.errorBox}>{avatar.failureReason}</div>
                    )}
                </aside>

                <div className={styles.editMain}>
                    <section className={styles.panel}>
                        <AvatarActivationStepper status={avatar.status} />
                    </section>

                    <section className={styles.panel}>
                        <div className={styles.panelHead}>
                            <h3 className={styles.panelTitle}>{t('character_info')}</h3>
                            <p className={styles.panelDesc}>
                                {t('character_info_desc')}
                            </p>
                        </div>
                        <AvatarForm
                            mode="edit"
                            embedded
                            initial={formInitial}
                            key={`${avatar._id}-${avatar.updatedAt ?? ''}`}
                            saving={saving}
                            onSubmit={handleSave}
                            onValuesChange={handleValuesChange}
                        />
                    </section>

                    <section className={styles.panel}>
                        <div className={styles.panelHead}>
                            <h3 className={styles.panelTitle}>{t('activate_verify')}</h3>
                            <p className={styles.panelDesc}>
                                {t('activate_verify_desc_full')}
                            </p>
                        </div>
                        <AvatarWorkflowActions avatar={avatar} onRefresh={load} />
                    </section>
                </div>
            </div>
        </div>
    );
}
