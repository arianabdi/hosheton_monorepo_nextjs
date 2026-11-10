import assert from 'node:assert/strict';
import test from 'node:test';

// @ts-expect-error Node's strip-types runner requires the TypeScript extension.
import {
    parseRequestProfileText,
    validateRequestProfile,
} from '../app/(main)/(hosheton)/(core)/models/[id]/requestProfile.ts';

test('accepts a complete flat Atlas request profile', () => {
    const profile = parseRequestProfileText(JSON.stringify({
        adapter: 'atlas-prediction',
        submitPath: { strategy: 'fixed', path: '/model/generateVideo' },
        envelope: 'flat',
        promptPath: 'prompt',
        bindings: [
            {
                source: 'image',
                payloadPath: 'reference_images',
                selection: 'all',
                maxItems: 4,
                required: true,
                materialization: 'public-url',
            },
            {
                source: 'video',
                payloadPath: 'input.start_frame',
                selection: 'index',
                index: 0,
                materialization: 'data-url',
            },
        ],
        outputPaths: {
            images: ['$.data.images'],
            video: ['$.data.output.url', '$.output.video.url'],
        },
    }));

    assert.equal(profile?.adapter, 'atlas-prediction');
    assert.equal(profile?.bindings?.[1].payloadPath, 'input.start_frame');
});

test('accepts a nested fal request profile and endpoint submit strategy', () => {
    const errors = validateRequestProfile({
        adapter: 'fal-queue',
        submitPath: { strategy: 'endpoint' },
        envelope: 'nested-input',
        inputKey: 'input',
        promptPath: 'prompt',
        bindings: [
            {
                source: 'audio',
                payloadPath: 'assets.audio',
                selection: 'first',
                materialization: 'preserve',
            },
        ],
    });

    assert.deepEqual(errors, []);
});

test('rejects invalid selection, materialization, index, and unsafe paths', () => {
    const errors = validateRequestProfile({
        adapter: 'custom',
        submitPath: { strategy: 'fixed' },
        bindings: [
            {
                source: 'image',
                payloadPath: '__proto__.image',
                selection: 'index',
                index: -1,
                materialization: 'file',
            },
        ],
    });

    assert.ok(errors.some((error) => error.includes('.adapter')));
    assert.ok(errors.some((error) => error.includes('submitPath.path')));
    assert.ok(errors.some((error) => error.includes('بخش غیرمجاز')));
    assert.ok(errors.some((error) => error.includes('.index')));
    assert.ok(errors.some((error) => error.includes('.materialization')));
});

test('empty text preserves legacy behavior by omitting requestProfile', () => {
    assert.equal(parseRequestProfileText('   '), undefined);
});
