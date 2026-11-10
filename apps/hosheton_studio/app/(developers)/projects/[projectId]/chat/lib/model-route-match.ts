/**
 * Mode / route rules of a provider model, mirrored from the API resolver
 * (model-mode.resolver.ts): switched-off modes and routes are ignored, a route
 * needs its input counts and its settings conditions (e.g. resolution in [4k])
 * to match, and among matches the higher priority, then the route with more
 * conditions, then list order wins.
 */

type LooseRecord = Record<string, any>;

export interface RouteInputCounts {
    image: number;
    video: number;
    audio: number;
}

export function isRouteActive(route: LooseRecord | null | undefined): boolean {
    return Boolean(route) && route!.isActive !== false;
}

/** Switched-on modes that can run: no routes, or at least one route on. Routes are trimmed to the active ones. */
export function runnableModes(modes: unknown): LooseRecord[] {
    if (!Array.isArray(modes)) return [];
    return modes
        .filter((mode) => mode && mode.isActive !== false)
        .map((mode) => {
            const routes = Array.isArray(mode.routes) ? mode.routes : [];
            return { ...mode, routes: routes.filter(isRouteActive), hadRoutes: routes.length > 0 };
        })
        .filter((mode) => !mode.hadRoutes || mode.routes.length > 0);
}

function countMatches(value: number, constraint?: { min?: number | null; max?: number | null }): boolean {
    if (!constraint) return true;
    if (constraint.min != null && value < constraint.min) return false;
    if (constraint.max != null && value > constraint.max) return false;
    return true;
}

export function routeMatchesCounts(route: LooseRecord, counts: RouteInputCounts): boolean {
    return countMatches(counts.image, route.imageCount)
        && countMatches(counts.video, route.videoCount)
        && countMatches(counts.audio, route.audioCount)
        && countMatches(counts.image + counts.video + counts.audio, route.totalCount);
}

function schemaDefault(field: LooseRecord): unknown {
    const value = field.default;
    if (value !== undefined && value !== null && value !== '') return value;
    if (field.type === 'number' || field.type === 'slider') {
        const min = field.min != null ? Number(field.min) : Number.NaN;
        if (Number.isFinite(min)) return min;
    }
    return undefined;
}

function normalized(value: unknown): string {
    return String(value ?? '').trim().toLowerCase();
}

/** Settings schema the request runs with: the mode override, else the model schema. */
export function modeSettingsSchema(model: LooseRecord | null | undefined, mode: LooseRecord | null | undefined): LooseRecord[] {
    if (Array.isArray(mode?.settingsSchemaOverride)) return mode!.settingsSchemaOverride;
    return Array.isArray(model?.settingsSchema) ? model!.settingsSchema : [];
}

export function routeConditionsMatch(
    route: LooseRecord,
    settings: Record<string, unknown>,
    schema: LooseRecord[],
): boolean {
    const conditions = Array.isArray(route.conditions) ? route.conditions : [];
    return conditions.every((condition: LooseRecord) => {
        const key = String(condition?.key || '');
        let value = settings[key];
        if (value === undefined || value === null || value === '') {
            const field = schema.find((entry) => String(entry?.key || '').trim() === key);
            value = field ? schemaDefault(field) : undefined;
        }
        if (condition.op === 'in' || condition.op === 'not_in') {
            const present = value !== undefined && value !== null && value !== '';
            const listed = present && (Array.isArray(condition.values) ? condition.values : [])
                .some((entry: unknown) => normalized(entry) === normalized(value));
            return condition.op === 'in' ? listed : !listed;
        }
        const actual = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : Number.NaN;
        const expected = Number(condition.value);
        if (!Number.isFinite(actual) || !Number.isFinite(expected)) return false;
        if (condition.op === 'gt') return actual > expected;
        if (condition.op === 'gte') return actual >= expected;
        if (condition.op === 'lt') return actual < expected;
        if (condition.op === 'lte') return actual <= expected;
        return false;
    });
}

/** The route the API would pick for these inputs and settings (active routes only). */
export function pickRoute(
    mode: LooseRecord | null | undefined,
    counts: RouteInputCounts,
    settings: Record<string, unknown>,
    schema: LooseRecord[],
): LooseRecord | null {
    const routes: LooseRecord[] = (Array.isArray(mode?.routes) ? mode!.routes : []).filter(isRouteActive);
    if (!routes.length) return null;
    const conditionCount = (route: LooseRecord) => (Array.isArray(route.conditions) ? route.conditions.length : 0);
    const priority = (route: LooseRecord) => (Number.isFinite(Number(route.priority)) ? Number(route.priority) : 0);
    const matching = routes
        .map((route, index) => ({ route, index }))
        .filter(({ route }) => routeMatchesCounts(route, counts) && routeConditionsMatch(route, settings, schema))
        .sort((a, b) => priority(b.route) - priority(a.route)
            || conditionCount(b.route) - conditionCount(a.route)
            || a.index - b.index);
    if (matching[0]) return matching[0].route;
    return routes
        .map((route, index) => ({ route, index, ok: routeConditionsMatch(route, settings, schema) ? 1 : 0 }))
        .filter(({ route }) => route.default === true || route.isDefault === true)
        .sort((a, b) => b.ok - a.ok || priority(b.route) - priority(a.route) || a.index - b.index)[0]?.route
        || null;
}
