'use client';

import { useEffect } from 'react';
import { mediaApi } from '../lib/media-api';
import {
    isTerminalRunStatus,
    publishRunLifecycle,
} from '../lib/run-lifecycle-events';
import {
    getRunRecoveryDelay,
    MAX_RUN_RECOVERY_ATTEMPTS,
} from '../lib/run-recovery-policy';
import type { RunStatusResponse } from '../types/media-api';

export interface RecoveringRun {
    runId: string;
    nodeIds: string[];
}

export function useRunStatusRecovery({
    projectId,
    connected,
    runs,
    onTerminal,
}: {
    projectId: string;
    connected: boolean;
    runs: RecoveringRun[];
    onTerminal: (run: RecoveringRun, status: RunStatusResponse) => Promise<void> | void;
}) {
    useEffect(() => {
        if (!projectId || runs.length === 0) return;

        let cancelled = false;
        let timer: ReturnType<typeof setTimeout> | undefined;
        let attempt = 0;

        const poll = async () => {
            if (cancelled) return;

            const snapshots = await Promise.all(runs.map(async (run) => {
                try {
                    return { run, status: await mediaApi.getRunStatus(run.runId) };
                } catch {
                    return { run, status: null };
                }
            }));

            for (const { run, status } of snapshots) {
                if (!status || cancelled) continue;
                publishRunLifecycle({
                    projectId: status.projectId || projectId,
                    runId: status.runId,
                    status: status.status,
                    errorMessage: status.errorMessage,
                    executionOrder: status.executionOrder,
                    nodeResults: status.nodeResults,
                    finalOutput: status.finalOutput,
                });
                if (isTerminalRunStatus(status.status)) {
                    await onTerminal(run, status);
                }
            }

            attempt += 1;
            if (!cancelled && attempt < MAX_RUN_RECOVERY_ATTEMPTS) {
                timer = setTimeout(() => { void poll(); }, getRunRecoveryDelay(attempt));
            }
        };

        // A connectivity transition recreates this effect, so reconnect always
        // causes one immediate authoritative reconciliation.
        void poll();

        return () => {
            cancelled = true;
            if (timer) clearTimeout(timer);
        };
    }, [connected, onTerminal, projectId, runs]);
}
