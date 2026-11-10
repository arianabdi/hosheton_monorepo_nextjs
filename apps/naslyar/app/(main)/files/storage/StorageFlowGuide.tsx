'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { LuDatabase, LuRoute, LuServer, LuSparkles, LuUser } from 'react-icons/lu';
import parentStyles from '../../marketing/Marketing.module.scss';
import hrStyles from '../../management/hr/Hr.module.scss';
import styles from './StorageFlowGuide.module.scss';

type NodeId = 'user' | 'server' | 'storage' | 'gateway' | 'provider';

/** Stage positions in % (RTL reading order: user on the right → model on the left). */
const NODES: Record<NodeId, { x: number; y: number; title: string; sub: string; Icon: typeof LuUser }> = {
    user: { x: 90, y: 28, title: 'کاربر', sub: 'مرورگر', Icon: LuUser },
    server: { x: 64, y: 28, title: 'سرور ایران', sub: 'API استودیو', Icon: LuServer },
    storage: { x: 64, y: 80, title: 'استوریج ایران', sub: 'پارس‌پک', Icon: LuDatabase },
    gateway: { x: 33, y: 28, title: 'گیت‌وی فرانسه', sub: 'ai-gateway', Icon: LuRoute },
    provider: { x: 9, y: 28, title: 'مدل هوش مصنوعی', sub: 'Atlas · fal', Icon: LuSparkles },
};

const EDGES: Array<[NodeId, NodeId]> = [
    ['user', 'server'],
    ['server', 'storage'],
    ['server', 'gateway'],
    ['gateway', 'provider'],
    ['storage', 'user'],
];

interface Hop {
    from: NodeId;
    to: NodeId;
    label: string;
}

interface FlowStep {
    title: string;
    admin: string;
    dev: string[];
    /** each group plays together; groups play one after another */
    groups: Hop[][];
}

const STEPS: FlowStep[] = [
    {
        title: 'ارسال تصویر مرجع',
        admin: 'اگر کاربر عکسی ضمیمه کند، سرور یک کپی موقت روی گیت‌وی فرانسه می‌گذارد و مدل همان را از فرانسه برمی‌دارد — '
            + 'نه از استوریج داخل ایران که ممکن است از خارج در دسترس نباشد.',
        dev: ['POST /stash', 'GET /stash/:id', 'stashMediaOnAiGateway'],
        groups: [
            [{ from: 'user', to: 'server', label: 'آپلود عکس مرجع' }],
            [{ from: 'server', to: 'gateway', label: 'کپی موقت روی گیت‌وی (POST /stash)' }],
            [{ from: 'gateway', to: 'provider', label: 'مدل عکس را از فرانسه برمی‌دارد' }],
        ],
    },
    {
        title: 'ساخت تصویر در مدل',
        admin: 'درخواست ساخت از طریق گیت‌وی به Atlas یا fal می‌رود و سرور هر چند ثانیه وضعیت را می‌پرسد. '
            + 'زمان این مرحله، زمان پردازش خود مدل است.',
        dev: ['/relay', 'x-gw-target', 'poll هر ۲–۳ ثانیه'],
        groups: [
            [{ from: 'server', to: 'gateway', label: 'درخواست ساخت (/relay)' }],
            [{ from: 'gateway', to: 'provider', label: 'ارسال به مدل' }],
            [{ from: 'provider', to: 'gateway', label: 'وضعیت: در حال ساخت…' }],
            [{ from: 'gateway', to: 'server', label: 'وضعیت به سرور ایران' }],
        ],
    },
    {
        title: 'دریافت خروجی فقط از گیت‌وی',
        admin: 'تصویر آماده فقط از مسیر گیت‌وی به ایران می‌آید؛ سرور ایران هیچ‌وقت مستقیم به CDN خارجی وصل نمی‌شود '
            + '(مسدود یا تحریم). اگر دانلود خطا بدهد تا ۳ بار دوباره تلاش می‌شود.',
        dev: ['GET /fetch', 'fetchMediaThroughAiGateway', '۳ تلاش'],
        groups: [
            [{ from: 'provider', to: 'gateway', label: 'خروجی تصویر (GET /fetch)' }],
            [{ from: 'gateway', to: 'server', label: 'تصویر به سرور ایران' }],
        ],
    },
    {
        title: 'ذخیره در استوریج ایران',
        admin: 'اصل تصویر و یک پیش‌نمایش سبک WebP هم‌زمان در استوریج ایران ذخیره می‌شوند. هر درخواست حداکثر ۶۰ ثانیه '
            + 'صبر می‌کند و تا ۳ بار تلاش می‌شود؛ اگر نشد کار با خطا تمام می‌شود و لینک خارجی جایگزین نمی‌شود.',
        dev: ['PutObject ×2 هم‌زمان', 'timeout ۶۰s · ۳ تلاش', 'persistGeneratedImages'],
        groups: [
            [
                { from: 'server', to: 'storage', label: 'اصل تصویر + پیش‌نمایش WebP (هم‌زمان)' },
                { from: 'server', to: 'storage', label: '' },
            ],
        ],
    },
    {
        title: 'تحویل به کاربر',
        admin: 'سرور از طریق سوکت خبر می‌دهد و مرورگر پیش‌نمایش سبک را از استوریج ایران بارگذاری می‌کند؛ اصل تصویر فقط با کلیک. '
            + 'هیچ لینکی از Atlas یا fal به کاربر نمی‌رسد، پس با قطعی اینترنت بین‌الملل هم تصویرها دیده می‌شوند.',
        dev: ['socket chat:message', 'thumbnailUrlLarge (WebP)'],
        groups: [
            [{ from: 'server', to: 'user', label: 'خبر آماده شدن (سوکت)' }],
            [{ from: 'storage', to: 'user', label: 'بارگذاری پیش‌نمایش از استوریج ایران' }],
        ],
    },
];

const HOP_MS = 1100;
const GROUP_GAP_MS = 250;
const STEP_PAUSE_MS = 1100;

function edgeKey(a: NodeId, b: NodeId): string {
    return [a, b].sort().join('|');
}

function usePrefersReducedMotion(): boolean {
    const [reduced, setReduced] = useState(false);
    useEffect(() => {
        const query = window.matchMedia('(prefers-reduced-motion: reduce)');
        setReduced(query.matches);
        const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
        query.addEventListener('change', onChange);
        return () => query.removeEventListener('change', onChange);
    }, []);
    return reduced;
}

export default function StorageFlowGuide() {
    const reducedMotion = usePrefersReducedMotion();
    const [active, setActive] = useState(0);
    const [autoplay, setAutoplay] = useState(true);
    /** index of the playing hop group; groups.length = pause before the next step */
    const [phase, setPhase] = useState(0);
    /** bumps on every group so the hop dots remount and replay */
    const [run, setRun] = useState(0);

    const step = STEPS[active];

    useEffect(() => {
        if (reducedMotion) return;
        const resting = phase >= step.groups.length;
        const timer = window.setTimeout(() => {
            if (!resting) {
                setPhase(phase + 1);
            } else {
                if (autoplay) setActive((active + 1) % STEPS.length);
                setPhase(0);
            }
            setRun((value) => value + 1);
        }, resting ? STEP_PAUSE_MS : HOP_MS + GROUP_GAP_MS);
        return () => window.clearTimeout(timer);
    }, [phase, active, autoplay, reducedMotion, step.groups.length]);

    const select = (index: number) => {
        setActive(index);
        setAutoplay(false);
        setPhase(0);
        setRun((value) => value + 1);
    };

    const currentGroup = reducedMotion ? step.groups.flat() : (step.groups[phase] || []);
    const litEdges = new Set(
        (reducedMotion ? step.groups.flat() : step.groups.slice(0, phase + 1).flat())
            .map((hop) => edgeKey(hop.from, hop.to)),
    );
    const litNodes = new Set(currentGroup.flatMap((hop) => [hop.from, hop.to]));
    const caption = currentGroup.find((hop) => hop.label)?.label || '';

    return (
        <section className={parentStyles.guideContainer}>
            <div className={parentStyles.guideHeader}>
                <div className={parentStyles.guideTitleGroup}>
                    <span className={parentStyles.guideIcon}>🖼️</span>
                    <h2 className={parentStyles.guideTitle}>آموزش مسیر ساخت و تحویل تصویر</h2>
                </div>
                <span className={parentStyles.guideBadge}>راهنمای ادمین و توسعه‌دهنده</span>
            </div>

            <p className={hrStyles.employeesGuideIntro}>
                هر تصویری که در استودیو ساخته می‌شود این <strong>۵ مرحله</strong> را طی می‌کند. هدف این است که کاربر
                تصویر را <strong>فقط از استوریج داخل ایران</strong> ببیند و ارتباط با سرویس‌های خارجی فقط از
                <strong> گیت‌وی فرانسه</strong> رد شود؛ پس قطعی اینترنت بین‌الملل یا تحریم، نمایش تصویرها را قطع
                نمی‌کند. این صفحه محل تنظیم <strong>استوریج</strong> است؛ تنظیمات گیت‌وی در بخش «دروازهٔ AI» است.
            </p>

            <div className={styles.stage} aria-hidden="true">
                <span className={styles.border} />
                <span className={`${styles.zone} ${styles.zoneIran}`}>داخل ایران</span>
                <span className={`${styles.zone} ${styles.zoneAbroad}`}>خارج از ایران</span>

                <svg className={styles.wires} viewBox="0 0 100 100" preserveAspectRatio="none">
                    {EDGES.map(([a, b]) => (
                        <line
                            key={edgeKey(a, b)}
                            x1={NODES[a].x}
                            y1={NODES[a].y}
                            x2={NODES[b].x}
                            y2={NODES[b].y}
                            vectorEffect="non-scaling-stroke"
                            className={litEdges.has(edgeKey(a, b)) ? styles.wireLit : styles.wire}
                        />
                    ))}
                </svg>

                {(Object.keys(NODES) as NodeId[]).map((id) => {
                    const node = NODES[id];
                    return (
                        <div
                            key={id}
                            className={`${styles.node} ${litNodes.has(id) ? styles.nodeLit : ''}`}
                            style={{ left: `${node.x}%`, top: `${node.y}%` }}
                        >
                            <span className={styles.nodeIcon}><node.Icon size={18} /></span>
                            <span className={styles.nodeTitle}>{node.title}</span>
                            <span className={styles.nodeSub} dir="ltr">{node.sub}</span>
                        </div>
                    );
                })}

                {!reducedMotion && currentGroup.map((hop, index) => (
                    <span
                        key={`${run}-${index}`}
                        className={styles.packet}
                        style={{
                            '--x1': `${NODES[hop.from].x}%`,
                            '--y1': `${NODES[hop.from].y}%`,
                            '--x2': `${NODES[hop.to].x}%`,
                            '--y2': `${NODES[hop.to].y}%`,
                            '--hop-ms': `${HOP_MS}ms`,
                            '--hop-delay': `${index * 180}ms`,
                        } as CSSProperties}
                    />
                ))}
            </div>

            <p className={styles.caption} aria-live="polite">
                <span className={styles.captionStep}>مرحلهٔ {active + 1}</span>
                {caption || step.title}
            </p>

            <ol className={styles.steps}>
                {STEPS.map((item, index) => (
                    <li key={item.title}>
                        <button
                            type="button"
                            className={`${styles.stepBtn} ${index === active ? styles.stepBtnActive : ''}`}
                            aria-pressed={index === active}
                            onClick={() => select(index)}
                        >
                            <span className={styles.stepNum}>{index + 1}</span>
                            {item.title}
                        </button>
                        {index === active && (
                            <div className={styles.stepDetail}>
                                <p>{item.admin}</p>
                                <div className={styles.devRow}>
                                    <span className={styles.devLabel}>برای توسعه‌دهنده:</span>
                                    {item.dev.map((chip) => (
                                        <code key={chip} className={styles.devChip} dir="auto">{chip}</code>
                                    ))}
                                </div>
                            </div>
                        )}
                    </li>
                ))}
            </ol>

            {!autoplay && !reducedMotion && (
                <button type="button" className={styles.autoplayBtn} onClick={() => setAutoplay(true)}>
                    پخش خودکار همهٔ مراحل
                </button>
            )}

            <div className={`${parentStyles.guideGrid} ${styles.cards}`}>
                <div className={parentStyles.guideCard}>
                    <h3>پیش‌نیازها</h3>
                    <ol>
                        <li>گیت‌وی فرانسه نسخهٔ جدید (با مسیرهای /fetch و /stash) را اجرا کند.</li>
                        <li>در پنل استوریج، باکت را <strong>عمومی (Public)</strong> کنید.</li>
                        <li>یک کلید با دسترسی خواندن/نوشتن بسازید و پایین همین صفحه وارد کنید.</li>
                    </ol>
                </div>
                <div className={parentStyles.guideCard}>
                    <h3>اشتباهات رایج</h3>
                    <ul>
                        <li>در پارس‌پک نام باکت همان بخش اول آدرس است (c780242)، نه یک اسم دلخواه.</li>
                        <li>تست «خواندن از آدرس عمومی» با 403 یعنی باکت هنوز خصوصی است.</li>
                        <li>خطای ذخیره هنگام ساخت تصویر معمولاً یعنی گیت‌وی هنوز به‌روز نشده است.</li>
                    </ul>
                </div>
            </div>

            <div className={hrStyles.employeesGuideExample}>
                <h3>مثال عملی</h3>
                <p>
                    کاربر در چت استودیو یک عکس محصول ضمیمه می‌کند و «پوستر تبلیغاتی» می‌خواهد ← عکس از گیت‌وی به Atlas
                    می‌رسد ← Atlas حدود ۲۰ ثانیه پوستر را می‌سازد ← پوستر از گیت‌وی به سرور ایران و از آنجا به پارس‌پک
                    می‌رود ← کاربر پیش‌نمایش را از پارس‌پک می‌بیند، حتی اگر همان لحظه اینترنت بین‌الملل قطع شود.
                </p>
            </div>

            <div className={hrStyles.employeesGuideNote}>
                <strong>نکته:</strong> اگر ذخیره در استوریج بعد از ۳ تلاش ناموفق باشد، پیام خطا به کاربر نشان داده می‌شود و
                لینک اصلی مدل در «لاگ اجرا» ثبت می‌شود تا ادمین بتواند خروجی را بازیابی کند. ساخت تصویر در خود مدل
                (مرحلهٔ ۲) کندترین بخش است و به استوریج ربطی ندارد.
            </div>
        </section>
    );
}
