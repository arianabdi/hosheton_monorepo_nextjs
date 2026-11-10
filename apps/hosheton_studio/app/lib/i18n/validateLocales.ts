import en from './locales/en.json';

type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
type JsonObject = {[key: string]: JsonValue};

function collectKeys(obj: JsonObject, prefix = ''): string[] {
    const keys: string[] = [];
    for (const [key, value] of Object.entries(obj)) {
        const path = prefix ? `${prefix}.${key}` : key;
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            keys.push(...collectKeys(value as JsonObject, path));
        } else {
            keys.push(path);
        }
    }
    return keys.sort();
}

export function validateLocaleFiles(locales: Record<string, JsonObject>) {
    const masterKeys = collectKeys(en as JsonObject);
    const report: string[] = [];

    for (const [lang, data] of Object.entries(locales)) {
        if (lang === 'en') continue;
        const keys = new Set(collectKeys(data));
        const missing = masterKeys.filter((k) => !keys.has(k));
        const extra = [...keys].filter((k) => !masterKeys.includes(k));
        if (missing.length) {
            report.push(`${lang}: missing ${missing.length} keys (e.g. ${missing.slice(0, 3).join(', ')})`);
        }
        if (extra.length) {
            report.push(`${lang}: extra ${extra.length} keys`);
        }
    }

    return {ok: report.length === 0, report, masterKeyCount: masterKeys.length};
}
