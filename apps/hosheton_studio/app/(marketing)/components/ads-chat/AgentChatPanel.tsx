'use client';

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { FiPlus } from 'react-icons/fi';
import { RiSendInsLine } from 'react-icons/ri';
import {
    LuArrowUpRight,
    LuAudioLines,
    LuCheck,
    LuCircleAlert,
    LuClapperboard,
    LuCopy,
    LuCpu,
    LuLayers,
    LuListChecks,
    LuLoaderCircle,
    LuPencil,
    LuSparkles,
    LuSquarePlus,
    LuTimer,
    LuWandSparkles,
    LuX,
} from 'react-icons/lu';
import { MediaMentionComposer } from '@/app/(developers)/projects/components/MediaMentionComposer';
import type { StudioMediaMention } from '@/app/(developers)/projects/lib/studio-media';
import {
    extractClipboardMediaFiles,
    isEditablePasteTarget,
} from '@/app/(developers)/projects/[projectId]/lib/clipboard-media';
import type { ProviderModelItem } from '@/app/(developers)/projects/lib/providers-api';
import { SvgMarkup, sanitizeSvg } from '@/app/(developers)/projects/[projectId]/chat/lib/modeIcon';
import inputStyles from '@/app/(developers)/projects/[projectId]/chat/chatInput/ChatInput.module.scss';
import toolbarStyles from '@/app/(developers)/projects/[projectId]/chat/chatInput/CompactChatToolbar.module.scss';
import type { AdsAttachment } from '@/app/(marketing)/ads-video/lib/ads-video-api';
import { attachmentSizeError, uploadAdsAttachments } from '@/app/(marketing)/ads-video/lib/attach-upload';
import {
    buildSendPayloadParts,
    type AdsChatCutTarget,
    type ChatEntry,
    type ChatSendPayload,
    type ChatStep,
    type ChatStepStatus,
} from './ChatPanel';
import ComposerChip, { type ComposerChipOption } from './ComposerChip';
import styles from './agent-chat.module.scss';

// ────────────────────────────── Types ──────────────────────────────

/** حالت کامپوزر — editAll همان ویرایش با scope=all است، به‌صورت یک گزینه‌ی مستقل */
type ComposerMode = 'new' | 'auto' | 'edit' | 'editAll';

interface AgentChatPanelProps {
    entries: ChatEntry[];
    /** پروژه‌ای در کار نیست — کامپوزر قفل است */
    disabled?: boolean;
    /** یک تولید در جریان است — ارسال بعدی منتظر می‌ماند */
    busy?: boolean;
    models: ProviderModelItem[];
    selectedCut: AdsChatCutTarget | null;
    hasCuts: boolean;
    onSend(payload: ChatSendPayload): void;
    onOpenCut(cutId: string): void;
    /** ویرایش پیام کاربر — چت تا قبل از همان entry بریده می‌شود */
    onEditEntry?(entryId: number): void;
}

const MENTION_TOKEN_PATTERN = /@\[([^\]]+)\]\(asset:([^)]+)\)/g;
// 0 = خودکار (هوش مصنوعی تصمیم می‌گیرد)
const DURATION_OPTIONS = [0, 3, 5, 8, 10, 15, 20, 30];
const AUTO_CUT_COUNT_OPTIONS = [0, 3, 4, 5, 6];

function attachmentKey(item: AdsAttachment) {
    return item.assetId || item.fileKey || item.url || '';
}

function formatDuration(ms: number) {
    const seconds = Math.max(0, Math.round(ms / 1000));
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s`;
}

// ────────────────────────────── Small parts ──────────────────────────────

/** زمان سپری‌شده — تا وقتی until نیامده هر ثانیه خودش را تازه می‌کند (فقط همین المان ری‌رندر می‌شود) */
function Elapsed({ since, until }: { since?: number; until?: number }) {
    const [now, setNow] = useState(0);
    useEffect(() => {
        if (!since || until) return;
        const tick = () => setNow(Date.now());
        const first = window.setTimeout(tick, 0);
        const timer = window.setInterval(tick, 1000);
        return () => {
            window.clearTimeout(first);
            window.clearInterval(timer);
        };
    }, [since, until]);
    if (!since) return null;
    const end = until || now;
    if (!end) return null;
    return <span className={styles.elapsed} dir="ltr">{formatDuration(end - since)}</span>;
}

function StepIcon({ status }: { status: ChatStepStatus }) {
    if (status === 'running') return <LuLoaderCircle size={13} className={styles.spin} />;
    if (status === 'done') return <LuCheck size={13} />;
    if (status === 'error') return <LuX size={13} />;
    return <span className={styles.stepDot} />;
}

/** چک‌باکس دایره‌ای چک‌لیست — تیک، حلقه‌ی در حال اجرا، خالی یا خطا */
function TodoCheck({ status }: { status: ChatStepStatus }) {
    return (
        <span className={`${styles.check} ${styles[`check_${status}`] || ''}`} aria-hidden>
            {status === 'done' ? <LuCheck size={10} strokeWidth={3.2} /> : null}
            {status === 'error' ? <LuX size={10} strokeWidth={3.2} /> : null}
        </span>
    );
}

function TodoList({ todos, onOpenCut }: { todos: ChatStep[]; onOpenCut(cutId: string): void }) {
    const { t } = useTranslation('adsVideo');
    const done = todos.filter((todo) => todo.status === 'done').length;
    const percent = todos.length ? Math.round((done / todos.length) * 100) : 0;
    return (
        <div className={styles.todo}>
            <div className={styles.todoHead}>
                <LuListChecks size={14} aria-hidden />
                <span>{t('agent_todo_title', { defaultValue: 'برنامه' })}</span>
                <span className={styles.todoCount} dir="ltr">{done}/{todos.length}</span>
            </div>
            <div className={styles.todoBar} aria-hidden>
                <i style={{ width: `${percent}%` }} />
            </div>
            <ul className={styles.todoList}>
                {todos.map((todo, index) => {
                    const openable = todo.status === 'done' && Boolean(todo.cutId);
                    const content = (
                        <>
                            <TodoCheck status={todo.status} />
                            <span className={styles.todoLabel} dir="auto">{todo.label || `#${index + 1}`}</span>
                            {todo.detail ? <span className={styles.todoDetail}>{todo.detail}</span> : null}
                            {todo.status === 'running' ? <Elapsed since={todo.startedAt} until={todo.finishedAt} /> : null}
                            {openable ? <LuArrowUpRight size={13} className={styles.todoOpen} aria-hidden /> : null}
                        </>
                    );
                    return (
                        <li key={todo.id} className={`${styles.todoItem} ${styles[`todo_${todo.status}`] || ''}`}>
                            {openable ? (
                                <button
                                    type="button"
                                    className={styles.todoRow}
                                    onClick={() => onOpenCut(todo.cutId!)}
                                    title={t('agent_open_cut', { defaultValue: 'مشاهده‌ی کات' })}
                                >
                                    {content}
                                </button>
                            ) : (
                                <div className={styles.todoRow} title={todo.status === 'error' ? todo.detail : undefined}>
                                    {content}
                                </div>
                            )}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

/** پاسخ دستیار به سبک Cursor — خط وضعیت زنده، گام‌ها، چک‌لیست و کات‌های ساخته‌شده */
function AssistantTurn({ entry, onOpenCut }: { entry: ChatEntry; onOpenCut(cutId: string): void }) {
    const { t } = useTranslation('adsVideo');
    const steps = entry.steps || [];
    const todos = entry.todos || [];
    const all = [...steps, ...todos];
    const running = !entry.finishedAt && all.some((item) => item.status === 'running');
    const failed = Boolean(entry.error) || (!running && all.length > 0 && all.every((item) => item.status === 'error'));
    const runningTodo = todos.find((item) => item.status === 'running');
    const runningStep = steps.find((item) => item.status === 'running');
    const liveLabel = runningTodo
        ? `${runningTodo.detail || t('agent_todo_generating', { defaultValue: 'در حال ساخت' })} — ${runningTodo.label}`
        : runningStep?.label || t('agent_working', { defaultValue: 'در حال کار' });
    const showStatus = running || Boolean(entry.startedAt);

    return (
        <div className={styles.assistant}>
            {showStatus ? (
                <div className={`${styles.status} ${running ? styles.statusLive : failed ? styles.statusFailed : styles.statusDone}`}>
                    {running ? (
                        <>
                            <span className={styles.liveDot} aria-hidden />
                            <span className={styles.shimmer} dir="auto">{liveLabel}</span>
                        </>
                    ) : failed ? (
                        <>
                            <LuCircleAlert size={14} aria-hidden />
                            <span>{t('agent_failed', { defaultValue: 'ناموفق بود' })}</span>
                        </>
                    ) : (
                        <>
                            <LuCheck size={14} aria-hidden />
                            <span>{t('agent_done', { defaultValue: 'انجام شد' })}</span>
                        </>
                    )}
                    <Elapsed since={entry.startedAt} until={entry.finishedAt} />
                </div>
            ) : null}

            {entry.text ? <p className={styles.assistantText} dir="auto">{entry.text}</p> : null}

            {steps.length > 0 ? (
                <ul className={styles.steps}>
                    {steps.map((step) => (
                        <li key={step.id} className={`${styles.step} ${styles[`step_${step.status}`] || ''}`}>
                            <span className={styles.stepIcon}><StepIcon status={step.status} /></span>
                            <span className={styles.stepLabel} dir="auto">{step.label}</span>
                            {step.detail ? <span className={styles.stepDetail} dir="auto">{step.detail}</span> : null}
                            {step.startedAt ? <Elapsed since={step.startedAt} until={step.finishedAt} /> : null}
                        </li>
                    ))}
                </ul>
            ) : null}

            {todos.length > 0 ? <TodoList todos={todos} onOpenCut={onOpenCut} /> : null}

            {entry.error ? (
                <p className={styles.errorLine} dir="auto">
                    <LuCircleAlert size={13} aria-hidden />
                    {entry.error}
                </p>
            ) : null}

            {entry.cutRefs && entry.cutRefs.length > 0 && !todos.length ? (
                <div className={styles.cutRefs}>
                    {entry.cutRefs.map((ref) => (
                        <button key={ref.cutId} type="button" className={styles.cutRef} onClick={() => onOpenCut(ref.cutId)}>
                            <LuClapperboard size={12} aria-hidden />
                            <span dir="auto">{ref.title}</span>
                            <LuArrowUpRight size={12} aria-hidden />
                        </button>
                    ))}
                </div>
            ) : null}
            {entry.meta ? <span className={styles.meta}>{entry.meta}</span> : null}
        </div>
    );
}

function EntryAttachment({ item }: { item: AdsAttachment }) {
    if (item.type === 'image' && item.url) {
        return (
            <span className={styles.userAttach}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.url} alt={item.label || ''} loading="lazy" />
            </span>
        );
    }
    return (
        <span className={styles.userAttach} title={item.label || item.type}>
            <em>{item.type === 'video' ? '🎬' : '🎵'}</em>
        </span>
    );
}

// ────────────────────────────── Component ──────────────────────────────

/**
 * چت تولید ویدیو در سایدبار ads-2video — الگوی چت Cursor: پیام کاربر در قاب،
 * پاسخ با خط وضعیت زنده (شیمر + زمان)، گام‌های اجرا و چک‌لیست کات‌ها (to-do)
 * که با پیشرفت job تیک می‌خورند. کامپوزر همان ظاهر کامپوزر چت استودیو است
 * (قاب برند، چیپ‌ها و دکمه‌ی ارسال گرد) و فقط مدل‌های متنی را می‌پذیرد.
 */
export default function AgentChatPanel({
    entries,
    disabled = false,
    busy = false,
    models,
    selectedCut,
    hasCuts,
    onSend,
    onOpenCut,
    onEditEntry,
}: AgentChatPanelProps) {
    const { t } = useTranslation('adsVideo');
    const [mode, setMode] = useState<ComposerMode>('new');
    const [modelId, setModelId] = useState('');
    const [duration, setDuration] = useState(0);
    const [cutsCount, setCutsCount] = useState(0);
    const [withSound, setWithSound] = useState(false);
    const [attachments, setAttachments] = useState<AdsAttachment[]>([]);
    const [promptValue, setPromptValue] = useState('');
    const [mentions, setMentions] = useState<StudioMediaMention[]>([]);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [copiedId, setCopiedId] = useState<number | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    // گزینه‌ی انتخاب‌شده اگر دیگر معتبر نیست (کاتی انتخاب نیست) به «کات جدید» برمی‌گردد
    const effectiveMode: ComposerMode = (mode === 'edit' && !selectedCut) || (mode === 'editAll' && !hasCuts) ? 'new' : mode;
    const effectiveModelId = models.some((model) => model._id === modelId) ? modelId : (models[0]?._id || '');
    const selectedModel = models.find((model) => model._id === effectiveModelId) || null;
    const locked = disabled || busy;

    // پیام جدید → اسکرول به پایین
    useEffect(() => {
        const box = scrollRef.current;
        if (box) box.scrollTop = box.scrollHeight;
    }, [entries]);

    const addUploaded = (uploaded: AdsAttachment[]) => {
        if (!uploaded.length) return;
        setAttachments((prev) => {
            const seen = new Set(prev.map(attachmentKey));
            return [...prev, ...uploaded.filter((item) => {
                const key = attachmentKey(item);
                if (!key || seen.has(key)) return false;
                seen.add(key);
                return true;
            })];
        });
    };

    const handleFiles = async (files: File[]) => {
        if (!files.length || disabled) return;
        setUploadError('');
        const valid: File[] = [];
        for (const file of files) {
            const issue = attachmentSizeError(file);
            if (issue === 'kind') setUploadError(t('attachment_err_kind'));
            else if (issue === 'size') setUploadError(t('attachment_err_size', { name: file.name }));
            else valid.push(file);
        }
        if (!valid.length) return;
        setUploading(true);
        try {
            const { attachments: uploaded, failures } = await uploadAdsAttachments(valid);
            addUploaded(uploaded);
            if (failures && !uploaded.length) setUploadError(t('attachment_err_upload', { name: valid[0]?.name || '' }));
        } finally {
            setUploading(false);
        }
    };

    // ── Ctrl+V تصویر — paste رسانه‌ای هر جای پنل چت (الگوی چت استودیو) ──
    const handleFilesRef = useRef(handleFiles);
    useEffect(() => {
        handleFilesRef.current = handleFiles;
    });
    useEffect(() => {
        if (disabled) return;
        const onWindowPaste = (event: Event) => {
            const clipboard = (event as ClipboardEvent).clipboardData;
            const media = extractClipboardMediaFiles(clipboard);
            if (!media.length) return;
            const target = event.target;
            const insidePanel = Boolean(target instanceof Node && panelRef.current?.contains(target));
            // ورودی متنیِ بیرون پنل چت مال ما نیست — paste متنی‌اش دست‌نخورده بماند
            if (!insidePanel && isEditablePasteTarget(target)) return;
            event.preventDefault();
            void handleFilesRef.current(media.map((item) => item.file));
        };
        window.addEventListener('paste', onWindowPaste);
        return () => window.removeEventListener('paste', onWindowPaste);
    }, [disabled]);

    const hasPrompt = Boolean(promptValue.replace(MENTION_TOKEN_PATTERN, '').trim());
    const canSend = !locked && !uploading && hasPrompt && (effectiveMode !== 'edit' || Boolean(selectedCut));

    const send = () => {
        if (!canSend) return;
        const parts = buildSendPayloadParts(promptValue, mentions, attachments);
        if (!parts.prompt) return;
        onSend({
            mode: effectiveMode === 'editAll' ? 'edit' : effectiveMode,
            scope: effectiveMode === 'editAll' ? 'all' : 'cut',
            prompt: parts.prompt,
            modelId: effectiveModelId,
            durationSeconds: duration,
            cutsCount,
            withSound,
            attachments: parts.attachments,
        });
        setPromptValue('');
        setMentions([]);
        setAttachments([]);
        setEditingId(null);
    };

    /** ویرایش پیام ارسال‌شده — چت تا قبل از آن بریده و کامپوزر از همان پیکربندی پر می‌شود */
    const startEdit = (entry: ChatEntry) => {
        if (locked) return;
        const payload = entry.sentPayload;
        onEditEntry?.(entry.id);
        if (payload) {
            setMode(payload.mode === 'edit' && payload.scope === 'all'
                ? 'editAll'
                : payload.mode === 'elements' ? 'edit' : payload.mode);
            if (payload.modelId) setModelId(payload.modelId);
            setDuration(payload.durationSeconds);
            setCutsCount(payload.cutsCount);
            setWithSound(payload.withSound);
            setAttachments(payload.attachments || []);
            setPromptValue(payload.prompt);
            setMentions([]);
        }
        setEditingId(entry.id);
    };

    const copyEntryText = async (entry: ChatEntry) => {
        if (!entry.text) return;
        try {
            await navigator.clipboard.writeText(entry.text);
        } catch {
            return;
        }
        setCopiedId(entry.id);
        window.setTimeout(() => setCopiedId((current) => (current === entry.id ? null : current)), 1600);
    };

    // ── گزینه‌های چیپ‌ها ──
    const modeOptions = useMemo<ComposerChipOption<ComposerMode>[]>(() => [
        {
            value: 'new',
            label: t('agent_mode_new', { defaultValue: 'کات جدید' }),
            description: t('agent_mode_new_hint', { defaultValue: 'یک کات تازه از روی پرامپت تو' }),
            icon: <LuSquarePlus size={14} />,
        },
        {
            value: 'auto',
            label: t('agent_mode_auto', { defaultValue: 'ساخت خودکار ویدیو' }),
            description: t('agent_mode_auto_hint', { defaultValue: 'استوری‌بورد کامل؛ کات‌ها یکی‌یکی ساخته می‌شوند' }),
            icon: <LuWandSparkles size={14} />,
        },
        {
            value: 'edit',
            label: t('mode_edit'),
            description: selectedCut
                ? t('agent_mode_edit_hint', { title: selectedCut.title, defaultValue: 'روی کات انتخابی: «{{title}}»' })
                : undefined,
            disabled: !selectedCut,
            disabledHint: t('agent_no_cut_hint', { defaultValue: 'اول یک کات انتخاب کن' }),
            icon: <LuPencil size={14} />,
        },
        {
            value: 'editAll',
            label: t('agent_mode_edit_all', { defaultValue: 'ویرایش همه‌ی کات‌ها' }),
            description: t('agent_mode_edit_all_hint', { defaultValue: 'یک دستور، روی همه‌ی کات‌ها' }),
            disabled: !hasCuts,
            disabledHint: t('agent_no_cuts_hint', { defaultValue: 'هنوز کاتی ساخته نشده' }),
            icon: <LuLayers size={14} />,
        },
    ], [hasCuts, selectedCut, t]);
    const currentMode = modeOptions.find((option) => option.value === effectiveMode) || modeOptions[0];

    const modelOptions = useMemo<ComposerChipOption<string>[]>(() => models.map((model) => ({
        value: model._id,
        label: model.displayName || model.name,
        icon: sanitizeSvg(model.iconSvg)
            ? <SvgMarkup svg={model.iconSvg} className={styles.modelSvg} />
            : <LuCpu size={14} />,
    })), [models]);

    const durationOptions = useMemo<ComposerChipOption<number>[]>(() => DURATION_OPTIONS.map((option) => ({
        value: option,
        label: option === 0
            ? t('duration_auto_short', { defaultValue: 'خودکار' })
            : t('seconds_option', { n: option }),
        description: option === 0 ? t('agent_duration_auto_hint', { defaultValue: 'طول را هوش مصنوعی از محتوا انتخاب می‌کند' }) : undefined,
    })), [t]);

    const cutsOptions = useMemo<ComposerChipOption<number>[]>(() => AUTO_CUT_COUNT_OPTIONS.map((option) => ({
        value: option,
        label: option === 0 ? t('duration_auto_short', { defaultValue: 'خودکار' }) : t('cuts_count', { n: option }),
        description: option === 0 ? t('cuts_count_auto') : undefined,
    })), [t]);

    const placeholder = effectiveMode === 'auto'
        ? t('agent_placeholder_auto', { defaultValue: 'کل ویدیو را توصیف کن تا کات‌ها را بچینم و بسازم…' })
        : effectiveMode === 'edit'
            ? t('agent_placeholder_edit', { defaultValue: 'چه تغییری روی این کات بدهم؟' })
            : effectiveMode === 'editAll'
                ? t('agent_placeholder_edit_all', { defaultValue: 'دستوری که روی همه‌ی کات‌ها اعمال شود…' })
                : t('agent_placeholder_new', { defaultValue: 'کاتی که می‌خواهی را توصیف کن…' });

    // Enter در ادیتور خط تازه است؛ Ctrl/Cmd+Enter پیش از ادیتور گرفته و ارسال می‌شود
    const onComposerKeyDownCapture = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key !== 'Enter' || !(event.ctrlKey || event.metaKey)) return;
        event.preventDefault();
        event.stopPropagation();
        send();
    };

    return (
        <div ref={panelRef} className={styles.root}>
            <div ref={scrollRef} className={styles.messages}>
                {entries.length === 0 ? (
                    <div className={styles.empty}>
                        <span className={styles.emptyIcon} aria-hidden><LuSparkles size={18} /></span>
                        <strong>{t('agent_empty_title', { defaultValue: 'چه ویدیویی بسازیم؟' })}</strong>
                        <span>{t('chat_empty')}</span>
                    </div>
                ) : null}

                {entries.map((entry) => {
                    if (entry.role === 'user') {
                        const copied = copiedId === entry.id;
                        return (
                            <div key={entry.id} className={styles.userTurn}>
                                <div className={styles.userBox}>
                                    {(entry.attachments?.length || 0) > 0 ? (
                                        <div className={styles.userAttachRow}>
                                            {entry.attachments!.map((item, index) => (
                                                <EntryAttachment key={`${attachmentKey(item)}-${index}`} item={item} />
                                            ))}
                                        </div>
                                    ) : null}
                                    <div className={styles.userText} dir="auto">{entry.text}</div>
                                </div>
                                <div className={styles.turnActions}>
                                    {entry.text ? (
                                        <button
                                            type="button"
                                            onClick={() => void copyEntryText(entry)}
                                            aria-label={copied ? t('chat_copied', { defaultValue: 'کپی شد' }) : t('chat_copy', { defaultValue: 'کپی' })}
                                            title={copied ? t('chat_copied', { defaultValue: 'کپی شد' }) : t('chat_copy', { defaultValue: 'کپی' })}
                                        >
                                            {copied ? <LuCheck size={13} /> : <LuCopy size={13} />}
                                        </button>
                                    ) : null}
                                    {onEditEntry ? (
                                        <button
                                            type="button"
                                            disabled={locked}
                                            onClick={() => startEdit(entry)}
                                            aria-label={t('chat_edit', { defaultValue: 'ویرایش' })}
                                            title={t('chat_edit', { defaultValue: 'ویرایش' })}
                                        >
                                            <LuPencil size={13} />
                                        </button>
                                    ) : null}
                                </div>
                            </div>
                        );
                    }
                    if (entry.role === 'system') {
                        return (
                            <div key={entry.id} className={styles.systemLine} dir="auto">
                                <LuCircleAlert size={13} aria-hidden />
                                <span>{entry.text}</span>
                            </div>
                        );
                    }
                    return <AssistantTurn key={entry.id} entry={entry} onOpenCut={onOpenCut} />;
                })}
            </div>

            {/* ── کامپوزر — همان ساختار و استایل کامپوزر چت استودیو ── */}
            <div className={`${inputStyles.composer} ${styles.composer}`} onKeyDownCapture={onComposerKeyDownCapture}>
                {editingId != null ? (
                    <div className={inputStyles.editModeBanner} role="status">
                        <span>
                            <LuPencil aria-hidden />
                            <span>
                                <strong>{t('chat_edit_mode', { defaultValue: 'ویرایش پیام' })}</strong>
                                <small>{t('chat_edit_mode_hint', { defaultValue: 'چت به قبل از این پیام برگشته است — دوباره بنویس و بفرست.' })}</small>
                            </span>
                        </span>
                        <button type="button" onClick={() => setEditingId(null)} disabled={locked}>
                            <LuX />
                            {t('chat_cancel', { defaultValue: 'انصراف' })}
                        </button>
                    </div>
                ) : null}
                <div className={inputStyles.inputCardWrapper}>
                    <div className={`${inputStyles.mainInputArea} ${styles.inputArea}`}>
                        {/* زمینه‌ی ارسال — مثل چیپ فایل‌های Cursor: پیام روی کدام کات اعمال می‌شود */}
                        {effectiveMode === 'edit' && selectedCut ? (
                            <div className={styles.contextRow}>
                                <span className={styles.contextChip} title={selectedCut.title}>
                                    <LuClapperboard size={12} aria-hidden />
                                    <span dir="auto">{selectedCut.title}</span>
                                    <em dir="ltr">v{selectedCut.currentVersion}</em>
                                </span>
                            </div>
                        ) : effectiveMode === 'editAll' ? (
                            <div className={styles.contextRow}>
                                <span className={styles.contextChip}>
                                    <LuLayers size={12} aria-hidden />
                                    <span>{t('chat_scope_all')}</span>
                                </span>
                            </div>
                        ) : null}

                        {attachments.length > 0 || uploading ? (
                            <div className={styles.attachStrip}>
                                {attachments.map((item, index) => (
                                    <span key={`${attachmentKey(item)}-${index}`} className={styles.attachThumb} title={item.label || item.type}>
                                        {item.type === 'image' && item.url ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={item.url} alt="" />
                                        ) : (
                                            <em>{item.type === 'video' ? '🎬' : '🎵'}</em>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== index))}
                                            aria-label={t('attachment_remove')}
                                            title={t('attachment_remove')}
                                        >
                                            <LuX size={10} />
                                        </button>
                                    </span>
                                ))}
                                {uploading ? (
                                    <span className={`${styles.attachThumb} ${styles.attachUploading}`}>
                                        <LuLoaderCircle size={14} className={styles.spin} />
                                    </span>
                                ) : null}
                            </div>
                        ) : null}
                        {uploadError ? <div className={styles.uploadError}>{uploadError}</div> : null}

                        <div className={`${inputStyles.composerTextSlot} ${styles.textSlot}`}>
                            <MediaMentionComposer
                                className={inputStyles.composerTextarea}
                                value={promptValue}
                                mentions={mentions}
                                onChange={(next, nextMentions) => {
                                    setPromptValue(next);
                                    setMentions(nextMentions);
                                }}
                                placeholder={placeholder}
                                minRows={1}
                                maxHeight={180}
                                dir="auto"
                                disabled={disabled}
                            />
                        </div>

                        <div className={inputStyles.bottomControls}>
                            <div className={inputStyles.leftTools}>
                                <button
                                    type="button"
                                    className={inputStyles.addBtn}
                                    disabled={disabled || uploading}
                                    onClick={() => fileRef.current?.click()}
                                    aria-label={t('attachment_add')}
                                    title={t('attachment_add')}
                                >
                                    {uploading ? <LuLoaderCircle size={14} className={styles.spin} /> : <FiPlus />}
                                </button>
                            </div>

                            <div className={inputStyles.compactToolbar}>
                                <div className={`${toolbarStyles.toolbar} ${styles.chips}`}>
                                    <ComposerChip<ComposerMode>
                                        icon={currentMode.icon}
                                        label={currentMode.label}
                                        title={t('agent_mode_title', { defaultValue: 'حالت' })}
                                        options={modeOptions}
                                        value={effectiveMode}
                                        onChange={setMode}
                                        disabled={disabled}
                                        menuWidth={268}
                                    />
                                    <ComposerChip<string>
                                        icon={selectedModel && sanitizeSvg(selectedModel.iconSvg)
                                            ? <SvgMarkup svg={selectedModel.iconSvg} className={styles.modelSvg} />
                                            : <LuCpu size={14} />}
                                        label={selectedModel ? (selectedModel.displayName || selectedModel.name) : t('no_models')}
                                        title={t('agent_model_title', { defaultValue: 'مدل متنی' })}
                                        options={modelOptions}
                                        value={effectiveModelId}
                                        onChange={setModelId}
                                        disabled={disabled || !models.length}
                                        menuWidth={260}
                                    />
                                    {effectiveMode === 'new' || effectiveMode === 'edit' ? (
                                        <ComposerChip<number>
                                            icon={<LuTimer size={14} />}
                                            label={duration === 0 ? t('duration_auto_short', { defaultValue: 'خودکار' }) : `${duration}s`}
                                            title={t('duration_label')}
                                            options={durationOptions}
                                            value={duration}
                                            onChange={setDuration}
                                            disabled={disabled}
                                            menuWidth={220}
                                        />
                                    ) : null}
                                    {effectiveMode === 'auto' ? (
                                        <ComposerChip<number>
                                            icon={<LuClapperboard size={14} />}
                                            label={cutsCount === 0 ? t('duration_auto_short', { defaultValue: 'خودکار' }) : t('cuts_count', { n: cutsCount })}
                                            title={t('cuts_count_label')}
                                            options={cutsOptions}
                                            value={cutsCount}
                                            onChange={setCutsCount}
                                            disabled={disabled}
                                            menuWidth={240}
                                        />
                                    ) : null}
                                    <button
                                        type="button"
                                        className={`${toolbarStyles.chip} ${toolbarStyles.chipIconOnly} ${styles.soundChip} ${withSound ? toolbarStyles.modeChipActive : ''}`}
                                        aria-pressed={withSound}
                                        aria-label={t('with_sound_label')}
                                        title={t('with_sound_label')}
                                        disabled={disabled}
                                        onClick={() => setWithSound((value) => !value)}
                                    >
                                        <LuAudioLines size={15} />
                                    </button>
                                </div>
                            </div>

                            <div className={inputStyles.rightTools}>
                                <button
                                    type="button"
                                    className={inputStyles.sendBtn}
                                    onClick={send}
                                    disabled={!canSend}
                                    aria-label={t('send_btn_title')}
                                    title={t('send_btn_title')}
                                >
                                    {busy ? <LuLoaderCircle size={14} className={styles.spin} /> : <RiSendInsLine size={14} />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <input
                    ref={fileRef}
                    type="file"
                    accept="image/*,video/*,audio/*"
                    multiple
                    hidden
                    onChange={(event) => {
                        const files = Array.from(event.target.files || []);
                        event.target.value = '';
                        void handleFiles(files);
                    }}
                />
            </div>
        </div>
    );
}
