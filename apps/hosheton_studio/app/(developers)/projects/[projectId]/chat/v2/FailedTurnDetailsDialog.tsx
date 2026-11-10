'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LuCircleAlert, LuCircleCheck, LuFile, LuImage, LuLightbulb, LuLoader, LuPencil, LuRefreshCw, LuTriangleAlert } from 'react-icons/lu';
import type { TemplatePreviewMedia } from '@/app/(developers)/projects/types/media-api';
import { useHoshetonError } from '@/app/lib/errors';
import styles from './ChatMessagesV2.module.scss';

type InputState = 'checking' | 'ok' | 'broken';

/** بررسی مستقیم فایل روی storage (HEAD) — بدون درخواست به API هوشتون */
async function probe(url: string): Promise<'ok' | 'broken'> {
    try {
        const res = await fetch(url, { method: 'HEAD', cache: 'no-store' });
        return res.ok ? 'ok' : 'broken';
    } catch {
        return 'broken';
    }
}

/** نام قابل‌تشخیص: برچسب اگر یکتاست؛ وقتی چند ورودی برچسب یکسان دارند (مثلاً عنوان چت)، نام خود فایل */
function inputName(media: TemplatePreviewMedia, index: number, labelCounts: Map<string, number>): string {
    const label = String(media.label || '').trim();
    if (label && (labelCounts.get(label) || 0) < 2) return label;
    try {
        const last = decodeURIComponent(new URL(String(media.url)).pathname.split('/').pop() || '');
        if (last) return last;
    } catch { /* not a URL */ }
    return label || `#${index + 1}`;
}

/**
 * پنجره «بیشتر بدانید» یک نوبت ناموفق: عنوان و پیام هوشتون، «چرا» و «چه کار کنم».
 * برای خطای فایل ورودی، ورودی‌های همان درخواست را یکی‌یکی بررسی می‌کند و خراب‌ها را نشان می‌دهد؛
 * دکمه اصلی همان درخواست را بدون فایل‌های خراب در کادر می‌گذارد.
 * فقط متن هوشتون — نام ارائه‌دهنده یا متن خام هرگز نمایش داده نمی‌شود.
 */
export default function FailedTurnDetailsDialog({
    errorMessage,
    modelName,
    inputs,
    canRetry,
    canEdit,
    busy,
    onRetry,
    onEdit,
}: {
    errorMessage?: string;
    modelName: string;
    inputs: TemplatePreviewMedia[];
    canRetry: boolean;
    canEdit: boolean;
    busy: boolean;
    onRetry: () => void;
    onEdit: (excludeUrls: string[]) => void;
}) {
    const { t } = useTranslation('errors');
    const view = useHoshetonError(errorMessage, { kind: 'generation' });
    const checkInputs = view.code === 'media_unavailable' && inputs.length > 0;
    const [states, setStates] = useState<Record<string, InputState>>({});

    useEffect(() => {
        if (!checkInputs) return;
        let cancelled = false;
        for (const media of inputs) {
            const url = String(media.url || '');
            if (!url) continue;
            void probe(url).then((result) => {
                if (!cancelled) setStates((prev) => ({ ...prev, [url]: result }));
            });
        }
        return () => { cancelled = true; };
    }, [checkInputs, inputs]);

    const labelCounts = new Map<string, number>();
    for (const media of inputs) {
        const label = String(media.label || '').trim();
        if (label) labelCounts.set(label, (labelCounts.get(label) || 0) + 1);
    }
    const stateOf = (media: TemplatePreviewMedia): InputState => states[String(media.url || '')] || 'checking';
    const brokenUrls = inputs.filter((media) => stateOf(media) === 'broken').map((media) => String(media.url));
    const checking = checkInputs && inputs.some((media) => stateOf(media) === 'checking');

    return (
        <div className={`${styles.deleteDialog} ${styles.errorDetailsScroll}`}>
            <div className={styles.deleteHead}>
                <span className={`${styles.deleteIcon} ${styles.errorDetailsIcon}`} aria-hidden>
                    <LuTriangleAlert size={18} />
                </span>
                <span className={styles.errorDetailsHeadText}>
                    <strong>{view.title}</strong>
                    {modelName ? <small dir="auto">{modelName}</small> : null}
                </span>
            </div>

            <p className={styles.deleteLead}>{view.message}</p>

            {view.why ? (
                <section className={styles.errorDetailsSection}>
                    <h4><LuCircleAlert size={14} aria-hidden />{t('details.why_title')}</h4>
                    <p>{view.why}</p>
                </section>
            ) : null}

            {checkInputs ? (
                <section className={styles.errorDetailsSection}>
                    <h4>
                        <LuImage size={14} aria-hidden />
                        {t('details.inputs_title')}
                        {checking ? (
                            <span className={styles.errorDetailsMuted}>
                                <LuLoader size={12} className={styles.spinning} /> {t('details.inputs_checking')}
                            </span>
                        ) : brokenUrls.length ? (
                            <span className={styles.errorDetailsBad}>{t('details.broken_count', { count: brokenUrls.length })}</span>
                        ) : null}
                    </h4>
                    <ul className={styles.inputCheckList}>
                        {inputs.map((media, index) => {
                            const state = stateOf(media);
                            const thumb = String(media.thumbnailUrl || media.thumbnailUrlLarge || media.url || '');
                            return (
                                <li key={`${media.url}-${index}`} className={state === 'broken' ? styles.inputBroken : ''}>
                                    <span className={styles.inputCheckThumb}>
                                        {state !== 'broken' && media.type !== 'audio' && thumb ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={thumb} alt="" loading="lazy" />
                                        ) : (
                                            <LuFile size={16} aria-hidden />
                                        )}
                                    </span>
                                    <span className={styles.inputCheckName} dir="auto">{inputName(media, index, labelCounts)}</span>
                                    <span className={styles.inputCheckState}>
                                        {state === 'checking' ? <LuLoader size={13} className={styles.spinning} />
                                            : state === 'ok' ? <><LuCircleCheck size={13} />{t('details.input_ok')}</>
                                                : <><LuCircleAlert size={13} />{t('details.input_broken')}</>}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                    {!checking && !brokenUrls.length ? (
                        <p className={styles.errorDetailsMuted}>{t('details.inputs_all_ok')}</p>
                    ) : null}
                </section>
            ) : null}

            {view.steps.length ? (
                <section className={styles.errorDetailsSection}>
                    <h4><LuLightbulb size={14} aria-hidden />{t('details.steps_title')}</h4>
                    <ol className={styles.errorDetailsSteps}>
                        {view.steps.map((step) => <li key={step}>{step}</li>)}
                    </ol>
                </section>
            ) : null}

            <div className={styles.deleteActions}>
                {brokenUrls.length && canEdit ? (
                    <button type="button" className={styles.errorDetailsPrimary} disabled={busy} onClick={() => onEdit(brokenUrls)}>
                        <LuPencil size={15} />
                        {t('details.fix_inputs')}
                    </button>
                ) : canRetry ? (
                    <button type="button" className={styles.errorDetailsPrimary} disabled={busy || checking} onClick={onRetry}>
                        <LuRefreshCw size={15} />
                        {t('details.retry')}
                    </button>
                ) : null}
                {canEdit ? (
                    <button type="button" className={styles.deleteCancel} disabled={busy} onClick={() => onEdit([])}>
                        <LuPencil size={15} />
                        {t('details.edit_request')}
                    </button>
                ) : null}
            </div>
        </div>
    );
}
