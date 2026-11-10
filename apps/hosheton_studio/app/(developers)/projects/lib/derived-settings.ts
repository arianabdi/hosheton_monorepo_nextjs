import type { NodeSettingField } from '../types/node-catalog';

/**
 * فیلدهای ترکیبی (`type: 'derived'`): مقدار نهایی از جدول `mapping` و مقادیر
 * فعلی فیلدهای `dependsOn` ساخته می‌شود. کلید ترکیب = مقادیر مبدأ join شده با
 * `|` به همان ترتیب `dependsOn` — مثلاً `['aspectRatio','resolution']` و
 * انتخاب‌های `16:9` + `1K` → کلید `"16:9|1K"` → `"1280x720"`.
 *
 * اگر هر یک از مبدأها خالی باشد یا ترکیب در جدول نباشد، مقدار خالی است و
 * `deriveBlockers` برای همین حالت پیام گیت کردن ارسال برمی‌گرداند.
 */

export type DerivedValueGetter = (key: string) => string;

export function derivedComboKey(field: NodeSettingField, getValue: DerivedValueGetter): string {
    const deps = field.dependsOn || [];
    if (!deps.length) return '';
    const values = deps.map((key) => String(getValue(key) ?? '').trim());
    if (values.some((value) => !value)) return '';
    return values.join('|');
}

/** مقدار محاسبه‌شده‌ی فیلد ترکیبی؛ '' یعنی «قابل تعیین نبوده». */
export function resolveDerivedValue(field: NodeSettingField, getValue: DerivedValueGetter): string {
    if (field.type !== 'derived') return '';
    const combo = derivedComboKey(field, getValue);
    if (!combo) return '';
    return String(field.mapping?.[combo] ?? '').trim();
}

/**
 * مقدار همه‌ی فیلدهای ترکیبی را روی یک کپی از modelSettings اعمال می‌کند.
 * خروجی فقط وقتی پاس داده می‌شود که تغییری واقعی رخ داده باشد (بدون لوپ).
 */
export function applyDerivedSettings(
    schema: NodeSettingField[],
    modelSettings: Record<string, unknown> | undefined,
    getValue: DerivedValueGetter,
): { modelSettings: Record<string, unknown>; changed: boolean } | null {
    const derived = schema.filter((field) => field.type === 'derived' && field.key);
    if (!derived.length) return null;
    const next = { ...(modelSettings || {}) };
    let changed = false;
    for (const field of derived) {
        const value = resolveDerivedValue(field, getValue);
        const current = next[field.key];
        if (value) {
            if (String(current ?? '') !== value) {
                next[field.key] = value;
                changed = true;
            }
        } else if (current !== undefined && current !== '') {
            // ترکیب دیگر معتبر نیست — مقدار کهنه نباید به provider برود
            delete next[field.key];
            changed = true;
        }
    }
    return changed ? { modelSettings: next, changed } : null;
}

export interface DerivedFieldStatus {
    field: NodeSettingField;
    value: string;
    /** کلید مبدأهایی که مقدار ندارند */
    missingDeps: string[];
    /** مبدأها پرند ولی این ترکیب در mapping نیست */
    missingCombo: boolean;
}

export function deriveFieldStatuses(
    schema: NodeSettingField[],
    getValue: DerivedValueGetter,
): DerivedFieldStatus[] {
    return schema
        .filter((field) => field.type === 'derived' && field.key)
        .map((field) => {
            const deps = field.dependsOn || [];
            const missingDeps = deps.filter((key) => !String(getValue(key) ?? '').trim());
            const combo = derivedComboKey(field, getValue);
            return {
                field,
                value: combo ? String(field.mapping?.[combo] ?? '').trim() : '',
                missingDeps,
                missingCombo: Boolean(combo) && field.mapping?.[combo] == null,
            };
        });
}

/**
 * پیام‌های مسدودکننده‌ی ارسال: هر فیلد ترکیبی که مقدار نهایی‌اش خالی بماند
 * (چه مبدأ انتخاب نشده باشد و چه ترکیبش در جدول نگاشت نباشد) ارسال را گیت می‌کند.
 */
export function deriveBlockers(schema: NodeSettingField[], getValue: DerivedValueGetter): string[] {
    const blockers: string[] = [];
    for (const status of deriveFieldStatuses(schema, getValue)) {
        const label = status.field.labelFa || status.field.label || status.field.key;
        if (status.missingDeps.length) {
            blockers.push(`برای «${label}» ابتدا مقادیر ${status.missingDeps.join(' و ')} را انتخاب کنید.`);
        } else if (status.missingCombo) {
            blockers.push(`ترکیب انتخاب‌شده برای «${label}» پشتیبانی نمی‌شود — ترکیب دیگری انتخاب کنید.`);
        }
    }
    return blockers;
}
