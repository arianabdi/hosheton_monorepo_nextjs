// ساختار قیمت‌گذاری مدل (هم‌شکل pricing در API provider-models)

export interface MatrixAxis {
    key: string;
    label: string;
    values: string[];
    source?: 'manual' | 'setting' | 'runtime';
    settingKey?: string;
    runtimeKey?: string;
    valueType?: 'string' | 'number' | 'boolean';
}
export interface MatrixRow  {
    dims: Record<string, string>;
    conditions?: Record<string, Record<string, unknown>>;
    price: number;
    per: string;
}

export interface ModelPricing {
    mode?: string;
    currency?: string;
    rates?: { inputPer1M?: number; outputPer1M?: number; cacheTiers?: Array<{ id: string; label: string; ratePer1M: number }> };
    unit?: { amount?: number; per?: string };
    matrix?: { axes?: MatrixAxis[]; rows?: MatrixRow[] };
    tokenEstimator?: {
        mode?: 'matrix' | 'video_pixels' | 'formula';
        multiplyByQuantity?: boolean;
        segments?: Array<{
            source: 'setting' | 'context';
            key: string;
            label: string;
            values?: string[];
        }>;
        rows?: Array<{ dims: Record<string, string>; outputTokens: number }>;
        fps?: number;
        divisor?: number;
        includeInputVideoDuration?: boolean;
        resolutions?: Array<{ value: string; width: number; height: number }>;
        expression?: Record<string, unknown>;
        expressionText?: string;
        lookups?: Array<{
            id: string;
            label: string;
            source: 'setting' | 'runtime';
            key: string;
            table: Record<string, number>;
            fallback?: number;
        }>;
        resultType?: 'output_tokens' | 'vendor_cost_usd';
        presetKey?: 'seedance' | 'veo' | 'omni' | 'heygen' | 'kling' | 'openai' | 'gpt-image';
        rounding?: 'round' | 'ceil' | 'floor' | 'none';
        notesMarkdown?: string;
    };
}
