'use client';

import { useEffect, useMemo, useState } from 'react';
import { mediaApi } from '../lib/media-api';
import { providersApi, type ProviderModelModeItem } from '../lib/providers-api';
import { CostFormulaExplainer } from './CostFormulaExplainer';
import styles from './CostEstimatePanel.module.scss';

export interface CostEstimatePayload {
    modelId: string;
    nodeType?: string;
    modelSettings?: Record<string, unknown>;
    promptLength?: number;
    unitCount?: number;
    usage?: Record<string, unknown>;
    runtimeMetrics?: Record<string, string | number | boolean> | Record<string, unknown>;
}

export interface CostEstimateResult {
    amount: number;
    currency: 'USD' | string;
    unit: string;
    vendorCostUsd?: number;
    markupPercent?: number;
    chargedUsd?: number;
    profitUsd?: number;
    breakdown?: Record<string, unknown>;
    pricingMode?: string;
    modelName?: string;
    modeId?: string;
    modeResolutionReason?: 'explicit' | 'required_inputs' | 'default' | 'fallback' | 'legacy';
    isEstimate?: boolean;
    /**
     * The exact amount shown and debited for this run — chargedUsd rounded the way
     * formatChatUsd prints it. A chat send is charged this number, nothing else.
     */
    quotedUsd?: number;
}

/** Price to show for a run: the server quote when present (what will be debited). */
export function quotedAmountOf(result: Pick<CostEstimateResult, 'quotedUsd' | 'chargedUsd' | 'amount'> | null | undefined): number | null {
    if (!result) return null;
    const value = result.quotedUsd ?? result.chargedUsd ?? result.amount;
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

interface CostEstimatePanelProps {
    modelId?: string;
    nodeType?: string;
    nodeTypeLabel?: string;
    modelType?: string;
    modelSettings?: Record<string, unknown>;
    promptLength?: number;
    runtimeMetrics?: Record<string, string | number | boolean> | Record<string, unknown>;
    title?: string;
    actualCost?: CostEstimateResult | null;
    prefilledEstimate?: CostEstimateResult | null;
    compact?: boolean;
}

export interface CostBreakdownRow {
    label: string;
    value: string;
    highlight?: 'profit';
}

const BREAKDOWN_LABELS: Record<string, string> = {
    mode: 'Pricing mode',
    model: 'Model',
    matchType: 'Matrix match',
    inputTokens: 'Input tokens',
    outputTokens: 'Output tokens',
    totalTokens: 'Total tokens',
    inputTokensPerSecond: 'Input tokens / second',
    outputTokensPerSecond: 'Output tokens / second',
    estimatedOutputTokens: 'Estimated output tokens',
    tokenEstimatorMode: 'Token estimation method',
    tokenEstimatorMatch: 'Token rule match',
    tokenEstimatorDims: 'Matched token settings',
    tokenEstimatorConditions: 'Matched token conditions',
    tokenEstimatorError: 'Token estimation error',
    tokenFormula: 'Token formula',
    costFormula: 'Cost formula',
    formulaVendorCostUsd: 'Formula vendor cost',
    matchedPricingRate: 'Matched pricing rate',
    pricingRatePer: 'Matched rate unit',
    inputVideoDurationSeconds: 'Input video duration',
    outputDurationSeconds: 'Output video duration',
    outputWidth: 'Output width',
    outputHeight: 'Output height',
    outputFps: 'Output FPS',
    tokenDivisor: 'Formula divisor',
    rowPrice: 'Matched rate / 1M tokens',
    per: 'Rate unit',
    tokenEstimatorWarning: 'Estimate warning',
    inputCost: 'Input cost',
    outputCost: 'Output cost',
    cacheCost: 'Cache cost',
    units: 'Units',
    unitPrice: 'Unit price',
    unitLabel: 'Unit type',
    durationSeconds: 'Duration (seconds)',
    characters: 'Characters',
    quantity: 'Quantity',
    vendorCostUsd: 'Vendor cost',
    markupPercent: 'Markup (%)',
    chargedUsd: 'Final charge',
    profitUsd: 'Profit',
    dims: 'Dimensions',
    matchedConditions: 'Matched pricing conditions',
    error: 'Error',
};

const BREAKDOWN_KEYS = [
    'mode',
    'model',
    'matchType',
    'inputTokens',
    'outputTokens',
    'totalTokens',
    'inputTokensPerSecond',
    'outputTokensPerSecond',
    'estimatedOutputTokens',
    'tokenEstimatorMode',
    'tokenEstimatorMatch',
    'tokenEstimatorDims',
    'tokenEstimatorConditions',
    'tokenEstimatorError',
    'tokenFormula',
    'costFormula',
    'formulaVendorCostUsd',
    'matchedPricingRate',
    'pricingRatePer',
    'inputVideoDurationSeconds',
    'outputDurationSeconds',
    'outputWidth',
    'outputHeight',
    'outputFps',
    'tokenDivisor',
    'rowPrice',
    'per',
    'tokenEstimatorWarning',
    'inputCost',
    'outputCost',
    'cacheCost',
    'units',
    'unitPrice',
    'unitLabel',
    'durationSeconds',
    'characters',
    'quantity',
    'vendorCostUsd',
    'markupPercent',
    'chargedUsd',
    'profitUsd',
    'matchedConditions',
] as const;

const CURRENCY_KEYS = new Set([
    'inputCost',
    'outputCost',
    'cacheCost',
    'unitPrice',
    'rowPrice',
    'formulaVendorCostUsd',
    'matchedPricingRate',
    'vendorCostUsd',
    'chargedUsd',
    'profitUsd',
]);

export function formatUsd(amount: number | null | undefined): string {
    if (amount == null || !Number.isFinite(amount)) return '—';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 4,
    }).format(amount);
}

export function formatCostBreakdown(breakdown?: Record<string, unknown>): CostBreakdownRow[] {
    if (!breakdown) return [];

    const rows: CostBreakdownRow[] = [];
    const push = (key: string, value: unknown) => {
        if (value == null || value === '') return;
        const numericValue = Number(value);
        rows.push({
            label: BREAKDOWN_LABELS[key],
            value: CURRENCY_KEYS.has(key) && Number.isFinite(numericValue)
                ? formatUsd(numericValue)
                : String(value),
        });
    };

    for (const key of BREAKDOWN_KEYS) {
        push(key, breakdown[key]);
    }

    if (breakdown.dims && typeof breakdown.dims === 'object') {
        const dimensions = Object.entries(breakdown.dims as Record<string, unknown>)
            .map(([key, value]) => `${key}=${String(value)}`)
            .join(', ');
        push('dims', dimensions);
    }

    push('error', breakdown.error);
    return rows;
}

function formatNodeTypeLabel(nodeType?: string, nodeTypeLabel?: string): string | null {
    if (nodeTypeLabel?.trim()) return nodeTypeLabel.trim();
    if (!nodeType?.trim()) return null;
    return nodeType.trim();
}

function normalizeModeId(value: unknown): string {
    return String(value ?? '').trim().toLowerCase();
}

function resolveExplicitModelType(
    modelType?: string,
    modelSettings?: Record<string, unknown>,
): string | null {
    const candidates = [
        modelType,
        modelSettings?.modelModeId,
        modelSettings?.modelMode,
    ];

    for (const candidate of candidates) {
        const normalized = String(candidate ?? '').trim();
        if (normalized) return normalized;
    }

    return null;
}

function resolveModeLabel(modeId: string | null, modes: ProviderModelModeItem[]): string | null {
    if (!modeId) return null;
    const match = modes.find((mode) => normalizeModeId(mode.id) === normalizeModeId(modeId));
    return match?.label?.trim() || match?.id?.trim() || modeId;
}

const COMPOUND_VALUE_SEPARATOR = ' · ';

interface CompoundValueSegment {
    key: string;
    value: string;
}

export function parseCompoundValue(value: string): CompoundValueSegment[] | null {
    if (!value.includes(COMPOUND_VALUE_SEPARATOR)) return null;

    const segments = value
        .split(COMPOUND_VALUE_SEPARATOR)
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => {
            const eqIndex = part.indexOf('=');
            if (eqIndex === -1) {
                return { key: part, value: '' };
            }
            return {
                key: part.slice(0, eqIndex).trim(),
                value: part.slice(eqIndex + 1).trim(),
            };
        });

    return segments.length > 0 ? segments : null;
}

function BreakdownValue({ value }: { value: string }) {
    const segments = parseCompoundValue(value);

    if (!segments) {
        return <span className={styles.breakdownValue}>{value}</span>;
    }

    return (
        <div className={styles.compoundValueList}>
            {segments.map((segment, index) => (
                <div key={`${segment.key}-${index}`} className={styles.compoundValueRow}>
                    <span className={styles.compoundValueKey}>{segment.key}</span>
                    {segment.value ? (
                        <span className={styles.valueBadge}>{segment.value}</span>
                    ) : (
                        <span className={styles.valueBadgeEmpty}>—</span>
                    )}
                </div>
            ))}
        </div>
    );
}

export function CostEstimatePanel({
    modelId,
    nodeType,
    nodeTypeLabel,
    modelType,
    modelSettings,
    promptLength,
    runtimeMetrics,
    title = 'Cost Estimate',
    actualCost,
    prefilledEstimate,
    compact = false,
}: CostEstimatePanelProps) {
    const [liveEstimate, setLiveEstimate] = useState<{
        settingsKey: string;
        result: CostEstimateResult | null;
        error: string | null;
        loading: boolean;
    }>({
        settingsKey: '',
        result: null,
        error: null,
        loading: false,
    });
    const [modelModes, setModelModes] = useState<ProviderModelModeItem[]>([]);
    const [modelModesLoading, setModelModesLoading] = useState(false);

    const settingsKey = useMemo(
        () => JSON.stringify({ modelId, nodeType, modelSettings, promptLength, runtimeMetrics }),
        [modelId, nodeType, modelSettings, promptLength, runtimeMetrics],
    );

    const hasActualCost = Boolean(actualCost);
    const hasPrefilledEstimate = Boolean(prefilledEstimate);

    useEffect(() => {
        if (!modelId) {
            setModelModes([]);
            setModelModesLoading(false);
            return;
        }

        let cancelled = false;
        setModelModesLoading(true);

        providersApi.getModel(modelId)
            .then((model) => {
                if (cancelled) return;
                setModelModes(Array.isArray(model.modes) ? model.modes : []);
            })
            .catch(() => {
                if (!cancelled) setModelModes([]);
            })
            .finally(() => {
                if (!cancelled) setModelModesLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [modelId]);

    useEffect(() => {
        const payload = JSON.parse(settingsKey) as CostEstimatePayload;
        if (hasActualCost || hasPrefilledEstimate || !payload.modelId) return;
        let cancelled = false;
        setLiveEstimate({
            settingsKey,
            result: null,
            error: null,
            loading: true,
        });

        mediaApi.estimateCost(payload)
            .then((data) => {
                if (!cancelled) {
                    setLiveEstimate({
                        settingsKey,
                        result: data,
                        error: null,
                        loading: false,
                    });
                }
            })
            .catch(() => {
                if (cancelled) return;
                setLiveEstimate({
                    settingsKey,
                    result: null,
                    error: 'Unable to calculate cost',
                    loading: false,
                });
            });

        return () => {
            cancelled = true;
        };
    }, [settingsKey, hasActualCost, hasPrefilledEstimate]);

    const liveResult = liveEstimate.settingsKey === settingsKey
        ? liveEstimate.result
        : null;
    const error = liveEstimate.settingsKey === settingsKey
        ? liveEstimate.error
        : null;
    const loading = Boolean(modelId)
        && !hasActualCost
        && !hasPrefilledEstimate
        && (
            liveEstimate.settingsKey !== settingsKey
            || liveEstimate.loading
        );
    const display = actualCost ?? prefilledEstimate ?? liveResult;
    const breakdownRows = formatCostBreakdown(display?.breakdown);
    if (display) {
        const appendFinancialRow = (
            label: string,
            value: string,
            highlight?: CostBreakdownRow['highlight'],
        ) => {
            if (!breakdownRows.some((row) => row.label === label)) {
                breakdownRows.push({ label, value, highlight });
            }
        };
        if (display.vendorCostUsd != null) {
            appendFinancialRow('Vendor cost', formatUsd(display.vendorCostUsd));
        }
        if (display.markupPercent != null) {
            if (!breakdownRows.some((row) => row.label === 'Markup (%)')) {
                appendFinancialRow(
                    'Profit percentage',
                    `${Number(display.markupPercent).toLocaleString('en-US')}%`,
                    'profit',
                );
            }
        }
        if (display.profitUsd != null) {
            appendFinancialRow('Profit', formatUsd(display.profitUsd), 'profit');
        }
        breakdownRows.forEach((row) => {
            if (row.label === 'Markup (%)' || row.label === 'Profit') {
                row.highlight = 'profit';
            }
        });
    }
    // فرمول‌ها را CostFormulaExplainer گام‌به‌گام نشان می‌دهد؛ در لیست خام تکرار نشوند
    const explainedLabels = new Set(['Cost formula', 'Token formula', 'Formula vendor cost']);
    const visibleBreakdownRows = breakdownRows.filter((row) => !explainedLabels.has(row.label));
    const estimatedTokens = Number(display?.breakdown?.estimatedOutputTokens ?? 0);
    const tokenFormula = display?.breakdown?.tokenFormula && !display.breakdown.tokenFormulaTree
        ? String(display.breakdown.tokenFormula)
        : '';
    const resolvedNodeTypeLabel = formatNodeTypeLabel(nodeType, nodeTypeLabel);
    const explicitModelType = resolveExplicitModelType(modelType, modelSettings);
    const resolvedModeId = (display?.modeId ? String(display.modeId) : null)
        || (display?.breakdown?.modeId ? String(display.breakdown.modeId) : null)
        || explicitModelType;
    const activeModeLabel = resolveModeLabel(resolvedModeId, modelModes);
    const hasModelModes = modelModes.length > 0;
    const activeModeSource = display?.modeResolutionReason === 'explicit' || (!display && explicitModelType)
        ? 'selected'
        : resolvedModeId
            ? 'auto'
            : null;
    const panelTitle = actualCost ? 'Final Cost' : title;

    const renderActiveModelType = () => {
        if (!hasModelModes) return null;

        return (
            <div className={styles.activeModelType}>
                <div className={styles.activeModelTypeHeader}>
                    <span className={styles.activeModelTypeLabel}>Model type (active)</span>
                    {modelModesLoading ? (
                        <span className={styles.activeModelTypeHint}>Loading modes…</span>
                    ) : activeModeLabel ? (
                        <span className={styles.activeModelTypeBadge}>{activeModeLabel}</span>
                    ) : (
                        <span className={styles.activeModelTypeBadgeEmpty}>Not resolved</span>
                    )}
                </div>
                {activeModeSource === 'auto' ? (
                    <p className={styles.activeModelTypeHint}>
                        Auto-selected from connected inputs and current settings
                    </p>
                ) : activeModeSource === 'selected' ? (
                    <p className={styles.activeModelTypeHint}>
                        Selected in node settings
                    </p>
                ) : null}
            </div>
        );
    };

    if (!modelId && !actualCost && !prefilledEstimate) {
        return (
            <div className={`${styles.panel} ${compact ? styles.compact : ''}`}>
                <div className={styles.titleBlock}>
                    <h4 className={styles.title}>{title}</h4>
                    {(resolvedNodeTypeLabel) ? (
                        <p className={styles.contextMeta}>
                            {resolvedNodeTypeLabel ? (
                                <span>Node: {resolvedNodeTypeLabel}</span>
                            ) : null}
                        </p>
                    ) : null}
                </div>
                {renderActiveModelType()}
                <p className={styles.hint}>Select a model first.</p>
            </div>
        );
    }

    return (
        <div className={`${styles.panel} ${compact ? styles.compact : ''}`}>
            <div className={styles.titleBlock}>
                <h4 className={styles.title}>{panelTitle}</h4>
                {(resolvedNodeTypeLabel) ? (
                    <p className={styles.contextMeta}>
                        {resolvedNodeTypeLabel ? (
                            <span>Node: {resolvedNodeTypeLabel}</span>
                        ) : null}
                    </p>
                ) : null}
            </div>

            {renderActiveModelType()}

            {loading && !display ? (
                <p className={styles.hint}>Calculating…</p>
            ) : error && !display ? (
                <p className={styles.error}>{error}</p>
            ) : display ? (
                <>
                    <div className={styles.amountRow}>
                        <span className={styles.amount}>{formatUsd(display.chargedUsd ?? display.amount)}</span>
                        {display.pricingMode ? (
                            <span className={styles.modeBadge}>{display.pricingMode}</span>
                        ) : null}
                    </div>
                    {display.modelName ? (
                        <p className={styles.meta}>Model: {display.modelName}</p>
                    ) : null}
                    {estimatedTokens > 0 ? (
                        <div className={styles.tokenEstimate}>
                            <div>
                                <span>Estimated output tokens</span>
                                <strong>{estimatedTokens.toLocaleString('en-US')}</strong>
                            </div>
                            {tokenFormula ? <BreakdownValue value={tokenFormula} /> : null}
                        </div>
                    ) : null}
                    {!actualCost && !prefilledEstimate ? (
                        <p className={styles.hint}>Estimate — based on current settings before execution</p>
                    ) : prefilledEstimate && !actualCost ? (
                        <p className={styles.hint}>Estimate — calculated when the request was created</p>
                    ) : null}
                    <div className={styles.explainBlock}>
                        <CostFormulaExplainer result={display} />
                    </div>
                    {visibleBreakdownRows.length > 0 ? (
                        <div className={styles.breakdownList}>
                            {visibleBreakdownRows.map((row, index) => (
                                <div
                                    key={`${row.label}-${index}`}
                                    className={`${styles.breakdownItem} ${
                                        row.highlight === 'profit' ? styles.breakdownItemProfit : ''
                                    }`}
                                >
                                    <span className={styles.breakdownLabel}>{row.label}</span>
                                    <BreakdownValue value={row.value} />
                                </div>
                            ))}
                        </div>
                    ) : null}
                </>
            ) : (
                <p className={styles.hint}>Pricing information is unavailable for this model.</p>
            )}
        </div>
    );
}
