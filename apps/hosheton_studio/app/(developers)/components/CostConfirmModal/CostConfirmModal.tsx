'use client';

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { FiSend } from 'react-icons/fi';
import { LuImage, LuMessageSquareText, LuMusic, LuTriangleAlert, LuVideo, LuWallet } from 'react-icons/lu';
import { ModalHelper } from '@my-workspace/components';
import { formatUsd, quotedAmountOf, type CostEstimateResult } from '@/app/(developers)/projects/components/CostEstimatePanel';
import { formatChatUsd } from '@/app/(developers)/projects/[projectId]/chat/lib/chat-usage';
import type { StudioChatMediaKind } from '@/app/(developers)/projects/types/media-api';
import { useWalletStore } from '@/app/zustand/store/walletStore';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { formatAppNumber } from '@/app/lib/i18n/formatLocaleNumber';
import styles from './CostConfirmModal.module.scss';

/**
 * پنجره مشترک «تأیید هزینه» با رسید چاپی — هم ارسال چت و هم اجرای نود در workflow از همین استفاده می‌کنند.
 */

/** خلاصه درخواست — خروجی و ورودی‌هایی که روی رسید نوشته می‌شوند */
export interface CostConfirmSummary {
    kind: StudioChatMediaKind;
    modelLabel: string;
    promptLength: number;
    images: number;
    videos: number;
    audios: number;
    /** چند خروجی در یک درخواست (مثلاً نماهای «زاویه و نور») */
    outputs?: number;
}

/** دکمه انتخاب دوم بالای دکمه‌ها (مثلاً «اجرای کل زنجیره» در workflow) */
export interface CostConfirmAlternateAction {
    label: string;
    hint?: string;
    icon?: ReactNode;
    onClick: () => void;
}

export interface CostConfirmModalProps {
    open: boolean;
    estimate: CostEstimateResult | null;
    loading: boolean;
    error: string | null;
    summary: CostConfirmSummary | null;
    /** فقط چت شخصی از کیف پول کسر می‌شود؛ چت پروژه و workflow از بودجه پروژه */
    showWallet: boolean;
    /** نود بدون مدل/قیمت: رسید چاپ نمی‌شود، فقط تأیید */
    noEstimate?: boolean;
    /** پیش‌فرض: آیکون نوع خروجی */
    icon?: ReactNode;
    /** پیش‌فرض: «ارسال {kind}» */
    title?: string;
    /** پیش‌فرض: نام مدل */
    subtitle?: string;
    /** پیش‌فرض: «ارسال» با آیکون ارسال */
    confirmLabel?: string;
    confirmIcon?: ReactNode;
    /** پیش‌فرض: توضیح چت */
    note?: string;
    alternateAction?: CostConfirmAlternateAction;
    onConfirm: () => void;
    onCancel: () => void;
}

const KIND_ICON: Record<StudioChatMediaKind, typeof LuImage> = {
    image: LuImage,
    video: LuVideo,
    audio: LuMusic,
    text: LuMessageSquareText,
};

export function CostConfirmModal(props: CostConfirmModalProps) {
    const { t } = useTranslation('projects');
    const kindLabel = props.summary ? t(`chat_kind_${props.summary.kind}`) : '';

    return (
        <ModalHelper
            open={props.open}
            onClose={props.onCancel}
            size="md"
            sheetTitle={props.title ?? t('chat_confirm_title', { kind: kindLabel })}
            component={props.open ? <CostConfirmContent {...props} /> : null}
        />
    );
}

function CostConfirmContent({
    estimate,
    loading: fetching,
    error,
    summary,
    showWallet,
    noEstimate = false,
    icon,
    title,
    subtitle,
    confirmLabel,
    confirmIcon,
    note,
    alternateAction,
    onConfirm,
    onCancel,
}: CostConfirmModalProps) {
    // اولین فریم بعد از باز شدن هنوز loading=false است؛ تا نتیجه یا خطا نیامده «در حال محاسبه» حساب شود
    const loading = !noEstimate && (fetching || (!estimate && !error));
    const { t } = useTranslation('projects');
    const { t: tc } = useTranslation('common');
    const lang = useAppStore((state) => state.lang);
    const available = useWalletStore((state) => state.availableBalance ?? state.balance);
    const outputs = summary?.outputs && summary.outputs > 1 ? summary.outputs : 0;

    // مبلغ تأیید = همان مبلغی که کسر می‌شود (quotedUsd سرور)، با همان دقت نمایش چت
    const amount = quotedAmountOf(estimate);
    const ready = !loading && amount != null;
    const kind = summary?.kind ?? 'image';
    const KindIcon = KIND_ICON[kind];
    const kindLabel = t(`chat_kind_${kind}`);
    const unitLabel = estimate?.unit && estimate.unit !== 'unknown'
        ? t(`chat_unit_${estimate.unit}`, { defaultValue: '' })
        : '';
    const modelLabel = estimate?.modelName || summary?.modelLabel || '—';

    const inputs = summary ? [
        summary.promptLength ? t('chat_cost_prompt_chars', { count: summary.promptLength }) : '',
        summary.images ? `${summary.images} ${t('chat_kind_image')}` : '',
        summary.videos ? `${summary.videos} ${t('chat_kind_video')}` : '',
        summary.audios ? `${summary.audios} ${t('chat_kind_audio')}` : '',
    ].filter(Boolean).join(' · ') : '';

    const walletKnown = showWallet && typeof available === 'number' && Number.isFinite(available);
    const after = walletKnown && amount != null ? (available as number) - amount : null;
    const lowBalance = after != null && after < 0;

    return (
        <div className={styles.root}>
            <header className={styles.head}>
                <span className={styles.kindIcon} aria-hidden>{icon ?? <KindIcon size={18} />}</span>
                <div className={styles.headText}>
                    <h3>{title ?? t('chat_confirm_title', { kind: kindLabel })}</h3>
                    <p>{subtitle ?? modelLabel}</p>
                </div>
            </header>

            {/* رسید: هنگام محاسبه از شکاف «پرینتر» بیرون می‌آید؛ بعد مبلغ مثل کیلومترشمار می‌چرخد */}
            {noEstimate ? null : (
                <div className={styles.printer}>
                    <span className={styles.slot} aria-hidden />
                    <div className={`${styles.paperClip} ${ready || error ? styles.paperDone : ''}`}>
                        <div className={`${styles.paper} ${loading ? styles.paperPrinting : ''}`}>
                            {loading ? (
                                <div className={styles.printingLines} aria-label={t('calculating_cost')} role="status">
                                    <span />
                                    <span />
                                    <span />
                                    <span className={styles.printingTotal} />
                                    <p>{t('calculating_cost')}</p>
                                </div>
                            ) : (
                                <>
                                    <dl className={styles.lines}>
                                        <div style={{ '--i': 0 } as CSSProperties}>
                                            <dt>{t('chat_confirm_output')}</dt>
                                            <dd>
                                                {kindLabel}
                                                {outputs ? <small> · {t('angle_outputs_count', { n: formatAppNumber(outputs, lang) })}</small> : null}
                                                {unitLabel ? <small> · {unitLabel}</small> : null}
                                            </dd>
                                        </div>
                                        <div style={{ '--i': 1 } as CSSProperties}>
                                            <dt>{t('chat_confirm_model')}</dt>
                                            <dd>{modelLabel}</dd>
                                        </div>
                                        {inputs ? (
                                            <div style={{ '--i': 2 } as CSSProperties}>
                                                <dt>{t('chat_cost_inputs')}</dt>
                                                <dd>{inputs}</dd>
                                            </div>
                                        ) : null}
                                    </dl>
                                    <div className={styles.total}>
                                        <span>{t('chat_confirm_total')}</span>
                                        {amount != null ? (
                                            <RollingAmount value={formatChatUsd(amount)} />
                                        ) : (
                                            <span className={styles.totalUnknown}>—</span>
                                        )}
                                    </div>
                                    {error ? (
                                        <p className={styles.error}>
                                            <LuTriangleAlert size={13} aria-hidden />
                                            {t('chat_cost_error')} {t('chat_confirm_error_hint')}
                                        </p>
                                    ) : null}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {walletKnown && ready ? (
                <div className={`${styles.wallet} ${lowBalance ? styles.walletLow : ''}`}>
                    <LuWallet size={15} aria-hidden />
                    <span className={styles.walletLabel}>{t('chat_confirm_balance')}</span>
                    <span className={styles.walletValues} dir="ltr">
                        {formatUsd(available as number)}
                        <span className={styles.walletArrow} aria-hidden>→</span>
                        <b>{formatUsd(after as number)}</b>
                    </span>
                </div>
            ) : null}
            {lowBalance ? <p className={styles.lowNote}>{t('chat_confirm_low_balance')}</p> : null}

            <p className={styles.note}>{note ?? t('chat_confirm_note')}</p>

            {alternateAction ? (
                <button type="button" className={styles.alternate} onClick={alternateAction.onClick}>
                    {alternateAction.icon ? <span className={styles.alternateIcon} aria-hidden>{alternateAction.icon}</span> : null}
                    <span className={styles.alternateText}>
                        <strong>{alternateAction.label}</strong>
                        {alternateAction.hint ? <small>{alternateAction.hint}</small> : null}
                    </span>
                </button>
            ) : null}

            <div className={styles.actions}>
                <button type="button" className={styles.secondary} onClick={onCancel}>
                    {tc('cancel')}
                </button>
                <button
                    type="button"
                    className={styles.primary}
                    onClick={onConfirm}
                    disabled={loading}
                    // وقتی مبلغ آماده شد Enter مستقیم تأیید کند
                    autoFocus={ready || noEstimate}
                >
                    {confirmIcon ?? <FiSend aria-hidden />}
                    <span>{confirmLabel ?? t('chat_confirm_send')}</span>
                    {amount != null && !loading ? <span className={styles.primaryAmount} dir="ltr">{formatChatUsd(amount)}</span> : null}
                </button>
            </div>
        </div>
    );
}

/**
 * مبلغ با «کیلومترشمار»: هر رقم یک ستون ۰ تا ۹ (دو دور) است که بعد از mount تا رقم
 * نهایی می‌چرخد؛ رقم‌ها با کمی تأخیر پشت سر هم می‌نشینند.
 */
function RollingAmount({ value }: { value: string }) {
    const [rolled, setRolled] = useState(false);

    useEffect(() => {
        const frame = window.requestAnimationFrame(() => setRolled(true));
        return () => window.cancelAnimationFrame(frame);
    }, []);

    let digitIndex = 0;
    return (
        <span className={styles.rolling} dir="ltr" aria-label={value}>
            {value.split('').map((char, index) => {
                if (!/\d/.test(char)) {
                    return <span key={index} className={styles.rollingChar} aria-hidden>{char}</span>;
                }
                const order = digitIndex++;
                // دور دوم نوار (۱۰ + رقم) تا هر ستون حداقل یک دور کامل بچرخد
                const target = 10 + Number(char);
                return (
                    <span key={index} className={styles.digit} aria-hidden>
                        <span
                            className={styles.digitStrip}
                            style={{
                                transform: `translateY(${rolled ? -target * 5 : 0}%)`,
                                transitionDelay: `${order * 70}ms`,
                            }}
                        >
                            {Array.from({ length: 20 }, (_, n) => <span key={n}>{n % 10}</span>)}
                        </span>
                    </span>
                );
            })}
        </span>
    );
}
