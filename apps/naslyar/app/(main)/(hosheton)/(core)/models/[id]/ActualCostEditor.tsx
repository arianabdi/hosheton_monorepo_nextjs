'use client';

import React, { useMemo, useState } from 'react';

import type { ActualCostConfig, ModelModeEditorValue } from './ModelModesEditor';
import styles from './ModelAdvancedConfig.module.scss';

function normalizeJsonPath(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) return '';
    return trimmed.startsWith('$') ? trimmed : `$.${trimmed.replace(/^\.+/, '')}`;
}

export function emptyActualCost(): ActualCostConfig {
    return {
        enabled: false,
        source: 'response',
        jsonPath: '',
        currency: 'USD',
        multiplier: 1,
        unitMultiplier: 1,
    };
}

export function actualCostFromApi(value: Partial<ActualCostConfig> | null | undefined): ActualCostConfig | undefined {
    if (!value) return undefined;
    const multiplier = Number.isFinite(Number(value.unitMultiplier ?? value.multiplier))
        ? Number(value.unitMultiplier ?? value.multiplier)
        : 1;
    const sourceRaw = String(value.source || 'response').trim().toLowerCase();
    return {
        enabled: value.enabled === true,
        source: sourceRaw === 'usage' ? 'usage' : 'response',
        jsonPath: String(value.jsonPath || ''),
        currency: 'USD',
        multiplier,
        unitMultiplier: multiplier,
    };
}

export function validateActualCost(config: ActualCostConfig | undefined, label: string): string[] {
    if (!config) return [];
    const errors: string[] = [];
    if (!config.source.trim()) errors.push(`source در ${label} الزامی است.`);
    if (!config.jsonPath.trim()) errors.push(`jsonPath در ${label} الزامی است.`);
    if (!config.currency.trim()) errors.push(`currency در ${label} الزامی است.`);
    const multiplier = Number(config.unitMultiplier ?? config.multiplier);
    if (!Number.isFinite(multiplier) || multiplier <= 0) {
        errors.push(`multiplier در ${label} باید عددی بزرگ‌تر از صفر باشد.`);
    }
    if (config.enabled && config.jsonPath.trim() && !/^\$(?:\.[A-Za-z_][A-Za-z0-9_-]*|\[\d+\])+$/.test(normalizeJsonPath(config.jsonPath))) {
        errors.push(`jsonPath در ${label} باید با $. شروع شود (مثلاً $.usage.cost).`);
    }
    return errors;
}

interface CostConfigCardProps {
    title: string;
    description: string;
    value: ActualCostConfig | undefined;
    onChange: (value: ActualCostConfig | undefined) => void;
}

function CostConfigCard({ title, description, value, onChange }: CostConfigCardProps) {
    const [sampleValue, setSampleValue] = useState(1);
    const config = value || emptyActualCost();
    const errors = validateActualCost(value, title);
    const patch = (next: Partial<ActualCostConfig>) => onChange({ ...config, ...next });

    return (
        <article className={styles.card}>
            <div className={styles.cardHeader}>
                <div>
                    <div className={styles.cardHeading}>{title}</div>
                    <div className={styles.hint}>{description}</div>
                </div>
                <div className={styles.checkRow} style={{ margin: 0 }}>
                    <label className={styles.checkLabel}>
                        <input
                            type="checkbox"
                            checked={config.enabled}
                            onChange={(event) => patch({ enabled: event.target.checked })}
                        />
                        فعال
                    </label>
                    {value && (
                        <button type="button" className={styles.dangerButton} onClick={() => onChange(undefined)}>
                            حذف تنظیم
                        </button>
                    )}
                </div>
            </div>
            <div className={styles.cardBody}>
                <div className={`${styles.grid} ${styles.threeColumns}`}>
                    <label className={styles.field}>
                        source
                        <input
                            value={config.source}
                            list="actual-cost-sources"
                            dir="ltr"
                            placeholder="response"
                            onChange={(event) => patch({ source: event.target.value })}
                        />
                        <span className={styles.hint}>مقادیر پشتیبانی‌شده: response یا usage.</span>
                    </label>
                    <label className={styles.field}>
                        jsonPath
                        <input
                            value={config.jsonPath}
                            dir="ltr"
                            placeholder="$.usage.cost"
                            onChange={(event) => patch({ jsonPath: event.target.value })}
                        />
                        <span className={styles.hint}>مسیر JSON با پیشوند $ (مثلاً $.usage.cost).</span>
                    </label>
                    <label className={styles.field}>
                        currency
                        <input
                            value={config.currency}
                            dir="ltr"
                            maxLength={8}
                            placeholder="USD"
                            onChange={(event) => patch({ currency: event.target.value.toUpperCase() })}
                        />
                    </label>
                </div>
                <div className={styles.grid}>
                    <label className={styles.field}>
                        multiplier
                        <input
                            value={config.unitMultiplier ?? config.multiplier ?? 1}
                            type="number"
                            min="0.000001"
                            step="any"
                            onChange={(event) => {
                                const next = Number(event.target.value);
                                patch({ multiplier: next, unitMultiplier: next });
                            }}
                        />
                        <span className={styles.hint}>
                            مقدار استخراج‌شده در این ضریب ضرب می‌شود؛ برای cents به USD از 0.01 استفاده کنید.
                        </span>
                    </label>
                    <label className={styles.field}>
                        پیش‌نمایش مقدار خام
                        <input
                            value={sampleValue}
                            type="number"
                            step="any"
                            onChange={(event) => setSampleValue(Number(event.target.value) || 0)}
                        />
                        <span className={styles.hint}>
                            خروجی: {((sampleValue * (config.unitMultiplier ?? config.multiplier ?? 1))).toLocaleString('en-US', {
                                maximumFractionDigits: 8,
                            })} {config.currency || 'USD'}
                        </span>
                    </label>
                </div>
                {errors.map((error) => <div className={styles.error} key={error}>{error}</div>)}
                {!config.enabled && (
                    <div className={styles.notice}>
                        این resolver غیرفعال است و backend باید از برآورد قیمت معمول مدل استفاده کند.
                    </div>
                )}
            </div>
        </article>
    );
}

interface ActualCostEditorProps {
    modelValue: ActualCostConfig | undefined;
    modes: ModelModeEditorValue[];
    onModelChange: (value: ActualCostConfig | undefined) => void;
    onModeChange: (editorId: string, value: ActualCostConfig | undefined) => void;
}

export default function ActualCostEditor({
    modelValue,
    modes,
    onModelChange,
    onModeChange,
}: ActualCostEditorProps) {
    const allErrors = useMemo(() => [
        ...validateActualCost(modelValue, 'تنظیم پیش‌فرض مدل'),
        ...modes.flatMap((mode, index) => validateActualCost(
            mode.actualCost,
            `mode ${mode.modeType || index + 1}`,
        )),
    ], [modelValue, modes]);

    return (
        <>
            <p className={styles.sectionDescription} style={{ marginBottom: '1rem' }}>
                اگر provider مبلغ واقعی را در پاسخ برمی‌گرداند، مسیر آن را اینجا مشخص کنید.
                تنظیم سطح mode بر تنظیم پیش‌فرض مدل اولویت دارد و مقدار استخراج‌شده پس از اعمال multiplier
                با currency تعیین‌شده ثبت می‌شود.
            </p>
            <datalist id="actual-cost-sources">
                <option value="response" />
                <option value="usage" />
            </datalist>

            <CostConfigCard
                title="تنظیم پیش‌فرض مدل"
                description="برای همه درخواست‌ها، مگر mode انتخاب‌شده تنظیم اختصاصی داشته باشد."
                value={modelValue}
                onChange={onModelChange}
            />

            {modes.length > 0 && (
                <>
                    <h5 className={styles.previewTitle}>تنظیم اختصاصی modeها</h5>
                    {modes.map((mode, index) => (
                        <CostConfigCard
                            key={mode.editorId}
                            title={`mode: ${mode.modeType || index + 1}`}
                            description={mode.endpointPath || 'endpoint هنوز وارد نشده است.'}
                            value={mode.actualCost}
                            onChange={(next) => onModeChange(mode.editorId, next)}
                        />
                    ))}
                </>
            )}

            {allErrors.length === 0 && (modelValue || modes.some((mode) => mode.actualCost)) && (
                <div className={styles.success}>ساختار تنظیمات actualCost معتبر است.</div>
            )}
        </>
    );
}
