import axios from 'axios';
import type {
    EtrAlert,
    EtrAlertRule,
    EtrCoverage,
    EtrCoverageDimension,
    EtrDashboard,
    EtrEvent,
    EtrHealth,
    EtrIssue,
    EtrIssueDetail,
    EtrProject,
    EtrRelease,
    EtrSelfTest,
    EtrTablePage,
} from './error-tracking.types';

const BASE = '/api/error-tracking';

function headers(token: string) {
    return { headers: { authorization: `Bearer ${token}` } };
}

// ============================================================ Dashboard

export async function fetchDashboard(baseUrl: string, token: string, projectId?: string): Promise<EtrDashboard> {
    const params = new URLSearchParams();
    if (projectId) params.set('projectId', projectId);
    const res = await axios.get(`${baseUrl}${BASE}/panel/dashboard?${params.toString()}`, headers(token));
    return res.data?.data;
}

// ============================================================ Projects

export async function fetchProjects(baseUrl: string, token: string, page = 1, limit = 100): Promise<{ projects: EtrProject[]; totalItems: number }> {
    const res = await axios.get(`${baseUrl}${BASE}/panel/projects?page=${page}&limit=${limit}`, headers(token));
    return res.data?.data;
}

export async function createProject(
    baseUrl: string,
    token: string,
    body: { name: string; slug?: string; description?: string; platform?: string; environment?: string; sourceMapOrigins?: string[] },
): Promise<{ project: EtrProject }> {
    const res = await axios.post(`${baseUrl}${BASE}/panel/projects`, body, headers(token));
    return res.data?.data;
}

export async function updateProject(baseUrl: string, token: string, id: string, body: Record<string, any>): Promise<{ project: EtrProject }> {
    const res = await axios.patch(`${baseUrl}${BASE}/panel/projects/${id}`, body, headers(token));
    return res.data?.data;
}

export async function deleteProject(baseUrl: string, token: string, id: string): Promise<void> {
    await axios.delete(`${baseUrl}${BASE}/panel/projects/${id}`, headers(token));
}

export async function rotateProjectKey(baseUrl: string, token: string, id: string): Promise<{ project: EtrProject }> {
    const res = await axios.post(`${baseUrl}${BASE}/panel/projects/${id}/rotate-key`, {}, headers(token));
    return res.data?.data;
}

// ============================================================ Issues

export interface EtrIssueFilters {
    projectId?: string;
    level?: string;
    status?: string;
    search?: string;
    release?: string;
    environment?: string;
    /** tags.service رویدادها: ai-provider، studio-generation، storage… */
    service?: string;
    /** title | level | status | events | users | firstSeenAt | lastSeenAt */
    sort?: string;
    dir?: 'asc' | 'desc';
}

export async function fetchIssues(
    baseUrl: string,
    token: string,
    filters: EtrIssueFilters,
    page = 1,
    limit = 10,
): Promise<{ issues: EtrIssue[]; totalItems: number; services?: string[] }> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    Object.entries(filters).forEach(([key, value]) => {
        if (value) params.set(key, String(value));
    });
    const res = await axios.get(`${baseUrl}${BASE}/panel/issues?${params.toString()}`, headers(token));
    return res.data?.data;
}

export async function fetchIssue(baseUrl: string, token: string, issueId: string): Promise<EtrIssueDetail> {
    const res = await axios.get(`${baseUrl}${BASE}/panel/issues/${issueId}`, headers(token));
    return res.data?.data;
}

export async function setIssueStatus(baseUrl: string, token: string, issueId: string, status: string): Promise<{ issue: EtrIssue }> {
    const res = await axios.patch(`${baseUrl}${BASE}/panel/issues/${issueId}/status`, { status }, headers(token));
    return res.data?.data;
}

/** یادداشت رفع (علت و راه‌حل)؛ رشتهٔ خالی یادداشت را پاک می‌کند */
export async function setIssueNote(baseUrl: string, token: string, issueId: string, note: string): Promise<{ issue: EtrIssue }> {
    const res = await axios.patch(`${baseUrl}${BASE}/panel/issues/${issueId}/note`, { note }, headers(token));
    return res.data?.data;
}

export async function fetchIssueEvents(baseUrl: string, token: string, issueId: string, page = 1, limit = 10): Promise<{ events: EtrEvent[]; totalItems: number }> {
    const res = await axios.get(`${baseUrl}${BASE}/panel/issues/${issueId}/events?page=${page}&limit=${limit}`, headers(token));
    return res.data?.data;
}

export async function fetchEvent(baseUrl: string, token: string, eventId: string): Promise<{ event: EtrEvent }> {
    const res = await axios.get(`${baseUrl}${BASE}/panel/events/${eventId}`, headers(token));
    return res.data?.data;
}

// ============================================================ Coverage & health

export async function fetchCoverage(baseUrl: string, token: string, projectId?: string): Promise<EtrCoverage> {
    const params = new URLSearchParams();
    if (projectId) params.set('projectId', projectId);
    const res = await axios.get(`${baseUrl}${BASE}/panel/coverage?${params.toString()}`, headers(token));
    return res.data?.data;
}

/** عمومی و بدون توکن — برای نمایش «سرویس فعاله؟» */
export async function fetchEtrHealth(baseUrl: string): Promise<EtrHealth> {
    const res = await axios.get(`${baseUrl}${BASE}/health`);
    return res.data?.data;
}

/** تست سلامت کامل خط لوله برای یک پروژه — کلید عمومی پروژه لازم است (بدون JWT) */
export async function runSelfTest(baseUrl: string, publicKey: string): Promise<EtrSelfTest> {
    const res = await axios.post(`${baseUrl}${BASE}/self-test`, {}, {
        headers: { 'content-type': 'application/json', 'x-etr-key': publicKey },
    });
    return res.data?.data;
}

// ============================================================ Releases

export async function fetchReleases(baseUrl: string, token: string, projectId?: string, page = 1, limit = 20): Promise<{ releases: EtrRelease[]; totalItems: number }> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (projectId) params.set('projectId', projectId);
    const res = await axios.get(`${baseUrl}${BASE}/panel/releases?${params.toString()}`, headers(token));
    return res.data?.data;
}

// ============================================================ Alert rules & history

export async function fetchAlertRules(baseUrl: string, token: string, projectId?: string): Promise<{ rules: EtrAlertRule[]; totalItems: number }> {
    const params = new URLSearchParams({ page: '1', limit: '100' });
    if (projectId) params.set('projectId', projectId);
    const res = await axios.get(`${baseUrl}${BASE}/panel/alert-rules?${params.toString()}`, headers(token));
    return res.data?.data;
}

export async function createAlertRule(baseUrl: string, token: string, body: Record<string, any>): Promise<{ rule: EtrAlertRule }> {
    const res = await axios.post(`${baseUrl}${BASE}/panel/alert-rules`, body, headers(token));
    return res.data?.data;
}

export async function updateAlertRule(baseUrl: string, token: string, id: string, body: Record<string, any>): Promise<{ rule: EtrAlertRule }> {
    const res = await axios.patch(`${baseUrl}${BASE}/panel/alert-rules/${id}`, body, headers(token));
    return res.data?.data;
}

export async function deleteAlertRule(baseUrl: string, token: string, id: string): Promise<void> {
    await axios.delete(`${baseUrl}${BASE}/panel/alert-rules/${id}`, headers(token));
}

export async function fetchAlerts(baseUrl: string, token: string, projectId?: string, page = 1, limit = 20): Promise<{ alerts: EtrAlert[]; totalItems: number }> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (projectId) params.set('projectId', projectId);
    const res = await axios.get(`${baseUrl}${BASE}/panel/alerts?${params.toString()}`, headers(token));
    return res.data?.data;
}

/** KPIهای پوشش رصد + وضعیت ترنسپورت (بدون جدول‌ها) */
export async function fetchCoverageSummary(baseUrl: string, token: string, projectId?: string): Promise<Pick<EtrCoverage, 'kpis' | 'localTransport'>> {
    const params = new URLSearchParams({ summary: '1' });
    if (projectId) params.set('projectId', projectId);
    const res = await axios.get(`${baseUrl}${BASE}/panel/coverage?${params.toString()}`, headers(token));
    return res.data?.data;
}

/** یک جدول پوشش رصد — صفحه‌بندی، جستجو، فیلتر و مرتب‌سازی سمت سرور */
export async function fetchCoverageTable<T>(
    baseUrl: string,
    token: string,
    dimension: EtrCoverageDimension,
    query: Record<string, string | number | undefined>,
): Promise<EtrTablePage<T>> {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== '') params.set(key, String(value));
    });
    const res = await axios.get(`${baseUrl}${BASE}/panel/coverage/${dimension}?${params.toString()}`, headers(token));
    return res.data?.data;
}
