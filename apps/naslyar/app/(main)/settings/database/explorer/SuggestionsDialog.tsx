'use client';

import { ModalHelper } from '@my-workspace/components';
import styles from './Explorer.module.scss';
import db from '../Database.module.scss';

export interface SuggestionItem {
    key: string;
    label: string;
    hint: string;
    /** the query text that will be put into the editor */
    code: string;
    /** has a blank (ObjectId(""), /متن/) the admin must fill before running */
    needsInput?: boolean;
    onPick: () => void;
}

export interface SuggestionGroup {
    title: string;
    lead?: string;
    items: SuggestionItem[];
}

/** isolate Latin field names (_id, createdAt) so they keep their order inside Persian text */
export function Bidi({ text }: { text: string }) {
    return (
        <>
            {text.split(/([A-Za-z_$][\w$.]*)/).map((part, i) => (i % 2 ? <bdi key={i}>{part}</bdi> : part))}
        </>
    );
}

function Content({ title, lead, groups, onClose }: { title: string; lead: string; groups: SuggestionGroup[]; onClose: () => void }) {
    return (
        <div className={db.dialog}>
            <div className={db.dialogHead}>
                <h2>{title}</h2>
                <p>
                    <Bidi text={lead} />
                </p>
            </div>
            <div className={db.dialogBody}>
                {groups
                    .filter((g) => g.items.length)
                    .map((g) => (
                        <section key={g.title} className={styles.sgGroup}>
                            <h3 className={styles.sgTitle}>{g.title}</h3>
                            {g.lead && <p className={styles.sgLead}>{g.lead}</p>}
                            <ul className={styles.sgList}>
                                {g.items.map((item) => (
                                    <li key={item.key}>
                                        <button
                                            type="button"
                                            className={styles.sgItem}
                                            onClick={() => {
                                                item.onPick();
                                                onClose();
                                            }}
                                        >
                                            <span className={styles.sgText}>
                                                <span className={styles.sgLabel}>
                                                    <span>
                                                        <Bidi text={item.label} />
                                                    </span>
                                                    {item.needsInput && <span className={styles.sgBadge}>نیاز به مقدار</span>}
                                                </span>
                                                <span className={styles.sgHint}>
                                                    <Bidi text={item.hint} />
                                                </span>
                                                <code className={styles.sgCode} dir="ltr">
                                                    {item.code.replace(/\s+/g, ' ')}
                                                </code>
                                            </span>
                                            <span className={styles.sgAction}>{item.needsInput ? 'درج در کادر' : 'اجرا'}</span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    ))}
            </div>
        </div>
    );
}

/** Ready-made queries in one tidy dialog — each one says what it finds and shows the exact query it inserts. */
export default function SuggestionsDialog({
    open,
    onClose,
    title,
    lead,
    groups,
}: {
    open: boolean;
    onClose: () => void;
    title: string;
    lead: string;
    groups: SuggestionGroup[];
}) {
    return (
        <ModalHelper
            open={open}
            onClose={onClose}
            size="lg"
            sheetTitle={title}
            component={open ? <Content title={title} lead={lead} groups={groups} onClose={onClose} /> : null}
        />
    );
}
