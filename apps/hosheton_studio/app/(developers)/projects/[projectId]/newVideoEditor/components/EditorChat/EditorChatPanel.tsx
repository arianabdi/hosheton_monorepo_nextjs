'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LuArrowUp, LuBot, LuLoaderCircle } from 'react-icons/lu';
import { providersApi, type ProviderModelItem } from '@/app/(developers)/projects/lib/providers-api';
import { getApiErrorMessage } from '@/app/(developers)/projects/lib/api-client';
import MediaMentionComposer from '@/app/(developers)/projects/components/MediaMentionComposer';
import type { StudioMediaMention } from '@/app/(developers)/projects/lib/studio-media';
import { runEditorAgent } from '../../utils/editor-agent-api';
import type {
    AgentChatMessage,
    AgentCommand,
    AgentCommandPlanItem,
    AgentCommandResult,
    AgentEditorSnapshot,
} from '../../utils/editor-agent-commands';
import AgentChecklist from './AgentChecklist';
import styles from './EditorChatPanel.module.scss';

/** Proposed/apply state of one agent answer, rendered as a checklist. */
type ChatPlan = {
    commands: AgentCommandPlanItem[];
    /** Client-assigned ids the user ticked — only these get applied. */
    selectedIds: string[];
    results?: AgentCommandResult[];
    appliedAt?: number;
    /** Durable restore point created right before applying (rollback anchor). */
    snapshotId?: string;
    /** Set once a rollback restored the pre-turn snapshot (here or a later turn). */
    reverted?: boolean;
};

type ChatEntry = {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    /** The user prompt that produced this plan — used as the snapshot label. */
    promptLabel?: string;
    plan?: ChatPlan;
    error?: boolean;
};

type EditorChatPanelProps = {
    projectId: string;
    getSnapshot: () => AgentEditorSnapshot;
    onApplyCommands: (commands: AgentCommand[]) => AgentCommandResult[];
    /** Persists a restore point BEFORE the plan is applied (rollback anchor). */
    onCreateSnapshot: (label: string) => Promise<{ _id: string } | null>;
    /** Restores a previously created snapshot; resolves to success. */
    onRestoreSnapshot: (snapshotId: string) => Promise<boolean>;
};

const STORAGE_PREFIX = 'hosheton.videoEditor.chat';
const MAX_HISTORY_TURNS = 12;

function newId() {
    return `m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function EditorChatPanel({
    projectId,
    getSnapshot,
    onApplyCommands,
    onCreateSnapshot,
    onRestoreSnapshot,
}: EditorChatPanelProps) {
    const { t } = useTranslation('videoEditor');
    const [entries, setEntries] = useState<ChatEntry[]>([]);
    const [input, setInput] = useState('');
    /** Gallery files mentioned via @ in the message — sent to the agent so it
     *  can reference their real URLs in `addMedia` commands. */
    const [mentions, setMentions] = useState<StudioMediaMention[]>([]);
    const [sending, setSending] = useState(false);
    const [models, setModels] = useState<ProviderModelItem[]>([]);
    const [modelId, setModelId] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [applyingEntryId, setApplyingEntryId] = useState<string | null>(null);
    const [revertingEntryId, setRevertingEntryId] = useState<string | null>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const storageKey = `${STORAGE_PREFIX}:${projectId}`;
    const [restored, setRestored] = useState(false);

    useEffect(() => {
        setRestored(false);
        try {
            const raw = window.localStorage.getItem(storageKey);
            if (raw) {
                const parsed = JSON.parse(raw) as { entries?: ChatEntry[]; modelId?: string };
                if (Array.isArray(parsed.entries)) {
                    // Legacy entries applied instantly without a checklist — show
                    // them as already-applied plans (no snapshot → no rollback).
                    const migrated = parsed.entries
                        .filter((item) => item && (item.role === 'user' || item.role === 'assistant'))
                        .map((item) => {
                            const legacy = item as ChatEntry & { commands?: AgentCommand[]; results?: AgentCommandResult[] };
                            if (legacy.plan || !legacy.commands?.length) return item as ChatEntry;
                            return {
                                ...legacy,
                                plan: {
                                    commands: legacy.commands,
                                    selectedIds: [],
                                    results: legacy.results,
                                    appliedAt: 1,
                                    reverted: false,
                                },
                            } as ChatEntry;
                        })
                        .slice(-60);
                    setEntries(migrated);
                }
                if (typeof parsed.modelId === 'string') setModelId(parsed.modelId);
            }
        } catch {
            /* ignore corrupted history */
        } finally {
            // Persist only after the restored state reached a render — otherwise
            // the mount-time persist effect would wipe history with [].
            setRestored(true);
        }
    }, [storageKey]);

    useEffect(() => {
        let cancelled = false;
        providersApi.listModels({ class: 'text' })
            .then((res) => {
                if (cancelled) return;
                const list = (res.models || []).filter((model) => model.isActive !== false && model.isAlive !== false);
                setModels(list);
                setModelId((current) => (current && list.some((model) => model._id === current)
                    ? current
                    : (list[0]?._id || '')));
            })
            .catch(() => undefined);
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        if (!restored) return;
        try {
            window.localStorage.setItem(storageKey, JSON.stringify({ entries, modelId }));
        } catch {
            /* storage unavailable */
        }
    }, [entries, modelId, storageKey, restored]);

    useEffect(() => {
        const list = listRef.current;
        if (list) list.scrollTop = list.scrollHeight;
    }, [entries, sending]);

    const send = useCallback(async (text: string) => {
        const prompt = text.trim();
        if (!prompt || sending) return;
        if (!modelId) {
            setError(t('chat_no_model'));
            return;
        }

        const userEntry: ChatEntry = { id: newId(), role: 'user', content: prompt };
        const history: AgentChatMessage[] = [
            ...entries.slice(-MAX_HISTORY_TURNS * 2).map((entry) => ({
                role: entry.role,
                content: entry.content,
            })),
            { role: 'user' as const, content: prompt },
        ];

        setEntries((prev) => [...prev, userEntry]);
        setInput('');
        setSending(true);
        setError(null);

        try {
            const media = mentions
                .filter((mention) => !!mention.url)
                .slice(0, 8)
                .map((mention) => ({
                    url: String(mention.url),
                    label: mention.label,
                    type: String(mention.type || 'image'),
                }));
            const response = await runEditorAgent(projectId, {
                modelId,
                messages: history,
                editor: getSnapshot(),
                ...(media.length ? { media } : {}),
            });
            const commands = (Array.isArray(response.commands) ? response.commands : [])
                .map((command, index) => ({ ...command, id: `cmd-${index}` }));
            // The plan is NOT applied here — the user reviews the checklist and
            // confirms; applying happens in confirmPlan (with a snapshot first).
            setEntries((prev) => [...prev, {
                id: newId(),
                role: 'assistant',
                promptLabel: prompt,
                content: response.message
                    || (commands.length ? t('chat_plan_intro', { defaultValue: 'این تغییرها را پیشنهاد می‌دهم — تیک بزن و اعمال کن:' }) : t('chat_empty_answer')),
                plan: commands.length
                    ? { commands, selectedIds: commands.map((command) => command.id!) }
                    : undefined,
            }]);
            setMentions([]);
        } catch (err) {
            const message = getApiErrorMessage(err, t('chat_send_failed'));
            setError(message);
            setEntries((prev) => [...prev, {
                id: newId(),
                role: 'assistant',
                content: message,
                error: true,
            }]);
        } finally {
            setSending(false);
        }
    }, [entries, modelId, sending, projectId, getSnapshot, t, mentions]);

    const toggleCommand = useCallback((entryId: string, commandId: string) => {
        setEntries((prev) => prev.map((entry) => {
            if (entry.id !== entryId || !entry.plan || entry.plan.appliedAt) return entry;
            const selectedIds = entry.plan.selectedIds.includes(commandId)
                ? entry.plan.selectedIds.filter((id) => id !== commandId)
                : [...entry.plan.selectedIds, commandId];
            return { ...entry, plan: { ...entry.plan, selectedIds } };
        }));
    }, []);

    const toggleAllCommands = useCallback((entryId: string) => {
        setEntries((prev) => prev.map((entry) => {
            if (entry.id !== entryId || !entry.plan || entry.plan.appliedAt) return entry;
            const allIds = entry.plan.commands.map((command) => command.id!).filter(Boolean);
            const selectedIds = entry.plan.selectedIds.length === allIds.length ? [] : allIds;
            return { ...entry, plan: { ...entry.plan, selectedIds } };
        }));
    }, []);

    /** Checklist confirmed → snapshot the pre-state, then apply the ticked commands. */
    const confirmPlan = useCallback(async (entryId: string) => {
        if (applyingEntryId) return;
        const target = entries.find((entry) => entry.id === entryId);
        const plan = target?.plan;
        if (!plan || plan.appliedAt || plan.reverted) return;
        const selected = plan.commands.filter((command) => command.id && plan.selectedIds.includes(command.id));
        if (!selected.length) return;

        setApplyingEntryId(entryId);
        setError(null);
        try {
            let snapshotId: string | undefined;
            try {
                const snapshot = await onCreateSnapshot(target?.promptLabel || target?.content || 'AI chat');
                snapshotId = snapshot?._id || undefined;
            } catch {
                // Snapshot failure must not block the edit — local undo still works.
                snapshotId = undefined;
            }
            const results = onApplyCommands(selected);
            setEntries((prev) => prev.map((entry) => (
                entry.id === entryId && entry.plan
                    ? {
                        ...entry,
                        plan: {
                            ...entry.plan,
                            results,
                            appliedAt: Date.now(),
                            ...(snapshotId ? { snapshotId } : {}),
                            selectedIds: [],
                        },
                    }
                    : entry
            )));
        } finally {
            setApplyingEntryId(null);
        }
    }, [applyingEntryId, entries, onCreateSnapshot, onApplyCommands]);

    /** Roll this turn (and everything applied after it) back to its pre-state. */
    const revertPlan = useCallback(async (entryId: string) => {
        if (revertingEntryId) return;
        const target = entries.find((entry) => entry.id === entryId);
        const plan = target?.plan;
        if (!plan?.appliedAt || plan.reverted || !plan.snapshotId) return;

        setRevertingEntryId(entryId);
        setError(null);
        try {
            const ok = await onRestoreSnapshot(plan.snapshotId);
            if (!ok) {
                setError(t('chat_plan_revert_failed', { defaultValue: 'بازگردانی ناموفق بود.' }));
                return;
            }
            const anchor = plan.appliedAt;
            setEntries((prev) => prev.map((entry) => (
                entry.plan?.appliedAt && entry.plan.appliedAt >= anchor
                    ? { ...entry, plan: { ...entry.plan, reverted: true } }
                    : entry
            )));
        } finally {
            setRevertingEntryId(null);
        }
    }, [entries, revertingEntryId, onRestoreSnapshot, t]);

    const clearChat = useCallback(() => {
        setEntries([]);
        setError(null);
    }, []);

    const selectedModel = useMemo(() => models.find((model) => model._id === modelId), [models, modelId]);
    const suggestions = useMemo(() => ([
        t('chat_suggestion_move'),
        t('chat_suggestion_canvas'),
        t('chat_suggestion_track'),
        t('chat_suggestion_frame'),
    ]), [t]);

    const planLabels = useMemo(() => ({
        title: t('chat_plan_title', { defaultValue: 'برنامه‌ی تغییرات پیشنهادی' }),
        selectAll: (count: number) => t('chat_plan_select_all', { count, defaultValue: 'انتخاب همه ({{count}})' }),
        apply: (count: number) => t('chat_plan_apply', { count, defaultValue: 'اعمال {{count}} تغییر' }),
        applying: t('chat_plan_applying', { defaultValue: 'در حال اعمال…' }),
        applied: t('chat_plan_applied', { defaultValue: 'اعمال شد' }),
        revert: t('chat_plan_revert', { defaultValue: 'بازگردانی به قبل از این تغییر' }),
        reverting: t('chat_plan_reverting', { defaultValue: 'در حال بازگردانی…' }),
        reverted: t('chat_plan_reverted', { defaultValue: 'بازگردانی شد' }),
        noSnapshot: t('chat_plan_no_snapshot', { defaultValue: 'اسنپ‌شاتی برای این تغییر ثبت نشده است' }),
    }), [t]);

    return (
        <div className={styles.chatPanel}>
            <div className={styles.chatToolbar}>
                <span className={styles.modelBadge} title={selectedModel?.displayName || selectedModel?.name || ''}>
                    <LuBot />
                    <span>{selectedModel?.displayName || selectedModel?.name || t('chat_no_model')}</span>
                </span>
                <button
                    type="button"
                    className={styles.clearBtn}
                    onClick={clearChat}
                    disabled={!entries.length}
                    title={t('chat_clear')}
                >
                    {t('chat_clear')}
                </button>
            </div>

            <div className={styles.messages} ref={listRef}>
                {!entries.length && (
                    <div className={styles.emptyState}>
                        <LuBot />
                        <p>{t('chat_intro')}</p>
                        <div className={styles.suggestions}>
                            {suggestions.map((suggestion) => (
                                <button
                                    key={suggestion}
                                    type="button"
                                    onClick={() => { if (!sending) void send(suggestion); }}
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {entries.map((entry) => (
                    <div
                        key={entry.id}
                        className={`${styles.bubbleRow} ${entry.role === 'user' ? styles.userRow : styles.aiRow}`}
                    >
                        <div className={`${styles.bubble} ${entry.error ? styles.bubbleError : ''}`}>
                            <span className={styles.bubbleText}>{entry.content}</span>
                            {entry.plan && (
                                <AgentChecklist
                                    commands={entry.plan.commands}
                                    results={entry.plan.results}
                                    selectedIds={entry.plan.selectedIds}
                                    onToggle={(commandId) => toggleCommand(entry.id, commandId)}
                                    onToggleAll={() => toggleAllCommands(entry.id)}
                                    onConfirm={() => { void confirmPlan(entry.id); }}
                                    onRevert={entry.plan.appliedAt && !entry.plan.reverted && entry.plan.snapshotId
                                        ? () => { void revertPlan(entry.id); }
                                        : null}
                                    applying={applyingEntryId === entry.id}
                                    reverting={revertingEntryId === entry.id}
                                    applied={Boolean(entry.plan.appliedAt)}
                                    reverted={Boolean(entry.plan.reverted)}
                                    labels={planLabels}
                                />
                            )}
                        </div>
                    </div>
                ))}

                {sending && (
                    <div className={`${styles.bubbleRow} ${styles.aiRow}`}>
                        <div className={`${styles.bubble} ${styles.bubblePending}`}>
                            <LuLoaderCircle className={styles.spinner} />
                            <span>{t('chat_thinking')}</span>
                        </div>
                    </div>
                )}
            </div>

            {error && <p className={styles.errorLine}>{error}</p>}

            <div className={styles.inputArea}>
                <div className={styles.modelPicker}>
                    <select
                        value={modelId}
                        onChange={(event) => setModelId(event.target.value)}
                        aria-label={t('chat_pick_model')}
                    >
                        {!models.length && <option value="">{t('chat_no_model')}</option>}
                        {models.map((model) => (
                            <option key={model._id} value={model._id}>
                                {model.displayName || model.name}
                            </option>
                        ))}
                    </select>
                </div>
                <div className={styles.inputRow}>
                    <div className={styles.composerWrap}>
                        <MediaMentionComposer
                            value={input}
                            mentions={mentions}
                            onChange={(next, nextMentions) => {
                                setInput(next);
                                setMentions(nextMentions);
                            }}
                            projectId={projectId}
                            placeholder={t('chat_placeholder_mention')}
                            minRows={1}
                            maxHeight={140}
                            dir="auto"
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' && !event.shiftKey) {
                                    event.preventDefault();
                                    void send(input);
                                }
                            }}
                        />
                    </div>
                    <button
                        type="button"
                        className={styles.sendBtn}
                        disabled={sending || !input.trim()}
                        onClick={() => { void send(input); }}
                        aria-label={t('chat_send')}
                    >
                        <LuArrowUp />
                    </button>
                </div>
            </div>
        </div>
    );
}
