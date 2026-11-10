import type { NodeSettingFieldForm } from './settingFieldForm';

/** Same operators and matching rules as the API resolver (model-mode.resolver.ts). */
export type RouteConditionOperator = 'in' | 'not_in' | 'gt' | 'gte' | 'lt' | 'lte';

export interface RouteConditionPayload {
    key: string;
    op: RouteConditionOperator;
    values?: string[];
    value?: number;
}

export interface RouteConditionForm {
    key: string;
    op: RouteConditionOperator;
    values: string[];
    /** Text of the number for gt / gte / lt / lte. */
    value: string;
}

export const ROUTE_CONDITION_OPERATORS: Array<{ value: RouteConditionOperator; label: string }> = [
    { value: 'in', label: 'یکی از' },
    { value: 'not_in', label: 'هیچ‌کدام از' },
    { value: 'gt', label: 'بیشتر از' },
    { value: 'gte', label: 'حداقل' },
    { value: 'lt', label: 'کمتر از' },
    { value: 'lte', label: 'حداکثر' },
];

const OPERATOR_SYMBOL: Record<RouteConditionOperator, string> = {
    in: '=',
    not_in: '≠',
    gt: '>',
    gte: '≥',
    lt: '<',
    lte: '≤',
};

export function isListOperator(op: RouteConditionOperator): boolean {
    return op === 'in' || op === 'not_in';
}

export function emptyRouteCondition(key = ''): RouteConditionForm {
    return { key, op: 'in', values: [], value: '' };
}

export function routeConditionsFromApi(value: unknown): RouteConditionForm[] {
    if (!Array.isArray(value)) return [];
    return value
        .filter((entry) => entry && typeof entry === 'object')
        .map((entry) => {
            const raw = entry as Record<string, unknown>;
            const op = (ROUTE_CONDITION_OPERATORS.some((item) => item.value === raw.op) ? raw.op : 'in') as RouteConditionOperator;
            return {
                key: String(raw.key || ''),
                op,
                values: Array.isArray(raw.values) ? raw.values.map((item) => String(item)) : [],
                value: raw.value == null ? '' : String(raw.value),
            };
        });
}

export function buildRouteConditionsPayload(conditions: RouteConditionForm[]): RouteConditionPayload[] | undefined {
    const payload = conditions
        .filter((condition) => condition.key.trim())
        .map((condition): RouteConditionPayload => isListOperator(condition.op)
            ? {
                key: condition.key.trim(),
                op: condition.op,
                values: Array.from(new Set(condition.values.map((item) => item.trim()).filter(Boolean))),
            }
            : { key: condition.key.trim(), op: condition.op, value: Number(condition.value) });
    return payload.length ? payload : undefined;
}

export function validateRouteConditions(conditions: RouteConditionForm[], label: string): string[] {
    const errors: string[] = [];
    conditions.forEach((condition, index) => {
        const name = `شرط ${index + 1} در ${label}`;
        if (!condition.key.trim()) {
            errors.push(`${name}: تنظیم را انتخاب کنید.`);
            return;
        }
        if (isListOperator(condition.op)) {
            if (!condition.values.some((item) => item.trim())) errors.push(`${name}: دست‌کم یک مقدار لازم است.`);
        } else if (condition.value.trim() === '' || !Number.isFinite(Number(condition.value))) {
            errors.push(`${name}: عدد معتبر وارد کنید.`);
        }
    });
    return errors;
}

export function settingLabel(settings: NodeSettingFieldForm[], key: string): string {
    const field = settings.find((item) => item.key === key);
    return field?.labelFa || field?.label || key;
}

/** One-line summary for the closed route row: «رزولوشن = 4k · مدت > 8». */
export function summarizeRouteConditions(conditions: RouteConditionForm[], settings: NodeSettingFieldForm[]): string {
    return conditions
        .filter((condition) => condition.key.trim())
        .map((condition) => {
            const target = isListOperator(condition.op)
                ? condition.values.filter(Boolean).join('/') || '؟'
                : condition.value || '؟';
            return `${settingLabel(settings, condition.key)} ${OPERATOR_SYMBOL[condition.op]} ${target}`;
        })
        .join(' · ');
}

/** Same default the worker sends when the setting is empty: default, else min for numbers. */
export function settingDefault(field: NodeSettingFieldForm | undefined): string {
    if (!field) return '';
    if (field.defaultText.trim()) return field.defaultText.trim();
    if ((field.type === 'number' || field.type === 'slider') && field.min.trim() && Number.isFinite(Number(field.min))) {
        return field.min.trim();
    }
    return '';
}

function normalized(value: unknown): string {
    return String(value ?? '').trim().toLowerCase();
}

export function routeConditionsMatch(
    conditions: RouteConditionForm[],
    settingsValues: Record<string, string>,
    settings: NodeSettingFieldForm[],
): boolean {
    return conditions.filter((condition) => condition.key.trim()).every((condition) => {
        const raw = settingsValues[condition.key];
        const value = raw != null && raw !== '' ? raw : settingDefault(settings.find((field) => field.key === condition.key));
        if (isListOperator(condition.op)) {
            const listed = value !== '' && condition.values.some((item) => normalized(item) === normalized(value));
            return condition.op === 'in' ? listed : !listed;
        }
        const actual = value.trim() ? Number(value) : Number.NaN;
        const expected = Number(condition.value);
        if (!Number.isFinite(actual) || !Number.isFinite(expected)) return false;
        if (condition.op === 'gt') return actual > expected;
        if (condition.op === 'gte') return actual >= expected;
        if (condition.op === 'lt') return actual < expected;
        return actual <= expected;
    });
}

/** Options a condition can pick from: the setting's select options. */
export function settingOptions(settings: NodeSettingFieldForm[], key: string): Array<{ value: string; label: string }> {
    const field = settings.find((item) => item.key === key);
    return (field?.optionsRows || [])
        .filter((option) => String(option.value ?? '').trim())
        .map((option) => ({ value: String(option.value), label: option.label || String(option.value) }));
}
