import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveEffectiveRunStatus } from '../app/(developers)/projects/lib/process-run-status.ts';
import { isTerminalRunStatus, publishRunLifecycle, subscribeRunLifecycle, type RunLifecycleEvent } from '../app/(developers)/projects/lib/run-lifecycle-events.ts';
import { getRunRecoveryDelay, MAX_RUN_RECOVERY_ATTEMPTS } from '../app/(developers)/projects/lib/run-recovery-policy.ts';
import type { MediaJobLog, MediaRun } from '../app/(developers)/projects/types/media-api.ts';

const baseRun: MediaRun = {
    _id: 'run-1',
    projectId: 'project-1',
    userId: 'user-1',
    jobId: 'job-1',
    status: 'RUNNING',
};

const warningFailedLog: MediaJobLog = {
    _id: 'log-1',
    runId: 'run-1',
    projectId: 'project-1',
    userId: 'user-1',
    level: 'warning',
    stage: 'failed',
    message: 'Storage fallback was used',
};

test('effective status only follows authoritative run status', () => {
    assert.equal(resolveEffectiveRunStatus(baseRun, [warningFailedLog]), 'RUNNING');
    assert.equal(resolveEffectiveRunStatus(baseRun, [{
        ...warningFailedLog,
        level: 'error',
    }]), 'RUNNING');
    assert.equal(resolveEffectiveRunStatus({
        ...baseRun,
        status: 'COMPLETED',
        errorMessage: 'stale error',
        nodeResults: { node1: { status: 'error', error: 'stale' } },
    }), 'COMPLETED');
    assert.equal(resolveEffectiveRunStatus({ ...baseRun, status: 'FAILED' }), 'FAILED');
    assert.equal(resolveEffectiveRunStatus({ ...baseRun, status: 'CANCELLED' }), 'CANCELLED');
});

test('run lifecycle events update subscribers and can unsubscribe', () => {
    const received: RunLifecycleEvent[] = [];
    const unsubscribe = subscribeRunLifecycle((event) => received.push(event));
    const event: RunLifecycleEvent = {
        projectId: 'project-1',
        runId: 'run-1',
        status: 'COMPLETED',
    };

    publishRunLifecycle(event);
    unsubscribe();
    publishRunLifecycle({ ...event, status: 'FAILED' });

    assert.deepEqual(received, [event]);
    assert.equal(isTerminalRunStatus('PENDING'), false);
    assert.equal(isTerminalRunStatus('RUNNING'), false);
    assert.equal(isTerminalRunStatus('COMPLETED'), true);
    assert.equal(isTerminalRunStatus('FAILED'), true);
    assert.equal(isTerminalRunStatus('CANCELLED'), true);
});

test('recovery polling uses bounded backoff', () => {
    const delays = Array.from(
        { length: MAX_RUN_RECOVERY_ATTEMPTS },
        (_, attempt) => getRunRecoveryDelay(attempt),
    );

    assert.equal(MAX_RUN_RECOVERY_ATTEMPTS, 20);
    assert.deepEqual(delays.slice(0, 5), [0, 2_000, 5_000, 10_000, 20_000]);
    assert.equal(delays.at(-1), 90_000);
    assert.ok(delays.every((delay, index) => index === 0 || delay >= delays[index - 1]));
    assert.equal(getRunRecoveryDelay(-1), 0);
});
