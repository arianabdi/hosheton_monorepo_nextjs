'use client';

import { useTranslation } from 'react-i18next';
import { LuFilm, LuImage, LuLoader, LuMusic, LuShieldCheck, LuTrash2, LuTriangleAlert } from 'react-icons/lu';
import { HoshetonError } from '@/app/lib/errors';
import styles from './ChatMessagesV2.module.scss';

type MediaKind = 'image' | 'video' | 'audio';

type DialogTarget =
    /** خروجی تولیدشده — فایل و پیش‌نمایش‌ها از storage پاک می‌شوند */
    | { variant: 'output'; kind: MediaKind; thumbSrc: string; sizeLabel?: string }
    /** نوبت ناموفق — فقط از تاریخچه چت حذف می‌شود؛ خروجی/فایلی برای پاک کردن ندارد */
    | { variant: 'failed'; modelName: string; errorMessage?: string };

/**
 * محتوای تأیید حذف (داخل ModalHelper) — هم خروجی تولیدشده، هم نوبت ناموفق.
 * پیش‌نمایش همان مورد، پیامد کوتاه، دو نکته (چه پاک می‌شود / چه می‌ماند) و دکمه‌ها؛
 * «انصراف» فوکوس پیش‌فرض است تا Enter تصادفی چیزی را پاک نکند.
 */
export default function DeleteOutputDialog({
    target,
    deleting,
    error,
    onCancel,
    onConfirm,
}: {
    target: DialogTarget;
    deleting: boolean;
    error?: string;
    onCancel: () => void;
    onConfirm: () => void;
}) {
    const { t } = useTranslation('projects');
    const { t: tc } = useTranslation('common');
    const failed = target.variant === 'failed';
    const kindLabel = target.variant === 'output' ? t(`chat_delete_kind_${target.kind}`) : '';
    const KindIcon = target.variant === 'output'
        ? (target.kind === 'video' ? LuFilm : target.kind === 'audio' ? LuMusic : LuImage)
        : LuTriangleAlert;

    return (
        <div className={styles.deleteDialog}>
            <div className={styles.deleteHead}>
                <span className={styles.deleteIcon} aria-hidden><LuTrash2 size={18} /></span>
                <strong>{failed ? t('chat_delete_turn_title') : t('chat_delete_output_title')}</strong>
            </div>

            <div className={styles.deletePreview}>
                <span className={`${styles.deleteThumb} ${failed ? styles.deleteThumbFailed : ''}`}>
                    {target.variant === 'output' && target.kind !== 'audio' && target.thumbSrc ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={target.thumbSrc} alt="" />
                    ) : (
                        <KindIcon size={20} aria-hidden />
                    )}
                </span>
                {target.variant === 'output' ? (
                    <span className={styles.deletePreviewText}>
                        <span>{kindLabel}</span>
                        {target.sizeLabel ? <small dir="ltr">{target.sizeLabel}</small> : null}
                    </span>
                ) : (
                    <span className={styles.deletePreviewText}>
                        <span dir="auto">{target.modelName || t('chat_delete_turn_failed_label')}</span>
                        {/* فقط پیام هوشتون — متن خام ارائه‌دهنده نمایش داده نمی‌شود */}
                        <HoshetonError error={target.errorMessage} kind="generation">
                            {(e) => <small dir="auto">{e.message}</small>}
                        </HoshetonError>
                    </span>
                )}
            </div>

            <p className={styles.deleteLead}>
                {failed ? t('chat_delete_turn_body') : t('chat_delete_output_body', { kind: kindLabel })}
            </p>

            <ul className={styles.deletePoints}>
                <li>
                    <LuTrash2 size={14} aria-hidden />
                    {failed ? t('chat_delete_turn_point_history') : t('chat_delete_output_point_storage')}
                </li>
                <li className={styles.deletePointSafe}>
                    <LuShieldCheck size={14} aria-hidden />
                    {failed ? t('chat_delete_turn_point_inputs') : t('chat_delete_output_point_inputs')}
                </li>
            </ul>

            {error ? (
                <p className={styles.deleteError} role="alert">
                    <LuTriangleAlert size={14} aria-hidden />
                    {error}
                </p>
            ) : null}

            <div className={styles.deleteActions}>
                <button
                    type="button"
                    className={styles.deleteDanger}
                    onClick={onConfirm}
                    disabled={deleting}
                    aria-busy={deleting}
                >
                    {deleting ? <LuLoader size={15} className={styles.spinning} /> : <LuTrash2 size={15} />}
                    {deleting
                        ? t('chat_delete_output_deleting')
                        : failed ? t('chat_delete_turn_confirm') : t('chat_delete_output_confirm')}
                </button>
                <button
                    type="button"
                    className={styles.deleteCancel}
                    onClick={onCancel}
                    disabled={deleting}
                    autoFocus
                >
                    {tc('cancel')}
                </button>
            </div>
        </div>
    );
}
