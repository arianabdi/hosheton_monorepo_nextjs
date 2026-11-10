'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { LuRotateCcw } from 'react-icons/lu';
import { iransansxvf } from '@my-workspace/fonts/iransansxvf';
import HScrollStrip from '@/app/components/HScrollStrip/HScrollStrip';
import { canUseDeveloperTools } from '@/app/lib/user-roles';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { CAT_FLAGS, catDebug } from '../projects/[projectId]/chat/chatInput/cat/debug';
import type { Txt } from './catalog';
import { BehaviorsPanel } from './BehaviorsPanel';
import { InspectorProvider, TAB_IDS, useInspector, type TabId } from './inspector';
import { ParamsPanel } from './ParamsPanel';
import { PlaygroundPanel } from './PlaygroundPanel';
import { GROUND_CLIP, PosesPanel } from './PosesPanel';
import { ScenariosPanel } from './ScenariosPanel';
import { SchedulePanel } from './SchedulePanel';
import { SoundsPanel } from './SoundsPanel';
import { StageSection } from './StageSection';
import styles from './Animations.module.scss';

/*
 * صفحهٔ «انیمیشن‌ها» (منوی توسعه‌دهنده، فقط admin/super-admin): همهٔ جزئیات گربهٔ چت — سناریوها و مراحلشان،
 * لایه‌های حرکت، ژست‌ها، پارامترها، زمان‌بندی و صداها — با توضیح و کلید روشن/خاموش، روی همان کد واقعی گربه.
 */

const TAB_LABELS: Record<TabId, Txt> = {
    scenarios: { fa: 'سناریوها', en: 'Scenarios' },
    behaviors: { fa: 'لایه‌های حرکت', en: 'Motion layers' },
    poses: { fa: 'ژست‌ها', en: 'Poses' },
    playground: { fa: 'زمین بازی', en: 'Playground' },
    params: { fa: 'پارامترها و فنرها', en: 'Params & springs' },
    schedule: { fa: 'زمان‌بندی', en: 'Scheduling' },
    sounds: { fa: 'صدا و تعامل', en: 'Sound & input' },
};

const subscribeNoop = () => () => {};

export default function AnimationsInspector() {
    const router = useRouter();
    const pathname = usePathname();
    const params = useSearchParams();
    const roles = useAppStore((state) => state.roles);
    // نقش‌ها از localStorage می‌آیند؛ تا hydrate نشده چیزی رندر نمی‌شود
    const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false);
    const raw = params.get('tab');
    const tab: TabId = TAB_IDS.includes(raw as TabId) ? (raw as TabId) : 'scenarios';
    const setTab = useCallback((next: TabId) => {
        router.replace(`${pathname}?tab=${next}`, { scroll: false });
    }, [router, pathname]);

    if (!mounted) return null;
    if (!canUseDeveloperTools(roles)) {
        return (
            <div className={`${styles.page} ${iransansxvf.className}`}>
                <p className={styles.muted}>این صفحه فقط برای ادمین‌هاست. · Admins only.</p>
            </div>
        );
    }
    return (
        <InspectorProvider tab={tab} onTab={setTab}>
            <InspectorBody />
        </InspectorProvider>
    );
}

function InspectorBody() {
    const { fa, tx, tab, setTab, debug } = useInspector();
    const offCount = CAT_FLAGS.filter((flag) => !debug.flags[flag]).length;
    const dirty = offCount > 0 || debug.timeScale !== 1 || debug.paused;

    return (
        <div className={`${styles.page} ${iransansxvf.className}`} dir={fa ? 'rtl' : 'ltr'}>
            <svg width="0" height="0" className={styles.defs} aria-hidden>
                <clipPath id={GROUND_CLIP}>
                    <rect x="-2000" y="-2000" width="4000" height="2000" />
                </clipPath>
            </svg>

            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>{fa ? 'انیمیشن‌ها' : 'Animations'}</h1>
                    <p className={styles.subtitle}>
                        {fa
                            ? 'همهٔ سناریوها، مراحل، ژست‌ها، لایه‌های حرکت و زمان‌بندی گربهٔ چت‌باکس، با توضیح و کلید روشن/خاموش. همه روی کد واقعی گربه اجرا می‌شوند و کلیدها فقط روی همین صفحه اثر دارند.'
                            : 'Every scenario, step, pose, motion layer and scheduling rule of the chat-box cat, explained and switchable. Everything runs on the real cat code; switches only affect this page.'}
                    </p>
                </div>
                <div className={styles.headerActions}>
                    {offCount > 0 ? (
                        <span className={styles.offBadge}>{fa ? `${offCount} کلید خاموش` : `${offCount} switched off`}</span>
                    ) : null}
                    <button type="button" className={styles.btn} onClick={() => catDebug.reset()} disabled={!dirty}>
                        <LuRotateCcw size={14} />
                        {fa ? 'بازنشانی همه' : 'Reset all'}
                    </button>
                </div>
            </header>

            <StageSection />

            <nav className={styles.tabNav} aria-label={fa ? 'بخش‌های انیمیشن' : 'Animation sections'}>
                <HScrollStrip className={styles.tabScroller}>
                    {TAB_IDS.map((id) => (
                        <button
                            key={id}
                            type="button"
                            className={`${styles.tab} ${tab === id ? styles.tabActive : ''}`}
                            aria-current={tab === id ? 'page' : undefined}
                            onClick={() => setTab(id)}
                        >
                            {tx(TAB_LABELS[id])}
                        </button>
                    ))}
                </HScrollStrip>
            </nav>

            <div className={styles.panel}>
                {tab === 'scenarios' ? <ScenariosPanel /> : null}
                {tab === 'behaviors' ? <BehaviorsPanel /> : null}
                {tab === 'poses' ? <PosesPanel /> : null}
                {tab === 'playground' ? <PlaygroundPanel /> : null}
                {tab === 'params' ? <ParamsPanel /> : null}
                {tab === 'schedule' ? <SchedulePanel /> : null}
                {tab === 'sounds' ? <SoundsPanel /> : null}
            </div>
        </div>
    );
}
