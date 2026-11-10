'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SuccessToaster } from '@my-workspace/utils';
import { notifyError } from '@/app/lib/errors';
import { aiAvatarApi } from '@/app/(developers)/projects/lib/ai-avatar-api';
import { deriveCardMetricsFromId } from '../avatar-card-profile';
import { portraitToPayload, sheetImagesToSourcePayload } from '../avatar-form-utils';
import { AvatarForm, type AvatarFormValues } from '../components/AvatarForm';
import styles from '../avatars.module.scss';

export default function NewAvatarPage() {
    const { t } = useTranslation('avatars');
    const router = useRouter();
    const [creating, setCreating] = useState(false);

    const handleCreate = async (values: AvatarFormValues) => {
        const { sourceFileKeys, sourceImageUrls } = sheetImagesToSourcePayload(values.assetImages);
        const portrait = portraitToPayload(values.cardPortrait);

        setCreating(true);
        try {
            const avatar = await aiAvatarApi.createAvatar({
                name: values.name,
                platform: values.platform,
                description: values.description || undefined,
                sourceFileKeys: sourceFileKeys.length ? sourceFileKeys : undefined,
                sourceImageUrls: sourceImageUrls.length ? sourceImageUrls : undefined,
                ...portrait,
                cardSex: values.cardProfile.sex,
                cardHair: values.cardProfile.hair,
                cardEyes: values.cardProfile.eyes,
                cardHeight: values.cardProfile.height,
                cardWeightLb: values.cardProfile.weightLb,
                cardDob: values.cardProfile.dob,
            });
            SuccessToaster({ message: t('created') });
            router.push(`/avatars/${avatar._id}`);
        } catch (e) {
            notifyError(e);
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className={`${styles.avatarsPage} ${styles.avatarsPageFull}`}>
            <div className={styles.editTopBar}>
                <Link href="/avatars" className={styles.backLink}>
                    {t('back_to_list')}
                </Link>
                <h1 className={styles.editTitle}>{t('new')}</h1>
            </div>
            <div className={styles.editMain} style={{ maxWidth: 640 }}>
                <AvatarForm
                    mode="create"
                    initial={{
                        name: '',
                        description: '',
                        platform: 'seedance',
                        cardPortrait: null,
                        portraitCleared: false,
                        assetImages: [],
                        cardProfile: deriveCardMetricsFromId('new-character'),
                    }}
                    saving={creating}
                    onSubmit={handleCreate}
                    onCancel={() => router.push('/avatars')}
                />
            </div>
        </div>
    );
}
