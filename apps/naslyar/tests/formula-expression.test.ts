import assert from 'node:assert/strict';
import test from 'node:test';

// @ts-expect-error Node's strip-types runner requires the TypeScript extension.
import {
    parseFormulaText,
    serializeFormulaExpression,
    type FormulaReference,
    type TokenFormulaNode,
} from '../app/(main)/(hosheton)/(core)/models/[id]/formulaExpression.ts';

const references: FormulaReference[] = [
    {
        ref: '@runtime.inputImageCount',
        label: 'Input image count',
        group: 'runtime-input',
        node: {
            type: 'value',
            source: 'runtime',
            key: 'inputImageCount',
            fallback: 0,
        },
    },
    {
        ref: '@setting.quality',
        label: 'Quality',
        group: 'settings',
        node: {
            type: 'value',
            source: 'setting',
            key: 'quality',
            fallback: 0,
        },
    },
    {
        ref: '@lookup.quality_factor',
        label: 'Quality factor',
        group: 'lookups',
        node: {
            type: 'lookup',
            source: 'setting',
            key: 'quality',
            table: { low: 16, medium: 48, high: 96 },
            fallback: 16,
            label: 'Quality factor',
        },
    },
];

test('parses variables, precedence, parentheses, and signed constants', () => {
    const result = parseFormulaText(
        '(@runtime.inputImageCount + 2) × −0.5',
        references,
    );

    assert.equal(result.error, undefined);
    assert.equal(result.expression?.type, 'operation');
    assert.equal(result.expression?.operator, 'multiply');
});

test('rejects unknown variables and malformed expressions', () => {
    assert.match(
        parseFormulaText('@runtime.missing + 1', references).error || '',
        /Unknown variable/,
    );
    assert.match(
        parseFormulaText('1..2 + 3', references).error || '',
        /Malformed number/,
    );
    assert.match(
        parseFormulaText('(1 + 2', references).error || '',
        /Parentheses do not match/,
    );
});

test('parses a reusable weighted option variable', () => {
    const result = parseFormulaText('@lookup.quality_factor * 2', references);

    assert.equal(result.error, undefined);
    assert.equal(result.expression?.type, 'operation');
    if (result.expression?.type !== 'operation') return;
    assert.deepEqual(result.expression.operands[0], {
        type: 'lookup',
        source: 'setting',
        key: 'quality',
        table: { low: 16, medium: 48, high: 96 },
        fallback: 16,
        label: 'Quality factor',
    });
});

test('round-trips lookup operands through stable aliases', () => {
    const expression: TokenFormulaNode = {
        type: 'operation',
        operator: 'multiply',
        operands: [
            {
                type: 'lookup',
                source: 'setting',
                key: 'quality',
                table: { low: 1, high: 2 },
                fallback: 1,
                label: 'Quality factor',
            },
            { type: 'value', source: 'constant', value: 4 },
        ],
    };
    const serialized = serializeFormulaExpression(expression);
    const result = parseFormulaText(serialized.text, [
        ...references,
        ...serialized.references,
    ]);

    assert.equal(result.error, undefined);
    assert.deepEqual(result.expression, expression);
});
