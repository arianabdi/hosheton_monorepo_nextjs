'use client';

import { useEffect, useState } from 'react';
import { SCENARIO_NAMES } from '../projects/[projectId]/chat/chatInput/cat/config';
import { SCENARIOS, SCHEDULE_RULES } from './catalog';
import { useInspector } from './inspector';
import { CodeRef, SectionHead, Switch } from './ui';
import styles from './Animations.module.scss';

/* زمان‌بندی (برنامه‌ریزی) گربه: قانون‌های واقعی + شبیه‌سازی همان زمان‌بند روی صحنهٔ این صفحه */

type AdminState = 'loading' | 'on' | 'off' | 'unknown';

export function SchedulePanel() {
    const { tx, fa, stage, setStage } = useInspector();
    const [admin, setAdmin] = useState<AdminState>('loading');

    // همان درخواستی که ChatCat می‌فرستد؛ خطا در چت = روشن، اینجا «نامعلوم» نشان داده می‌شود
    useEffect(() => {
        const base = process.env.NEXT_PUBLIC_API_URL;
        let cancelled = false;
        const done = (value: AdminState) => {
            if (!cancelled) setAdmin(value);
        };
        if (!base) {
            queueMicrotask(() => done('unknown'));
        } else {
            fetch(`${base}/api/system-setting/public/studio.chat?t=${Date.now()}`, { cache: 'no-store' })
                .then((res) => (res.ok ? res.json() : null))
                .then((body) => done(body ? (body?.data?.value?.catEnabled === false ? 'off' : 'on') : 'unknown'))
                .catch(() => done('unknown'));
        }
        return () => {
            cancelled = true;
        };
    }, []);

    const togglePool = (name: (typeof SCENARIO_NAMES)[number], value: boolean) => {
        const pool = value ? [...stage.pool, name] : stage.pool.filter((item) => item !== name);
        setStage({ pool: SCENARIO_NAMES.filter((item) => pool.includes(item)) });
    };

    const adminText: Record<AdminState, string> = fa
        ? { loading: 'در حال خواندن…', on: 'روشن', off: 'خاموش — زمان‌بند در چت اجرا نمی‌شود', unknown: 'نامعلوم (در چت روشن حساب می‌شود)' }
        : { loading: 'Loading…', on: 'On', off: 'Off — the scheduler does not run in chat', unknown: 'Unknown (counts as on in chat)' };

    return (
        <div className={styles.groups}>
            <section className={styles.group}>
                <SectionHead
                    title={fa ? 'شبیه‌سازی روی صحنهٔ این صفحه' : 'Simulate on this page\'s stage'}
                    note={fa
                        ? 'همان زمان‌بند ChatCat روی صحنهٔ بالای صفحه؛ این تنظیمات فقط همین‌جا اثر دارند و در چت واقعی چیزی عوض نمی‌شود.'
                        : 'The real ChatCat scheduler, running on the stage above; these settings only apply here and change nothing in the real chat.'}
                />
                <ul className={styles.rows}>
                    <li className={styles.row}>
                        <Switch checked={stage.auto} onChange={(value) => setStage({ auto: value })} label={fa ? 'زمان‌بند خودکار' : 'Auto scheduler'} />
                        <div className={styles.rowMain}>
                            <p>{fa ? 'گربه خودش می‌آید و می‌رود، درست مثل صفحهٔ چت.' : 'The cat comes and goes on its own, exactly like the chat page.'}</p>
                        </div>
                    </li>
                    <li className={styles.row}>
                        <Switch checked={stage.fast} onChange={(value) => setStage({ fast: value })} label={fa ? 'زمان‌بندی کوتاه' : 'Short timings'} />
                        <div className={styles.rowMain}>
                            <p>{fa ? 'اولین ظهور ۲ تا ۴ و فاصله‌ها ۴ تا ۸ ثانیه، به‌جای ۸ تا ۱۶ و ۲۰ تا ۶۰ ثانیهٔ واقعی.' : 'First appearance 2–4 s and intervals 4–8 s instead of the real 8–16 s and 20–60 s.'}</p>
                        </div>
                    </li>
                    <li className={styles.row}>
                        <span className={styles.rowKeyText}>{fa ? 'سناریوهای مجاز' : 'Allowed scenarios'}</span>
                        <div className={styles.rowMain}>
                            <div className={styles.flagRow}>
                                {SCENARIOS.map((scenario) => (
                                    <Switch
                                        key={scenario.name}
                                        checked={stage.pool.includes(scenario.name)}
                                        onChange={(value) => togglePool(scenario.name, value)}
                                        label={tx(scenario.title)}
                                    />
                                ))}
                            </div>
                        </div>
                    </li>
                    <li className={styles.row}>
                        <Switch checked={stage.calm} onChange={(value) => setStage({ calm: value })} label={fa ? 'کم‌تحرک' : 'Reduced motion'} />
                        <div className={styles.rowMain}>
                            <p>{fa ? 'شبیه‌سازی prefers-reduced-motion برای اجراهای بعدی (فقط تماشا و خواب در زمان‌بند، ورود و خروج با محو شدن).' : 'Simulates prefers-reduced-motion for the next runs (only watch and sleep are scheduled, fade in/out).'}</p>
                        </div>
                    </li>
                    <li className={styles.row}>
                        <Switch checked={stage.locked} onChange={(value) => setStage({ locked: value })} label={fa ? 'ورودی قفل' : 'Locked input'} />
                        <div className={styles.rowMain}>
                            <p>{fa ? 'مثل وقتی که پیامی در حال ارسال یا ویرایش است: گربهٔ روی صحنه فوری محو می‌شود و زمان‌بند منتظر می‌ماند.' : 'Like while a message is being sent or edited: the cat on stage vanishes and the scheduler waits.'}</p>
                        </div>
                    </li>
                    <li className={styles.row}>
                        <Switch checked={stage.sound} onChange={(value) => setStage({ sound: value })} label={fa ? 'صدا' : 'Sound'} />
                        <div className={styles.rowMain}>
                            <label className={styles.rangeLabel}>
                                <span>{fa ? `بلندی ${Math.round(stage.volume * 100)}٪` : `Volume ${Math.round(stage.volume * 100)}%`}</span>
                                <input type="range" min={0} max={1} step={0.05} value={stage.volume} onChange={(event) => setStage({ volume: Number(event.target.value) })} />
                            </label>
                        </div>
                    </li>
                    <li className={styles.row}>
                        <span className={styles.rowKeyText}>{fa ? 'اندازه' : 'Size'}</span>
                        <div className={styles.rowMain}>
                            <label className={styles.rangeLabel}>
                                <span dir="ltr">{`size ${stage.size.toFixed(2)}×`}</span>
                                <input type="range" min={0.6} max={1.6} step={0.05} value={stage.size} onChange={(event) => setStage({ size: Number(event.target.value) })} />
                            </label>
                            <p className={styles.muted}>{fa ? 'از اجرای بعدی اعمال می‌شود.' : 'Applies from the next run.'}</p>
                        </div>
                    </li>
                    <li className={styles.row}>
                        <span className={styles.rowKeyText}>{fa ? 'کلید ادمین' : 'Admin switch'}</span>
                        <div className={styles.rowMain}>
                            <p>
                                <span className={admin === 'off' ? styles.stateOff : undefined}>{adminText[admin]}</span>
                            </p>
                            <div className={styles.metaRow}>
                                <code className={styles.flagId} dir="ltr">studio.chat.catEnabled</code>
                            </div>
                            <div className={styles.flagRow}>
                                <Switch
                                    checked={stage.ignoreAdmin}
                                    onChange={(value) => setStage({ ignoreAdmin: value })}
                                    label={fa ? 'زمان‌بند این صفحه بدون توجه به کلید ادمین' : 'Run this page\'s scheduler regardless of the admin switch'}
                                />
                            </div>
                        </div>
                    </li>
                </ul>
            </section>

            <section className={styles.group}>
                <SectionHead
                    title={fa ? 'قانون‌های زمان‌بندی' : 'Scheduling rules'}
                    note={fa ? 'رفتار واقعی در صفحه‌های چت.' : 'How it behaves on the real chat pages.'}
                />
                <ul className={styles.rows}>
                    {SCHEDULE_RULES.map((rule) => (
                        <li key={rule.title.en} className={styles.row}>
                            <span className={styles.rowKeyText}>{tx(rule.title)}</span>
                            <div className={styles.rowMain}>
                                <p>{tx(rule.body)}</p>
                                <div className={styles.metaRow}>
                                    <CodeRef code={rule.code} title={tx(rule.title)} />
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            </section>
        </div>
    );
}
