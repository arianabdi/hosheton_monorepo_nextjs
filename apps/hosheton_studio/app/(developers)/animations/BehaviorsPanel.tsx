'use client';

import { catDebug } from '../projects/[projectId]/chat/chatInput/cat/debug';
import { BEHAVIOR_GROUPS, FLAG_LABELS } from './catalog';
import { useInspector } from './inspector';
import { CodeRef, SectionHead, Switch } from './ui';
import styles from './Animations.module.scss';

/* لایه‌های رویه‌ای ریگ و جلوه‌های صحنه، هر کدام با کلید خاموش/روشن روی همهٔ گربه‌های این صفحه */

export function BehaviorsPanel() {
    const { tx, fa, debug, setFlag } = useInspector();
    return (
        <div className={styles.groups}>
            {BEHAVIOR_GROUPS.map((group) => {
                const allOn = group.items.every((item) => debug.flags[item.flag]);
                return (
                    <section key={group.title.en} className={styles.group}>
                        <div className={styles.groupHeadRow}>
                            <SectionHead title={tx(group.title)} note={tx(group.note)} />
                            <button
                                type="button"
                                className={styles.linkBtn}
                                onClick={() => catDebug.setFlags(Object.fromEntries(group.items.map((item) => [item.flag, !allOn])))}
                            >
                                {allOn ? (fa ? 'خاموش کردن همه' : 'Turn all off') : (fa ? 'روشن کردن همه' : 'Turn all on')}
                            </button>
                        </div>
                        <ul className={styles.rows}>
                            {group.items.map((item) => (
                                <li key={item.flag} className={`${styles.row} ${debug.flags[item.flag] ? '' : styles.rowOff}`}>
                                    <Switch
                                        checked={debug.flags[item.flag]}
                                        onChange={(value) => setFlag(item.flag, value)}
                                        label={tx(FLAG_LABELS[item.flag])}
                                        title={item.flag}
                                    />
                                    <div className={styles.rowMain}>
                                        <p>{tx(item.body)}</p>
                                        <div className={styles.metaRow}>
                                            {item.seeIt ? <span className={styles.meta}>{tx(item.seeIt)}</span> : null}
                                            <code className={styles.flagId} dir="ltr">{item.flag}</code>
                                            <CodeRef code={item.code} title={tx(FLAG_LABELS[item.flag])} ids={[item.flag]} />
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </section>
                );
            })}
        </div>
    );
}
