'use client';

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { LuChevronDown, LuReceipt, LuRefreshCw } from 'react-icons/lu';
import { ModalHelper } from '@my-workspace/components';
import { canUseDeveloperTools } from '@/app/lib/user-roles';
import { useMobileViewport } from '@/app/hooks/useMobileViewport';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useChatCostEstimateStore } from '@/app/zustand/store/useChatCostEstimateStore';
import { mediaApi } from '@/app/(developers)/projects/lib/media-api';
import {
    formatCostBreakdown,
    parseCompoundValue,
    quotedAmountOf,
    type CostEstimatePayload,
    type CostEstimateResult,
} from '@/app/(developers)/projects/components/CostEstimatePanel';
import { formatChatUsd } from './lib/chat-usage';
import type { StudioChatMediaKind } from '@/app/(developers)/projects/types/media-api';
import { CostFormulaExplainer } from '@/app/(developers)/projects/components/CostFormulaExplainer';
import { useChatSession } from './ChatSessionContext';
import { chatCostEstimatePayload, estimateUnitKey } from './lib/chat-cost-estimate';
import { panelPopoverPlacement, resolvePopoverBounds, verticalMenuPlacement } from './lib/popover-bounds';
import styles from './ChatCostEstimate.module.scss';
// همان قاب پنجره تنظیمات مدل تا ظاهر دو پنجره یکی باشد
import toolbarStyles from './chatInput/CompactChatToolbar.module.scss';

/** ردیف‌هایی که توضیح فرمول (CostFormulaExplainer) خودش نشان می‌دهد و در جزئیات خام تکرار نمی‌شوند */
const EXPLAINED_LABELS = new Set([
    'Vendor cost', 'Markup (%)', 'Profit', 'Final charge',
    'Cost formula', 'Token formula', 'Formula vendor cost',
]);

/** آیکون تخمین هزینه کادر چت — فقط وقتی developer آن را از منوی شناور روشن کرده باشد. */
export function useChatCostButtonVisible() {
    const roles = useAppStore((state) => state.roles);
    const enabled = useChatCostEstimateStore((state) => state.buttonEnabled);
    return enabled && canUseDeveloperTools(roles);
}

/** نسخه چت: ورودی‌ها از جلسه چت (مدل، متن کادر، پیوست‌ها) خوانده می‌شوند */
export function ChatCostEstimateButton({ compact = false }: { compact?: boolean }) {
    const { mediaKind, settings, readComposerText, attachments } = useChatSession();

    const takeSnapshot = (): EstimateSnapshot | null => {
        if (!settings.modelId) return null;
        const promptLength = readComposerText().trim().length;
        // همان درخواستی که قیمت کنار دکمه ارسال و پنجره تأیید می‌فرستند
        const payload = chatCostEstimatePayload({ settings, mediaKind, attachments, promptLength });
        const metrics = payload.runtimeMetrics as Record<string, number>;
        return {
            payload,
            modelLabel: settings.modelName || settings.model || settings.modelId,
            kind: mediaKind,
            promptLength,
            images: metrics.inputImageCount,
            videos: metrics.inputVideoCount,
            audios: metrics.inputAudioCount,
        };
    };

    return <CostEstimatePopoverButton compact={compact} takeSnapshot={takeSnapshot} />;
}

/**
 * دکمه رسید + پنجره تخمین هزینه (developer). منبع ورودی‌ها با takeSnapshot داده می‌شود
 * تا همین پنجره در چت و در تنظیمات نود یکی باشد.
 */
export function CostEstimatePopoverButton({
    compact = false,
    takeSnapshot,
}: {
    compact?: boolean;
    takeSnapshot: () => EstimateSnapshot | null;
}) {
    const { t: tc } = useTranslation('common');
    const visible = useChatCostButtonVisible();
    // موبایل: به‌جای popover کنار دکمه، ModalHelper (BottomSheet) باز می‌شود
    const isMobile = useMobileViewport();
    // میزبان این دکمه را فقط وقتی visible است mount می‌کند؛ با خاموش شدن، state هم از بین می‌رود
    const [open, setOpen] = useState(false);
    const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null);
    const [narrowMenu, setNarrowMenu] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // کلیک بیرون و Escape — مثل پنجره تنظیمات مدل (در موبایل خود ModalHelper مدیریت می‌کند)
    useEffect(() => {
        if (!open || isMobile) return;
        // مودال «فرمول کامل» (ModalHelper) بیرون این پنجره رندر می‌شود؛ تا باز است، کلیک و
        // Escape مال خود مودال است و نباید پنجره cost estimate را ببندد
        const formulaModalOpen = () => Boolean(document.querySelector('[data-cost-formula-modal]'));
        const onDoc = (event: MouseEvent) => {
            const target = event.target as Node;
            if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
            if (formulaModalOpen()) return;
            setOpen(false);
        };
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !formulaModalOpen()) setOpen(false);
        };
        const timer = window.setTimeout(() => {
            document.addEventListener('mousedown', onDoc);
        }, 0);
        document.addEventListener('keydown', onKey);
        return () => {
            window.clearTimeout(timer);
            document.removeEventListener('mousedown', onDoc);
            document.removeEventListener('keydown', onKey);
        };
    }, [open, isMobile]);

    // جای‌گذاری دقیقاً مثل پنجره تنظیمات مدل (CompactChatToolbar): بالای دکمه،
    // دسکتاپ ۳۶۰px و در چت باریک هم‌عرض ستون چت با حاشیه ۱۲px
    useLayoutEffect(() => {
        if (!open || isMobile || !buttonRef.current) return;
        const button = buttonRef.current;
        // همان قاعده پنجره تنظیمات: هرگز بیرون از صفحه‌ای که دکمه در آن است
        const bounds = resolvePopoverBounds(button);

        const sync = () => {
            const rect = button.getBoundingClientRect();
            const horizontal = panelPopoverPlacement(rect, bounds);
            setNarrowMenu(horizontal.fill);
            setMenuStyle({
                position: 'fixed',
                ...horizontal.style,
                ...verticalMenuPlacement(rect, 420, 160),
                zIndex: 10050,
            });
        };

        sync();
        window.addEventListener('resize', sync);
        const observer = bounds ? new ResizeObserver(sync) : null;
        if (bounds && observer) observer.observe(bounds.element);
        return () => {
            window.removeEventListener('resize', sync);
            observer?.disconnect();
        };
    }, [open, isMobile]);

    if (!visible) return null;

    return (
        <>
            <button
                ref={buttonRef}
                type="button"
                className={`${styles.trigger} ${compact ? styles.triggerCompact : ''} ${open ? styles.triggerOpen : ''}`}
                aria-label={tc('cost_estimate')}
                aria-expanded={open}
                title={tc('cost_estimate')}
                onClick={() => {
                    if (open) setMenuStyle(null);
                    setOpen((value) => !value);
                }}
            >
                <LuReceipt size={compact ? 13 : 15} />
            </button>
            {isMobile ? (
                <ModalHelper
                    open={open}
                    onClose={() => setOpen(false)}
                    forceSheet
                    sheetTitle={tc('cost_estimate')}
                    component={open ? <CostEstimateContent takeSnapshot={takeSnapshot} /> : null}
                />
            ) : open && menuStyle && createPortal(
                <div
                    ref={menuRef}
                    className={`${toolbarStyles.popover} ${narrowMenu ? toolbarStyles.popoverCentered : ''}`}
                    style={menuStyle}
                    role="dialog"
                    aria-label={tc('cost_estimate')}
                >
                    <CostEstimateContent takeSnapshot={takeSnapshot} />
                </div>,
                document.body,
            )}
        </>
    );
}

export type EstimateSnapshot = {
    payload: CostEstimatePayload;
    modelLabel: string;
    kind: StudioChatMediaKind;
    promptLength: number;
    images: number;
    videos: number;
    audios: number;
};

type EstimateState =
    | { for: EstimateSnapshot; status: 'done'; result: CostEstimateResult }
    | { for: EstimateSnapshot; status: 'error' };

/**
 * محتوای popup — فقط وقتی باز است mount می‌شود، پس تا آن موقع هیچ درخواستی زده نمی‌شود.
 * ورودی‌ها یک‌بار هنگام باز شدن (و با دکمه بروزرسانی) گرفته می‌شوند تا تایپ، درخواست تازه نسازد.
 */
function CostEstimateContent({ takeSnapshot }: { takeSnapshot: () => EstimateSnapshot | null }) {
    const { t } = useTranslation('projects');
    const { t: tc } = useTranslation('common');

    const [snapshot, setSnapshot] = useState(takeSnapshot);
    // نتیجه به snapshotی که برایش گرفته شده گره می‌خورد؛ snapshot تازه = در حال محاسبه
    const [state, setState] = useState<EstimateState | null>(null);

    useEffect(() => {
        if (!snapshot) return;
        let cancelled = false;
        mediaApi.estimateCost(snapshot.payload)
            .then((result) => { if (!cancelled) setState({ for: snapshot, status: 'done', result }); })
            .catch(() => { if (!cancelled) setState({ for: snapshot, status: 'error' }); });
        return () => { cancelled = true; };
    }, [snapshot]);

    const refresh = () => setSnapshot(takeSnapshot());
    const settled = state && state.for === snapshot ? state : null;
    const loading = Boolean(snapshot) && !settled;
    const result = settled?.status === 'done' ? settled.result : null;

    const rows = result ? formatCostBreakdown(result.breakdown) : [];
    const detailRows = rows.filter((row) => !EXPLAINED_LABELS.has(row.label));
    // همان برچسب قیمت کنار دکمه ارسال: مبلغ = کل همین اجرا
    const unitKey = result && snapshot
        ? estimateUnitKey(result, snapshot.kind === 'text' ? 'message' : snapshot.kind)
        : '';
    const unitLabel = unitKey ? t(`chat_unit_${unitKey}`, { defaultValue: unitKey }) : '';

    const inputs = snapshot ? [
        snapshot.images ? `${snapshot.images} ${t('chat_kind_image')}` : '',
        snapshot.videos ? `${snapshot.videos} ${t('chat_kind_video')}` : '',
        snapshot.audios ? `${snapshot.audios} ${t('chat_kind_audio')}` : '',
        t('chat_cost_prompt_chars', { count: snapshot.promptLength }),
    ].filter(Boolean).join(' · ') : '';

    return (
        <div className={styles.pop}>
            <div className={styles.head}>
                <span className={styles.title}>
                    <LuReceipt size={14} aria-hidden />
                    {tc('cost_estimate')}
                </span>
                {snapshot ? (
                    <button
                        type="button"
                        className={styles.refresh}
                        onClick={refresh}
                        disabled={loading}
                        aria-label={tc('refresh')}
                        title={tc('refresh')}
                    >
                        <LuRefreshCw size={13} className={loading ? styles.spin : ''} />
                    </button>
                ) : null}
            </div>

            {!snapshot ? (
                <p className={styles.muted}>{t('chat_cost_no_model')}</p>
            ) : (
                <>
                    <div className={styles.amountRow}>
                        {loading ? (
                            <span className={styles.amountSkeleton} aria-label={t('calculating_cost')} />
                        ) : result ? (
                            <>
                                <strong className={styles.amount} dir="ltr">
                                    {formatChatUsd(quotedAmountOf(result) ?? 0)}
                                </strong>
                                {unitLabel ? <span className={styles.unit}>/ {unitLabel}</span> : null}
                            </>
                        ) : (
                            <span className={styles.error}>{t('chat_cost_error')}</span>
                        )}
                    </div>

                    <p className={styles.meta}>
                        <span>{result?.modelName || snapshot.modelLabel}</span>
                        <span>{t(`chat_kind_${snapshot.kind}`)}</span>
                        {result?.pricingMode ? <span dir="ltr">{result.pricingMode}</span> : null}
                        {result?.modeId ? <span dir="ltr">{result.modeId}</span> : null}
                    </p>

                    <dl className={styles.rows}>
                        <div className={styles.row}>
                            <dt>{t('chat_cost_inputs')}</dt>
                            <dd>{inputs}</dd>
                        </div>
                    </dl>

                    {result ? (
                        <div className={styles.explain}>
                            <p className={styles.explainTitle}>{t('cost_explain_title')}</p>
                            <CostFormulaExplainer result={result} />
                        </div>
                    ) : null}

                    {detailRows.length > 0 ? (
                        <details className={styles.details}>
                            <summary>
                                {t('chat_cost_details')}
                                <span className={styles.count}>{detailRows.length}</span>
                                <LuChevronDown size={14} className={styles.chevron} aria-hidden />
                            </summary>
                            <dl className={styles.detailRows}>
                                {detailRows.map((row, index) => (
                                    <div key={`${row.label}-${index}`} className={styles.detailRow}>
                                        <dt>{row.label}</dt>
                                        <dd dir="ltr"><DetailValue value={row.value} /></dd>
                                    </div>
                                ))}
                            </dl>
                        </details>
                    ) : null}

                    <p className={styles.note}>{t('chat_cost_note')}</p>
                </>
            )}
        </div>
    );
}

function DetailValue({ value }: { value: string }) {
    const segments = parseCompoundValue(value);
    if (!segments) return <>{value}</>;
    return (
        <span className={styles.segments}>
            {segments.map((segment, index) => (
                <span key={`${segment.key}-${index}`}>
                    {segment.key}
                    {segment.value ? <b>{segment.value}</b> : null}
                </span>
            ))}
        </span>
    );
}
