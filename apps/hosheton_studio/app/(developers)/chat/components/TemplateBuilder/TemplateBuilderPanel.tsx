'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { LuFilm, LuStar, LuX } from 'react-icons/lu';
import { ModalCloseButton } from '@my-workspace/components';
import type { TemplatePreviewMedia } from '@/app/(developers)/projects/types/media-api';
import { mediaOptimizedListThumbSrc, mediaThumbLargeSrc } from '@/app/(marketplace)/lib/template-media';
import { TEMPLATE_MAX_MEDIA, templateMediaKey, useTemplateCreateStore } from '@/app/zustand/store/useTemplateCreateStore';
import { PublisherSelect } from '@/app/(developers)/templates/components/PublisherSelect';
import { PublishStatusSelect } from '@/app/(developers)/templates/components/PublishStatusSelect';
import { useIsStaff } from '@/app/(developers)/templates/lib/personas';
import styles from './TemplateBuilder.module.scss';

function thumbSrc(media: TemplatePreviewMedia) {
    return mediaOptimizedListThumbSrc(media) || (media.type === 'image' ? mediaThumbLargeSrc(media) : '');
}

/**
 * پنل «ساخت قالب» کنار چت — همان state فرم /templates/new (useTemplateCreateStore).
 * رسانه و پرامپت از خود چت (دکمه‌ی «افزودن به قالب» هر خروجی و پرامپت) به این‌جا می‌آیند.
 */
export function TemplateBuilderPanel({ onClose, showClose = true }: { onClose: () => void; showClose?: boolean }) {
    const { t } = useTranslation('projects');
    const { t: tc } = useTranslation('common');
    const title = useTemplateCreateStore((state) => state.title);
    const promptText = useTemplateCreateStore((state) => state.promptText);
    const previewMedia = useTemplateCreateStore((state) => state.previewMedia);
    const setField = useTemplateCreateStore((state) => state.setField);
    const removeMedia = useTemplateCreateStore((state) => state.removeMedia);
    const setCover = useTemplateCreateStore((state) => state.setCover);
    const reset = useTemplateCreateStore((state) => state.reset);
    const publishAsUserId = useTemplateCreateStore((state) => state.publishAsUserId);
    const publishStatus = useTemplateCreateStore((state) => state.publishStatus);
    // تگ‌ها در صفحهٔ ساخت قالب انتخاب می‌شوند (همین پیش‌نویس) — منتشرکننده‌ها با حوزهٔ آن‌ها فیلتر می‌شوند
    const selectedTagKeys = useTemplateCreateStore((state) => state.selectedTagKeys);
    const isStaff = useIsStaff();
    const { t: tt } = useTranslation('templates');

    return (
        <div className={styles.panel}>
            <header className={styles.header}>
                <div>
                    <h3>{t('template_builder_title', { defaultValue: 'ساخت قالب' })}</h3>
                    <p>{t('template_builder_hint', { defaultValue: 'با «افزودن به قالب» روی خروجی‌ها و پرامپت‌ها پر می‌شود؛ همین در صفحه‌ی ساخت قالب هم هست.' })}</p>
                </div>
                {showClose ? <ModalCloseButton placement="inline" size="sm" onClick={onClose} aria-label={tc('close')} /> : null}
            </header>

            <div className={styles.scroll}>
                <section className={styles.draft}>
                    <label className={styles.field}>
                        <span>{t('quick_template_name', { defaultValue: 'عنوان قالب' })}</span>
                        <input value={title} onChange={(event) => setField('title', event.target.value)} />
                    </label>

                    {isStaff ? (
                        // فقط ادمین (مثل حالت توسعه‌دهنده): قالب به نام یک کاربر نمایشی منتشر شود
                        <label className={`${styles.field} ${styles.staffField}`}>
                            <span>
                                {tt('publisher_label', { defaultValue: 'منتشرکننده' })}
                                <small> · {tt('publisher_staff_only', { defaultValue: 'فقط ادمین' })}</small>
                            </span>
                            <PublisherSelect
                                value={publishAsUserId}
                                onChange={(value) => setField('publishAsUserId', value)}
                                tagKeys={selectedTagKeys}
                                hintClassName={styles.hint}
                            />
                        </label>
                    ) : null}
                    {isStaff ? (
                        <label className={`${styles.field} ${styles.staffField}`}>
                            <span>
                                {tt('publish_status_label', { defaultValue: 'وضعیت انتشار' })}
                                <small> · {tt('publisher_staff_only', { defaultValue: 'فقط ادمین' })}</small>
                            </span>
                            <PublishStatusSelect
                                value={publishStatus}
                                onChange={(value) => setField('publishStatus', value)}
                            />
                        </label>
                    ) : null}

                    <div className={styles.field}>
                        <span>
                            {t('quick_template_media', { defaultValue: 'تصاویر نمایش' })}
                            <small> {previewMedia.length}/{TEMPLATE_MAX_MEDIA} · {t('quick_template_cover_hint', { defaultValue: 'ستاره = کاور' })}</small>
                        </span>
                        {previewMedia.length ? (
                            <div className={styles.selectedStrip}>
                                {previewMedia.map((media) => {
                                    const src = thumbSrc(media);
                                    return (
                                        <div key={templateMediaKey(media)} className={`${styles.selected} ${media.isCover ? styles.selectedCover : ''}`}>
                                            {src ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={src} alt="" loading="lazy" decoding="async" />
                                            ) : (
                                                <span className={styles.thumbFallback} aria-hidden><LuFilm size={16} /></span>
                                            )}
                                            <button
                                                type="button"
                                                className={`${styles.miniBtn} ${styles.coverBtn}`}
                                                onClick={() => setCover(media)}
                                                aria-pressed={Boolean(media.isCover)}
                                                aria-label={t('quick_template_set_cover', { defaultValue: 'کاور قالب' })}
                                                title={t('quick_template_set_cover', { defaultValue: 'کاور قالب' })}
                                            >
                                                <LuStar size={11} />
                                            </button>
                                            <button
                                                type="button"
                                                className={`${styles.miniBtn} ${styles.removeBtn}`}
                                                onClick={() => removeMedia(media)}
                                                aria-label={tc('delete')}
                                                title={tc('delete')}
                                            >
                                                <LuX size={11} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className={styles.hint}>{t('template_builder_media_empty', { defaultValue: 'روی خروجی‌های چت «افزودن به قالب» را بزنید.' })}</p>
                        )}
                    </div>

                    <label className={styles.field}>
                        <span>{t('quick_template_prompt', { defaultValue: 'پرامپت قالب' })}</span>
                        <textarea
                            rows={6}
                            dir="auto"
                            value={promptText}
                            onChange={(event) => setField('promptText', event.target.value)}
                            placeholder={t('quick_template_prompt_ph', { defaultValue: 'پرامپتی که خریدار قالب استفاده می‌کند' })}
                        />
                    </label>

                    <div className={styles.actions}>
                        <Link href="/templates/new" className={styles.primary}>
                            {t('template_builder_continue', { defaultValue: 'تکمیل و ثبت قالب' })}
                        </Link>
                        <button type="button" className={styles.textBtn} onClick={reset}>
                            {t('draft_reset', { defaultValue: 'شروع از نو' })}
                        </button>
                    </div>
                </section>
            </div>
        </div>
    );
}

export default TemplateBuilderPanel;
