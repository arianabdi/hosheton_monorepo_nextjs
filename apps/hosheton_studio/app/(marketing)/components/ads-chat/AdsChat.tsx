'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePathname, useRouter } from 'next/navigation';
import { providersApi, type ProviderModelItem } from '@/app/(developers)/projects/lib/providers-api';
import { getApiErrorMessage } from '@/app/(developers)/projects/lib/api-client';
import type { AdsAutoJob, AdsAutoJobStep, AdsCutListItem, AdsProject } from '@/app/(marketing)/ads-video/lib/ads-video-api';
import { adsVideoApi } from '@/app/(marketing)/ads-video/lib/ads-video-api';
import { useAdsStudioSyncStore } from '@/app/zustand/store/useAdsStudioSyncStore';
import { useStudioPersonalChatStore } from '@/app/zustand/store/useStudioPersonalChatStore';
import type {
    AdsChatCutTarget,
    ChatEntry,
    ChatSendPayload,
    ChatStep,
    ChatStepStatus,
} from './ChatPanel';
import AgentChatPanel from './AgentChatPanel';
import ChatHistoryPanel from './ChatHistoryPanel';
import { deleteChatSession, listChatSessions, saveChatSession, type ChatSession } from './ads-chat-history';

// ────────────────────────────── Helpers ──────────────────────────────

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** وضعیت ردیف چک‌لیست job → وضعیت گام چت */
function todoStatus(status: AdsAutoJobStep['status']): ChatStepStatus {
    if (status === 'done') return 'done';
    if (status === 'failed') return 'error';
    if (status === 'generating' || status === 'sound') return 'running';
    return 'pending';
}

function toCutItems(list: AdsCutListItem[] | undefined): AdsChatCutTarget[] {
    return (list || []).map((cut) => ({
        _id: cut._id,
        title: cut.title,
        currentVersion: cut.currentVersion,
    }));
}

// ────────────────────────────── Component ──────────────────────────────

/**
 * چت خودگردان استودیو تبلیغات — ساکن در layout گروه (marketing) و بدون هیچ
 * وابستگی به state صفحه: پروژه‌ی فعال و کات انتخابی را از استور همگام‌سازی
 * می‌خواند (صفحه می‌نویسد)، بعد از هر تولید پروژه را دوباره می‌خواند و با
 * notifyProjectChanged/requestCut صفحه‌ی استودیو را برای رفرش و پرش به کات
 * تازه خبر می‌دهد. حالت «ویرایش سریع المان‌ها» به اسنپ‌شات زنده‌ی iframe
 * استودیو نیاز دارد و اینجا در دسترس نیست (دکمه‌اش غیرفعال است).
 */
export default function AdsChat() {
    const { t } = useTranslation('adsVideo');
    const router = useRouter();
    const pathname = usePathname();
    const activeProjectId = useAdsStudioSyncStore((s) => s.activeProjectId);
    const activeCutId = useAdsStudioSyncStore((s) => s.activeCutId);
    // نمای تاریخچه — با دکمه‌ی هدر سایدبار (layout) باز/بسته می‌شود
    const historyOpen = useStudioPersonalChatStore((s) => s.historyOpen);
    const setHistoryOpen = useStudioPersonalChatStore((s) => s.setHistoryOpen);

    const [detail, setDetail] = useState<{ project: AdsProject | null; cuts: AdsChatCutTarget[] }>({
        project: null,
        cuts: [],
    });
    const [entries, setEntries] = useState<ChatEntry[]>([]);
    const [models, setModels] = useState<ProviderModelItem[]>([]);
    const [generating, setGenerating] = useState(false);
    // تاریخچه‌ی چت پروژه — گفتگوهای ذخیره‌شده + شناسه‌ی گفتگوی جاری
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const seqRef = useRef(0);

    // بدون پروژه‌ی فعال، چت خودبه‌خود خالی/غیرفعال دیده می‌شود (derive — نه state جدا)
    const project = activeProjectId ? detail.project : null;
    const cuts = useMemo(
        () => (activeProjectId ? detail.cuts : []),
        [activeProjectId, detail.cuts],
    );

    const pushChat = useCallback((entry: Omit<ChatEntry, 'id'>) => {
        seqRef.current += 1;
        const id = seqRef.current;
        setEntries((prev) => [...prev, { ...entry, id }]);
        return id;
    }, []);

    const patchEntry = useCallback((id: number, patch: Partial<ChatEntry>) => {
        setEntries((prev) => prev.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)));
    }, []);

    const patchStep = useCallback((entryId: number, stepId: string, patch: Partial<ChatStep>) => {
        setEntries((prev) => prev.map((entry) => {
            if (entry.id !== entryId) return entry;
            return {
                ...entry,
                steps: (entry.steps || []).map((step) => (step.id === stepId ? { ...step, ...patch } : step)),
            };
        }));
    }, []);

    /** خطا وسط کار — گام‌های در جریان ناموفق و پاسخ بسته می‌شود (اسپینر بی‌پایان نمی‌ماند) */
    const failEntry = useCallback((entryId: number, message: string) => {
        const finishedAt = Date.now();
        const close = (list?: ChatStep[]) => list?.map((step) => (
            step.status === 'running' ? { ...step, status: 'error' as const, finishedAt } : step
        ));
        setEntries((prev) => prev.map((entry) => (entry.id === entryId
            ? { ...entry, steps: close(entry.steps), todos: close(entry.todos), error: message, finishedAt }
            : entry)));
    }, []);

    const pushSystemLog = useCallback((text: string) => {
        seqRef.current += 1;
        const id = seqRef.current;
        setEntries((prev) => [...prev.slice(-80), { id, role: 'system', text }]);
    }, []);

    // ── تاریخچه‌ی چت پروژه (localStorage) ──
    // با تعویض پروژه، گفتگوی اخیر همان پروژه بازیابی می‌شود تا چت با جابه‌جایی
    // بین صفحات/پروژه‌ها از دست نرود؛ تغییرهای entries هم خودکار ذخیره می‌شوند
    useEffect(() => {
        if (!activeProjectId) {
            setSessions([]);
            setEntries([]);
            setCurrentSessionId(null);
            return;
        }
        const list = listChatSessions(activeProjectId);
        setSessions(list);
        const latest = list[0];
        if (latest?.entries.length) {
            seqRef.current = latest.entries.reduce((max, entry) => Math.max(max, entry.id), 0);
            setEntries(latest.entries);
            setCurrentSessionId(latest.id);
        } else {
            setEntries([]);
            setCurrentSessionId(null);
        }
    }, [activeProjectId]);

    useEffect(() => {
        const pid = useAdsStudioSyncStore.getState().activeProjectId;
        if (!pid || entries.length === 0) return;
        const saved = saveChatSession(pid, currentSessionId, entries);
        if (!saved) return;
        if (saved.id !== currentSessionId) setCurrentSessionId(saved.id);
        setSessions(listChatSessions(pid));
    }, [entries, currentSessionId]);

    /** بازکردن یک گفتگوی ذخیره‌شده از تاریخچه */
    const openHistorySession = useCallback((sessionId: string) => {
        const pid = useAdsStudioSyncStore.getState().activeProjectId;
        if (!pid) return;
        const session = listChatSessions(pid).find((item) => item.id === sessionId);
        if (!session) return;
        seqRef.current = session.entries.reduce((max, entry) => Math.max(max, entry.id), 0);
        setEntries(session.entries);
        setCurrentSessionId(session.id);
        setHistoryOpen(false);
    }, [setHistoryOpen]);

    /** گفتگوی تازه — گفتگوی قبلی همان‌طور که ذخیره شده در تاریخچه می‌ماند */
    const startNewChat = useCallback(() => {
        setEntries([]);
        setCurrentSessionId(null);
        setHistoryOpen(false);
    }, [setHistoryOpen]);

    const removeHistorySession = useCallback((sessionId: string) => {
        const pid = useAdsStudioSyncStore.getState().activeProjectId;
        if (!pid) return;
        setSessions(deleteChatSession(pid, sessionId));
        if (sessionId === currentSessionId) {
            setEntries([]);
            setCurrentSessionId(null);
        }
    }, [currentSessionId]);

    // مدل‌های متنی چت — در نبود دسترسی، چت بدون انتخاب مدل ادامه می‌دهد
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await providersApi.listModels({ class: 'text' });
                if (!cancelled) setModels(res.models || []);
            } catch {
                if (!cancelled) setModels([]);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    // پروژه‌ی فعال — اگر هیچ‌کس (صفحه‌ی استودیو) هنوز تعیین نکرده باشد،
    // اولین پروژه‌ی موجود برمی‌گزیده می‌شود تا چت روی هر صفحه‌ای کار کند
    useEffect(() => {
        if (activeProjectId !== null) return;
        let cancelled = false;
        (async () => {
            try {
                const res = await adsVideoApi.listProjects();
                const first = res.projects?.[0] || null;
                if (!cancelled) useAdsStudioSyncStore.getState().setActiveProject(first?._id || null);
            } catch {
                // بدون پروژه — چت غیرفعال می‌ماند
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [activeProjectId]);

    // جزئیات پروژه‌ی فعال — با تعویض پروژه (از toolbox صفحه یا اینجا) دوباره خوانده می‌شود
    useEffect(() => {
        if (!activeProjectId) return;
        let cancelled = false;
        (async () => {
            try {
                const res = await adsVideoApi.getProject(activeProjectId);
                if (!cancelled) setDetail({ project: res.project, cuts: toCutItems(res.cuts) });
            } catch {
                if (!cancelled) setDetail({ project: null, cuts: [] });
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [activeProjectId]);

    const reloadActive = useCallback(async () => {
        const pid = useAdsStudioSyncStore.getState().activeProjectId;
        if (!pid) return;
        try {
            const res = await adsVideoApi.getProject(pid);
            setDetail({ project: res.project, cuts: toCutItems(res.cuts) });
        } catch {
            // آخرین وضعیت موفق باقی می‌ماند
        }
    }, []);

    /** پرش به کات — صفحه‌ی استودیو انتخاب می‌کند؛ اگر روی آن صفحه نیستیم، می‌رویم */
    const openCut = useCallback((cutId: string) => {
        useAdsStudioSyncStore.getState().requestCut(cutId);
        if (pathname && !pathname.startsWith('/ads-2video')) router.push('/ads-2video');
    }, [pathname, router]);

    // ── poll وضعیت jobهای پس‌زمینه (ساخت خودکار / ویرایش گروهی) ──
    // چک‌لیست کات‌ها از job.steps می‌آید؛ زمان شروع/پایان هر ردیف سمت کلاینت ثبت می‌شود
    // (اولین باری که آن وضعیت دیده شد) تا اختلاف ساعت سرور روی زمان‌ها اثر نگذارد
    const pollJob = useCallback(async (projectId: string, jobId: string, entryId: number, stepId: string) => {
        const times = new Map<number, { startedAt?: number; finishedAt?: number }>();
        let stepFinishedAt = 0;
        for (let attempt = 0; attempt < 180; attempt += 1) {
            await sleep(2000);
            const res = await adsVideoApi.listAutoJobs(projectId);
            const job: AdsAutoJob | undefined = res.jobs?.find((item) => item.jobId === jobId);
            if (!job) continue;
            const now = Date.now();
            const todos: ChatStep[] = (job.steps || []).map((step, index) => {
                const status = todoStatus(step.status);
                const stamp = times.get(index) || {};
                if (status === 'running' && !stamp.startedAt) stamp.startedAt = now;
                if ((status === 'done' || status === 'error') && !stamp.finishedAt) {
                    stamp.finishedAt = now;
                    stamp.startedAt = stamp.startedAt || now;
                }
                times.set(index, stamp);
                return {
                    id: `todo-${index}`,
                    label: step.title || `#${index + 1}`,
                    status,
                    detail: step.status === 'sound'
                        ? t('agent_todo_sound', { defaultValue: 'طراحی صدا' })
                        : step.status === 'generating'
                            ? t('agent_todo_generating', { defaultValue: 'در حال ساخت' })
                            : step.status === 'failed'
                                ? (step.error || t('agent_failed', { defaultValue: 'ناموفق بود' }))
                                : step.durationSeconds ? `${step.durationSeconds}s` : undefined,
                    cutId: step.cutId || undefined,
                    startedAt: stamp.startedAt,
                    finishedAt: stamp.finishedAt,
                };
            });
            if (todos.length) patchEntry(entryId, { todos });
            // گام اصلی: برنامه‌ریزی تمام شد (ساخت خودکار) یا خود ویرایش گروهی تا پایان job
            const planned = job.status !== 'planning';
            const finished = job.status === 'completed' || job.status === 'failed';
            if (stepId === 'plan' && planned) {
                stepFinishedAt = stepFinishedAt || now;
                patchStep(entryId, stepId, {
                    status: 'done',
                    detail: t('cuts_count', { n: job.totalCuts }),
                    finishedAt: stepFinishedAt,
                });
            } else if (!todos.length) {
                // API قدیمی بدون چک‌لیست — فقط شمارنده
                patchStep(entryId, stepId, { detail: `${job.generatedCuts}/${job.totalCuts}` });
            }
            if (finished && stepId !== 'plan') {
                patchStep(entryId, stepId, { status: job.status === 'completed' ? 'done' : 'error', finishedAt: now });
            }
            if (job.status === 'completed') return job;
            if (job.status === 'failed') throw new Error(job.error || job.errors?.join('، ') || 'job failed');
        }
        throw new Error('timeout');
    }, [patchEntry, patchStep, t]);

    // ── ارسال — گام‌ها و چک‌لیست به سبک Cursor، با زمان شروع/پایان هر گام ──
    const runSend = useCallback(async (payload: ChatSendPayload) => {
        if (!project || generating) return;
        pushChat({
            role: 'user',
            text: payload.prompt,
            attachments: payload.attachments,
            sentPayload: payload,
        });

        setGenerating(true);
        let stepEntry = 0;
        try {
            // ساخت خودکار ویدیو — برنامه‌ریزی استوری‌بورد، سپس چک‌لیست زنده‌ی کات‌ها
            if (payload.mode === 'auto') {
                const startedAt = Date.now();
                stepEntry = pushChat({
                    role: 'assistant',
                    startedAt,
                    steps: [{ id: 'plan', label: t('chat_step_plan'), status: 'running', startedAt }],
                });
                const res = await adsVideoApi.startAutoVideo(project._id, {
                    prompt: payload.prompt,
                    modelId: payload.modelId || undefined,
                    attachments: payload.attachments.length ? payload.attachments : undefined,
                    cutsCount: payload.cutsCount || undefined,
                    withSound: payload.withSound || undefined,
                });
                const job = await pollJob(project._id, res.job.jobId, stepEntry, 'plan');
                await reloadActive();
                useAdsStudioSyncStore.getState().notifyProjectChanged();
                patchEntry(stepEntry, {
                    finishedAt: Date.now(),
                    cutRefs: (job.cutIds || []).map((cutId) => ({
                        cutId,
                        title: cuts.find((cut) => cut._id === cutId)?.title || `#${cutId.slice(-4)}`,
                    })),
                });
                return;
            }

            // ویرایش همه‌ی کات‌ها با یک دستور — چک‌لیست = کات‌های پروژه
            if (payload.mode === 'edit' && payload.scope === 'all') {
                const startedAt = Date.now();
                stepEntry = pushChat({
                    role: 'assistant',
                    startedAt,
                    steps: [{
                        id: 'bulk',
                        label: t('chat_step_bulk_edit', { defaultValue: 'اعمال ویرایش روی همه‌ی کات‌ها' }),
                        status: 'running',
                        startedAt,
                    }],
                });
                const res = await adsVideoApi.startBulkEdit(project._id, {
                    prompt: payload.prompt,
                    modelId: payload.modelId || undefined,
                    withSound: payload.withSound || undefined,
                });
                await pollJob(project._id, res.job.jobId, stepEntry, 'bulk');
                await reloadActive();
                useAdsStudioSyncStore.getState().notifyProjectChanged();
                patchEntry(stepEntry, { finishedAt: Date.now() });
                return;
            }

            // تولید کات جدید / ویرایش کات فعال
            const editTargetTitle = cuts.find((cut) => cut._id === activeCutId)?.title || '';
            const startedAt = Date.now();
            const steps: ChatStep[] = [{
                id: 'generate',
                label: payload.mode === 'new'
                    ? (payload.durationSeconds > 0
                        ? t('chat_step_generate_new', { seconds: payload.durationSeconds })
                        : t('chat_step_generate_auto', { defaultValue: 'تولید موشن‌گرافیک با طول خودکار' }))
                    : t('chat_step_generate_edit', { title: editTargetTitle }),
                status: 'running',
                startedAt,
            }];
            // صدا بعد از ساخت کات در همان درخواست انجام می‌شود — تا آن موقع در صف است
            if (payload.withSound) {
                steps.push({ id: 'sound', label: t('chat_step_sound'), status: 'pending' });
            }
            stepEntry = pushChat({ role: 'assistant', steps, startedAt });

            const targetCutId = payload.mode === 'new' ? '' : activeCutId;
            if (payload.mode !== 'new' && !targetCutId) {
                failEntry(stepEntry, t('err_no_cut', { defaultValue: 'کاتی برای ویرایش انتخاب نشده است.' }));
                return;
            }
            const res = payload.mode === 'new'
                ? await adsVideoApi.createCut(project._id, {
                    prompt: payload.prompt,
                    modelId: payload.modelId || undefined,
                    attachments: payload.attachments.length ? payload.attachments : undefined,
                    durationSeconds: payload.durationSeconds,
                    withSound: payload.withSound || undefined,
                })
                : await adsVideoApi.generateCut(targetCutId!, {
                    prompt: payload.prompt,
                    modelId: payload.modelId || undefined,
                    attachments: payload.attachments.length ? payload.attachments : undefined,
                    durationSeconds: payload.durationSeconds,
                    withSound: payload.withSound || undefined,
                });
            const doneAt = Date.now();
            patchStep(stepEntry, 'generate', { status: 'done', detail: `v${res.cut.currentVersion}`, finishedAt: doneAt });
            if (payload.withSound) {
                const soundCount = res.cut.soundEffects?.length || 0;
                patchStep(stepEntry, 'sound', {
                    status: soundCount ? 'done' : 'error',
                    detail: soundCount ? t('chat_step_sound_done', { n: soundCount }) : t('chat_step_sound_failed'),
                    finishedAt: doneAt,
                });
            }
            await reloadActive();
            useAdsStudioSyncStore.getState().notifyProjectChanged();
            patchEntry(stepEntry, { cutRefs: [{ cutId: res.cut._id, title: res.cut.title }], finishedAt: Date.now() });
            openCut(res.cut._id);
        } catch (error) {
            const message = getApiErrorMessage(error, t('err_generate'));
            if (stepEntry) failEntry(stepEntry, message);
            else pushSystemLog(message);
        } finally {
            setGenerating(false);
        }
    }, [activeCutId, cuts, failEntry, generating, openCut, patchEntry, patchStep, pollJob, project, pushChat, pushSystemLog, reloadActive, t]);

    const selectedCut = cuts.find((cut) => cut._id === activeCutId) || null;

    // تاریخچه — صفحه‌ی جایگزین چت در همان سایدبار
    if (historyOpen) {
        return (
            <ChatHistoryPanel
                sessions={sessions}
                currentSessionId={currentSessionId}
                onOpen={openHistorySession}
                onDelete={removeHistorySession}
                onNew={startNewChat}
                onBack={() => setHistoryOpen(false)}
            />
        );
    }

    return (
        <AgentChatPanel
            entries={entries}
            disabled={!project}
            busy={generating}
            models={models}
            selectedCut={selectedCut}
            hasCuts={cuts.length > 0}
            onSend={(payload) => void runSend(payload)}
            onOpenCut={openCut}
            onEditEntry={(entryId) => {
                setEntries((prev) => {
                    const index = prev.findIndex((entry) => entry.id === entryId);
                    if (index < 0) return prev;
                    return prev.slice(0, index);
                });
            }}
        />
    );
}
