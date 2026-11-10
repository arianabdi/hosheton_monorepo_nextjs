'use client';

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { LuImages, LuUpload } from 'react-icons/lu';
import TemplatePreviewThumb from '@/app/(developers)/templates/TemplatePreviewThumb';
import { mediaListKey } from '@/app/(developers)/projects/lib/studio-media';
import type { TemplatePreviewMedia } from '@/app/(developers)/projects/types/media-api';
import type { PendingUpload } from '../ChatSessionContext';
import { formatValidationError, type ValidationError } from '../lib/chat-attachment-validator';
import {
    attachmentsForInput,
    modeInputMax,
    modeInputKind,
    modeInputMin,
    type ModeInputDef,
} from '../lib/mode-inputs';
import { isRtlLanguage } from '@/app/lib/i18n/config';
import styles from './ChatInput.module.scss';
import ImageOptimizeToggle from './ImageOptimizeToggle';

export default function ModeInputSlots({
    inputs,
    attachments,
    pendingUploads,
    disabled,
    onUpload,
    onGallery,
    onRemove,
    getAttachmentErrors,
}: {
    inputs: ModeInputDef[];
    attachments: TemplatePreviewMedia[];
    pendingUploads: PendingUpload[];
    disabled?: boolean;
    onUpload: (inputKey: string) => void;
    onGallery: (inputKey: string) => void;
    onRemove: (item: TemplatePreviewMedia) => void;
    getAttachmentErrors: (item: TemplatePreviewMedia) => ValidationError[];
}) {
    const { t, i18n } = useTranslation('projects');
    const [menuKey, setMenuKey] = useState('');
    const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null);
    const cellRefs = useRef<Record<string, HTMLButtonElement | null>>({});
    const menuRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        if (!menuKey) {
            setMenuStyle(null);
            return;
        }
        const sync = () => {
            const rect = cellRefs.current[menuKey]?.getBoundingClientRect();
            if (!rect) return;
            const width = 220;
            setMenuStyle({
                position: 'fixed',
                left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
                width,
                bottom: Math.max(12, window.innerHeight - rect.top + 8),
                top: 'auto',
                zIndex: 10050,
            });
        };
        sync();
        window.addEventListener('resize', sync);
        window.addEventListener('scroll', sync, true);
        return () => {
            window.removeEventListener('resize', sync);
            window.removeEventListener('scroll', sync, true);
        };
    }, [menuKey]);

    useEffect(() => {
        if (!menuKey) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            setMenuKey('');
        };
        const onPointerDown = (event: PointerEvent) => {
            const target = event.target as Node;
            if (cellRefs.current[menuKey]?.contains(target) || menuRef.current?.contains(target)) return;
            setMenuKey('');
        };
        window.addEventListener('keydown', onKey, true);
        window.addEventListener('pointerdown', onPointerDown, true);
        return () => {
            window.removeEventListener('keydown', onKey, true);
            window.removeEventListener('pointerdown', onPointerDown, true);
        };
    }, [menuKey]);

    if (!inputs.length) return null;
    return (
        <div className={styles.modeSlots}>
            {inputs.map((input) => {
                const key = String(input.key || '');
                const items = attachmentsForInput(attachments, key);
                const pending = pendingUploads.filter((item) => item.inputKey === key);
                const max = modeInputMax(input);
                const min = modeInputMin(input);
                const occupied = [
                    ...pending.map((item) => ({ kind: 'pending' as const, item })),
                    ...items.map((item) => ({ kind: 'media' as const, item })),
                ];
                const title = (isRtlLanguage(i18n.language)
                    ? input.labelFa || input.label
                    : input.label || input.labelFa) || key;
                return (
                    <section key={key} className={styles.modeSlot}>
                        <header className={styles.modeSlotHead}>
                            <strong>
                                {title}
                                {input.required !== false ? <span className={styles.modeSlotReq}>*</span> : null}
                            </strong>
                            <small>
                                {occupied.length} / {max}
                                {min > 1 ? ` · ${t('chat_slot_min', { min })}` : ''}
                            </small>
                        </header>
                        {isRtlLanguage(i18n.language) && input.hintFa ? <p className={styles.modeSlotHint}>{input.hintFa}</p> : null}
                        <div className={styles.modeSlotRow}>
                            {Array.from({ length: max }, (_, index) => {
                                const cell = occupied[index];
                                if (cell?.kind === 'pending') {
                                    const item = cell.item;
                                    return (
                                        <div
                                            key={item.id}
                                            className={`${styles.pendingThumb} ${item.status === 'failed' ? styles.pendingFailed : ''}`}
                                        >
                                            {item.kind === 'audio' ? (
                                                <div className={styles.pendingAudio} aria-hidden>♪</div>
                                            ) : (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={item.localUrl} alt="" />
                                            )}
                                            <span>{Math.round(item.progress)}%</span>
                                        </div>
                                    );
                                }
                                if (cell?.kind === 'media') {
                                    const media = cell.item;
                                    const errors = getAttachmentErrors(media);
                                    return (
                                        <TemplatePreviewThumb
                                            key={mediaListKey(media, index)}
                                            media={media}
                                            preferOptimizedThumb
                                            invalid={errors.length > 0}
                                            errorMessages={errors.map((error) => formatValidationError(error, t))}
                                            onRemove={disabled ? undefined : () => onRemove(media)}
                                        />
                                    );
                                }
                                const cellId = `${key}::${index}`;
                                return (
                                    <button
                                        key={cellId}
                                        type="button"
                                        ref={(node) => { cellRefs.current[cellId] = node; }}
                                        className={styles.modeSlotPlaceholder}
                                        disabled={disabled}
                                        onClick={() => setMenuKey((current) => (current === cellId ? '' : cellId))}
                                    >
                                        <span>{title}</span>
                                        <small>{t('chat_slot_add')}</small>
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                );
            })}

            {menuKey && menuStyle && createPortal(
                <div ref={menuRef} className={styles.addMenu} style={menuStyle}>
                    <button
                        type="button"
                        className={styles.addMenuItem}
                        onClick={() => {
                            const inputKey = menuKey.split('::')[0];
                            setMenuKey('');
                            onUpload(inputKey);
                        }}
                    >
                        <LuUpload /> {t('chat_add_from_device')}
                    </button>
                    <button
                        type="button"
                        className={styles.addMenuItem}
                        onClick={() => {
                            const inputKey = menuKey.split('::')[0];
                            setMenuKey('');
                            onGallery(inputKey);
                        }}
                    >
                        <LuImages /> {t('chat_add_from_gallery')}
                    </button>
                    {/* بهینه‌سازی فقط روی عکس اثر دارد */}
                    {modeInputKind(inputs.find((input) => String(input.key) === menuKey.split('::')[0])?.type) === 'image'
                        ? <ImageOptimizeToggle />
                        : null}
                </div>,
                document.body,
            )}
        </div>
    );
}
