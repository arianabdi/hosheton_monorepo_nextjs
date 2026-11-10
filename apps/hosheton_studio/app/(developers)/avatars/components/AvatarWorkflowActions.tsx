'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    LuLoader, LuShield, LuSend, LuRefreshCw, LuExternalLink,
} from 'react-icons/lu';
import { SuccessToaster } from '@my-workspace/utils';
import { notifyError } from '@/app/lib/errors';
import { aiAvatarApi } from '@/app/(developers)/projects/lib/ai-avatar-api';
import type { AiAvatarProfile } from '@/app/(developers)/projects/types/ai-avatar-api';
import { AVATAR_PLATFORM_META, normalizeAvatarPlatform } from '../avatar-platform';
import { VerificationQrPanel } from './VerificationQrPanel';
import styles from '../avatars.module.scss';

export function AvatarWorkflowActions({
    avatar,
    onRefresh,
}: {
    avatar: AiAvatarProfile;
    onRefresh: () => void;
}) {
    const { t } = useTranslation('avatars');
    const [busy, setBusy] = useState<string | null>(null);
    const platform = normalizeAvatarPlatform(avatar.platform);
    const platformLabel = AVATAR_PLATFORM_META[platform].label;
    const usesByteplusFlow = platform === 'byteplus' || platform === 'seedance';

    const run = async (key: string, fn: () => Promise<void>) => {
        setBusy(key);
        try {
            await fn();
            onRefresh();
        } catch (e) {
            notifyError(e);
        } finally {
            setBusy(null);
        }
    };

    const verifyButtonLabel =
        platform === 'byteplus'
            ? t('start_verify')
            : t('start_verify_p', { platform: platformLabel });

    return (
        <div className={styles.workflowStack}>
            {(avatar.status === 'draft' || avatar.status === 'verification_failed') && usesByteplusFlow && (
                <button
                    type="button"
                    className={styles.primaryBtn}
                    disabled={!!busy}
                    onClick={() => run('verify', async () => {
                        const res = await aiAvatarApi.startVerification(avatar._id);
                        if (res.adminReviewPending) {
                            SuccessToaster({
                                message: res.message || t('request_sent'),
                            });
                            return;
                        }
                        if (res.verificationUrl) {
                            window.open(res.verificationUrl, '_blank', 'noopener,noreferrer');
                        }
                    })}
                >
                    {busy === 'verify' ? <LuLoader className={styles.spin} /> : <LuShield />}
                    {verifyButtonLabel}
                </button>
            )}

            {avatar.status === 'admin_pending' && (
                <div className={styles.infoBox}>
                    <p>{t('request_pending_info')}</p>
                    {avatar.lastByteplusError && (
                        <p className={styles.errorBox} style={{ marginTop: 8 }}>
                            {avatar.lastByteplusError}
                        </p>
                    )}
                </div>
            )}

            {avatar.status === 'verification_pending' && (
                <>
                    {avatar.verificationUrl && (
                        <>
                            <VerificationQrPanel verificationUrl={avatar.verificationUrl} />
                            <a
                                href={avatar.verificationUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.secondaryBtn}
                            >
                                <LuExternalLink /> {t('open_verify')}
                            </a>
                        </>
                    )}
                    <button
                        type="button"
                        className={styles.secondaryBtn}
                        disabled={!!busy}
                        onClick={() => run('check', async () => {
                            await aiAvatarApi.checkVerification(avatar._id);
                        })}
                    >
                        {busy === 'check' ? <LuLoader className={styles.spin} /> : <LuRefreshCw />}
                        {t('check_verify')}
                    </button>
                </>
            )}

            {(avatar.status === 'asset_uploading' || avatar.status === 'verification_failed') &&
                avatar.byteplusGroupId && (
                <button
                    type="button"
                    className={styles.primaryBtn}
                    disabled={!!busy}
                    onClick={() => run('submit', async () => {
                        await aiAvatarApi.submitAssets(avatar._id);
                    })}
                >
                    {busy === 'submit' ? <LuLoader className={styles.spin} /> : <LuSend />}
                    {t('send_sheet', { platform: platformLabel })}
                </button>
            )}

            {(avatar.status === 'asset_review' || avatar.status === 'asset_uploading') && (
                <button
                    type="button"
                    className={styles.secondaryBtn}
                    disabled={!!busy}
                    onClick={() => run('sync', async () => {
                        await aiAvatarApi.syncAvatar(avatar._id);
                    })}
                >
                    {busy === 'sync' ? <LuLoader className={styles.spin} /> : <LuRefreshCw />}
                    {t('sync_asset')}
                </button>
            )}

            {avatar.status === 'active' && avatar.byteplusAssetUri && (
                <span className={`${styles.statusBadge} ${styles.statusActive}`}>
                    {avatar.byteplusAssetUri}
                </span>
            )}
        </div>
    );
}
