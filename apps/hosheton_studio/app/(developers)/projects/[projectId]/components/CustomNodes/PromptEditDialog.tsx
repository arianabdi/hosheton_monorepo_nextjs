'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { LuX } from 'react-icons/lu';
import { MediaMentionComposer } from '../../../components/MediaMentionComposer';
import PromptOptimizeControl from '../../../components/PromptOptimizeControl';
import type { StudioMediaMention } from '../../../lib/studio-media';
import styles from './PromptEditDialog.module.scss';

interface PromptEditDialogProps {
    open: boolean;
    readOnly?: boolean;
    projectId?: string;
    title?: string;
    promptText: string;
    promptMentions?: StudioMediaMention[];
    /** منبع منشن مثل ویرایشگر کوچک: نود پردازشی = تصاویر وصل‌شده؛ پیش‌فرض گالری پروژه */
    mentionSource?: 'gallery' | 'attachments';
    attachmentsMentions?: StudioMediaMention[];
    attachmentsLabels?: { title?: string; empty?: string; hint?: string };
    placeholder?: string;
    /** متن راهنمای زیر عنوان — پیش‌فرض راهنمای نود؛ null = بدون راهنما (مثلاً کادر چت) */
    hint?: string | null;
    /** بالای متن — مثلاً تصاویر مرجع پیام چت (با حذف)، تا کنار متن دیده شوند */
    media?: ReactNode;
    onClose: () => void;
    /** یادداشت تیم اینجا نیست — فقط در سایدبار تنظیمات نود ویرایش می‌شود */
    onSave: (next: {
        promptText: string;
        promptMentions: StudioMediaMention[];
    }) => void;
}

export function PromptEditDialog({
    open,
    readOnly = false,
    projectId,
    title,
    promptText,
    promptMentions,
    mentionSource,
    attachmentsMentions,
    attachmentsLabels,
    placeholder,
    hint,
    media,
    onClose,
    onSave,
}: PromptEditDialogProps) {
    const { t } = useTranslation('projects');
    const { t: tc } = useTranslation('common');
    const [draftPrompt, setDraftPrompt] = useState(promptText);
    const [draftMentions, setDraftMentions] = useState<StudioMediaMention[]>(promptMentions || []);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!open) return;
        setDraftPrompt(promptText);
        setDraftMentions(promptMentions || []);
    }, [open, promptText, promptMentions]);

    useEffect(() => {
        if (!open) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open || !mounted) return null;

    const dialog = (
        <div className={styles.overlay} onClick={onClose} role="presentation">
            <div
                className={styles.dialog}
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="prompt-edit-title"
            >
                <button type="button" className={styles.closeBtn} onClick={onClose} aria-label={tc('close')}>
                    <LuX />
                </button>
                <h3 id="prompt-edit-title">{title || t('edit_prompt')}</h3>
                {hint === null ? null : <p>{hint ?? t('edit_prompt_hint')}</p>}
                {media ? <div className={styles.media}>{media}</div> : null}
                <div className={styles.optimizeRow}>
                    <PromptOptimizeControl
                        disabled={readOnly}
                        promptText={draftPrompt}
                        mentions={draftMentions}
                        projectId={projectId}
                        onApply={(nextPrompt, nextMentions) => {
                            setDraftPrompt(nextPrompt);
                            setDraftMentions(nextMentions);
                        }}
                    />
                </div>
                <MediaMentionComposer
                    className={styles.promptEditor}
                    value={draftPrompt}
                    mentions={draftMentions}
                    projectId={projectId}
                    mentionSource={mentionSource}
                    attachmentsMentions={attachmentsMentions}
                    attachmentsLabels={attachmentsLabels}
                    onChange={(nextPrompt, nextMentions) => {
                        setDraftPrompt(nextPrompt);
                        setDraftMentions(nextMentions);
                    }}
                    disabled={readOnly}
                    minRows={10}
                    maxHeight="min(48vh, 420px)"
                    placeholder={placeholder || t('prompt_placeholder')}
                />
                <div className={styles.actions}>
                    <button type="button" className={styles.secondary} onClick={onClose}>
                        {tc('close')}
                    </button>
                    {!readOnly ? (
                        <button
                            type="button"
                            className={styles.primary}
                            onClick={() => onSave({
                                promptText: draftPrompt,
                                promptMentions: draftMentions,
                            })}
                        >
                            {tc('save')}
                        </button>
                    ) : null}
                </div>
            </div>
        </div>
    );

    return createPortal(dialog, document.body);
}
