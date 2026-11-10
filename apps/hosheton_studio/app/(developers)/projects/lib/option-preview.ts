import type { NodeSettingField, NodeSettingOptionsDisplay } from '../types/node-catalog';
import { sanitizeLegacyStorageUrl } from '../[projectId]/lib/file-url';

export type OptionPreviewKind = 'audio' | 'image' | 'video';

const AUDIO_PREVIEW_EXTS = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'opus'];
const IMAGE_PREVIEW_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'avif', 'bmp'];
const VIDEO_PREVIEW_EXTS = ['mp4', 'webm', 'mov', 'm4v', 'ogv'];

/**
 * Detects what kind of player an option `preview` URL needs. Extension-based,
 * falling back to the field's providerClass (audio/image/video) so any model
 * type — voice samples, sample frames, sample clips — renders correctly.
 */
export function previewMediaKind(
    url: string,
    fallbackProviderClass?: string,
): OptionPreviewKind | null {
    const clean = String(url || '').split(/[?#]/)[0].toLowerCase();
    const dot = clean.lastIndexOf('.');
    const ext = dot >= 0 ? clean.slice(dot + 1) : '';
    if (AUDIO_PREVIEW_EXTS.includes(ext)) return 'audio';
    if (IMAGE_PREVIEW_EXTS.includes(ext)) return 'image';
    if (VIDEO_PREVIEW_EXTS.includes(ext)) return 'video';
    if (fallbackProviderClass === 'audio' || fallbackProviderClass === 'image' || fallbackProviderClass === 'video') {
        return fallbackProviderClass;
    }
    return null;
}

export interface ResolvedOptionPreview {
    url: string;
    kind: OptionPreviewKind;
}

/** Preview of one option, or null when it has none or that kind is switched off for the field. */
export function resolveOptionPreview(
    field: NodeSettingField,
    preview?: string,
): ResolvedOptionPreview | null {
    const url = preview ? sanitizeLegacyStorageUrl(String(preview).trim()) : '';
    if (!url) return null;
    const kind = previewMediaKind(url, field.providerClass);
    if (!kind) return null;
    if (field.optionsPreview?.[kind] === false) return null;
    return { url, kind };
}

/** Whether option SVG icons are shown for the field (default: yes). */
export function optionIconsEnabled(field: NodeSettingField): boolean {
    return field.optionsPreview?.icon !== false;
}

/**
 * Concrete layout for a select field; `auto` is decided from what the options carry:
 * every option has an icon/image/video → grid, any audio sample → list,
 * many plain options → dropdown, otherwise chips.
 */
export function resolveOptionsDisplay(
    field: NodeSettingField,
    has: { count: number; allVisual: boolean; audio: boolean },
): Exclude<NodeSettingOptionsDisplay, 'auto'> {
    const display = field.optionsDisplay;
    if (display && display !== 'auto') return display;
    if (has.count > 0 && has.allVisual && has.count <= 24) return 'grid';
    if (has.audio) return 'list';
    if (has.count > 12) return 'dropdown';
    return 'chips';
}
