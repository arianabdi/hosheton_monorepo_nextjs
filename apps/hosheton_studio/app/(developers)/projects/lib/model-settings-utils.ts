import type { NodeSettingField } from '../types/node-catalog';

export function normalizeModelId(id: unknown): string {
    return String(id ?? '').trim();
}

export function buildDefaultModelSettings(schema: NodeSettingField[]): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const field of schema) {
        if (!field.key) continue;
        switch (field.type) {
            case 'checkbox':
                out[field.key] = false;
                break;
            case 'number':
            case 'slider':
                out[field.key] = field.min ?? 0;
                break;
            case 'select':
                out[field.key] = field.options?.[0]?.value ?? '';
                break;
            default:
                out[field.key] = '';
        }
    }
    return out;
}

export function mergeModelSettings(
    current: Record<string, unknown> | undefined,
    schema: NodeSettingField[],
): Record<string, unknown> {
    const defaults = buildDefaultModelSettings(schema);
    return { ...defaults, ...(current || {}) };
}
