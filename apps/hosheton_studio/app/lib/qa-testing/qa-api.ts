import { createApiClient, getApiErrorMessage, unwrapApiData } from '@/app/(developers)/projects/lib/api-client';
import { QA_APP_KEY, type QaArtifact, type QaBug, type QaRelease, type QaRunLog, type QaRunMode, type QaRunnerStatus, type QaTestCase, type QaTestRun } from './qa-types';

const BASE = '/api/qa-testing';

// ============================================================ Releases

export async function fetchQaSummary(): Promise<{ releases: QaRelease[]; stats: { totalReleases: number; passed: number; failed: number; running: number; pending: number } }> {
    try {
        return await unwrapApiData(await createApiClient().get(`${BASE}/panel/summary?appKey=${QA_APP_KEY}`));
    } catch (e) {
        throw new Error(getApiErrorMessage(e));
    }
}

export async function fetchQaReleases(page = 1, limit = 30): Promise<{ releases: QaRelease[]; totalItems: number }> {
    try {
        return await unwrapApiData(await createApiClient().get(`${BASE}/panel/releases?appKey=${QA_APP_KEY}&page=${page}&limit=${limit}`));
    } catch (e) {
        throw new Error(getApiErrorMessage(e));
    }
}

export async function createQaRelease(body: { version: string; mode: QaRunMode; notes?: string; testKeys?: string[] }): Promise<{ release: QaRelease; runsCount: number }> {
    try {
        return await unwrapApiData(await createApiClient().post(`${BASE}/panel/releases`, { appKey: QA_APP_KEY, ...body }));
    } catch (e) {
        throw new Error(getApiErrorMessage(e));
    }
}

export async function fetchQaReleaseDetail(id: string): Promise<{ release: QaRelease; runs: QaTestRun[] }> {
    try {
        return await unwrapApiData(await createApiClient().get(`${BASE}/panel/releases/${id}`));
    } catch (e) {
        throw new Error(getApiErrorMessage(e));
    }
}

export async function finishQaRelease(id: string): Promise<QaRelease> {
    try {
        return await unwrapApiData(await createApiClient().post(`${BASE}/panel/releases/${id}/finish`, {}));
    } catch (e) {
        throw new Error(getApiErrorMessage(e));
    }
}

export async function abortQaRelease(id: string): Promise<QaRelease> {
    try {
        return await unwrapApiData(await createApiClient().post(`${BASE}/panel/releases/${id}/abort`, {}));
    } catch (e) {
        throw new Error(getApiErrorMessage(e));
    }
}

// ============================================================ Test Cases

export async function fetchQaTestCases(): Promise<{ testCases: QaTestCase[]; totalItems: number }> {
    try {
        return await unwrapApiData(await createApiClient().get(`${BASE}/panel/test-cases?appKey=${QA_APP_KEY}`));
    } catch (e) {
        throw new Error(getApiErrorMessage(e));
    }
}

export async function updateQaTestCase(id: string, body: { enabled?: boolean }): Promise<{ testCase: QaTestCase }> {
    try {
        return await unwrapApiData(await createApiClient().patch(`${BASE}/panel/test-cases/${id}`, body));
    } catch (e) {
        throw new Error(getApiErrorMessage(e));
    }
}

// ============================================================ Runs / Bugs / Runners

export async function fetchQaRunDetail(id: string): Promise<{ run: QaTestRun; logs: QaRunLog[]; artifacts: QaArtifact[] }> {
    try {
        return await unwrapApiData(await createApiClient().get(`${BASE}/panel/runs/${id}`));
    } catch (e) {
        throw new Error(getApiErrorMessage(e));
    }
}

export async function retryQaRun(id: string): Promise<{ run: QaTestRun }> {
    try {
        return await unwrapApiData(await createApiClient().post(`${BASE}/panel/runs/${id}/retry`, {}));
    } catch (e) {
        throw new Error(getApiErrorMessage(e));
    }
}

export async function fetchQaBugs(releaseId?: string): Promise<{ bugs: QaBug[]; totalItems: number }> {
    try {
        return await unwrapApiData(await createApiClient().get(`${BASE}/panel/bugs?appKey=${QA_APP_KEY}&limit=100`));
    } catch (e) {
        throw new Error(getApiErrorMessage(e));
    }
}

export async function fetchQaRunners(): Promise<{ runners: QaRunnerStatus[]; totalItems: number }> {
    try {
        return await unwrapApiData(await createApiClient().get(`${BASE}/panel/runners`));
    } catch (e) {
        throw new Error(getApiErrorMessage(e));
    }
}
