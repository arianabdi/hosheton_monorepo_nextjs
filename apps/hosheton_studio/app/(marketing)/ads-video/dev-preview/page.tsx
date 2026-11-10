'use client';

import { useMemo, useRef, useState } from 'react';
import type { AdsCutFull } from '../lib/ads-video-api';
import { readCutElements } from '../lib/cut-runtime';
import { buildDemoCuts } from '../lib/demo-project';
import CutPlayer from '../components/CutPlayer';
import AllCutsPlayer from '../components/AllCutsPlayer';
import CutThumb from '../components/CutThumb';
import ChatPanel, { type ChatEntry } from '@/app/(marketing)/components/ads-chat/ChatPanel';
import ElementSettingsPanel from '../components/ElementSettingsPanel';
import AudioPanel from '../components/AudioPanel';
import ClipSettingsPanel from '../components/ClipSettingsPanel';
import BrandKitModal from '../components/BrandKitModal';
import styles from '../AdsVideo.module.scss';

const demoSpecs = buildDemoCuts();

const fakeCuts = [
    ...demoSpecs.map((spec, index) => ({
        _id: `demo-${index}`,
        projectId: 'p',
        title: spec.title,
        order: index,
        durationSeconds: spec.durationSeconds,
        currentVersion: 1,
        versionCount: 1,
        html: spec.html,
        attachments: [],
        elementOverrides: null,
        voiceover: null,
        soundEffects: [],
    })),
];

const fakeProject = {
    _id: 'p', title: 'کمپین کافه دم', aspectRatio: '16:9', fps: 30, cutCount: 2,
};

const fakeModels = [
    { _id: 'm1', name: 'gpt-demo', displayName: 'GPT (نمونه)', class: 'text' },
];

const initialEntries: ChatEntry[] = [
    { id: 1, role: 'user', text: 'یک کات ۵ ثانیه‌ای برای تخفیف ویژه بساز با موشن ورود لوگو' },
    {
        id: 2,
        role: 'assistant',
        steps: [
            { id: 'generate', label: 'تولید موشن‌گرافیک ۵ ثانیه‌ای', status: 'done', detail: 'v1' },
            { id: 'sound', label: 'طراحی صدا و موزیک پس‌زمینه', status: 'done', detail: '۲ فایل صوتی تولید شد' },
        ],
        cutRefs: [{ cutId: 'a', title: 'هوک — تخفیف ویژه' }],
    },
    {
        id: 3,
        role: 'assistant',
        steps: [
            { id: 'plan', label: 'چیدن استوری‌بورد با هوش مصنوعی', status: 'done', detail: '۴ کات برنامه‌ریزی شد' },
            { id: 'cut-0', label: 'هوک — تخفیف ویژه', status: 'done' },
            { id: 'cut-1', label: 'معرفی محصول', status: 'done' },
            { id: 'cut-2', label: 'ساخت کات ۳', status: 'running' },
            { id: 'cut-3', label: 'ساخت کات ۴', status: 'pending' },
        ],
    },
];

type Tab = 'chat' | 'elements' | 'audio' | 'settings';

export default function AdsVideoDevPreview() {
    const [tab, setTab] = useState<Tab>('chat');
    const [stageMode, setStageMode] = useState<'single' | 'all'>('single');
    const [storyboardOpen, setStoryboardOpen] = useState(true);
    const [brandKitOpen, setBrandKitOpen] = useState(false);
    const [entries] = useState<ChatEntry[]>(initialEntries);
    const frameRef = useRef<HTMLIFrameElement | null>(null);
    const [readKey, setReadKey] = useState('');

    const cutFull = useMemo<AdsCutFull>(() => ({
        ...(fakeCuts[0] as unknown as AdsCutFull),
        // نسخه‌ها در شکل کامل فقط متادیتا هستند — سند HTML همان html ریشه‌ی کات است
        versions: [{ version: 1, prompt: 'کات نمونه', createdAt: new Date().toISOString() }],
    }), []);

    const getElements = () => readCutElements(frameRef.current);

    return (
        <div className={styles.root}>
            <header className={styles.toolbar}>
                <div className={styles.toolbarTitle}><strong>Dev Preview — ads-video</strong></div>
                <div className={styles.toolbarSpacer} />
                <div className={styles.stageModeSwitch}>
                    <button type="button" onClick={() => setTab('chat')}>tab: chat</button>
                    <button type="button" onClick={() => setTab('elements')}>tab: elements</button>
                    <button type="button" onClick={() => setTab('audio')}>tab: audio</button>
                    <button type="button" onClick={() => setTab('settings')}>tab: settings</button>
                    <button type="button" onClick={() => { setReadKey('k' + Date.now()); }}>
                        reload elements
                    </button>
                    <button type="button" onClick={() => setBrandKitOpen(true)}>brand kit</button>
                </div>
            </header>

            <div className={`${styles.columns} ${styles.columnsWork} ${storyboardOpen ? '' : styles.columnsNoBoard}`}>
                <aside className={styles.storyboard}>
                    <div className={styles.paneHead}>
                        <span>استوری‌بورد</span>
                        <button type="button" className={styles.iconBtn} title="بستن" onClick={() => setStoryboardOpen(false)}>✕</button>
                    </div>
                    {storyboardOpen && fakeCuts.map((cut, index) => (
                        <div key={cut._id} className={`${styles.cutItem} ${index === 0 ? styles.cutItemActive : ''}`}>
                            <CutThumb html={cut.html} aspectRatio="16:9" title={cut.title} />
                            <div className={styles.cutNameBar}><strong>{index + 1}. {cut.title}</strong></div>
                            <div className={styles.cutHoverMeta}>
                                <span>۵ ثانیه · v1/1</span>
                                <div className={styles.cutActions}>
                                    <button type="button">↑</button>
                                    <button type="button">↓</button>
                                    <button type="button">✕</button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {!storyboardOpen && (
                        <button type="button" className={styles.storyboardRail} onClick={() => setStoryboardOpen(true)}>
                            نمایش
                        </button>
                    )}
                </aside>

                <main className={styles.stage}>
                    <div className={styles.stageHead}>
                        <div className={styles.stageModeSwitch} role="tablist">
                            <button
                                type="button"
                                role="tab"
                                aria-selected={stageMode === 'all'}
                                className={stageMode === 'all' ? styles.modeActive : ''}
                                onClick={() => setStageMode('all')}
                            >
                                پخش کل ویدیو
                            </button>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={stageMode === 'single'}
                                className={stageMode === 'single' ? styles.modeActive : ''}
                                onClick={() => setStageMode('single')}
                            >
                                پیش‌نمایش کات
                            </button>
                        </div>
                    </div>
                    {stageMode === 'all' ? (
                        <AllCutsPlayer cuts={fakeCuts} aspectRatio="16:9" />
                    ) : (
                        <CutPlayer
                            html={fakeCuts[0].html}
                            durationSeconds={fakeCuts[0].durationSeconds}
                            aspectRatio="16:9"
                            title="هوک"
                            reloadKey="dev-1"
                            onFrameReady={(frame) => { frameRef.current = frame; setReadKey('r' + Date.now()); }}
                        />
                    )}
                </main>

                <aside className={styles.sidePanel}>
                    <div className={styles.sideTabs} role="tablist">
                        <button type="button" role="tab" aria-selected={tab === 'chat'} className={`${styles.sideTab} ${tab === 'chat' ? styles.sideTabActive : ''}`} onClick={() => setTab('chat')}>چت</button>
                        <button type="button" role="tab" aria-selected={tab === 'elements'} className={`${styles.sideTab} ${tab === 'elements' ? styles.sideTabActive : ''}`} onClick={() => setTab('elements')}>المان‌ها</button>
                        <button type="button" role="tab" aria-selected={tab === 'audio'} className={`${styles.sideTab} ${tab === 'audio' ? styles.sideTabActive : ''}`} onClick={() => setTab('audio')}>صدا</button>
                        <button type="button" role="tab" aria-selected={tab === 'settings'} className={`${styles.sideTab} ${tab === 'settings' ? styles.sideTabActive : ''}`} onClick={() => setTab('settings')}>تنظیمات</button>
                    </div>
                    <div className={styles.sideBody}>
                        {tab === 'chat' && (
                            <ChatPanel
                                entries={entries}
                                models={fakeModels as never}
                                selectedCut={fakeCuts[0]}
                                autoJob={null}
                                onSend={() => {}}
                                onOpenCut={() => {}}
                            />
                        )}
                        {tab === 'elements' && (
                            <ElementSettingsPanel
                                cut={cutFull}
                                getElements={getElements}
                                readKey={readKey}
                                onSaved={() => {}}
                                onError={() => {}}
                            />
                        )}
                        {tab === 'audio' && (
                            <AudioPanel
                                cut={cutFull}
                                textModelId="m1"
                                playerTime={0}
                                onSeekPlayer={() => {}}
                                onRefreshCut={() => {}}
                                onError={() => {}}
                            />
                        )}
                        {tab === 'settings' && (
                            <ClipSettingsPanel
                                project={fakeProject as never}
                                cut={cutFull}
                                busyCut={false}
                                generating={false}
                                codeDraft={fakeCuts[0].html.slice(0, 400)}
                                editPrompt=""
                                previewVersion={1}
                                onCodeDraftChange={() => {}}
                                onEditPromptChange={() => {}}
                                onPreviewVersionChange={() => {}}
                                onActivateVersion={() => {}}
                                onPatchCutMeta={() => {}}
                                onPatchProject={() => {}}
                                onApplyAiEdit={() => {}}
                                onSaveCode={() => {}}
                                onOpenSaveTemplate={() => {}}
                            />
                        )}
                    </div>
                </aside>
            </div>

            <BrandKitModal
                open={brandKitOpen}
                project={fakeProject as never}
                onClose={() => setBrandKitOpen(false)}
                onSave={() => setBrandKitOpen(false)}
            />
        </div>
    );
}
