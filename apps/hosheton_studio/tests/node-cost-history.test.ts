import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mergeNodeCostHistory, sumNodeCostHistory } from '../app/(developers)/projects/lib/node-cost-history.ts';

describe('node cost history', () => {
    it('unions billed runs by runId instead of replacing the latest play', () => {
        const merged = mergeNodeCostHistory(
            [
                { amount: 0.0126, runId: 'run-1', at: '2026-01-01T00:00:00.000Z' },
            ],
            [
                { amount: 0.02, runId: 'run-2', at: '2026-01-02T00:00:00.000Z' },
            ],
        );

        assert.equal(merged.length, 2);
        assert.equal(sumNodeCostHistory(merged), 0.0326);
    });
});
