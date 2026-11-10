import axios from 'axios';

export interface SettingMeta {
    group: string;
    label: string;
    description: string;
    type?: string;
}

export async function loadSetting<T>(
    baseUrl: string,
    token: string,
    key: string,
    meta: SettingMeta,
    defaultValue: T,
    normalize?: (payload: unknown) => T,
): Promise<{ value: T; settingCreated: boolean }> {
    const parse = normalize ?? ((p: unknown) => (p ?? defaultValue) as T);

    const res = await axios
        .get(`${baseUrl}/api/system-setting/${encodeURIComponent(key)}`, {
            headers: { authorization: `Bearer ${token}` },
        })
        .catch(() => null);

    if (res?.data?.statusCode === 200) {
        return { value: parse(res.data.data?.value), settingCreated: false };
    }

    await axios.post(
        `${baseUrl}/api/system-setting`,
        { key, value: defaultValue, type: 'json', ...meta },
        { headers: { authorization: `Bearer ${token}` } },
    );
    return { value: defaultValue, settingCreated: true };
}

export async function saveSetting<T>(baseUrl: string, token: string, key: string, value: T): Promise<void> {
    await axios.patch(
        `${baseUrl}/api/system-setting/${encodeURIComponent(key)}`,
        { value },
        { headers: { authorization: `Bearer ${token}` } },
    );
}

export function createId(prefix: string): string {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
