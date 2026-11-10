'use client';

import { useState, type ReactNode } from 'react';
import { dateIso, typeOf } from './ejson';
import styles from './Explorer.module.scss';

/** fields shown before «نمایش N فیلد دیگر» (Compass keeps long documents short the same way) */
const FIRST_FIELDS = 15;
const MAX_STRING = 140;

/** One scalar value in Compass spelling: ObjectId('…'), "text", 0, true, 2024-06-19T18:14:41.688+00:00 */
export function TypedValue({ v, full = false }: { v: any; full?: boolean }) {
    const t = typeOf(v);
    let text: string;
    switch (t) {
        case 'objectId':
            text = `ObjectId('${v.$oid}')`;
            break;
        case 'date':
            text = dateIso(v).replace('Z', '+00:00');
            break;
        case 'string': {
            const s = !full && v.length > MAX_STRING ? `${v.slice(0, MAX_STRING)}…` : v;
            text = `"${s}"`;
            break;
        }
        case 'int':
            text = v.$numberInt;
            break;
        case 'long':
            text = v.$numberLong;
            break;
        case 'double':
            text = typeof v === 'number' ? String(v) : v.$numberDouble;
            break;
        case 'decimal':
            text = v.$numberDecimal;
            break;
        case 'bool':
            text = String(v);
            break;
        case 'null':
            text = 'null';
            break;
        case 'regex':
            text = `/${v.$regularExpression.pattern}/${v.$regularExpression.options}`;
            break;
        case 'timestamp':
            text = `Timestamp(${v.$timestamp.t}, ${v.$timestamp.i})`;
            break;
        case 'array':
            text = `Array (${v.length})`;
            break;
        case 'object':
            text = `Object`;
            break;
        default:
            text = JSON.stringify(v);
    }
    return (
        <span className={`${styles.v} ${styles[`v_${t}`] || ''}`} title={t === 'string' && v.length > MAX_STRING ? v.slice(0, 2000) : undefined}>
            {text}
        </span>
    );
}

const isNested = (v: any) => {
    const t = typeOf(v);
    return t === 'object' || t === 'array';
};

function Entry({ name, value, depth }: { name: ReactNode; value: any; depth: number }) {
    const [open, setOpen] = useState(false);
    const nested = isNested(value);
    const entries: Array<[string, any]> = nested ? (Array.isArray(value) ? value.map((x, i) => [String(i), x]) : Object.entries(value)) : [];
    const empty = nested && !entries.length;

    return (
        <li className={styles.treeItem}>
            <div className={styles.treeLine} style={{ paddingInlineStart: `${depth * 18}px` }}>
                {nested && !empty ? (
                    <button type="button" className={styles.caret} onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={open ? 'بستن' : 'باز کردن'}>
                        <span className={open ? styles.caretOpen : ''}>▸</span>
                    </button>
                ) : (
                    <span className={styles.caretSpace} />
                )}
                <span className={styles.key}>{name}</span>
                <span className={styles.colon}>:</span>
                {nested ? (
                    <button type="button" className={styles.nestedLabel} onClick={() => !empty && setOpen((o) => !o)} disabled={empty}>
                        {Array.isArray(value) ? `Array (${value.length})` : empty ? 'Object (empty)' : 'Object'}
                    </button>
                ) : (
                    <TypedValue v={value} />
                )}
            </div>
            {open && (
                <ul className={styles.treeList}>
                    {entries.map(([k, x]) => (
                        <Entry key={k} name={k} value={x} depth={depth + 1} />
                    ))}
                </ul>
            )}
        </li>
    );
}

/** A document the Compass way: first level visible, nested objects/arrays open on click. */
export default function DocTree({ doc, actions }: { doc: any; actions?: ReactNode }) {
    const [all, setAll] = useState(false);
    const entries = Object.entries(doc || {});
    const shown = all ? entries : entries.slice(0, FIRST_FIELDS);
    return (
        <div className={styles.docCard}>
            {actions && <div className={styles.docCardActions}>{actions}</div>}
            <ul className={styles.treeList} dir="ltr">
                {shown.map(([k, v]) => (
                    <Entry key={k} name={k} value={v} depth={0} />
                ))}
            </ul>
            {entries.length > FIRST_FIELDS && (
                <button type="button" className={styles.moreFields} onClick={() => setAll((a) => !a)}>
                    {all ? 'نمایش کمتر' : `نمایش ${(entries.length - FIRST_FIELDS).toLocaleString('fa-IR')} فیلد دیگر`}
                </button>
            )}
        </div>
    );
}
