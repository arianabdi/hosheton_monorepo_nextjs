'use client';

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { LuSparkles } from 'react-icons/lu';
import { notifyError } from '@/app/lib/errors';
import { mediaApi } from '../lib/media-api';
import { providersApi, type ProviderModelItem } from '../lib/providers-api';
import { mentionToken, type StudioMediaMention } from '../lib/studio-media';
import styles from './PromptOptimizeControl.module.scss';

const STORAGE_KEY = 'hosheton.promptOptimize';

const ACTIONS = [
    { id: 'optimize_en', labelKey: 'prompt_optimize_en', descKey: 'prompt_optimize_desc_en' },
    { id: 'optimize_fa', labelKey: 'prompt_optimize_fa', descKey: 'prompt_optimize_desc_fa' },
    { id: 'generate', labelKey: 'prompt_optimize_generate', descKey: 'prompt_optimize_desc_generate' },
] as const;

type OptimizeAction = (typeof ACTIONS)[number]['id'];

function readStored(): { action: OptimizeAction; modelId: string } {
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) as { action?: string; modelId?: string } : {};
        const action = ACTIONS.some((item) => item.id === parsed.action)
            ? parsed.action as OptimizeAction
            : 'optimize_en';
        return { action, modelId: String(parsed.modelId || '') };
    } catch {
        return { action: 'optimize_en', modelId: '' };
    }
}

export default function PromptOptimizeControl({
    readPrompt,
    promptText,
    mentions = [],
    disabled = false,
    compact = false,
    hideLabel = false,
    className,
    projectId,
    onApply,
    onRunningChange,
}: {
    readPrompt?: () => string;
    promptText?: string;
    mentions?: StudioMediaMention[];
    disabled?: boolean;
    compact?: boolean;
    /** فقط آیکون (موبایل که جا تنگ است) — متن در title/aria-label می‌ماند */
    hideLabel?: boolean;
    /** کلاس اضافه روی دکمه برای ظاهر جایگاه میزبان */
    className?: string;
    projectId?: string;
    onApply: (prompt: string, mentions: StudioMediaMention[]) => void;
    onRunningChange?: (running: boolean) => void;
}) {
    const { t } = useTranslation('projects');
    const wrapRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null);
    const [action, setAction] = useState<OptimizeAction>('optimize_en');
    const [modelId, setModelId] = useState('');
    const [models, setModels] = useState<ProviderModelItem[]>([]);
    const [modelsReady, setModelsReady] = useState(false);
    const [running, setRunning] = useState(false);
    const [promptLength, setPromptLength] = useState(0);

    // والد (مثلاً چت) تا مشخص شدن نتیجه بهینه‌سازی، ورودی را قفل می‌کند.
    useEffect(() => {
        onRunningChange?.(running);
    }, [running, onRunningChange]);

    const currentPrompt = () => (promptText ?? readPrompt?.() ?? '');

    useEffect(() => {
        const stored = readStored();
        setAction(stored.action);
        setModelId(stored.modelId);
    }, []);

    useEffect(() => {
        let cancelled = false;
        providersApi.listModels({ class: 'text' })
            .then((res) => {
                if (cancelled) return;
                const list = (res.models || []).filter((model) => model.isActive !== false && model.isAlive !== false);
                setModels(list);
                setModelsReady(true);
                setModelId((current) => (
                    list.some((model) => model._id === current) ? current : (list[0]?._id || '')
                ));
            })
            .catch(() => {
                if (!cancelled) {
                    setModels([]);
                    setModelsReady(true);
                }
            });
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        if (!modelId) return;
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ action, modelId }));
        } catch {
            /* storage unavailable */
        }
    }, [action, modelId]);

    useEffect(() => {
        if (!open) return;
        const tick = () => {
            const next = currentPrompt().trim().length;
            setPromptLength((prev) => (prev === next ? prev : next));
        };
        tick();
        const timer = window.setInterval(tick, 700);
        return () => window.clearInterval(timer);
    }, [open, promptText, readPrompt]);

    useEffect(() => {
        if (!open) return;
        const onDoc = (event: MouseEvent) => {
            const target = event.target as Node;
            if (wrapRef.current?.contains(target) || menuRef.current?.contains(target)) return;
            setOpen(false);
        };
        const timer = window.setTimeout(() => document.addEventListener('mousedown', onDoc), 0);
        return () => {
            window.clearTimeout(timer);
            document.removeEventListener('mousedown', onDoc);
        };
    }, [open]);

    useLayoutEffect(() => {
        if (!open || !wrapRef.current) {
            setMenuStyle(null);
            return;
        }
        const chip = wrapRef.current;
        const sync = () => {
            const rect = chip.getBoundingClientRect();
            const width = 340;
            const spaceAbove = rect.top;
            const spaceBelow = window.innerHeight - rect.bottom;
            const openUp = spaceAbove >= 280 || spaceAbove >= spaceBelow;
            setMenuStyle({
                position: 'fixed',
                left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
                width,
                zIndex: 10050,
                ...(openUp
                    ? { bottom: Math.max(12, window.innerHeight - rect.top + 8), top: 'auto' }
                    : { top: rect.bottom + 8, bottom: 'auto' }),
            });
        };
        sync();
        window.addEventListener('resize', sync);
        window.addEventListener('scroll', sync, true);
        return () => {
            window.removeEventListener('resize', sync);
            window.removeEventListener('scroll', sync, true);
        };
    }, [open]);

    const apply = async () => {
        const prompt = currentPrompt().trim();
        if (!prompt) {
            notifyError({ message: t('prompt_optimize_empty') });
            return;
        }
        if (!modelId || running) return;
        const model = models.find((item) => item._id === modelId);
        setRunning(true);
        try {
            const result = await mediaApi.optimizePrompt({
                modelId,
                providerId: model?.providerId,
                action,
                prompt,
                projectId,
            });
            const next = String(result.prompt || '').trim();
            if (!next) {
                notifyError({ message: t('prompt_optimize_empty_result', { defaultValue: 'مدل متنی برنگرداند.' }) });
                return;
            }
            const kept = mentions.filter((item) => next.includes(mentionToken(item)));
            onApply(next, kept);
            setOpen(false);
        } catch (error) {
            notifyError(error, { fallback: t('prompt_optimize_failed', { defaultValue: 'بهینه‌سازی پرامپت ناموفق بود.' }) });
        } finally {
            setRunning(false);
        }
    };

    return (
        <div className={`${styles.wrap} nodrag nowheel nopan`} ref={wrapRef}>
            <button
                type="button"
                className={`${styles.chip} ${open ? styles.open : ''} ${compact ? styles.compact : ''} ${hideLabel ? styles.iconOnly : ''} ${className || ''}`}
                disabled={disabled || running}
                aria-expanded={open}
                title={t('prompt_optimize')}
                aria-label={t('prompt_optimize')}
                onMouseDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                    event.stopPropagation();
                    if (disabled || running) return;
                    setOpen((value) => !value);
                }}
            >
                <LuSparkles size={14} />
                {hideLabel ? null : (
                    <span className={styles.chipLabel}>{compact ? t('prompt_optimize_short') : t('prompt_optimize')}</span>
                )}
            </button>
            {open && menuStyle && typeof document !== 'undefined' ? createPortal(
                <div
                    ref={menuRef}
                    className={`${styles.menu} nodrag nowheel nopan`}
                    style={menuStyle}
                    role="dialog"
                    aria-label={t('prompt_optimize')}
                    onMouseDown={(event) => event.stopPropagation()}
                    onWheel={(event) => event.stopPropagation()}
                >
                    <p className={styles.menuTitle}>{t('prompt_optimize')}</p>
                    <div className={styles.selectRow}>
                        <label className={styles.selectField}>
                            <span className={styles.selectLabel}>{t('prompt_optimize_action_label')}</span>
                            <span className={styles.selectShell}>
                                <select
                                    value={action}
                                    disabled={running}
                                    aria-label={t('prompt_optimize_action_label')}
                                    onChange={(event) => setAction(event.target.value as OptimizeAction)}
                                >
                                    {ACTIONS.map((item) => (
                                        <option key={item.id} value={item.id}>{t(item.labelKey)}</option>
                                    ))}
                                </select>
                            </span>
                        </label>
                        <label className={styles.selectField}>
                            <span className={styles.selectLabel}>{t('prompt_optimize_pick_model')}</span>
                            <span className={styles.selectShell}>
                                <select
                                    value={modelId}
                                    disabled={running || (modelsReady && models.length === 0)}
                                    aria-label={t('prompt_optimize_pick_model')}
                                    onChange={(event) => setModelId(event.target.value)}
                                >
                                    {!modelsReady ? (
                                        <option value="">{t('prompt_optimize_loading', { defaultValue: '…' })}</option>
                                    ) : models.length === 0 ? (
                                        <option value="">{t('prompt_optimize_no_models', { defaultValue: 'مدل متنی فعالی نیست.' })}</option>
                                    ) : models.map((model) => (
                                        <option key={model._id} value={model._id}>{model.displayName || model.name}</option>
                                    ))}
                                </select>
                            </span>
                        </label>
                    </div>
                    {/* توضیح کوتاه حالت انتخاب‌شده — با تغییر select به‌روز می‌شود */}
                    <div className={styles.modeHint} role="note">
                        <LuSparkles size={13} aria-hidden />
                        <p>{t(ACTIONS.find((item) => item.id === action)?.descKey || 'prompt_optimize_desc_en')}</p>
                    </div>
                    <div className={styles.footer}>
                        <button
                            type="button"
                            className={styles.apply}
                            disabled={running || !modelId || promptLength <= 0}
                            onClick={() => { void apply(); }}
                        >
                            {running ? t('prompt_optimize_running') : t('prompt_optimize_apply')}
                        </button>
                    </div>
                </div>,
                document.body,
            ) : null}
        </div>
    );
}
