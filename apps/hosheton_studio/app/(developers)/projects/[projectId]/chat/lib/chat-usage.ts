import type { StudioChatMessage } from '@/app/(developers)/projects/types/media-api';

export interface ChatUsageTotals {
    input: number;
    output: number;
    cache: number;
    totalTokens: number;
    costUsd: number;
}

export interface ModelUsageTotals {
    modelId: string;
    modelName: string;
    input: number;
    output: number;
    cache: number;
    costUsd: number;
}

function readCacheTokens(usage: NonNullable<StudioChatMessage['usage']> & Record<string, unknown>): number {
    const promptDetails = usage.prompt_tokens_details as { cached_tokens?: number } | undefined;
    const inputDetails = usage.input_tokens_details as { cached_tokens?: number } | undefined;
    const candidates = [
        usage.cacheTokens,
        usage.cached_tokens,
        usage.cache_read_input_tokens,
        usage.prompt_cache_hit_tokens,
        promptDetails?.cached_tokens,
        inputDetails?.cached_tokens,
        usage.cachedContentTokenCount,
    ];
    let best = 0;
    for (const candidate of candidates) {
        if (candidate == null || candidate === '') continue;
        const value = Number(candidate);
        if (Number.isFinite(value) && value > best) best = value;
    }
    return best;
}

export function messageTokenUsage(message: Pick<StudioChatMessage, 'usage'>) {
    const usage = (message.usage || {}) as NonNullable<StudioChatMessage['usage']> & Record<string, unknown>;
    const rawIn = Number(usage.inputTokens ?? usage.prompt_tokens ?? 0);
    const rawOut = Number(usage.outputTokens ?? usage.completion_tokens ?? 0);
    const rawCache = readCacheTokens(usage);
    const inputAlreadyNet = usage.inputTokens != null;
    return {
        input: Math.max(0, inputAlreadyNet ? rawIn : rawIn - rawCache),
        output: Math.max(0, rawOut),
        cache: rawCache,
    };
}

/** Cumulative chat usage. totalCost on the latest assistant turn wins; otherwise costs are summed. */
export function aggregateChatUsage(messages: StudioChatMessage[] | null | undefined): ChatUsageTotals {
    const list = messages || [];
    const tokens = { input: 0, output: 0, cache: 0 };
    let costUsd = 0;
    let hasCumulative = false;
    for (const message of list) {
        if (message.role !== 'assistant') continue;
        const usage = messageTokenUsage(message);
        tokens.input += usage.input;
        tokens.output += usage.output;
        tokens.cache += usage.cache;
        if (typeof message.totalCost === 'number' && Number.isFinite(message.totalCost)) {
            costUsd = Math.max(costUsd, message.totalCost);
            hasCumulative = true;
        }
    }
    if (!hasCumulative) {
        costUsd = 0;
        for (const message of list) {
            if (message.role === 'assistant' && typeof message.cost?.amount === 'number') {
                costUsd += message.cost.amount;
            }
        }
    }
    return {
        ...tokens,
        totalTokens: tokens.input + tokens.output + tokens.cache,
        costUsd,
    };
}

/** Text chats can switch models. Each assistant turn is billed to the model on the preceding user snapshot. */
export function aggregateUsageByModel(messages: StudioChatMessage[] | null | undefined): ModelUsageTotals[] {
    const list = messages || [];
    const order: string[] = [];
    const groups = new Map<string, ModelUsageTotals>();
    let pending: { id: string; name: string } | null = null;
    let prevCumulativeCost = 0;

    for (const message of list) {
        if (message.role === 'user') {
            const settings = message.requestSnapshot?.settings;
            const id = String(settings?.modelId || settings?.model || '').trim();
            const name = String(settings?.modelName || settings?.model || '').trim();
            pending = { id, name };
            continue;
        }
        if (message.role !== 'assistant' || message.status === 'failed') continue;
        const usage = messageTokenUsage(message);
        if (usage.input <= 0 && usage.output <= 0 && usage.cache <= 0) continue;
        const id = pending?.id || '';
        const name = pending?.name || id || '—';
        const key = id || name;
        let group = groups.get(key);
        if (!group) {
            group = { modelId: id, modelName: name, input: 0, output: 0, cache: 0, costUsd: 0 };
            groups.set(key, group);
            order.push(key);
        }
        group.input += usage.input;
        group.output += usage.output;
        group.cache += usage.cache;
        // هزینه هر نوبت: cost.amount همان هزینه همان پاسخ است؛ اگر نبود از تفاضل
        // totalCost تجمعی نوبت‌ها بازسازی می‌شود (با رند برای حذف نویز اعشار).
        const amount = message.cost?.amount;
        if (typeof amount === 'number' && Number.isFinite(amount) && amount > 0) {
            group.costUsd += amount;
        } else if (typeof message.totalCost === 'number' && Number.isFinite(message.totalCost)) {
            const diff = Math.round((message.totalCost - prevCumulativeCost) * 1e10) / 1e10;
            group.costUsd += Math.max(0, diff);
        }
        if (typeof message.totalCost === 'number' && Number.isFinite(message.totalCost)) {
            prevCumulativeCost = message.totalCost;
        }
    }

    return order.map((key) => groups.get(key)!);
}

export function formatChatUsd(amount: number): string {
    if (!Number.isFinite(amount) || amount <= 0) return '$0';
    if (amount >= 1) return `$${amount.toFixed(2)}`;
    if (amount >= 0.01) return `$${amount.toFixed(4)}`;
    return `$${amount.toFixed(6)}`;
}

export function isTokenPricingMode(mode?: string | null): boolean {
    return mode === 'token' || mode === 'per_1m_tokens';
}

export interface UsageDisplayRow {
    key: string;
    value: number | string;
}

const IMAGE_KEYS = ['textInputTokens', 'imageInputTokens', 'imageOutputTokens'] as const;
const VIDEO_KEYS = ['inputVideoDurationSeconds', 'outputDurationSeconds', 'estimatedOutputTokens'] as const;
const UNIT_KEYS = ['durationSeconds', 'characters', 'units', 'quantity', 'estimatedOutputTokens'] as const;

function rowsForKeys(
    breakdown: Record<string, unknown>,
    keys: readonly string[],
): UsageDisplayRow[] {
    return keys
        .filter((key) => {
            const value = breakdown[key];
            if (value == null || value === '') return false;
            if (typeof value === 'number' && !Number.isFinite(value)) return false;
            return typeof value === 'number' || typeof value === 'string';
        })
        .map((key) => ({ key, value: breakdown[key] as number | string }));
}

/**
 * Quantity rows for the usage ring, chosen from the model's pricing formula.
 * Token models (gpt-luna, deepseek) use input/output and cache only when cache tokens exist.
 * Image formulas (gpt-image) use text/image token buckets. Video formulas (seedance / omni)
 * use durations, not the generic input/output/cache trio.
 */
export function formulaUsageRows(
    pricingMode: string | undefined | null,
    breakdown: Record<string, unknown> | undefined | null,
): UsageDisplayRow[] {
    const mode = String(breakdown?.mode || pricingMode || '');
    if (!breakdown) {
        return isTokenPricingMode(mode)
            ? [
                { key: 'inputTokens', value: 0 },
                { key: 'outputTokens', value: 0 },
            ]
            : [];
    }

    if (IMAGE_KEYS.some((key) => key in breakdown)) return rowsForKeys(breakdown, IMAGE_KEYS);
    if (VIDEO_KEYS.slice(0, 2).some((key) => key in breakdown)) return rowsForKeys(breakdown, VIDEO_KEYS);
    if (isTokenPricingMode(mode) || mode === 'token' || breakdown.per === '1m_tokens') {
        const rows = rowsForKeys(breakdown, ['inputTokens', 'outputTokens']);
        const cacheTokens = Number(breakdown.cacheTokens ?? 0);
        if (cacheTokens > 0) rows.push({ key: 'cacheTokens', value: cacheTokens });
        return rows.length ? rows : [
            { key: 'inputTokens', value: 0 },
            { key: 'outputTokens', value: 0 },
        ];
    }
    if (UNIT_KEYS.some((key) => key in breakdown)) return rowsForKeys(breakdown, UNIT_KEYS);
    if ('inputTokens' in breakdown || 'outputTokens' in breakdown) {
        return rowsForKeys(breakdown, ['inputTokens', 'outputTokens']);
    }
    if ('estimatedOutputTokens' in breakdown) return rowsForKeys(breakdown, ['estimatedOutputTokens']);
    return [];
}
