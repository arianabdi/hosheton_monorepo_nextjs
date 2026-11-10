/**
 * Canonical Extended JSON (what the API returns) ⇄ mongosh text the admin reads and edits.
 * Every BSON type gets a distinct spelling so a document saved back keeps its exact types:
 *   int 5 → 5 · double 5 → Double(5) · double 5.5 → 5.5 · long → NumberLong("5") · decimal → NumberDecimal("…")
 *   ObjectId("…") · ISODate("…") · /re/i · Timestamp(t, i) · binary/uuid stay as {"$binary": …}
 */

export type Ejson = any;

const IDENT = /^[A-Za-z_$][\w$]*$/;

export function typeOf(v: Ejson): string {
    if (v === null || v === undefined) return 'null';
    if (Array.isArray(v)) return 'array';
    if (typeof v === 'string') return 'string';
    if (typeof v === 'boolean') return 'bool';
    if (typeof v === 'number') return 'double';
    if (typeof v === 'object') {
        if ('$oid' in v) return 'objectId';
        if ('$date' in v) return 'date';
        if ('$numberInt' in v) return 'int';
        if ('$numberLong' in v) return 'long';
        if ('$numberDouble' in v) return 'double';
        if ('$numberDecimal' in v) return 'decimal';
        if ('$binary' in v) return v.$binary?.subType === '04' ? 'uuid' : 'binData';
        if ('$regularExpression' in v) return 'regex';
        if ('$timestamp' in v) return 'timestamp';
        if ('$minKey' in v || '$maxKey' in v) return 'key';
        return 'object';
    }
    return typeof v;
}

export function dateIso(v: Ejson): string {
    const d = v.$date;
    if (typeof d === 'string') return d;
    if (d && typeof d === 'object' && '$numberLong' in d) return new Date(Number(d.$numberLong)).toISOString();
    return new Date(d).toISOString();
}

function scalar(v: Ejson): string | null {
    switch (typeOf(v)) {
        case 'null':
            return 'null';
        case 'string':
            return JSON.stringify(v);
        case 'bool':
            return String(v);
        case 'objectId':
            return `ObjectId("${v.$oid}")`;
        case 'date':
            return `ISODate("${dateIso(v)}")`;
        case 'int':
            return v.$numberInt;
        case 'long':
            return `NumberLong("${v.$numberLong}")`;
        case 'double': {
            const raw = typeof v === 'number' ? String(v) : v.$numberDouble;
            if (raw === 'NaN' || raw === 'Infinity' || raw === '-Infinity') return raw;
            const n = Number(raw);
            return Number.isInteger(n) ? `Double(${raw.replace(/\.0+$/, '')})` : raw;
        }
        case 'decimal':
            return `NumberDecimal("${v.$numberDecimal}")`;
        case 'regex':
            return `/${v.$regularExpression.pattern.replace(/\//g, '\\/')}/${v.$regularExpression.options}`;
        case 'timestamp':
            return `Timestamp(${v.$timestamp.t}, ${v.$timestamp.i})`;
        case 'uuid':
        case 'binData':
        case 'key':
            return JSON.stringify(v);
        default:
            return null;
    }
}

/** Pretty mongosh text (round-trips through the API parser with identical types). */
export function toShell(v: Ejson, indent = 0): string {
    const s = scalar(v);
    if (s !== null) return s;
    const pad = '  '.repeat(indent + 1);
    const end = '  '.repeat(indent);
    if (Array.isArray(v)) {
        if (!v.length) return '[]';
        return `[\n${v.map((x) => pad + toShell(x, indent + 1)).join(',\n')}\n${end}]`;
    }
    const entries = Object.entries(v);
    if (!entries.length) return '{}';
    return `{\n${entries.map(([k, x]) => `${pad}${IDENT.test(k) ? k : JSON.stringify(k)}: ${toShell(x, indent + 1)}`).join(',\n')}\n${end}}`;
}

/** One-line short form for table cells. */
export function cellText(v: Ejson): string {
    const t = typeOf(v);
    if (t === 'objectId') return v.$oid;
    if (t === 'date') return dateIso(v).replace('T', ' ').replace(/\.\d+Z$/, 'Z');
    if (t === 'string') return v.length > 80 ? `${v.slice(0, 80)}…` : v;
    if (t === 'array') return `[ ${v.length} ]`;
    if (t === 'object') return `{ ${Object.keys(v).length} فیلد }`;
    const s = scalar(v);
    return s ?? '';
}

/** First 8 hex chars of an ObjectId = seconds since epoch → ObjectId for "created since <date>" filters. */
export function objectIdFromDate(d: Date): string {
    return Math.floor(d.getTime() / 1000).toString(16).padStart(8, '0') + '0000000000000000';
}

export function idLiteral(id: Ejson): string {
    return toShell(id);
}
