'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { LuCopy, LuEraser, LuPause, LuPin, LuPlay, LuSkipForward, LuSquare } from 'react-icons/lu';
import ChatCat from '../projects/[projectId]/chat/chatInput/cat/ChatCat';
import { DEFAULT_CHAT_CAT_CONFIG, type ChatCatConfig } from '../projects/[projectId]/chat/chatInput/cat/config';
import { CAT_FLAGS, catDebug } from '../projects/[projectId]/chat/chatInput/cat/debug';
import type { CatDirector } from '../projects/[projectId]/chat/chatInput/cat/stage/CatDirector';
import chatStyles from '../projects/[projectId]/chat/chatInput/ChatInput.module.scss';
import { CAT_DIR, SCENARIOS, STEP_TITLES, type Txt } from './catalog';
import { useInspector, type LogEntry } from './inspector';
import styles from './Animations.module.scss';

/* صحنهٔ زنده: همان ChatCat واقعی روی یک چت‌باکس نمونه + کنترل زمان + وضعیت لحظه‌ای و رد مراحل */

type Snapshot = ReturnType<CatDirector['inspect']>;

const SPEEDS = [0.25, 0.5, 1, 2, 4];
const FAST_FIRST: [number, number] = [2, 4];
const FAST_INTERVAL: [number, number] = [4, 8];

const scenarioTitle = (name: string | undefined): Txt | null => SCENARIOS.find((s) => s.name === name)?.title ?? null;

function stepTitle(id: string | undefined, tx: (t: Txt) => string) {
    if (!id) return '';
    const title = STEP_TITLES[id];
    return title ? tx(title) : id;
}

function formatEntry(entry: LogEntry, tx: (t: Txt) => string, fa: boolean) {
    const time = entry.at !== undefined ? `${entry.at.toFixed(1)}s` : '';
    if (entry.kind === 'start') return { time, text: `▶ ${tx(scenarioTitle(entry.scenario) ?? { fa: '', en: '' })}`, code: entry.scenario ?? '' };
    if (entry.kind === 'done') return { time, text: fa ? '■ پایان' : '■ done', code: entry.scenario ?? '' };
    if (entry.kind === 'schedule') return { time: '', text: fa ? '⏱ ظهور بعدی' : '⏱ next appearance', code: entry.detail ?? '' };
    return {
        time,
        text: `${entry.blip ? '· ' : ''}${stepTitle(entry.id, tx)}`,
        code: `${entry.id ?? ''}${entry.detail ? ` ${entry.detail}` : ''}`,
    };
}

export function StageSection() {
    const { tx, fa, stage, setStage, stageRef, play, run, debug, log, clearLog, nextAt, copy } = useInspector();
    const [snap, setSnap] = useState<Snapshot | null>(null);
    const [now, setNow] = useState(0);
    const logRef = useRef<HTMLOListElement>(null);

    // وضعیت زنده از کارگردان صحنه (بدون رندر هر فریم)
    useEffect(() => {
        const timer = window.setInterval(() => {
            setSnap(catDebug.director?.inspect() ?? null);
            setNow(performance.now());
        }, 150);
        return () => window.clearInterval(timer);
    }, []);

    // لاگ همیشه پایین بماند
    useEffect(() => {
        const list = logRef.current;
        if (list) list.scrollTop = list.scrollHeight;
    }, [log]);

    const config = useMemo<Partial<ChatCatConfig>>(() => ({
        enabled: stage.auto,
        firstDelay: stage.fast ? FAST_FIRST : DEFAULT_CHAT_CAT_CONFIG.firstDelay,
        interval: stage.fast ? FAST_INTERVAL : DEFAULT_CHAT_CAT_CONFIG.interval,
        scenarios: stage.pool,
        sound: stage.sound,
        volume: stage.volume,
        size: stage.size,
    }), [stage.auto, stage.fast, stage.pool, stage.sound, stage.volume, stage.size]);

    const off = CAT_FLAGS.filter((flag) => !debug.flags[flag]);
    const yes = fa ? 'بله' : 'yes';
    const no = fa ? 'نه' : 'no';

    const copyReport = () => {
        const lines: string[] = [];
        lines.push(fa ? 'گزارش گربهٔ چت — صفحهٔ انیمیشن‌ها' : 'Chat cat report — Animations page');
        if (run) {
            lines.push(`${fa ? 'سناریو' : 'Scenario'}: ${run.scenario} · ${fa ? 'مرحله' : 'step'}: ${run.step || '—'} (${stepTitle(run.step, tx)})${run.detail ? ` · ${run.detail}` : ''}${snap ? ` · t=${snap.time.toFixed(1)}s` : ''}`);
        } else {
            lines.push(fa ? 'سناریویی در حال اجرا نیست' : 'No scenario running');
        }
        if (snap) {
            const r = snap.rig;
            lines.push(`${fa ? 'ژست' : 'Pose'}: ${r.pose} · x=${Math.round(r.x)}/${Math.round(snap.width)} · ${r.facingRight ? 'facing right' : 'facing left'} · moving=${r.moving} · airborne=${r.airborne} · opacity=${r.opacity.toFixed(2)}`);
        }
        lines.push(`${fa ? 'سرعت صحنه' : 'Stage speed'}: ${debug.timeScale}×${debug.paused ? ' (paused)' : ''} · calm=${stage.calm} · size=${stage.size}`);
        lines.push(`${fa ? 'کلیدهای خاموش' : 'Flags off'}: ${off.length ? off.join(', ') : '—'}`);
        lines.push(fa ? 'رویدادهای اخیر:' : 'Recent events:');
        for (const entry of log.slice(-25)) {
            const row = formatEntry(entry, tx, fa);
            lines.push(`  ${row.time.padStart(6)}  ${row.code}  ${row.text}`);
        }
        lines.push(`${fa ? 'کد' : 'Code'}: ${CAT_DIR}`);
        copy(lines.join('\n'));
    };

    const runTitle = run ? scenarioTitle(run.scenario) : null;
    // در حالت مکث، رویدادها تا اولین فریم نگه داشته می‌شوند؛ وجود کارگردان یعنی گربه روی صحنه است
    const onStage = Boolean(run || snap);
    const countdown = !run && stage.auto && nextAt !== null ? Math.max(0, (nextAt - now) / 1000) : null;

    return (
        <section className={`${styles.stageSection} ${stage.pinned ? styles.stagePinned : ''}`}>
            <div className={styles.toolbar}>
                <div className={styles.toolGroup}>
                    {SCENARIOS.map((scenario) => (
                        <button
                            key={scenario.name}
                            type="button"
                            className={`${styles.btn} ${run?.scenario === scenario.name ? styles.btnActive : ''}`}
                            onClick={() => play(scenario.name)}
                            title={tx(scenario.body)}
                        >
                            <LuPlay size={13} />
                            {tx(scenario.title)}
                        </button>
                    ))}
                    <button type="button" className={styles.btn} onClick={() => stageRef.current?.stop()} disabled={!onStage}>
                        <LuSquare size={12} />
                        {fa ? 'توقف' : 'Stop'}
                    </button>
                </div>
                <div className={styles.toolGroup}>
                    <label className={styles.selectLabel}>
                        {fa ? 'سرعت' : 'Speed'}
                        <select
                            value={debug.timeScale}
                            onChange={(event) => catDebug.setTime({ timeScale: Number(event.target.value) })}
                        >
                            {SPEEDS.map((value) => (
                                <option key={value} value={value}>{`${value}×`}</option>
                            ))}
                        </select>
                    </label>
                    <button
                        type="button"
                        className={`${styles.btn} ${debug.paused ? styles.btnActive : ''}`}
                        onClick={() => catDebug.setTime({ paused: !debug.paused })}
                    >
                        {debug.paused ? <LuPlay size={13} /> : <LuPause size={13} />}
                        {debug.paused ? (fa ? 'ادامه' : 'Resume') : (fa ? 'مکث' : 'Pause')}
                    </button>
                    <button
                        type="button"
                        className={styles.btn}
                        disabled={!debug.paused || !onStage}
                        onClick={() => catDebug.director?.frame(1 / 30)}
                        title={fa ? 'یک فریم (۱/۳۰ ثانیه) جلو' : 'Advance one frame (1/30 s)'}
                    >
                        <LuSkipForward size={13} />
                        {fa ? 'یک فریم' : 'Step'}
                    </button>
                    <button
                        type="button"
                        className={`${styles.iconBtn} ${styles.pinBtn} ${stage.pinned ? styles.iconBtnOn : ''}`}
                        aria-pressed={stage.pinned}
                        onClick={() => setStage({ pinned: !stage.pinned })}
                        title={fa ? 'ثابت ماندن صحنه بالای صفحه هنگام اسکرول' : 'Keep the stage pinned while scrolling'}
                        aria-label={fa ? 'سنجاق صحنه' : 'Pin stage'}
                    >
                        <LuPin size={14} />
                    </button>
                </div>
            </div>

            <div className={styles.stageGrid}>
                <div className={styles.stageArea} data-chat-column>
                    <div className={chatStyles.composer}>
                        <div className={chatStyles.inputCardWrapper}>
                            <ChatCat ref={stageRef} config={config} calm={stage.calm} hidden={stage.locked} ignoreAdmin={stage.ignoreAdmin} />
                            <div className={chatStyles.mainInputArea}>
                                <textarea
                                    rows={2}
                                    className={styles.stageInput}
                                    placeholder={fa ? 'اینجا تایپ کنید تا گربهٔ خواب بیدار شود…' : 'Type here to wake the sleeping cat…'}
                                />
                            </div>
                        </div>
                    </div>
                    <p className={styles.stageHint}>
                        {fa
                            ? 'ماوس روی گربه = نوازش · کلیک روی گربه = میو یا بیدار شدن · کلیک روی توپ = ترکیدن · تایپ و کلیک در این بخش = «صدا»'
                            : 'Hover = pet · click the cat = meow / wake · click the ball = pop · typing and clicks here count as noise'}
                    </p>
                </div>

                <aside className={styles.now} aria-live="polite">
                    <div className={styles.nowHead}>
                        <strong>{fa ? 'الان' : 'Now'}</strong>
                        {runTitle ? <span>{tx(runTitle)}</span> : <span className={styles.muted}>{fa ? 'گربه روی صحنه نیست' : 'No cat on stage'}</span>}
                        {snap ? <code dir="ltr">{`t=${snap.time.toFixed(1)}s`}</code> : null}
                        {countdown !== null ? (
                            <span className={styles.muted}>{fa ? `ظهور بعدی ${countdown.toFixed(1)} ثانیه` : `next in ${countdown.toFixed(1)} s`}</span>
                        ) : null}
                    </div>
                    {run?.step ? (
                        <div className={styles.nowStep}>
                            <span>{stepTitle(run.step, tx)}</span>
                            <code dir="ltr">{run.step}{run.detail ? ` · ${run.detail}` : ''}</code>
                        </div>
                    ) : null}
                    {snap ? (
                        <dl className={styles.stateGrid}>
                            <div><dt>{fa ? 'ژست' : 'Pose'}</dt><dd dir="ltr">{snap.rig.pose}</dd></div>
                            <div><dt>x</dt><dd dir="ltr">{`${Math.round(snap.rig.x)} / ${Math.round(snap.width)}`}</dd></div>
                            <div><dt>{fa ? 'رو به' : 'Facing'}</dt><dd>{snap.rig.facingRight ? (fa ? 'راست' : 'right') : (fa ? 'چپ' : 'left')}</dd></div>
                            <div><dt>{fa ? 'سرعت' : 'Speed'}</dt><dd dir="ltr">{`${Math.round(Math.abs(snap.rig.velocity))} px/s`}</dd></div>
                            <div><dt>{fa ? 'در هوا' : 'Airborne'}</dt><dd>{snap.rig.airborne ? yes : no}</dd></div>
                            <div><dt>{fa ? 'شفافیت' : 'Opacity'}</dt><dd dir="ltr">{snap.rig.opacity.toFixed(2)}</dd></div>
                            {run?.scenario === 'sleep' ? (
                                <div><dt>{fa ? 'صدا' : 'Noise'}</dt><dd dir="ltr">{`${snap.noise.toFixed(1)} / 3.4`}</dd></div>
                            ) : null}
                            {run?.scenario === 'watch' ? (
                                <div><dt>{fa ? 'سرعت ماوس' : 'Mouse'}</dt><dd dir="ltr">{`${Math.round(snap.pointerSpeed)} px/s${snap.hovering ? ' · hover' : ''}`}</dd></div>
                            ) : null}
                            {snap.ball ? (
                                <div><dt>{fa ? 'توپ' : 'Ball'}</dt><dd dir="ltr">{`x ${Math.round(snap.ball.x)} · v ${Math.round(snap.ball.vx)}`}</dd></div>
                            ) : null}
                        </dl>
                    ) : null}
                    <div className={styles.logHead}>
                        <span>{fa ? 'رویدادها' : 'Events'}</span>
                        <button type="button" className={styles.linkBtn} onClick={copyReport} title={fa ? 'کپی وضعیت و رویدادهای اخیر برای فرستادن به Claude' : 'Copy state and recent events to send to Claude'}>
                            <LuCopy size={13} />
                            {fa ? 'کپی گزارش' : 'Copy report'}
                        </button>
                        <button type="button" className={styles.linkBtn} onClick={clearLog} disabled={!log.length}>
                            <LuEraser size={13} />
                            {fa ? 'پاک کردن' : 'Clear'}
                        </button>
                    </div>
                    <ol ref={logRef} className={styles.log}>
                        {log.length === 0 ? (
                            <li className={`${styles.muted} ${styles.logEmpty}`}>{fa ? 'یک سناریو را پخش کنید؛ هر مرحله اینجا ثبت می‌شود.' : 'Play a scenario; every step is logged here.'}</li>
                        ) : log.map((entry) => {
                            const row = formatEntry(entry, tx, fa);
                            return (
                                <li key={entry.n} className={entry.blip ? styles.logBlip : entry.kind !== 'step' ? styles.logMark : undefined}>
                                    <span className={styles.logTime} dir="ltr">{row.time}</span>
                                    <span className={styles.logText}>{row.text}</span>
                                    <code dir="ltr">{row.code}</code>
                                </li>
                            );
                        })}
                    </ol>
                </aside>
            </div>
        </section>
    );
}
