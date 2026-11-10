'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useChatSession } from '../ChatSessionContext';
import { aggregateChatUsage, aggregateUsageByModel, formatChatUsd, formulaUsageRows, isTokenPricingMode } from '../lib/chat-usage';
import { formatAppNumber } from '@/app/lib/i18n/formatLocaleNumber';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import styles from './ChatContextUsage.module.scss';

const RING = 2 * Math.PI * 7;

const ROW_COLORS = ['#7b64cf', '#3b82f6', '#14b8a6', '#f59e0b', '#ec4899', '#6366f1'];

function ringSegments(values: number[]) {
    const total = values.reduce((sum, value) => sum + Math.max(0, value), 0);
    if (total <= 0) {
        return [{ color: 'var(--input-border-color, #c8c8c8)', length: RING, offset: 0 }];
    }
    let offset = 0;
    return values
        .map((value, index) => ({ value: Math.max(0, value), color: ROW_COLORS[index % ROW_COLORS.length] }))
        .filter((part) => part.value > 0)
        .map((part) => {
            const length = (part.value / total) * RING;
            const segment = { color: part.color, length, offset };
            offset += length;
            return segment;
        });
}

const ROW_LABELS: Record<string, string> = {
    inputTokens: 'ورودی',
    outputTokens: 'خروجی',
    cacheTokens: 'ورودی کش',
    textInputTokens: 'توکن متن',
    imageInputTokens: 'توکن تصویر ورودی',
    imageOutputTokens: 'توکن تصویر خروجی',
    estimatedOutputTokens: 'توکن خروجی',
    inputVideoDurationSeconds: 'ثانیه ویدیوی ورودی',
    outputDurationSeconds: 'ثانیه خروجی',
    durationSeconds: 'مدت (ثانیه)',
    units: 'تعداد',
    quantity: 'تعداد',
    characters: 'کاراکتر',
    outputWidth: 'عرض',
    outputHeight: 'ارتفاع',
};

export default function ChatContextUsage({
    anchorRef,
    estimateUsd = null,
    estimateUnit = 'message',
    pricingMode,
    breakdown,
    mediaKind,
}: {
    anchorRef?: RefObject<HTMLElement | null>;
    estimateUsd?: number | null;
    estimateUnit?: string;
    pricingMode?: string;
    breakdown?: Record<string, unknown>;
    mediaKind?: string;
}) {
    const { t } = useTranslation('projects');
    const lang = useAppStore((s) => s.lang);
    const chat = useChatSession().chat;
    const usage = aggregateChatUsage(chat?.messages);
    const [open, setOpen] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const titleId = useId();
    const [panelStyle, setPanelStyle] = useState<{ left: number; width: number; bottom: number; maxHeight: number } | null>(null);

    useLayoutEffect(() => {
        if (!open) return;
        const place = () => {
            const rect = (anchorRef?.current || buttonRef.current)?.getBoundingClientRect();
            if (!rect || rect.width <= 0) return;
            const vv = window.visualViewport;
            const viewHeight = vv?.height ?? window.innerHeight;
            const offsetTop = vv?.offsetTop ?? 0;
            const offsetLeft = vv?.offsetLeft ?? 0;
            const topInView = rect.top - offsetTop;
            const gap = 8;
            // سقف ارتفاع پنل: فضای خالی بالای باکس چت و حداکثر ۷۰٪ ارتفاع دستگاه؛
            // محتوای پنل داخل همین سقف اسکرول می‌شود.
            const spaceAbove = topInView - gap - 8;
            const deviceCap = Math.round(viewHeight * 0.7);
            setPanelStyle({
                left: rect.left - offsetLeft,
                width: rect.width,
                bottom: viewHeight - topInView + gap,
                maxHeight: Math.max(120, Math.min(spaceAbove, deviceCap)),
            });
        };
        place();
        window.addEventListener('resize', place);
        window.addEventListener('scroll', place, true);
        window.visualViewport?.addEventListener('resize', place);
        window.visualViewport?.addEventListener('scroll', place);
        return () => {
            window.removeEventListener('resize', place);
            window.removeEventListener('scroll', place, true);
            window.visualViewport?.removeEventListener('resize', place);
            window.visualViewport?.removeEventListener('scroll', place);
        };
    }, [open, anchorRef]);

    useEffect(() => {
        if (!open) return;
        const onPointer = (event: PointerEvent) => {
            const target = event.target as Node;
            if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) return;
            setOpen(false);
        };
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false);
        };
        window.addEventListener('pointerdown', onPointer, true);
        window.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('pointerdown', onPointer, true);
            window.removeEventListener('keydown', onKey);
        };
    }, [open]);

    const modelGroups = mediaKind === 'text' ? aggregateUsageByModel(chat?.messages) : [];
    const textGrouped = mediaKind === 'text' && modelGroups.length > 0;
    const pricedRows = formulaUsageRows(pricingMode, breakdown);
    const formulaSpecific = pricedRows.some((row) => row.key !== 'inputTokens' && row.key !== 'outputTokens' && row.key !== 'cacheTokens');
    const tokenMode = textGrouped || (!formulaSpecific && (
        isTokenPricingMode(pricingMode)
        || isTokenPricingMode(String(breakdown?.mode || ''))
        || (!pricingMode && !breakdown && mediaKind === 'text')
    ));
    const metricLabel = (key: string) => t(`chat_usage_${key}`, { defaultValue: ROW_LABELS[key] || key });
    const displayRows = textGrouped
        ? modelGroups.map((group, index) => ({
            key: `${group.modelId || group.modelName}-${index}`,
            value: group.input + group.output + group.cache,
        }))
            : tokenMode
            ? [
                { key: 'inputTokens', value: usage.input },
                { key: 'outputTokens', value: usage.output },
                ...(mediaKind === 'text' || usage.cache > 0
                    ? [{ key: 'cacheTokens', value: usage.cache }]
                    : []),
            ]
            : pricedRows;
    const rows = displayRows.map((row, index) => ({
        ...row,
        label: textGrouped
            ? (modelGroups[index]?.modelName || row.key)
            : metricLabel(row.key),
        color: ROW_COLORS[index % ROW_COLORS.length],
        numeric: typeof row.value === 'number' ? row.value : Number(row.value),
    }));
    const barValues = rows.map((row) => (Number.isFinite(row.numeric) ? Math.max(0, row.numeric) : 0));
    const barTotal = Math.max(barValues.reduce((sum, value) => sum + value, 0), 1);
    const segments = ringSegments(barValues);

    const panel = open && panelStyle ? (
        <div
            ref={panelRef}
            className={styles.panel}
            style={{
                left: panelStyle.left,
                width: panelStyle.width,
                bottom: panelStyle.bottom,
                maxHeight: panelStyle.maxHeight,
                top: 'auto',
            }}
            role="dialog"
            aria-labelledby={titleId}
        >
            <div className={styles.panelHead}>
                <strong id={titleId}>{t('chat_context_usage', { defaultValue: 'جزئیات زمینه' })}</strong>
                {tokenMode ? <span dir="ltr">{formatAppNumber(usage.totalTokens, lang)}</span> : null}
            </div>
            <div className={styles.bar} aria-hidden>
                {rows.map((row) => (
                    <span
                        key={row.key}
                        style={{
                            width: `${((Number.isFinite(row.numeric) ? Math.max(0, row.numeric) : 0) / barTotal) * 100}%`,
                            background: row.color,
                        }}
                    />
                ))}
            </div>
            <ul className={styles.rows}>
                {textGrouped ? modelGroups.map((group, index) => (
                    <li key={`${group.modelId || group.modelName}-${index}`} className={styles.modelBlock}>
                        <div className={styles.modelHead}>
                            <span>
                                <i className={styles.swatch} style={{ background: ROW_COLORS[index % ROW_COLORS.length] }} />
                                {group.modelName}
                            </span>
                            <b dir="ltr">{formatAppNumber(group.input + group.output + group.cache, lang)}</b>
                        </div>
                        <ul className={styles.modelRows}>
                            {([
                                ['inputTokens', group.input],
                                ['outputTokens', group.output],
                                ['cacheTokens', group.cache],
                            ] as const).map(([key, value]) => (
                                <li key={key}>
                                    <span>{metricLabel(key)}</span>
                                    <b dir="ltr">{formatAppNumber(value, lang)}</b>
                                </li>
                            ))}
                            <li className={styles.modelCostRow}>
                                <span>{t('chat_model_cost', { defaultValue: 'هزینه' })}</span>
                                <b dir="ltr">{formatChatUsd(group.costUsd)}</b>
                            </li>
                        </ul>
                    </li>
                )) : rows.map((row) => (
                    <li key={row.key} className={styles.flatRow}>
                        <span className={styles.swatch} style={{ background: row.color }} />
                        <span>{row.label}</span>
                        <b dir="ltr">{typeof row.value === 'number' ? formatAppNumber(row.value, lang) : String(row.value)}</b>
                    </li>
                ))}
            </ul>
            <div className={styles.costBlock}>
                <div>
                    <span>{t('chat_spent_so_far', { defaultValue: 'هزینه تا اینجا' })}</span>
                    <b dir="ltr">{formatChatUsd(usage.costUsd)}</b>
                </div>
                {mediaKind !== 'text' && estimateUsd != null && Number.isFinite(estimateUsd) ? (
                    <div>
                        <span>
                            {t('chat_next_estimate', { defaultValue: 'برآورد تولید بعدی' })}
                            {' '}
                            <small>/ {t(`chat_unit_${estimateUnit}`, { defaultValue: estimateUnit })}</small>
                        </span>
                        <b dir="ltr">{formatChatUsd(estimateUsd)}</b>
                    </div>
                ) : null}
            </div>
        </div>
    ) : null;

    return (
        <>
            <button
                ref={buttonRef}
                type="button"
                className={`${styles.trigger} ${open ? styles.triggerOpen : ''}`}
                aria-expanded={open}
                aria-label={t('chat_context_usage', { defaultValue: 'جزئیات زمینه' })}
                title={t('chat_context_usage', { defaultValue: 'جزئیات زمینه' })}
                onClick={() => setOpen((value) => !value)}
            >
                <svg viewBox="0 0 20 20" aria-hidden>
                    <g transform="rotate(-90 10 10)">
                        {segments.map((segment) => (
                            <circle
                                key={`${segment.color}-${segment.offset}`}
                                cx="10"
                                cy="10"
                                r="7"
                                fill="none"
                                stroke={segment.color}
                                strokeWidth="2.4"
                                strokeDasharray={`${segment.length} ${RING - segment.length}`}
                                strokeDashoffset={-segment.offset}
                            />
                        ))}
                    </g>
                </svg>
            </button>
            {panel && typeof document !== 'undefined' ? createPortal(panel, document.body) : null}
        </>
    );
}
