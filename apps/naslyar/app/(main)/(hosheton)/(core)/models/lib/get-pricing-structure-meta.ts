export type PricingModeKey =
    | 'token'
    | 'matrix'
    | 'per_unit'
    | 'per_second'
    | 'per_minute'
    | 'per_hour'
    | 'per_1k_chars'
    | 'unknown';

export interface PricingStructureMeta {
    mode: PricingModeKey;
    labelFa: string;
    summary: string;
    detail?: string;
}

type PricingItem = {
    pricing?: {
        mode?: string;
        rates?: { inputPer1M?: number; outputPer1M?: number; cacheTiers?: Array<{ ratePer1M?: number }> };
        unit?: { amount?: number; per?: string };
        matrix?: { axes?: Array<{ key: string; label?: string; values?: string[] }>; rows?: unknown[] };
    };
    input?: number;
    output?: number;
    cachedInput?: number;
    class?: string;
};

const MODE_LABELS: Record<PricingModeKey, string> = {
    token: 'توکن (Token)',
    matrix: 'جدول (Matrix)',
    per_unit: 'هر واحد',
    per_second: 'هر ثانیه',
    per_minute: 'هر دقیقه',
    per_hour: 'هر ساعت',
    per_1k_chars: 'هر ۱K کاراکتر',
    unknown: 'نامشخص',
};

const PER_LABELS: Record<string, string> = {
    generation: 'تولید',
    image: 'تصویر',
    video: 'ویدیو',
    second: 'ثانیه',
    minute: 'دقیقه',
    hour: 'ساعت',
    '1k_chars': '۱K کاراکتر',
    character: 'کاراکتر',
    '1m_tokens': '۱M توکن',
};

function fmtUsd(v?: number) {
    if (v == null || !Number.isFinite(v)) return '—';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 4,
    }).format(v);
}

export function getPricingStructureMeta(item: PricingItem): PricingStructureMeta {
    const pricing = item.pricing;
    const mode = (pricing?.mode || 'unknown') as PricingModeKey;

    if (pricing?.mode === 'matrix' && pricing.matrix) {
        const axes = (pricing.matrix.axes || [])
            .map((a) => `${a.label || a.key} (${(a.values || []).length})`)
            .join(' · ');
        const rowCount = pricing.matrix.rows?.length || 0;
        return {
            mode: 'matrix',
            labelFa: MODE_LABELS.matrix,
            summary: `${rowCount} ردیف قیمت`,
            detail: axes || 'محور تعریف نشده',
        };
    }

    if (pricing?.mode === 'token' || (!pricing?.mode && (item.input || item.output))) {
        const inRate = pricing?.rates?.inputPer1M ?? item.input;
        const outRate = pricing?.rates?.outputPer1M ?? item.output;
        const cacheRate = pricing?.rates?.cacheTiers?.[0]?.ratePer1M ?? item.cachedInput;
        const parts = [`In ${fmtUsd(inRate)}`, `Out ${fmtUsd(outRate)}`];
        if (cacheRate != null && Number(cacheRate) > 0) {
            parts.push(`Cache ${fmtUsd(cacheRate)}`);
        }
        return {
            mode: 'token',
            labelFa: MODE_LABELS.token,
            summary: 'به ازای ۱M توکن',
            detail: parts.join(' · '),
        };
    }

    if (pricing?.mode === 'per_second') {
        return {
            mode: 'per_second',
            labelFa: MODE_LABELS.per_second,
            summary: fmtUsd(pricing.unit?.amount),
            detail: 'USD / second',
        };
    }

    if (pricing?.mode === 'per_minute') {
        return {
            mode: 'per_minute',
            labelFa: MODE_LABELS.per_minute,
            summary: fmtUsd(pricing.unit?.amount),
            detail: 'USD / minute',
        };
    }

    if (pricing?.mode === 'per_hour') {
        return {
            mode: 'per_hour',
            labelFa: MODE_LABELS.per_hour,
            summary: fmtUsd(pricing.unit?.amount),
            detail: 'USD / hour',
        };
    }

    if (pricing?.mode === 'per_1k_chars') {
        return {
            mode: 'per_1k_chars',
            labelFa: MODE_LABELS.per_1k_chars,
            summary: fmtUsd(pricing.unit?.amount),
            detail: 'USD / 1K chars',
        };
    }

    if (pricing?.mode === 'per_unit' || pricing?.unit) {
        const per = pricing.unit?.per || 'generation';
        return {
            mode: 'per_unit',
            labelFa: MODE_LABELS.per_unit,
            summary: fmtUsd(pricing.unit?.amount),
            detail: PER_LABELS[per] || per,
        };
    }

    if (pricing?.mode && pricing.mode in MODE_LABELS) {
        return {
            mode: pricing.mode as PricingModeKey,
            labelFa: MODE_LABELS[pricing.mode as PricingModeKey],
            summary: 'تعریف شده',
        };
    }

    return {
        mode: 'unknown',
        labelFa: item.class === 'video' ? 'تعریف نشده' : MODE_LABELS.unknown,
        summary: item.class === 'video' ? 'قیمت ویدیو ثبت نشده' : 'Token (legacy)',
        detail: item.input || item.output ? `In ${fmtUsd(item.input)} · Out ${fmtUsd(item.output)}` : undefined,
    };
}
