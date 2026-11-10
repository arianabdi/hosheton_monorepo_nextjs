'use client';

import { useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { FiPlus } from 'react-icons/fi';
import { RiSendInsLine } from 'react-icons/ri';
import { LuChevronsDownUp, LuChevronsUpDown, LuEraser, LuImages, LuMaximize2, LuPencil, LuUpload, LuX } from 'react-icons/lu';
import { useTranslation } from 'react-i18next';
import { notifyError } from '@/app/lib/errors';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { uploadFileInChunks } from '@/app/(developers)/projects/[projectId]/lib/chunk-uploader';
import {
    extractClipboardMediaFiles,
    isEditablePasteTarget,
} from '@/app/(developers)/projects/[projectId]/lib/clipboard-media';
import { normalizeUploadPair, readMediaDimensions } from '@/app/(developers)/templates/lib/preview-media';
import { requestChatImageVariant } from '@/app/(developers)/projects/lib/chat-image-optimize';
import TemplatePreviewThumb from '@/app/(developers)/templates/TemplatePreviewThumb';
import { chatAttachmentsRuntimeMetrics, classifyChatFileKind, isChatFileAttachment } from '../lib/chat-attachment-kind';
import { useTextModelInputs } from '../lib/useTextModelImageInput';
import { ChatFileChip, chatFileExtension } from '../lib/ChatFileChip';
import {
    attachmentsForInput,
    fillInputKeys,
    firstOpenModeInput,
    modeInputAccept,
    modeInputKind,
    modeInputMax,
    modeInputMaxBytes,
    modeInputMaxMb,
    modeInputsReady,
    modeMediaInputs,
} from '../lib/mode-inputs';
import { useChatSession } from '../ChatSessionContext';
import { formatChatUsd } from '../lib/chat-usage';
import { chatAngleShotCount } from '../lib/chat-cost-estimate';
import { ChatCostEstimateButton, useChatCostButtonVisible } from '../ChatCostEstimate';
import CompactChatToolbar from './CompactChatToolbar';
import ChatContextUsage from './ChatContextUsage';
import ModeInputSlots from './ModeInputSlots';
import ChatCat from './cat/ChatCat';
import { PromptEditDialog } from '../../components/CustomNodes/PromptEditDialog';
import { ChatBrowsingContext } from '../v1/ChatTranscriptLayout';
import HScrollStrip from '@/app/components/HScrollStrip/HScrollStrip';
import styles from './ChatInput.module.scss';
import { GalleryModal, galleryItemToPreviewMedia } from '@/app/(developers)/gallery';
import ImageOptimizeToggle from './ImageOptimizeToggle';
import type { GalleryTab } from '@/app/(developers)/gallery/lib/gallery-types';
import { MediaMentionComposer } from '@/app/(developers)/projects/components/MediaMentionComposer';
import PromptOptimizeControl from '@/app/(developers)/projects/components/PromptOptimizeControl';
import { mediaListKey, previewMediaToMention } from '@/app/(developers)/projects/lib/studio-media';
import { useChatCostEstimate } from '@/app/(developers)/chat/lib/useChatCostEstimate';
import { CostConfirmModal, type CostConfirmSummary } from '@/app/(developers)/components/CostConfirmModal/CostConfirmModal';
import { quotedAmountOf } from '@/app/(developers)/projects/components/CostEstimatePanel';
import { useChatAttachmentValidation } from '../lib/useChatAttachmentValidation';
import { formatValidationError } from '../lib/chat-attachment-validator';
import { providersApi, type AiModeItem } from '@/app/(developers)/projects/lib/providers-api';
import { isRtlLanguage } from '@/app/lib/i18n/config';

const NARROW_COMPOSER_PX = 900;
const MOBILE_COMPOSER_PX = 640;

export default function ChatInput() {
    const { t, i18n } = useTranslation('projects');
    const { t: tc } = useTranslation('common');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const slotKeyRef = useRef('');
    const composerRef = useRef<HTMLDivElement>(null);
    const addBtnRef = useRef<HTMLButtonElement>(null);
    const addMenuRef = useRef<HTMLDivElement>(null);
    const { token } = useAuthStore();
    const [narrow, setNarrow] = useState(false);
    const [mobile, setMobile] = useState(false);
    const [addMenuOpen, setAddMenuOpen] = useState(false);
    const [addMenuStyle, setAddMenuStyle] = useState<CSSProperties | null>(null);
    const [galleryOpen, setGalleryOpen] = useState(false);
    const [showCostModal, setShowCostModal] = useState(false);
    const [costSummary, setCostSummary] = useState<CostConfirmSummary | null>(null);
    const [capabilityModes, setCapabilityModes] = useState<AiModeItem[]>([]);
    const [activeSlotKey, setActiveSlotKey] = useState('');
    const [composerResetKey, setComposerResetKey] = useState(0);
    // موبایل: کادر حداکثر ۴ خط است؛ نوشتن طولانی در همان پنجرهٔ ویرایش پرامپت نود (PromptEditDialog)
    const [expandOpen, setExpandOpen] = useState(false);
    // موبایل: کادر جمع‌شده (یک خط متن، تصاویر مرجع ریز، فقط خط مدل) — خودکار موقع دیدن خروجی‌ها،
    // یا دستی با دکمهٔ کنار پاک‌کن؛ تایپ (فوکوس متن) همیشه کادر کامل را برمی‌گرداند
    const browsing = useContext(ChatBrowsingContext);
    const [compactOverride, setCompactOverride] = useState<boolean | null>(null);
    const [textFocused, setTextFocused] = useState(false);
    useEffect(() => {
        // با هر رفت‌وبرگشت اسکرول، انتخاب دستی کنار می‌رود و حالت خودکار ادامه می‌دهد
        setCompactOverride(null);
    }, [browsing]);
    // عکس لحظهٔ باز شدن — PromptEditDialog با عوض شدن این‌ها پیش‌نویسش را از نو می‌سازد
    const [expandDraft, setExpandDraft] = useState<{ text: string; mentions: typeof mentions; media: typeof mentions }>({
        text: '',
        mentions: [],
        media: [],
    });
    const {
        promptText,
        hasPrompt,
        readComposerText,
        mentions,
        setPromptDocument,
        setPromptText,
        attachments,
        pendingUploads,
        addAttachments,
        replaceAttachments,
        updateAttachment,
        removeAttachment,
        addPendingUpload,
        updatePendingUpload,
        removePendingUpload,
        send,
        scope,
        chat,
        projectId,
        canSend,
        isGuest,
        composerBlockers,
        connectionOk,
        retryingMessageId,
        editingMessageId,
        cancelEdit,
        submitEditedTurn,
        settings,
        mediaKind,
    } = useChatSession();
    // چت متنی (LLM): عکس اگر مدل vision است، و سند/کد/جدول اگر «فایل‌های ورودی» مدل در naslyar روشن است
    const isTextChat = mediaKind === 'text';
    const textInputs = useTextModelInputs(isTextChat ? String(settings.modelId || '') : '');
    const textImageAllowed = textInputs.imageAllowed;
    const textFiles = isTextChat ? textInputs.files : null;
    const textUploadAllowed = isTextChat && (textImageAllowed || Boolean(textFiles));
    // فایل غیرتصویری در چت متنی = سند/کد/جدول (به متن تبدیل می‌شود)
    const isTextDocument = useCallback((file: File) => (
        isTextChat
        && !(file.type || '').toLowerCase().startsWith('image/')
        && !/\.(png|jpe?g|gif|webp|bmp|avif|heic)$/i.test(file.name || '')
    ), [isTextChat]);
    const documentAccept = textFiles ? textFiles.formats.map((ext) => `.${ext}`).join(',') : '';
    /** پیام مشکل هر فایل متنی با مدل فعلی (مثلاً بعد از عوض‌کردن مدل) — ارسال را مسدود می‌کند */
    const fileIssue = useCallback((name: string, sizeBytes?: number) => {
        if (!textFiles) return t('chat_file_model_no_files', { defaultValue: 'این مدل فایل نمی‌پذیرد' });
        const ext = chatFileExtension(name);
        if (!textFiles.formats.includes(ext)) {
            return t('chat_file_format_not_allowed', { ext: ext || '?', defaultValue: 'قالب .{{ext}} برای این مدل مجاز نیست' });
        }
        if (sizeBytes && sizeBytes > textFiles.maxFileMb * 1024 * 1024) {
            return t('chat_file_too_large', { max: textFiles.maxFileMb });
        }
        return '';
    }, [textFiles, t]);
    const costButtonVisible = useChatCostButtonVisible();

    // تخمین قیمت فقط وقتی پنجره تأیید باز است — تایپ نباید درخواست بزند.
    // چت متنی این پنجره را ندارد، چون توکن خروجی هنوز معلوم نیست.
    const inputCardRef = useRef<HTMLDivElement>(null);
    const { estimate: costEstimate, loading: costLoading, error: costError } = useChatCostEstimate(
        settings,
        mediaKind,
        attachments,
        readComposerText,
        showCostModal && !isTextChat,
    );
    const [messageEstimate, setMessageEstimate] = useState<{
        amount: number | null;
        unit: string;
        pricingMode?: string;
        breakdown?: Record<string, unknown>;
    }>({
        amount: null,
        unit: 'message',
    });
    const onEstimateChange = useCallback((next: {
        amount: number | null;
        unit: string;
        pricingMode?: string;
        breakdown?: Record<string, unknown>;
    }) => {
        setMessageEstimate((prev) => (
            prev.amount === next.amount
            && prev.unit === next.unit
            && prev.pricingMode === next.pricingMode
            && prev.breakdown === next.breakdown
                ? prev
                : next
        ));
    }, []);
    const {
        getAttachmentErrors,
        validation: attachmentValidation,
        routeMatched: attachmentRouteMatched,
        modelLimits: attachmentModelLimits,
    } = useChatAttachmentValidation(settings, attachments);

    const composerLocked = !connectionOk || Boolean(retryingMessageId);
    const compact = mobile && !textFocused && !editingMessageId && (compactOverride ?? browsing);
    const composerHasContent = hasPrompt || attachments.length > 0;
    const clearComposer = () => {
        setPromptDocument('', []);
        setPromptText('');
        // promptText هنگام تایپ منتشر نمی‌شود و ممکن است همین حالا '' باشد — ادیتور با کلید تازه از نو ساخته می‌شود
        setComposerResetKey((value) => value + 1);
        // replaceAttachments نه removeAttachment: فایل آپلودشده از سرور پاک نشود
        replaceAttachments([]);
    };
    // تا تکلیف بهینه‌سازی پرامپت روشن شود (اعمال یا خطا)، ارسال و ویرایش قفل است.
    const [optimizeRunning, setOptimizeRunning] = useState(false);
    const selectedMode = useMemo(
        () => capabilityModes.find((mode) => mode.id === String(settings.capabilityMode || '').trim()) || null,
        [capabilityModes, settings.capabilityMode],
    );
    const mediaInputs = useMemo(
        () => (settings.chatPanels?.mode === false ? [] : modeMediaInputs(selectedMode?.inputs)),
        [selectedMode, settings.chatPanels?.mode],
    );
    const slotsReady = !mediaInputs.length || modeInputsReady(selectedMode?.inputs, attachments);
    const leftoverAttachments = mediaInputs.length
        ? attachments.filter((item) => !mediaInputs.some((input) => input.key === item.inputKey))
        : attachments;
    const activeSlot = mediaInputs.find((input) => input.key === activeSlotKey) || null;

    const fileAttachments = useMemo(() => attachments.filter(isChatFileAttachment), [attachments]);
    const fileIssues = useMemo(() => {
        const issues = fileAttachments
            .map((item) => fileIssue(item.label || item.url, item.sizeBytes))
            .filter(Boolean);
        if (textFiles && fileAttachments.length > textFiles.maxFiles) {
            issues.push(t('chat_file_max_count', { max: textFiles.maxFiles, defaultValue: 'حداکثر {{max}} فایل در هر پیام' }));
        }
        return [...new Set(issues)];
    }, [fileAttachments, fileIssue, textFiles, t]);
    // پیوست‌هایی که می‌شود منشن کرد — فایل‌های متنی منشن نمی‌شوند
    const mentionableAttachments = useMemo(() => attachments.filter((item) => !isChatFileAttachment(item)), [attachments]);

    // هر ارور اعتبارسنجی (تعداد، حجم، مدت، فرمت) ارسال را مسدود می‌کند،
    // پس همه‌شان زیر پیوست‌ها نشان داده می‌شوند تا کاربر دلیل را بداند.
    const validationIssues = useMemo(() => {
        const messages = attachmentValidation.errors.map((error) => formatValidationError(error, t));
        return [...new Set(messages)];
    }, [attachmentValidation.errors, t]);

    // وقتی هیچ mode/روتی این ترکیب ورودی را نمی‌پذیرد، سقف قابل پذیرش کل مدل نشان داده می‌شود
    // (مثل resolver پنل مدل‌ها)؛ انواع با سقف صفر یا نامحدود نمایش داده نمی‌شوند.
    const modelLimitMessage = useMemo(() => {
        if (attachmentRouteMatched) return '';
        const mb = (bytes: number | null) => {
            if (typeof bytes !== 'number' || bytes <= 0) return null;
            const value = bytes / (1024 * 1024);
            return Number.isInteger(value) ? value : Math.round(value * 10) / 10;
        };
        const kinds: Array<{ max: number | null; sizeMax: number | null; label: string }> = attachmentModelLimits ? [
            { max: attachmentModelLimits.imageMax, sizeMax: mb(attachmentModelLimits.imageFileSizeMax), label: t('chat_kind_image') },
            { max: attachmentModelLimits.videoMax, sizeMax: mb(attachmentModelLimits.videoFileSizeMax), label: t('chat_kind_video') },
            { max: attachmentModelLimits.audioMax, sizeMax: mb(attachmentModelLimits.audioFileSizeMax), label: t('chat_kind_audio') },
        ] : [];
        const limitsText = kinds
            .filter(({ max }) => typeof max === 'number' && max > 0)
            .map(({ max, sizeMax, label }) => `${max} ${label}${sizeMax != null ? ` ${t('chat_limit_size_suffix', { size: sizeMax })}` : ''}`)
            .join(' • ');
        return limitsText
            ? t('chat_model_limit_exceeded_with_limits', { limits: limitsText })
            : t('chat_model_limit_exceeded');
    }, [attachmentRouteMatched, attachmentModelLimits, t]);

    // جهت پیام‌های خطا مطابق زبان کاربر (فارسی → rtl)
    const messageDir = isRtlLanguage(i18n.language) ? 'rtl' : 'ltr';

    useEffect(() => {
        const modelId = String(settings.modelId || '').trim();
        if (!modelId || composerLocked) {
            setCapabilityModes([]);
            return;
        }
        let cancelled = false;
        providersApi.listModesForModel(modelId)
            .then((res) => {
                if (!cancelled) setCapabilityModes(res.modes || []);
            })
            .catch(() => {
                if (!cancelled) setCapabilityModes([]);
            });
        return () => { cancelled = true; };
    }, [settings.modelId, composerLocked]);

    useEffect(() => {
        if (!mediaInputs.length) return;
        const next = fillInputKeys(attachments, selectedMode?.inputs);
        const changed = next.some((item, index) => String(item.inputKey || '') !== String(attachments[index]?.inputKey || ''));
        if (changed) replaceAttachments(next);
    }, [attachments, mediaInputs, selectedMode?.inputs, replaceAttachments]);

    const slotRemaining = useCallback((key: string) => {
        const input = mediaInputs.find((item) => item.key === key);
        if (!input) return 0;
        const used = attachmentsForInput(attachments, key).length
            + pendingUploads.filter((item) => item.inputKey === key).length;
        return Math.max(0, modeInputMax(input) - used);
    }, [mediaInputs, attachments, pendingUploads]);

    // Gallery/restored references carry no sizeBytes; probe once via HEAD so
    // file-size and total-size limits can be enforced on them too.
    const sizeProbedRef = useRef(new Set<string>());
    useEffect(() => {
        for (const item of attachments) {
            const probeKey = item.fileId || item.fileKey || item.url;
            if (!probeKey || sizeProbedRef.current.has(probeKey)) continue;
            sizeProbedRef.current.add(probeKey);
            if (item.sizeBytes != null || !item.url) continue;
            const itemRef = item;
            void fetch(item.url, { method: 'HEAD' })
                .then((response) => {
                    const length = Number(response.headers.get('content-length'));
                    if (response.ok && Number.isFinite(length) && length > 0) {
                        updateAttachment(itemRef, { sizeBytes: length });
                    }
                })
                .catch(() => undefined);
        }
    }, [attachments, updateAttachment]);

    useEffect(() => {
        if (!connectionOk) {
            setAddMenuOpen(false);
            setGalleryOpen(false);
        }
    }, [connectionOk]);

    const requestSend = useCallback(() => {
        // مهمان: بدون پنجره‌ی تأیید هزینه، مستقیم پنجره‌ی ورود (داخل send)
        if (isGuest) {
            void send();
            return;
        }
        if (!canSend || !slotsReady || optimizeRunning || fileIssues.length) return;

        if (editingMessageId) {
            void submitEditedTurn();
            return;
        }
        if (isTextChat) {
            void send();
            return;
        }
        // خلاصه درخواست برای رسید پنجره تأیید — همان لحظه باز شدن گرفته می‌شود
        const metrics = chatAttachmentsRuntimeMetrics(attachments);
        setCostSummary({
            kind: mediaKind,
            modelLabel: String(settings.modelName || settings.model || ''),
            promptLength: readComposerText().trim().length,
            images: metrics.inputImageCount,
            videos: metrics.inputVideoCount,
            audios: metrics.inputAudioCount,
            outputs: chatAngleShotCount(settings, mediaKind) || undefined,
        });
        setShowCostModal(true);
    }, [isGuest, canSend, slotsReady, optimizeRunning, fileIssues.length, editingMessageId, submitEditedTurn, isTextChat, send, attachments, mediaKind, settings, readComposerText]);

    const handleCostConfirm = useCallback(() => {
        setShowCostModal(false);
        // مبلغی که کاربر تأیید کرد همراه ارسال می‌رود؛ سرور دقیقاً همین را کسر می‌کند
        void send({ quotedUsd: quotedAmountOf(costEstimate) });
    }, [send, costEstimate]);

    const handleCostCancel = useCallback(() => {
        setShowCostModal(false);
    }, []);

    useEffect(() => {
        const composer = composerRef.current;
        if (!composer) return;
        const column = composer.closest('[data-chat-column]') ?? composer;
        const sync = () => {
            const width = column.getBoundingClientRect().width;
            setNarrow(width < NARROW_COMPOSER_PX);
            setMobile(width < MOBILE_COMPOSER_PX);
        };
        sync();
        const observer = new ResizeObserver(sync);
        observer.observe(column);
        return () => observer.disconnect();
    }, []);

    useLayoutEffect(() => {
        if (!addMenuOpen || !addBtnRef.current) {
            setAddMenuStyle(null);
            return;
        }
        const sync = () => {
            const rect = addBtnRef.current?.getBoundingClientRect();
            if (!rect) return;
            const width = 220;
            setAddMenuStyle({
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
    }, [addMenuOpen]);

    useEffect(() => {
        if (!addMenuOpen) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            setAddMenuOpen(false);
        };
        const onPointerDown = (event: PointerEvent) => {
            const target = event.target as Node;
            if (addBtnRef.current?.contains(target) || addMenuRef.current?.contains(target)) return;
            setAddMenuOpen(false);
        };
        window.addEventListener('keydown', onKey, true);
        window.addEventListener('pointerdown', onPointerDown, true);
        return () => {
            window.removeEventListener('keydown', onKey, true);
            window.removeEventListener('pointerdown', onPointerDown, true);
        };
    }, [addMenuOpen]);

    const runUpload = useCallback(async (id: string, file: File, inputKey?: string) => {
        if (!token) return;
        updatePendingUpload(id, { status: 'uploading', progress: 0 });
        try {
            const result = await uploadFileInChunks({
                file,
                token,
                onProgress: (value) => updatePendingUpload(id, { progress: value }),
                metadata: {
                    mimetype: file.type || 'image/jpeg',
                    size: file.size,
                    source: 'studio-chat',
                },
            });
            const media = normalizeUploadPair(result);
            if (!media) {
                updatePendingUpload(id, { status: 'failed' });
                return;
            }
            if (isTextDocument(file)) {
                // سند/کد/جدول: بدون ابعاد و نسخه‌ی بهینه — سرور هنگام ارسال متنش را می‌خواند
                addAttachments([{
                    ...media,
                    type: 'file',
                    label: file.name,
                    mime: file.type || '',
                    sizeBytes: file.size,
                    thumbnailUrl: undefined,
                    thumbnailUrlLarge: undefined,
                    source: 'upload' as const,
                    inputKey: '',
                }]);
                removePendingUpload(id);
                return;
            }
            const kind = classifyChatFileKind(file);
            const dimensions = await readMediaDimensions(file);
            let attachment = {
                ...media,
                ...dimensions,
                type: kind,
                sizeBytes: file.size,
                source: 'upload' as const,
                inputKey: inputKey || '',
            };
            if (kind === 'image' && media.fileId) {
                const variant = await requestChatImageVariant(media.fileId);
                if (variant?.applied && variant.url && variant.fileId) {
                    const width = variant.width || attachment.width;
                    const height = variant.height || attachment.height;
                    attachment = {
                        ...attachment,
                        url: variant.url,
                        fileId: variant.fileId,
                        fileKey: variant.key || attachment.fileKey,
                        width,
                        height,
                        aspectRatio: width && height ? width / height : attachment.aspectRatio,
                        sizeBytes: variant.size || attachment.sizeBytes,
                    };
                }
            }
            addAttachments([attachment]);
            removePendingUpload(id);
        } catch {
            updatePendingUpload(id, { status: 'failed' });
        }
    }, [token, addAttachments, removePendingUpload, updatePendingUpload, isTextDocument]);

    const uploadFiles = useCallback(async (files: File[], inputKey?: string) => {
        // چت متنی: عکس فقط برای مدل vision، سند/کد/جدول فقط با «فایل‌های ورودی» مدل
        if (isTextChat && !textImageAllowed && !textFiles) return;
        if (!files.length || !token || !connectionOk) return;
        const accepted: Array<{ file: File; slotKey: string; document?: boolean }> = [];
        let documentCount = fileAttachments.length + pendingUploads.filter((item) => item.kind === 'file').length;
        for (const file of files) {
            const kind = classifyChatFileKind(file);
            if (isTextDocument(file)) {
                const issue = fileIssue(file.name, file.size);
                if (issue) {
                    notifyError({ message: `${file.name}: ${issue}` });
                    continue;
                }
                if (textFiles && documentCount >= textFiles.maxFiles) {
                    notifyError({ message: t('chat_file_max_count', { max: textFiles.maxFiles, defaultValue: 'حداکثر {{max}} فایل در هر پیام' }) });
                    continue;
                }
                documentCount += 1;
                accepted.push({ file, slotKey: '', document: true });
                continue;
            }
            if (isTextChat && (kind !== 'image' || !textImageAllowed)) {
                notifyError({ message: t('chat_text_image_not_allowed', { defaultValue: 'این مدل تصویر نمی‌پذیرد' }) });
                continue;
            }
            let slotKey = inputKey || '';
            if (mediaInputs.length) {
                if (slotKey) {
                    const slot = mediaInputs.find((input) => input.key === slotKey);
                    if (!slot || modeInputKind(slot.type) !== kind || slotRemaining(slotKey) <= 0) {
                        notifyError({
                            message: t('chat_slot_kind_only', {
                                slot: slot?.labelFa || slot?.label || t('chat_kind_file'),
                                kind: kind === 'image' ? t('chat_kind_image') : kind === 'video' ? t('chat_kind_video') : t('chat_kind_audio'),
                            }),
                        });
                        continue;
                    }
                } else {
                    const open = firstOpenModeInput(selectedMode?.inputs, [
                        ...attachments,
                        ...pendingUploads.map((item) => ({ inputKey: item.inputKey, type: item.kind })),
                        ...accepted.map((item) => ({ inputKey: item.slotKey, type: classifyChatFileKind(item.file) })),
                    ], kind);
                    if (!open?.key) {
                        notifyError({ message: t('chat_no_open_slot') });
                        continue;
                    }
                    slotKey = String(open.key);
                }
            }
            const slot = mediaInputs.find((input) => input.key === slotKey);
            const maxBytes = modeInputMaxBytes(slot);
            if (maxBytes && file.size > maxBytes) {
                notifyError({ message: t('chat_file_too_large', { max: modeInputMaxMb(slot) }) });
                continue;
            }
            accepted.push({ file, slotKey });
        }
        const batch = accepted.map((item) => ({
            id: `${item.file.name}-${item.file.size}-${item.file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
            file: item.file,
            localUrl: item.document ? '' : URL.createObjectURL(item.file),
            inputKey: item.slotKey,
            document: Boolean(item.document),
        }));
        for (const item of batch) {
            addPendingUpload({
                id: item.id,
                name: item.file.name,
                localUrl: item.localUrl,
                progress: 0,
                kind: item.document ? 'file' : classifyChatFileKind(item.file),
                status: 'uploading',
                file: item.file,
                inputKey: item.inputKey,
            });
        }
        await Promise.all(batch.map((item) => runUpload(item.id, item.file, item.inputKey)));
    }, [isTextChat, textImageAllowed, textFiles, isTextDocument, fileIssue, fileAttachments.length, token, connectionOk, addPendingUpload, runUpload, mediaInputs, selectedMode?.inputs, attachments, pendingUploads, slotRemaining, t]);

    const uploadFilesRef = useRef(uploadFiles);
    useEffect(() => {
        uploadFilesRef.current = uploadFiles;
    }, [uploadFiles]);

    useEffect(() => {
        const onWindowPaste = (event: ClipboardEvent) => {
            if (!connectionOk) return;
            const media = extractClipboardMediaFiles(event.clipboardData);
            if (!media.length) return;
            const target = event.target;
            const insideComposer = Boolean(target instanceof Node && composerRef.current?.contains(target));
            if (!insideComposer && isEditablePasteTarget(target)) return;
            event.preventDefault();
            void uploadFilesRef.current(media.map((item) => item.file));
        };
        window.addEventListener('paste', onWindowPaste);
        return () => window.removeEventListener('paste', onWindowPaste);
    }, [connectionOk]);

    return (
        <div
            ref={composerRef}
            className={`${styles.composer} ${narrow ? styles.compactNarrow : ''} ${mobile ? styles.compactMobile : ''} ${!connectionOk ? styles.composerOffline : ''}`}
        >
            {!connectionOk && (
                <div className={styles.connectionBanner} role="status">
                    {t('chat_connection_lost')}
                </div>
            )}
            {editingMessageId && (
                <div className={styles.editModeBanner} role="status">
                    <span>
                        <LuPencil aria-hidden />
                        <span>
                            <strong>{t('chat_edit_mode')}</strong>
                            <small>{t('chat_edit_mode_hint')}</small>
                        </span>
                    </span>
                    <button
                        type="button"
                        onClick={cancelEdit}
                        disabled={composerLocked}
                        aria-label={t('chat_cancel')}
                    >
                        <LuX />
                        {t('chat_cancel')}
                    </button>
                </div>
            )}
            <div
                ref={inputCardRef}
                className={`${styles.inputCardWrapper} ${compact ? styles.compact : ''}`}
                data-mention-dock
                onFocus={(event) => {
                    if ((event.target as HTMLElement).isContentEditable) setTextFocused(true);
                }}
                onBlur={(event) => {
                    if ((event.target as HTMLElement).isContentEditable) setTextFocused(false);
                }}
            >
                <ChatCat hidden={composerLocked || Boolean(editingMessageId)} />
                {/* بالای لبه کارت: باز/بسته کردن کادر (فقط موبایل) + خالی کردن کادر */}
                <div className={styles.edgeStart}>
                    {mobile && !editingMessageId ? (
                        <button
                            type="button"
                            className={styles.edgeBtn}
                            // فوکوس نگیرد تا خودِ فوکوس کادر را دوباره باز نکند
                            onPointerDown={(event) => event.preventDefault()}
                            onClick={() => {
                                if (compact) {
                                    setCompactOverride(false);
                                    return;
                                }
                                setCompactOverride(true);
                                const active = document.activeElement;
                                if (active instanceof HTMLElement && inputCardRef.current?.contains(active)) active.blur();
                            }}
                            aria-label={compact ? t('chat_composer_open') : t('chat_composer_close')}
                            title={compact ? t('chat_composer_open') : t('chat_composer_close')}
                            aria-pressed={compact}
                        >
                            {compact ? <LuChevronsUpDown /> : <LuChevronsDownUp />}
                        </button>
                    ) : null}
                    {/* خالی کردن کادر (پرامپت + رسانه‌ها) — فایل‌ها حذف نمی‌شوند و در گالری می‌مانند */}
                    {composerHasContent && !editingMessageId ? (
                        <button
                            type="button"
                            className={`${styles.edgeBtn} ${styles.clearComposer}`}
                            disabled={composerLocked}
                            onClick={clearComposer}
                            aria-label={t('chat_clear_composer')}
                            title={t('chat_clear_composer')}
                        >
                            <LuEraser />
                        </button>
                    ) : null}
                </div>
                {/* بهینه‌سازی پرامپت — بالای لبه کارت، سمت مقابل پاک‌کن؛ در موبایل فقط آیکون + دکمهٔ باز کردن بزرگ */}
                {mediaKind === 'image' || mediaKind === 'video' || mediaKind === 'text' ? (
                    <div className={styles.optimizeFloat}>
                        <PromptOptimizeControl
                            compact
                            hideLabel={mobile}
                            className={styles.optimizeFloatChip}
                            disabled={composerLocked}
                            readPrompt={readComposerText}
                            mentions={mentions}
                            projectId={projectId}
                            onRunningChange={setOptimizeRunning}
                            onApply={(next, nextMentions) => {
                                setPromptDocument(next, nextMentions);
                                setPromptText(next);
                            }}
                        />
                    </div>
                ) : null}
                <div className={styles.mainInputArea}>
                    {mediaInputs.length ? (
                        <ModeInputSlots
                            inputs={mediaInputs}
                            attachments={attachments}
                            pendingUploads={pendingUploads}
                            disabled={composerLocked}
                            onUpload={(key) => {
                                slotKeyRef.current = key;
                                setActiveSlotKey(key);
                                fileInputRef.current?.click();
                            }}
                            onGallery={(key) => {
                                slotKeyRef.current = key;
                                setActiveSlotKey(key);
                                setGalleryOpen(true);
                            }}
                            onRemove={(item) => { void removeAttachment(item); }}
                            getAttachmentErrors={getAttachmentErrors}
                        />
                    ) : null}
                    {leftoverAttachments.length > 0 || (!mediaInputs.length && pendingUploads.length > 0) ? (
                        // موبایل موقع دیدن خروجی‌ها کوچک می‌شود (data-chat-browsing)
                        <div className={styles.attachStrip}>
                            <HScrollStrip>
                                {!mediaInputs.length ? pendingUploads.map((pending) => (pending.kind === 'file' ? (
                                    <ChatFileChip
                                        key={pending.id}
                                        name={pending.name}
                                        sizeBytes={pending.file.size}
                                        progress={pending.progress}
                                        failed={pending.status === 'failed'}
                                        onRetry={connectionOk ? () => void runUpload(pending.id, pending.file, pending.inputKey) : undefined}
                                        onRemove={pending.status === 'failed' ? () => removePendingUpload(pending.id) : undefined}
                                    />
                                ) : (
                                    <div
                                        key={pending.id}
                                        className={`${styles.pendingThumb} ${pending.status === 'failed' ? styles.pendingFailed : ''}`}
                                    >
                                        {pending.kind === 'audio' ? (
                                            <div className={styles.pendingAudio} aria-hidden>♪</div>
                                        ) : (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={pending.localUrl} alt="" />
                                        )}
                                        {pending.status === 'failed' ? (
                                            <div className={styles.pendingFailOverlay}>
                                                <button
                                                    type="button"
                                                    disabled={!connectionOk}
                                                    onClick={() => void runUpload(pending.id, pending.file, pending.inputKey)}
                                                >
                                                    {tc('retry')}
                                                </button>
                                                <button
                                                    type="button"
                                                    className={styles.pendingDismiss}
                                                    onClick={() => removePendingUpload(pending.id)}
                                                    aria-label={tc('close')}
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ) : (
                                            <span>{Math.round(pending.progress)}%</span>
                                        )}
                                    </div>
                                ))) : null}
                                {leftoverAttachments.map((media, index) => {
                                    if (isChatFileAttachment(media)) {
                                        return (
                                            <ChatFileChip
                                                key={mediaListKey(media, index)}
                                                name={media.label || media.url}
                                                url={media.url}
                                                sizeBytes={media.sizeBytes}
                                                invalidMessage={fileIssue(media.label || media.url, media.sizeBytes) || undefined}
                                                onRemove={composerLocked ? undefined : () => removeAttachment(media)}
                                            />
                                        );
                                    }
                                    const attachmentErrors = getAttachmentErrors(media);
                                    return (
                                        <TemplatePreviewThumb
                                            key={mediaListKey(media, index)}
                                            media={media}
                                            preferOptimizedThumb
                                            invalid={attachmentErrors.length > 0}
                                            errorMessages={attachmentErrors.map((error) => formatValidationError(error, t))}
                                            onRemove={composerLocked ? undefined : () => removeAttachment(media)}
                                        />
                                    );
                                })}
                            </HScrollStrip>
                        </div>
                    ) : null}
                    {/* وقتی هیچ mode‌ای تطبیق نمی‌کند: سقف کل مدل؛ وگرنه ارورهای اعتبارسنجی — جهت مطابق زبان */}
                    {fileIssues.length > 0 ? (
                        <div style={{ color: '#dc2626', fontSize: '12px' }} dir={messageDir}>
                            {fileIssues.map((issue) => (
                                <div key={issue}>{issue}</div>
                            ))}
                        </div>
                    ) : null}
                    {modelLimitMessage ? (
                        <div style={{ color: '#dc2626', fontSize: '12px' }} dir={messageDir}>{modelLimitMessage}</div>
                    ) : validationIssues.length > 0 ? (
                        <div style={{ color: '#dc2626', fontSize: '12px' }} dir={messageDir}>
                            {validationIssues.map((issue) => (
                                <div key={issue}>{issue}</div>
                            ))}
                        </div>
                    ) : null}
                    <div className={styles.composerTextSlot}>
                        {/* موبایل: گوشهٔ راست خود کادر، فقط وقتی کادر فعال (فوکوس) است */}
                        {mobile && !editingMessageId ? (
                            <button
                                type="button"
                                className={styles.expandBtn}
                                disabled={composerLocked}
                                // فوکوس کادر نپرد تا دکمه همان لحظه پنهان نشود
                                onPointerDown={(event) => event.preventDefault()}
                                onClick={() => {
                                    setExpandDraft({
                                        text: readComposerText(),
                                        mentions,
                                        media: mentionableAttachments.map(previewMediaToMention),
                                    });
                                    setExpandOpen(true);
                                }}
                                aria-label={t('chat_expand')}
                                title={t('chat_expand')}
                            >
                                <LuMaximize2 size={13} />
                            </button>
                        ) : null}
                        {costButtonVisible ? (
                            <div className={styles.costAnchor}>
                                <ChatCostEstimateButton compact={narrow} />
                            </div>
                        ) : null}
                        <MediaMentionComposer
                            key={composerResetKey}
                            className={styles.composerTextarea}
                            placeholder={t('chat_input_placeholder')}
                            // جهت تایپ بر اساس اولین حرف قوی متن خودکار تشخیص داده می‌شود:
                            // فارسی/عربی → راست‌چین، انگلیسی و بقیه → چپ‌چین
                            dir="auto"
                            value={promptText}
                            mentions={mentions}
                            mentionSource="attachments"
                            attachments={mentionableAttachments}
                            pickerPlacement="above"
                            minRows={1}
                            // موبایل: حداکثر ۴ خط (line-height 1.55)، بقیه اسکرول؛ متن بلند در پنجرهٔ بزرگ
                            maxHeight={mobile ? '6.2em' : undefined}
                            disabled={composerLocked || optimizeRunning}
                            onChange={setPromptDocument}
                        />
                    </div>

                    <div className={`${styles.bottomControls} ${isTextChat ? '' : styles.withCost}`}>
                        <div className={styles.leftTools}>
                            {!mediaInputs.length && (!isTextChat || textUploadAllowed) ? (
                                <button
                                    ref={addBtnRef}
                                    type="button"
                                    className={`${styles.addBtn} ${addMenuOpen ? styles.addBtnOpen : ''}`}
                                    aria-label={t('upload_or_url')}
                                    aria-expanded={addMenuOpen}
                                    disabled={composerLocked}
                                    onClick={() => setAddMenuOpen((open) => !open)}
                                >
                                    <FiPlus />
                                </button>
                            ) : null}
                        </div>

                        <div className={styles.compactToolbar}>
                            <CompactChatToolbar
                                compact={compact}
                                narrow={narrow}
                                mobile={mobile}
                                disabled={composerLocked}
                                onEstimateChange={onEstimateChange}
                            />
                        </div>

                        <div className={styles.rightTools}>
                            {!isTextChat && messageEstimate.amount != null ? (
                                <span className={styles.sendCostChip} dir="ltr">
                                    {formatChatUsd(messageEstimate.amount)}/{t(`chat_unit_${messageEstimate.unit}`, {defaultValue: messageEstimate.unit})}
                                </span>
                            ) : null}
                            <button
                                type="button"
                                className={styles.sendBtn}
                                onClick={requestSend}
                                disabled={!canSend || !slotsReady || optimizeRunning || fileIssues.length > 0}
                                title={fileIssues[0] || composerBlockers[0] || undefined}
                            >
                                <RiSendInsLine size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            {isTextChat ? (
                <div className={styles.usageDock}>
                    <ChatContextUsage
                        anchorRef={inputCardRef}
                        estimateUsd={messageEstimate.amount}
                        estimateUnit={messageEstimate.unit}
                        pricingMode={messageEstimate.pricingMode}
                        breakdown={messageEstimate.breakdown}
                        mediaKind={mediaKind}
                    />
                </div>
            ) : null}

            <input
                ref={fileInputRef}
                type="file"
                accept={activeSlot
                    ? modeInputAccept(activeSlot.type)
                    : isTextChat
                        ? [textImageAllowed ? 'image/*' : '', documentAccept].filter(Boolean).join(',')
                        : 'image/*,video/*,audio/*'}
                multiple={!activeSlot || slotRemaining(String(activeSlot.key)) > 1}
                hidden
                onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    const slotKey = slotKeyRef.current || activeSlotKey;
                    e.target.value = '';
                    slotKeyRef.current = '';
                    setActiveSlotKey('');
                    void uploadFiles(files, slotKey || undefined);
                }}
            />

            {addMenuOpen && addMenuStyle && createPortal(
                <div ref={addMenuRef} className={styles.addMenu} style={addMenuStyle}>
                    <button
                        type="button"
                        className={styles.addMenuItem}
                        onClick={() => {
                            setAddMenuOpen(false);
                            slotKeyRef.current = '';
                            setActiveSlotKey('');
                            fileInputRef.current?.click();
                        }}
                    >
                        <LuUpload /> {t('chat_add_from_device')}
                    </button>
                    {!isTextChat || textImageAllowed ? (
                        <button
                            type="button"
                            className={styles.addMenuItem}
                            onClick={() => {
                                setAddMenuOpen(false);
                                setGalleryOpen(true);
                            }}
                        >
                            <LuImages /> {t('chat_add_from_gallery')}
                        </button>
                    ) : null}
                    <ImageOptimizeToggle />
                </div>,
                document.body,
            )}

            <GalleryModal
                open={galleryOpen}
                onClose={() => {
                    setGalleryOpen(false);
                    slotKeyRef.current = '';
                    setActiveSlotKey('');
                }}
                scope={scope.kind === 'personal' ? 'personal' : 'project'}
                chatId={scope.kind === 'personal' ? chat?._id : undefined}
                projectId={scope.kind === 'project' ? scope.projectId || projectId : undefined}
                mode={activeSlot && slotRemaining(String(activeSlot.key)) <= 1 ? 'select' : 'multi-select'}
                initialTab={(activeSlot ? modeInputKind(activeSlot.type) : 'image') as GalleryTab}
                allowedType={activeSlot ? modeInputKind(activeSlot.type) : (isTextChat ? 'image' : undefined)}
                maxCount={activeSlot ? slotRemaining(String(activeSlot.key)) : undefined}
                maxBytes={modeInputMaxBytes(activeSlot)}
                selectedIds={activeSlot ? [] : attachments.flatMap((item) => (
                    [item.id, item.fileId, item.fileKey, item.url].filter(Boolean) as string[]
                ))}
                onSelect={(item) => {
                    const slotKey = slotKeyRef.current || activeSlotKey;
                    const slot = mediaInputs.find((input) => input.key === slotKey);
                    slotKeyRef.current = '';
                    setActiveSlotKey('');
                    const mapped = galleryItemToPreviewMedia(item);
                    if (slot) {
                        addAttachments([{ ...mapped, inputKey: String(slot.key) }]);
                        return;
                    }
                    addAttachments([mapped]);
                }}
                onSelectMany={(items) => {
                    const slotKey = slotKeyRef.current || activeSlotKey;
                    const slot = mediaInputs.find((input) => input.key === slotKey);
                    slotKeyRef.current = '';
                    setActiveSlotKey('');
                    const mapped = items.map(galleryItemToPreviewMedia);
                    if (!mediaInputs.length) {
                        addAttachments(mapped);
                        return;
                    }
                    if (slot) {
                        const kind = modeInputKind(slot.type);
                        const remaining = slotRemaining(String(slot.key));
                        const fitted = mapped.filter((item) => item.type === kind).slice(0, remaining)
                            .map((item) => ({ ...item, inputKey: String(slot.key) }));
                        if (!fitted.length) {
                            notifyError({ message: t('chat_slot_full_or_mismatch') });
                            return;
                        }
                        addAttachments(fitted);
                        return;
                    }
                    addAttachments(mapped);
                }}
            />

            <PromptEditDialog
                open={expandOpen}
                readOnly={composerLocked}
                projectId={projectId}
                title={t('chat_expand_title')}
                placeholder={t('chat_input_placeholder')}
                hint={null}
                media={leftoverAttachments.length ? (
                    <HScrollStrip>
                        {leftoverAttachments.map((media, index) => (isChatFileAttachment(media) ? (
                            <ChatFileChip
                                key={mediaListKey(media, index)}
                                name={media.label || media.url}
                                url={media.url}
                                sizeBytes={media.sizeBytes}
                                onRemove={composerLocked ? undefined : () => removeAttachment(media)}
                            />
                        ) : (
                            <TemplatePreviewThumb
                                key={mediaListKey(media, index)}
                                media={media}
                                preferOptimizedThumb
                                onRemove={composerLocked ? undefined : () => removeAttachment(media)}
                            />
                        )))}
                    </HScrollStrip>
                ) : null}
                promptText={expandDraft.text}
                promptMentions={expandDraft.mentions}
                mentionSource="attachments"
                attachmentsMentions={expandDraft.media}
                onClose={() => setExpandOpen(false)}
                onSave={(next) => {
                    setPromptDocument(next.promptText, next.promptMentions);
                    setPromptText(next.promptText);
                    setExpandOpen(false);
                }}
            />

            <CostConfirmModal
                open={showCostModal}
                summary={costSummary}
                showWallet={scope.kind === 'personal'}
                estimate={costEstimate}
                loading={costLoading}
                error={costError}
                onConfirm={handleCostConfirm}
                onCancel={handleCostCancel}
            />
        </div>
    );
}
