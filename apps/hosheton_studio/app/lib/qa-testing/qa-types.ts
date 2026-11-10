// تایپ‌های کنسول QA — قرینه اسکیماهای qa_* در libs/core/src/qa-testing

export type QaReleaseStatus = 'pending' | 'running' | 'passed' | 'failed' | 'aborted';
export type QaRunStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
export type QaRunMode = 'smoke' | 'full';
export type QaCostTier = 'free' | 'cheap' | 'paid';

export interface QaReleaseTotals {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
}

export interface QaRelease {
    _id: string;
    appKey: string;
    version: string;
    branch: string;
    commitSha: string;
    notes: string;
    mode: QaRunMode;
    status: QaReleaseStatus;
    totals: QaReleaseTotals;
    durationMs: number;
    costUsd: number;
    startedAt: string | null;
    finishedAt: string | null;
    createdAt: string;
}

export interface QaTestCase {
    _id: string;
    appKey: string;
    key: string;
    section: string;
    title: string;
    description: string;
    type: string;
    priority: string;
    costTier: QaCostTier;
    modelClass: string | null;
    requiresAuth: boolean;
    viewport: string;
    target: string;
    sortOrder: number;
    enabled: boolean;
}

export interface QaTestRun {
    _id: string;
    releaseId: string;
    key: string;
    title: string;
    section: string;
    status: QaRunStatus;
    mode: QaRunMode;
    durationMs: number;
    browser: string;
    viewport: string;
    error: string;
    retries: number;
    costUsd: number;
    skipReason: string;
    artifactCount?: number;
    startedAt: string | null;
    finishedAt: string | null;
    createdAt: string;
}

export interface QaRunLog {
    _id: string;
    runId: string;
    level: 'debug' | 'info' | 'warn' | 'error';
    step: string;
    message: string;
    data: Record<string, unknown> | null;
    at: string;
}

export interface QaArtifact {
    _id: string;
    runId: string;
    kind: 'screenshot' | 'video' | 'log' | 'trace';
    label: string;
    url: string;
    key: string;
    mimetype: string;
    size: number;
    createdAt: string;
}

export interface QaBug extends QaTestRun {
    release: Pick<QaRelease, '_id' | 'version' | 'appKey' | 'status'> | null;
    screenshot: Pick<QaArtifact, 'url' | 'label'> | null;
}

export interface QaRunnerStatus {
    _id: string;
    name: string;
    appKey: string;
    mode: string;
    runnerVersion: string;
    currentReleaseId: string | null;
    lastSeenAt: string;
    online: boolean;
}

/** اپ هدف کنسول — اولین هدف: hosheton_studio */
export const QA_APP_KEY = 'hosheton-studio';
