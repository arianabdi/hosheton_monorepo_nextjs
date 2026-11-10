'use client';

import {
    createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore,
    type ReactNode, type RefObject,
} from 'react';
import { SuccessToaster } from '@my-workspace/utils';
import { notifyError } from '@/app/lib/errors';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import type { ChatCatHandle } from '../projects/[projectId]/chat/chatInput/cat/ChatCat';
import { SCENARIO_NAMES, type ScenarioName } from '../projects/[projectId]/chat/chatInput/cat/config';
import { catDebug, type CatDebugState, type CatFlag } from '../projects/[projectId]/chat/chatInput/cat/debug';
import type { PoseName } from '../projects/[projectId]/chat/chatInput/cat/rig/poses';
import type { Txt } from './catalog';

/* وضعیت مشترک صفحهٔ «انیمیشن‌ها»: زبان، کلیدها (catDebug)، رد اجرای صحنه، تنظیمات صحنهٔ زنده و تب‌ها */

export type TabId = 'scenarios' | 'behaviors' | 'poses' | 'playground' | 'params' | 'schedule' | 'sounds';

export const TAB_IDS: TabId[] = ['scenarios', 'behaviors', 'poses', 'playground', 'params', 'schedule', 'sounds'];

export type LogEntry = {
    n: number;
    kind: 'start' | 'step' | 'done' | 'schedule';
    scenario?: ScenarioName;
    id?: string;
    detail?: string;
    /** ثانیهٔ سناریو */
    at?: number;
    blip?: boolean;
    /** ساعت واقعی (ms) */
    clock: number;
};

export type RunState = { scenario: ScenarioName; step: string; detail?: string; startedAt: number } | null;

export type StageSettings = {
    /** زمان‌بند خودکار روی صحنهٔ این صفحه */
    auto: boolean;
    /** زمان‌بندی کوتاه برای تست (۲–۴ و ۴–۸ ثانیه) */
    fast: boolean;
    pool: ScenarioName[];
    /** زمان‌بند حتی وقتی کلید ادمین (studio.chat.catEnabled) خاموش است */
    ignoreAdmin: boolean;
    sound: boolean;
    volume: number;
    size: number;
    calm: boolean;
    /** ورودی قفل (hidden) */
    locked: boolean;
    pinned: boolean;
};

const DEFAULT_STAGE: StageSettings = {
    auto: false,
    fast: true,
    pool: SCENARIO_NAMES,
    ignoreAdmin: true,
    sound: true,
    volume: 0.25,
    size: 1,
    calm: false,
    locked: false,
    pinned: false,
};

type InspectorValue = {
    fa: boolean;
    tx: (text: Txt) => string;
    debug: CatDebugState;
    setFlag: (flag: CatFlag, value: boolean) => void;
    run: RunState;
    flash: string | null;
    log: LogEntry[];
    clearLog: () => void;
    /** زمان ظهور بعدی زمان‌بند (performance.now) */
    nextAt: number | null;
    stage: StageSettings;
    setStage: (patch: Partial<StageSettings>) => void;
    stageRef: RefObject<ChatCatHandle | null>;
    play: (name: ScenarioName) => void;
    tab: TabId;
    setTab: (tab: TabId) => void;
    playgroundPose: PoseName;
    openInPlayground: (pose: PoseName) => void;
    copy: (text: string) => void;
};

const InspectorContext = createContext<InspectorValue | null>(null);

const STORAGE_KEY = 'hosheton-animations-inspector';
const LOG_LIMIT = 300;

export function useInspector() {
    const value = useContext(InspectorContext);
    if (!value) throw new Error('useInspector outside InspectorProvider');
    return value;
}

export function InspectorProvider({ tab, onTab, children }: { tab: TabId; onTab: (tab: TabId) => void; children: ReactNode }) {
    const lang = useAppStore((state) => state.lang);
    // همان قانون منوی توسعه‌دهنده: هر زبانی جز انگلیسی = فارسی
    const fa = lang !== 'en';
    const tx = useCallback((text: Txt) => (fa ? text.fa : text.en), [fa]);
    const debug = useSyncExternalStore(catDebug.subscribeState, catDebug.getState, () => catDebug.serverState);
    const [run, setRun] = useState<RunState>(null);
    const [flash, setFlash] = useState<string | null>(null);
    const [log, setLog] = useState<LogEntry[]>([]);
    const [nextAt, setNextAt] = useState<number | null>(null);
    const [stage, setStageState] = useState<StageSettings>(DEFAULT_STAGE);
    const [playgroundPose, setPlaygroundPose] = useState<PoseName>('stand');
    const stageRef = useRef<ChatCatHandle | null>(null);
    const seq = useRef(0);
    const flashTimer = useRef<number | undefined>(undefined);

    // کلیدها و سرعت صحنه در مرورگر همین توسعه‌دهنده می‌مانند؛ با خروج از صفحه همه به حالت عادی برمی‌گردند
    useEffect(() => {
        try {
            const raw = window.localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const saved = JSON.parse(raw) as { flags?: Partial<Record<CatFlag, boolean>>; timeScale?: number };
                if (saved.flags) catDebug.setFlags(saved.flags);
                if (typeof saved.timeScale === 'number') catDebug.setTime({ timeScale: saved.timeScale });
            }
        } catch {
            // ذخیرهٔ خراب یا بسته — با پیش‌فرض ادامه
        }
        const off = catDebug.subscribeState(() => {
            try {
                const state = catDebug.getState();
                window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ flags: state.flags, timeScale: state.timeScale }));
            } catch {
                // نادیده
            }
        });
        return () => {
            off();
            catDebug.reset();
        };
    }, []);

    useEffect(() => {
        const push = (entry: Omit<LogEntry, 'n' | 'clock'>) => {
            seq.current += 1;
            const item = { ...entry, n: seq.current, clock: performance.now() };
            setLog((list) => (list.length >= LOG_LIMIT ? [...list.slice(-LOG_LIMIT + 1), item] : [...list, item]));
        };
        const off = catDebug.subscribe((event) => {
            if (event.type === 'start') {
                setRun({ scenario: event.scenario, step: '', startedAt: performance.now() });
                setNextAt(null);
                push({ kind: 'start', scenario: event.scenario, at: 0 });
            } else if (event.type === 'step') {
                if (event.blip) {
                    setFlash(event.id);
                    window.clearTimeout(flashTimer.current);
                    flashTimer.current = window.setTimeout(() => setFlash(null), 900);
                } else {
                    setRun((current) => (current ? { ...current, step: event.id, detail: event.detail } : current));
                }
                push({ kind: 'step', scenario: event.scenario, id: event.id, detail: event.detail, at: event.at, blip: event.blip });
            } else if (event.type === 'done') {
                setRun(null);
                push({ kind: 'done', scenario: event.scenario, at: event.at });
            } else {
                setNextAt(performance.now() + event.delay);
                push({ kind: 'schedule', detail: `${(event.delay / 1000).toFixed(1)}s · ${event.pool.join(', ')}` });
            }
        });
        return () => {
            off();
            window.clearTimeout(flashTimer.current);
        };
    }, []);

    const setFlag = useCallback((flag: CatFlag, value: boolean) => catDebug.setFlag(flag, value), []);
    const clearLog = useCallback(() => setLog([]), []);
    const setStage = useCallback((patch: Partial<StageSettings>) => {
        setStageState((current) => ({ ...current, ...patch }));
        // خاموش شدن زمان‌بند = دیگر «ظهور بعدی» وجود ندارد
        if (patch.auto === false) setNextAt(null);
    }, []);
    const play = useCallback((name: ScenarioName) => stageRef.current?.play(name), []);
    const openInPlayground = useCallback((pose: PoseName) => {
        setPlaygroundPose(pose);
        onTab('playground');
    }, [onTab]);
    const copy = useCallback((text: string) => {
        navigator.clipboard.writeText(text).then(
            () => SuccessToaster({ message: fa ? 'کپی شد' : 'Copied' }),
            (error: unknown) => notifyError(error, { fallback: fa ? 'کپی نشد؛ دستی کپی کنید.' : 'Copy failed; copy it manually.' }),
        );
    }, [fa]);

    const value = useMemo<InspectorValue>(() => ({
        fa,
        tx,
        debug,
        setFlag,
        run,
        flash,
        log,
        clearLog,
        nextAt,
        stage,
        setStage,
        stageRef,
        play,
        tab,
        setTab: onTab,
        playgroundPose,
        openInPlayground,
        copy,
    }), [fa, tx, debug, setFlag, run, flash, log, clearLog, nextAt, stage, setStage, play, tab, onTab, playgroundPose, openInPlayground, copy]);

    return <InspectorContext.Provider value={value}>{children}</InspectorContext.Provider>;
}
