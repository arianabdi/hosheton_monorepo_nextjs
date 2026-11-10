'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { LuPlus } from 'react-icons/lu';
import styles from '../avatars.module.scss';

export function AvatarEmptyState() {
    const { t } = useTranslation('avatars');
    return (
        <div className={styles.emptyStateWrap}>
            <article
                className={`${styles.licenseCard} ${styles.licenseCardEmpty}`}
                style={{ ['--platform-accent' as string]: 'var(--brand-color, #7b64cf)' }}
                dir="ltr"
            >
                <header className={styles.licenseHeader}>
                    <div className={styles.licenseHeaderTitle}>AVATAR LICENSE</div>
                    <div className={styles.licenseUnderline} />
                </header>

                <div className={styles.licenseBody}>
                    <div className={styles.licenseLeftCol}>
                        <div className={styles.licensePhotoFrame}>
                            <div className={styles.emptyPhotoIcon}>?</div>
                        </div>
                        <div className={styles.licenseSignature}>NO RECORD</div>
                    </div>

                    <div className={styles.licenseFields}>
                        <div className={styles.licenseField}>
                            <span className={styles.licenseLabel}>DL</span>
                            <span className={styles.licenseValueBold}>AV--------</span>
                        </div>
                        <div className={styles.licenseField}>
                            <span className={styles.licenseLabel}>STATUS</span>
                            <span className={`${styles.licenseValueStatus} ${styles.tone_draft}`}>EMPTY</span>
                        </div>
                        <div className={styles.licenseField}>
                            <span className={styles.licenseLabel}>FN</span>
                            <span className={styles.licenseValueBold}>—</span>
                        </div>
                        <div className={styles.licenseField}>
                            <span className={styles.licenseLabel}>LN</span>
                            <span className={styles.licenseValueBold}>—</span>
                        </div>
                        <div className={styles.licenseAddress}>
                            <span>HOSHETON STUDIO</span>
                            <span>NO CHARACTER ON FILE</span>
                        </div>
                    </div>

                    <div className={styles.licenseRightCol}>
                        <div className={styles.licenseBrandStamp}>
                            <span>—</span>
                        </div>
                        <div className={styles.licenseGhostGroup}>
                            <div className={styles.licenseGhostPhotoFrame}>
                                <div className={styles.licensePhotoPlaceholder} />
                            </div>
                        </div>
                    </div>
                </div>

                <footer className={styles.licenseFooter}>
                    <div className={styles.licenseStat}>
                        <span className={styles.licenseStatLabel}>SEX</span>
                        <span className={styles.licenseStatVal}>—</span>
                    </div>
                    <div className={styles.licenseStat}>
                        <span className={styles.licenseStatLabel}>HAIR</span>
                        <span className={styles.licenseStatVal}>—</span>
                    </div>
                    <div className={styles.licenseStat}>
                        <span className={styles.licenseStatLabel}>EYES</span>
                        <span className={styles.licenseStatVal}>—</span>
                    </div>
                </footer>
            </article>

            <div className={styles.emptyStateCopy}>
                <h2 className={styles.emptyStateTitle}>{t('empty')}</h2>
                <p className={styles.emptyStateDesc}>{t('empty_desc')}</p>
                <Link href="/avatars/new" className={styles.primaryBtn}>
                    <LuPlus /> {t('create_character')}
                </Link>
            </div>
        </div>
    );
}
