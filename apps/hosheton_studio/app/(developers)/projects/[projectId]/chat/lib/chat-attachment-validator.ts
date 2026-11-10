/**
 * Validation for chat attachments based on provider model mode configuration
 */

import type { TemplatePreviewMedia } from '@/app/(developers)/projects/types/media-api';
import { chatAttachmentsRuntimeMetrics, classifyChatAttachmentKind } from './chat-attachment-kind';

export interface MinMaxConstraint {
    min?: number;
    max?: number;
}

export interface ModeInputConstraints {
    imageCount?: MinMaxConstraint;
    videoCount?: MinMaxConstraint;
    audioCount?: MinMaxConstraint;
    /** Total number of media files across all kinds. */
    totalCount?: MinMaxConstraint;
    imageFileSize?: MinMaxConstraint;
    videoFileSize?: MinMaxConstraint;
    audioFileSize?: MinMaxConstraint;
    /** Total size in bytes across all media files, regardless of kind. */
    totalFileSize?: MinMaxConstraint;
    imageTotalSize?: MinMaxConstraint;
    videoTotalSize?: MinMaxConstraint;
    audioTotalSize?: MinMaxConstraint;
    videoDuration?: MinMaxConstraint;
    audioDuration?: MinMaxConstraint;
    supportedFormats?: {
        image?: string[];
        video?: string[];
        audio?: string[];
    };
}

export interface ValidationError {
    type: 'image' | 'video' | 'audio' | 'count' | 'size' | 'duration' | 'format';
    constraint: 'min' | 'max' | 'format' | 'unsupported';
    expected?: number | string;
    actual?: number | string;
    message: string;
    /** i18next key in the `projects` namespace for localized rendering. */
    key?: string;
    /** Interpolation params for `key`; `kindKey`/`kindManyKey` hold label keys. */
    params?: Record<string, unknown>;
    fileName?: string;
    /** File-scoped errors: the exact attachment object this error belongs to. */
    attachment?: TemplatePreviewMedia;
    /** Kind-scoped errors (count / total size): every attachment of this kind is implicated. */
    kind?: MediaKind;
    /** Cross-kind errors (total count / total size): every attachment is implicated. */
    all?: boolean;
}

/** Minimal compatible shape of i18next's `t` for localized error formatting. */
export type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

/**
 * Localize a validation error; `kindKey`/`kindManyKey` params are resolved to
 * the translated kind label. Falls back to the built-in message when the error
 * carries no key.
 */
export function formatValidationError(error: ValidationError, t: TranslateFn): string {
    if (!error.key) return error.message;
    const params: Record<string, unknown> = { ...(error.params || {}) };
    if (typeof params.kindKey === 'string') params.kind = t(params.kindKey);
    if (typeof params.kindManyKey === 'string') params.kind = t(params.kindManyKey);
    return t(error.key, params);
}

export interface AttachmentValidationResult {
    valid: boolean;
    errors: ValidationError[];
    warnings: string[];
}

type MediaKind = 'image' | 'video' | 'audio';

const TYPE_LABEL: Record<MediaKind, string> = {
    image: 'تصویر',
    video: 'ویدیو',
    audio: 'صوت',
};

function pushCountErrors(
    result: AttachmentValidationResult,
    type: MediaKind,
    count: number,
    constraint?: MinMaxConstraint,
) {
    if (!constraint) return;
    const { min, max } = constraint;
    const label = TYPE_LABEL[type];

    if (min != null && count < min) {
        result.valid = false;
        result.errors.push({
            type,
            constraint: 'min',
            expected: min,
            actual: count,
            kind: type,
            key: 'chat_error_kind_min',
            params: { min, count, kindKey: `chat_kind_${type}` },
            message: min === 1
                ? `حداقل یک ${label} مورد نیاز است`
                : `حداقل ${min} ${label} مورد نیاز است، اما ${count} ارسال شده`,
        });
    }

    if (max != null && count > max) {
        result.valid = false;
        result.errors.push({
            type,
            constraint: 'max',
            expected: max,
            actual: count,
            kind: type,
            key: 'chat_error_kind_max',
            params: { max, count, kindKey: `chat_kind_${type}` },
            message: max === 1
                ? `این مدل فقط یک ${label} می‌پذیرد، اما ${count} ارسال شده`
                : `حداکثر ${max} ${label} مجاز است، اما ${count} ارسال شده`,
        });
    }
}

function pushRangeErrors(
    result: AttachmentValidationResult,
    opts: {
        type: ValidationError['type'];
        constraint: MinMaxConstraint | undefined;
        value: number;
        fileName?: string;
        /** File-scoped violation: mark this exact attachment. */
        attachment?: TemplatePreviewMedia;
        /** Kind-scoped violation (totals): mark every attachment of this kind. */
        kind?: MediaKind;
        /** Cross-kind violation (total count / total size): mark every attachment. */
        all?: boolean;
        /** i18n keys for the under/over messages (projects namespace). */
        keys?: { under: string; over: string };
        /** Interpolation params; `bound` is the violated min or max value. */
        params?: (bound: 'min' | 'max', boundValue: number) => Record<string, unknown>;
        underMessage: (min: number, actual: number) => string;
        overMessage: (max: number, actual: number) => string;
    },
) {
    const { constraint, value } = opts;
    if (!constraint) return;
    const { min, max } = constraint;
    if (min != null && value < min) {
        result.valid = false;
        result.errors.push({
            type: opts.type,
            constraint: 'min',
            expected: min,
            actual: value,
            fileName: opts.fileName,
            attachment: opts.attachment,
            kind: opts.kind,
            all: opts.all,
            key: opts.keys?.under,
            params: opts.params?.('min', min),
            message: opts.underMessage(min, value),
        });
    }
    if (max != null && value > max) {
        result.valid = false;
        result.errors.push({
            type: opts.type,
            constraint: 'max',
            expected: max,
            actual: value,
            fileName: opts.fileName,
            attachment: opts.attachment,
            kind: opts.kind,
            all: opts.all,
            key: opts.keys?.over,
            params: opts.params?.('max', max),
            message: opts.overMessage(max, value),
        });
    }
}

/**
 * Validate chat attachments against mode constraints
 */
export function validateChatAttachments(
    attachments: TemplatePreviewMedia[],
    constraints: ModeInputConstraints | null | undefined,
): AttachmentValidationResult {
    const result: AttachmentValidationResult = {
        valid: true,
        errors: [],
        warnings: [],
    };

    if (!constraints) return result;

    const metrics = chatAttachmentsRuntimeMetrics(attachments);
    const byKind: Record<MediaKind, TemplatePreviewMedia[]> = {
        image: [],
        video: [],
        audio: [],
    };
    for (const item of attachments) {
        byKind[classifyChatAttachmentKind(item)].push(item);
    }

    pushCountErrors(result, 'image', metrics.inputImageCount, constraints.imageCount);
    pushCountErrors(result, 'video', metrics.inputVideoCount, constraints.videoCount);
    pushCountErrors(result, 'audio', metrics.inputAudioCount, constraints.audioCount);

    // Cross-kind totals: total number of files and total size across all kinds.
    const totalCount = metrics.inputImageCount + metrics.inputVideoCount + metrics.inputAudioCount;
    const totalCountConstraint = constraints.totalCount;
    if (totalCountConstraint) {
        const { min, max } = totalCountConstraint;
        if (min != null && totalCount < min) {
            result.valid = false;
            result.errors.push({
                type: 'count',
                constraint: 'min',
                expected: min,
                actual: totalCount,
                all: true,
                key: 'chat_error_total_min',
                params: { min, count: totalCount },
                message: min === 1
                    ? 'حداقل یک فایل ورودی مورد نیاز است'
                    : `حداقل ${min} فایل ورودی مورد نیاز است، اما ${totalCount} ارسال شده`,
            });
        }
        if (max != null && totalCount > max) {
            result.valid = false;
            result.errors.push({
                type: 'count',
                constraint: 'max',
                expected: max,
                actual: totalCount,
                all: true,
                key: 'chat_error_total_max',
                params: { max, count: totalCount },
                message: max === 1
                    ? 'این مدل فقط یک فایل ورودی می‌پذیرد'
                    : `حداکثر ${max} فایل ورودی مجاز است، اما ${totalCount} فایل ارسال شده`,
            });
        }
    }
    const totalBytes = attachments.reduce((sum, item) => sum + (item.sizeBytes || 0), 0);
    if (attachments.length > 0 || (constraints.totalFileSize?.min != null && constraints.totalFileSize.min > 0)) {
        pushRangeErrors(result, {
            type: 'size',
            constraint: constraints.totalFileSize,
            value: totalBytes,
            all: true,
            keys: { under: 'chat_error_total_size_under', over: 'chat_error_total_size_over' },
            params: (bound, boundValue) => ({
                [bound]: formatBytes(boundValue),
                actual: formatBytes(totalBytes),
            }),
            underMessage: (min, actual) =>
                `حجم مجموع فایل‌های ورودی باید حداقل ${formatBytesFa(min)} باشد، اما ${formatBytesFa(actual)} است`,
            overMessage: (max, actual) =>
                `حجم مجموع فایل‌های ورودی نباید بیش از ${formatBytesFa(max)} باشد، اما ${formatBytesFa(actual)} است`,
        });
    }

    const fileSizeMap: Record<MediaKind, MinMaxConstraint | undefined> = {
        image: constraints.imageFileSize,
        video: constraints.videoFileSize,
        audio: constraints.audioFileSize,
    };
    const totalSizeMap: Record<MediaKind, MinMaxConstraint | undefined> = {
        image: constraints.imageTotalSize,
        video: constraints.videoTotalSize,
        audio: constraints.audioTotalSize,
    };

    (['image', 'video', 'audio'] as const).forEach((kind) => {
        const items = byKind[kind];
        const label = TYPE_LABEL[kind];
        const fileSize = fileSizeMap[kind];
        const totalSize = totalSizeMap[kind];

        for (const item of items) {
            const size = item.sizeBytes || 0;
            pushRangeErrors(result, {
                type: 'size',
                constraint: fileSize,
                value: size,
                fileName: item.label,
                attachment: item,
                keys: { under: 'chat_error_file_size_under', over: 'chat_error_file_size_over' },
                params: (bound, boundValue) => ({
                    file: item.label || label,
                    [bound]: formatBytes(boundValue),
                    actual: formatBytes(size),
                }),
                underMessage: (min, actual) =>
                    `حجم «${item.label || label}» باید حداقل ${formatBytesFa(min)} باشد، اما ${formatBytesFa(actual)} است`,
                overMessage: (max, actual) =>
                    `حجم «${item.label || label}» نباید بیش از ${formatBytesFa(max)} باشد، اما ${formatBytesFa(actual)} است`,
            });
        }

        const totalBytes = items.reduce((sum, item) => sum + (item.sizeBytes || 0), 0);
        if (items.length > 0 || (totalSize?.min != null && totalSize.min > 0)) {
            pushRangeErrors(result, {
                type: 'size',
                constraint: totalSize,
                value: totalBytes,
                kind,
                keys: { under: 'chat_error_kind_size_under', over: 'chat_error_kind_size_over' },
                params: (bound, boundValue) => ({
                    kindManyKey: `chat_kind_${kind}_many`,
                    [bound]: formatBytes(boundValue),
                    actual: formatBytes(totalBytes),
                }),
                underMessage: (min, actual) =>
                    `حجم مجموع ${label}ها باید حداقل ${formatBytesFa(min)} باشد، اما ${formatBytesFa(actual)} است`,
                overMessage: (max, actual) =>
                    `حجم مجموع ${label}ها نباید بیش از ${formatBytesFa(max)} باشد، اما ${formatBytesFa(actual)} است`,
            });
        }
    });

    for (const video of byKind.video) {
        const duration = video.durationSeconds || 0;
        pushRangeErrors(result, {
            type: 'duration',
            constraint: constraints.videoDuration,
            value: duration,
            fileName: video.label,
            attachment: video,
            keys: { under: 'chat_error_video_duration_under', over: 'chat_error_video_duration_over' },
            params: (bound, boundValue) => ({
                file: video.label || '—',
                [bound]: boundValue,
            }),
            underMessage: (min) => `ویدیو «${video.label || 'نامشخص'}» باید حداقل ${min} ثانیه باشد`,
            overMessage: (max) => `ویدیو «${video.label || 'نامشخص'}» نباید بیش از ${max} ثانیه باشد`,
        });
    }

    for (const audio of byKind.audio) {
        const duration = audio.durationSeconds || 0;
        pushRangeErrors(result, {
            type: 'duration',
            constraint: constraints.audioDuration,
            value: duration,
            fileName: audio.label,
            attachment: audio,
            keys: { under: 'chat_error_audio_duration_under', over: 'chat_error_audio_duration_over' },
            params: (bound, boundValue) => ({
                file: audio.label || '—',
                [bound]: boundValue,
            }),
            underMessage: (min) => `فایل صوتی «${audio.label || 'نامشخص'}» باید حداقل ${min} ثانیه باشد`,
            overMessage: (max) => `فایل صوتی «${audio.label || 'نامشخص'}» نباید بیش از ${max} ثانیه باشد`,
        });
    }

    if (constraints.supportedFormats) {
        for (const attachment of attachments) {
            const kind = classifyChatAttachmentKind(attachment);
            const ext = getFileExtension(attachment.url || attachment.label || '');
            const formats = constraints.supportedFormats[kind];

            if (formats && formats.length > 0 && ext && !formats.includes(ext)) {
                result.valid = false;
                result.errors.push({
                    type: 'format',
                    constraint: 'unsupported',
                    expected: formats.join(', '),
                    actual: ext,
                    fileName: attachment.label,
                    attachment,
                    kind,
                    key: 'chat_error_format',
                    params: { ext, kindKey: `chat_kind_${kind}`, formats: formats.join(', ') },
                    message: `فرمت «${ext}» برای ${TYPE_LABEL[kind]} پشتیبانی نمی‌شود. فرمت‌های مجاز: ${formats.join(', ')}`,
                });
            }
        }
    }

    return result;
}

function formatBytesFa(bytes: number): string {
    if (bytes < 1024) {
        return `${Math.round(bytes)} بایت`;
    }
    const kb = bytes / 1024;
    if (kb < 1024) {
        // Show integer if close to a whole number, otherwise 1 decimal
        return kb % 1 < 0.1 || kb % 1 > 0.9
            ? `${Math.round(kb)} کیلوبایت`
            : `${kb.toFixed(1)} کیلوبایت`;
    }
    const mb = bytes / (1024 * 1024);
    return mb % 1 < 0.1 || mb % 1 > 0.9
        ? `${Math.round(mb)} مگابایت`
        : `${mb.toFixed(1)} مگابایت`;
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) {
        return `${Math.round(bytes)}B`;
    }
    const kb = bytes / 1024;
    if (kb < 1024) {
        // Show integer if close to a whole number, otherwise 1 decimal
        return kb % 1 < 0.1 || kb % 1 > 0.9
            ? `${Math.round(kb)}KB`
            : `${kb.toFixed(1)}KB`;
    }
    const mb = bytes / (1024 * 1024);
    return mb % 1 < 0.1 || mb % 1 > 0.9
        ? `${Math.round(mb)}MB`
        : `${mb.toFixed(1)}MB`;
}

function getFileExtension(filename: string): string {
    const match = filename.match(/\.([^./?#]+)(?:[?#]|$)/i);
    return match ? match[1].toLowerCase() : '';
}

function formatLimitRange(constraint?: MinMaxConstraint): string {
    if (!constraint) return '';
    const { min, max } = constraint;
    if (min != null && max != null && min === max) return String(max);
    if (min != null && max != null) return `${min}–${max}`;
    if (min != null) return `≥${min}`;
    if (max != null) return `≤${max}`;
    return '';
}

function isOutOfRange(value: number, constraint?: MinMaxConstraint): boolean {
    if (!constraint) return false;
    if (constraint.min != null && value < constraint.min) return true;
    if (constraint.max != null && value > constraint.max) return true;
    return false;
}

/**
 * Compact live status: current value vs configured limits (plain text segments).
 */
export function formatConstraintsLivePreview(
    attachments: TemplatePreviewMedia[],
    constraints: ModeInputConstraints | null | undefined,
): { text: string; ok: boolean } {
    if (!constraints) return { text: '', ok: true };

    const metrics = chatAttachmentsRuntimeMetrics(attachments);
    const byKind: Record<MediaKind, TemplatePreviewMedia[]> = {
        image: [],
        video: [],
        audio: [],
    };
    for (const item of attachments) {
        byKind[classifyChatAttachmentKind(item)].push(item);
    }

    const parts: string[] = [];
    let ok = true;

    const pushCount = (label: string, current: number, constraint?: MinMaxConstraint) => {
        if (!constraint || (constraint.min == null && constraint.max == null)) return;
        const limit = formatLimitRange(constraint);
        if (isOutOfRange(current, constraint)) ok = false;
        parts.push(`${label} ${current}/${limit}`);
    };

    pushCount('img', metrics.inputImageCount, constraints.imageCount);
    pushCount('vid', metrics.inputVideoCount, constraints.videoCount);
    pushCount('aud', metrics.inputAudioCount, constraints.audioCount);

    const totalCount = metrics.inputImageCount + metrics.inputVideoCount + metrics.inputAudioCount;
    if (constraints.totalCount && (constraints.totalCount.min != null || constraints.totalCount.max != null)) {
        pushCount('files', totalCount, constraints.totalCount);
    }

    const pushSize = (
        label: string,
        current: number,
        constraint?: MinMaxConstraint,
        onlyWhenActive = false,
    ) => {
        if (!constraint || (constraint.min == null && constraint.max == null)) return;
        if (onlyWhenActive && current === 0 && (constraint.min == null || constraint.min <= 0)) return;
        if (isOutOfRange(current, constraint)) ok = false;
        const limit = formatLimitRange({
            min: constraint.min != null ? constraint.min : undefined,
            max: constraint.max != null ? constraint.max : undefined,
        });
        // Show human sizes for both sides when constraint uses bytes
        const currentLabel = formatBytes(current);
        let limitLabel = limit;
        if (constraint.min != null && constraint.max != null && constraint.min === constraint.max) {
            limitLabel = formatBytes(constraint.max);
        } else if (constraint.min != null && constraint.max != null) {
            limitLabel = `${formatBytes(constraint.min)}–${formatBytes(constraint.max)}`;
        } else if (constraint.min != null) {
            limitLabel = `≥${formatBytes(constraint.min)}`;
        } else if (constraint.max != null) {
            limitLabel = `≤${formatBytes(constraint.max)}`;
        }
        parts.push(`${label} ${currentLabel}/${limitLabel}`);
    };

    const imageTotal = byKind.image.reduce((sum, item) => sum + (item.sizeBytes || 0), 0);
    const videoTotal = byKind.video.reduce((sum, item) => sum + (item.sizeBytes || 0), 0);
    const audioTotal = byKind.audio.reduce((sum, item) => sum + (item.sizeBytes || 0), 0);

    pushSize('imgΣ', imageTotal, constraints.imageTotalSize, true);
    pushSize('vidΣ', videoTotal, constraints.videoTotalSize, true);
    pushSize('audΣ', audioTotal, constraints.audioTotalSize, true);

    const allBytes = attachments.reduce((sum, item) => sum + (item.sizeBytes || 0), 0);
    if (allBytes > 0 && constraints.totalFileSize
        && (constraints.totalFileSize.min != null || constraints.totalFileSize.max != null)) {
        pushSize('Σ', allBytes, constraints.totalFileSize);
    }

    // Per-file size: show worst offender current max vs limit
    const pushFileSize = (label: string, items: TemplatePreviewMedia[], constraint?: MinMaxConstraint) => {
        if (!constraint || (constraint.min == null && constraint.max == null)) return;
        let limitLabel = '';
        if (constraint.min != null && constraint.max != null) {
            limitLabel = `${formatBytes(constraint.min)}–${formatBytes(constraint.max)}`;
        } else if (constraint.max != null) {
            limitLabel = `≤${formatBytes(constraint.max)}`;
        } else if (constraint.min != null) {
            limitLabel = `≥${formatBytes(constraint.min)}`;
        }
        if (!items.length) {
            parts.push(`${label} 0/${limitLabel}`);
            return;
        }
        const sizes = items.map((item) => item.sizeBytes || 0);
        const maxSize = Math.max(...sizes);
        const minSize = Math.min(...sizes);
        if (sizes.some((size) => isOutOfRange(size, constraint))) ok = false;
        const currentLabel = minSize === maxSize
            ? formatBytes(maxSize)
            : `${formatBytes(minSize)}–${formatBytes(maxSize)}`;
        parts.push(`${label} ${currentLabel}/${limitLabel}`);
    };

    pushFileSize('imgFile', byKind.image, constraints.imageFileSize);
    pushFileSize('vidFile', byKind.video, constraints.videoFileSize);
    pushFileSize('audFile', byKind.audio, constraints.audioFileSize);

    const pushDuration = (label: string, items: TemplatePreviewMedia[], constraint?: MinMaxConstraint) => {
        if (!constraint || (constraint.min == null && constraint.max == null)) return;
        if (!items.length) return;
        const durations = items.map((item) => item.durationSeconds || 0);
        const bad = durations.some((value) => isOutOfRange(value, constraint));
        if (bad) ok = false;
        const minD = Math.min(...durations);
        const maxD = Math.max(...durations);
        const current = minD === maxD ? `${maxD}s` : `${minD}–${maxD}s`;
        let limit = '';
        if (constraint.min != null && constraint.max != null) limit = `${constraint.min}–${constraint.max}s`;
        else if (constraint.max != null) limit = `≤${constraint.max}s`;
        else if (constraint.min != null) limit = `≥${constraint.min}s`;
        parts.push(`${label} ${current}/${limit}`);
    };

    pushDuration('vidDur', byKind.video, constraints.videoDuration);
    pushDuration('audDur', byKind.audio, constraints.audioDuration);

    if (constraints.supportedFormats) {
        for (const kind of ['image', 'video', 'audio'] as const) {
            const formats = constraints.supportedFormats[kind];
            if (!formats?.length) continue;
            const items = byKind[kind];
            if (!items.length) {
                parts.push(`${kind === 'image' ? 'img' : kind === 'video' ? 'vid' : 'aud'}Fmt ${formats.join(',')}`);
                continue;
            }
            const exts = items.map((item) => getFileExtension(item.url || item.label || '')).filter(Boolean);
            const bad = exts.some((ext) => !formats.includes(ext));
            if (bad) ok = false;
            parts.push(
                `${kind === 'image' ? 'img' : kind === 'video' ? 'vid' : 'aud'}Fmt ${exts.join(',') || '—'} / ${formats.join(',')}`,
            );
        }
    }

    return { text: parts.join(' · '), ok };
}

/**
 * Get formatted summary of constraints for display (localized via `t`).
 */
export function formatConstraintsSummary(
    constraints: ModeInputConstraints | null | undefined,
    t: TranslateFn,
): string {
    if (!constraints) return '';

    const parts: string[] = [];

    const pushCount = (label: string, constraint?: MinMaxConstraint) => {
        if (!constraint) return;
        const { min, max } = constraint;
        if (min != null && max != null && min === max) parts.push(t('chat_limits_exact', { count: min, kind: label }));
        else if (min != null && max != null) parts.push(t('chat_limits_range', { min, max, kind: label }));
        else if (min != null) parts.push(t('chat_limits_min', { min, kind: label }));
        else if (max != null) parts.push(t('chat_limits_max', { max, kind: label }));
    };

    pushCount(t('chat_kind_image'), constraints.imageCount);
    pushCount(t('chat_kind_video'), constraints.videoCount);
    pushCount(t('chat_kind_audio'), constraints.audioCount);
    pushCount(t('chat_kind_file'), constraints.totalCount);

    if (constraints.videoFileSize?.max != null) {
        parts.push(t('chat_limits_video_size_each', { size: formatBytes(constraints.videoFileSize.max) }));
    }
    if (constraints.videoTotalSize?.max != null) {
        parts.push(t('chat_limits_video_size_total', { size: formatBytes(constraints.videoTotalSize.max) }));
    }
    if (constraints.totalFileSize?.max != null) {
        parts.push(t('chat_limits_total_size', { size: formatBytes(constraints.totalFileSize.max) }));
    }

    return parts.length ? t('chat_limits_accepted', { items: parts.join(', ') }) : '';
}

export interface ConstraintReviewLine {
    text: string;
    invalid: boolean;
}

export interface ConstraintsReview {
    lines: ConstraintReviewLine[];
    ok: boolean;
}

interface ReviewKindConfig {
    kind: MediaKind;
    one: string;
    many: string;
}

const REVIEW_KINDS: ReviewKindConfig[] = [
    { kind: 'image', one: 'تصویر', many: 'تصویرها' },
    { kind: 'video', one: 'ویدیو', many: 'ویدیوها' },
    { kind: 'audio', one: 'فایل صوتی', many: 'صوت‌ها' },
];

function formatSecondsFa(value: number): string {
    return `${Number(value.toFixed(1))} ثانیه`;
}

function limitRangeFa(constraint?: MinMaxConstraint): string {
    const { min, max } = constraint || {};
    if (min == null && max == null) return '';
    if (min != null && max != null) return min === max ? `دقیقاً ${min}` : `${min} تا ${max}`;
    if (min != null) return `حداقل ${min}`;
    return `حداکثر ${max}`;
}

function limitBytesFa(constraint?: MinMaxConstraint): string {
    const { min, max } = constraint || {};
    if (min == null && max == null) return '';
    if (min != null && max != null) {
        return min === max ? `دقیقاً ${formatBytesFa(max)}` : `${formatBytesFa(min)} تا ${formatBytesFa(max)}`;
    }
    if (min != null) return `حداقل ${formatBytesFa(min)}`;
    return `حداکثر ${formatBytesFa(max ?? 0)}`;
}

function limitSecondsFa(constraint?: MinMaxConstraint): string {
    const { min, max } = constraint || {};
    if (min == null && max == null) return '';
    if (min != null && max != null) {
        return min === max ? `دقیقاً ${formatSecondsFa(max)}` : `${formatSecondsFa(min)} تا ${formatSecondsFa(max)}`;
    }
    if (min != null) return `حداقل ${formatSecondsFa(min)}`;
    return `حداکثر ${formatSecondsFa(max ?? 0)}`;
}

/**
 * Human-readable Persian review of the current attachments vs the configured
 * route constraints: counts, per-file and total sizes, durations and formats.
 */
export function formatConstraintsReviewFa(
    attachments: TemplatePreviewMedia[],
    constraints: ModeInputConstraints | null | undefined,
): ConstraintsReview {
    const review: ConstraintsReview = { lines: [], ok: true };
    // Counts of added files are shown even when the model defines no limits.
    const c: Partial<ModeInputConstraints> = constraints || {};

    const metrics = chatAttachmentsRuntimeMetrics(attachments);
    const byKind: Record<MediaKind, TemplatePreviewMedia[]> = {
        image: [],
        video: [],
        audio: [],
    };
    for (const item of attachments) {
        byKind[classifyChatAttachmentKind(item)].push(item);
    }
    const kindCount: Record<MediaKind, number> = {
        image: metrics.inputImageCount,
        video: metrics.inputVideoCount,
        audio: metrics.inputAudioCount,
    };

    for (const { kind, one, many } of REVIEW_KINDS) {
        const items = byKind[kind];
        const count = kindCount[kind];

        const countConstraint = c[`${kind}Count`];
        const hasCountLimit = Boolean(
            countConstraint && (countConstraint.min != null || countConstraint.max != null),
        );
        // Always show how many files of an added kind are attached; keep showing
        // an empty kind only when a minimum requirement is configured.
        const showCountLine = count > 0
            || (hasCountLimit && countConstraint!.min != null && countConstraint!.min > 0);
        if (showCountLine) {
            const invalid = hasCountLimit ? isOutOfRange(count, countConstraint) : false;
            if (invalid) review.ok = false;
            review.lines.push({
                text: hasCountLimit
                    ? `${many}: ${count} عدد (مجاز: ${limitRangeFa(countConstraint)})`
                    : `${many}: ${count} عدد`,
                invalid,
            });
        }

        const totalConstraint = c[`${kind}TotalSize`];
        if (totalConstraint && (items.length > 0 || (totalConstraint.min != null && totalConstraint.min > 0))) {
            const totalBytes = items.reduce((sum, item) => sum + (item.sizeBytes || 0), 0);
            const invalid = isOutOfRange(totalBytes, totalConstraint);
            if (invalid) review.ok = false;
            review.lines.push({
                text: `حجم مجموع ${many}: ${formatBytesFa(totalBytes)} (مجاز: ${limitBytesFa(totalConstraint)})`,
                invalid,
            });
        }

        const fileConstraint = c[`${kind}FileSize`];
        if (fileConstraint && items.length > 0 && (fileConstraint.min != null || fileConstraint.max != null)) {
            const sizes = items.map((item) => item.sizeBytes || 0);
            const minSize = Math.min(...sizes);
            const maxSize = Math.max(...sizes);
            const current = minSize === maxSize
                ? formatBytesFa(minSize)
                : `${formatBytesFa(minSize)} تا ${formatBytesFa(maxSize)}`;
            const invalid = sizes.some((size) => isOutOfRange(size, fileConstraint));
            if (invalid) review.ok = false;
            review.lines.push({
                text: `حجم هر ${one}: ${current} (مجاز: ${limitBytesFa(fileConstraint)})`,
                invalid,
            });
        }

        const durationConstraint = kind === 'video'
            ? c.videoDuration
            : kind === 'audio'
                ? c.audioDuration
                : undefined;
        if (durationConstraint && items.length > 0 && (durationConstraint.min != null || durationConstraint.max != null)) {
            const durations = items.map((item) => item.durationSeconds || 0);
            const minD = Math.min(...durations);
            const maxD = Math.max(...durations);
            const current = minD === maxD
                ? formatSecondsFa(maxD)
                : `${formatSecondsFa(minD)} تا ${formatSecondsFa(maxD)}`;
            const invalid = durations.some((value) => isOutOfRange(value, durationConstraint));
            if (invalid) review.ok = false;
            review.lines.push({
                text: `مدت ${many}: ${current} (مجاز: ${limitSecondsFa(durationConstraint)})`,
                invalid,
            });
        }

        const formats = c.supportedFormats?.[kind];
        if (formats?.length) {
            const exts = items
                .map((item) => getFileExtension(item.url || item.label || ''))
                .filter(Boolean);
            const badExts = [...new Set(exts.filter((ext) => !formats.includes(ext)))];
            if (badExts.length) {
                review.ok = false;
                review.lines.push({
                    text: `فرمت ${badExts.join('، ')} برای ${one} مجاز نیست (مجاز: ${formats.join('، ')})`,
                    invalid: true,
                });
            } else if (!items.length) {
                review.lines.push({
                    text: `فرمت‌های مجاز ${one}: ${formats.join('، ')}`,
                    invalid: false,
                });
            } else {
                review.lines.push({
                    text: `فرمت‌های مجاز ${one}: ${formats.join('، ')} (فایل‌ها: ${exts.join('، ') || '—'})`,
                    invalid: false,
                });
            }
        }
    }

    // Cross-kind totals: overall file count and overall input size.
    const totalCount = metrics.inputImageCount + metrics.inputVideoCount + metrics.inputAudioCount;
    const totalCountLimit = c.totalCount;
    const hasTotalCountLimit = Boolean(
        totalCountLimit && (totalCountLimit.min != null || totalCountLimit.max != null),
    );
    if (attachments.length > 0
        || (hasTotalCountLimit && totalCountLimit!.min != null && totalCountLimit!.min > 0)) {
        const invalid = hasTotalCountLimit ? isOutOfRange(totalCount, totalCountLimit) : false;
        if (invalid) review.ok = false;
        review.lines.push({
            text: hasTotalCountLimit
                ? `مجموع فایل‌ها: ${totalCount} عدد (مجاز: ${limitRangeFa(totalCountLimit)})`
                : `مجموع فایل‌ها: ${totalCount} عدد`,
            invalid,
        });
    }

    const totalBytes = attachments.reduce((sum, item) => sum + (item.sizeBytes || 0), 0);
    const totalSizeLimit = c.totalFileSize;
    const hasTotalSizeLimit = Boolean(
        totalSizeLimit && (totalSizeLimit.min != null || totalSizeLimit.max != null),
    );
    if (totalBytes > 0 || (hasTotalSizeLimit && totalSizeLimit!.min != null && totalSizeLimit!.min > 0)) {
        const invalid = hasTotalSizeLimit ? isOutOfRange(totalBytes, totalSizeLimit) : false;
        if (invalid) review.ok = false;
        review.lines.push({
            text: hasTotalSizeLimit
                ? `حجم کل فایل‌ها: ${formatBytesFa(totalBytes)} (مجاز: ${limitBytesFa(totalSizeLimit)})`
                : `حجم کل فایل‌ها: ${formatBytesFa(totalBytes)}`,
            invalid,
        });
    }

    return review;
}

/**
 * All validation errors that apply to one attachment: file-scoped errors that
 * reference it directly, cross-kind errors (total count / total size), plus
 * kind-scoped errors (count / total size) for its kind.
 */
export function collectAttachmentErrors(
    errors: ValidationError[],
    media: TemplatePreviewMedia,
): ValidationError[] {
    const kind = classifyChatAttachmentKind(media);
    return errors.filter((error) =>
        error.attachment === media
        || error.all
        || (!error.attachment && error.kind === kind));
}
