'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LuAudioLines, LuCheck, LuCopy, LuLoaderCircle, LuPencil, LuWandSparkles, LuX } from 'react-icons/lu';
import { MediaMentionComposer } from '@/app/(developers)/projects/components/MediaMentionComposer';
import type { StudioMediaMention } from '@/app/(developers)/projects/lib/studio-media';
import {
    extractClipboardMediaFiles,
    isEditablePasteTarget,
} from '@/app/(developers)/projects/[projectId]/lib/clipboard-media';
import type { ProviderModelItem } from '@/app/(developers)/projects/lib/providers-api';
import type { AdsAttachment, AdsAutoJob, AdsCutListItem } from '@/app/(marketing)/ads-video/lib/ads-video-api';
import { uploadAdsAttachments } from '@/app/(marketing)/ads-video/lib/attach-upload';
import AttachmentPicker from './AttachmentPicker';
import styles from './ads-chat.module.scss';

// ────────────────────────────── Chat types ──────────────────────────────

export type ChatStepStatus = 'pending' | 'running' | 'done' | 'error';

export interface ChatStep {
    id: string;
    label: string;
    status: ChatStepStatus;
    detail?: string;
    /** کاتِ مربوط به این گام — در چک‌لیست قابل کلیک برای پرش به کات */
    cutId?: string;
    /** زمان شروع/پایان (ms) — برای زمان سپری‌شده‌ی گام در حال اجرا و مدت گام تمام‌شده */
    startedAt?: number;
    finishedAt?: number;
}

export interface ChatEntry {
    id: number;
    role: 'user' | 'assistant' | 'system';
    text?: string;
    /** مراحل اجرا به سبک Cursor — هر کاری که در جریان است اینجا دیده می‌شود */
    steps?: ChatStep[];
    /** چک‌لیست کات‌ها (to-do) — هر کات برنامه‌ریزی‌شده با وضعیت زنده */
    todos?: ChatStep[];
    /** زمان شروع/پایان کل پاسخ (ms) */
    startedAt?: number;
    finishedAt?: number;
    error?: string;
    meta?: string;
    /** پیوست‌های همین پیام کاربر — مثل چت استودیو داخل حباب نشان داده می‌شوند */
    attachments?: AdsAttachment[];
    /** کات‌های تولیدشده — کارت کوچک با دکمه‌ی پرش به کات */
    cutRefs?: { cutId: string; title: string }[];
    /** ویرایش سریع المان‌ها — چک‌لیست تغییرهای پیشنهادی AI قبل از اعمال */
    elementPlan?: ChatElementPlan;
    /** پیکربندی لحظه‌ی ارسال — برای «ویرایش پیام» و بازگشت به همان نقطه */
    sentPayload?: ChatSendPayload;
}

/** چک‌لیست تغییرهای پیشنهادی برای المان‌های یک کات (ویرایش سریع بدون بازتولید) */
export interface ChatElementPlan {
    cutId: string;
    cutTitle: string;
    summary: string;
    changes: Array<{
        id: string;
        label: string;
        type: string;
        value: unknown;
        current?: unknown;
    }>;
    selectedIds: string[];
    status: 'pending' | 'applied' | 'reverted' | 'failed';
    error?: string;
    /** مقادیر overrides قبل از اعمال — برای بازگردانی یک‌کلیکی */
    previousOverrides?: Record<string, unknown> | null;
}

export type ChatComposerMode = 'new' | 'edit' | 'auto' | 'elements';

export interface ChatSendPayload {
    mode: ChatComposerMode;
    /** اعمال روی فقط همین کات یا همه‌ی کات‌ها (فقط در حالت ویرایش) */
    scope: 'cut' | 'all';
    /** متن تمیز — توکن‌های mention با @label جایگزین شده‌اند */
    prompt: string;
    modelId: string;
    durationSeconds: number;
    cutsCount: number;
    withSound: boolean;
    attachments: AdsAttachment[];
}

/** حداقل اطلاعاتی از کات که چت برای نمایش هدف ویرایش لازم دارد — هم لیست و هم کات کامل را می‌پذیرد */
export type AdsChatCutTarget = Pick<AdsCutListItem, '_id' | 'title' | 'currentVersion'>;

interface ChatPanelProps {
    entries: ChatEntry[];
    disabled?: boolean;
    models: ProviderModelItem[];
    selectedCut: AdsChatCutTarget | null;
    autoJob: AdsAutoJob | null;
    /** کات انتخابی در حالت تک‌نمایش باز است (المان‌ها خواندنی‌اند) */
    hasElements?: boolean;
    /** شناسه‌ی entry چک‌لیستی که در حال اعمال است */
    applyingPlanId?: number | null;
    onSend(payload: ChatSendPayload): void;
    onOpenCut(cutId: string): void;
    /** ویرایش پیام کاربر — چت تا قبل از همان entry بریده می‌شود */
    onEditEntry?(entryId: number): void;
    onTogglePlanChange?(entryId: number, selectedIds: string[]): void;
    onConfirmElementPlan?(entryId: number, selectedIds: string[]): void;
    onRevertElementPlan?(entryId: number): void;
}

const MENTION_TOKEN_PATTERN = /@\[([^\]]+)\]\(asset:([^)]+)\)/g;

// 0 = طول خودکار — خود AI بر اساس محتوا تصمیم می‌گیرد (دیفالت، حتی روی تک‌کات)
const DURATION_OPTIONS = [0, 3, 5, 8, 10, 15, 20, 30];
const AUTO_CUT_COUNT_OPTIONS = [0, 3, 4, 5, 6]; // 0 = خود AI تصمیم می‌گیرد

/** تبدیل متنِ ادیتور mention به پرامپت تمیز + پیوست‌های واقعی */
export function buildSendPayloadParts(
    value: string,
    mentions: StudioMediaMention[],
    pickerAttachments: AdsAttachment[],
): { prompt: string; attachments: AdsAttachment[] } {
    const prompt = (value || '').replace(MENTION_TOKEN_PATTERN, (_m, label) => `@${label}`).trim();
    const merged: AdsAttachment[] = [];
    const seen = new Set<string>();
    const push = (item: AdsAttachment | undefined) => {
        if (!item) return;
        const key = item.assetId || item.fileKey || item.url || '';
        if (!key || seen.has(key)) return;
        seen.add(key);
        merged.push(item);
    };
    for (const mention of mentions) {
        push({
            assetId: mention.assetId,
            fileId: mention.fileId,
            fileKey: mention.fileKey,
            url: mention.url,
            type: mention.type,
            label: mention.label,
        });
    }
    for (const item of pickerAttachments) push(item);
    return { prompt, attachments: merged };
}

function StepGlyph({ status }: { status: ChatStepStatus }) {
    if (status === 'running') return <LuLoaderCircle size={12} className={styles.spin} />;
    if (status === 'done') return <span className={styles.stepDone}>✓</span>;
    if (status === 'error') return <span className={styles.stepError}>✕</span>;
    return <span className={styles.stepPending}>•</span>;
}

/** بندانگشتی پیوست داخل حباب پیام کاربر — همان چیدمان چت استودیو (۶۴px) */
function EntryAttachment({ item }: { item: AdsAttachment }) {
    if (item.type === 'image' && item.url) {
        return (
            <span className={styles.chatAttachThumb}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.url} alt={item.label || ''} loading="lazy" />
            </span>
        );
    }
    return (
        <span className={styles.chatAttachThumb} title={item.label || item.type}>
            <em>{item.type === 'video' ? '🎬' : '🎵'}</em>
        </span>
    );
}

// ────────────────────────────── Component ──────────────────────────────

export function ChatPanel({
    entries,
    disabled,
    models,
    selectedCut,
    autoJob,
    hasElements = false,
    applyingPlanId = null,
    onSend,
    onOpenCut,
    onEditEntry,
    onTogglePlanChange,
    onConfirmElementPlan,
    onRevertElementPlan,
}: ChatPanelProps) {
    const { t } = useTranslation('adsVideo');
    const [mode, setMode] = useState<ChatComposerMode>('new');
    const [modelId, setModelId] = useState('');
    // دیفالت: طول خودکار — مدل خودش بر اساس محتوا انتخاب می‌کند
    const [duration, setDuration] = useState(0);
    const [cutsCount, setCutsCount] = useState(0);
    const [withSound, setWithSound] = useState(false);
    const [scope, setScope] = useState<'cut' | 'all'>('cut');
    const [attachments, setAttachments] = useState<AdsAttachment[]>([]);
    const [promptValue, setPromptValue] = useState('');
    const [mentions, setMentions] = useState<StudioMediaMention[]>([]);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [pasting, setPasting] = useState(false);
    const [pasteError, setPasteError] = useState('');
    const [copiedId, setCopiedId] = useState<number | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    // مدل انتخابی — اگر کاربر چیزی انتخاب نکرده باشد اولین مدل فعال
    const effectiveModelId = modelId || models[0]?._id || '';

    // با تعویض کاتِ انتخابی، تنظیم طول در همان render به «خودکار» برمی‌گردد
    // (الگوی adjust-state-during-render به‌جای effect)
    const [prevCutId, setPrevCutId] = useState(selectedCut?._id || '');
    const nextCutId = selectedCut?._id || '';
    if (prevCutId !== nextCutId) {
        setPrevCutId(nextCutId);
        setDuration(0);
    }

    // پیام جدید → اسکرول به پایین
    useEffect(() => {
        const box = scrollRef.current;
        if (box) box.scrollTop = box.scrollHeight;
    }, [entries]);

    // ── Ctrl+V تصویر — همان الگوی چت استودیو: paste رسانه‌ای هر جای پنل چت ──
    useEffect(() => {
        if (disabled) return;
        const handlePastedMedia = async (clipboard: DataTransfer | null) => {
            const media = extractClipboardMediaFiles(clipboard);
            if (!media.length) return;
            setPasting(true);
            setPasteError('');
            try {
                const { attachments: uploaded, failures } = await uploadAdsAttachments(media.map((item) => item.file));
                if (uploaded.length) {
                    setAttachments((prev) => {
                        const seen = new Set(prev.map((item) => item.assetId || item.fileKey || item.url || ''));
                        return [...prev, ...uploaded.filter((item) => {
                            const key = item.assetId || item.fileKey || item.url || '';
                            if (!key || seen.has(key)) return false;
                            seen.add(key);
                            return true;
                        })];
                    });
                }
                if (failures && !uploaded.length) {
                    setPasteError(t('paste_err_upload', { defaultValue: 'آپلود تصویر پیست‌شده ناموفق بود.' }));
                }
            } finally {
                setPasting(false);
            }
        };
        const onWindowPaste = (event: Event) => {
            const clipboard = (event as ClipboardEvent).clipboardData;
            if (!extractClipboardMediaFiles(clipboard).length) return;
            const target = event.target;
            const insidePanel = Boolean(target instanceof Node && panelRef.current?.contains(target));
            // ورودی متنیِ بیرون پنل چت مال ما نیست — paste متنی‌اش دست‌نخورده بماند
            if (!insidePanel && isEditablePasteTarget(target)) return;
            event.preventDefault();
            void handlePastedMedia(clipboard);
        };
        window.addEventListener('paste', onWindowPaste);
        return () => window.removeEventListener('paste', onWindowPaste);
    }, [disabled, t]);

    const canSend = useMemo(() => {
        if (disabled || autoJob) return false;
        if (!promptValue.replace(MENTION_TOKEN_PATTERN, '').trim()) return false;
        if (mode === 'edit') return Boolean(selectedCut);
        if (mode === 'elements') return Boolean(selectedCut) && hasElements;
        return true;
    }, [autoJob, disabled, mode, promptValue, selectedCut, hasElements]);

    const send = () => {
        if (!canSend) return;
        const parts = buildSendPayloadParts(promptValue, mentions, attachments);
        if (!parts.prompt) return;
        onSend({
            mode,
            scope: mode === 'edit' ? scope : 'cut',
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

    /** ویرایش پیام ارسال‌شده — چت تا قبل از آن entry بریده و کامپوزر از همان نقطه پر می‌شود */
    const startEdit = (entry: ChatEntry) => {
        if (disabled || autoJob) return;
        const payload = entry.sentPayload;
        onEditEntry?.(entry.id);
        if (payload) {
            setMode(payload.mode);
            setScope(payload.scope);
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

    const cancelEdit = () => setEditingId(null);

    const copyEntryText = async (entry: ChatEntry) => {
        const value = entry.text || '';
        if (!value) return;
        try {
            await navigator.clipboard.writeText(value);
        } catch {
            return;
        }
        setCopiedId(entry.id);
        window.setTimeout(() => setCopiedId((current) => (current === entry.id ? null : current)), 1600);
    };

    const placeholder = mode === 'auto'
        ? t('prompt_auto_placeholder')
        : mode === 'new'
            ? t('prompt_new_placeholder')
            : mode === 'elements'
                ? t('prompt_elements_placeholder', { defaultValue: 'مثلاً: تیتر را قرمز کن و متن دکمه را بگذار «همین حالا بخر»' })
                : t('prompt_edit_placeholder');

    return (
        <div ref={panelRef} className={`${styles.chatRoot} ${styles.chatPanel}`}>
            <div ref={scrollRef} className={styles.chatMessages}>
                {entries.length === 0 && (
                    <div className={styles.paneEmpty}>{t('chat_empty')}</div>
                )}
                {entries.map((entry) => {
                    if (entry.role === 'user') {
                        return (
                            <div key={entry.id} className={styles.chatTurn}>
                                <div className={styles.chatUser}>
                                    {(entry.attachments?.length || 0) > 0 && (
                                        <div className={styles.chatAttachRow}>
                                            {entry.attachments!.map((item, index) => (
                                                <EntryAttachment key={`${item.fileKey || item.url}-${index}`} item={item} />
                                            ))}
                                        </div>
                                    )}
                                    {entry.text}
                                </div>
                                <div className={`${styles.messageActions} ${styles.userActions}`}>
                                    {entry.text && (
                                        <button
                                            type="button"
                                            title={copiedId === entry.id ? t('chat_copied', { defaultValue: 'کپی شد' }) : t('chat_copy', { defaultValue: 'کپی' })}
                                            aria-label={copiedId === entry.id ? t('chat_copied', { defaultValue: 'کپی شد' }) : t('chat_copy', { defaultValue: 'کپی' })}
                                            onClick={() => void copyEntryText(entry)}
                                        >
                                            {copiedId === entry.id ? <LuCheck size={13} /> : <LuCopy size={13} />}
                                            <span>{copiedId === entry.id ? t('chat_copied', { defaultValue: 'کپی شد' }) : t('chat_copy', { defaultValue: 'کپی' })}</span>
                                        </button>
                                    )}
                                    {onEditEntry && (
                                        <button
                                            type="button"
                                            disabled={Boolean(disabled || autoJob)}
                                            title={t('chat_edit', { defaultValue: 'ویرایش پیام' })}
                                            aria-label={t('chat_edit', { defaultValue: 'ویرایش پیام' })}
                                            onClick={() => startEdit(entry)}
                                        >
                                            <LuPencil size={13} />
                                            <span>{t('chat_edit', { defaultValue: 'ویرایش' })}</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    }
                    if (entry.role === 'system') {
                        return (
                            <div key={entry.id} className={styles.chatSystem}>
                                {entry.text}
                            </div>
                        );
                    }
                    return (
                        <div key={entry.id} className={`${styles.chatAssistant} ${entry.error ? styles.chatAssistantError : ''}`}>
                            {entry.text && <p className={styles.chatAssistantText}>{entry.text}</p>}
                            {(entry.steps?.length || 0) > 0 && (
                                <ul className={styles.chatSteps}>
                                    {entry.steps!.map((step) => (
                                        <li key={step.id} className={styles[`step_${step.status}`]}>
                                            <StepGlyph status={step.status} />
                                            <span className={styles.stepLabel}>
                                                {step.label}
                                                {step.detail && <em className={styles.stepDetail}>{step.detail}</em>}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {entry.elementPlan && (
                                <ElementPlanCard
                                    plan={entry.elementPlan}
                                    applying={applyingPlanId === entry.id}
                                    disabled={Boolean(disabled || autoJob)}
                                    onToggle={(changeId) => {
                                        const plan = entry.elementPlan!;
                                        if (plan.status !== 'pending') return;
                                        const selectedIds = plan.selectedIds.includes(changeId)
                                            ? plan.selectedIds.filter((id) => id !== changeId)
                                            : [...plan.selectedIds, changeId];
                                        onTogglePlanChange?.(entry.id, selectedIds);
                                    }}
                                    onToggleAll={() => {
                                        const plan = entry.elementPlan!;
                                        if (plan.status !== 'pending') return;
                                        const selectedIds = plan.selectedIds.length === plan.changes.length
                                            ? []
                                            : plan.changes.map((change) => change.id);
                                        onTogglePlanChange?.(entry.id, selectedIds);
                                    }}
                                    onConfirm={() => onConfirmElementPlan?.(entry.id, entry.elementPlan!.selectedIds)}
                                    onRevert={() => onRevertElementPlan?.(entry.id)}
                                />
                            )}
                            {entry.error && <p className={styles.chatError}>{entry.error}</p>}
                            {entry.cutRefs && entry.cutRefs.length > 0 && (
                                <div className={styles.chatCutRefs}>
                                    {entry.cutRefs.map((ref) => (
                                        <button
                                            key={ref.cutId}
                                            type="button"
                                            className={styles.chatCutRef}
                                            onClick={() => onOpenCut(ref.cutId)}
                                        >
                                            {ref.title}
                                        </button>
                                    ))}
                                </div>
                            )}
                            {entry.meta && <span className={styles.chatMeta}>{entry.meta}</span>}
                        </div>
                    );
                })}
            </div>

            <div className={styles.chatComposer}>
                {editingId != null && (
                    <div className={styles.editModeBanner} role="status">
                        <span>
                            <LuPencil aria-hidden />
                            <span>
                                <strong>{t('chat_edit_mode', { defaultValue: 'ویرایش پیام' })}</strong>
                                <small>{t('chat_edit_mode_hint', { defaultValue: 'چت به قبل از این پیام برگشته است — دوباره بنویس و بفرست.' })}</small>
                            </span>
                        </span>
                        <button type="button" onClick={cancelEdit} disabled={Boolean(disabled || autoJob)}>
                            <LuX size={13} />
                            {t('chat_cancel', { defaultValue: 'انصراف' })}
                        </button>
                    </div>
                )}
                {/* ردیف تنظیمات فشرده — تب‌های حالت + سلکت‌ها بدون لیبل (عنوان با aria-label/title)
                    در عرض کم به دو خط مرتب wrap می‌شود */}
                <div className={styles.composerControls}>
                    <div className={styles.composerMode}>
                        <button
                            type="button"
                            className={mode === 'new' ? styles.modeActive : ''}
                            onClick={() => setMode('new')}
                        >
                            {t('mode_single')}
                        </button>
                        <button
                            type="button"
                            className={mode === 'auto' ? styles.modeAuto : ''}
                            onClick={() => setMode('auto')}
                        >
                            {t('mode_auto')}
                        </button>
                        <button
                            type="button"
                            className={mode === 'edit' ? styles.modeActive : ''}
                            disabled={!selectedCut}
                            onClick={() => setMode('edit')}
                        >
                            {t('mode_edit')}
                        </button>
                        <button
                            type="button"
                            className={mode === 'elements' ? styles.modeQuick : ''}
                            disabled={!selectedCut || !hasElements}
                            title={hasElements
                                ? t('mode_elements_title', { defaultValue: 'ویرایش سریع مقدار المان‌ها — بدون بازتولید کات' })
                                : t('mode_elements_need_stage', { defaultValue: 'اول کات را در حالت تک‌نمایش باز کن' })}
                            onClick={() => setMode('elements')}
                        >
                            ⚡ {t('mode_elements', { defaultValue: 'ویرایش سریع' })}
                        </button>
                    </div>

                    <select
                        className={styles.composerSelect}
                        value={effectiveModelId}
                        onChange={(e) => setModelId(e.target.value)}
                        aria-label={t('model_label')}
                        title={t('model_label')}
                    >
                        {models.length === 0 && <option value="">{t('no_models')}</option>}
                        {models.map((model) => (
                            <option key={model._id} value={model._id}>
                                {model.displayName || model.name}
                            </option>
                        ))}
                    </select>

                    {(mode === 'new' || mode === 'edit') && (
                        <select
                            className={styles.composerSelect}
                            value={duration}
                            onChange={(e) => setDuration(Number(e.target.value))}
                            aria-label={t('duration_label')}
                            title={t('duration_label')}
                        >
                            {DURATION_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                    {option === 0
                                        ? t('duration_auto_short', { defaultValue: 'خودکار' })
                                        : t('seconds_option', { n: option })}
                                </option>
                            ))}
                        </select>
                    )}

                    {mode === 'auto' && (
                        <select
                            className={styles.composerSelect}
                            value={cutsCount}
                            onChange={(e) => setCutsCount(Number(e.target.value))}
                            aria-label={t('cuts_count_label')}
                            title={t('cuts_count_label')}
                        >
                            {AUTO_CUT_COUNT_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                    {option === 0 ? t('cuts_count_auto') : t('cuts_count', { n: option })}
                                </option>
                            ))}
                        </select>
                    )}

                    {(mode === 'edit' || mode === 'elements') && selectedCut && (
                        <span
                            className={styles.editTargetCompact}
                            title={selectedCut.title}
                        >
                            {mode === 'elements'
                                ? t('edit_target_quick', { defaultValue: 'ویرایش سریع' })
                                : t('edit_target')} <strong>{selectedCut.title}</strong> (v{selectedCut.currentVersion})
                        </span>
                    )}

                    {mode === 'edit' && selectedCut && (
                        <div className={styles.scopeToggle}>
                            <button
                                type="button"
                                className={scope === 'cut' ? styles.scopeActive : ''}
                                onClick={() => setScope('cut')}
                            >
                                {t('chat_scope_cut')}
                            </button>
                            <button
                                type="button"
                                className={scope === 'all' ? styles.scopeActive : ''}
                                onClick={() => setScope('all')}
                            >
                                {t('chat_scope_all')}
                            </button>
                        </div>
                    )}
                </div>

                {pasting && (
                    <div className={styles.pasteUploading}>
                        <LuLoaderCircle size={12} className={styles.spin} />
                        {t('paste_uploading', { defaultValue: 'در حال آپلود تصویر پیست‌شده…' })}
                    </div>
                )}
                {pasteError && <div className={styles.attachmentError}>{pasteError}</div>}

                {/* جعبه‌ی پرامپت — متن بالا، ابزارها (پیوست/صدا/ارسال) در ردیف باریک زیر آن */}
                <div className={styles.chatPromptBox}>
                    <MediaMentionComposer
                        value={promptValue}
                        mentions={mentions}
                        onChange={(next, nextMentions) => {
                            setPromptValue(next);
                            setMentions(nextMentions);
                        }}
                        placeholder={placeholder}
                        minRows={2}
                        maxHeight={140}
                        dir="auto"
                        disabled={disabled}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                                event.preventDefault();
                                send();
                            }
                        }}
                    />
                    <div className={styles.promptToolbar}>
                        <AttachmentPicker attachments={attachments} onChange={setAttachments} disabled={disabled} compact />
                        <button
                            type="button"
                            className={`${styles.soundBtn} ${withSound ? styles.soundBtnOn : ''}`}
                            aria-pressed={withSound}
                            aria-label={t('with_sound_label')}
                            title={t('with_sound_label')}
                            onClick={() => setWithSound((value) => !value)}
                        >
                            <LuAudioLines size={14} />
                        </button>
                        <span className={styles.promptToolbarSpacer} />
                        <button
                            type="button"
                            className={styles.chatSendBtn}
                            disabled={!canSend}
                            title={t('send_btn_title')}
                            aria-label={t('send_btn_title')}
                            onClick={send}
                        >
                            {disabled || autoJob ? <LuLoaderCircle size={14} className={styles.spin} /> : <LuWandSparkles size={14} />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ────────────────────────────── Element plan checklist ──────────────────────────────

/** نمایش کوتاه مقدار المان — رنگ به‌صورت سواچ، بقیه متنی */
function ElementValue({ value, type }: { value: unknown; type: string }) {
    if (type === 'color' && typeof value === 'string' && value) {
        return (
            <span className={styles.planColor}>
                <i style={{ background: value }} />
                <code>{value}</code>
            </span>
        );
    }
    if (type === 'image') {
        const text = typeof value === 'string' && value ? 'تصویر' : '—';
        return <span className={styles.planValueText}>{text}</span>;
    }
    const text = String(value ?? '').slice(0, 60) || '—';
    return <span className={styles.planValueText}>{text}</span>;
}

function ElementPlanCard({
    plan,
    applying,
    disabled,
    onToggle,
    onToggleAll,
    onConfirm,
    onRevert,
}: {
    plan: ChatElementPlan;
    applying: boolean;
    disabled: boolean;
    onToggle(changeId: string): void;
    onToggleAll(): void;
    onConfirm(): void;
    onRevert(): void;
}) {
    const { t } = useTranslation('adsVideo');
    const locked = plan.status !== 'pending';
    const allSelected = plan.selectedIds.length === plan.changes.length;

    if (plan.status === 'failed') {
        return (
            <div className={`${styles.elementPlan} ${styles.planFailed}`}>
                <span className={styles.planTitle}>{plan.summary || t('plan_failed_title', { defaultValue: 'ویرایش سریع ناموفق بود' })}</span>
                {plan.error && <span className={styles.chatError}>{plan.error}</span>}
            </div>
        );
    }

    return (
        <div className={`${styles.elementPlan} ${plan.status === 'reverted' ? styles.planReverted : ''}`}>
            <div className={styles.planHead}>
                <span className={styles.planTitle}>
                    {plan.summary || t('plan_title', { defaultValue: 'تغییرهای پیشنهادی' })}
                </span>
                {plan.status === 'applied' && <span className={styles.planApplied}>{t('plan_applied', { defaultValue: 'اعمال شد' })}</span>}
                {plan.status === 'reverted' && <span className={styles.planRevertedTag}>{t('plan_reverted', { defaultValue: 'بازگردانی شد' })}</span>}
                {plan.status === 'pending' && (
                    <button type="button" className={styles.planToggleAll} onClick={onToggleAll} disabled={disabled || applying}>
                        <input type="checkbox" checked={allSelected} readOnly tabIndex={-1} />
                        <span>{t('plan_select_all', { defaultValue: 'همه' })}</span>
                    </button>
                )}
            </div>

            <div className={styles.planRows}>
                {plan.changes.map((change) => {
                    const checked = plan.selectedIds.includes(change.id);
                    return (
                        <label key={change.id} className={`${styles.planRow} ${locked ? styles.planRowLocked : ''}`}>
                            {!locked && (
                                <input
                                    type="checkbox"
                                    checked={checked}
                                    disabled={disabled || applying}
                                    onChange={() => onToggle(change.id)}
                                />
                            )}
                            <span className={styles.planRowLabel}>{change.label}</span>
                            <span className={styles.planRowValues}>
                                <ElementValue value={change.current} type={change.type} />
                                <em>←</em>
                                <ElementValue value={change.value} type={change.type} />
                            </span>
                        </label>
                    );
                })}
            </div>

            {plan.status === 'pending' && (
                <button
                    type="button"
                    className={styles.planApplyBtn}
                    disabled={plan.selectedIds.length === 0 || applying || disabled}
                    onClick={onConfirm}
                >
                    {applying ? <LuLoaderCircle size={12} className={styles.spin} /> : '✓'}
                    {applying
                        ? t('plan_applying', { defaultValue: 'در حال اعمال…' })
                        : t('plan_apply', { count: plan.selectedIds.length, defaultValue: 'اعمال {{count}} تغییر' })}
                </button>
            )}
            {plan.status === 'applied' && (
                <button type="button" className={styles.planRevertBtn} disabled={disabled || applying} onClick={onRevert}>
                    ↺ {t('plan_revert', { defaultValue: 'بازگردانی مقادیر قبلی' })}
                </button>
            )}
        </div>
    );
}

export default ChatPanel;
