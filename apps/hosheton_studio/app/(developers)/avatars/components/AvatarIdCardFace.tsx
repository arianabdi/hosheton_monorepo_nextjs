'use client';

import type { AiAvatarProfile } from '@/app/(developers)/projects/types/ai-avatar-api';
import { AVATAR_PLATFORM_META, normalizeAvatarPlatform } from '../avatar-platform';
import {
    formatLicenseDates,
    parseAvatarName,
    resolveCardProfile,
} from '../avatar-card-profile';
import { STATUS_LABELS_EN, avatarDisplayId, statusTone } from '../avatar-status';
import styles from '../avatars.module.scss';

export function AvatarIdCardFace({
    avatar,
    className,
}: {
    avatar: AiAvatarProfile;
    className?: string;
}) {
    const platform = normalizeAvatarPlatform(avatar.platform);
    const meta = AVATAR_PLATFORM_META[platform];
    const tone = statusTone(avatar.status);
    const statusText = STATUS_LABELS_EN[avatar.status] || avatar.status.toUpperCase();

    const { fn, ln } = parseAvatarName(avatar.name);
    const profile = resolveCardProfile(avatar);
    const { iss, exp } = formatLicenseDates(avatar.createdAt);

    return (
        <article
            className={[styles.licenseCard, className].filter(Boolean).join(' ')}
            style={{ ['--platform-accent' as string]: meta.accent }}
            dir="ltr"
        >
            <header className={styles.licenseHeader}>
                <div className={styles.licenseHeaderTitle}>AVATAR LICENSE</div>
                <div className={styles.licenseUnderline} />
            </header>

            <div className={styles.licenseBody}>
                <div className={styles.licenseLeftCol}>
                    <div className={styles.licensePhotoFrame}>
                        {avatar.previewImageUrl ? (
                            <img src={avatar.previewImageUrl} alt="" className={styles.licensePhoto} />
                        ) : (
                            <div className={styles.licensePhotoPlaceholder} />
                        )}
                    </div>
                    <div className={styles.licenseSignature} title="Signature">
                        {avatar.name}
                    </div>
                </div>

                <div className={styles.licenseFields}>
                    <div className={styles.licenseRow}>
                        <div className={styles.licenseField} style={{ flex: '1 1 auto' }}>
                            <span className={styles.licenseLabel}>DL</span>
                            <span className={styles.licenseValueBold}>AV{avatarDisplayId(avatar._id)}</span>
                        </div>
                        <div className={styles.licenseField} style={{ flex: '0 0 auto' }}>
                            <span className={styles.licenseLabel}>CLASS</span>
                            <span className={styles.licenseValueBold}>{meta.short}</span>
                        </div>
                    </div>

                    <div className={styles.licenseField}>
                        <span className={styles.licenseLabel}>EXP</span>
                        <span className={styles.licenseValueExp}>{exp}</span>
                    </div>

                    <div className={styles.licenseField}>
                        <span className={styles.licenseLabel}>LN</span>
                        <span className={styles.licenseValueBold}>{ln}</span>
                    </div>

                    <div className={styles.licenseField}>
                        <span className={styles.licenseLabel}>FN</span>
                        <span className={styles.licenseValueBold}>{fn}</span>
                    </div>

                    <div className={styles.licenseAddress}>
                        <span>HOSHETON STUDIO</span>
                        <span>MODELARK ASSET, CA 94016</span>
                    </div>

                    <div className={styles.licenseField}>
                        <span className={styles.licenseLabel}>DOB</span>
                        <span className={styles.licenseValueBold}>{profile.dob}</span>
                    </div>

                    <div className={styles.licenseRow}>
                        <div className={styles.licenseField}>
                            <span className={styles.licenseLabel}>STATUS</span>
                            <span className={`${styles.licenseValueStatus} ${styles[`tone_${tone}`]}`}>
                                {statusText}
                            </span>
                        </div>
                        <div className={styles.licenseField} style={{ marginLeft: '12px' }}>
                            <span className={styles.licenseLabel}>DONOR</span>
                            <span className={styles.licenseDonorHeart}>♥</span>
                        </div>
                    </div>
                </div>

                <div className={styles.licenseRightCol}>
                    <div className={styles.licenseBrandStamp}>
                        <span>{meta.short}</span>
                    </div>

                    <div className={styles.licenseGhostGroup}>
                        <div className={styles.licenseGhostPhotoFrame}>
                            {avatar.previewImageUrl ? (
                                <img src={avatar.previewImageUrl} alt="" className={styles.licenseGhostPhoto} />
                            ) : (
                                <div className={styles.licensePhotoPlaceholder} />
                            )}
                        </div>
                        <div className={styles.licenseField} style={{ marginTop: '2px', justifyContent: 'flex-end' }}>
                            <span className={styles.licenseLabelMini}>ISS</span>
                            <span className={styles.licenseValueSmall}>{iss}</span>
                        </div>
                    </div>
                </div>
            </div>

            <footer className={styles.licenseFooter}>
                <div className={styles.licenseStat}>
                    <span className={styles.licenseStatLabel}>SEX</span>
                    <span className={styles.licenseStatVal}>{profile.sex}</span>
                </div>
                <div className={styles.licenseStat}>
                    <span className={styles.licenseStatLabel}>HAIR</span>
                    <span className={styles.licenseStatVal}>{profile.hair}</span>
                </div>
                <div className={styles.licenseStat}>
                    <span className={styles.licenseStatLabel}>EYES</span>
                    <span className={styles.licenseStatVal}>{profile.eyes}</span>
                </div>
                <div className={styles.licenseStat}>
                    <span className={styles.licenseStatLabel}>HGT</span>
                    <span className={styles.licenseStatVal}>{profile.height}</span>
                </div>
                <div className={styles.licenseStat}>
                    <span className={styles.licenseStatLabel}>WGT</span>
                    <span className={styles.licenseStatVal}>{profile.wgtDisplay}</span>
                </div>
            </footer>
        </article>
    );
}
