'use client';

import { useMemo, useState } from 'react';
import { LuSearch } from 'react-icons/lu';
import { PARAMS, PARAM_NAMES, SPRINGS, type SpringGroup } from '../projects/[projectId]/chat/chatInput/cat/rig/params';
import { POSES, type PoseName } from '../projects/[projectId]/chat/chatInput/cat/rig/poses';
import { PARAM_INFO, SPRING_INFO } from './catalog';
import { useInspector } from './inspector';
import { CodeRef, SectionHead } from './ui';
import styles from './Animations.module.scss';

/* پارامترهای ژست و فنرهایشان؛ مقدارها مستقیم از params.ts و poses.ts خوانده می‌شوند */

const GROUPS = Object.keys(SPRINGS) as SpringGroup[];
const POSE_NAMES = Object.keys(POSES) as PoseName[];

/** پارامتر → ژست‌هایی که عوضش می‌کنند */
const USED_BY = Object.fromEntries(
    PARAM_NAMES.map((name) => [name, POSE_NAMES.filter((pose) => name in POSES[pose])]),
) as Record<(typeof PARAM_NAMES)[number], PoseName[]>;

export function ParamsPanel() {
    const { tx, fa } = useInspector();
    const [query, setQuery] = useState('');
    const q = query.trim().toLowerCase();

    const byGroup = useMemo(() => GROUPS.map((group) => ({
        group,
        names: PARAM_NAMES.filter((name) => PARAMS[name].g === group && (
            !q || name.toLowerCase().includes(q) || PARAM_INFO[name].fa.includes(q) || PARAM_INFO[name].en.toLowerCase().includes(q)
        )),
    })), [q]);
    const total = byGroup.reduce((sum, item) => sum + item.names.length, 0);

    return (
        <div className={styles.groups}>
            <section className={styles.group}>
                <SectionHead
                    title={fa ? 'فنرها' : 'Springs'}
                    note={fa
                        ? 'هر پارامتر در یکی از این گروه‌هاست و با فنر همان گروه به هدف می‌رود. k = سختی (بیشتر = سریع‌تر)؛ z = میرایی (کمتر از ۱ = کمی رد می‌شود و برمی‌گردد، ۱ = بدون نوسان). setPose(…, { speed }) سرعت را ضرب می‌کند.'
                        : 'Every parameter belongs to one group and springs to its target with that group\'s spring. k = stiffness (higher = faster); z = damping ratio (below 1 overshoots a little, 1 = no overshoot). setPose(…, { speed }) scales it.'}
                />
                <ul className={styles.rows}>
                    {GROUPS.map((group) => (
                        <li key={group} className={styles.row}>
                            <code className={styles.rowKey} dir="ltr">{group}</code>
                            <div className={styles.rowMain}>
                                <p>{tx(SPRING_INFO[group])}</p>
                                <div className={styles.metaRow}>
                                    <span className={styles.meta} dir="ltr">{`k ${SPRINGS[group].k} · z ${SPRINGS[group].z}`}</span>
                                    <span className={styles.meta}>
                                        {fa
                                            ? `${PARAM_NAMES.filter((name) => PARAMS[name].g === group).length} پارامتر`
                                            : `${PARAM_NAMES.filter((name) => PARAMS[name].g === group).length} params`}
                                    </span>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
                <CodeRef code="rig/params.ts › SPRINGS" title={fa ? 'فنرهای ریگ' : 'Rig springs'} />
            </section>

            <section className={styles.group}>
                <SectionHead
                    title={fa ? 'پارامترهای ژست' : 'Pose parameters'}
                    note={fa
                        ? 'مختصات محلی: a = جلو (سمت سر)، b = بالا (کف = ۰)، c = پهلو؛ زاویه‌ها درجه‌اند. همهٔ ژست‌ها برای گربهٔ رو به راست تعریف شده‌اند و ریگ رو به چپ را آینه می‌کند.'
                        : 'Local axes: a = forward (head side), b = up (ground = 0), c = sideways; angles in degrees. Every pose is authored facing right; the rig mirrors it for facing left.'}
                />
                <div className={styles.searchRow}>
                    <span className={styles.searchBox}>
                        <LuSearch size={14} />
                        <input
                            type="search"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder={fa ? 'جستجوی نام یا توضیح پارامتر' : 'Search name or description'}
                        />
                    </span>
                    <span className={styles.muted}>{fa ? `${total} پارامتر` : `${total} params`}</span>
                </div>
                {total === 0 ? (
                    <p className={styles.muted}>{fa ? 'پارامتری با این جستجو پیدا نشد.' : 'No parameter matches.'}</p>
                ) : byGroup.map(({ group, names }) => (names.length ? (
                    <div key={group} className={styles.paramBlock}>
                        <div className={styles.paramBlockHead}>
                            <code dir="ltr">{group}</code>
                        </div>
                        <ul className={styles.rows}>
                            {names.map((name) => {
                                const used = USED_BY[name];
                                return (
                                    <li key={name} className={styles.row}>
                                        <code className={styles.rowKey} dir="ltr">{name}</code>
                                        <div className={styles.rowMain}>
                                            <p>{tx(PARAM_INFO[name])}</p>
                                            <div className={styles.metaRow}>
                                                <span className={styles.meta} dir="ltr">{`default ${PARAMS[name].v}`}</span>
                                                <span className={styles.meta} title={used.join(', ')}>
                                                    {used.length
                                                        ? (fa ? `${used.length} ژست عوضش می‌کنند` : `changed by ${used.length} poses`)
                                                        : (fa ? 'فقط با set() یا ریگ' : 'only via set() or the rig')}
                                                </span>
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                ) : null))}
                <CodeRef code="rig/params.ts › PARAMS" title={fa ? 'پارامترهای ژست' : 'Pose parameters'} />
            </section>
        </div>
    );
}
