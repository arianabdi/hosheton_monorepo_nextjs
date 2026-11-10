'use client';

import { useState } from 'react';
import { LuPlay } from 'react-icons/lu';
import HScrollStrip from '@/app/components/HScrollStrip/HScrollStrip';
import type { ScenarioName } from '../projects/[projectId]/chat/chatInput/cat/config';
import { SCENARIOS, type ScenarioDef, type StepDef } from './catalog';
import { useInspector } from './inspector';
import { CodeRef, FlagSwitch, Switch } from './ui';
import styles from './Animations.module.scss';

/* سناریوها: مراحل هر سناریو به ترتیب اجرا، با زمان‌ها و احتمال‌ها؛ مرحلهٔ در حال اجرا روی صحنه روشن می‌شود */

export function ScenariosPanel() {
    const { tx, fa, run, play, stage, setStage } = useInspector();
    const [picked, setPicked] = useState<{ name: ScenarioName; at: number }>({ name: 'sleep', at: 0 });
    // سناریوی تازه پخش‌شده خودکار باز می‌شود؛ انتخاب دستیِ بعد از آن اولویت دارد
    const current = run && run.startedAt > picked.at ? run.scenario : picked.name;
    const scenario = SCENARIOS.find((item) => item.name === current) ?? SCENARIOS[0];
    const inPool = stage.pool.includes(scenario.name);

    const togglePool = (value: boolean) => {
        const pool = value ? [...stage.pool, scenario.name] : stage.pool.filter((name) => name !== scenario.name);
        setStage({ pool: SCENARIOS.map((item) => item.name).filter((name) => pool.includes(name)) });
    };

    return (
        <div className={styles.scenarios}>
            <HScrollStrip className={styles.subTabs}>
                {SCENARIOS.map((item) => (
                    <button
                        key={item.name}
                        type="button"
                        className={`${styles.subTab} ${item.name === scenario.name ? styles.subTabActive : ''}`}
                        onClick={() => setPicked({ name: item.name, at: performance.now() })}
                    >
                        {run?.scenario === item.name ? <span className={styles.liveDot} aria-hidden /> : null}
                        {tx(item.title)}
                    </button>
                ))}
            </HScrollStrip>

            <div className={styles.scenarioHead}>
                <div className={styles.scenarioIntro}>
                    <h2>
                        {tx(scenario.title)}
                        <code dir="ltr">{scenario.name}</code>
                    </h2>
                    <p>{tx(scenario.body)}</p>
                    <div className={styles.metaRow}>
                        <span className={styles.meta}>{tx(scenario.duration)}</span>
                        <CodeRef code={scenario.code} title={tx(scenario.title)} ids={[scenario.name]} />
                    </div>
                </div>
                <div className={styles.scenarioActions}>
                    <button type="button" className={styles.btnPrimary} onClick={() => play(scenario.name)}>
                        <LuPlay size={14} />
                        {fa ? 'پخش روی صحنه' : 'Play on stage'}
                    </button>
                    <Switch
                        checked={inPool}
                        onChange={togglePool}
                        label={fa ? 'در زمان‌بند خودکار' : 'In auto scheduler'}
                        title={fa ? 'فقط زمان‌بند صحنهٔ این صفحه' : 'Only this page\'s stage scheduler'}
                    />
                </div>
            </div>

            <ScenarioSteps scenario={scenario} />
        </div>
    );
}

function ScenarioSteps({ scenario }: { scenario: ScenarioDef }) {
    // شماره فقط برای مراحل اصلی؛ رفتارهای داخل حلقه بی‌شماره‌اند
    const numbers = scenario.steps.map((step, i) => (step.sub ? null : scenario.steps.slice(0, i + 1).filter((s) => !s.sub).length));
    return (
        <ol className={styles.steps}>
            {scenario.steps.map((step, i) => (
                <StepRow key={step.key} scenario={scenario.name} step={step} index={numbers[i]} />
            ))}
        </ol>
    );
}

function StepRow({ scenario, step, index }: { scenario: ScenarioName; step: StepDef; index: number | null }) {
    const { tx, run, flash, openInPlayground, fa } = useInspector();
    const active = run?.scenario === scenario && step.ids.includes(run.step);
    const flashing = run?.scenario === scenario && flash !== null && step.ids.includes(flash);
    return (
        <li
            className={`${styles.step} ${step.sub ? styles.stepSub : ''} ${active ? styles.stepActive : ''} ${flashing ? styles.stepFlash : ''}`}
            aria-current={active ? 'step' : undefined}
        >
            <span className={styles.stepIndex} aria-hidden>{index ?? '•'}</span>
            <div className={styles.stepMain}>
                <div className={styles.stepHead}>
                    <strong>{tx(step.title)}</strong>
                    {step.meta ? <span className={styles.meta}>{tx(step.meta)}</span> : null}
                    {active && run?.detail ? <code className={styles.liveDetail} dir="ltr">{run.detail}</code> : null}
                </div>
                <p>{tx(step.body)}</p>
                {step.flags?.length ? (
                    <div className={styles.flagRow}>
                        {step.flags.map((flag) => <FlagSwitch key={flag} flag={flag} />)}
                    </div>
                ) : null}
                <div className={styles.metaRow}>
                    {step.poses?.length ? (
                        <span className={styles.poseChips}>
                            {step.poses.map((pose) => (
                                <button
                                    key={pose}
                                    type="button"
                                    className={styles.chip}
                                    dir="ltr"
                                    onClick={() => openInPlayground(pose)}
                                    title={fa ? 'باز کردن در زمین بازی' : 'Open in the playground'}
                                >
                                    {pose}
                                </button>
                            ))}
                        </span>
                    ) : null}
                    <CodeRef code={step.code} title={tx(step.title)} ids={step.ids} />
                </div>
            </div>
        </li>
    );
}
