import type { Edge, Node } from '@xyflow/react';
import type { StudioNodeData } from '../[projectId]/types/studio';
import { getSourceOutputKind, isValidStudioConnection } from './studio-connections';

export interface StudioRuntimeMetrics {
    inputImageCount: number;
    inputVideoCount: number;
    inputAudioCount: number;
    hasImageInput: boolean;
    hasVideoInput: boolean;
    hasAudioInput: boolean;
    inputVideoDurationSeconds: number;
    inputAudioDurationSeconds: number;
    totalInputImagePixels: number;
    totalInputVideoPixels: number;
    maxInputImageWidth: number;
    maxInputImageHeight: number;
    maxInputVideoWidth: number;
    maxInputVideoHeight: number;
    /** Sum of {@link imagePatchTokens} over every input image (mirrors the API metric). */
    inputImagePatchTokens: number;
    /** Sum of {@link gptImageInputTokens} over every input image (mirrors the API metric). */
    inputImageGptTokens: number;
    /** Sum of whole seconds of every input video (each clip floored) — mirrors the API metric. */
    inputVideoWholeSeconds: number;
    /** Nearest standard video ratio of the primary input (first video, else first image); '' without media. */
    primaryInputAspectRatio: string;
    /** Long edge ÷ short edge of the primary input (≥ 1); 1 without media. */
    primaryInputAspectFactor: number;
    /** Resolution tier of the primary input by its short edge (360p … 4k); '' without media. */
    primaryInputResolutionTier: string;
}

/** Same buckets and rounding as the API (`connected-input-metrics.ts`) — the quote must match. */
const VIDEO_ASPECT_BUCKETS: ReadonlyArray<[string, number]> = [
    ['21:9', 21 / 9], ['16:9', 16 / 9], ['4:3', 4 / 3], ['1:1', 1], ['3:4', 3 / 4], ['9:16', 9 / 16],
];

export function videoAspectBucket(width: number, height: number): string {
    if (!(width > 0) || !(height > 0)) return '';
    const ratio = width / height;
    let best = VIDEO_ASPECT_BUCKETS[0];
    for (const bucket of VIDEO_ASPECT_BUCKETS) {
        if (Math.abs(Math.log(ratio / bucket[1])) < Math.abs(Math.log(ratio / best[1]))) best = bucket;
    }
    return best[0];
}

export function aspectFactor(width: number, height: number): number {
    if (!(width > 0) || !(height > 0)) return 1;
    return Math.round((Math.max(width, height) / Math.min(width, height)) * 1e6) / 1e6;
}

/** Same thresholds as the API: ≤360 → 360p, ≤480 → 480p, ≤720 → 720p, ≤1080 → 1080p, ≤1440 → 1440p, else 4k. */
export function resolutionTier(width: number, height: number): string {
    if (!(width > 0) || !(height > 0)) return '';
    const short = Math.min(width, height);
    if (short <= 360) return '360p';
    if (short <= 480) return '480p';
    if (short <= 720) return '720p';
    if (short <= 1080) return '1080p';
    if (short <= 1440) return '1440p';
    return '4k';
}

/** Fills the primary-input metrics: the first video, else the first image. */
export function applyPrimaryInputMetrics(
    metrics: StudioRuntimeMetrics,
    firstVideo: [number, number] | null,
    firstImage: [number, number] | null,
): void {
    const primary = firstVideo || firstImage;
    metrics.primaryInputAspectRatio = primary ? videoAspectBucket(primary[0], primary[1]) : '';
    metrics.primaryInputAspectFactor = primary ? aspectFactor(primary[0], primary[1]) : 1;
    metrics.primaryInputResolutionTier = primary ? resolutionTier(primary[0], primary[1]) : '';
}

/**
 * Input-image tokens of patch-based image models (GPT Image 2.5 on Atlas Cloud) —
 * same rule as the API: ⌈W/32⌉ × ⌈H/32⌉ patches × 1.5 (floored), at least 256 per image.
 */
export function imagePatchTokens(width: number, height: number): number {
    const patches = Math.ceil(Math.max(0, width) / 32) * Math.ceil(Math.max(0, height) / 32);
    return Math.max(256, Math.floor(patches * 1.5));
}

/**
 * Input-image tokens that GPT Image 2.x bills (`usage.input_tokens_details.image_tokens`),
 * independent of output size and quality:
 * 1. an image whose long edge is under 1024 px is upscaled toward 1024 (at most ×2);
 * 2. it is covered by 32×32 px patches;
 * 3. a patch grid longer than 3:1 is padded to 3:1;
 * 4. above 1536 patches the image is shrunk to fit 1536 (OpenAI's patch rule).
 * 512×512 / 1024×1024 → 1024, 1080×1350 → 1462, 1920×1080 → 1508, 4032×3024 → 1452.
 * Unknown dimensions count as the 1536 ceiling. Same rule as the API.
 */
export function gptImageInputTokens(width: number, height: number): number {
    if (!(width > 0) || !(height > 0)) return GPT_IMAGE_MAX_INPUT_TOKENS;
    const grid = (w: number, h: number) => {
        let a = Math.ceil(w / 32);
        let b = Math.ceil(h / 32);
        if (a > 3 * b) b = Math.ceil(a / 3);
        else if (b > 3 * a) a = Math.ceil(b / 3);
        return a * b;
    };
    const upscale = Math.min(2, Math.max(1, 1024 / Math.max(width, height)));
    const w = Math.floor(width * upscale);
    const h = Math.floor(height * upscale);
    const patches = grid(w, h);
    if (patches <= GPT_IMAGE_MAX_INPUT_TOKENS) return patches;
    const shrink = Math.min(1, Math.sqrt((32 * 32 * GPT_IMAGE_MAX_INPUT_TOKENS) / (w * h)));
    const fit = Math.min(
        Math.floor((w * shrink) / 32) / ((w * shrink) / 32),
        Math.floor((h * shrink) / 32) / ((h * shrink) / 32),
    );
    return Math.min(
        GPT_IMAGE_MAX_INPUT_TOKENS,
        grid(Math.floor(w * shrink * fit), Math.floor(h * shrink * fit)),
    );
}

const GPT_IMAGE_MAX_INPUT_TOKENS = 1536;

export const EMPTY_RUNTIME_METRICS: StudioRuntimeMetrics = {
    inputImageCount: 0,
    inputVideoCount: 0,
    inputAudioCount: 0,
    hasImageInput: false,
    hasVideoInput: false,
    hasAudioInput: false,
    inputVideoDurationSeconds: 0,
    inputAudioDurationSeconds: 0,
    totalInputImagePixels: 0,
    totalInputVideoPixels: 0,
    maxInputImageWidth: 0,
    maxInputImageHeight: 0,
    maxInputVideoWidth: 0,
    maxInputVideoHeight: 0,
    inputImagePatchTokens: 0,
    inputImageGptTokens: 0,
    inputVideoWholeSeconds: 0,
    primaryInputAspectRatio: '',
    primaryInputAspectFactor: 1,
    primaryInputResolutionTier: '',
};

function positive(...values: unknown[]): number {
    for (const value of values) {
        const number = Number(value);
        if (Number.isFinite(number) && number > 0) return number;
    }
    return 0;
}

function configuredVideoDimensions(settings: Record<string, unknown>): { width: number; height: number } {
    const resolution = String(settings.resolution || settings.imageSize || '').toLowerCase().trim();
    const dimensions: Record<string, [number, number]> = {
        '480p': [854, 480],
        '720p': [1280, 720],
        '1080p': [1920, 1080],
        '4k': [3840, 2160],
    };
    const explicit = resolution.match(/^(\d+)\s*[x×]\s*(\d+)$/i);
    let width = positive(settings.outputWidth, settings.width, explicit?.[1], dimensions[resolution]?.[0]);
    let height = positive(settings.outputHeight, settings.height, explicit?.[2], dimensions[resolution]?.[1]);
    const ratioParts = String(settings.aspectRatio || '').match(
        /^\s*(\d+(?:\.\d+)?)\s*[:/]\s*(\d+(?:\.\d+)?)\s*$/,
    );
    if (!settings.outputWidth && !settings.width && !settings.outputHeight && !settings.height && ratioParts) {
        const ratio = Number(ratioParts[1]) / Number(ratioParts[2]);
        const shortEdge = Math.min(width, height);
        const toEven = (value: number) => Math.max(2, Math.round(value / 2) * 2);
        if (shortEdge > 0 && Number.isFinite(ratio) && ratio > 0) {
            if (ratio >= 1) {
                width = toEven(shortEdge * ratio);
                height = shortEdge;
            } else {
                width = shortEdge;
                height = toEven(shortEdge / ratio);
            }
        }
    }
    return { width, height };
}

export function collectConnectedInputMetrics(
    nodeId: string,
    nodes: Node[],
    edges: Edge[],
): StudioRuntimeMetrics {
    const incoming = edges.filter((edge) => edge.target === nodeId);
    const result = { ...EMPTY_RUNTIME_METRICS };
    let firstImage: [number, number] | null = null;
    let firstVideo: [number, number] | null = null;

    for (const edge of incoming) {
        if (!isValidStudioConnection(edge, nodes)) continue;
        const node = nodes.find((candidate) => candidate.id === edge.source);
        if (!node) continue;
        const data = (node.data || {}) as StudioNodeData;
        const metadata = data.mediaMetadata || data.metadata || {};
        const settings = data.modelSettings || {};
        const outputKind = getSourceOutputKind(node);
        if (outputKind !== 'image' && outputKind !== 'video' && outputKind !== 'audio') continue;
        const kind = outputKind;
        const urls = kind === 'image' ? data.images : kind === 'video' ? data.videos : undefined;
        const rawData = data as unknown as Record<string, unknown>;
        const outputUrls = rawData.outputUrls;
        const configuredCount = kind === 'image'
            ? positive(settings.numImages, settings.num_images, settings.quantity, rawData.numImages)
            : kind === 'video'
                ? positive(settings.numVideos, settings.num_videos, settings.quantity, rawData.numVideos)
                : positive(settings.numAudios, settings.num_audios, settings.quantity, rawData.numAudios);
        const count = Array.isArray(urls) && urls.length
            ? urls.length
            : Array.isArray(outputUrls) && outputUrls.length
                ? outputUrls.length
                : configuredCount > 0
                    ? Math.max(1, Math.floor(configuredCount))
                    : 1;
        const configured = configuredVideoDimensions(settings);
        const width = positive(metadata.width, data.mediaWidth, data.width, configured.width);
        const height = positive(metadata.height, data.mediaHeight, data.height, configured.height);
        const duration = positive(
            metadata.durationSeconds,
            data.videoDurationSeconds,
            data.audioDurationSeconds,
            data.durationSeconds,
            data.duration,
            settings.durationSeconds,
            settings.duration,
        );

        if (kind === 'image') {
            firstImage ??= [width, height];
            result.inputImageCount += count;
            result.totalInputImagePixels += width * height * count;
            result.inputImagePatchTokens += imagePatchTokens(width, height) * count;
            result.inputImageGptTokens += gptImageInputTokens(width, height) * count;
            result.maxInputImageWidth = Math.max(result.maxInputImageWidth, width);
            result.maxInputImageHeight = Math.max(result.maxInputImageHeight, height);
        } else if (kind === 'video') {
            firstVideo ??= [width, height];
            result.inputVideoCount += count;
            result.inputVideoDurationSeconds += duration * count;
            result.inputVideoWholeSeconds += Math.floor(duration) * count;
            result.totalInputVideoPixels += width * height * count;
            result.maxInputVideoWidth = Math.max(result.maxInputVideoWidth, width);
            result.maxInputVideoHeight = Math.max(result.maxInputVideoHeight, height);
        } else {
            result.inputAudioCount += count;
            result.inputAudioDurationSeconds += duration * count;
        }
    }
    result.hasImageInput = result.inputImageCount > 0;
    result.hasVideoInput = result.inputVideoCount > 0;
    result.hasAudioInput = result.inputAudioCount > 0;
    applyPrimaryInputMetrics(result, firstVideo, firstImage);
    return result;
}
