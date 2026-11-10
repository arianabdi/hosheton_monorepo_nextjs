'use client';

import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    type CSSProperties,
    type KeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { LuAtSign, LuFilm, LuImage, LuLoader, LuSearch, LuVolume2 } from 'react-icons/lu';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '../lib/api-client';
import { mediaGalleryApi, type GalleryFileItem } from '@/app/(developers)/gallery';
import type { TemplatePreviewMedia } from '../types/media-api';
import {
    galleryItemToStudioMedia,
    mediaListKey,
    mediaRefToMention,
    mentionToken,
    midEllipsis,
    previewMediaToMention,
    uniqueGalleryFiles,
    type StudioMediaMention,
    type StudioMediaType,
} from '../lib/studio-media';
import { fixHoshetonMediaUrl, mediaOptimizedListThumbSrc } from '@/app/(marketplace)/lib/template-media';
import {
    isUsableCaretRect,
    mentionPickerLayout,
    resolveMentionAnchor,
    stepMentionIndex,
    type MentionRect,
} from './mention-picker-geometry';
import styles from './MediaMentionComposer.module.scss';

/* Media previews can be authenticated/storage URLs and cannot use next/image. */
/* eslint-disable @next/next/no-img-element */

interface MediaMentionComposerProps {
    value: string;
    mentions?: StudioMediaMention[];
    onChange: (value: string, mentions: StudioMediaMention[]) => void;
    projectId?: string;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    minRows?: number;
    maxHeight?: number | string;
    onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void;
    /** Chat: only photos already attached to this message. Workflow: project/all gallery. */
    mentionSource?: 'gallery' | 'attachments';
    attachments?: TemplatePreviewMedia[];
    /**
     * Attachments-mode override with ready mention objects (e.g. a workflow node's
     * connected image inputs). When provided it replaces `attachments` as the picker source.
     */
    attachmentsMentions?: StudioMediaMention[];
    /** Attachments-mode copy overrides (node pickers are not chat "attached photos"). */
    attachmentsLabels?: {
        title?: string;
        empty?: string;
        hint?: string;
    };
    /** Chat composer sits at the bottom — open the list above it. */
    pickerPlacement?: 'auto' | 'above';
    /** `auto` = جهت تایپ از اولین حرف قوی متن (فارسی → rtl، انگلیسی → ltr). */
    dir?: 'ltr' | 'rtl' | 'auto';
}

interface MentionChoice {
    key: string;
    mention: StudioMediaMention;
    subtitle?: string;
}

function rectOf(range: Range): DOMRect | null {
    const rects = range.getClientRects();
    const rect = rects.length ? rects[0] : range.getBoundingClientRect();
    if (isUsableCaretRect(rect)) return rect;
    const probe = range.cloneRange();
    probe.collapse(true);
    const marker = document.createElement('span');
    marker.textContent = '\u200b';
    try {
        probe.insertNode(marker);
        const measured = marker.getBoundingClientRect();
        marker.remove();
        return isUsableCaretRect(measured) ? measured : null;
    } catch {
        marker.remove();
        return null;
    }
}

/** Measure the saved caret. Ignore a selection that has moved into the search field. */
function measureMentionCaret(root: HTMLElement | null, saved: Range | null): MentionRect | null {
    if (!root) return null;
    const savedOk = saved && root.contains(saved.startContainer) ? saved : null;
    const selection = window.getSelection();
    const live = selection?.rangeCount ? selection.getRangeAt(0) : null;
    const liveOk = live && root.contains(live.startContainer) ? live : null;
    const range = liveOk || savedOk;
    if (!range) return null;
    const rect = rectOf(range);
    if (!rect) return null;
    return {
        top: rect.top,
        left: rect.left,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
    };
}

function elementRect(node: HTMLElement | null | undefined): MentionRect | null {
    if (!node) return null;
    const rect = node.getBoundingClientRect();
    return {
        top: rect.top,
        left: rect.left,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
    };
}

function viewportMetrics() {
    const vv = window.visualViewport;
    return {
        width: vv?.width ?? window.innerWidth,
        height: vv?.height ?? window.innerHeight,
        offsetTop: vv?.offsetTop ?? 0,
        offsetLeft: vv?.offsetLeft ?? 0,
        layoutHeight: document.documentElement.clientHeight || window.innerHeight,
    };
}

/** True when IME/soft-keyboard is inserting an "@" (Android Chrome often skips keydown). */
function isAtSignInsert(event: InputEvent): boolean {
    if (event.data !== '@') return false;
    return event.inputType === 'insertText' || event.inputType === 'insertCompositionText';
}

/**
 * Remove a bare "@" immediately before the caret (Android fallback when
 * beforeinput is not cancelable). Returns true if one was consumed.
 */
function consumeAtBeforeCaret(root: HTMLElement): boolean {
    const selection = window.getSelection();
    if (!selection?.isCollapsed || !selection.rangeCount) return false;
    const range = selection.getRangeAt(0);
    if (!root.contains(range.startContainer)) return false;
    const { startContainer, startOffset } = range;
    if (startContainer.nodeType !== Node.TEXT_NODE || startOffset <= 0) return false;
    const text = startContainer.textContent || '';
    if (text[startOffset - 1] !== '@') return false;
    startContainer.textContent = `${text.slice(0, startOffset - 1)}${text.slice(startOffset)}`;
    const next = document.createRange();
    const nextOffset = Math.max(0, startOffset - 1);
    next.setStart(startContainer, Math.min(nextOffset, startContainer.textContent?.length || 0));
    next.collapse(true);
    selection.removeAllRanges();
    selection.addRange(next);
    return true;
}

const TOKEN_PATTERN = /@\[([^\]]+)\]\(asset:([^)]+)\)/g;
const EMPTY_EDITOR_HTML = { __html: '' };

function isSpacerText(node: Node | null): node is Text {
    return Boolean(
        node
        && node.nodeType === Node.TEXT_NODE
        && (node.textContent === ' ' || node.textContent === '\u00a0'),
    );
}

function safeRemoveNode(node: Node | null) {
    const parent = node?.parentNode;
    if (!node || !parent || !parent.contains(node)) return;
    parent.removeChild(node);
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function splitMentionDocument(value: string, mentions: StudioMediaMention[]) {
    const byId = new Map(mentions.map((item) => [item.assetId, item]));
    const parts: Array<{ text?: string; mention?: StudioMediaMention }> = [];
    let cursor = 0;
    for (const match of value.matchAll(TOKEN_PATTERN)) {
        if (match.index > cursor) parts.push({ text: value.slice(cursor, match.index) });
        parts.push({
            mention: byId.get(match[2]) || {
                assetId: match[2],
                label: match[1],
                type: 'image',
            },
        });
        cursor = match.index + match[0].length;
    }
    if (cursor < value.length) parts.push({ text: value.slice(cursor) });
    return parts;
}

function mentionThumbSrc(mention: Pick<StudioMediaMention, 'thumbnailUrl' | 'thumbnailUrlLarge' | 'url'>): string {
    // Use same optimized technique as history thumbnails for consistency
    return mediaOptimizedListThumbSrc(mention) || fixHoshetonMediaUrl(mention.url || '');
}

function mentionFromChip(node: HTMLElement, known: StudioMediaMention[]): StudioMediaMention {
    const assetId = node.dataset.assetId || '';
    const existing = known.find((item) => item.assetId === assetId);
    const type = (node.dataset.type || existing?.type || 'image') as StudioMediaType;
    return {
        ...(existing || {}),
        assetId,
        label: node.dataset.label || existing?.label || 'media',
        type: ['image', 'video', 'audio'].includes(type) ? type : 'image',
        fileId: node.dataset.fileId || existing?.fileId,
        fileKey: node.dataset.fileKey || existing?.fileKey,
        url: node.dataset.url || existing?.url,
        thumbnailUrl: node.dataset.thumbSmall || existing?.thumbnailUrl,
        thumbnailUrlLarge: node.dataset.thumbLarge || existing?.thumbnailUrlLarge,
    };
}

function extractDocument(root: HTMLElement, known: StudioMediaMention[]) {
    const mentions: StudioMediaMention[] = [];
    let value = '';
    const walk = (node: Node) => {
        if (node instanceof HTMLElement && node.dataset.mediaMention === 'true') {
            const mention = mentionFromChip(node, known);
            if (mention.assetId) {
                value += mentionToken(mention);
                mentions.push(mention);
            }
            return;
        }
        if (node.nodeType === Node.TEXT_NODE) {
            value += node.textContent || '';
            return;
        }
        if (node instanceof HTMLBRElement) {
            value += '\n';
            return;
        }
        node.childNodes.forEach(walk);
        if (node instanceof HTMLDivElement && node !== root) value += '\n';
    };
    root.childNodes.forEach(walk);
    return {
        value: value.replace(/\n{3,}/g, '\n\n').replace(/\n$/, ''),
        mentions: [...new Map(mentions.map((item) => [item.assetId, item])).values()],
    };
}

function chipHtml(mention: StudioMediaMention, removeLabel: string): string {
    const thumb = mentionThumbSrc(mention);
    const displayLabel = midEllipsis(mention.label || 'media');
    return (
        `<span class="${styles.chip}" contenteditable="false" data-media-mention="true"`
        + ` data-asset-id="${escapeHtml(mention.assetId)}"`
        + ` data-label="${escapeHtml(mention.label)}"`
        + ` data-type="${escapeHtml(mention.type)}"`
        + (mention.fileId ? ` data-file-id="${escapeHtml(mention.fileId)}"` : '')
        + (mention.fileKey ? ` data-file-key="${escapeHtml(mention.fileKey)}"` : '')
        + (mention.url ? ` data-url="${escapeHtml(mention.url)}"` : '')
        + (mention.thumbnailUrl ? ` data-thumb-small="${escapeHtml(mention.thumbnailUrl)}"` : '')
        + (mention.thumbnailUrlLarge ? ` data-thumb-large="${escapeHtml(mention.thumbnailUrlLarge)}"` : '')
        + '>'
        + (thumb ? `<img src="${escapeHtml(thumb)}" alt="" loading="lazy" decoding="async">` : '')
        + `<span class="${styles.chipLabel}">@${escapeHtml(displayLabel)}</span>`
        + `<span class="${styles.chipRemove}" contenteditable="false" data-chip-remove="true" role="button" tabindex="-1" aria-label="${escapeHtml(removeLabel)}">×</span>`
        + '</span>'
    );
}

function documentToHtml(value: string, mentions: StudioMediaMention[], removeLabel: string): string {
    return splitMentionDocument(value, mentions).map((part) => {
        if (part.mention) return chipHtml(part.mention, removeLabel);
        return escapeHtml(part.text || '').replace(/\n/g, '<br>');
    }).join('');
}

function createChipElement(mention: StudioMediaMention, removeLabel: string): HTMLSpanElement {
    const template = document.createElement('template');
    template.innerHTML = chipHtml(mention, removeLabel);
    return template.content.firstElementChild as HTMLSpanElement;
}

const PASTE_BLOCK_TAGS = new Set(['DIV', 'P', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'TR', 'BLOCKQUOTE', 'PRE']);

function appendPlainText(parent: Node, text: string) {
    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    lines.forEach((line, index) => {
        if (index > 0) parent.appendChild(document.createElement('br'));
        if (line) parent.appendChild(document.createTextNode(line));
    });
}

/** Clipboard HTML may only contribute text and mention chips. Everything else is dropped. */
function appendSanitizedClipboard(source: Node, parent: Node, removeLabel: string) {
    source.childNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = (node.textContent || '').replace(/\u00a0/g, ' ');
            if (text) parent.appendChild(document.createTextNode(text));
            return;
        }
        if (!(node instanceof HTMLElement)) return;
        if (node.dataset.mediaMention === 'true') {
            const mention = mentionFromChip(node, []);
            if (!mention.assetId) return;
            parent.appendChild(createChipElement(mention, removeLabel));
            parent.appendChild(document.createTextNode(' '));
            return;
        }
        if (node.tagName === 'BR') {
            parent.appendChild(document.createElement('br'));
            return;
        }
        const before = parent.childNodes.length;
        appendSanitizedClipboard(node, parent, removeLabel);
        const grew = parent.childNodes.length > before;
        const last = parent.lastChild;
        const block = PASTE_BLOCK_TAGS.has(node.tagName);
        const directText = Array.from(node.childNodes).some((child) => (
            (child.nodeType === Node.TEXT_NODE && Boolean(child.textContent?.trim()))
            || (child instanceof HTMLElement && (child.dataset.mediaMention === 'true' || child.tagName === 'BR'))
        ));
        if (block && directText && grew && !(last instanceof HTMLBRElement)) {
            parent.appendChild(document.createElement('br'));
        }
    });
}

function collapseClipboardBreaks(parent: Node) {
    const nodes = Array.from(parent.childNodes);
    let breaks = 0;
    nodes.forEach((node) => {
        if (node instanceof HTMLBRElement) {
            breaks += 1;
            if (breaks > 2) node.remove();
            return;
        }
        breaks = 0;
    });
    while (parent.firstChild instanceof HTMLBRElement) parent.removeChild(parent.firstChild);
    while (parent.lastChild instanceof HTMLBRElement) parent.removeChild(parent.lastChild);
}

function clipboardFragment(data: DataTransfer | null, removeLabel: string): DocumentFragment {
    const fragment = document.createDocumentFragment();
    const html = data?.getData('text/html') || '';
    const plain = data?.getData('text/plain') || '';
    if (html && (html.includes('data-media-mention') || !plain)) {
        const parsed = new DOMParser().parseFromString(html, 'text/html');
        appendSanitizedClipboard(parsed.body, fragment, removeLabel);
        collapseClipboardBreaks(fragment);
        const hasChip = Array.from(fragment.childNodes).some((node) => (
            node instanceof HTMLElement && node.dataset.mediaMention === 'true'
        ));
        if (hasChip || fragment.textContent?.trim()) return fragment;
    }
    appendPlainText(fragment, plain);
    return fragment;
}

function editorHasForeignMarkup(root: HTMLElement): boolean {
    const visit = (node: Node): boolean => {
        for (const child of node.childNodes) {
            if (child.nodeType === Node.TEXT_NODE) continue;
            if (child instanceof HTMLBRElement) continue;
            if (!(child instanceof HTMLElement)) return true;
            if (child.dataset.mediaMention === 'true') continue;
            const plainDiv = child.tagName === 'DIV'
                && !child.className
                && !child.getAttribute('style')
                && child.attributes.length === 0;
            if (plainDiv) {
                if (visit(child)) return true;
                continue;
            }
            return true;
        }
        return false;
    };
    return visit(root);
}

function documentCaretIndex(root: HTMLElement): number | null {
    const selection = window.getSelection();
    if (!selection?.rangeCount) return null;
    const range = selection.getRangeAt(0);
    const endNode = range.endContainer;
    const endOffset = range.endOffset;
    if (!root.contains(endNode)) return null;
    let index = 0;
    let found = false;

    const walk = (node: Node) => {
        if (found) return;
        if (node instanceof HTMLElement && node.dataset.mediaMention === 'true') {
            index += mentionToken(mentionFromChip(node, [])).length;
            if (node === endNode || node.contains(endNode)) found = true;
            return;
        }
        if (node === endNode && node.nodeType === Node.TEXT_NODE) {
            index += endOffset;
            found = true;
            return;
        }
        if (node.nodeType === Node.TEXT_NODE) {
            index += node.textContent?.length || 0;
            return;
        }
        if (node instanceof HTMLBRElement) {
            if (node === endNode) {
                found = true;
                return;
            }
            index += 1;
            return;
        }
        const children = Array.from(node.childNodes);
        if (node === endNode) {
            children.slice(0, endOffset).forEach(walk);
            found = true;
            return;
        }
        children.forEach(walk);
        if (!found && node instanceof HTMLDivElement && node !== root) index += 1;
    };

    Array.from(root.childNodes).forEach(walk);
    return found ? index : null;
}

function placeCaretAtDocumentIndex(root: HTMLElement, index: number) {
    const selection = window.getSelection();
    if (!selection) return;
    let remaining = Math.max(0, index);
    const walk = (node: Node): boolean => {
        if (node instanceof HTMLElement && node.dataset.mediaMention === 'true') {
            const length = mentionToken(mentionFromChip(node, [])).length;
            if (remaining <= length) {
                const range = document.createRange();
                range.setStartAfter(node);
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
                return true;
            }
            remaining -= length;
            return false;
        }
        if (node.nodeType === Node.TEXT_NODE) {
            const length = node.textContent?.length || 0;
            if (remaining <= length) {
                const range = document.createRange();
                range.setStart(node, remaining);
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
                return true;
            }
            remaining -= length;
            return false;
        }
        if (node instanceof HTMLBRElement) {
            if (remaining <= 1) {
                const range = document.createRange();
                range.setStartAfter(node);
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
                return true;
            }
            remaining -= 1;
            return false;
        }
        for (const child of node.childNodes) {
            if (walk(child)) return true;
        }
        return false;
    };
    if (!walk(root)) {
        const range = document.createRange();
        range.selectNodeContents(root);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
    }
}

function adjacentMentionChip(range: Range, backwards: boolean): HTMLElement | null {
    const { startContainer, startOffset } = range;
    const neighbor = startContainer.nodeType === Node.TEXT_NODE
        ? (backwards && startOffset === 0
            ? startContainer.previousSibling
            : !backwards && startOffset === (startContainer.textContent || '').length
                ? startContainer.nextSibling
                : null)
        : startContainer.nodeType === Node.ELEMENT_NODE
            ? startContainer.childNodes[startOffset + (backwards ? -1 : 0)] ?? null
            : null;
    if (neighbor instanceof HTMLElement && neighbor.dataset.mediaMention === 'true') return neighbor;
    if (neighbor instanceof HTMLElement) {
        return neighbor.closest('[data-media-mention="true"]');
    }
    return null;
}

export function MediaMentionText({
    value,
    mentions = [],
}: {
    value: string;
    mentions?: StudioMediaMention[];
}) {
    return (
        <>
            {splitMentionDocument(value, mentions).map((part, index) => part.mention ? (
                <span
                    key={`${part.mention.assetId}-${index}`}
                    className={styles.chip}
                    data-media-mention="true"
                    data-asset-id={part.mention.assetId}
                    data-label={part.mention.label}
                    data-type={part.mention.type}
                    data-file-id={part.mention.fileId || undefined}
                    data-file-key={part.mention.fileKey || undefined}
                    data-url={part.mention.url || undefined}
                    data-thumb-small={part.mention.thumbnailUrl || undefined}
                    data-thumb-large={part.mention.thumbnailUrlLarge || undefined}
                >
                    {mentionThumbSrc(part.mention) && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={mentionThumbSrc(part.mention)} alt="" loading="lazy" decoding="async" />
                    )}
                    <span className={styles.chipLabel}>@{midEllipsis(part.mention.label)}</span>
                </span>
            ) : <span key={`text-${index}`}>{part.text}</span>)}
        </>
    );
}

export function MediaMentionComposer({
    value,
    mentions = [],
    onChange,
    projectId,
    placeholder,
    className = '',
    disabled = false,
    minRows = 3,
    maxHeight,
    onKeyDown,
    mentionSource = 'gallery',
    attachments = [],
    attachmentsMentions,
    attachmentsLabels,
    pickerPlacement = 'auto',
    dir,
}: MediaMentionComposerProps) {
    const { t } = useTranslation('projects');
    const { t: tc } = useTranslation('common');
    const rootRef = useRef<HTMLDivElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const mentionsRef = useRef(mentions);
    const [open, setOpen] = useState(false);
    const [scope, setScope] = useState<'project' | 'all'>(projectId ? 'project' : 'all');
    const [search, setSearch] = useState('');
    const [files, setFiles] = useState<GalleryFileItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const pickerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const insertionRangeRef = useRef<Range | null>(null);
    const emittedValueRef = useRef<string | null>(null);
    const filteredRef = useRef<MentionChoice[]>([]);
    const activeIndexRef = useRef(0);
    const selectMentionRef = useRef<(mention: StudioMediaMention) => void>(() => {});
    const [pickerStyle, setPickerStyle] = useState<CSSProperties | null>(null);
    const removeLabel = tc('remove');
    const fromAttachments = mentionSource === 'attachments';

    useEffect(() => {
        mentionsRef.current = mentions;
    }, [mentions]);

    useEffect(() => {
        const root = wrapperRef.current;
        if (!root) return;
        const isolateWheel = (event: WheelEvent) => {
            event.stopPropagation();
        };
        root.addEventListener('wheel', isolateWheel, { capture: true, passive: true });
        return () => root.removeEventListener('wheel', isolateWheel, { capture: true });
    }, []);

    useLayoutEffect(() => {
        const root = rootRef.current;
        if (!root) return;
        const live = extractDocument(root, mentionsRef.current);
        if (live.value === value) {
            emittedValueRef.current = value;
            return;
        }
        const editing = document.activeElement === root || root.contains(document.activeElement);
        if (editing && emittedValueRef.current != null && live.value === emittedValueRef.current) return;
        root.innerHTML = documentToHtml(value, mentions, removeLabel);
        emittedValueRef.current = value;
    }, [mentions, removeLabel, value]);

    // حالت پیوست: منشنی که فایلش دیگر در پیوست‌ها/ورودی‌ها نیست (حذف شده) قرمز می‌شود.
    // روی خود چیپ‌های DOM اعمال می‌شود تا ویرایشگر بازسازی نشود و نشانگر تایپ نپرد.
    const missingMentionLabel = t('mention_missing_file');
    useLayoutEffect(() => {
        const root = rootRef.current;
        if (!root) return;
        const chips = root.querySelectorAll<HTMLElement>('[data-media-mention="true"]');
        if (!fromAttachments) {
            chips.forEach((chip) => chip.removeAttribute('data-missing'));
            return;
        }
        const available = new Set<string>();
        const sources = attachmentsMentions ?? attachments.map((item) => previewMediaToMention(item));
        for (const item of sources) {
            for (const key of [item.assetId, item.fileId, item.fileKey, item.url]) {
                if (key) available.add(String(key));
            }
        }
        chips.forEach((chip) => {
            const keys = [chip.dataset.assetId, chip.dataset.fileId, chip.dataset.fileKey, chip.dataset.url];
            const missing = !keys.some((key) => key && available.has(key));
            chip.toggleAttribute('data-missing', missing);
            if (missing) chip.title = missingMentionLabel;
            else chip.removeAttribute('title');
        });
    }, [fromAttachments, attachments, attachmentsMentions, value, mentions, missingMentionLabel]);

    const openRef = useRef(open);
    openRef.current = open;
    /** Prevents double-open when keydown and beforeinput both fire for the same "@". */
    const mentionTriggerLockRef = useRef(false);

    const closePicker = useCallback(() => {
        setOpen(false);
        setSearch('');
        setError('');
        setActiveIndex(0);
        setPickerStyle(null);
        mentionTriggerLockRef.current = false;
    }, []);

    const rememberInsertionRange = useCallback(() => {
        const root = rootRef.current;
        const selection = window.getSelection();
        if (!root || !selection?.rangeCount) return;
        const range = selection.getRangeAt(0);
        if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return;
        insertionRangeRef.current = range.cloneRange();
    }, []);

    const openMentionPicker = useCallback(() => {
        if (mentionTriggerLockRef.current || openRef.current) {
            rememberInsertionRange();
            return;
        }
        mentionTriggerLockRef.current = true;
        rememberInsertionRange();
        if (!fromAttachments) {
            setLoading(true);
            setError('');
        }
        setOpen(true);
        // Release after the paired beforeinput/input from the same keystroke settle.
        window.setTimeout(() => {
            mentionTriggerLockRef.current = false;
        }, 0);
    }, [fromAttachments, rememberInsertionRange]);

    const restoreInsertionRange = useCallback(() => {
        const root = rootRef.current;
        const range = insertionRangeRef.current;
        root?.focus({ preventScroll: true });
        if (!root || !range || !root.contains(range.startContainer) || !root.contains(range.endContainer)) return;
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range.cloneRange());
    }, []);

    useEffect(() => {
        if (!open || fromAttachments) return;
        const request = scope === 'project' && projectId
            ? mediaGalleryApi.getProjectFiles(projectId)
            : mediaGalleryApi.getAllFiles();
        request
            .then((response) => setFiles(uniqueGalleryFiles(response.files || [])))
            .catch((reason) => setError(getApiErrorMessage(reason, t('gallery_error'))))
            .finally(() => setLoading(false));
    }, [open, projectId, scope, t, fromAttachments]);

    const dockPicker = pickerPlacement === 'above';
    const searchFocusedOnce = useRef(false);

    useLayoutEffect(() => {
        if (!open) {
            searchFocusedOnce.current = false;
            return;
        }
        let measuring = false;
        const sync = () => {
            if (measuring) return;
            measuring = true;
            try {
            const anchor = resolveMentionAnchor(
                measureMentionCaret(rootRef.current, insertionRangeRef.current),
                elementRect(rootRef.current),
                elementRect(wrapperRef.current),
            );
            if (!anchor) {
                setPickerStyle({
                    position: 'fixed',
                    left: 8,
                    right: 8,
                    bottom: 96,
                    width: 'auto',
                    maxHeight: 280,
                    zIndex: 10050,
                });
                return;
            }
            const vp = viewportMetrics();
            // موبایل: لیست تمام‌عرض روی کارت ورودی چت (data-mention-dock) می‌نشیند
            const dockBox = dockPicker
                ? elementRect(wrapperRef.current?.closest<HTMLElement>('[data-mention-dock]') ?? wrapperRef.current)
                : null;
            const layout = mentionPickerLayout(anchor, vp, dockPicker, dockBox);
            const next: CSSProperties = {
                position: 'fixed',
                left: layout.left,
                width: layout.width,
                maxHeight: layout.maxHeight,
                top: layout.bottom == null ? layout.top : 'auto',
                bottom: layout.bottom == null ? 'auto' : layout.bottom,
                zIndex: 10050,
            };
            setPickerStyle((prev) => {
                if (
                    prev
                    && prev.left === next.left
                    && prev.top === next.top
                    && prev.bottom === next.bottom
                    && prev.width === next.width
                    && prev.maxHeight === next.maxHeight
                ) return prev;
                return next;
            });
            } finally {
                measuring = false;
            }
        };
        sync();
        const onSelection = () => {
            const root = rootRef.current;
            const selection = window.getSelection();
            if (!root || !selection?.rangeCount) return;
            if (!root.contains(selection.getRangeAt(0).startContainer)) return;
            rememberInsertionRange();
            sync();
        };
        window.addEventListener('resize', sync);
        window.addEventListener('scroll', sync, true);
        document.addEventListener('selectionchange', onSelection);
        window.visualViewport?.addEventListener('resize', sync);
        window.visualViewport?.addEventListener('scroll', sync);
        return () => {
            window.removeEventListener('resize', sync);
            window.removeEventListener('scroll', sync, true);
            document.removeEventListener('selectionchange', onSelection);
            window.visualViewport?.removeEventListener('resize', sync);
            window.visualViewport?.removeEventListener('scroll', sync);
        };
    }, [open, dockPicker, rememberInsertionRange]);

    useEffect(() => {
        if (!open || !pickerStyle || searchFocusedOnce.current) return;
        // Desktop: focus search once. Mobile/touch: keep editor+IME focused so Android
        // Chrome does not dismiss/jump the soft keyboard when the portal mounts.
        const finePointer = window.matchMedia('(pointer: fine)').matches;
        if (!finePointer) return;
        searchFocusedOnce.current = true;
        const id = window.requestAnimationFrame(() => {
            searchInputRef.current?.focus({ preventScroll: true });
        });
        return () => window.cancelAnimationFrame(id);
    }, [open, pickerStyle]);

    useEffect(() => {
        if (!open) return;
        const onKey = (event: globalThis.KeyboardEvent) => {
            const target = event.target as Node | null;
            const inPicker = Boolean(target && pickerRef.current?.contains(target));
            const inEditor = Boolean(target && rootRef.current?.contains(target));
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                if (!inPicker && !inEditor) return;
                event.preventDefault();
                event.stopPropagation();
                const direction = event.key === 'ArrowDown' ? 1 : -1;
                setActiveIndex((current) => stepMentionIndex(current, direction, filteredRef.current.length));
                return;
            }
            if (event.key === 'Enter' && !event.shiftKey) {
                if (!inPicker && !inEditor) return;
                if (target instanceof HTMLElement && target.closest('[data-mention-choice="true"]')) return;
                const item = filteredRef.current[activeIndexRef.current];
                if (!item) return;
                event.preventDefault();
                event.stopPropagation();
                selectMentionRef.current(item.mention);
                return;
            }
            if (event.key !== 'Escape') return;
            event.preventDefault();
            event.stopPropagation();
            closePicker();
            restoreInsertionRange();
        };
        const onPointerDown = (event: PointerEvent) => {
            const target = event.target as Node;
            if (rootRef.current?.contains(target) || pickerRef.current?.contains(target)) return;
            closePicker();
        };
        window.addEventListener('keydown', onKey, true);
        window.addEventListener('pointerdown', onPointerDown, true);
        const picker = pickerRef.current;
        const stopCanvasZoom = (event: Event) => event.stopPropagation();
        picker?.addEventListener('wheel', stopCanvasZoom, { capture: true, passive: true });
        picker?.addEventListener('touchmove', stopCanvasZoom, { capture: true, passive: true });
        return () => {
            window.removeEventListener('keydown', onKey, true);
            window.removeEventListener('pointerdown', onPointerDown, true);
            picker?.removeEventListener('wheel', stopCanvasZoom, { capture: true });
            picker?.removeEventListener('touchmove', stopCanvasZoom, { capture: true });
        };
    }, [open, closePicker, pickerStyle, restoreInsertionRange]);

    const choices = useMemo<MentionChoice[]>(() => {
        if (fromAttachments) {
            const sources = attachmentsMentions
                ?? attachments
                    .filter((item) => item.type === 'image')
                    .map((item) => previewMediaToMention(item));
            return sources
                .filter((item) => item.type === 'image')
                .map((item, index) => ({
                    key: mediaListKey(item, index),
                    mention: item,
                }));
        }
        return files.map((item, index) => ({
            key: mediaListKey(item, index),
            mention: mediaRefToMention(galleryItemToStudioMedia(item)),
            subtitle: item.projectTitle,
        }));
    }, [attachments, attachmentsMentions, files, fromAttachments]);

    const filtered = useMemo(() => {
        const query = search.trim().toLowerCase();
        return choices.filter((item) => !query || [
            item.mention.label,
            item.subtitle,
        ].some((candidate) => String(candidate || '').toLowerCase().includes(query)));
    }, [choices, search]);
    filteredRef.current = filtered;
    activeIndexRef.current = activeIndex;

    useEffect(() => {
        setActiveIndex((current) => stepMentionIndex(current, 0, filtered.length));
    }, [filtered.length]);

    const emitDocument = useCallback(() => {
        const root = rootRef.current;
        if (!root) return;
        const documentState = extractDocument(root, mentionsRef.current);
        emittedValueRef.current = documentState.value;
        onChange(documentState.value, documentState.mentions);
    }, [onChange]);

    const normalizeForeignMarkup = useCallback(() => {
        const root = rootRef.current;
        if (!root || !editorHasForeignMarkup(root)) return;
        const caret = documentCaretIndex(root);
        const state = extractDocument(root, mentionsRef.current);
        root.innerHTML = documentToHtml(state.value, state.mentions, removeLabel);
        if (caret != null) placeCaretAtDocumentIndex(root, caret);
    }, [removeLabel]);

    const insertClipboard = useCallback((data: DataTransfer | null) => {
        const root = rootRef.current;
        if (!root || disabled) return;
        const fragment = clipboardFragment(data, removeLabel);
        const selection = window.getSelection();
        const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
        if (!selection || !range || !root.contains(range.startContainer) || !root.contains(range.endContainer)) {
            root.appendChild(fragment);
        } else {
            range.deleteContents();
            const last = fragment.lastChild;
            range.insertNode(fragment);
            if (last) {
                range.setStartAfter(last);
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
            }
        }
        normalizeForeignMarkup();
        rememberInsertionRange();
        emitDocument();
    }, [disabled, emitDocument, normalizeForeignMarkup, rememberInsertionRange, removeLabel]);

    // Enter always inserts a line break; sending stays owned by the surrounding UI
    // (send button + cost confirm). extractDocument serializes <br> back to '\n'.
    const insertLineBreakAtSelection = useCallback(() => {
        const root = rootRef.current;
        if (!root) return;
        let handled = false;
        try {
            handled = document.execCommand('insertLineBreak');
        } catch {
            handled = false;
        }
        if (!handled) {
            const selection = window.getSelection();
            const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
            if (selection && range && root.contains(range.startContainer)) {
                range.deleteContents();
                const br = document.createElement('br');
                range.insertNode(br);
                const caret = document.createTextNode('\u200b');
                br.after(caret);
                range.setStart(caret, 0);
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
            }
        }
        rememberInsertionRange();
        emitDocument();
    }, [rememberInsertionRange, emitDocument]);

    const removeChip = useCallback((chip: HTMLElement) => {
        const parent = chip.parentNode;
        if (!parent || !parent.contains(chip)) return;
        const spacer = chip.nextSibling;
        const caret = document.createTextNode('');
        parent.insertBefore(caret, chip);
        safeRemoveNode(chip);
        if (isSpacerText(spacer)) safeRemoveNode(spacer);

        const selection = window.getSelection();
        const range = document.createRange();
        range.setStart(caret, 0);
        range.collapse(true);
        selection?.removeAllRanges();
        selection?.addRange(range);
        emitDocument();
    }, [emitDocument]);

    const selectMention = useCallback((mention: StudioMediaMention) => {
        const root = rootRef.current;
        if (!root) return;
        const selection = window.getSelection();
        const liveRange = selection?.rangeCount ? selection.getRangeAt(0) : null;
        const savedRange = insertionRangeRef.current;
        let targetRange = liveRange
            && root.contains(liveRange.startContainer)
            && root.contains(liveRange.endContainer)
            ? liveRange.cloneRange()
            : savedRange
                && root.contains(savedRange.startContainer)
                && root.contains(savedRange.endContainer)
                ? savedRange.cloneRange()
                : null;
        if (!targetRange) {
            targetRange = document.createRange();
            targetRange.selectNodeContents(root);
            targetRange.collapse(false);
        }

        const start = targetRange.startContainer;
        if (start.nodeType === Node.TEXT_NODE) {
            const text = start.textContent || '';
            const offset = targetRange.startOffset;
            if (offset > 0 && text[offset - 1] === '@') {
                start.textContent = `${text.slice(0, offset - 1)}${text.slice(offset)}`;
                targetRange.setStart(start, offset - 1);
                targetRange.collapse(true);
            } else if (text[offset] === '@') {
                start.textContent = `${text.slice(0, offset)}${text.slice(offset + 1)}`;
                targetRange.setStart(start, offset);
                targetRange.collapse(true);
            }
        }

        const chip = createChipElement(mention, removeLabel);
        targetRange.insertNode(chip);
        const spacer = document.createTextNode(' ');
        chip.after(spacer);
        targetRange.setStartAfter(spacer);
        targetRange.collapse(true);
        insertionRangeRef.current = targetRange.cloneRange();
        selection?.removeAllRanges();
        selection?.addRange(targetRange);

        mentionsRef.current = [...new Map([...mentionsRef.current, mention].map((entry) => [entry.assetId, entry])).values()];
        emitDocument();
        closePicker();
        root.focus();
    }, [closePicker, emitDocument, removeLabel]);
    selectMentionRef.current = selectMention;

    useEffect(() => {
        if (!open) return;
        const node = pickerRef.current?.querySelector<HTMLElement>(`[data-mention-index="${activeIndex}"]`);
        node?.scrollIntoView({ block: 'nearest' });
    }, [activeIndex, open, filtered.length]);

    const picker = open ? (
        <div
            ref={pickerRef}
            className={`${styles.picker} nowheel nodrag nopan`}
            style={pickerStyle || undefined}
            onPointerDown={(event) => event.stopPropagation()}
            onWheel={(event) => event.stopPropagation()}
            onTouchMove={(event) => event.stopPropagation()}
        >
            {!fromAttachments && (
                <div className={styles.tabs}>
                    {projectId && (
                        <button
                            type="button"
                            className={scope === 'project' ? styles.activeTab : ''}
                            onClick={() => {
                                setLoading(true);
                                setError('');
                                setActiveIndex(0);
                                setScope('project');
                            }}
                        >
                            {t('mention_this_project')}
                        </button>
                    )}
                    <button
                        type="button"
                        className={scope === 'all' ? styles.activeTab : ''}
                        onClick={() => {
                            setLoading(true);
                            setError('');
                            setActiveIndex(0);
                            setScope('all');
                        }}
                    >
                        {t('mention_all_files')}
                    </button>
                </div>
            )}
            {fromAttachments && (
                <div className={styles.tabs}>
                    <span className={styles.activeTab}>
                        {attachmentsLabels?.title ?? t('mention_attached_photos')}
                    </span>
                </div>
            )}
            <label className={styles.search}>
                <LuSearch />
                <input
                    ref={searchInputRef}
                    value={search}
                    onChange={(event) => {
                        setSearch(event.target.value);
                        setActiveIndex(0);
                    }}
                    onKeyDown={(event) => {
                        if (event.key !== 'Escape') return;
                        event.preventDefault();
                        event.stopPropagation();
                        closePicker();
                        restoreInsertionRange();
                    }}
                    placeholder={t('search_gallery')}
                />
            </label>
            <div
                className={`${styles.results} nowheel`}
                onWheel={(event) => event.stopPropagation()}
                onTouchMove={(event) => event.stopPropagation()}
            >
                {!fromAttachments && loading && <p><LuLoader className={styles.spin} /> {t('loading')}</p>}
                {!fromAttachments && !loading && error && <p>{error}</p>}
                {!loading && !error && filtered.length === 0 && (
                    <p>
                        {fromAttachments
                            ? (attachmentsLabels?.empty ?? t('mention_no_attached_photos'))
                            : t('no_files_in_category')}
                    </p>
                )}
                {!loading && !error && filtered.map((item, index) => {
                    const { mention } = item;
                    const Icon = mention.type === 'image' ? LuImage : mention.type === 'video' ? LuFilm : LuVolume2;
                    const thumb = mentionThumbSrc(mention);
                    return (
                        <button
                            key={item.key}
                            type="button"
                            data-mention-choice="true"
                            data-mention-index={index}
                            className={index === activeIndex ? styles.activeResult : ''}
                            onClick={() => selectMention(mention)}
                            onMouseEnter={() => setActiveIndex(index)}
                        >
                            <span className={styles.thumb}>
                                {thumb ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={thumb} alt="" loading="lazy" decoding="async" />
                                ) : <Icon />}
                            </span>
                            <span>
                                <strong title={mention.label}>{midEllipsis(mention.label, 36)}</strong>
                                {item.subtitle ? <small>{midEllipsis(item.subtitle, 40)}</small> : null}
                            </span>
                        </button>
                    );
                })}
            </div>
            <div className={styles.hint}>
                <LuAtSign />
                {fromAttachments
                    ? (attachmentsLabels?.hint ?? t('mention_picker_hint_chat'))
                    : t('mention_picker_hint')}
            </div>
        </div>
    ) : null;

    return (
        <div
            ref={wrapperRef}
            className={`${styles.wrapper} nowheel nodrag nopan ${dockPicker && open ? styles.wrapperRaised : ''} ${className}`}
            data-lock-canvas-zoom="true"
        >
            <div
                ref={rootRef}
                dir={dir}
                className={`${styles.editor} nowheel nodrag nopan`}
                contentEditable={!disabled}
                suppressContentEditableWarning
                dangerouslySetInnerHTML={EMPTY_EDITOR_HTML}
                role="textbox"
                aria-multiline="true"
                aria-label={placeholder}
                data-placeholder={placeholder}
                style={{
                    minHeight: `${Math.max(1, minRows) * 1.45}em`,
                    maxHeight: maxHeight ?? (minRows <= 2 ? 160 : undefined),
                    overflowY: (maxHeight ?? (minRows <= 2 ? 160 : undefined)) ? 'auto' : undefined,
                    overscrollBehavior: 'contain',
                }}
                onWheel={(event) => event.stopPropagation()}
                onPaste={(event) => {
                    event.preventDefault();
                    insertClipboard(event.clipboardData);
                }}
                onDrop={(event) => {
                    const data = event.dataTransfer;
                    if (!data) return;
                    const plain = data.getData('text/plain');
                    const html = data.getData('text/html');
                    if (!plain && !html) return;
                    event.preventDefault();
                    insertClipboard(data);
                }}
                onInput={() => {
                    normalizeForeignMarkup();
                    rememberInsertionRange();
                    const root = rootRef.current;
                    // Android Chrome soft keyboards often skip keydown for "@" and may
                    // insert it even when beforeinput preventDefault is ignored.
                    if (root && !openRef.current && consumeAtBeforeCaret(root)) {
                        openMentionPicker();
                    }
                    emitDocument();
                }}
                onKeyUp={rememberInsertionRange}
                onPointerUp={rememberInsertionRange}
                onPointerDown={(event) => {
                    const removeControl = (event.target as HTMLElement).closest('[data-chip-remove="true"]');
                    if (!removeControl) return;
                    event.preventDefault();
                    event.stopPropagation();
                    const chip = removeControl.closest('[data-media-mention="true"]');
                    if (chip instanceof HTMLElement) removeChip(chip);
                }}
                onMouseDown={(event) => {
                    if ((event.target as HTMLElement).closest('[data-chip-remove="true"]')) {
                        event.preventDefault();
                        event.stopPropagation();
                    }
                }}
                onBeforeInput={(event) => {
                    const native = event.nativeEvent as InputEvent;
                    const inputType = native.inputType;
                    if (inputType === 'insertHTML') {
                        event.preventDefault();
                        if (!native.data) return;
                        const transfer = new DataTransfer();
                        transfer.setData('text/html', native.data);
                        insertClipboard(transfer);
                        return;
                    }
                    if (inputType === 'deleteContentBackward' || inputType === 'deleteContentForward') {
                        const selection = window.getSelection();
                        if (!selection?.isCollapsed || !selection.rangeCount) return;
                        const chip = adjacentMentionChip(selection.getRangeAt(0), inputType === 'deleteContentBackward');
                        if (!chip) return;
                        event.preventDefault();
                        removeChip(chip);
                        return;
                    }
                    // Primary Android / IME path: catch "@" before it lands in the DOM.
                    // Desktop/iOS still use keydown; the lock avoids double-open when both fire.
                    if (isAtSignInsert(native)) {
                        event.preventDefault();
                        openMentionPicker();
                    }
                }}
                onKeyDown={(event) => {
                    if ((event.key === 'Backspace' || event.key === 'Delete') && window.getSelection()?.isCollapsed) {
                        const range = window.getSelection()?.rangeCount
                            ? window.getSelection()!.getRangeAt(0)
                            : null;
                        const chip = range ? adjacentMentionChip(range, event.key === 'Backspace') : null;
                        if (chip) {
                            event.preventDefault();
                            removeChip(chip);
                            return;
                        }
                    }
                    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                        event.preventDefault();
                        insertLineBreakAtSelection();
                        return;
                    }
                    // Desktop + iOS Safari: soft/physical keyboards usually emit key === '@'.
                    if (event.key === '@') {
                        event.preventDefault();
                        openMentionPicker();
                        return;
                    }
                    onKeyDown?.(event);
                }}
            />

            {open && pickerStyle && typeof document !== 'undefined'
                ? createPortal(picker, document.body)
                : null}
        </div>
    );
}

export default MediaMentionComposer;
