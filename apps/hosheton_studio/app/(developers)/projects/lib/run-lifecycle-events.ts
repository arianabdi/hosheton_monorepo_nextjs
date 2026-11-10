import type { MediaRun } from '../types/media-api';

export interface RunLifecycleEvent {
    projectId: string;
    runId: string;
    status: MediaRun['status'];
    errorMessage?: string;
    executionOrder?: string[];
    nodeResults?: Record<string, unknown>;
    finalOutput?: Record<string, unknown>;
}

type RunLifecycleListener = (event: RunLifecycleEvent) => void;

const listeners = new Set<RunLifecycleListener>();

export function publishRunLifecycle(event: RunLifecycleEvent): void {
    listeners.forEach((listener) => listener(event));
}

export function subscribeRunLifecycle(listener: RunLifecycleListener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function isTerminalRunStatus(status: MediaRun['status']): boolean {
    return status === 'COMPLETED' || status === 'FAILED' || status === 'CANCELLED';
}
