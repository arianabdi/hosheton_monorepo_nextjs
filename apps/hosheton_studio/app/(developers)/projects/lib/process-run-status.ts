import type { TFunction } from 'i18next';
import type { MediaJobLog, MediaRun } from '../types/media-api';

export type EffectiveRunStatus = MediaRun['status'];

export function resolveEffectiveRunStatus(
    run: MediaRun,
    _logs?: MediaJobLog[],
): EffectiveRunStatus {
    void _logs;
    return run.status;
}

const JOB_STATE_KEYS: Record<string, string> = {
    waiting: 'waiting',
    prioritized: 'waiting',
    delayed: 'delayed',
    paused: 'paused',
    'waiting-children': 'waiting-children',
    active: 'active',
    completed: 'completed',
    failed: 'failed',
    missing: 'missing',
};

export function resolveJobStateLabel(
    t: TFunction<'projects'>,
    state?: string,
    fallback?: string,
): string {
    if (fallback) return fallback;
    if (!state) return '';
    const key = JOB_STATE_KEYS[state];
    if (!key) return String(state);
    return t(`job.${key}`, { defaultValue: state });
}

export function resolveStageLabel(t: TFunction<'projects'>, log: MediaJobLog): string {
    if (log.stage === 'completed' && log.level === 'error') {
        return t('stage.failed');
    }
    const key = log.stage;
    if (!key) return '';
    return t(`stage.${key}`, { defaultValue: log.stage });
}
