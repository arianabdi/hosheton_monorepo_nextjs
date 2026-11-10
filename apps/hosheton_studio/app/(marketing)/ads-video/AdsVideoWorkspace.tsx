'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    LuAudioLines,
    LuBeaker,
    LuClapperboard,
    LuFolderPlus,
    LuLayoutTemplate,
    LuList,
    LuLoaderCircle,
    LuMessageSquare,
    LuMousePointerClick,
    LuPalette,
    LuPlus,
    LuSave,
    LuSettings2,
    LuTrash2,
    LuVideo,
    LuWandSparkles,
} from 'react-icons/lu';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { canUseDeveloperTools } from '@/app/lib/user-roles';
import { ModalHelper } from '@my-workspace/components';
import { providersApi, type ProviderModelItem } from '@/app/(developers)/projects/lib/providers-api';
import { getApiErrorMessage } from '@/app/(developers)/projects/lib/api-client';
import { adsVideoApi, type AdsAutoJob, type AdsCutFull, type AdsCutListItem, type AdsProject } from './lib/ads-video-api';
import { DEMO_PROJECT_ASPECT, DEMO_PROJECT_TITLE, buildDemoCuts } from './lib/demo-project';
import { readCutElements, type AdsElementHandle } from './lib/cut-runtime';
import { inspectCutState } from './lib/cut-inspect';
import CutPlayer from './components/CutPlayer';
import AllCutsPlayer from './components/AllCutsPlayer';
import CutThumb from './components/CutThumb';
import ChatPanel, { type ChatEntry, type ChatSendPayload, type ChatStep } from '@/app/(marketing)/components/ads-chat/ChatPanel';
import ElementSettingsPanel from './components/ElementSettingsPanel';
import ItemsListPanel from './components/ItemsListPanel';
import AudioPanel from './components/AudioPanel';
import ClipSettingsPanel from './components/ClipSettingsPanel';
import TemplateGalleryModal from './components/TemplateGalleryModal';
import ExportModal from './components/ExportModal';
import BrandKitModal from './components/BrandKitModal';
import styles from './AdsVideo.module.scss';

type SidebarTab = 'chat' | 'elements' | 'items' | 'audio' | 'settings';
type StageMode = 'single' | 'all';

/**
 * استودیو تولید ویدیوهای تبلیغاتی (ads-video) — فقط ادمین‌ها.
 * چیدمان: استوری‌بورد (پیش‌نمایش Fullsize کات‌ها) | صحنه‌ی پخش (تک‌کات یا پخش یکجا) |
 * sidebar تب‌دار (چتِ Cursor-مانند، تنظیمات المان‌های کات، تنظیمات کلیپ/پروژه).
 */
export default function AdsVideoWorkspace() {
    const { t } = useTranslation('adsVideo');
    const roles = useAppStore((state) => state.roles);
    const isAdmin = canUseDeveloperTools(roles);

    const [projects, setProjects] = useState<AdsProject[]>([]);
    const [project, setProject] = useState<AdsProject | null>(null);
    const [cuts, setCuts] = useState<AdsCutListItem[]>([]);
    const [loadingProject, setLoadingProject] = useState(true);

    const [selectedCutId, setSelectedCutId] = useState('');
    const [cutDetail, setCutDetail] = useState<AdsCutFull | null>(null);
    const [previewVersion, setPreviewVersion] = useState<number | null>(null);
    // HTML نسخه‌ی در حال پیش‌نمایش — نسخه‌های غیرفعلی به‌صورت on-demand لود می‌شوند
    const [previewHtml, setPreviewHtml] = useState('');
    const [versionLoading, setVersionLoading] = useState(false);
    const [busyCut, setBusyCut] = useState(false);

    const [newProjectOpen, setNewProjectOpen] = useState(false);
    const [newProjectTitle, setNewProjectTitle] = useState('');
    const [newProjectAspect, setNewProjectAspect] = useState('16:9');

    const [models, setModels] = useState<ProviderModelItem[]>([]);
    const [modelId, setModelId] = useState('');
    const [generating, setGenerating] = useState(false);

    // ── چت (سبک Cursor) ──
    const [chat, setChat] = useState<ChatEntry[]>([]);
    const chatSeqRef = useRef(0);
    const autoEntryIdRef = useRef<number | null>(null);

    // ── حالت اتوماتیک — یک پرامپت، کل ویدیو ──
    const [autoJob, setAutoJob] = useState<AdsAutoJob | null>(null);
    const autoPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    // آخرین وضعیت کات‌ها/مراحل برای intervalهای polling (جلوگیری از stale closure)
    const cutsRef = useRef<AdsCutListItem[]>([]);
    const syncAutoChatStepsRef = useRef<(job: AdsAutoJob) => void>(() => {});

    useEffect(() => {
        cutsRef.current = cuts;
    }, [cuts]);

    // selectCut با یک wrapper تازه در اختیار polling گذاشته می‌شود (تعریف پایین‌تر)
    const selectCutHolder = useRef<{ fn: (cutId: string) => Promise<void> }>({ fn: async () => undefined });

    // ── تب‌های sidebar و صحنه ──
    const [sidebarTab, setSidebarTab] = useState<SidebarTab>('chat');
    const [stageMode, setStageMode] = useState<StageMode>('all');
    // استوری‌بورد باز/بسته — برای بزرگ‌تر شدن ادیتور
    const [storyboardOpen, setStoryboardOpen] = useState(true);

    const [codeDraft, setCodeDraft] = useState('');
    const [editPrompt, setEditPrompt] = useState('');

    // زمان زنده‌ی پلیر (برای پنل صدا) + پرش پلیر + المان کلیک‌شده در preview
    const [playerTime, setPlayerTime] = useState(0);
    const seekRef = useRef<((t: number) => void) | null>(null);
    const [focusElementId, setFocusElementId] = useState<string | null>(null);

    const [templatesOpen, setTemplatesOpen] = useState(false);
    const [exportOpen, setExportOpen] = useState(false);
    const [brandKitOpen, setBrandKitOpen] = useState(false);
    const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
    const [templateName, setTemplateName] = useState('');
    const [templateDesc, setTemplateDesc] = useState('');

    // ویرایش سریع المان‌ها — شناسه‌ی entry چک‌لیستی که در حال اعمال است
    const [applyingPlanId, setApplyingPlanId] = useState<number | null>(null);

    // iframe فعال برای خواندن المان‌ها
    const activeFrameRef = useRef<HTMLIFrameElement | null>(null);
    const [elementReadKey, setElementReadKey] = useState('');
    // هر تغییر درجای المان (drag/متن در preview) این شمارنده را بالا می‌برد تا
    // پنل‌های المان/آیتم‌ها بدون reload پلیر دوباره بخوانند
    const [overridesVersion, setOverridesVersion] = useState(0);

    // ── کمکی‌های چت ──
    const pushChat = useCallback((entry: Omit<ChatEntry, 'id'>) => {
        chatSeqRef.current += 1;
        const id = chatSeqRef.current;
        setChat((prev) => [...prev, { ...entry, id }]);
        return id;
    }, []);

    const patchEntry = useCallback((id: number, patch: Partial<ChatEntry>) => {
        setChat((prev) => prev.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)));
    }, []);

    const patchStep = useCallback((entryId: number, stepId: string, patch: Partial<ChatStep>) => {
        setChat((prev) => prev.map((entry) => {
            if (entry.id !== entryId) return entry;
            return {
                ...entry,
                steps: (entry.steps || []).map((step) => (step.id === stepId ? { ...step, ...patch } : step)),
            };
        }));
    }, []);

    const appendSystemLog = useCallback((text: string) => {
        chatSeqRef.current += 1;
        const id = chatSeqRef.current;
        setChat((prev) => [...prev.slice(-80), { id, role: 'system', text }]);
    }, []);

    /** ویرایش پیام کاربر — چت تا قبل از همان entry بریده می‌شود تا از همان نقطه ادامه بدهیم */
    const editChatEntry = useCallback((entryId: number) => {
        setChat((prev) => {
            const index = prev.findIndex((entry) => entry.id === entryId);
            if (index < 0) return prev;
            return prev.slice(0, index);
        });
    }, []);

    // ── بارگذاری مدل‌های متنی (همان مدل‌هایی که در چت لود می‌شوند — کلاس text) ──
    useEffect(() => {
        if (!isAdmin) return;
        let cancelled = false;
        (async () => {
            try {
                const res = await providersApi.listModels({ class: 'text' });
                if (cancelled) return;
                setModels(res.models || []);
                if (res.models?.length) setModelId((prev) => prev || res.models[0]._id);
            } catch {
                if (!cancelled) setModels([]);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [isAdmin]);

    const loadProjects = useCallback(async () => {
        setLoadingProject(true);
        try {
            const res = await adsVideoApi.listProjects();
            setProjects(res.projects || []);
            return res.projects || [];
        } catch (error) {
            appendSystemLog(`✕ ${getApiErrorMessage(error, t('err_load_projects'))}`);
            return [];
        } finally {
            setLoadingProject(false);
        }
    }, [appendSystemLog, t]);

    const refreshProject = useCallback(async (projectId: string, keepSelection = true, silent = false) => {
        try {
            const res = await adsVideoApi.getProject(projectId);
            setProject(res.project);
            setCuts(res.cuts || []);
            if (!keepSelection) setSelectedCutId('');
            return res;
        } catch (error) {
            if (!silent) appendSystemLog(`✕ ${getApiErrorMessage(error, t('err_load_project'))}`);
            return null;
        }
    }, [appendSystemLog, t]);

    // ── حالت اتوماتیک: polling وضعیت job تا تکمیل؛ مراحل در چت زنده به‌روز می‌شوند ──
    const stopAutoPolling = useCallback(() => {
        if (autoPollRef.current) {
            clearInterval(autoPollRef.current);
            autoPollRef.current = null;
        }
    }, []);

    useEffect(() => () => stopAutoPolling(), [stopAutoPolling]);

    // ── انتخاب کات (قبل از polling تعریف می‌شود تا polling بدون ref به آن برسد) ──
    const loadCutDetail = useCallback(async (cutId: string) => {
        try {
            const res = await adsVideoApi.getCut(cutId);
            setCutDetail(res.cut);
            setPreviewVersion(res.cut.currentVersion);
            // فقط HTML نسخه‌ی فعلی در payload هست — بقیه‌ی نسخه‌ها on-demand لود می‌شوند
            setPreviewHtml(res.cut.html || '');
            setCodeDraft(res.cut.html || '');
            setElementReadKey(`${res.cut._id}-v${res.cut.currentVersion}`);
            return res.cut;
        } catch (error) {
            appendSystemLog(`✕ ${getApiErrorMessage(error, t('err_load_cut'))}`);
            return null;
        }
    }, [appendSystemLog, t]);

    /**
     * جابه‌جایی بین نسخه‌های کات — HTML نسخه‌ی فعلی همان لحظه در دسترس است و
     * نسخه‌های دیگر با یک درخواست سبک on-demand خوانده می‌شوند (نسخه‌ها در
     * fetch کات فقط متادیتا هستند تا performance قربانی نشود).
     */
    const switchPreviewVersion = useCallback(async (cut: AdsCutFull, version: number) => {
        if (versionLoading || version === previewVersion) return;
        setPreviewVersion(version);
        if (version === cut.currentVersion) {
            setPreviewHtml(cut.html || '');
            return;
        }
        setVersionLoading(true);
        try {
            const res = await adsVideoApi.getVersionHtml(cut._id, version);
            setPreviewHtml(res.html || '');
        } catch (error) {
            appendSystemLog(`✕ ${getApiErrorMessage(error, t('err_load_version', { defaultValue: 'بارگذاری نسخه ناموفق بود.' }))}`);
            setPreviewVersion(cut.currentVersion);
            setPreviewHtml(cut.html || '');
        } finally {
            setVersionLoading(false);
        }
    }, [appendSystemLog, previewVersion, t, versionLoading]);

    const selectCut = useCallback(async (cutId: string) => {
        setSelectedCutId(cutId);
        setStageMode('single');
        setEditPrompt('');
        await loadCutDetail(cutId);
    }, [loadCutDetail]);

    // آخرین نسخه‌ی selectCut در اختیار intervalهای polling
    useEffect(() => {
        selectCutHolder.current.fn = (cutId: string) => selectCut(cutId);
    });

    /** به‌روزرسانی زنده‌ی مراحل چت بر اساس وضعیت job اتوماتیک */
    const syncAutoChatSteps = (job: AdsAutoJob) => {
        const entryId = autoEntryIdRef.current;
        if (entryId == null) return;
        const latestCuts = cutsRef.current;
        setChat((prev) => prev.map((entry) => {
            if (entry.id !== entryId) return entry;
            const steps = [...(entry.steps || [])];
            // مرحله‌ی پلن
            const planIndex = steps.findIndex((step) => step.id === 'plan');
            if (planIndex >= 0 && job.totalCuts > 0) {
                steps[planIndex] = {
                    ...steps[planIndex],
                    status: 'done',
                    detail: t('auto_plan_detail', { n: job.totalCuts }),
                };
            }
            // مراحل کات‌ها — بر اساس generatedCuts (ساخت خودکار یا bulk-edit)
            for (let index = 0; index < job.totalCuts; index++) {
                const cutId = job.cutIds?.[index];
                // برای bulk-edit مراحل از قبل با شناسه کات ساخته شده‌اند
                const stepId = cutId && steps.some((step) => step.id === `bulk-${cutId}`)
                    ? `bulk-${cutId}`
                    : `cut-${index}`;
                const title = latestCuts.find((cut) => cut._id === job.cutIds?.[index])?.title
                    || t('auto_cut_step', { n: index + 1 });
                let status: ChatStep['status'] = 'pending';
                if (index < job.generatedCuts) status = 'done';
                else if (index === job.generatedCuts && job.status === 'generating') status = 'running';
                if (job.errors[index]) status = 'error';
                const step: ChatStep = {
                    id: stepId,
                    label: job.errors[index] ? `${title} — ${job.errors[index].slice(0, 80)}` : title,
                    status,
                };
                const existing = steps.findIndex((item) => item.id === stepId);
                if (existing >= 0) steps[existing] = step;
                else steps.push(step);
            }
            return { ...entry, steps };
        }));
    };

    // همیشه آخرین نسخه در دسترس interval بماند
    useEffect(() => {
        syncAutoChatStepsRef.current = syncAutoChatSteps;
    });

    const startAutoPolling = useCallback((projectId: string, jobId: string) => {
        stopAutoPolling();
        autoPollRef.current = setInterval(() => {
            void (async () => {
                try {
                    const [jobsRes] = await Promise.all([
                        adsVideoApi.listAutoJobs(projectId),
                        refreshProject(projectId, true, true),
                    ]);
                    const job = (jobsRes.jobs || []).find((item) => item.jobId === jobId);
                    if (!job) {
                        stopAutoPolling();
                        setAutoJob(null);
                        return;
                    }
                    setAutoJob(job);
                    syncAutoChatStepsRef.current(job);
                    if (job.status === 'completed' || job.status === 'failed') {
                        stopAutoPolling();
                        setAutoJob(null);
                        const entryId = autoEntryIdRef.current;
                        if (job.status === 'completed') {
                            const partial = job.errors.length
                                ? t('log_auto_partial', { done: job.generatedCuts, total: job.totalCuts, failed: job.errors.length })
                                : t('log_auto_done', { done: job.generatedCuts, total: job.totalCuts });
                            if (entryId != null) {
                                patchEntry(entryId, {
                                    text: partial,
                                    cutRefs: (job.cutIds || []).map((cutId) => ({
                                        cutId,
                                        title: cutsRef.current.find((cut) => cut._id === cutId)?.title || t('cut_generic'),
                                    })),
                                });
                            }
                            if (job.cutIds?.length) await selectCutHolder.current.fn(job.cutIds[0]);
                        } else if (entryId != null) {
                            patchEntry(entryId, { error: t('log_auto_failed', { error: job.error || '' }) });
                        }
                        autoEntryIdRef.current = null;
                    }
                } catch {
                    /* خطای polling نادیده گرفته می‌شود */
                }
            })();
        }, 4000);
    }, [patchEntry, refreshProject, stopAutoPolling, t]);

    const resumeAutoIfNeeded = useCallback(async (projectId: string) => {
        if (autoPollRef.current) return;
        try {
            const res = await adsVideoApi.listAutoJobs(projectId);
            const active = (res.jobs || []).find((job) => job.status === 'planning' || job.status === 'generating');
            if (active) {
                setAutoJob(active);
                autoEntryIdRef.current = pushChat({
                    role: 'assistant',
                    text: t('chat_auto_running'),
                    steps: [{ id: 'plan', label: t('chat_step_plan'), status: 'running' }],
                });
                startAutoPolling(projectId, active.jobId);
            }
        } catch {
            /* ignore */
        }
    }, [pushChat, startAutoPolling, t]);

    useEffect(() => {
        if (!isAdmin) return;
        (async () => {
            const list = await loadProjects();
            if (list.length) {
                await refreshProject(list[0]._id, false);
                // اگر اجرای اتوماتیک در جریان است (مثلاً بعد از رفرش صفحه) ادامه بده
                await resumeAutoIfNeeded(list[0]._id);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAdmin]);

    // ── پروژه‌ها ──
    const createProject = async () => {
        const title = newProjectTitle.trim();
        if (!title) return;
        try {
            const res = await adsVideoApi.createProject({ title, aspectRatio: newProjectAspect });
            setNewProjectOpen(false);
            setNewProjectTitle('');
            await loadProjects();
            await refreshProject(res.project._id, false);
        } catch (error) {
            appendSystemLog(`✕ ${getApiErrorMessage(error, t('err_create_project'))}`);
        }
    };

    const deleteProject = async () => {
        if (!project) return;
        if (!window.confirm(t('confirm_delete_project', { title: project.title }))) return;
        try {
            await adsVideoApi.deleteProject(project._id);
            setProject(null);
            setCuts([]);
            setCutDetail(null);
            setSelectedCutId('');
            setStageMode('all');
            const list = await loadProjects();
            if (list.length) await refreshProject(list[0]._id, false);
        } catch (error) {
            appendSystemLog(`✕ ${getApiErrorMessage(error, t('err_delete_project'))}`);
        }
    };

    // ── ارسال چت → تولید ──
    const runChatSend = async (payload: ChatSendPayload) => {
        if (!project) return;
        // پیکربندی لحظه‌ی ارسال روی خود پیام ذخیره می‌شود تا «ویرایش پیام» بتواند
        // چت را به همین نقطه برگرداند و کامپوزر را دقیقاً از همین حالت پر کند
        pushChat({
            role: 'user',
            text: payload.prompt,
            attachments: payload.attachments,
            sentPayload: payload,
        });

        if (payload.mode === 'auto') {
            await startAutoFromChat(payload);
            return;
        }

        // ویرایش سریع المان‌ها — بدون بازتولید HTML، فقط تغییر مقدار المان‌ها
        if (payload.mode === 'elements') {
            await runElementPatchFromChat(payload);
            return;
        }

        // ویرایشِ همه‌ی کات‌ها با یک دستور (بک‌گراند، فونت، رنگ، صدا و…)
        if (payload.mode === 'edit' && payload.scope === 'all') {
            await startBulkEditFromChat(payload);
            return;
        }

        const editTargetTitle = cutsRef.current.find((cut) => cut._id === selectedCutId)?.title || '';
        const steps: ChatStep[] = [{
            id: 'generate',
            label: payload.mode === 'new'
                ? (payload.durationSeconds > 0
                    ? t('chat_step_generate_new', { seconds: payload.durationSeconds })
                    : t('chat_step_generate_auto', { defaultValue: 'تولید موشن‌گرافیک با طول خودکار' }))
                : t('chat_step_generate_edit', { title: editTargetTitle }),
            status: 'running',
        }];
        if (payload.withSound) {
            steps.push({ id: 'sound', label: t('chat_step_sound'), status: 'running' });
        }
        const entryId = pushChat({ role: 'assistant', steps });

        setGenerating(true);
        try {
            if (payload.mode === 'new') {
                const res = await adsVideoApi.createCut(project._id, {
                    prompt: payload.prompt,
                    modelId: payload.modelId || undefined,
                    attachments: payload.attachments.length ? payload.attachments : undefined,
                    durationSeconds: payload.durationSeconds,
                    withSound: payload.withSound || undefined,
                });
                patchStep(entryId, 'generate', { status: 'done', detail: `v${res.cut.currentVersion}` });
                if (payload.withSound) {
                    patchStep(entryId, 'sound', {
                        status: res.cut.soundEffects?.length ? 'done' : 'error',
                        detail: res.cut.soundEffects?.length
                            ? t('chat_step_sound_done', { n: res.cut.soundEffects.length })
                            : t('chat_step_sound_failed'),
                    });
                }
                await refreshProject(project._id);
                await selectCut(res.cut._id);
                patchEntry(entryId, {
                    cutRefs: [{ cutId: res.cut._id, title: res.cut.title }],
                });
            } else if (selectedCutId) {
                // اسنپ‌شات زنده‌ی المان‌ها/موشن‌ها — مدل قبل از ویرایش تمام جزئیات
                // کات (مقدار، هندسه، حرکت در طول تایم‌لاین) را می‌بیند
                const elementStates = inspectCutState(activeFrameRef.current, playerTime);
                const res = await adsVideoApi.generateCut(selectedCutId, {
                    prompt: payload.prompt,
                    modelId: payload.modelId || undefined,
                    attachments: payload.attachments.length ? payload.attachments : undefined,
                    durationSeconds: payload.durationSeconds,
                    elementStates: elementStates.length ? elementStates : undefined,
                    withSound: payload.withSound || undefined,
                });
                patchStep(entryId, 'generate', { status: 'done', detail: `v${res.cut.currentVersion}` });
                if (payload.withSound) {
                    patchStep(entryId, 'sound', {
                        status: res.cut.soundEffects?.length ? 'done' : 'error',
                        detail: res.cut.soundEffects?.length
                            ? t('chat_step_sound_done', { n: res.cut.soundEffects.length })
                            : t('chat_step_sound_failed'),
                    });
                }
                await refreshProject(project._id);
                setCutDetail(res.cut);
                setPreviewVersion(res.cut.currentVersion);
                setPreviewHtml(res.cut.html || '');
                setCodeDraft(res.cut.html || '');
                setElementReadKey(`${res.cut._id}-v${res.cut.currentVersion}`);
            }
        } catch (error) {
            patchStep(entryId, 'generate', { status: 'error' });
            patchStep(entryId, 'sound', { status: 'pending', detail: '' });
            patchEntry(entryId, { error: getApiErrorMessage(error, t('err_generate')) });
        } finally {
            setGenerating(false);
        }
    };

    /** ویرایش همه‌ی کات‌ها با یک دستور — مثلاً «بک‌گراند همه کات‌ها آبی شود» */
    const startBulkEditFromChat = async (payload: ChatSendPayload) => {
        if (!project) return;
        const targets = cutsRef.current.filter((cut) => cut.currentVersion > 0);
        if (!targets.length) {
            pushChat({ role: 'assistant', error: t('err_bulk_no_cuts') });
            return;
        }
        setGenerating(true);
        const entryId = pushChat({
            role: 'assistant',
            text: t('chat_bulk_started', { prompt: payload.prompt }),
            steps: targets.map((cut) => ({ id: `bulk-${cut._id}`, label: cut.title, status: 'pending' as ChatStep['status'] })),
        });
        try {
            const res = await adsVideoApi.startBulkEdit(project._id, {
                prompt: payload.prompt,
                modelId: payload.modelId || undefined,
                withSound: payload.withSound || undefined,
            });
            setAutoJob(res.job);
            autoEntryIdRef.current = entryId;
            startAutoPolling(project._id, res.job.jobId);
            setGenerating(false);
        } catch (error) {
            patchEntry(entryId, { error: getApiErrorMessage(error, t('err_bulk')) });
            setGenerating(false);
        }
    };

    // ── ویرایش سریع المان‌ها (بدون بازتولید HTML — الگوی JSON Patch) ──

    /** مقدار فعلی یک المان با احتساب overrides ذخیره‌شده */
    const resolveElementValue = (handle: AdsElementHandle, overrides: Record<string, unknown>): unknown => {
        const override = overrides[handle.id];
        if (override && typeof override === 'object' && 'value' in (override as Record<string, unknown>)) {
            return (override as { value?: unknown }).value ?? handle.value;
        }
        if (override !== undefined) return override;
        return handle.value;
    };

    /** درخواست تغییرهای پیشنهادی AI روی المان‌های کات — خروجی چک‌لیست می‌شود */
    const runElementPatchFromChat = async (payload: ChatSendPayload) => {
        if (!project || !cutDetail) return;
        const handles = getElements();
        if (!handles.length) {
            pushChat({ role: 'assistant', error: t('err_elements_not_loaded', { defaultValue: 'المان‌های کات هنوز بارگذاری نشده‌اند — کات را در حالت تک‌نمایش باز کن.' }) });
            return;
        }
        const currentOverrides = (cutDetail.elementOverrides || {}) as Record<string, unknown>;
        // اسنپ‌شات زنده‌ی هندسه/موشن هر المان — تا مدل بداند کاربر به کدام المان
        // (مثلاً «تیتر بالا» یا «دایره‌ای که می‌چرخد») اشاره می‌کند
        const states = inspectCutState(activeFrameRef.current, playerTime);
        const stateById = new Map(states.map((state) => [state.id, state]));
        const elements = handles.map((handle) => {
            const state = stateById.get(handle.id);
            return {
                id: handle.id,
                label: handle.label,
                type: handle.type,
                value: resolveElementValue(handle, currentOverrides),
                box: state?.box,
                text: state?.text,
                css: state?.css,
                samples: state?.samples,
                keyframes: state?.keyframes,
            };
        });
        const entryId = pushChat({
            role: 'assistant',
            steps: [{ id: 'plan', label: t('chat_step_plan_elements', { defaultValue: 'بررسی المان‌ها با AI' }), status: 'running' }],
        });
        setGenerating(true);
        try {
            const plan = await adsVideoApi.patchCutElements(cutDetail._id, {
                prompt: payload.prompt,
                modelId: payload.modelId || undefined,
                elements,
            });
            if (!plan.changes?.length) {
                patchStep(entryId, 'plan', { status: 'done' });
                patchEntry(entryId, { text: plan.summary || t('chat_no_changes', { defaultValue: 'تغییری برای این درخواست پیشنهاد نشد.' }) });
            } else {
                patchStep(entryId, 'plan', {
                    status: 'done',
                    detail: t('chat_plan_elements_detail', { n: plan.changes.length, defaultValue: '{{n}} تغییر پیشنهاد شد' }),
                });
                patchEntry(entryId, {
                    elementPlan: {
                        cutId: cutDetail._id,
                        cutTitle: cutDetail.title,
                        summary: plan.summary || '',
                        changes: plan.changes
                            .filter((change) => elements.some((el) => el.id === change.id))
                            .map((change) => {
                                const element = elements.find((el) => el.id === change.id)!;
                                return {
                                    id: change.id,
                                    label: element.label || change.id,
                                    type: element.type || 'text',
                                    value: change.value,
                                    current: element.value,
                                };
                            }),
                        selectedIds: plan.changes.map((change) => change.id),
                        status: 'pending',
                        previousOverrides: currentOverrides,
                    },
                });
            }
        } catch (error) {
            patchStep(entryId, 'plan', { status: 'error' });
            patchEntry(entryId, { error: getApiErrorMessage(error, t('err_quick_edit', { defaultValue: 'ویرایش سریع ناموفق بود.' })) });
        } finally {
            setGenerating(false);
        }
    };

    /** تیک‌زدن/برداشتن آیتم‌های چک‌لیست تغییرها */
    const toggleElementPlan = useCallback((entryId: number, selectedIds: string[]) => {
        setChat((prev) => prev.map((entry) => {
            if (entry.id !== entryId || !entry.elementPlan || entry.elementPlan.status !== 'pending') return entry;
            return { ...entry, elementPlan: { ...entry.elementPlan, selectedIds } };
        }));
    }, []);

    /** اعمال آیتم‌های تیک‌خورده: اجرای زنده روی preview + ذخیره‌ی elementOverrides */
    const confirmElementPlan = async (entryId: number, selectedIds: string[]) => {
        const entry = chat.find((item) => item.id === entryId);
        const plan = entry?.elementPlan;
        if (!plan || plan.status !== 'pending' || applyingPlanId != null || !selectedIds.length) return;
        setApplyingPlanId(entryId);
        try {
            // همیشه از state تازه‌ی سرور مبنای merge را می‌گیریم تا overrideهای دیگری که
            // شاید تغییر کرده باشند از بین نروند.
            const fresh = await adsVideoApi.getCut(plan.cutId);
            const base = (fresh.cut.elementOverrides || {}) as Record<string, unknown>;
            const next: Record<string, unknown> = { ...base };
            const handles = plan.cutId === cutDetail?._id ? getElements() : [];
            for (const change of plan.changes) {
                if (!selectedIds.includes(change.id)) continue;
                const handle = handles.find((item) => item.id === change.id);
                handle?.apply(change.value);
                next[change.id] = change.value;
            }
            const res = await adsVideoApi.updateCut(plan.cutId, { elementOverrides: next });
            if (plan.cutId === cutDetail?._id) {
                setCutDetail((prev) => (prev && prev._id === plan.cutId ? { ...prev, elementOverrides: res.cut.elementOverrides ?? next } : prev));
            }
            patchEntry(entryId, { elementPlan: { ...plan, selectedIds, status: 'applied' } });
            appendSystemLog(`✓ ${t('log_quick_applied', { n: selectedIds.length, defaultValue: '{{n}} تغییر سریع روی کات اعمال شد.' })}`);
            if (project) await refreshProject(project._id, true, true);
        } catch (error) {
            patchEntry(entryId, { elementPlan: { ...plan, status: 'failed', error: getApiErrorMessage(error, t('err_quick_apply', { defaultValue: 'اعمال تغییرها ناموفق بود.' })) } });
        } finally {
            setApplyingPlanId(null);
        }
    };

    /** بازگردانی مقادیر قبل از اعمال چک‌لیست */
    const revertElementPlan = async (entryId: number) => {
        const entry = chat.find((item) => item.id === entryId);
        const plan = entry?.elementPlan;
        if (!plan || plan.status !== 'applied' || applyingPlanId != null) return;
        setApplyingPlanId(entryId);
        try {
            const previous = plan.previousOverrides ?? {};
            const res = await adsVideoApi.updateCut(plan.cutId, { elementOverrides: previous });
            if (plan.cutId === cutDetail?._id) {
                setCutDetail((prev) => (prev && prev._id === plan.cutId ? { ...prev, elementOverrides: res.cut.elementOverrides ?? previous } : prev));
                // پلیر با overrideهای بازگشتی از نو بارگذاری شود
                setElementReadKey(`${plan.cutId}-revert-${Date.now()}`);
            }
            patchEntry(entryId, { elementPlan: { ...plan, status: 'reverted' } });
            appendSystemLog(`✓ ${t('log_quick_reverted', { defaultValue: 'مقادیر قبلی کات بازگردانی شد.' })}`);
            if (project) await refreshProject(project._id, true, true);
        } catch (error) {
            patchEntry(entryId, { error: getApiErrorMessage(error, t('err_quick_revert', { defaultValue: 'بازگردانی ناموفق بود.' })) });
        } finally {
            setApplyingPlanId(null);
        }
    };

    /** ساخت خودکار کل ویدیو از چت — مراحل به‌صورت زنده در چت دیده می‌شود */
    const startAutoFromChat = async (payload: ChatSendPayload) => {
        if (!project) return;
        setGenerating(true);
        const entryId = pushChat({
            role: 'assistant',
            steps: [{ id: 'plan', label: t('chat_step_plan'), status: 'running' }],
        });
        autoEntryIdRef.current = entryId;
        try {
            const res = await adsVideoApi.startAutoVideo(project._id, {
                prompt: payload.prompt,
                modelId: payload.modelId || undefined,
                attachments: payload.attachments.length ? payload.attachments : undefined,
                cutsCount: payload.cutsCount || undefined,
                withSound: payload.withSound || undefined,
            });
            setAutoJob(res.job);
            startAutoPolling(project._id, res.job.jobId);
        } catch (error) {
            patchStep(entryId, 'plan', { status: 'error' });
            patchEntry(entryId, { error: getApiErrorMessage(error, t('err_auto_start')) });
            autoEntryIdRef.current = null;
        } finally {
            setGenerating(false);
        }
    };

    // ── نسخه‌ها ──
    const activatePreviewedVersion = async () => {
        if (!cutDetail || previewVersion == null || previewVersion === cutDetail.currentVersion) return;
        setBusyCut(true);
        try {
            const res = await adsVideoApi.activateVersion(cutDetail._id, previewVersion);
            setCutDetail(res.cut);
            setPreviewHtml(res.cut.html || '');
            setCodeDraft(res.cut.html || '');
            setElementReadKey(`${res.cut._id}-v${res.cut.currentVersion}`);
            appendSystemLog(`✓ ${t('log_version_activated', { version: previewVersion })}`);
            if (project) await refreshProject(project._id);
        } catch (error) {
            appendSystemLog(`✕ ${getApiErrorMessage(error, t('err_version'))}`);
        } finally {
            setBusyCut(false);
        }
    };

    const saveCodeVersion = async () => {
        if (!cutDetail || !codeDraft.trim()) return;
        setBusyCut(true);
        try {
            const res = await adsVideoApi.saveCutVersion(cutDetail._id, { html: codeDraft });
            setCutDetail(res.cut);
            setPreviewVersion(res.cut.currentVersion);
            setPreviewHtml(res.cut.html || '');
            setElementReadKey(`${res.cut._id}-v${res.cut.currentVersion}`);
            appendSystemLog(`✓ ${t('log_version_saved', { version: res.cut.currentVersion })}`);
            if (project) await refreshProject(project._id);
        } catch (error) {
            appendSystemLog(`✕ ${getApiErrorMessage(error, t('err_save_code'))}`);
        } finally {
            setBusyCut(false);
        }
    };

    /** ویرایش AI از تب تنظیمات */
    const applyAiEditFromSettings = async () => {
        if (!cutDetail || !project || !editPrompt.trim()) return;
        const entryId = pushChat({ role: 'assistant', steps: [{ id: 'generate', label: t('chat_step_generate_edit', { title: cutDetail.title }), status: 'running' }] });
        setGenerating(true);
        try {
            appendSystemLog(`› ${t('log_edit_cut', { prompt: editPrompt.trim() })}`);
            const res = await adsVideoApi.generateCut(cutDetail._id, {
                prompt: editPrompt.trim(),
                modelId: modelId || undefined,
            });
            patchStep(entryId, 'generate', { status: 'done', detail: `v${res.cut.currentVersion}` });
            setEditPrompt('');
            await refreshProject(project._id);
            setCutDetail(res.cut);
            setPreviewVersion(res.cut.currentVersion);
            setPreviewHtml(res.cut.html || '');
            setCodeDraft(res.cut.html || '');
            setElementReadKey(`${res.cut._id}-v${res.cut.currentVersion}`);
        } catch (error) {
            patchStep(entryId, 'generate', { status: 'error' });
            patchEntry(entryId, { error: getApiErrorMessage(error, t('err_ai_edit')) });
        } finally {
            setGenerating(false);
        }
    };

    // ── قالب‌کات ──
    const saveAsTemplate = async () => {
        if (!cutDetail || !templateName.trim()) return;
        setBusyCut(true);
        try {
            await adsVideoApi.createTemplate(cutDetail._id, {
                name: templateName.trim(),
                description: templateDesc.trim() || undefined,
            });
            appendSystemLog(`✓ ${t('log_template_saved', { name: templateName.trim() })}`);
            setSaveTemplateOpen(false);
            setTemplateName('');
            setTemplateDesc('');
        } catch (error) {
            appendSystemLog(`✕ ${getApiErrorMessage(error, t('err_save_template'))}`);
        } finally {
            setBusyCut(false);
        }
    };

    const applyTemplate = async (template: { _id: string; name: string }) => {
        if (!project) return;
        try {
            const res = await adsVideoApi.createCut(project._id, { templateId: template._id });
            setTemplatesOpen(false);
            appendSystemLog(`✓ ${t('log_template_used', { name: template.name })}`);
            await refreshProject(project._id);
            await selectCut(res.cut._id);
        } catch (error) {
            appendSystemLog(`✕ ${getApiErrorMessage(error, t('err_use_template'))}`);
        }
    };

    /** ساخت پروژه‌ی نمونه با ۵ کات آماده — بدون هزینه‌ی LLM، برای آزمایش همه‌ی قابلیت‌ها */
    const createDemoProject = async () => {
        if (!window.confirm(t('demo_confirm'))) return;
        setGenerating(true);
        const demoCuts = buildDemoCuts();
        const entryId = pushChat({
            role: 'assistant',
            steps: [
                { id: 'demo-project', label: t('chat_step_demo_project'), status: 'running' },
                ...demoCuts.map((demoCut, index) => ({ id: `demo-${index}`, label: demoCut.title, status: 'pending' as ChatStep['status'] })),
            ],
        });
        try {
            const res = await adsVideoApi.createProject({ title: DEMO_PROJECT_TITLE, aspectRatio: DEMO_PROJECT_ASPECT });
            const projectId = res.project._id;
            patchStep(entryId, 'demo-project', { status: 'done' });
            let failCount = 0;
            for (let index = 0; index < demoCuts.length; index++) {
                const demoCut = demoCuts[index];
                patchStep(entryId, `demo-${index}`, { status: 'running' });
                try {
                    const created = await adsVideoApi.createCut(projectId, {
                        title: demoCut.title,
                        durationSeconds: demoCut.durationSeconds,
                    });
                    await adsVideoApi.saveCutVersion(created.cut._id, {
                        html: demoCut.html,
                        prompt: 'کات نمونه‌ی دمو',
                    });
                    patchStep(entryId, `demo-${index}`, { status: 'done' });
                } catch (error) {
                    failCount += 1;
                    patchStep(entryId, `demo-${index}`, {
                        status: 'error',
                        detail: getApiErrorMessage(error, t('err_demo_cut')),
                    });
                }
            }
            await loadProjects();
            await refreshProject(projectId, false);
            stopAutoPolling();
            setAutoJob(null);
            setSelectedCutId('');
            setCutDetail(null);
            setStageMode('all');
            patchEntry(entryId, {
                text: failCount ? t('chat_demo_partial', { failed: failCount }) : t('chat_demo_done'),
            });
            appendSystemLog(`✓ ${t('log_demo_created')}`);
        } catch (error) {
            patchStep(entryId, 'demo-project', { status: 'error' });
            patchEntry(entryId, { error: getApiErrorMessage(error, t('err_demo')) });
        } finally {
            setGenerating(false);
        }
    };

    // ── مدیریت کات‌ها ──
    const moveCut = async (cut: AdsCutListItem, direction: -1 | 1) => {
        if (!project) return;
        const index = cuts.findIndex((item) => item._id === cut._id);
        const neighbor = cuts[index + direction];
        if (index < 0 || !neighbor) return;
        try {
            await Promise.all([
                adsVideoApi.updateCut(cut._id, { order: neighbor.order }),
                adsVideoApi.updateCut(neighbor._id, { order: cut.order }),
            ]);
            await refreshProject(project._id);
        } catch (error) {
            appendSystemLog(`✕ ${getApiErrorMessage(error, t('err_move_cut'))}`);
        }
    };

    const deleteCut = async (cut: AdsCutListItem) => {
        if (!project) return;
        if (!window.confirm(t('confirm_delete_cut', { title: cut.title }))) return;
        try {
            await adsVideoApi.deleteCut(cut._id);
            if (selectedCutId === cut._id) {
                setSelectedCutId('');
                setCutDetail(null);
                setStageMode('all');
            }
            await refreshProject(project._id);
        } catch (error) {
            appendSystemLog(`✕ ${getApiErrorMessage(error, t('err_delete_cut'))}`);
        }
    };

    const duplicateCutItem = async (cut: AdsCutListItem) => {
        if (!project) return;
        try {
            const res = await adsVideoApi.duplicateCut(cut._id);
            appendSystemLog(`✓ ${t('log_cut_duplicated', { title: res.cut.title, defaultValue: 'کات «{{title}}» تکثیر شد.' })}`);
            await refreshProject(project._id);
        } catch (error) {
            appendSystemLog(`✕ ${getApiErrorMessage(error, t('err_duplicate_cut', { defaultValue: 'تکثیر کات ناموفق بود.' }))}`);
        }
    };

    const patchCutMeta = async (patch: { title?: string; durationSeconds?: number }) => {
        if (!cutDetail) return;
        try {
            const res = await adsVideoApi.updateCut(cutDetail._id, patch);
            setCutDetail((prev) => (prev ? { ...prev, ...res.cut } : prev));
            if (project) await refreshProject(project._id);
        } catch (error) {
            appendSystemLog(`✕ ${getApiErrorMessage(error, t('err_save_meta'))}`);
        }
    };

    const patchProject = async (patch: { title?: string; aspectRatio?: string; fps?: number; brandKit?: Record<string, unknown> | null }) => {
        if (!project) return;
        try {
            const res = await adsVideoApi.updateProject(project._id, patch);
            setProject((prev) => (prev ? { ...prev, ...res.project } : prev));
        } catch (error) {
            appendSystemLog(`✕ ${getApiErrorMessage(error, t('err_save_meta'))}`);
        }
    };

    const getElements = useCallback((): AdsElementHandle[] => readCutElements(activeFrameRef.current), []);

    // ── ویرایش درجای المان‌ها در preview (در حالت توقف) ──
    /** اعمال تغییر درجای یک المان (جابه‌جایی با drag یا متن با دابل‌کلیک) روی
     *  overrideهای کات + ذخیره‌ی خودکار — بدون reload پلیر */
    const applyInlineElementChange = useCallback(async (elementId: string, patch: { x?: number; y?: number; value?: unknown }) => {
        const cut = cutDetail;
        if (!cut) return;
        const current = { ...((cut.elementOverrides || {}) as Record<string, unknown>) };
        const existing = current[elementId];
        // override قبلی می‌تواند مقدار ساده باشد — برای افزودن x/y به object تبدیل می‌شود
        const base = existing && typeof existing === 'object'
            ? { ...(existing as Record<string, unknown>) }
            : (existing !== undefined ? { value: existing } : {});
        const nextOverrides = { ...current, [elementId]: { ...base, ...patch } };
        setCutDetail((prev) => (prev && prev._id === cut._id ? { ...prev, elementOverrides: nextOverrides } : prev));
        setOverridesVersion((v) => v + 1);
        try {
            await adsVideoApi.updateCut(cut._id, { elementOverrides: nextOverrides });
        } catch (error) {
            appendSystemLog(`✕ ${getApiErrorMessage(error, t('err_save_elements'))}`);
        }
    }, [appendSystemLog, cutDetail, t]);

    const handleElementMove = useCallback((elementId: string, x: number, y: number) => {
        void applyInlineElementChange(elementId, { x, y });
    }, [applyInlineElementChange]);

    const handleElementTextEdit = useCallback((elementId: string, value: string) => {
        void applyInlineElementChange(elementId, { value });
    }, [applyInlineElementChange]);

    /** کلیک روی آیتم در تب «آیتم‌ها» — هایلایت در preview + باز شدن ویرایشگرش در تب المان‌ها */
    const openElementInEditor = useCallback((elementId: string) => {
        setFocusElementId(elementId);
        setSidebarTab('elements');
    }, []);

    // key پایدار پخش یکجا — فقط با تغییر واقعی کات‌ها ریست شود، نه هر refresh
    const allCutsKey = useMemo(() => cuts.map((cut) => `${cut._id}v${cut.currentVersion}`).join('|'), [cuts]);

    if (!isAdmin) {
        return (
            <div className={styles.denied}>
                <LuClapperboard size={34} />
                <h2>{t('access_denied_title')}</h2>
                <p>{t('access_denied_body')}</p>
            </div>
        );
    }

    const selectedCutListItem = cuts.find((cut) => cut._id === selectedCutId) || null;
    const aspectRatio = project?.aspectRatio || '16:9';

    return (
        <div className={styles.root}>
            <header className={styles.toolbar}>
                <div className={styles.toolbarTitle}>
                    <LuClapperboard size={18} />
                    <strong>{t('title')}</strong>
                </div>

                <div className={styles.projectSwitch}>
                    <select
                        value={project?._id || ''}
                        onChange={(e) => {
                            stopAutoPolling();
                            setAutoJob(null);
                            setCutDetail(null);
                            setSelectedCutId('');
                            setStageMode('all');
                            const nextProjectId = e.target.value;
                            void (async () => {
                                await refreshProject(nextProjectId, false);
                                await resumeAutoIfNeeded(nextProjectId);
                            })();
                        }}
                        disabled={loadingProject || projects.length === 0}
                        aria-label={t('title')}
                    >
                        {projects.length === 0 && <option value="">{t('no_projects')}</option>}
                        {projects.map((item) => (
                            <option key={item._id} value={item._id}>
                                {item.title} ({t('cuts_count', { n: item.cutCount ?? 0 })})
                            </option>
                        ))}
                    </select>
                    <button type="button" className={styles.iconBtn} title={t('new_project')} aria-label={t('new_project')} onClick={() => setNewProjectOpen((v) => !v)}>
                        <LuFolderPlus size={15} />
                    </button>
                    {project && (
                        <button type="button" className={styles.iconBtn} title={t('delete_project')} aria-label={t('delete_project')} onClick={() => void deleteProject()}>
                            <LuTrash2 size={14} />
                        </button>
                    )}
                </div>

                {newProjectOpen && (
                    <div className={styles.newProjectForm}>
                        <input
                            autoFocus
                            value={newProjectTitle}
                            onChange={(e) => setNewProjectTitle(e.target.value)}
                            placeholder={t('project_name_placeholder')}
                            onKeyDown={(e) => e.key === 'Enter' && void createProject()}
                        />
                        <select value={newProjectAspect} onChange={(e) => setNewProjectAspect(e.target.value)} aria-label="aspect">
                            {['16:9', '9:16', '1:1'].map((option) => (
                                <option key={option} value={option}>{option}</option>
                            ))}
                        </select>
                        <button type="button" className={styles.primaryBtn} onClick={() => void createProject()}>
                            <LuPlus size={13} />
                            {t('create_project')}
                        </button>
                    </div>
                )}

                <div className={styles.toolbarSpacer} />
                <button
                    type="button"
                    className={styles.ghostBtn}
                    disabled={generating || Boolean(autoJob)}
                    title={t('demo_btn_title')}
                    onClick={() => void createDemoProject()}
                >
                    <LuBeaker size={14} />
                    {t('demo_btn')}
                </button>
                <button type="button" className={styles.ghostBtn} onClick={() => setTemplatesOpen(true)}>
                    <LuLayoutTemplate size={14} />
                    {t('templates_btn')}
                </button>
                <button
                    type="button"
                    className={styles.ghostBtn}
                    disabled={!project}
                    title={t('brand_kit_title', { defaultValue: 'برند کیت — پالت و فونت ثابت همه‌ی کات‌ها' })}
                    onClick={() => setBrandKitOpen(true)}
                >
                    <LuPalette size={14} />
                    {t('brand_kit_btn', { defaultValue: 'برند کیت' })}
                </button>
                <button type="button" className={styles.primaryBtn} disabled={!project} onClick={() => setExportOpen(true)}>
                    <LuVideo size={14} />
                    {t('export_btn')}
                </button>
            </header>

            {/* بنر پیشرفت ساخت خودکار */}
            {autoJob && (
                <div className={styles.autoBanner} role="status">
                    <LuLoaderCircle size={14} className={styles.spin} />
                    <strong>
                        {autoJob.status === 'planning'
                            ? t('auto_planning')
                            : t('auto_building', { current: Math.min(autoJob.generatedCuts + 1, autoJob.totalCuts), total: autoJob.totalCuts })}
                    </strong>
                    <span className={styles.autoProgress}>{autoJob.generatedCuts}/{autoJob.totalCuts}</span>
                    <div className={styles.autoProgressBar} aria-hidden>
                        <div
                            className={styles.autoProgressBarFill}
                            style={{ width: autoJob.totalCuts ? `${Math.round((autoJob.generatedCuts / autoJob.totalCuts) * 100)}%` : '10%' }}
                        />
                    </div>
                    {autoJob.errors.length > 0 && (
                        <em title={autoJob.errors.join('\n')}>{t('auto_failed_cuts', { n: autoJob.errors.length })}</em>
                    )}
                </div>
            )}

            {!project ? (
                <div className={styles.emptyState}>
                    {loadingProject ? (
                        <LuLoaderCircle size={26} className={styles.spin} />
                    ) : (
                        <>
                            <LuClapperboard size={34} />
                            <h2>{t('empty_title')}</h2>
                            <p>{t('empty_body')}</p>
                            <button type="button" className={styles.primaryBtn} onClick={() => setNewProjectOpen(true)}>
                                <LuFolderPlus size={14} />
                                {t('new_project')}
                            </button>
                        </>
                    )}
                </div>
            ) : (
                <div className={`${styles.columns} ${styles.columnsWork} ${storyboardOpen ? '' : styles.columnsNoBoard}`}>
                    {/* ── استوری‌بورد: پیش‌نمایش کات‌ها (قابل پنهان‌سازی) ── */}
                    <aside className={styles.storyboard}>
                        {storyboardOpen ? (
                            <>
                                <div className={styles.paneHead}>
                                    <span>{t('storyboard')}</span>
                                    <button
                                        type="button"
                                        className={styles.iconBtn}
                                        title={t('storyboard_hide')}
                                        aria-label={t('storyboard_hide')}
                                        onClick={() => setStoryboardOpen(false)}
                                    >
                                        ✕
                                    </button>
                                </div>
                                {cuts.length === 0 && (
                                    <div className={styles.paneEmpty}>{t('storyboard_empty')}</div>
                                )}
                                {cuts.map((cut, index) => (
                                    <div
                                        key={cut._id}
                                        className={`${styles.cutItem} ${cut._id === selectedCutId && stageMode === 'single' ? styles.cutItemActive : ''}`}
                                        onClick={() => void selectCut(cut._id)}
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(e) => e.key === 'Enter' && void selectCut(cut._id)}
                                    >
                                        <CutThumb
                                            html={cut.html}
                                            aspectRatio={aspectRatio}
                                            title={cut.title}
                                        />
                                        {/* نام کات همیشه دیده می‌شود */}
                                        <div className={styles.cutNameBar}>
                                            <strong>{index + 1}. {cut.title}</strong>
                                        </div>
                                        {/* بقیه‌ی مشخصات فقط با hover */}
                                        <div className={styles.cutHoverMeta}>
                                            <span>{t('cut_meta_line', {
                                                duration: cut.durationSeconds,
                                                version: cut.currentVersion,
                                                versions: cut.versionCount,
                                            })}</span>
                                            <span className={styles.cutBadges}>
                                                {cut.voiceover?.audioUrl && <em title={t('badge_voiceover')}>🎙</em>}
                                                {(cut.soundEffects?.length || 0) > 0 && <em title={t('badge_sfx')}>🎵</em>}
                                            </span>
                                            <div className={styles.cutActions}>
                                                <button
                                                    type="button"
                                                    title={t('cut_move_up')}
                                                    aria-label={t('cut_move_up')}
                                                    disabled={index === 0}
                                                    onClick={(e) => { e.stopPropagation(); void moveCut(cut, -1); }}
                                                >
                                                    ↑
                                                </button>
                                                <button
                                                    type="button"
                                                    title={t('cut_move_down')}
                                                    aria-label={t('cut_move_down')}
                                                    disabled={index === cuts.length - 1}
                                                    onClick={(e) => { e.stopPropagation(); void moveCut(cut, 1); }}
                                                >
                                                    ↓
                                                </button>
                                                <button
                                                    type="button"
                                                    title={t('cut_duplicate', { defaultValue: 'تکثیر کات' })}
                                                    aria-label={t('cut_duplicate', { defaultValue: 'تکثیر کات' })}
                                                    onClick={(e) => { e.stopPropagation(); void duplicateCutItem(cut); }}
                                                >
                                                    ⧉
                                                </button>
                                                <button
                                                    type="button"
                                                    title={t('delete')}
                                                    aria-label={t('delete')}
                                                    onClick={(e) => { e.stopPropagation(); void deleteCut(cut); }}
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </>
                        ) : (
                            <button
                                type="button"
                                className={styles.storyboardRail}
                                title={t('storyboard_show')}
                                aria-label={t('storyboard_show')}
                                onClick={() => setStoryboardOpen(true)}
                            >
                                <LuClapperboard size={15} />
                                <span>{cuts.length}</span>
                            </button>
                        )}
                    </aside>

                    {/* ── صحنه‌ی پخش ── */}
                    <main className={styles.stage}>
                        <div className={styles.stageHead}>
                            <div className={styles.stageModeSwitch} role="tablist" aria-label={t('stage_mode_label')}>
                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={stageMode === 'all'}
                                    className={stageMode === 'all' ? styles.modeActive : ''}
                                    onClick={() => setStageMode('all')}
                                >
                                    <LuVideo size={13} />
                                    {t('stage_mode_all')}
                                </button>
                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={stageMode === 'single'}
                                    className={stageMode === 'single' ? styles.modeActive : ''}
                                    disabled={!cutDetail}
                                    onClick={() => setStageMode('single')}
                                >
                                    <LuClapperboard size={13} />
                                    {t('stage_mode_single')}
                                </button>
                            </div>
                            {cutDetail && stageMode === 'single' && (
                                <span className={styles.stageCutTitle}>{cutDetail.title}</span>
                            )}
                            {cutDetail && (
                                <button
                                    type="button"
                                    className={styles.ghostBtn}
                                    onClick={() => setSidebarTab('elements')}
                                >
                                    <LuMousePointerClick size={13} />
                                    {t('edit_elements_btn')}
                                </button>
                            )}
                            {/* نوار نسخه‌ها — switch بین همه‌ی نسخه‌های ویرایش؛ HTML هر نسخه on-demand لود می‌شود */}
                            {cutDetail && stageMode === 'single' && (cutDetail.versions?.length || 0) > 0 && (
                                <div className={styles.versionNav}>
                                    <button
                                        type="button"
                                        className={styles.iconBtn}
                                        title={t('version_prev')}
                                        aria-label={t('version_prev')}
                                        disabled={(previewVersion ?? cutDetail.currentVersion) <= 1 || versionLoading}
                                        onClick={() => {
                                            const target = Math.max(1, (previewVersion ?? cutDetail.currentVersion) - 1);
                                            void switchPreviewVersion(cutDetail, target);
                                        }}
                                    >
                                        ›
                                    </button>
                                    <select
                                        value={previewVersion ?? cutDetail.currentVersion}
                                        disabled={versionLoading}
                                        aria-label={t('version_of', { current: previewVersion ?? cutDetail.currentVersion, total: cutDetail.versions.length })}
                                        onChange={(e) => void switchPreviewVersion(cutDetail, Number(e.target.value))}
                                    >
                                        {cutDetail.versions.map((version) => (
                                            <option key={version.version} value={version.version}>
                                                v{version.version}{version.version === cutDetail.currentVersion ? t('version_current') : ''} — {(version.prompt || '').slice(0, 40) || t('version_no_desc')}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        className={styles.iconBtn}
                                        title={t('version_next')}
                                        aria-label={t('version_next')}
                                        disabled={(previewVersion ?? cutDetail.currentVersion) >= (cutDetail.versions[cutDetail.versions.length - 1]?.version || 1) || versionLoading}
                                        onClick={() => {
                                            const maxVersion = cutDetail.versions[cutDetail.versions.length - 1]?.version || 1;
                                            const target = Math.min(maxVersion, (previewVersion ?? cutDetail.currentVersion) + 1);
                                            void switchPreviewVersion(cutDetail, target);
                                        }}
                                    >
                                        ‹
                                    </button>
                                    {previewVersion != null && previewVersion !== cutDetail.currentVersion && (
                                        <button
                                            type="button"
                                            className={styles.ghostBtn}
                                            disabled={busyCut || versionLoading}
                                            onClick={() => void activatePreviewedVersion()}
                                        >
                                            {versionLoading ? <LuLoaderCircle size={12} className={styles.spin} /> : null}
                                            {t('activate_version')}
                                        </button>
                                    )}
                                    {previewVersion != null && previewVersion !== cutDetail.currentVersion && (
                                        <em className={styles.versionPreviewNote}>{t('version_preview_note')}</em>
                                    )}
                                </div>
                            )}
                        </div>

                        {stageMode === 'all' ? (
                            <AllCutsPlayer
                                key={allCutsKey}
                                cuts={cuts}
                                aspectRatio={aspectRatio}
                            />
                        ) : cutDetail ? (
                            <CutPlayer
                                html={previewHtml}
                                durationSeconds={cutDetail.durationSeconds}
                                aspectRatio={aspectRatio}
                                title={cutDetail.title}
                                reloadKey={`${cutDetail._id}-${previewVersion}-${elementReadKey}`}
                                // تنظیمات دستی المان‌ها مال نسخه‌ی فعلی‌اند — در پیش‌نمایش نسخه‌های قدیمی اعمال نمی‌شوند
                                overrides={
                                    previewVersion == null || previewVersion === cutDetail.currentVersion
                                        ? ((cutDetail.elementOverrides || null) as Record<string, unknown> | null)
                                        : null
                                }
                                audio={{
                                    voiceoverUrl: cutDetail.voiceover?.audioUrl || undefined,
                                    sfx: cutDetail.soundEffects || [],
                                }}
                                onFrameReady={(frame) => { activeFrameRef.current = frame; }}
                                onTimeUpdate={(time) => setPlayerTime(time)}
                                registerSeek={(fn) => { seekRef.current = fn; }}
                                onElementClick={(elementId) => {
                                    setFocusElementId(elementId);
                                    setSidebarTab('elements');
                                }}
                                onElementMove={handleElementMove}
                                onElementTextEdit={handleElementTextEdit}
                            />
                        ) : (
                            <div className={styles.stageEmpty}>
                                <LuWandSparkles size={26} />
                                <p>{t('stage_empty')}</p>
                            </div>
                        )}
                    </main>

                    {/* ── Sidebar تب‌دار: چت | المان‌ها | تنظیمات ── */}
                    <aside className={styles.sidePanel}>
                        <div className={styles.sideTabs} role="tablist" aria-label={t('sidebar_tabs')}>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={sidebarTab === 'chat'}
                                className={`${styles.sideTab} ${sidebarTab === 'chat' ? styles.sideTabActive : ''}`}
                                onClick={() => setSidebarTab('chat')}
                            >
                                <LuMessageSquare size={14} />
                                {t('tab_chat')}
                            </button>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={sidebarTab === 'elements'}
                                className={`${styles.sideTab} ${sidebarTab === 'elements' ? styles.sideTabActive : ''}`}
                                onClick={() => setSidebarTab('elements')}
                            >
                                <LuMousePointerClick size={14} />
                                {t('tab_elements')}
                            </button>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={sidebarTab === 'items'}
                                className={`${styles.sideTab} ${sidebarTab === 'items' ? styles.sideTabActive : ''}`}
                                onClick={() => setSidebarTab('items')}
                            >
                                <LuList size={14} />
                                {t('tab_items', { defaultValue: 'آیتم‌ها' })}
                            </button>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={sidebarTab === 'audio'}
                                className={`${styles.sideTab} ${sidebarTab === 'audio' ? styles.sideTabActive : ''}`}
                                onClick={() => setSidebarTab('audio')}
                            >
                                <LuAudioLines size={14} />
                                {t('tab_audio')}
                            </button>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={sidebarTab === 'settings'}
                                className={`${styles.sideTab} ${sidebarTab === 'settings' ? styles.sideTabActive : ''}`}
                                onClick={() => setSidebarTab('settings')}
                            >
                                <LuSettings2 size={14} />
                                {t('tab_settings')}
                            </button>
                        </div>

                        <div className={styles.sideBody}>
                            {sidebarTab === 'chat' && (
                                <ChatPanel
                                    entries={chat}
                                    disabled={generating}
                                    models={models}
                                    selectedCut={selectedCutListItem}
                                    autoJob={autoJob}
                                    hasElements={stageMode === 'single' && Boolean(cutDetail?.currentVersion)}
                                    applyingPlanId={applyingPlanId}
                                    onSend={(payload) => void runChatSend(payload)}
                                    onOpenCut={(cutId) => void selectCut(cutId)}
                                    onEditEntry={editChatEntry}
                                    onTogglePlanChange={toggleElementPlan}
                                    onConfirmElementPlan={(entryId, selectedIds) => void confirmElementPlan(entryId, selectedIds)}
                                    onRevertElementPlan={(entryId) => void revertElementPlan(entryId)}
                                />
                            )}
                            {sidebarTab === 'elements' && (
                                <ElementSettingsPanel
                                    cut={cutDetail}
                                    getElements={getElements}
                                    readKey={elementReadKey}
                                    overridesVersion={overridesVersion}
                                    focusElementId={focusElementId}
                                    onSaved={(fresh) => {
                                        setCutDetail(fresh);
                                        if (project) void refreshProject(project._id);
                                    }}
                                    onError={(message) => appendSystemLog(`✕ ${message}`)}
                                />
                            )}
                            {sidebarTab === 'items' && (
                                <ItemsListPanel
                                    cut={cutDetail}
                                    getElements={getElements}
                                    readKey={elementReadKey}
                                    overridesVersion={overridesVersion}
                                    singleMode={stageMode === 'single'}
                                    focusElementId={focusElementId}
                                    onEditElement={openElementInEditor}
                                />
                            )}
                            {sidebarTab === 'audio' && (
                                <AudioPanel
                                    key={cutDetail?._id || 'no-cut'}
                                    cut={cutDetail}
                                    textModelId={modelId || undefined}
                                    playerTime={playerTime}
                                    onSeekPlayer={(time) => {
                                        if (stageMode !== 'single' && cutDetail) {
                                            setStageMode('single');
                                        }
                                        seekRef.current?.(time);
                                        setPlayerTime(time);
                                    }}
                                    onRefreshCut={(fresh) => {
                                        setCutDetail(fresh);
                                        if (project) void refreshProject(project._id);
                                    }}
                                    onError={(message) => appendSystemLog(`✕ ${message}`)}
                                />
                            )}
                            {sidebarTab === 'settings' && project && (
                                <ClipSettingsPanel
                                    project={project}
                                    cut={cutDetail}
                                    busyCut={busyCut}
                                    generating={generating}
                                    codeDraft={codeDraft}
                                    editPrompt={editPrompt}
                                    previewVersion={previewVersion}
                                    onCodeDraftChange={setCodeDraft}
                                    onEditPromptChange={setEditPrompt}
                                    onPreviewVersionChange={(version) => {
                                        if (cutDetail) void switchPreviewVersion(cutDetail, version);
                                    }}
                                    onActivateVersion={() => void activatePreviewedVersion()}
                                    onPatchCutMeta={(patch) => void patchCutMeta(patch)}
                                    onPatchProject={(patch) => void patchProject(patch)}
                                    onApplyAiEdit={() => void applyAiEditFromSettings()}
                                    onSaveCode={() => void saveCodeVersion()}
                                    onOpenSaveTemplate={() => setSaveTemplateOpen(true)}
                                />
                            )}
                        </div>
                    </aside>
                </div>
            )}

            <TemplateGalleryModal open={templatesOpen} onClose={() => setTemplatesOpen(false)} onUseTemplate={(template) => void applyTemplate(template)} />
            <ExportModal open={exportOpen} project={project} onClose={() => setExportOpen(false)} />
            {brandKitOpen && project && (
                <BrandKitModal
                    open={brandKitOpen}
                    project={project}
                    onClose={() => setBrandKitOpen(false)}
                    onSave={(brandKit) => {
                        setBrandKitOpen(false);
                        void patchProject({ brandKit });
                        appendSystemLog(`✓ ${t('log_brand_saved', { defaultValue: 'برند کیت ذخیره شد — در تولیدهای بعدی اعمال می‌شود.' })}`);
                    }}
                />
            )}
            <ModalHelper
                open={saveTemplateOpen}
                onClose={() => setSaveTemplateOpen(false)}
                size="md"
                sheetTitle={t('save_template_title')}
                component={(
                    <div className={styles.modalTheme}>
                        <div className={styles.modalHead}>
                            <h3>{t('save_template_title')}</h3>
                        </div>
                        <div className={styles.exportForm}>
                            <label>
                                {t('template_name_label')}
                                <input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder={t('template_name_placeholder')} />
                            </label>
                            <label>
                                {t('template_desc_label')}
                                <input value={templateDesc} onChange={(e) => setTemplateDesc(e.target.value)} />
                            </label>
                            <button
                                type="button"
                                className={styles.primaryBtn}
                                disabled={busyCut || !templateName.trim()}
                                onClick={() => void saveAsTemplate()}
                            >
                                {busyCut ? <LuLoaderCircle size={14} className={styles.spin} /> : <LuSave size={14} />}
                                {t('save_template_btn')}
                            </button>
                        </div>
                    </div>
                )}
            />
        </div>
    );
}
