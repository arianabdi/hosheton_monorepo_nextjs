'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LuCheck, LuChevronLeft, LuChevronRight, LuCopy, LuDownload, LuExpand, LuMusic, LuPencil, LuRefreshCw, LuTriangleAlert } from 'react-icons/lu';
import { MdAdd } from 'react-icons/md';
import { TbTemplate } from 'react-icons/tb';
import { templateMediaKey, useTemplateCreateStore } from '@/app/zustand/store/useTemplateCreateStore';
import { flyToTemplateTab } from '@/app/(developers)/chat/components/TemplateBuilder/flyToTemplateTab';
import {
    mediaAspectRatio,
    mediaOriginalSrc,
    mediaThumbLargeSrc,
    mediaThumbSrc,
} from '@/app/(marketplace)/lib/template-media';
import type { StudioChatMessageEditVersion, TemplatePreviewMedia } from '@/app/(developers)/projects/types/media-api';
import type { StudioMediaMention } from '@/app/(developers)/projects/lib/studio-media';
import { ImageLightbox } from '@/app/(developers)/projects/[projectId]/components/CustomNodes/ImageLightbox';
import { CostHoverBadge } from '@/app/(developers)/projects/[projectId]/components/CustomNodes/CostHoverBadge';
import { useChatSession } from '../ChatSessionContext';
import { isChatFileAttachment, isSameChatMedia } from '../lib/chat-attachment-kind';
import { ChatFileChip } from '../lib/ChatFileChip';
import { downloadOriginalMedia } from '../lib/download-media';
import styles from './ChatMessages.module.scss';
import { MediaMentionText } from '@/app/(developers)/projects/components/MediaMentionComposer';
import { mediaListKey } from '@/app/(developers)/projects/lib/studio-media';
import { copyChatText } from '../lib/chat-message-turns';
import ChatMarkdown from '../lib/ChatMarkdown';
import { HoshetonError, getHoshetonErrorMessage } from '@/app/lib/errors';

/** مرور نسخه‌های قبلی پیام کاربر بعد از ویرایش — ‹ ۲/۳ › */
function UserMessageVersions({
    history,
    current,
    mentions,
}: {
    history: StudioChatMessageEditVersion[];
    current: string;
    mentions?: StudioMediaMention[];
}) {
    const { t } = useTranslation('projects');
    const total = history.length + 1;
    const [index, setIndex] = useState(total - 1);
    const safeIndex = Math.min(Math.max(index, 0), total - 1);
    const content = safeIndex >= history.length ? current : (history[safeIndex]?.content || '');

    return (
        <>
            {content ? (
                <p>
                    <MediaMentionText value={content} mentions={mentions} />
                </p>
            ) : null}
            {history.length ? (
                <div className={styles.versionPager}>
                    <button
                        type="button"
                        aria-label={t('chat_prev_version', { defaultValue: 'نسخه قبلی' })}
                        title={t('chat_prev_version', { defaultValue: 'نسخه قبلی' })}
                        disabled={safeIndex === 0}
                        onClick={() => setIndex((value) => Math.max(0, value - 1))}
                    >
                        <LuChevronLeft size={13} />
                    </button>
                    <span>{safeIndex + 1}/{total}</span>
                    <button
                        type="button"
                        aria-label={t('chat_next_version', { defaultValue: 'نسخه بعدی' })}
                        title={t('chat_next_version', { defaultValue: 'نسخه بعدی' })}
                        disabled={safeIndex === total - 1}
                        onClick={() => setIndex((value) => Math.min(total - 1, value + 1))}
                    >
                        <LuChevronRight size={13} />
                    </button>
                </div>
            ) : null}
        </>
    );
}

function isAudioAttachment(media: TemplatePreviewMedia) {
    if (media.type === 'audio' || media.label === 'audio') return true;
    return /\.(mp3|wav|ogg|m4a|aac|flac|weba)(\?|$)/i.test(media.url || '');
}

/** Small square attachment thumb: lightweight preview + open + use as reference. */
function ChatAttachedThumb({ media }: { media: TemplatePreviewMedia }) {
    const { t } = useTranslation('projects');
    const { attachments, addAttachments } = useChatSession();
    const [open, setOpen] = useState(false);
    // 64px chip: prefer small upload thumb, then studio/explore large preview.
    const originalSrc = mediaOriginalSrc(media);
    const smallThumb = mediaThumbSrc(media);
    const largeThumb = mediaThumbLargeSrc(media);
    const thumbSrc = (smallThumb && smallThumb !== originalSrc)
        ? smallThumb
        : (largeThumb && largeThumb !== originalSrc ? largeThumb : (smallThumb || largeThumb));
    const lightboxSrc = originalSrc || thumbSrc;
    const alreadyAttached = attachments.some((item) => isSameChatMedia(item, media));
    if (!thumbSrc && media.type !== 'audio') return null;

    return (
        <div className={styles.attachThumb}>
            {media.type === 'audio' && !thumbSrc ? (
                <div className={styles.attachAudio} aria-hidden>
                    <LuMusic size={22} />
                </div>
            ) : media.type === 'video' && !media.thumbnailUrl && !media.thumbnailUrlLarge ? (
                <video src={lightboxSrc} muted playsInline preload="metadata" />
            ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumbSrc} alt={media.label || ''} loading="lazy" decoding="async" />
            )}

            <div className={styles.attachActions}>
                {lightboxSrc ? (
                    <button
                        type="button"
                        className={styles.attachActionBtn}
                        title={t('view_image')}
                        aria-label={t('view_image')}
                        onClick={() => setOpen(true)}
                    >
                        <LuExpand size={12} />
                    </button>
                ) : null}
                <button
                    type="button"
                    className={styles.attachActionBtn}
                    title={t('use_as_reference')}
                    aria-label={t('use_as_reference')}
                    disabled={alreadyAttached}
                    onClick={() => addAttachments([{
                        ...media,
                        type: media.type === 'video' ? 'video' : media.type === 'audio' ? 'audio' : 'image',
                        source: media.source || 'upload',
                    }])}
                >
                    <MdAdd size={14} />
                </button>
            </div>

            {lightboxSrc && media.type !== 'audio' ? (
                media.type === 'video' ? (
                    open ? (
                        <div className={styles.videoLightbox} role="dialog" onClick={() => setOpen(false)}>
                            <video
                                className={styles.videoLightboxMedia}
                                src={lightboxSrc}
                                controls
                                autoPlay
                                playsInline
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    ) : null
                ) : (
                    <ImageLightbox
                        open={open}
                        src={lightboxSrc}
                        alt={media.label || ''}
                        onClose={() => setOpen(false)}
                    />
                )
            ) : null}
        </div>
    );
}

function MessageUserMedia({ media }: { media: TemplatePreviewMedia }) {
    // سند/کد/جدول پیوست چت متنی
    if (isChatFileAttachment(media)) {
        return <ChatFileChip name={media.label || media.url} url={mediaOriginalSrc(media)} sizeBytes={media.sizeBytes} />;
    }
    if (isAudioAttachment(media)) {
        const src = mediaOriginalSrc(media);
        if (!src) return <ChatAttachedThumb media={media} />;
        return <audio className={styles.audio} src={src} controls preload="metadata" />;
    }
    return <ChatAttachedThumb media={media} />;
}

/** «در حال پردازش» دستیار: سه نقطه‌ی موجی + متن با برق ملایم (بدون حرکت در reduced-motion) */
function ProcessingIndicator({ label }: { label: string }) {
    return (
        <div className={styles.processing} role="status" aria-live="polite">
            <span className={styles.processingDots} aria-hidden>
                <i />
                <i />
                <i />
            </span>
            <span className={styles.processingLabel}>{label}</span>
        </div>
    );
}

/** «افزودن به قالب» — هم‌شکل «استفاده به‌عنوان مرجع»؛ تصویر به دکمه‌ی «قالب» پرواز می‌کند */
function TemplateMediaButton({ media, thumb }: { media: TemplatePreviewMedia; thumb?: string }) {
    const { t } = useTranslation('projects');
    const inTemplate = useTemplateCreateStore((state) => (
        state.previewMedia.some((item) => templateMediaKey(item) === templateMediaKey(media))
    ));
    const toggleMedia = useTemplateCreateStore((state) => state.toggleMedia);
    return (
        <button
            type="button"
            className={`${styles.useRefBtn} ${inTemplate ? styles.useRefBtnOn : ''}`}
            aria-pressed={inTemplate}
            onClick={(event) => {
                if (!inTemplate) flyToTemplateTab(event.currentTarget.parentElement?.parentElement, thumb);
                toggleMedia(media);
            }}
        >
            <TbTemplate />
            {inTemplate
                ? t('template_draft_remove', { defaultValue: 'حذف از قالب' })
                : t('template_draft_add', { defaultValue: 'افزودن به قالب' })}
        </button>
    );
}

const ASSISTANT_MEDIA_MAX_PX = 560;

type MessageCost = { amount: number; currency?: string; unit?: string } | null | undefined;

function CostBadge({
    cost,
    totalCost,
    floating = true,
}: {
    cost?: MessageCost;
    totalCost?: number;
    floating?: boolean;
}) {
    const showCost = (typeof totalCost === 'number' && totalCost > 0)
        || (typeof cost?.amount === 'number' && cost.amount > 0);
    if (!showCost) return null;
    return (
        <span className={floating ? styles.mediaCostBadge : styles.mediaCostLine}>
            <CostHoverBadge
                totalCost={typeof totalCost === 'number' ? totalCost : undefined}
                currentCost={typeof cost?.amount === 'number' ? cost.amount : undefined}
                currency={cost?.currency}
                variant={floating ? 'overlay' : 'default'}
            />
        </span>
    );
}

/** Large assistant image: optimized thumb in bubble, original in lightbox. */
function MessageImage({
    media,
    cost,
    totalCost,
}: {
    media: TemplatePreviewMedia;
    cost?: MessageCost;
    totalCost?: number;
}) {
    const { t } = useTranslation('projects');
    const { attachments, addAttachments } = useChatSession();
    const [open, setOpen] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const originalSrc = mediaOriginalSrc(media);
    const preferredSrc = mediaThumbLargeSrc(media) || mediaThumbSrc(media) || originalSrc;
    const [src, setSrc] = useState(preferredSrc);
    const imgRef = useRef<HTMLImageElement>(null);
    const lightboxSrc = originalSrc || preferredSrc;
    const ratio = mediaAspectRatio(media);
    const alreadyAttached = attachments.some((item) => isSameChatMedia(item, media));

    useEffect(() => {
        setSrc(preferredSrc);
        setLoaded(false);
    }, [preferredSrc]);

    useEffect(() => {
        const img = imgRef.current;
        if (img?.complete && img.naturalWidth > 0) {
            setLoaded(true);
        }
    }, [src]);

    if (!preferredSrc) return null;

    return (
        <div className={styles.generatedImage}>
            <div
                className={styles.mediaFrame}
                style={{ ['--tile-ratio' as string]: String(ratio > 0 ? ratio : 1) }}
            >
                {!loaded ? <div className={styles.mediaGhost} aria-hidden /> : null}
                <button
                    type="button"
                    className={styles.imagePreview}
                    title={t('view_image')}
                    onClick={() => setOpen(true)}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        ref={imgRef}
                        className={`${styles.media} ${loaded ? styles.mediaReady : styles.mediaPending}`}
                        src={src}
                        alt={media.label || ''}
                        loading="lazy"
                        decoding="async"
                        onLoad={() => setLoaded(true)}
                        onError={() => {
                            if (src !== originalSrc && originalSrc) {
                                setSrc(originalSrc);
                                setLoaded(false);
                                return;
                            }
                            setLoaded(true);
                        }}
                    />
                    <span className={styles.imageHover} aria-hidden>
                        <span><LuExpand /></span>
                    </span>
                </button>
                {/* دانلود سایز اصلی — گوشه بالا-راست فریم؛ دسکتاپ با hover، موبایل همیشه نمایان */}
                {originalSrc ? (
                    <button
                        type="button"
                        className={styles.mediaDownloadBtn}
                        title={t('chat_download_original', { defaultValue: 'دانلود سایز اصلی' })}
                        aria-label={t('chat_download_original', { defaultValue: 'دانلود سایز اصلی' })}
                        onClick={() => downloadOriginalMedia(originalSrc, media.label)}
                    >
                        <LuDownload size={13} />
                    </button>
                ) : null}
                <CostBadge cost={cost} totalCost={totalCost} />
            </div>
            <div className={styles.mediaButtons}>
                <button
                    type="button"
                    className={styles.useRefBtn}
                    disabled={alreadyAttached}
                    onClick={() => addAttachments([{
                        ...media,
                        type: 'image',
                        source: media.source || 'generated',
                    }])}
                >
                    <MdAdd /> {t('use_as_reference')}
                </button>
                <TemplateMediaButton media={media} thumb={src} />
            </div>
            <ImageLightbox
                open={open}
                src={lightboxSrc}
                alt={media.label || ''}
                onClose={() => setOpen(false)}
            />
        </div>
    );
}

/** Native video player: ratio from metadata (or loaded video dimensions). */
function MessageVideo({
    media,
    cost,
    totalCost,
}: {
    media: TemplatePreviewMedia;
    cost?: MessageCost;
    totalCost?: number;
}) {
    const { t } = useTranslation('projects');
    const { attachments, addAttachments } = useChatSession();
    const [loaded, setLoaded] = useState(false);
    const src = mediaOriginalSrc(media);
    const posterCandidate = mediaThumbLargeSrc(media) || mediaThumbSrc(media);
    const poster = posterCandidate && posterCandidate !== src ? posterCandidate : undefined;
    const hasMetaRatio = Boolean(
        (media.aspectRatio && media.aspectRatio > 0)
        || (media.width && media.height),
    );
    const [ratio, setRatio] = useState(() => (
        hasMetaRatio ? mediaAspectRatio(media) : 16 / 9
    ));
    const videoRef = useRef<HTMLVideoElement>(null);
    const alreadyAttached = attachments.some((item) => isSameChatMedia(item, media));

    useEffect(() => {
        setLoaded(false);
        setRatio(hasMetaRatio ? mediaAspectRatio(media) : 16 / 9);
    }, [src, poster, hasMetaRatio, media.aspectRatio, media.width, media.height]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        if (video.readyState >= 1 && video.videoWidth > 0 && video.videoHeight > 0) {
            setRatio(video.videoWidth / video.videoHeight);
            setLoaded(true);
        }
    }, [src]);

    const syncVideoRatio = (video: HTMLVideoElement) => {
        if (video.videoWidth > 0 && video.videoHeight > 0) {
            setRatio(video.videoWidth / video.videoHeight);
        }
        setLoaded(true);
    };

    if (!src) return null;

    return (
        <div className={styles.generatedImage}>
            <div className={styles.videoShell}>
                <div
                    className={`${styles.videoGhostFrame} ${loaded ? styles.videoGhostFrameHidden : ''}`}
                    style={{ aspectRatio: String(ratio > 0 ? ratio : 16 / 9) }}
                    aria-hidden={loaded}
                >
                    <div className={styles.mediaGhost} />
                </div>
                <video
                    ref={videoRef}
                    className={`${styles.videoPlayer} ${loaded ? styles.mediaReady : styles.videoPlayerLoading}`}
                    src={src}
                    poster={poster}
                    controls
                    playsInline
                    preload="metadata"
                    onLoadedMetadata={(event) => syncVideoRatio(event.currentTarget)}
                    onLoadedData={(event) => syncVideoRatio(event.currentTarget)}
                    onError={() => setLoaded(true)}
                />
                {loaded ? (
                    <span className={styles.videoCostWrap}>
                        <CostBadge cost={cost} totalCost={totalCost} />
                    </span>
                ) : null}
                {/* دانلود فایل اصلی — گوشه بالا-راست ویدیو */}
                <button
                    type="button"
                    className={styles.mediaDownloadBtn}
                    title={t('chat_download_original', { defaultValue: 'دانلود سایز اصلی' })}
                    aria-label={t('chat_download_original', { defaultValue: 'دانلود سایز اصلی' })}
                    onClick={() => downloadOriginalMedia(src, media.label)}
                >
                    <LuDownload size={13} />
                </button>
            </div>
            <div className={styles.mediaButtons}>
                <button
                    type="button"
                    className={styles.useRefBtn}
                    disabled={alreadyAttached}
                    onClick={() => addAttachments([{
                        ...media,
                        type: 'video',
                        source: media.source || 'generated',
                    }])}
                >
                    <MdAdd /> {t('use_as_reference')}
                </button>
                <TemplateMediaButton media={media} thumb={poster} />
            </div>
        </div>
    );
}

function MessageMedia({
    media,
    cost,
    totalCost,
}: {
    media: TemplatePreviewMedia;
    cost?: MessageCost;
    totalCost?: number;
}) {
    const { t } = useTranslation('projects');
    if (isAudioAttachment(media)) {
        const src = mediaOriginalSrc(media) || mediaThumbSrc(media);
        if (!src) {
            return (
                <div className={styles.audioUnavailable} role="status">
                    <LuMusic aria-hidden />
                    <span>{t('chat_audio_unavailable', { defaultValue: 'فایل صوتی در دسترس نیست' })}</span>
                </div>
            );
        }
        return (
            <div className={styles.generatedImage}>
                <div className={styles.audioRow}>
                    <audio className={styles.audio} src={src} controls preload="metadata" />
                    {/* دانلود فایل اصلی صوت — کنار پلیر */}
                    <button
                        type="button"
                        className={styles.audioDownloadBtn}
                        title={t('chat_download_original', { defaultValue: 'دانلود سایز اصلی' })}
                        aria-label={t('chat_download_original', { defaultValue: 'دانلود سایز اصلی' })}
                        onClick={() => downloadOriginalMedia(src, media.label)}
                    >
                        <LuDownload size={14} />
                    </button>
                </div>
                <CostBadge cost={cost} totalCost={totalCost} floating={false} />
            </div>
        );
    }
    if (media.type === 'video') {
        return <MessageVideo media={media} cost={cost} totalCost={totalCost} />;
    }
    return <MessageImage media={media} cost={cost} totalCost={totalCost} />;
}

export default function ChatMessages() {
    const { t } = useTranslation('projects');
    const {
        chat,
        retryingMessageId,
        editingMessageId,
        retryFailedTurn,
        startEditFailedTurn,
        startEditTurn,
    } = useChatSession();
    const [copiedKey, setCopiedKey] = useState('');
    const messages = chat?.messages || [];
    const isTextChat = chat?.mediaKind === 'text';

    if (!messages.length) return null;

    const copyText = async (key: string, value: string) => {
        try {
            const copied = await copyChatText(value, navigator.clipboard);
            if (!copied) return;
        } catch {
            return;
        }
        setCopiedKey(key);
        window.setTimeout(() => setCopiedKey((current) => current === key ? '' : current), 1600);
    };

    return (
        <div className={`${styles.thread} ${isTextChat ? styles.threadText : ''}`}>
            {messages.map((message, index) => {
                const next = messages[index + 1];
                const failed = message.role === 'assistant' && message.status === 'failed';
                const processingSelf = message.role === 'assistant' && message.status === 'processing';
                const failedAssistant = message.role === 'user'
                    && next?.role === 'assistant'
                    && next.status === 'failed'
                    ? next
                    : null;
                const canEditFailed = Boolean(failedAssistant?.messageId && message.requestSnapshot);
                // ویرایش پیام کاربر در چت متنی — نوبت کامل با snapshot معتبر
                const canEditTurn = isTextChat
                    && message.role === 'user'
                    && next?.role === 'assistant'
                    && next?.status === 'complete'
                    && Boolean(next?.messageId)
                    && Boolean(message.requestSnapshot);
                const stableKey = message.messageId || `${message.role}-${message.createdAt || index}`;
                const copied = copiedKey === stableKey;
                // کپی خطا هم فقط پیام هوشتون است، نه متن خام ارائه‌دهنده
                const copyValue = failed
                    ? getHoshetonErrorMessage(message.errorMessage || message.content, { kind: 'generation' })
                    : message.content || '';
                const hasText = Boolean(String(message.content || '').trim());
                const hasMedia = Boolean(message.attachments?.length);
                // پیام متنی LLM — یا چتِ text یا پیامی که snapshot متنی دارد
                const isTextChatMessage = isTextChat
                    || message.requestSnapshot?.mediaKind === 'text';
                // Completed turn with neither text nor media: surface it instead of
                // silently dropping (e.g. generation finished but produced no files).
                const emptyAssistant = message.role === 'assistant'
                    && !processingSelf
                    && !failed
                    && !hasText
                    && !hasMedia;

                // در حال پردازش: جای پاسخ مدل (سمت دستیار) — جدا از اکشن‌های hover پیام کاربر
                if (processingSelf && !hasText && !hasMedia) {
                    return (
                        <div key={stableKey} className={styles.turn}>
                            <ProcessingIndicator label={t('processing_ai')} />
                        </div>
                    );
                }

                return (
                    <div key={stableKey} className={styles.turn}>
                        {emptyAssistant ? (
                            <article className={styles.emptyCard} role="status">
                                <LuTriangleAlert aria-hidden />
                                <div>
                                    <strong>
                                        {t('chat_no_output_title', { defaultValue: 'خروجی دریافت نشد' })}
                                    </strong>
                                    <p>
                                        {t('chat_no_output_hint', {
                                            defaultValue: 'مدل خروجی‌ای برای این درخواست برنگرداند. می‌توانید دوباره تلاش کنید.',
                                        })}
                                    </p>
                                </div>
                            </article>
                        ) : failed ? (
                            <HoshetonError error={message.errorMessage || message.content} kind="generation">
                                {(e) => (
                                    <article className={styles.errorCard} role="alert">
                                        <LuTriangleAlert aria-hidden />
                                        <div>
                                            <strong>{e.title}</strong>
                                            <p>{e.message}</p>
                                        </div>
                                    </article>
                                )}
                            </HoshetonError>
                        ) : (
                            <>
                                {message.role === 'assistant' && hasMedia ? (
                                    <div className={styles.mediaOnly}>
                                        <div className={styles.mediaRow}>
                                            {message.attachments!.map((media, mediaIndex) => (
                                                <MessageMedia
                                                    key={mediaListKey(media, mediaIndex)}
                                                    media={media}
                                                    cost={isTextChat ? undefined : message.cost}
                                                    totalCost={isTextChat ? undefined : message.totalCost}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ) : null}

                                {(message.role === 'user' || hasText) ? (
                                    <article
                                        className={[
                                            styles.bubble,
                                            message.role === 'user' ? styles.user : styles.assistant,
                                            // پاسخ مدل در چت متنی: مقاله‌ای تمام‌عرض بدون حباب
                                            (message.role === 'assistant' && isTextChat && hasText) ? styles.article : '',
                                            // پیام متنی مدل در چت‌های media — حباب پهن‌تر برای کد/جدول
                                            (message.role === 'assistant' && !isTextChat && isTextChatMessage && hasText) ? styles.textBubble : '',
                                        ].filter(Boolean).join(' ')}
                                    >
                                        {message.role === 'user' && hasMedia ? (
                                            <div className={styles.mediaRow}>
                                                {message.attachments!.map((media, mediaIndex) => (
                                                    <MessageUserMedia
                                                        key={mediaListKey(media, mediaIndex)}
                                                        media={media}
                                                    />
                                                ))}
                                            </div>
                                        ) : null}
                                        {hasText ? (
                                            message.role === 'assistant' && isTextChatMessage ? (
                                                // پیام متنی LLM — رندر Markdown (کد/جدول/لیست)
                                                <ChatMarkdown content={message.content} />
                                            ) : message.editHistory?.length ? (
                                                // پیام کاربر ویرایش‌شده — مرور نسخه‌های قبلی
                                                <UserMessageVersions
                                                    history={message.editHistory}
                                                    current={message.content}
                                                    mentions={message.mentionRefs || message.mentions}
                                                />
                                            ) : (
                                                <p>
                                                    <MediaMentionText
                                                        value={message.content}
                                                        mentions={message.mentionRefs || message.mentions}
                                                    />
                                                </p>
                                            )
                                        ) : null}
                                    </article>
                                ) : null}
                            </>
                        )}
                        {!failed && (copyValue || canEditFailed || canEditTurn) && (
                            <div className={`${styles.messageActions} ${message.role === 'user' ? styles.userActions : ''}`}>
                                {copyValue && (
                                    <button
                                        type="button"
                                        title={copied ? t('chat_copied') : t('chat_copy')}
                                        aria-label={copied ? t('chat_copied') : t('chat_copy')}
                                        onClick={() => void copyText(stableKey, copyValue)}
                                    >
                                        {copied ? <LuCheck /> : <LuCopy />}
                                        <span>{copied ? t('chat_copied') : t('chat_copy')}</span>
                                    </button>
                                )}
                                {canEditFailed && failedAssistant?.messageId && (
                                    <button
                                        type="button"
                                        disabled={Boolean(retryingMessageId) || Boolean(editingMessageId)}
                                        onClick={() => startEditFailedTurn(failedAssistant.messageId!)}
                                    >
                                        <LuPencil />
                                        <span>{t('chat_edit')}</span>
                                    </button>
                                )}
                                {canEditTurn && next?.messageId && (
                                    <button
                                        type="button"
                                        disabled={Boolean(retryingMessageId) || Boolean(editingMessageId)}
                                        onClick={() => startEditTurn(next.messageId!)}
                                    >
                                        <LuPencil />
                                        <span>{t('chat_edit')}</span>
                                    </button>
                                )}
                            </div>
                        )}
                        {failed && message.messageId && messages[index - 1]?.requestSnapshot && (
                            <div className={styles.messageActions}>
                                {copyValue && (
                                    <button
                                        type="button"
                                        title={copied ? t('chat_copied') : t('chat_copy')}
                                        aria-label={copied ? t('chat_copied') : t('chat_copy')}
                                        onClick={() => void copyText(stableKey, copyValue)}
                                    >
                                        {copied ? <LuCheck /> : <LuCopy />}
                                        <span>{copied ? t('chat_copied') : t('chat_copy')}</span>
                                    </button>
                                )}
                                <button
                                    type="button"
                                    disabled={Boolean(retryingMessageId)}
                                    onClick={() => void retryFailedTurn(message.messageId!)}
                                >
                                    <LuRefreshCw className={retryingMessageId === message.messageId ? styles.spinning : ''} />
                                    <span>{t('chat_retry')}</span>
                                </button>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
