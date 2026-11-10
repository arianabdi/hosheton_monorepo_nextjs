'use client';

import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import styles from './TemplateForm.module.scss';

export default function TemplateFormGuide() {
    const { t } = useTranslation('templates');
    const [open, setOpen] = useState(false);

    return (
        <section className={`${styles.guideContainer} ${open ? styles.guideContainerOpen : ''}`}>
            <button
                type="button"
                className={styles.guideHeader}
                aria-expanded={open}
                aria-label={open ? t('guide_close') : t('guide_open')}
                onClick={() => setOpen((prev) => !prev)}
            >
                <span className={styles.guideTitleGroup}>
                    <span className={styles.guideIcon} aria-hidden="true">🧩</span>
                    <span className={styles.guideTitle}>{t('guide_title')}</span>
                </span>
                <span className={styles.guideHeaderEnd}>
                    <span className={styles.guideBadge}>{t('guide_badge')}</span>
                    <span className={`${styles.guideChevron} ${open ? styles.guideChevronOpen : ''}`} aria-hidden="true">
                        ▾
                    </span>
                </span>
            </button>

            {open && (
                <div className={styles.guideBody}>
                    <p className={styles.guideIntro}>
                        <Trans i18nKey="guide_intro" ns="templates" components={{ strong: <strong /> }} />
                    </p>

                    <div className={styles.guideGrid}>
                        <div className={styles.guideCard}>
                            <h3>{t('guide_status_title')}</h3>
                            <ul>
                                <li><strong>{t('draft')}:</strong> {t('guide_status_draft')}</li>
                                <li><strong>{t('pending_review')}:</strong> {t('guide_status_pending')}</li>
                                <li><strong>{t('approved')}:</strong> {t('guide_status_approved')}</li>
                                <li><strong>{t('rejected')}:</strong> {t('guide_status_rejected')}</li>
                            </ul>
                        </div>

                        <div className={styles.guideCard}>
                            <h3>{t('guide_fill_title')}</h3>
                            <ol>
                                <li>{t('guide_fill_1')}</li>
                                <li>{t('guide_fill_2')}</li>
                                <li>{t('guide_fill_3')}</li>
                                <li>{t('guide_fill_4')}</li>
                            </ol>
                        </div>

                        <div className={styles.guideCard}>
                            <h3>{t('guide_after_title')}</h3>
                            <ul>
                                <li>{t('guide_after_1')}</li>
                                <li>{t('guide_after_2')}</li>
                                <li>{t('guide_after_3')}</li>
                            </ul>
                        </div>

                        <div className={styles.guideCard}>
                            <h3>{t('guide_cat_title')}</h3>
                            <ul>
                                <li>{t('guide_cat_1')}</li>
                                <li>{t('guide_cat_2')}</li>
                                <li>{t('guide_cat_3')}</li>
                            </ul>
                        </div>
                    </div>

                    <div className={styles.guideExample}>
                        <h3>{t('guide_example_title')}</h3>
                        <p>{t('guide_example_body')}</p>
                    </div>

                    <div className={styles.guideNote}>
                        <Trans i18nKey="guide_note" ns="templates" components={{ strong: <strong /> }} />
                    </div>
                </div>
            )}
        </section>
    );
}
