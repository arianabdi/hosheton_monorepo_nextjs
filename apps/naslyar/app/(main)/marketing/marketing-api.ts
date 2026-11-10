import axios from 'axios';
import type { AnalyticsConnection } from './marketing.types';

export const MARKETING_CONNECTIONS_KEY = 'marketing.analytics.connections';

const SETTING_META = {
    group: 'marketing',
    label: 'اتصال‌های آنالیتیکس',
    description: 'اتصال‌های پلتفرم‌های آنالیتیکس (GA4 و...) به همراه داشبورد جاسازی‌شده برای هر پروژه.',
    type: 'json',
};

function normalizeConnections(payload: unknown): AnalyticsConnection[] {
    if (Array.isArray(payload)) {
        return payload as AnalyticsConnection[];
    }
    return [];
}

async function loadOrCreate(
    baseUrl: string,
    token: string,
): Promise<{ connections: AnalyticsConnection[]; settingCreated: boolean }> {
    const res = await axios
        .get(`${baseUrl}/api/system-setting/${encodeURIComponent(MARKETING_CONNECTIONS_KEY)}`, {
            headers: { authorization: `Bearer ${token}` },
        })
        .catch(() => null);

    if (res?.data?.statusCode === 200) {
        return {
            connections: normalizeConnections(res.data.data?.value),
            settingCreated: false,
        };
    }

    await axios.post(
        `${baseUrl}/api/system-setting`,
        { key: MARKETING_CONNECTIONS_KEY, value: [], ...SETTING_META },
        { headers: { authorization: `Bearer ${token}` } },
    );
    return { connections: [], settingCreated: true };
}

export async function loadConnections(
    baseUrl: string,
    token: string,
): Promise<{ connections: AnalyticsConnection[]; settingCreated: boolean }> {
    return loadOrCreate(baseUrl, token);
}

export async function saveConnections(
    baseUrl: string,
    token: string,
    connections: AnalyticsConnection[],
): Promise<void> {
    await axios.patch(
        `${baseUrl}/api/system-setting/${encodeURIComponent(MARKETING_CONNECTIONS_KEY)}`,
        { value: connections },
        { headers: { authorization: `Bearer ${token}` } },
    );
}

export function createConnectionId(): string {
    return `conn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
