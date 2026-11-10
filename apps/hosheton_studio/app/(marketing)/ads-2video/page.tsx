'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { LuClapperboard } from 'react-icons/lu';
import {
    adsVideoApi,
    type AdsCutListItem,
    type AdsProject,
    type AdsTemplate,
} from '@/app/(marketing)/ads-video/lib/ads-video-api';
import { buildDemoCuts } from '@/app/(marketing)/ads-video/lib/demo-project';
import TemplateGalleryModal from '@/app/(marketing)/ads-video/components/TemplateGalleryModal';
import ExportModal from '@/app/(marketing)/ads-video/components/ExportModal';
import BrandKitModal, { type AdsBrandKit } from '@/app/(marketing)/ads-video/components/BrandKitModal';
import {
    ADS_CHAT_HEADER_SLOT_ID,
    ADS_CHAT_TOP_SLOT_ID,
    useDomSlot,
} from '@/app/(marketing)/components/ads-chat/chat-slots';
import AdsPreviewPlayer, {
    type AdsPlaybackState,
    type AdsPlayerCut,
    type AdsPlayerFrame,
    type AdsPlayerHandle,
} from './AdsPreviewPlayer';
import CutsList from './CutsList';
import ProjectBar from './ProjectBar';
import BrandKitCard from './BrandKitCard';
import { useAdsStudioSyncStore } from '@/app/zustand/store/useAdsStudioSyncStore';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { canUseDeveloperTools } from '@/app/lib/user-roles';
import styles from './page.module.scss';

// ────────────────────────────── Helpers ──────────────────────────────

function toCutItems(list: AdsCutListItem[] | undefined): AdsPlayerCut[] {
    return (list || []).map((cut) => ({
        _id: cut._id,
        title: cut.title,
        html: cut.html,
        durationSeconds: cut.durationSeconds,
        currentVersion: cut.currentVersion,
        thumbnailUrl: cut.thumbnailUrl,
        voiceover: cut.voiceover,
        soundEffects: cut.soundEffects,
    }));
}

function demoCutItems(): AdsPlayerCut[] {
    return buildDemoCuts().map((spec, index) => ({
        _id: `demo-${index}`,
        title: spec.title,
        html: spec.html,
        durationSeconds: spec.durationSeconds,
        currentVersion: 1,
        thumbnailUrl: null,
    }));
}

function formatClock(seconds: number) {
    const total = Math.max(0, Math.round(seconds));
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

// ────────────────────────────── Page ──────────────────────────────

/**
 * استودیو ویدیو تبلیغاتی ads2 — ستون اصلی فقط پیش‌نمایش (پلیر کل ویدیو با تایم‌لاین
 * تکه‌تکه) و لیست عمودی کات‌ها زیر آن است؛ نوار پروژه (انتخاب/ساخت/حذف، قالب‌ها،
 * خروجی) و کارت برند کیت با portal بالای چتِ ساکن در layout رندر می‌شوند.
 */
export default function AdsTwoVideoPage() {
    const { t } = useTranslation('adsVideo');
    // این صفحه فقط برای ادمین‌هاست — دسترسی از طریق منوی developer
    const roles = useAppStore((state) => state.roles);
    const isAdmin = canUseDeveloperTools(roles);

    const [projects, setProjects] = useState<AdsProject[]>([]);
    const [project, setProject] = useState<AdsProject | null>(null);
    const [cuts, setCuts] = useState<AdsPlayerCut[]>([]);
    const [demoMode, setDemoMode] = useState(false);
    const [loading, setLoading] = useState(true);
    const [switching, setSwitching] = useState(false);

    const [selectedCutId, setSelectedCutId] = useState('');

    // همگام‌سازی با چتِ ساکن در layout — پروژه/کات فعال اینجا نوشته می‌شود و
    // تولیدِ جدیدِ چت با changeSeq/cutRequest به این صفحه برمی‌گردد
    const setActiveProject = useAdsStudioSyncStore((s) => s.setActiveProject);
    const setActiveCut = useAdsStudioSyncStore((s) => s.setActiveCut);
    const changeSeq = useAdsStudioSyncStore((s) => s.changeSeq);

    // مودال‌ها — دکمه‌هایشان در نوار پروژه و کارت برند کیت بالای چت است
    const [exportOpen, setExportOpen] = useState(false);
    const [brandKitOpen, setBrandKitOpen] = useState(false);
    const [templatesOpen, setTemplatesOpen] = useState(false);

    // جایگاه‌های بالای سایدبار چت
    const headerSlot = useDomSlot(ADS_CHAT_HEADER_SLOT_ID);
    const topSlot = useDomSlot(ADS_CHAT_TOP_SLOT_ID);

    // پخش — دکمه‌ی پخش هر ردیف فقط همان کات را پخش می‌کند
    const playerRef = useRef<AdsPlayerHandle>(null);
    const [playback, setPlayback] = useState<AdsPlaybackState>({ playing: false, mode: 'all', cutId: '' });
    // پس‌زمینه‌ی پیشرفت ردیف‌ها — هر فریم مستقیم روی DOM (بدون ری‌رندر لیست)
    const fillsRef = useRef(new Map<string, HTMLElement>());
    const lastFrameRef = useRef<{ cutId: string; ratio: number }>({ cutId: '', ratio: 0 });

    const bindFill = useCallback((cutId: string) => (el: HTMLElement | null) => {
        if (!el) {
            fillsRef.current.delete(cutId);
            return;
        }
        fillsRef.current.set(cutId, el);
        const last = lastFrameRef.current;
        el.style.setProperty('--cut-progress', String(last.cutId === cutId ? last.ratio : 0));
    }, []);

    const handleFrame = useCallback((frame: AdsPlayerFrame) => {
        const last = lastFrameRef.current;
        if (last.cutId && last.cutId !== frame.cutId) {
            fillsRef.current.get(last.cutId)?.style.setProperty('--cut-progress', '0');
        }
        fillsRef.current.get(frame.cutId)?.style.setProperty('--cut-progress', String(frame.ratio));
        lastFrameRef.current = { cutId: frame.cutId, ratio: frame.ratio };
    }, []);

    // پیام کوتاه وضعیت برای اکشن‌هایی که لاگ چت ندارند
    const [notice, setNotice] = useState('');
    const noticeTimerRef = useRef<number | null>(null);
    const showNotice = useCallback((text: string) => {
        setNotice(text);
        if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
        noticeTimerRef.current = window.setTimeout(() => setNotice(''), 4000);
    }, []);

    // ── بارگذاری ──

    const loadProject = useCallback(async (projectId: string) => {
        setSwitching(true);
        try {
            const detail = await adsVideoApi.getProject(projectId);
            setProject(detail.project);
            setCuts(toCutItems(detail.cuts));
            setDemoMode(false);
            setActiveProject(detail.project._id);
        } catch {
            // پروژه در دسترس نیست — ساختار صفحه با کات‌های نمونه دیده شود
            setProject(null);
            setDemoMode(true);
            setCuts(demoCutItems());
            setActiveProject(null);
        } finally {
            setSwitching(false);
        }
    }, [setActiveProject]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await adsVideoApi.listProjects();
                const first = res.projects?.[0];
                if (!first) throw new Error('empty');
                if (!cancelled) setProjects(res.projects);
                const detail = await adsVideoApi.getProject(first._id);
                if (cancelled) return;
                setProject(detail.project);
                setCuts(toCutItems(detail.cuts));
                setActiveProject(detail.project._id);
            } catch {
                // بدون پروژه/خطا — ساختار صفحه با کات‌های نمونه دیده شود
                if (!cancelled) {
                    setDemoMode(true);
                    setCuts(demoCutItems());
                    setActiveProject(null);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [setActiveProject]);

    const selectCut = useCallback((cutId: string) => {
        setSelectedCutId(cutId);
        setActiveCut(cutId);
    }, [setActiveCut]);

    // کات فعال — اگر انتخاب فعلی در لیست نیست (حذف/تعویض پروژه)، اولین کات لیست
    const activeCutId = cuts.some((cut) => cut._id === selectedCutId)
        ? selectedCutId
        : (cuts[0]?._id || '');

    // کات فعال با چت همگام می‌ماند (استور خارجی — نه state محلی)
    useEffect(() => {
        setActiveCut(activeCutId || null);
    }, [activeCutId, setActiveCut]);

    // چت (در layout) بعد از هر تولید اینجا را خبر می‌کند — پروژه/کات‌ها دوباره خوانده شوند
    useEffect(() => {
        if (!changeSeq) return;
        void (async () => {
            const pid = useAdsStudioSyncStore.getState().activeProjectId;
            if (!pid) return;
            try {
                const [detail, list] = await Promise.all([
                    adsVideoApi.getProject(pid),
                    adsVideoApi.listProjects(),
                ]);
                setProject(detail.project);
                setCuts(toCutItems(detail.cuts));
                setProjects(list.projects || []);
            } catch {
                // آخرین وضعیت موفق باقی می‌ماند
            }
        })();
    }, [changeSeq]);

    // پرش به کاتِ خواسته‌شده از چت (کارت کات یا کات تازه‌ساخته‌شده) — مصرف درخواست‌های
    // قبل از mount هم با یک microtask انجام می‌شود
    useEffect(() => {
        const consume = () => {
            const request = useAdsStudioSyncStore.getState().cutRequest;
            if (!request) return;
            setSelectedCutId(request.cutId);
            setActiveCut(request.cutId);
            useAdsStudioSyncStore.getState().clearCutRequest();
        };
        queueMicrotask(consume);
        return useAdsStudioSyncStore.subscribe((state, prev) => {
            if (state.cutRequest !== prev.cutRequest) consume();
        });
    }, [setActiveCut]);

    // ── اکشن‌های نوار پروژه ──

    const refreshCurrent = useCallback(async () => {
        if (!project) return;
        try {
            const detail = await adsVideoApi.getProject(project._id);
            setProject(detail.project);
            setCuts(toCutItems(detail.cuts));
        } catch {
            // آخرین وضعیت موفق باقی می‌ماند
        }
    }, [project]);

    const handleSelectProject = useCallback(async (projectId: string) => {
        if (!projectId) return;
        playerRef.current?.pause();
        setSelectedCutId('');
        await loadProject(projectId);
    }, [loadProject]);

    const handleCreateProject = useCallback(async (title: string, aspectRatio: string) => {
        try {
            const res = await adsVideoApi.createProject({ title, aspectRatio });
            const listRes = await adsVideoApi.listProjects();
            setProjects(listRes.projects || []);
            setSelectedCutId('');
            setActiveProject(res.project._id);
            await loadProject(res.project._id);
        } catch {
            showNotice(t('err_create_project', { defaultValue: 'ساخت پروژه ناموفق بود.' }));
        }
    }, [loadProject, setActiveProject, showNotice, t]);

    const handleDeleteProject = useCallback(async () => {
        if (!project) return;
        if (!window.confirm(t('delete_confirm', { defaultValue: 'این پروژه و همه‌ی کات‌هایش حذف شود؟' }))) return;
        try {
            await adsVideoApi.deleteProject(project._id);
            const remaining = projects.filter((item) => item._id !== project._id);
            setProjects(remaining);
            setProject(null);
            setSelectedCutId('');
            if (remaining[0]) {
                await loadProject(remaining[0]._id);
            } else {
                setDemoMode(true);
                setCuts(demoCutItems());
                setActiveProject(null);
            }
        } catch {
            showNotice(t('err_delete_project', { defaultValue: 'حذف پروژه ناموفق بود.' }));
        }
    }, [loadProject, project, projects, setActiveProject, showNotice, t]);

    const handleUseTemplate = useCallback(async (template: AdsTemplate) => {
        if (!project) return;
        try {
            const res = await adsVideoApi.createCut(project._id, { templateId: template._id });
            setTemplatesOpen(false);
            await refreshCurrent();
            selectCut(res.cut._id);
        } catch {
            showNotice(t('err_use_template', { defaultValue: 'استفاده از قالب ناموفق بود.' }));
        }
    }, [project, refreshCurrent, selectCut, showNotice, t]);

    const handleSaveBrandKit = useCallback(async (brandKit: AdsBrandKit) => {
        if (!project) return;
        try {
            await adsVideoApi.updateProject(project._id, { brandKit: brandKit as Record<string, unknown> });
            setProject((prev) => (prev ? { ...prev, brandKit } : prev));
            setBrandKitOpen(false);
            showNotice(t('log_brand_saved', { defaultValue: 'برند کیت ذخیره شد — در تولیدهای بعدی اعمال می‌شود.' }));
        } catch {
            showNotice(t('err_save_brandkit', { defaultValue: 'ذخیره‌ی برند کیت ناموفق بود.' }));
        }
    }, [project, showNotice, t]);

    // ── نمایش ──

    const aspectRatio = project?.aspectRatio || '16:9';
    const totalSeconds = cuts.reduce((sum, cut) => sum + (cut.durationSeconds || 0), 0);

    // گارد دسترسی — فقط ادمین‌ها (developer)؛ بقیه پیام عدم دسترسی می‌بینند
    if (!isAdmin) {
        return (
            <div className={styles.denied}>
                <LuClapperboard size={34} />
                <h2>{t('no_access_page')}</h2>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.workspace}>
                {/* ── ستون اصلی — فقط پیش‌نمایش و کات‌های زیر آن ── */}
                <div className={styles.mainColumn}>
                    <section className={styles.stageSection}>
                        <AdsPreviewPlayer
                            ref={playerRef}
                            cuts={cuts}
                            aspectRatio={aspectRatio}
                            activeCutId={activeCutId}
                            onActiveChange={selectCut}
                            onFrame={handleFrame}
                            onPlaybackChange={setPlayback}
                        />
                    </section>

                    {notice ? <div className={styles.notice} role="status">{notice}</div> : null}

                    <section className={styles.cutsSection}>
                        <header className={styles.cutsHead}>
                            <h2>
                                {demoMode
                                    ? t('cuts_demo_title', { defaultValue: 'کات‌های نمونه' })
                                    : t('cuts_title', { defaultValue: 'کات‌ها' })}
                            </h2>
                            <span className={styles.cutsMeta}>
                                {t('cuts_count', { n: cuts.length })}
                                <i aria-hidden>·</i>
                                <span dir="ltr">{formatClock(totalSeconds)}</span>
                            </span>
                        </header>
                        {cuts.length ? (
                            <CutsList
                                cuts={cuts}
                                activeCutId={activeCutId}
                                playback={playback}
                                bindFill={bindFill}
                                onSelect={selectCut}
                                onTogglePlay={(cutId) => playerRef.current?.toggleCut(cutId)}
                            />
                        ) : !loading ? (
                            <div className={styles.cutsEmpty}>
                                {t('cuts_empty_chat', { defaultValue: 'هنوز کاتی نیست — در چت کنار، ویدیویت را توصیف کن تا ساخته شود.' })}
                            </div>
                        ) : null}
                    </section>
                </div>
            </div>

            {/* ── نوار پروژه و برند کیت — بالای چت (portal به سایدبار layout) ── */}
            {headerSlot ? createPortal(
                <ProjectBar
                    project={project}
                    projects={projects}
                    cutsCount={cuts.length}
                    totalSeconds={totalSeconds}
                    demoMode={demoMode}
                    busy={switching || loading}
                    onSelectProject={(projectId) => void handleSelectProject(projectId)}
                    onCreateProject={(title, aspect) => handleCreateProject(title, aspect)}
                    onDeleteProject={() => handleDeleteProject()}
                    onOpenTemplates={() => setTemplatesOpen(true)}
                    onOpenExport={() => setExportOpen(true)}
                />,
                headerSlot,
            ) : null}
            {topSlot ? createPortal(
                <BrandKitCard
                    brandKit={project?.brandKit}
                    disabled={!project}
                    onOpen={() => setBrandKitOpen(true)}
                />,
                topSlot,
            ) : null}

            {/* ── مودال‌ها ── */}
            <TemplateGalleryModal
                open={templatesOpen}
                onClose={() => setTemplatesOpen(false)}
                onUseTemplate={(template) => void handleUseTemplate(template)}
            />
            <ExportModal open={exportOpen} project={project} onClose={() => setExportOpen(false)} />
            {brandKitOpen && project && (
                <BrandKitModal
                    open={brandKitOpen}
                    project={project}
                    onClose={() => setBrandKitOpen(false)}
                    onSave={(brandKit) => void handleSaveBrandKit(brandKit)}
                />
            )}
        </div>
    );
}
