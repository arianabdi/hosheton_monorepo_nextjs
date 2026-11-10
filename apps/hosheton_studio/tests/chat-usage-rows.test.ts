import assert from 'node:assert/strict';
import test from 'node:test';
import { aggregateUsageByModel, formulaUsageRows } from '../app/(developers)/projects/[projectId]/chat/lib/chat-usage.ts';

test('token pricing shows input and output, and cache only when cache tokens exist', () => {
    assert.deepEqual(
        formulaUsageRows('token', { mode: 'token', inputTokens: 120, outputTokens: 40, cacheCost: 0 }),
        [
            { key: 'inputTokens', value: 120 },
            { key: 'outputTokens', value: 40 },
        ],
    );
    assert.deepEqual(
        formulaUsageRows('token', { mode: 'token', inputTokens: 120, outputTokens: 40, cacheTokens: 15 }),
        [
            { key: 'inputTokens', value: 120 },
            { key: 'outputTokens', value: 40 },
            { key: 'cacheTokens', value: 15 },
        ],
    );
});

test('gpt-image formula uses text and image token buckets, not generic input/output', () => {
    assert.deepEqual(
        formulaUsageRows('formula', {
            mode: 'formula',
            textInputTokens: 250,
            imageInputTokens: 1049,
            imageOutputTokens: 7024,
            inputTokens: 250,
            outputTokens: 7024,
        }),
        [
            { key: 'textInputTokens', value: 250 },
            { key: 'imageInputTokens', value: 1049 },
            { key: 'imageOutputTokens', value: 7024 },
        ],
    );
});

test('text usage is split by the model that produced each turn, including cache input', () => {
    const groups = aggregateUsageByModel([
        {
            role: 'user',
            content: 'a',
            requestSnapshot: { promptText: 'a', attachments: [], mediaKind: 'text', settings: { modelId: 'luna', modelName: 'GPT Luna' } },
        },
        { role: 'assistant', content: 'b', status: 'complete', usage: { inputTokens: 100, outputTokens: 40, cacheTokens: 25 } },
        {
            role: 'user',
            content: 'c',
            requestSnapshot: { promptText: 'c', attachments: [], mediaKind: 'text', settings: { modelId: 'ds', modelName: 'DeepSeek V4 Flash' } },
        },
        {
            role: 'assistant',
            content: 'd',
            status: 'complete',
            usage: {
                prompt_tokens: 80,
                completion_tokens: 10,
                prompt_tokens_details: { cached_tokens: 30 },
            },
        },
    ] as never);
    assert.deepEqual(groups, [
        { modelId: 'luna', modelName: 'GPT Luna', input: 100, output: 40, cache: 25, costUsd: 0 },
        { modelId: 'ds', modelName: 'DeepSeek V4 Flash', input: 50, output: 10, cache: 30, costUsd: 0 },
    ]);
});

test('per-turn cost is attributed to the model of the preceding user snapshot', () => {
    const groups = aggregateUsageByModel([
        {
            role: 'user',
            content: 'a',
            requestSnapshot: { promptText: 'a', attachments: [], mediaKind: 'text', settings: { modelId: 'luna', modelName: 'GPT Luna' } },
        },
        {
            role: 'assistant',
            content: 'b',
            status: 'complete',
            cost: { amount: 0.02, currency: 'USD' },
            totalCost: 0.02,
            usage: { inputTokens: 100, outputTokens: 40 },
        },
        {
            role: 'user',
            content: 'c',
            requestSnapshot: { promptText: 'c', attachments: [], mediaKind: 'text', settings: { modelId: 'ds', modelName: 'DeepSeek V4 Flash' } },
        },
        {
            role: 'assistant',
            content: 'd',
            status: 'complete',
            // بدون cost.amount — از تفاضل totalCost تجمعی بازسازی می‌شود
            totalCost: 0.05,
            usage: { inputTokens: 50, outputTokens: 10 },
        },
    ] as never);
    assert.deepEqual(groups, [
        { modelId: 'luna', modelName: 'GPT Luna', input: 100, output: 40, cache: 0, costUsd: 0.02 },
        { modelId: 'ds', modelName: 'DeepSeek V4 Flash', input: 50, output: 10, cache: 0, costUsd: 0.03 },
    ]);
});

test('seedance-style formula uses durations, not the input/output/cache trio', () => {
    assert.deepEqual(
        formulaUsageRows('formula', {
            mode: 'formula',
            inputVideoDurationSeconds: 5,
            outputDurationSeconds: 8,
            estimatedOutputTokens: 46336,
            inputTokens: 1315,
            outputTokens: 46336,
            inputCost: 0.002,
            outputCost: 0.8,
        }),
        [
            { key: 'inputVideoDurationSeconds', value: 5 },
            { key: 'outputDurationSeconds', value: 8 },
            { key: 'estimatedOutputTokens', value: 46336 },
        ],
    );
});

test('per-unit pricing shows its own quantities', () => {
    assert.deepEqual(
        formulaUsageRows('per_second', { mode: 'per_second', units: 6, per: 'second' }),
        [{ key: 'units', value: 6 }],
    );
});
