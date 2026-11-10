type MatrixRow = { price?: number };

type PricingModel = {
    class?: string;
    input?: number;
    output?: number;
    cachedInput?: number;
    pricing?: {
        mode?: string;
        rates?: { inputPer1M?: number; outputPer1M?: number; cacheTiers?: Array<{ ratePer1M?: number }> };
        unit?: { amount?: number; per?: string };
        matrix?: { rows?: MatrixRow[] };
    };
};

function fmtUsd(v: number | null | undefined): string {
    if (v == null || !Number.isFinite(v)) return '—';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 4,
    }).format(v);
}

function collectPositiveNumbers(values: Array<number | null | undefined>): number[] {
    return values.filter((v): v is number => v != null && Number.isFinite(v) && v >= 0);
}

export interface ModelPriceRange {
    minUsd: number | null;
    maxUsd: number | null;
    minLabel: string;
    maxLabel: string;
}

export function getModelPriceRange(model: PricingModel): ModelPriceRange {
    const pricing = model.pricing;
    const mode = pricing?.mode;

    if (mode === 'matrix' && pricing?.matrix?.rows?.length) {
        const prices = collectPositiveNumbers(
            pricing.matrix.rows.map((row) => row.price),
        );
        if (prices.length === 0) {
            return { minUsd: null, maxUsd: null, minLabel: '—', maxLabel: '—' };
        }
        const minUsd = Math.min(...prices);
        const maxUsd = Math.max(...prices);
        return { minUsd, maxUsd, minLabel: fmtUsd(minUsd), maxLabel: fmtUsd(maxUsd) };
    }

    if (
        mode === 'per_second' ||
        mode === 'per_minute' ||
        mode === 'per_hour' ||
        mode === 'per_1k_chars' ||
        mode === 'per_unit' ||
        pricing?.unit?.amount != null
    ) {
        const amount = Number(pricing?.unit?.amount);
        if (!Number.isFinite(amount)) {
            return { minUsd: null, maxUsd: null, minLabel: '—', maxLabel: '—' };
        }
        return {
            minUsd: amount,
            maxUsd: amount,
            minLabel: fmtUsd(amount),
            maxLabel: fmtUsd(amount),
        };
    }

    const rates = collectPositiveNumbers([
        pricing?.rates?.inputPer1M ?? model.input,
        pricing?.rates?.outputPer1M ?? model.output,
        pricing?.rates?.cacheTiers?.[0]?.ratePer1M ?? model.cachedInput,
    ]);

    if (rates.length === 0) {
        return { minUsd: null, maxUsd: null, minLabel: '—', maxLabel: '—' };
    }

    const minUsd = Math.min(...rates);
    const maxUsd = Math.max(...rates);
    return { minUsd, maxUsd, minLabel: fmtUsd(minUsd), maxLabel: fmtUsd(maxUsd) };
}
