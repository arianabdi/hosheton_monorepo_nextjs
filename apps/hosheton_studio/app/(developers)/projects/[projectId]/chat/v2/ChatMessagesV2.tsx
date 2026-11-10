'use client';

/**
 * ChatMessagesV2 — نمای گالریِ چت (نسخه ۲).
 *
 * همان داده‌های v1 را نمایش می‌دهد اما به سبک گالری:
 *  - هر خروجی تولیدشده کنار خروجی قبلی می‌نشیند (ردیف‌های justified مثل گالری، بدون تاریخ)
 *  - تایل‌های جدید و باکس «در حال تولید» در ابتدای گرید می‌آیند (مثل گالری: تازه‌ترین اول)
 *  - باکس «در حال تولید» با نسبت واقعی درخواست (فالبک موبایل ۹:۱۶) و لوگوی SVG همان مدل رندر می‌شود
 *  - خطای نوبت ناموفق هم داخل همان باکس (تایل قرمز با تلاش مجدد/ویرایش) نشان داده می‌شود
 *  - ویدیو در گرید با تامبنیل فشرده + هاله سیاه و duration مثل PhotoGallery
 *  - کلیک روی هر خروجی: مودال جزئیات به سبک ExploreDetailModal — نوار شناور بستن/دانلود در بالا،
 *    رسانه اصلی و دقیقاً زیر آن رسانه‌های ورودی همان نوبت (dedupe شده، بدون تکرار)، پرامپت
 *    جمع‌شونده و اسکرول کامل داخل مودال.
 *  - هیچ رسانه‌ای بدون زدن «استفاده به‌عنوان مرجع» به chatinput منتقل نمی‌شود؛ انتخاب چندتایی
 *    (خروجی اصلی + ورودی‌ها) فقط با همان دکمه به کامپوزر چت برمی‌گردد.
 *  - خروجی‌های یک درخواست (مثلاً n=3) در یک باکس گروه با گرید هم‌اندازه؛ هزینه کل درخواست و حجم
 *    کل فقط یک‌بار در نوار زیر گرید (نه تکرار روی تک‌تک تایل‌ها).
 */

import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
    LuCheck, LuChevronDown, LuCopy, LuDownload, LuEllipsis, LuExpand, LuFilm, LuHammer, LuImage, LuImages, LuMusic,
    LuPencil, LuPlay, LuRefreshCw, LuRotateCcw, LuSparkles, LuTrash2, LuTriangleAlert, LuType,
} from 'react-icons/lu';
import { MdAdd } from 'react-icons/md';
import { TbInfoSquareRounded, TbTemplate } from 'react-icons/tb';
import { templateMediaKey, useTemplateCreateStore } from '@/app/zustand/store/useTemplateCreateStore';
import { flyToTemplateTab } from '@/app/(developers)/chat/components/TemplateBuilder/flyToTemplateTab';
import { SvgMarkup, sanitizeSvg } from '../lib/modeIcon';
import {
    mediaOptimizedListThumbSrc,
    mediaOriginalSrc,
    mediaThumbLargeSrc,
    mediaThumbSrc,
} from '@/app/(marketplace)/lib/template-media';
import { ModalCloseButton, ModalHelper } from '@my-workspace/components';
import { SuccessToaster } from '@my-workspace/utils';
import type { StudioChatMessage, StudioChatSettings, TemplatePreviewMedia } from '@/app/(developers)/projects/types/media-api';
import { loadChatModelIcons } from '../lib/model-icons';
import { MediaMentionText } from '@/app/(developers)/projects/components/MediaMentionComposer';
import { BadgedImage } from '@/app/(developers)/chat/components/BadgedImage/BadgedImage';
import { ImageLightbox } from '@/app/(developers)/projects/[projectId]/components/CustomNodes/ImageLightbox';
import { MiniAudioPlayer } from '@/app/(developers)/projects/[projectId]/components/MiniAudioPlayer';
import { formatChatUsd } from '../lib/chat-usage';
import { isSameChatMedia } from '../lib/chat-attachment-kind';
import { mentionToAttachment, mergeChatAttachments, relinkMentionsToAttachments } from '../lib/restore-turn-inputs';
import type { StudioMediaMention } from '@/app/(developers)/projects/lib/studio-media';
import { downloadOriginalMedia } from '../lib/download-media';
import { providersApi } from '@/app/(developers)/projects/lib/providers-api';
import type { NodeSettingField } from '@/app/(developers)/projects/types/node-catalog';
import { formatFileSize, useMediaFileSizes } from '@/app/(developers)/projects/lib/media-file-size';
import { HoshetonError } from '@/app/lib/errors';
import { useMobileViewport } from '@/app/hooks/useMobileViewport';
import { useChatSession, type ChatTurnLiveStatus } from '../ChatSessionContext';
import ChatMessages from '../v1/ChatMessages';
import DeleteOutputDialog from './DeleteOutputDialog';
import FailedTurnDetailsDialog from './FailedTurnDetailsDialog';
import styles from './ChatMessagesV2.module.scss';

const TILE_GAP = 8;
/** دسکتاپ: هر ستون اسمی گرید حدوداً این عرض را دارد — تعداد ستون با عرض صفحه عوض می‌شود */
const DESKTOP_COLUMN_WIDTH = 220;

type GridDensity = {
    /** ارتفاع هدف ردیف = عرض یک ستون (یک تایل مربع در هر ستون) */
    targetHeight: number;
    /** بیشترین تعداد آیتم یک ردیف */
    maxRowItems: number;
    /** کمترین ارتفاع ردیف خروجی‌ها */
    minMediaHeight: number;
};

/**
 * چگالی گرید از روی عرض کانتینر. موبایل (compact) ریتم سه‌ستونه دارد: هر ردیف دو یا سه آیتم؛
 * دسکتاپ به ازای هر DESKTOP_COLUMN_WIDTH یک ستون (۳ تا ۸) تا با کوچک/بزرگ شدن پنجره
 * اندازهٔ تایل‌ها ثابت بماند و فقط تعداد ستون عوض شود.
 */
function gridDensity(width: number, compact: boolean): GridDensity {
    const columns = compact ? 3 : Math.min(8, Math.max(3, Math.round(width / DESKTOP_COLUMN_WIDTH)));
    const columnWidth = (width - (columns - 1) * TILE_GAP) / columns;
    return {
        targetHeight: columnWidth,
        maxRowItems: compact ? 3 : columns + 2,
        minMediaHeight: Math.min(MEDIA_MIN_ROW_HEIGHT, columnWidth * 0.65),
    };
}

function mediaKey(media: TemplatePreviewMedia): string {
    return String(media.url || media.fileId || media.fileKey || media.assetId || Math.random());
}

/** توکن‌های هویتی یک رسانه — یک فایل ممکن است همزمان در mentionRefs و attachments باشد */
function mediaIdentityKeys(media: TemplatePreviewMedia): string[] {
    const keys: string[] = [];
    const push = (prefix: string, value: unknown) => {
        const normalized = String(value ?? '').trim();
        if (normalized) keys.push(`${prefix}:${normalized}`);
    };
    push('url', media.url);
    push('file', media.fileId);
    push('key', media.fileKey);
    push('asset', media.assetId);
    push('id', media.id);
    push('thumb', media.thumbnailUrl);
    return keys;
}

/** حذف تکراری‌ها بین منشن‌ها و پیوست‌ها — هر رسانه فقط یک‌بار در مودال نشان داده می‌شود */
function dedupeMedia(items: TemplatePreviewMedia[]): TemplatePreviewMedia[] {
    const seen = new Set<string>();
    const out: TemplatePreviewMedia[] = [];
    for (const item of items) {
        const keys = mediaIdentityKeys(item);
        if (keys.length && keys.some((key) => seen.has(key))) continue;
        keys.forEach((key) => seen.add(key));
        out.push(item);
    }
    return out;
}

function isVideoMedia(media: TemplatePreviewMedia) {
    return media.type === 'video' || /\.(mp4|webm|mov|m4v|mkv|avi)(\?|$)/i.test(media.url || '');
}

function isAudioMedia(media: TemplatePreviewMedia) {
    if (media.type === 'audio' || media.label === 'audio') return true;
    return /\.(mp3|wav|ogg|m4a|aac|flac|weba)(\?|$)/i.test(media.url || '');
}

function formatDuration(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const total = Math.round(seconds);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function tileCostLabel(
    cost?: { amount: number } | null,
    totalCost?: number,
): string {
    const amount = (typeof totalCost === 'number' && totalCost > 0)
        ? totalCost
        : (typeof cost?.amount === 'number' ? cost.amount : 0);
    return amount > 0 ? formatChatUsd(amount) : '';
}

/** همان منطق ابعاد گالری — ویدیو ۱۶:۹، تصویر ۴:۳ وقتی متادیتا نیست. */
function tileDimensions(media: TemplatePreviewMedia): { width: number; height: number } {
    if (media.width && media.height && media.width > 0 && media.height > 0) {
        return { width: media.width, height: media.height };
    }
    if (media.aspectRatio && media.aspectRatio > 0) {
        return { width: Math.round(media.aspectRatio * 1000), height: 1000 };
    }
    if (isAudioMedia(media)) return { width: 1, height: 1 };
    if (isVideoMedia(media)) return { width: 16, height: 9 };
    return { width: 4, height: 3 };
}

function tileThumbSrc(media: TemplatePreviewMedia): string {
    const optimized = mediaOptimizedListThumbSrc(media);
    if (optimized) return optimized;
    if (isVideoMedia(media) || isAudioMedia(media)) return '';
    return mediaThumbLargeSrc(media) || mediaOriginalSrc(media);
}

/** پهنای ردیف دکمه‌های تایل (ارجاع + قالب + جزئیات: ۳ × ۲۴px + فاصله ۳px) */
function tileActionsWidth(): number {
    const count = 3;
    const gap = 3;
    return 6 + count * 24 + (count - 1) * gap;
}

/** تخمین پهنای بج هزینه/حجم (فونت 10px compact + padding و بریدگی گوشه) */
function estimateBadgeWidth(label: string): number {
    return label ? label.length * 6.2 + 24 : 0;
}

type TurnShape = { width: number; height: number; label: string; isRatio: boolean };

/** پریست‌های اندازه‌ی fal (image_size) */
const SIZE_PRESETS: Record<string, TurnShape> = {
    square: { width: 1, height: 1, label: '1:1', isRatio: true },
    square_hd: { width: 1, height: 1, label: '1:1', isRatio: true },
    portrait_4_3: { width: 3, height: 4, label: '3:4', isRatio: true },
    portrait_16_9: { width: 9, height: 16, label: '9:16', isRatio: true },
    landscape_4_3: { width: 4, height: 3, label: '4:3', isRatio: true },
    landscape_16_9: { width: 16, height: 9, label: '16:9', isRatio: true },
};

/** «16:9»، «1024x1536»، «1024*1024» یا پریست fal — null برای auto/2K/720p و مقادیر نامفهوم */
function parseShape(raw: unknown): TurnShape | null {
    const value = String(raw ?? '').trim();
    if (!value) return null;
    const match = value.match(/^(\d+(?:\.\d+)?)\s*([:/xX×*])\s*(\d+(?:\.\d+)?)$/);
    if (match) {
        const width = Number(match[1]);
        const height = Number(match[3]);
        if (!(width > 0 && height > 0)) return null;
        // «16x9» نسبت است، «1024x1536» ابعاد پیکسلی
        const isRatio = match[2] === ':' || match[2] === '/' || (width < 64 && height < 64);
        return { width, height, isRatio, label: isRatio ? `${width}:${height}` : `${width}×${height}` };
    }
    return SIZE_PRESETS[value.toLowerCase()] || null;
}

/** سطح کیفیت («2K»، «1080p») — کنار نسبت نمایش داده می‌شود */
function parseSizeTier(raw: unknown): string {
    const value = String(raw ?? '').trim();
    if (/^\d+(?:\.\d+)?\s*k$/i.test(value)) return value.toUpperCase().replace(/\s+/g, '');
    if (/^\d{3,4}p$/i.test(value)) return value.toLowerCase();
    return '';
}

/**
 * شکل خروجی هر نوبت از snapshot تنظیمات. بعضی مدل‌ها نسبت می‌گیرند (aspectRatio) و بعضی
 * اندازه (size/imageSize/image_size یا width/height) — اندازه اولویت دارد چون ورکر هم
 * وقتی اندازه هست نسبت را نادیده می‌گیرد. settings.aspectRatio سطح بالا آخرین گزینه است
 * چون همیشه مقدار پیش‌فرض دارد. اگر هیچ‌کدام نبود: نسبت موبایل ۹:۱۶ بدون برچسب.
 */
function turnShape(settings: StudioChatSettings | null, mediaKind: string): { width: number; height: number; label: string } {
    if (mediaKind === 'audio') return { width: 1, height: 1, label: '' };
    const modelSettings = (settings?.modelSettings || {}) as Record<string, unknown>;
    const width = Number(modelSettings.width ?? modelSettings.outputWidth);
    const height = Number(modelSettings.height ?? modelSettings.outputHeight);
    if (width > 0 && height > 0) return { width, height, label: `${width}×${height}` };

    const sizeValues = [
        modelSettings.size,
        modelSettings.imageSize,
        modelSettings.image_size,
        modelSettings.outputSize,
        modelSettings.resolution,
    ];
    const ratioValues = [modelSettings.aspectRatio, modelSettings.aspect_ratio, settings?.aspectRatio];
    const shape = sizeValues.map(parseShape).find(Boolean) || ratioValues.map(parseShape).find(Boolean);
    const tier = sizeValues.map(parseSizeTier).find(Boolean) || '';
    if (!shape) return { width: 9, height: 16, label: tier };
    return {
        width: shape.width,
        height: shape.height,
        label: shape.isRatio && tier ? `${shape.label} · ${tier}` : shape.label,
    };
}

/** تنظیمات یک نوبت — روی پیام «کاربرِ» همان نوبت ذخیره می‌شود (assistant فقط خروجی دارد) */
function turnSettings(
    userMessage?: StudioChatMessage | null,
    assistantMessage?: StudioChatMessage | null,
): StudioChatSettings | null {
    return (userMessage?.requestSnapshot?.settings
        || assistantMessage?.requestSnapshot?.settings
        || null) as StudioChatSettings | null;
}

/** نام/آیدی مدل یک نوبت — از snapshot نوبت، وگرنه تنظیمات فعلی چت */
function turnModelInfo(settings: StudioChatSettings | null, fallback: string): { name: string; id: string } {
    return {
        name: String(settings?.modelName || settings?.model || fallback || '').trim(),
        id: String(settings?.modelId || '').trim(),
    };
}

type GalleryTile = {
    key: string;
    /** شناسه نوبت (پیام assistant) — همه خروجی‌های یک درخواست یک turnKey دارند */
    turnKey: string;
    media: TemplatePreviewMedia;
    message: StudioChatMessage;
    /** پیام کاربرِ همان نوبت — requestSnapshot و پرامپت روی این پیام است (نه assistant) */
    userMessage?: StudioChatMessage;
    width: number;
    height: number;
    /** جای پیام در گفتگو (ترتیب ساخت) — گرید به همین ترتیب، تازه‌ترین اول */
    order: number;
};

/** نوبت در جریان: در حال تولید یا ناموفق — هر دو به‌شکل تایل داخل همان گرید */
type TurnPreview = {
    key: string;
    kind: 'processing' | 'failed';
    prompt: string;
    modelName: string;
    modelId: string;
    mediaKind: string;
    aspect: { width: number; height: number };
    aspectLabel?: string;
    errorMessage?: string;
    hasSnapshot?: boolean;
    retryable?: boolean;
    /** جای پیام نوبت در گفتگو (ترتیب ساخت) */
    order: number;
};

/** آیتم‌های چیدمان گرید — باکس در حال ساخت/ناموفق و خروجی‌های تازه در ابتدای صف */
type LayoutItem = {
    id: string;
    kind: 'media' | 'processing' | 'failed';
    width: number;
    height: number;
    tile?: GalleryTile;
    turn?: TurnPreview;
};

type LayoutCell = { photo: { computedWidth: number; computedHeight: number }; item: LayoutItem };

/**
 * بلوک‌های گرید: ردیف‌های justified عادی، یا باکس یک درخواست چندخروجی که خروجی‌هایش
 * در یک CSS grid با خانه‌های هم‌اندازه چیده می‌شوند و هزینه کل فقط یک‌بار زیرشان می‌آید.
 */
type GroupBlock = {
    kind: 'group';
    key: string;
    tiles: GalleryTile[];
    cols: number;
    cellWidth: number;
    cellHeight: number;
    width: number;
    height: number;
};
type GridBlock = { kind: 'rows'; key: string; rows: LayoutCell[][] } | GroupBlock;

/** padding باکس گروه و ارتفاع نوار هزینه زیر گرید — هم‌راستا با .groupBox / .groupFooter */
const GROUP_PAD = 4;
const GROUP_FOOTER_HEIGHT = 30;

/**
 * هندسه گرید گروه: خروجی‌های یک درخواست هم‌اندازه‌اند، پس همه خانه‌ها نسبت اولی را می‌گیرند.
 * کمترین تعداد ستونی انتخاب می‌شود که خانه‌ها در عرض کامل از ارتفاع ردیف گالری خیلی بلندتر نشوند،
 * بعد ستون‌ها متوازن می‌شوند (۴ خروجی = ۲×۲، نه ۳+۱).
 */
function groupGridBlock(tiles: GalleryTile[], containerWidth: number, compact = false): GroupBlock {
    const count = tiles.length;
    const aspect = tiles[0].width > 0 && tiles[0].height > 0 ? tiles[0].width / tiles[0].height : 1;
    const inner = Math.max(0, containerWidth - GROUP_PAD * 2);
    const { targetHeight, maxRowItems } = gridDensity(inner, compact);
    const widthFor = (cols: number) => (inner - (cols - 1) * TILE_GAP) / cols;
    // موبایل: فقط خروجی خیلی عریض تک‌ستونی می‌شود؛ بقیه دوتایی یا سه‌تایی کنار هم
    const minCols = compact && aspect < SOLO_ASPECT ? Math.min(2, count) : 1;
    const maxCols = Math.min(count, maxRowItems);
    let cols = maxCols;
    for (let c = minCols; c < maxCols; c += 1) {
        if (widthFor(c) / aspect <= targetHeight * 1.15) {
            cols = c;
            break;
        }
    }
    const rows = Math.ceil(count / cols);
    cols = Math.ceil(count / rows);
    // موبایل: باکس عرض کامل را پر می‌کند (تا سقف ردیف)؛ دسکتاپ: خانه‌ها از ردیف گالری بلندتر نمی‌شوند
    const maxCellHeight = compact ? MAX_ROW_HEIGHT : targetHeight * 1.15;
    let cellWidth = widthFor(cols);
    let cellHeight = cellWidth / aspect;
    if (cellHeight > maxCellHeight) {
        cellHeight = maxCellHeight;
        cellWidth = cellHeight * aspect;
    }
    return {
        kind: 'group',
        key: `group-${tiles[0].turnKey}`,
        tiles,
        cols,
        cellWidth,
        cellHeight,
        width: cols * cellWidth + (cols - 1) * TILE_GAP + GROUP_PAD * 2,
        height: rows * cellHeight + (rows - 1) * TILE_GAP + GROUP_PAD * 2 + GROUP_FOOTER_HEIGHT,
    };
}

/**
 * کمترین ارتفاع ردیفی که باکس «در حال تولید/ناموفق» در آن می‌نشیند — زیر این، جزئیات داخل باکس
 * (مدل، پیام، «بیشتر بدانید»، دکمه‌ها) جا نمی‌شود. ردیف خروجی‌های عادی می‌تواند کوتاه‌تر شود.
 */
const STATUS_MIN_ROW_HEIGHT = 230;
const MEDIA_MIN_ROW_HEIGHT = 120;
/** ردیف برای پر کردن عرض حداکثر تا این ارتفاع کشیده می‌شود */
const MAX_ROW_HEIGHT = 380;

/** خروجی تصویری برای بستن ردیف تا این نسبت پهن‌تر می‌شود (object-fit: cover — کمی برش، نه کشیدگی) */
const MAX_MEDIA_WIDEN = 0.35;
/**
 * موبایل (compact): خروجی خیلی عریض (۲:۱ و پهن‌تر — ۲۱:۹، ۳:۱) همیشه تنها در ردیف می‌نشیند؛
 * افقی معمولی (۳:۲، ۱۶:۹) می‌تواند تنها باشد یا کنار یک عمودی/مربع؛ مربع و عمودی دست‌کم دوتایی
 * کنار هم‌اند و اگر جفتی نداشتند نصف عرض را می‌گیرند.
 */
const SOLO_ASPECT = 2;
const SOLO_MIN_ASPECT = 1.5;

/**
 * چیدمان justified برای همهٔ آیتم‌ها (باکس‌های وضعیت + خروجی‌ها) با سه قید:
 * ۱) ترتیب دقیقاً همان ترتیب ساخت است — هیچ آیتمی جابه‌جا نمی‌شود؛
 * ۲) ردیفی که باکس «در حال تولید/ناموفق» دارد از STATUS_MIN_ROW_HEIGHT کوتاه‌تر نمی‌شود (جزئیات کامل)؛
 * ۳) فضای خالی نمی‌ماند: ردیف تا MAX_ROW_HEIGHT کشیده می‌شود و اگر باز عرض پر نشد، خروجی‌های تصویری
 *    همان ردیف تا MAX_MEDIA_WIDEN پهن‌تر می‌شوند (کمی برش). باکس وضعیت همیشه دقیقاً نسبت خودش را دارد.
 * شکست ردیف‌ها مثل justify کردن متن با جستجوی بهینه (DP) روی کل دنباله انتخاب می‌شود: هزینهٔ هر ردیف =
 * فاصلهٔ ارتفاعش از هدف + جریمهٔ سنگین برای کوتاه‌تر از حداقل و برای فضای خالی. پس به‌جای یک باکس
 * تنهای خیلی بلند، مثلاً دو ردیف دوتایی ساخته می‌شود — بدون جابه‌جایی ترتیب.
 */
function justifiedRows(items: LayoutItem[], width: number, compact = false): LayoutCell[][] {
    if (!width || !items.length) return [];
    const { targetHeight: target, maxRowItems, minMediaHeight } = gridDensity(width, compact);
    const aspectOf = (item: LayoutItem) => (item.width > 0 && item.height > 0 ? item.width / item.height : 9 / 16);
    const isStatus = (item: LayoutItem) => item.kind !== 'media';
    const gaps = (row: LayoutItem[]) => (row.length - 1) * TILE_GAP;
    const naturalHeight = (row: LayoutItem[]) => (width - gaps(row)) / row.reduce((sum, item) => sum + aspectOf(item), 0);
    const minFor = (row: LayoutItem[]) => (row.some(isStatus) ? STATUS_MIN_ROW_HEIGHT : minMediaHeight);
    /** موبایل: خروجی خیلی عریض کنار آیتم دیگری ننشیند */
    const crowdsWide = (row: LayoutItem[]) => compact && row.length > 1
        && row.some((item) => !isStatus(item) && aspectOf(item) >= SOLO_ASPECT);
    /** موبایل: باریک‌ترین تایل ردیف از ۸۰٪ یک ستون باریک‌تر نشود (عریض + یک عمودی، نه عریض + دو عمودی لاغر) */
    const minTileWidth = target * 0.8;
    const thinness = (row: LayoutItem[]) => (compact && row.length > 1
        ? Math.max(0, minTileWidth - Math.min(...row.map(aspectOf)) * naturalHeight(row))
        : 0);
    /** موبایل: خروجی غیرعریضِ تنها در ردیف — نصف عرض، نه تمام صفحه */
    const halfSolo = (row: LayoutItem[]) => compact && row.length === 1 && !isStatus(row[0]) && aspectOf(row[0]) < SOLO_MIN_ASPECT;
    const rowHeight = (row: LayoutItem[]) => {
        const natural = Math.min(naturalHeight(row), MAX_ROW_HEIGHT);
        if (halfSolo(row)) return Math.min(natural, ((width - TILE_GAP) / 2) / aspectOf(row[0]));
        // باکس وضعیتِ عمودیِ تنها کل صفحه را نمی‌گیرد: حداکثر نصف ردیف (جای یک آیتم کنارش)
        if (row.length === 1 && isStatus(row[0]) && aspectOf(row[0]) < 1) {
            const halfRowHeight = ((width - TILE_GAP) / 2) / aspectOf(row[0]);
            return Math.min(natural, Math.max(halfRowHeight, STATUS_MIN_ROW_HEIGHT));
        }
        return natural;
    };
    /** عرضی که در ارتفاع سقف‌خورده خالی می‌ماند (پیش از پهن‌کردن خروجی‌ها) */
    const missingWidth = (row: LayoutItem[]) => {
        const height = rowHeight(row);
        return width - gaps(row) - row.reduce((sum, item) => sum + aspectOf(item) * height, 0);
    };
    const widenable = (row: LayoutItem[]) => rowHeight(row) * row
        .filter((item) => !isStatus(item))
        .reduce((sum, item) => sum + aspectOf(item), 0) * MAX_MEDIA_WIDEN;

    const rowCost = (row: LayoutItem[]) => {
        const height = rowHeight(row);
        let cost = (height - target) ** 2;
        const deficit = minFor(row) - naturalHeight(row);
        if (deficit > 0) cost += 1_000_000 + deficit ** 2 * 100;
        if (crowdsWide(row)) cost += 1_000_000;
        const thin = thinness(row);
        if (thin > 0) cost += 1_000_000 + thin ** 2 * 100;
        // ردیفِ فقط باکس وضعیت مجاز است عرض را پر نکند (به‌جای اینکه باکس غول‌پیکر شود)؛
        // پس آیتم عریض بعدی به ردیف بعد می‌رود و باکس را فشرده نمی‌کند
        if (halfSolo(row)) return cost + 1_000_000; // فقط وقتی جفتی برایش نمانده
        const gap = missingWidth(row) - widenable(row);
        if (gap > 0.5 && !row.every(isStatus)) cost += 1_000_000 + gap ** 2 * 100;
        return cost;
    };

    // best[i] = کمترین هزینهٔ چیدن items[0..i)؛ from[i] = شروع ردیف آخر در آن چیدمان
    const count = items.length;
    const best = new Array<number>(count + 1).fill(Infinity);
    const from = new Array<number>(count + 1).fill(0);
    best[0] = 0;
    for (let end = 1; end <= count; end += 1) {
        for (let start = end - 1; start >= Math.max(0, end - maxRowItems); start -= 1) {
            const cost = best[start] + rowCost(items.slice(start, end));
            if (cost < best[end]) {
                best[end] = cost;
                from[end] = start;
            }
        }
    }
    const rows: LayoutItem[][] = [];
    for (let end = count; end > 0; end = from[end]) rows.unshift(items.slice(from[end], end));

    return rows.map((row) => {
        const height = rowHeight(row);
        const missing = Math.max(0, missingWidth(row));
        const mediaBase = row.filter((item) => !isStatus(item)).reduce((sum, item) => sum + aspectOf(item) * height, 0);
        const grow = mediaBase > 0 && !halfSolo(row) ? Math.min(missing / mediaBase, MAX_MEDIA_WIDEN) : 0;
        return row.map((item) => ({
            photo: {
                computedWidth: aspectOf(item) * height * (isStatus(item) ? 1 : 1 + grow),
                computedHeight: height,
            },
            item,
        }));
    });
}

/**
 * قاب جزئیات خروجی: دسکتاپ ModalHelper؛ موبایل پنجرهٔ تمام‌صفحه مثل گالری (نه BottomSheet).
 * Escape و قفل اسکرول پس‌زمینه را effect خود ChatMessagesV2 (detailOpen) دارد.
 */
function DetailShell({
    open,
    windowed,
    onClose,
    title,
    component,
}: {
    open: boolean;
    windowed: boolean;
    onClose: () => void;
    title: string;
    component: ReactNode;
}) {
    if (windowed) {
        if (!open || typeof document === 'undefined') return null;
        return createPortal(
            <div className={styles.detailWindow} role="dialog" aria-modal="true" aria-label={title}>
                {component}
            </div>,
            document.body,
        );
    }
    return (
        <ModalHelper
            open={open}
            onClose={onClose}
            size="lg"
            hideCloseBtn
            sheetTitle={title}
            component={component}
        />
    );
}

/** لوگوی مدل: SVG واقعی مدل (همان چیپ انتخاب مدل در ChatInput) با فالبک حرف اول نام */
function ModelLogo({ name, iconSvg }: { name: string; iconSvg?: string }) {
    const letter = (name || '?').trim().charAt(0).toUpperCase() || '?';
    return (
        <span className={styles.modelLogo} aria-hidden>
            {iconSvg
                ? <span className={styles.modelLogoSvg} dangerouslySetInnerHTML={{ __html: iconSvg }} />
                : letter}
        </span>
    );
}

/**
 * باکس «در حال تولید» با نسبت/اندازه‌ی واقعی درخواست — چکشی که مدام به لوگوی مدل می‌خورد.
 * همه‌ی انیمیشن‌ها فقط transform/opacity هستند تا روی کامپوزیتور اجرا شوند و روی گوشی‌های
 * ضعیف هم هر فریم repaint نشود.
 */
export function ProcessingTile({ turn, iconSvg, style, live, onCheck }: {
    turn: Pick<TurnPreview, 'modelName' | 'mediaKind' | 'aspectLabel'>;
    iconSvg?: string;
    style?: React.CSSProperties;
    /** وضعیت زنده از سوکت (درصد provider، در صف، بررسی، نامشخص) */
    live?: ChatTurnLiveStatus;
    /** بررسی دستی وضعیت از سوکت — فقط وقتی وضعیت نامشخص است نشان داده می‌شود */
    onCheck?: () => void;
}) {
    const { t } = useTranslation('projects');
    const progress = live?.progress != null ? Math.max(0, Math.min(100, live.progress)) : null;
    const liveLabel = live?.state === 'queued' ? t('chat_turn_queued')
        : live?.state === 'checking' ? t('chat_turn_checking')
            : live?.state === 'unknown' ? t('chat_turn_unknown')
                : '';
    const label = (
        turn.mediaKind === 'image' ? t('chat_v2_generating_image', { defaultValue: 'در حال تولید تصویر…' })
            : turn.mediaKind === 'video' ? t('chat_v2_generating_video', { defaultValue: 'در حال تولید ویدیو…' })
                : turn.mediaKind === 'audio' ? t('chat_v2_generating_audio', { defaultValue: 'در حال تولید صدا…' })
                    : t('chat_v2_generating', { defaultValue: 'در حال پردازش…' })
    ).replace(/[.…]+$/u, '');
    // کلمه‌ی آخر و نقطه‌ها در یک span بدون شکست — در تایل باریک نقطه‌ها تنها به خط بعد نمی‌روند
    const lastSpace = label.lastIndexOf(' ');
    const labelHead = lastSpace > 0 ? label.slice(0, lastSpace + 1) : '';
    const labelTail = lastSpace > 0 ? label.slice(lastSpace + 1) : label;

    return (
        <div className={styles.processingTile} style={style} role="status" aria-label={label}>
            <svg className={styles.dashFrame} aria-hidden>
                <rect width="100%" height="100%" rx="17" ry="17" />
            </svg>
            <span className={styles.pendingBody}>
                {turn.aspectLabel ? (
                    <span className={styles.processingRatio} dir="ltr">{turn.aspectLabel}</span>
                ) : null}
                <span className={styles.mineStage} dir="ltr">
                    <span className={styles.mineLogo}>
                        <ModelLogo name={turn.modelName} iconSvg={iconSvg} />
                    </span>
                    <span className={styles.hammer} aria-hidden>
                        <LuHammer size={30} strokeWidth={2.2} />
                    </span>
                    <span className={styles.sparks} aria-hidden><i /><i /><i /></span>
                    <span className={styles.chips} aria-hidden><i /><i /></span>
                </span>
                <span className={styles.pendingText}>
                    <span className={styles.processingModel} dir="auto">{turn.modelName || '…'}</span>
                    <span className={styles.processingLabel}>
                        {labelHead}
                        <span className={styles.labelTail}>
                            {labelTail}
                            <span className={styles.dots} aria-hidden><span /><span /><span /></span>
                        </span>
                    </span>
                    {liveLabel || progress != null ? (
                        <span className={styles.processingLive} dir="auto">
                            {liveLabel}
                            {liveLabel && progress != null ? ' · ' : ''}
                            {progress != null ? <span dir="ltr">{progress}%</span> : null}
                        </span>
                    ) : null}
                    {live?.state === 'unknown' && onCheck ? (
                        <button type="button" className={styles.processingCheck} onClick={onCheck}>
                            <LuRefreshCw size={12} />
                            {t('chat_turn_check')}
                        </button>
                    ) : null}
                </span>
            </span>
            {progress != null ? (
                <span className={styles.processingBar} aria-hidden>
                    <span style={{ transform: `scaleX(${progress / 100})` }} />
                </span>
            ) : null}
        </div>
    );
}

/** نام فایل صوتی برای پخش‌کننده — برچسب عمومی «audio» نام نیست (پخش‌کننده متن پیش‌فرض خودش را دارد) */
function audioTitle(media: TemplatePreviewMedia): string | undefined {
    const label = String(media.label || '').trim();
    return label && label.toLowerCase() !== 'audio' ? label : undefined;
}

/** تامبنیل گرید — عین GalleryPhotoThumb: تصویر فشرده، ویدیو با هاله و duration. */
function ChatV2MediaThumb({ media }: { media: TemplatePreviewMedia }) {
    const isVideo = isVideoMedia(media);
    const isAudio = isAudioMedia(media);
    const originalSrc = mediaOriginalSrc(media);
    const thumbSrc = tileThumbSrc(media);
    const [loaded, setLoaded] = useState(isAudio);
    const [duration, setDuration] = useState(media.durationSeconds || 0);
    const imgRef = useRef<HTMLImageElement>(null);

    useLayoutEffect(() => {
        if (isAudio) {
            setLoaded(true);
            return;
        }
        setLoaded(false);
        const img = imgRef.current;
        if (!img?.complete) return;
        if (img.naturalWidth > 0) setLoaded(true);
    }, [thumbSrc, isAudio, media.url]);

    useEffect(() => {
        setDuration(media.durationSeconds || 0);
        if (!isVideo || (media.durationSeconds && media.durationSeconds > 0) || !originalSrc) {
            return;
        }
        const probe = document.createElement('video');
        probe.preload = 'metadata';
        probe.muted = true;
        probe.playsInline = true;
        probe.src = originalSrc;
        const onMeta = () => {
            if (Number.isFinite(probe.duration) && probe.duration > 0) {
                setDuration(probe.duration);
            }
        };
        probe.addEventListener('loadedmetadata', onMeta);
        return () => {
            probe.removeEventListener('loadedmetadata', onMeta);
            probe.removeAttribute('src');
            probe.load();
        };
    }, [isVideo, originalSrc, media.durationSeconds]);

    return (
        <span className={styles.mediaFill}>
            {!loaded && <span className={styles.ghost} aria-hidden="true" />}

            {isAudio ? (
                // همان کاشی صوتی ورک‌فلو: پخش، موج (نوار جابه‌جایی)، نام و زمان
                <MiniAudioPlayer
                    src={originalSrc}
                    title={audioTitle(media)}
                    variant="tile"
                    className={styles.audioPlayerTile}
                />
            ) : thumbSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    ref={imgRef}
                    src={thumbSrc}
                    alt=""
                    className={`${styles.image} ${loaded ? styles.imageReady : ''}`}
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                    onLoad={() => setLoaded(true)}
                />
            ) : isVideo ? (
                <video
                    src={originalSrc}
                    className={`${styles.image} ${styles.imageReady}`}
                    muted
                    playsInline
                    preload="metadata"
                    onLoadedMetadata={(event) => {
                        const value = event.currentTarget.duration;
                        if (Number.isFinite(value) && value > 0) setDuration(value);
                        setLoaded(true);
                    }}
                    onLoadedData={() => setLoaded(true)}
                />
            ) : null}

            {isVideo ? (
                <div className={styles.videoOverlay} aria-hidden="true">
                    <div className={styles.videoVeil} />
                    <div className={styles.videoMeta}>
                        <LuPlay size={12} fill="currentColor" color="#fff" />
                        <span>{duration > 0 ? formatDuration(duration) : '0:00'}</span>
                    </div>
                </div>
            ) : null}
        </span>
    );
}

/**
 * تصویر مودال جزئیات: اول تامبنیل بزرگ (سریع) نشان داده می‌شود و اصل فایل پشت آن بارگذاری
 * و بعد از کامل شدن جایگزین می‌شود — نیمه‌کاره (خاکستری) دیده نمی‌شود. قاب از فریم اول
 * نسبت خروجی را دارد تا با رسیدن عکس نپرد.
 */
function DetailImage({ media }: { media: TemplatePreviewMedia }) {
    const original = mediaOriginalSrc(media);
    const large = mediaThumbLargeSrc(media);
    const thumb = large && large !== original ? large : '';
    const [loadedSrc, setLoadedSrc] = useState('');
    const ready = !thumb || loadedSrc === original;
    const { width, height } = tileDimensions(media);
    const ratio = width / height;
    return (
        <span
            className={styles.detailImage}
            style={{
                aspectRatio: `${width} / ${height}`,
                width: `min(100%, calc(min(46vh, 420px) * ${ratio}))`,
            }}
        >
            {thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumb} alt="" aria-hidden />
            ) : null}
            {original ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={original}
                    alt={media.label || ''}
                    className={ready ? undefined : styles.detailImageLoading}
                    onLoad={() => setLoadedSrc(original)}
                />
            ) : null}
        </span>
    );
}

type DetailSettingRow = { key: string; label: string; value: string; iconSvg?: string };

type DetailModelInfo = { fields: NodeSettingField[]; iconSvg: string };

/** اسکیمای تنظیمات + آیکون هر مدل — یک‌بار برای هر modelId از API خوانده می‌شود */
const detailSchemaCache = new Map<string, Promise<DetailModelInfo>>();

function loadDetailSchema(modelId: string): Promise<DetailModelInfo> {
    let pending = detailSchemaCache.get(modelId);
    if (!pending) {
        pending = providersApi.getModel(modelId)
            .then((model) => ({ fields: model.settingsSchema || [], iconSvg: String(model.iconSvg || '') }))
            .catch(() => {
                detailSchemaCache.delete(modelId);
                return { fields: [], iconSvg: '' };
            });
        detailSchemaCache.set(modelId, pending);
    }
    return pending;
}

function humanizeSettingKey(key: string): string {
    const spaced = key.replace(/_/g, ' ').replace(/([a-z0-9])([A-Z])/g, '$1 $2').trim();
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * «تنظیمات ساخت» در مودال جزئیات — مدل، تنظیمات همان نوبت (از snapshot پیام کاربر) و مشخصات
 * خروجی. برچسب‌ها و نام گزینه‌ها از اسکیمای مدل می‌آیند؛ کلیدهایی که در اسکیمای مدل نیستند
 * (باقی‌مانده‌ی مدل قبلی در نوبت‌های قدیمی) نشان داده نمی‌شوند.
 */
function DetailSettings({
    settings,
    media,
}: {
    settings: StudioChatSettings | null;
    media: TemplatePreviewMedia;
}) {
    const { t, i18n } = useTranslation('projects');
    const { t: tc } = useTranslation('common');
    const fa = i18n.language === 'fa';
    const modelId = String(settings?.modelId || '').trim();
    const [schemaState, setSchemaState] = useState<{ modelId: string; fields: NodeSettingField[] | null; iconSvg: string }>({
        modelId: '',
        fields: null,
        iconSvg: '',
    });
    const schema = schemaState.modelId === modelId ? schemaState.fields : null;
    const modelIconSvg = schemaState.modelId === modelId ? schemaState.iconSvg : '';

    useEffect(() => {
        if (!modelId) return;
        let cancelled = false;
        void loadDetailSchema(modelId).then((info) => {
            if (!cancelled) setSchemaState({ modelId, fields: info.fields, iconSvg: info.iconSvg });
        });
        return () => { cancelled = true; };
    }, [modelId]);

    const rows = useMemo<DetailSettingRow[]>(() => {
        const out: DetailSettingRow[] = [];
        const modelName = String(settings?.modelName || settings?.model || '').trim();
        if (modelName) out.push({ key: 'model', label: t('chat_v2_setting_model'), value: modelName, iconSvg: modelIconSvg });

        const modelSettings = (settings?.modelSettings || {}) as Record<string, unknown>;
        const formatValue = (field: NodeSettingField | undefined, raw: unknown): string => {
            if (typeof raw === 'boolean') return raw ? tc('yes') : tc('no');
            const value = String(raw);
            const option = field?.options?.find((entry) => entry.value === value);
            return option?.label || value;
        };
        const usable = (raw: unknown) => raw != null && raw !== '' && typeof raw !== 'object';
        if (schema?.length) {
            // ترتیب و برچسب همان اسکیمای مدل
            for (const field of schema) {
                if (!field.key || field.type === 'derived') continue;
                const raw = modelSettings[field.key];
                if (!usable(raw)) continue;
                out.push({
                    key: field.key,
                    label: (fa ? field.labelFa : '') || field.label || humanizeSettingKey(field.key),
                    value: formatValue(field, raw),
                    // آیکون گزینه (نسبت تصویر، کیفیت، صدا…) — همان iconSvg که ادمین برای گزینه گذاشته
                    iconSvg: field.options?.find((entry) => entry.value === String(raw))?.iconSvg,
                });
            }
        } else if (schema) {
            // اسکیما در دسترس نبود — همه‌ی مقادیر ساده با نام خوانا
            for (const [key, raw] of Object.entries(modelSettings)) {
                if (!usable(raw)) continue;
                out.push({ key, label: humanizeSettingKey(key), value: formatValue(undefined, raw) });
            }
        }

        const mode = String(settings?.capabilityMode || '').trim();
        if (mode) out.push({ key: 'mode', label: t('chat_v2_setting_mode'), value: mode });

        if (media.width && media.height) {
            out.push({ key: 'output', label: t('chat_v2_setting_output'), value: `${media.width}×${media.height}` });
        }
        if (media.durationSeconds && media.durationSeconds > 0) {
            out.push({ key: 'duration', label: t('chat_v2_setting_duration'), value: formatDuration(media.durationSeconds) });
        }
        return out;
    }, [settings, schema, modelIconSvg, media, fa, t, tc]);

    if (!rows.length) return null;
    return (
        <div className={styles.detailSettings}>
            <div className={styles.detailRefsHead}>
                <strong>{t('chat_v2_settings_label')}</strong>
            </div>
            {/* چیپ‌های فشرده «برچسب مقدار» — در چند خط می‌شکنند، جای کمی می‌گیرند */}
            <ul className={styles.detailSettingsChips}>
                {rows.map((row) => (
                    <li key={row.key} className={styles.detailSettingsChip} title={`${row.label}: ${row.value}`}>
                        {sanitizeSvg(row.iconSvg) ? (
                            <SvgMarkup svg={row.iconSvg} className={styles.detailSettingsIcon} />
                        ) : null}
                        <span>{row.label}</span>
                        <strong dir="auto">{row.value}</strong>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default function ChatMessagesV2() {
    const { t } = useTranslation('projects');
    const { t: tc } = useTranslation('common');
    const { t: te } = useTranslation('errors');
    const { t: tm } = useTranslation('marketplace');
    const {
        chat,
        settings,
        attachments,
        addAttachments,
        setPromptDocument,
        setPromptText,
        retryingMessageId,
        editingMessageId,
        retryFailedTurn,
        startEditFailedTurn,
        turnStatus,
        checkTurnStatus,
        deleteGeneratedOutput,
        deleteFailedTurn,
    } = useChatSession();

    const messages = useMemo(() => chat?.messages || [], [chat]);

    // چت متنی: نمای گالری معنا ندارد — همان ترنسکریپت v1 رندر می‌شود
    // (Markdown کد/جدول هم همان‌جا با ChatMarkdown رندر می‌شود)
    const isTextChat = chat?.mediaKind === 'text';

    const wrapRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState(0);
    const isMobile = useMobileViewport();
    const [detail, setDetail] = useState<GalleryTile | null>(null);
    // زوم تایل — همان Lightbox نسخه v1 (کلیک: fit ↔ رزولوشن کامل، درگ: جابه‌جایی)
    const [zoomMedia, setZoomMedia] = useState<TemplatePreviewMedia | null>(null);
    // پخش ویدیو/صوتِ رسانه‌های ورودی مودال جزئیات (تصویرها با همان Lightbox زوم می‌شوند)
    const [viewerMedia, setViewerMedia] = useState<TemplatePreviewMedia | null>(null);
    // حذف خروجی تولیدشده — تایلی که منتظر تأیید کاربر است
    const [deleteTarget, setDeleteTarget] = useState<GalleryTile | null>(null);
    // منوی «بیشتر» تایل (دانلود / حذف) — تایل و دکمه‌ای که popup کنارش باز می‌شود
    const [tileMenu, setTileMenu] = useState<{ tile: GalleryTile; anchor: HTMLElement } | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState('');
    // حذف نوبت ناموفق — همان پنجره تأیید (حالت failed)
    const [failedDeleteTarget, setFailedDeleteTarget] = useState<TurnPreview | null>(null);
    // پنجره «بیشتر بدانید» نوبت ناموفق
    const [errorDetailsTurn, setErrorDetailsTurn] = useState<TurnPreview | null>(null);
    // ورودی‌های همان نوبت (پیوست‌ها + منشن‌ها از snapshot پیام کاربر) — برای بررسی فایل‌های خراب
    const errorDetailsInputs = useMemo<TemplatePreviewMedia[]>(() => {
        if (!errorDetailsTurn) return [];
        const index = messages.findIndex((entry) => entry.messageId === errorDetailsTurn.key);
        const user = index > 0 && messages[index - 1].role === 'user' ? messages[index - 1] : null;
        if (!user) return [];
        const snapshot = user.requestSnapshot;
        const attached = (snapshot?.attachments?.length ? snapshot.attachments : user.attachments) || [];
        const mentioned = ((snapshot?.mentionRefs?.length ? snapshot.mentionRefs : user.mentionRefs) || []) as TemplatePreviewMedia[];
        const seen = new Set<string>();
        return [...attached, ...mentioned].filter((media) => {
            const url = String(media?.url || '');
            if (!url || seen.has(url)) return false;
            seen.add(url);
            return true;
        });
    }, [errorDetailsTurn, messages]);
    const openDeleteConfirm = (tile: GalleryTile) => {
        setDeleteError('');
        setFailedDeleteTarget(null);
        setDeleteTarget(tile);
    };
    const openFailedDeleteConfirm = (turn: TurnPreview) => {
        setDeleteError('');
        setDeleteTarget(null);
        setFailedDeleteTarget(turn);
    };
    const closeDeleteConfirm = () => {
        if (deleting) return;
        setDeleteTarget(null);
        setFailedDeleteTarget(null);
    };
    const nestedViewerOpen = useRef(false);
    useEffect(() => {
        nestedViewerOpen.current = Boolean(zoomMedia || viewerMedia || deleteTarget || failedDeleteTarget || errorDetailsTurn);
    }, [zoomMedia, viewerMedia, deleteTarget, failedDeleteTarget, errorDetailsTurn]);

    const confirmFailedDelete = async () => {
        const turn = failedDeleteTarget;
        if (!turn?.key || deleting) return;
        setDeleting(true);
        setDeleteError('');
        try {
            await deleteFailedTurn(turn.key);
            setFailedDeleteTarget(null);
        } catch {
            setDeleteError(t('chat_delete_output_failed'));
        } finally {
            setDeleting(false);
        }
    };

    const confirmDelete = async () => {
        const target = deleteTarget;
        if (!target?.message.messageId || deleting) return;
        setDeleting(true);
        setDeleteError('');
        try {
            const result = await deleteGeneratedOutput(String(target.message.messageId), String(target.media.url || ''));
            if (detail?.key === target.key) setDetail(null);
            setDeleteTarget(null);
            if (result && !result.storageDeleted) SuccessToaster({ message: t('chat_delete_output_kept') });
        } catch {
            // خطا داخل همان پنجره — کاربر می‌تواند دوباره امتحان کند یا انصراف بدهد
            setDeleteError(t('chat_delete_output_failed'));
        } finally {
            setDeleting(false);
        }
    };
    // انتخاب‌های مودال: خروجی اصلی + هر یک از ورودی‌ها — فقط با دکمه «استفاده به‌عنوان مرجع»
    // به chatinput منتقل می‌شوند (بدون هیچ انتقال خودکار)
    const [selectedMedia, setSelectedMedia] = useState<TemplatePreviewMedia[]>([]);
    // «افزودن به قالب» — همان state صفحه‌ی ساخت قالب (پنل «قالب» کنار چت)
    const templateMedia = useTemplateCreateStore((state) => state.previewMedia);
    const toggleTemplateMedia = useTemplateCreateStore((state) => state.toggleMedia);
    const addTemplateMedia = useTemplateCreateStore((state) => state.addMedia);
    const addTemplatePrompt = useTemplateCreateStore((state) => state.addPrompt);
    const addTemplateModel = useTemplateCreateStore((state) => state.addModelId);
    const [addTarget, setAddTarget] = useState<'chat' | 'template'>('chat');
    const detailFigureRef = useRef<HTMLElement>(null);
    const [promptOpen, setPromptOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    // منوی «افزودن به چت» پایین مودال جزئیات
    const [addMenuOpen, setAddMenuOpen] = useState(false);
    const addMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!addMenuOpen) return;
        const onDown = (event: PointerEvent) => {
            if (addMenuRef.current?.contains(event.target as Node)) return;
            setAddMenuOpen(false);
        };
        document.addEventListener('pointerdown', onDown, true);
        return () => document.removeEventListener('pointerdown', onDown, true);
    }, [addMenuOpen]);

    const currentModelName = String(settings.modelName || settings.model || '');

    // لوگوی مدل‌ها — یک‌بار از کاتالوگ مدل‌ها (همان منبع iconSvg چیپ انتخاب مدل در ChatInput)
    const [modelIcons, setModelIcons] = useState<Map<string, string>>(() => new Map());
    useEffect(() => {
        let cancelled = false;
        loadChatModelIcons()
            .then((map) => {
                if (!cancelled) setModelIcons(map);
            })
            .catch(() => undefined);
        return () => { cancelled = true; };
    }, []);

    const modelIconFor = (turn: TurnPreview): string => {
        if (turn.modelId) {
            const byId = modelIcons.get(`id:${turn.modelId}`);
            if (byId) return byId;
        }
        return modelIcons.get(`name:${turn.modelName.toLowerCase()}`) || '';
    };

    // عرض کانتینر برای چیدمان justified — وقتی چت متنی است گرید رندر نمی‌شود؛
    // با بازگشت به نمای رسانه‌ای باید اندازه‌گیری دوباره اجرا شود
    const gridRendered = !isTextChat && messages.length > 0;
    useEffect(() => {
        if (!gridRendered) return;
        const node = wrapRef.current;
        if (!node) return;
        const sync = () => setContainerWidth(node.getBoundingClientRect().width);
        sync();
        const observer = new ResizeObserver(sync);
        observer.observe(node);
        return () => observer.disconnect();
    }, [gridRendered]);

    // مودال جزئیات: بستن با Esc (هم‌راستا با hint «esc» در نوار بالا) + قفل اسکرول پس‌زمینه
    const detailOpen = Boolean(detail);
    useEffect(() => {
        if (!detailOpen) return;
        const onKey = (event: KeyboardEvent) => {
            // Esc لایه بالایی (زوم/پخش‌کننده ورودی) را می‌بندد، نه مودال جزئیات
            if (event.key === 'Escape' && !nestedViewerOpen.current) setDetail(null);
        };
        window.addEventListener('keydown', onKey);
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = previousOverflow;
        };
    }, [detailOpen]);

    // با عوض شدن چت، انتخاب مرجع‌ها ریست می‌شود — الگوی adjust-state-during-render
    const chatId = String(chat?._id || '');
    const [lastChatId, setLastChatId] = useState(chatId);
    if (lastChatId !== chatId) {
        setLastChatId(chatId);
        setSelectedMedia([]);
        setDetail(null);
    }

    // ── ساخت داده‌های نمایش ────────────────────────────────────────────────
    const { tiles, pendingTurns } = useMemo(() => {
        const tilesOut: GalleryTile[] = [];
        const turnsOut: TurnPreview[] = [];
        let lastUser: StudioChatMessage | null = null;

        messages.forEach((message, index) => {
            if (message.role === 'user') {
                lastUser = message;
            }
            const next = messages[index + 1];
            if (message.role === 'user' && next?.role === 'assistant' && next.status === 'processing') {
                const snapshotSettings = turnSettings(message, next);
                const mediaKind = String(message.requestSnapshot?.mediaKind || chat?.mediaKind || 'image');
                const model = turnModelInfo(snapshotSettings, currentModelName);
                const shape = turnShape(snapshotSettings, mediaKind);
                turnsOut.push({
                    key: next.messageId || `processing-${index}`,
                    kind: 'processing',
                    prompt: message.content || '',
                    modelName: model.name,
                    modelId: model.id,
                    mediaKind,
                    aspect: { width: shape.width, height: shape.height },
                    aspectLabel: shape.label,
                    order: index,
                });
                return;
            }
            if (message.role === 'assistant' && message.status === 'failed') {
                // تنظیمات نوبت ناموفق هم روی پیام «کاربرِ» همان نوبت است
                const userMessage = messages[index - 1]?.role === 'user' ? messages[index - 1] : lastUser;
                const snapshotSettings = turnSettings(userMessage, message);
                const mediaKind = String(userMessage?.requestSnapshot?.mediaKind || chat?.mediaKind || 'image');
                const model = turnModelInfo(snapshotSettings, currentModelName);
                const shape = turnShape(snapshotSettings, mediaKind);
                turnsOut.push({
                    key: message.messageId || `failed-${index}`,
                    kind: 'failed',
                    prompt: String(userMessage?.content || userMessage?.requestSnapshot?.promptText || '').trim(),
                    modelName: model.name,
                    modelId: model.id,
                    mediaKind,
                    aspect: { width: shape.width, height: shape.height },
                    aspectLabel: shape.label,
                    errorMessage: message.errorMessage || '',
                    hasSnapshot: Boolean(userMessage?.requestSnapshot),
                    retryable: Boolean(message.messageId),
                    order: index,
                });
                return;
            }
            if (message.role === 'assistant' && message.status === 'complete') {
                for (const media of message.attachments || []) {
                    const { width, height } = tileDimensions(media);
                    tilesOut.push({
                        key: `${message.messageId || index}-${mediaKey(media)}`,
                        turnKey: String(message.messageId || `turn-${index}`),
                        media,
                        message,
                        userMessage: lastUser || undefined,
                        width,
                        height,
                        order: index,
                    });
                }
            }
        });
        return { tiles: tilesOut, pendingTurns: turnsOut };
    }, [messages, currentModelName, chat?.mediaKind]);

    // چیدمان justified بدون فضای خالی: تازه‌ترین اول. باکس‌های «در حال تولید/ناموفق» اول صف با
    // نسبت واقعی درخواست (فالبک ۹:۱۶)؛ ردیفشان هیچ‌وقت از STATUS_MIN_ROW_HEIGHT کوتاه‌تر نمی‌شود.
    // هر درخواستِ چندخروجی (مثلاً n=3) یک باکس گروه جدا در خط خودش است؛ خروجی‌های تکی و
    // باکس‌های در حال تولید بین باکس‌ها همان ردیف‌های justified معمولی را می‌سازند.
    const blocks = useMemo<GridBlock[]>(() => {
        if (!containerWidth) return [];
        const mediaItem = (tile: GalleryTile): LayoutItem => ({
            id: tile.key,
            kind: 'media',
            width: tile.width,
            height: tile.height,
            tile,
        });
        const statusItem = (turn: TurnPreview): LayoutItem => ({
            id: `${turn.kind}-${turn.key}`,
            kind: turn.kind,
            width: turn.aspect.width,
            height: turn.aspect.height,
            turn,
        });
        // خروجی‌های هر نوبت کنار هم و به ترتیب خودشان
        const outputTurns: GalleryTile[][] = [];
        for (const tile of tiles) {
            const last = outputTurns[outputTurns.length - 1];
            if (last && last[0].turnKey === tile.turnKey) last.push(tile);
            else outputTurns.push([tile]);
        }
        // همهٔ نوبت‌ها (خروجی، در حال تولید، ناموفق) دقیقاً به ترتیب ساخت، تازه‌ترین اول — بدون جابه‌جایی
        const sequence: Array<{ order: number; status?: TurnPreview; outputs?: GalleryTile[] }> = [
            ...pendingTurns.map((turn) => ({ order: turn.order, status: turn })),
            ...outputTurns.map((outputs) => ({ order: outputs[0].order, outputs })),
        ].sort((left, right) => right.order - left.order);

        const out: GridBlock[] = [];
        let buffer: LayoutItem[] = [];
        const flush = () => {
            const rows = justifiedRows(buffer, containerWidth, isMobile);
            if (rows.length) out.push({ kind: 'rows', key: `rows-${out.length}`, rows });
            buffer = [];
        };
        for (const entry of sequence) {
            if (entry.status) {
                buffer.push(statusItem(entry.status));
            } else if (entry.outputs && entry.outputs.length < 2) {
                buffer.push(...entry.outputs.map(mediaItem));
            } else if (entry.outputs) {
                flush();
                out.push(groupGridBlock(entry.outputs, containerWidth, isMobile));
            }
        }
        flush();
        return out;
    }, [tiles, pendingTurns, containerWidth, isMobile]);

    // حجم فایل اصلی هر خروجی — کنار هزینه در بج تایل
    const sizedTiles = useMemo(
        () => tiles.map((tile) => ({ url: mediaOriginalSrc(tile.media), sizeBytes: tile.media.sizeBytes })),
        [tiles],
    );
    const fileSizes = useMediaFileSizes(sizedTiles);

    // باز کردن مودال: هیچ‌چیز از پیش انتخاب نیست — کاربر خودش انتخاب می‌کند یا از منوی افزودن
    const openDetail = (tile: GalleryTile) => {
        setDetail(tile);
        setViewerMedia(null);
        setSelectedMedia([]);
        setPromptOpen(false);
        setCopied(false);
        setAddMenuOpen(false);
    };

    // اکشن سریع hover تایل — هم‌الگوی v1: افزودن مستقیم به chatinput
    const quickAddReference = (media: TemplatePreviewMedia) => {
        addAttachments([{
            ...media,
            type: isVideoMedia(media) ? 'video' as const : isAudioMedia(media) ? 'audio' as const : 'image' as const,
            source: media.source || 'generated',
        }]);
    };

    const isMediaAttached = (media: TemplatePreviewMedia) => (
        attachments.some((item) => isSameChatMedia(item, media))
    );

    const isMediaSelected = (media: TemplatePreviewMedia) => (
        selectedMedia.some((item) => mediaKey(item) === mediaKey(media))
    );

    const toggleMediaSelection = (media: TemplatePreviewMedia) => {
        const key = mediaKey(media);
        setSelectedMedia((prev) => (
            prev.some((item) => mediaKey(item) === key)
                ? prev.filter((item) => mediaKey(item) !== key)
                : [...prev, media]
        ));
    };

    // رسانه‌هایی که کاربر در مودال تیک زده — از منوی «افزودن به چت»
    const sendSelectedToComposer = () => {
        if (!selectedMedia.length) return;
        addAttachments(selectedMedia.map((media) => ({
            ...media,
            type: isVideoMedia(media) ? 'video' as const : isAudioMedia(media) ? 'audio' as const : 'image' as const,
            source: media.source || 'generated',
        })));
        setAddMenuOpen(false);
        setSelectedMedia([]);
        setDetail(null);
    };

    const downloadDetailMedia = () => {
        if (!detail) return;
        downloadOriginalMedia(mediaOriginalSrc(detail.media), detail.media.label);
    };

    const copyPrompt = async (value: string) => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
        } catch {
            /* clipboard unavailable */
        }
    };

    /**
     * پرامپت همان نوبت با منشن‌هایش در کادر (جایگزین متن فعلی). منشن‌ها به پیوست‌هایی که
     * در کادر هست وصل می‌شوند؛ فایلی که نیست، چیپش قرمز می‌ماند تا کاربر ببیند.
     */
    const restorePrompt = (
        value: string,
        mentions: StudioMediaMention[],
        composerAttachments: TemplatePreviewMedia[],
    ) => {
        if (!value.trim()) return;
        const linked = relinkMentionsToAttachments(value, mentions, composerAttachments);
        setPromptDocument(linked.promptText, linked.mentions);
        // setPromptDocument فقط snapshot را عوض می‌کند؛ کادر از promptText رندر می‌شود
        setPromptText(linked.promptText);
    };

    const toComposerMedia = (media: TemplatePreviewMedia): TemplatePreviewMedia => ({
        ...media,
        type: isVideoMedia(media) ? 'video' as const : isAudioMedia(media) ? 'audio' as const : 'image' as const,
        source: media.source || 'generated',
    });

    if (!messages.length) return null;
    if (isTextChat) return <ChatMessages />;

    // پرامپت و مرجع‌های هر نوبت روی پیام «کاربر» ذخیره می‌شوند (assistant فقط
    // خروجی دارد) — مثل v1 که turn از جفت user/assistant ساخته می‌شود.
    const turnUser = detail?.userMessage;
    const detailPrompt = detail
        ? String(
            turnUser?.content
            || turnUser?.requestSnapshot?.promptText
            || detail.message.content
            || '',
        ).trim()
        : '';
    const snapshotRefs = turnUser?.requestSnapshot;
    // آرایه خالی truthy است — فالبک فقط وقتی معنا دارد که لیست واقعا خالی/ناموجود باشد
    const detailPromptMentions = (
        turnUser?.mentionRefs?.length ? turnUser.mentionRefs
            : turnUser?.mentions?.length ? turnUser.mentions
                : snapshotRefs?.mentionRefs?.length ? snapshotRefs.mentionRefs
                    : []
    );
    // ورودی‌های همان نوبت = منشن‌ها + پیوست‌ها؛ dedupe با توکن هویتی تا یک فایل که هم
    // منشن شده و هم ضمیمه است، دوبار نشان داده نشود
    const detailRefs: TemplatePreviewMedia[] = detail
        ? dedupeMedia([
            ...((turnUser?.mentionRefs?.length ? turnUser.mentionRefs
                : turnUser?.mentions?.length ? turnUser.mentions
                    : snapshotRefs?.mentionRefs) || []) as TemplatePreviewMedia[],
            ...((snapshotRefs?.attachments?.length ? snapshotRefs.attachments : turnUser?.attachments) || []),
        ]).filter((item) => item && (item.url || item.fileId || item.fileKey || item.thumbnailUrl))
        : [];
    const detailSelectedCount = selectedMedia.length;
    const canExpandPrompt = detailPrompt.length > 160;

    // ورودی‌های این نوبت به‌شکل پیوست کادر: پیوست‌های همان پیام + فایل‌هایی که فقط منشن شده‌اند
    // (با همان شناسه‌ها تا توکن‌های پرامپت به آن‌ها وصل بمانند)
    const turnAttachments = (snapshotRefs?.attachments?.length ? snapshotRefs.attachments : turnUser?.attachments) || [];
    const inputAttachments = mergeChatAttachments(
        turnAttachments.map(toComposerMedia),
        detailPromptMentions.map((mention) => toComposerMedia(mentionToAttachment(mention))),
    ).filter((item) => item.url || item.fileId || item.fileKey);

    const finishAdd = () => {
        setAddMenuOpen(false);
        setSelectedMedia([]);
        setDetail(null);
    };
    // مقصد «قالب»: همان موارد به قالب در حال ساخت؛ جزئیات باز می‌ماند تا کاربر ادامه دهد
    const detailModelId = String(turnSettings(detail?.userMessage, detail?.message)?.modelId || '');
    const toTemplate = (media: TemplatePreviewMedia[], prompt?: string) => {
        const visual = media.filter((item) => !isAudioMedia(item));
        if (visual.length) addTemplateMedia(visual);
        if (prompt) addTemplatePrompt(prompt);
        addTemplateModel(detailModelId);
        flyToTemplateTab(detailFigureRef.current, tileThumbSrc(visual[0] || detail?.media || ({} as TemplatePreviewMedia)));
        setAddMenuOpen(false);
        setSelectedMedia([]);
    };
    const addPromptToTemplate = () => {
        addTemplatePrompt(detailPrompt);
        addTemplateModel(detailModelId);
    };
    /** «دوباره بساز»: پرامپت با منشن‌ها + همه رسانه‌های ورودی همان نوبت */
    const addAllInputs = () => {
        if (addTarget === 'template') {
            toTemplate(inputAttachments, detailPrompt);
            return;
        }
        addAttachments(inputAttachments);
        restorePrompt(detailPrompt, detailPromptMentions, mergeChatAttachments(attachments, inputAttachments));
        finishAdd();
    };
    const addPromptOnly = () => {
        if (addTarget === 'template') {
            toTemplate([], detailPrompt);
            return;
        }
        restorePrompt(detailPrompt, detailPromptMentions, attachments);
        finishAdd();
    };
    const addInputMedia = () => {
        if (addTarget === 'template') {
            toTemplate(inputAttachments);
            return;
        }
        addAttachments(inputAttachments);
        finishAdd();
    };
    const addOutput = () => {
        if (addTarget === 'template') {
            if (detail) toTemplate([detail.media]);
            return;
        }
        if (detail) addAttachments([toComposerMedia(detail.media)]);
        finishAdd();
    };
    const inputThumbs = inputAttachments
        .filter((media) => !isAudioMedia(media))
        .slice(0, 3)
        .map((media) => mediaThumbSrc(media) || mediaThumbLargeSrc(media) || mediaOriginalSrc(media))
        .filter(Boolean);
    const allInputsHint = [
        detailPrompt ? t('chat_v2_prompt_label', { defaultValue: 'پرامپت' }) : '',
        inputAttachments.length ? t('chat_v2_n_media', { count: inputAttachments.length }) : '',
    ].filter(Boolean).join(' + ');

    /**
     * باکس یک درخواست چندخروجی — خروجی‌ها در گرید هم‌اندازه و زیرشان یک نوار: تعداد خروجی و
     * هزینه کل درخواست • حجم کل. هزینه روی پیام assistant مال کل اجراست، پس فقط یک‌بار می‌آید.
     */
    const renderGroup = (block: GroupBlock) => {
        const message = block.tiles[0].message;
        const count = block.tiles.length;
        const totalBytes = block.tiles.reduce(
            (sum, tile) => sum + (fileSizes.get(mediaOriginalSrc(tile.media)) || 0),
            0,
        );
        const costText = tileCostLabel(message.cost, message.totalCost);
        const sizeText = formatFileSize(totalBytes);
        const label = t('chat_v2_group_label', { count, defaultValue: '{{count}} خروجی از یک درخواست' });
        return (
            <div
                key={block.key}
                className={styles.groupBox}
                role="group"
                aria-label={label}
                style={{ width: `${block.width}px`, height: `${block.height}px` }}
            >
                <div
                    className={styles.groupGrid}
                    style={{
                        gridTemplateColumns: `repeat(${block.cols}, ${block.cellWidth}px)`,
                        gridAutoRows: `${block.cellHeight}px`,
                    }}
                >
                    {block.tiles.map((tile) => renderCell(
                        {
                            photo: { computedWidth: block.cellWidth, computedHeight: block.cellHeight },
                            item: { id: tile.key, kind: 'media', width: tile.width, height: tile.height, tile },
                        },
                        true,
                    ))}
                </div>
                <div className={styles.groupFooter}>
                    <span className={styles.groupCount}>
                        <LuImages size={13} aria-hidden />
                        <span dir="auto">{label}</span>
                    </span>
                    {costText || sizeText ? (
                        <span className={styles.groupCost} dir="ltr">
                            {costText ? <strong>{costText}</strong> : null}
                            {costText && sizeText ? <span aria-hidden> • </span> : null}
                            {sizeText ? <span className={styles.groupSize}>{sizeText}</span> : null}
                        </span>
                    ) : null}
                </div>
            </div>
        );
    };

    /** یک خانه گرید — باکس در حال تولید، نوبت ناموفق یا تایل خروجی (داخل ردیف یا باکس گروه) */
    const renderCell = ({ photo, item }: LayoutCell, inGroup = false) => {
        const boxStyle = {
            width: `${photo.computedWidth}px`,
            height: `${photo.computedHeight}px`,
            minWidth: 0,
            minHeight: 0,
            flex: '0 0 auto',
        };

        // باکس «در حال تولید» — داخل همان گرید، اول صف
        if (item.kind === 'processing' && item.turn) {
            return (
                <ProcessingTile
                    key={item.id}
                    turn={item.turn}
                    iconSvg={modelIconFor(item.turn)}
                    live={turnStatus[item.turn.key]}
                    onCheck={() => void checkTurnStatus()}
                    style={boxStyle}
                />
            );
        }

        // نوبت ناموفق — خطا داخل همان تایلِ پردازش نشان داده می‌شود (نه زیر عکس‌ها)
        if (item.kind === 'failed' && item.turn) {
            const turn = item.turn;
            return (
                <div
                    className={styles.failedTile}
                    role="alert"
                    key={item.id}
                    style={boxStyle}
                    title={turn.prompt || undefined}
                >
                    <svg className={styles.dashFrame} aria-hidden>
                        <rect width="100%" height="100%" rx="17" ry="17" />
                    </svg>
                    <span className={styles.pendingBody}>
                        {turn.aspectLabel ? (
                            <span className={styles.processingRatio} dir="ltr">{turn.aspectLabel}</span>
                        ) : null}
                        <span className={styles.failedIcon} aria-hidden>
                            <LuTriangleAlert size={17} />
                        </span>
                        <span className={styles.pendingText}>
                            <span className={styles.processingModel} dir="auto">{turn.modelName || '…'}</span>
                            {/* فقط پیام هوشتون — متن خام ارائه‌دهنده در پایش خطا ثبت شده است */}
                            <HoshetonError error={turn.errorMessage} kind="generation">
                                {(e) => (
                                    <span className={styles.failedMessage} dir="auto" title={e.message}>
                                        {e.message}
                                    </span>
                                )}
                            </HoshetonError>
                            {/* توضیح کامل مشکل و راه‌حل در پنجره جدا */}
                            <button
                                type="button"
                                className={styles.failedReadMore}
                                onClick={() => setErrorDetailsTurn(turn)}
                            >
                                {te('details.read_more')}
                            </button>
                        </span>
                        {turn.retryable ? (
                            <span className={styles.failedActions}>
                                <button
                                    type="button"
                                    className={styles.failedRetry}
                                    disabled={Boolean(retryingMessageId) || Boolean(editingMessageId)}
                                    onClick={() => void retryFailedTurn(turn.key)}
                                    title={t('chat_retry')}
                                >
                                    <LuRefreshCw className={retryingMessageId === turn.key ? styles.spinning : ''} size={13} />
                                </button>
                                {turn.hasSnapshot ? (
                                    <button
                                        type="button"
                                        disabled={Boolean(retryingMessageId) || Boolean(editingMessageId)}
                                        onClick={() => startEditFailedTurn(turn.key)}
                                        title={t('chat_edit')}
                                    >
                                        <LuPencil size={13} />
                                    </button>
                                ) : null}
                                {/* حذف نوبت ناموفق از تاریخچه — با تأیید، مثل حذف خروجی */}
                                <button
                                    type="button"
                                    className={styles.failedDelete}
                                    disabled={Boolean(retryingMessageId) || Boolean(editingMessageId)}
                                    onClick={() => openFailedDeleteConfirm(turn)}
                                    title={t('chat_delete_turn')}
                                    aria-label={t('chat_delete_turn')}
                                >
                                    <LuTrash2 size={13} />
                                </button>
                            </span>
                        ) : null}
                    </span>
                </div>
            );
        }

        const tile = item.tile!;
        // داخل باکس گروه هزینه/حجم فقط یک‌بار در نوار زیر گرید می‌آید، نه روی هر تایل
        const costLabel = inGroup ? '' : [
            isTextChat ? '' : tileCostLabel(tile.message.cost, tile.message.totalCost),
            formatFileSize(fileSizes.get(mediaOriginalSrc(tile.media)) || 0),
        ].filter(Boolean).join(' • ');
        // تایل باریک: دکمه‌ها روی بج می‌افتند → ستونی سمت چپ (پایین به بالا)
        const badgeWidth = estimateBadgeWidth(costLabel);
        const stackActions = photo.computedWidth < tileActionsWidth()
            + badgeWidth + 14;
        // حتی ستون تکی (۶ + ۲۴px) هم به بج می‌خورد → ستون به بالا-چپ می‌رود
        const actionsOnTop = stackActions && photo.computedWidth < 6 + 24 + 8 + badgeWidth;
        const attached = isMediaAttached(tile.media);
        const tileFrame = (
            <BadgedImage
                className={styles.tileFrame}
                compact
                showFavorite={false}
                showBadgeText={Boolean(costLabel)}
                badgeText={costLabel || undefined}
                width={photo.computedWidth}
                height={photo.computedHeight}
                style={{ width: '100%', height: '100%' }}
            >
                <ChatV2MediaThumb media={tile.media} />
            </BadgedImage>
        );
        return (
            <div className={styles.tileWrap} key={tile.key} style={boxStyle}>
                {isAudioMedia(tile.media) ? (
                    // کاشی صوتی دکمه پخش و موج خودش را دارد — دکمه داخل دکمه مجاز نیست
                    <div
                        role="button"
                        tabIndex={0}
                        className={`${styles.tile} ${styles.tileAudio}`}
                        onClick={() => openDetail(tile)}
                        onKeyDown={(event) => {
                            if (event.target !== event.currentTarget) return;
                            if (event.key !== 'Enter' && event.key !== ' ') return;
                            event.preventDefault();
                            openDetail(tile);
                        }}
                        aria-label={t('preview')}
                    >
                        {tileFrame}
                    </div>
                ) : (
                    <button
                        type="button"
                        className={styles.tile}
                        onClick={() => openDetail(tile)}
                        aria-label={t('preview')}
                    >
                        {tileFrame}
                    </button>
                )}

                {/* منوی «بیشتر» — گوشه بالا-راست تایل (مقابل بج هزینه پایین-راست)؛
                    دانلود سایز اصلی و حذف خروجی داخل آن. دسکتاپ با hover، موبایل همیشه نمایان */}
                <button
                    type="button"
                    className={`${styles.tileDownload} ${tileMenu?.tile.key === tile.key ? styles.tileMoreOpen : ''}`}
                    title={tc('options')}
                    aria-label={tc('options')}
                    aria-haspopup="menu"
                    aria-expanded={tileMenu?.tile.key === tile.key}
                    // وقتی باز است کلیک دوباره فقط ببندد (کلیک بیرون popup آن را دوباره باز نکند)
                    onPointerDown={(event) => { if (tileMenu) event.stopPropagation(); }}
                    onClick={(event) => {
                        const anchor = event.currentTarget;
                        setTileMenu((current) => (current?.tile.key === tile.key ? null : { tile, anchor }));
                    }}
                >
                    <LuEllipsis size={14} />
                </button>

                {/* زوم به سبک v1 — پرده تیره + آیکون دایره‌ای وسط تصویر */}
                {!isVideoMedia(tile.media) && !isAudioMedia(tile.media) ? (
                    <button
                        type="button"
                        className={styles.tileZoom}
                        title={t('view_image')}
                        aria-label={t('view_image')}
                        onClick={() => setZoomMedia(tile.media)}
                    >
                        <span className={styles.tileZoomIcon} aria-hidden="true">
                            <LuExpand size={18} />
                        </span>
                    </button>
                ) : null}

                {/* اکشن‌های hover — ارجاع سریع (v1) و پیش‌نمایش (مودال جزئیات)؛
                    ردیف فیزیکی سمت چپ، مقابل بج هزینه. موبایل: همه داخل منوی «بیشتر» */}
                {isMobile ? null : (
                    <div className={`${styles.tileActions} ${stackActions ? styles.tileActionsStacked : ''} ${actionsOnTop ? styles.tileActionsTop : ''} ${actionsOnTop && isVideoMedia(tile.media) ? styles.tileActionsTopVideo : ''}`}>
                        <button
                            type="button"
                            className={styles.tileAction}
                            disabled={attached}
                            title={t('use_as_reference')}
                            aria-label={t('use_as_reference')}
                            onClick={() => quickAddReference(tile.media)}
                        >
                            <MdAdd size={15} />
                        </button>
                        {isAudioMedia(tile.media) ? null : (() => {
                            const inTemplate = isTileInTemplate(tile);
                            const label = templateToggleLabel(inTemplate);
                            return (
                                <button
                                    type="button"
                                    className={`${styles.tileAction} ${inTemplate ? styles.tileActionOn : ''}`}
                                    aria-pressed={inTemplate}
                                    title={label}
                                    aria-label={label}
                                    onClick={(event) => toggleTileTemplate(tile, event.currentTarget)}
                                >
                                    <TbTemplate size={15} />
                                </button>
                            );
                        })()}
                        <button
                            type="button"
                            className={styles.tileAction}
                            title={t('preview')}
                            aria-label={t('preview')}
                            onClick={() => openDetail(tile)}
                        >
                            <TbInfoSquareRounded size={14} />
                        </button>
                    </div>
                )}
            </div>
        );
    };

    const isTileInTemplate = (tile: GalleryTile) => templateMedia
        .some((item) => templateMediaKey(item) === templateMediaKey(tile.media));
    const templateToggleLabel = (inTemplate: boolean) => (inTemplate
        ? t('template_draft_remove', { defaultValue: 'حذف از قالب' })
        : t('template_draft_add', { defaultValue: 'افزودن به قالب' }));
    /** افزودن/حذف خروجی از پیش‌نویس قالب — انیمیشن پرواز از خود تایل به تب «قالب» */
    const toggleTileTemplate = (tile: GalleryTile, source: Element | null) => {
        if (!isTileInTemplate(tile)) {
            addTemplateModel(String(turnSettings(tile.userMessage, tile.message)?.modelId || ''));
            flyToTemplateTab(source?.closest(`.${styles.tileWrap}`) ?? null, tileThumbSrc(tile.media));
        }
        toggleTemplateMedia(tile.media);
    };

    return (
        <div className={styles.galleryThread}>
            <div className={styles.grid} ref={wrapRef}>
                {blocks.map((block) => (block.kind === 'rows' ? (
                    <Fragment key={block.key}>
                        {block.rows.map((row, rowIndex) => (
                            <div className={styles.row} key={`${block.key}-${rowIndex}`}>
                                {row.map((cell) => renderCell(cell))}
                            </div>
                        ))}
                    </Fragment>
                ) : renderGroup(block)))}
            </div>

            {/* زوم تصویر — همان Lightbox v1: کلیک fit ↔ رزولوشن کامل، درگ برای جابه‌جایی */}
            <ImageLightbox
                open={Boolean(zoomMedia)}
                src={zoomMedia ? (mediaOriginalSrc(zoomMedia) || mediaThumbLargeSrc(zoomMedia) || '') : ''}
                alt={zoomMedia?.label || ''}
                onClose={() => setZoomMedia(null)}
            />

            {/* منوی «بیشتر» تایل — دانلود سایز اصلی و حذف خروجی (با تأیید). موبایل: دکمه‌های روی
                تایل هم اینجا می‌آیند و منو مودال وسط صفحه است (مثل پنجرهٔ expand چت)، نه BottomSheet */}
            <ModalHelper
                open={Boolean(tileMenu)}
                onClose={() => setTileMenu(null)}
                type="popup"
                mobileCentered
                size="sm"
                props={isMobile ? { className: styles.tileMenuModal } : undefined}
                targetElement={tileMenu?.anchor}
                hideCloseBtn={!isMobile}
                sheetTitle={tc('options')}
                component={tileMenu ? (
                    <div className={styles.tileMenu} role="menu">
                        {isMobile ? (
                            <>
                                <div className={styles.tileMenuHead}>
                                    {tileThumbSrc(tileMenu.tile.media) ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img className={styles.tileMenuThumb} src={tileThumbSrc(tileMenu.tile.media)} alt="" />
                                    ) : (
                                        <span className={styles.tileMenuThumb} aria-hidden />
                                    )}
                                    <strong>{tc('options')}</strong>
                                </div>
                                <button
                                    type="button"
                                    role="menuitem"
                                    className={styles.tileMenuItem}
                                    onClick={() => {
                                        const { tile } = tileMenu;
                                        setTileMenu(null);
                                        openDetail(tile);
                                    }}
                                >
                                    <TbInfoSquareRounded size={15} />
                                    {t('chat_v2_detail_title', { defaultValue: 'جزئیات تولید' })}
                                </button>
                                {!isVideoMedia(tileMenu.tile.media) && !isAudioMedia(tileMenu.tile.media) ? (
                                    <button
                                        type="button"
                                        role="menuitem"
                                        className={styles.tileMenuItem}
                                        onClick={() => {
                                            const { media } = tileMenu.tile;
                                            setTileMenu(null);
                                            setZoomMedia(media);
                                        }}
                                    >
                                        <LuExpand size={15} />
                                        {t('view_image')}
                                    </button>
                                ) : null}
                                <button
                                    type="button"
                                    role="menuitem"
                                    className={styles.tileMenuItem}
                                    disabled={isMediaAttached(tileMenu.tile.media)}
                                    onClick={() => {
                                        const { media } = tileMenu.tile;
                                        setTileMenu(null);
                                        quickAddReference(media);
                                    }}
                                >
                                    <MdAdd size={16} />
                                    {t('use_as_reference')}
                                </button>
                                {!isAudioMedia(tileMenu.tile.media) ? (
                                    <button
                                        type="button"
                                        role="menuitem"
                                        className={styles.tileMenuItem}
                                        onClick={() => {
                                            const { tile, anchor } = tileMenu;
                                            setTileMenu(null);
                                            toggleTileTemplate(tile, anchor);
                                        }}
                                    >
                                        <TbTemplate size={15} />
                                        {templateToggleLabel(isTileInTemplate(tileMenu.tile))}
                                    </button>
                                ) : null}
                            </>
                        ) : null}
                        <button
                            type="button"
                            role="menuitem"
                            className={styles.tileMenuItem}
                            onClick={() => {
                                const { media } = tileMenu.tile;
                                setTileMenu(null);
                                downloadOriginalMedia(mediaOriginalSrc(media), media.label);
                            }}
                        >
                            <LuDownload size={15} />
                            {t('chat_download_original', { defaultValue: 'دانلود سایز اصلی' })}
                        </button>
                        {tileMenu.tile.message.messageId ? (
                            <button
                                type="button"
                                role="menuitem"
                                className={`${styles.tileMenuItem} ${styles.tileMenuItemDanger}`}
                                onClick={() => {
                                    const { tile } = tileMenu;
                                    setTileMenu(null);
                                    openDeleteConfirm(tile);
                                }}
                            >
                                <LuTrash2 size={15} />
                                {t('chat_delete_output')}
                            </button>
                        ) : null}
                    </div>
                ) : null}
            />

            {/* مودال جزئیات به سبک ExploreDetailModal — رسانه اصلی، ورودی‌ها زیر آن،
                پرامپت جمع‌شونده و انتخاب چندتایی که فقط با «استفاده به‌عنوان مرجع» ارسال می‌شود */}
            <DetailShell
                open={Boolean(detail)}
                windowed={isMobile}
                onClose={() => setDetail(null)}
                title={t('chat_v2_detail_title', { defaultValue: 'جزئیات تولید' })}
                component={detail ? (
                    <div className={styles.detail}>
                        <div className={styles.detailToolbar}>
                            {/* عنوان فقط در پنجرهٔ تمام‌صفحهٔ موبایل (مثل هدر گالری) */}
                            <strong className={styles.detailToolbarTitle}>
                                {t('chat_v2_detail_title', { defaultValue: 'جزئیات تولید' })}
                            </strong>
                            {!isVideoMedia(detail.media) && !isAudioMedia(detail.media) ? (
                                <button
                                    type="button"
                                    className={styles.detailIconBtn}
                                    onClick={() => setZoomMedia(detail.media)}
                                    aria-label={t('view_image')}
                                    title={t('view_image')}
                                >
                                    <LuExpand size={16} />
                                </button>
                            ) : null}
                            <button
                                type="button"
                                className={styles.detailIconBtn}
                                onClick={downloadDetailMedia}
                                aria-label={tc('download')}
                                title={tc('download')}
                            >
                                <LuDownload size={16} />
                            </button>
                            {detail.message.messageId ? (
                                <button
                                    type="button"
                                    className={styles.detailIconBtn}
                                    onClick={() => openDeleteConfirm(detail)}
                                    aria-label={t('chat_delete_output')}
                                    title={t('chat_delete_output')}
                                >
                                    <LuTrash2 size={16} />
                                </button>
                            ) : null}
                            <ModalCloseButton placement="inline" onClick={() => setDetail(null)} aria-label={tc('close')} />
                        </div>

                        <div className={styles.detailScroll}>
                            <figure
                                ref={detailFigureRef}
                                className={`${styles.detailMedia} ${isAudioMedia(detail.media) ? styles.detailMediaAudio : ''}`}
                            >
                                {isVideoMedia(detail.media) ? (
                                    <video src={mediaOriginalSrc(detail.media)} controls playsInline />
                                ) : isAudioMedia(detail.media) ? (
                                    // پخش‌کننده هم‌تم برنامه به‌جای کنترل بومی مرورگر
                                    <MiniAudioPlayer
                                        src={mediaOriginalSrc(detail.media)}
                                        title={audioTitle(detail.media)}
                                        variant="waveform"
                                        size="large"
                                    />
                                ) : (
                                    <DetailImage key={mediaKey(detail.media)} media={detail.media} />
                                )}
                                <button
                                    type="button"
                                    className={`${styles.mediaSelect} ${isMediaSelected(detail.media) ? styles.mediaSelected : ''}`}
                                    aria-pressed={isMediaSelected(detail.media)}
                                    title={t('use_as_reference')}
                                    onClick={() => toggleMediaSelection(detail.media)}
                                >
                                    {isMediaSelected(detail.media) ? <LuCheck size={14} /> : null}
                                </button>
                            </figure>

                            {detailRefs.length ? (
                                <div className={styles.detailRefs}>
                                    <div className={styles.detailRefsHead}>
                                        <strong>
                                            {t('chat_v2_input_media_label', { defaultValue: 'رسانه‌های ورودی' })}
                                        </strong>
                                        {detailRefs.length > 1 ? (
                                            <button
                                                type="button"
                                                className={styles.refsSelectAll}
                                                onClick={() => setSelectedMedia(dedupeMedia([detail.media, ...detailRefs]))}
                                            >
                                                {t('chat_v2_select_all_inputs', { defaultValue: 'انتخاب همه' })}
                                            </button>
                                        ) : null}
                                    </div>
                                    <div className={styles.detailRefsRow}>
                                        {detailRefs.map((media, index) => {
                                            const key = mediaKey(media);
                                            const selected = isMediaSelected(media);
                                            const src = mediaThumbSrc(media) || mediaThumbLargeSrc(media) || mediaOriginalSrc(media);
                                            const isVideo = isVideoMedia(media);
                                            const isAudio = isAudioMedia(media);
                                            const thumb = isVideo ? tileThumbSrc(media) : src;
                                            const openLabel = isVideo || isAudio
                                                ? t('chat_v2_play_media', { defaultValue: 'پخش' })
                                                : t('view_image');
                                            return (
                                                <div key={`${key}-${index}`} className={styles.refItem}>
                                                    <button
                                                        type="button"
                                                        className={`${styles.refThumb} ${selected ? styles.refSelected : ''}`}
                                                        aria-pressed={selected}
                                                        title={t('use_as_reference')}
                                                        onClick={() => toggleMediaSelection(media)}
                                                    >
                                                        {isAudio ? (
                                                            <span className={styles.refAudio}><LuMusic size={16} /></span>
                                                        ) : isVideo && !thumb ? (
                                                            <video src={mediaOriginalSrc(media)} muted playsInline preload="metadata" />
                                                        ) : (
                                                            // eslint-disable-next-line @next/next/no-img-element
                                                            <img src={thumb} alt="" loading="lazy" />
                                                        )}
                                                        <span className={styles.refCheck} aria-hidden="true">
                                                            {selected ? <LuCheck size={12} /> : null}
                                                        </span>
                                                    </button>
                                                    {/* بزرگ‌نمایی تصویر / پخش ویدیو و صوت ورودی */}
                                                    <button
                                                        type="button"
                                                        className={styles.refOpen}
                                                        title={openLabel}
                                                        aria-label={openLabel}
                                                        onClick={() => (isVideo || isAudio ? setViewerMedia(media) : setZoomMedia(media))}
                                                    >
                                                        {isVideo || isAudio
                                                            ? <LuPlay size={11} fill="currentColor" />
                                                            : <LuExpand size={11} />}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : null}

                            <DetailSettings
                                settings={turnSettings(detail.userMessage, detail.message)}
                                media={detail.media}
                            />

                            {detailPrompt ? (
                                <div className={styles.detailPromptBlock}>
                                    <div className={styles.detailPromptHead}>
                                        <strong>{t('chat_v2_prompt_label', { defaultValue: 'پرامپت' })}</strong>
                                        <div className={styles.detailPromptTools}>
                                            <button
                                                type="button"
                                                onClick={addPromptOnly}
                                                title={t('chat_v2_reuse_prompt', { defaultValue: 'استفاده از پرامپت' })}
                                            >
                                                <LuSparkles size={13} />
                                                {t('chat_v2_reuse_prompt', { defaultValue: 'استفاده از پرامپت' })}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(event) => {
                                                    addPromptToTemplate();
                                                    flyToTemplateTab(event.currentTarget, tileThumbSrc(detail.media));
                                                }}
                                                title={t('template_draft_add', { defaultValue: 'افزودن به قالب' })}
                                            >
                                                <TbTemplate size={13} />
                                                {t('template_draft_add', { defaultValue: 'افزودن به قالب' })}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => void copyPrompt(detailPrompt)}
                                                title={tm('copy_prompt', { defaultValue: 'کپی پرامپت' })}
                                            >
                                                {copied ? <LuCheck size={13} /> : <LuCopy size={13} />}
                                                {copied
                                                    ? tm('copied', { defaultValue: 'کپی شد' })
                                                    : tm('copy_prompt', { defaultValue: 'کپی' })}
                                            </button>
                                        </div>
                                    </div>
                                    <div className={`${styles.detailPromptText} ${!promptOpen && canExpandPrompt ? styles.promptClamp : ''}`}>
                                        <MediaMentionText
                                            value={detailPrompt}
                                            mentions={detailPromptMentions}
                                        />
                                    </div>
                                    {canExpandPrompt ? (
                                        <button
                                            type="button"
                                            className={styles.promptToggle}
                                            onClick={() => setPromptOpen((value) => !value)}
                                        >
                                            {promptOpen ? tm('show_less', { defaultValue: 'نمایش کمتر' }) : tm('show_more', { defaultValue: 'نمایش بیشتر' })}
                                        </button>
                                    ) : null}
                                </div>
                            ) : null}
                        </div>

                        <div className={styles.detailActions}>
                            <div className={styles.detailActionsLead}>
                                {detailSelectedCount ? (
                                    <div className={styles.selectedChips}>
                                        {selectedMedia.map((media, index) => {
                                            const src = mediaThumbSrc(media) || mediaThumbLargeSrc(media) || mediaOriginalSrc(media);
                                            return (
                                                <button
                                                    key={`${mediaKey(media)}-${index}`}
                                                    type="button"
                                                    className={styles.selectedChip}
                                                    title={t('chat_v2_deselect', { defaultValue: 'حذف از انتخاب' })}
                                                    onClick={() => toggleMediaSelection(media)}
                                                >
                                                    {isAudioMedia(media) ? (
                                                        <LuMusic size={14} />
                                                    ) : src ? (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img src={src} alt="" />
                                                    ) : (
                                                        <LuImage size={14} />
                                                    )}
                                                </button>
                                            );
                                        })}
                                        <span className={styles.detailActionsHint}>
                                            {t('chat_v2_selected_count', { count: detailSelectedCount, defaultValue: '{{count}} مورد انتخاب شد' })}
                                        </span>
                                    </div>
                                ) : (
                                    <span className={styles.detailActionsHint}>
                                        {t('chat_v2_select_hint', { defaultValue: 'خروجی یا ورودی‌ها را برای ارسال انتخاب کنید' })}
                                    </span>
                                )}
                            </div>
                            {/* افزودن به چت: انتخاب‌شده‌ها، همه ورودی‌ها (پرامپت + رسانه با منشن‌ها)،
                                فقط پرامپت، فقط رسانه‌های ورودی یا خود خروجی */}
                            <div className={styles.addMenuWrap} ref={addMenuRef}>
                                <button
                                    type="button"
                                    className={styles.primaryAction}
                                    aria-haspopup="menu"
                                    aria-expanded={addMenuOpen}
                                    onClick={() => setAddMenuOpen((open) => !open)}
                                >
                                    <MdAdd size={16} />
                                    {t('chat_v2_add_to_chat')}
                                    <LuChevronDown
                                        size={14}
                                        className={`${styles.addMenuChevron} ${addMenuOpen ? styles.addMenuChevronOpen : ''}`}
                                    />
                                </button>
                                {addMenuOpen ? (
                                    <div className={styles.addMenu} role="menu">
                                        {/* مقصد هر گزینه: کادر چت یا قالب در حال ساخت */}
                                        <div className={styles.addTarget} role="radiogroup" aria-label={t('chat_v2_add_target', { defaultValue: 'افزودن به' })}>
                                            {(['chat', 'template'] as const).map((target) => (
                                                <button
                                                    key={target}
                                                    type="button"
                                                    role="radio"
                                                    aria-checked={addTarget === target}
                                                    className={`${styles.addTargetOption} ${addTarget === target ? styles.addTargetOn : ''}`}
                                                    onClick={() => setAddTarget(target)}
                                                >
                                                    {target === 'chat' ? <MdAdd size={14} /> : <TbTemplate size={14} />}
                                                    {target === 'chat'
                                                        ? t('chat_v2_target_chat', { defaultValue: 'به چت' })
                                                        : t('chat_v2_target_template', { defaultValue: 'به قالب' })}
                                                </button>
                                            ))}
                                        </div>
                                        {detailSelectedCount ? (
                                            <button
                                                type="button"
                                                role="menuitem"
                                                className={`${styles.addMenuItem} ${styles.addMenuItemAccent}`}
                                                onClick={() => (addTarget === 'template'
                                                    ? toTemplate(selectedMedia)
                                                    : sendSelectedToComposer())}
                                            >
                                                <span className={styles.addMenuIcon}><LuCheck size={15} /></span>
                                                <span className={styles.addMenuText}>
                                                    <strong>{t('chat_v2_add_selected', { defaultValue: 'انتخاب‌شده‌ها' })}</strong>
                                                    <small>{t('chat_v2_selected_count', { count: detailSelectedCount, defaultValue: '{{count}} مورد انتخاب شد' })}</small>
                                                </span>
                                            </button>
                                        ) : null}
                                        <button
                                            type="button"
                                            role="menuitem"
                                            className={styles.addMenuItem}
                                            disabled={!detailPrompt && !inputAttachments.length}
                                            onClick={addAllInputs}
                                        >
                                            <span className={styles.addMenuIcon}><LuRotateCcw size={15} /></span>
                                            <span className={styles.addMenuText}>
                                                <strong>{t('chat_v2_add_all_inputs')}</strong>
                                                {allInputsHint ? <small>{allInputsHint}</small> : null}
                                            </span>
                                            {inputThumbs.length ? (
                                                <span className={styles.addMenuThumbs} aria-hidden>
                                                    {inputThumbs.map((src, index) => (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img key={`${src}-${index}`} src={src} alt="" />
                                                    ))}
                                                </span>
                                            ) : null}
                                        </button>
                                        <button
                                            type="button"
                                            role="menuitem"
                                            className={styles.addMenuItem}
                                            disabled={!detailPrompt}
                                            onClick={addPromptOnly}
                                        >
                                            <span className={styles.addMenuIcon}><LuType size={15} /></span>
                                            <span className={styles.addMenuText}>
                                                <strong>{t('chat_v2_add_prompt_only')}</strong>
                                                {detailPromptMentions.length ? (
                                                    <small>{t('chat_v2_with_mentions', { count: detailPromptMentions.length })}</small>
                                                ) : null}
                                            </span>
                                        </button>
                                        <button
                                            type="button"
                                            role="menuitem"
                                            className={styles.addMenuItem}
                                            disabled={!inputAttachments.length}
                                            onClick={addInputMedia}
                                        >
                                            <span className={styles.addMenuIcon}><LuImages size={15} /></span>
                                            <span className={styles.addMenuText}>
                                                <strong>{t('chat_v2_add_input_media')}</strong>
                                                {inputAttachments.length ? (
                                                    <small>{t('chat_v2_n_media', { count: inputAttachments.length })}</small>
                                                ) : null}
                                            </span>
                                        </button>
                                        <button
                                            type="button"
                                            role="menuitem"
                                            className={styles.addMenuItem}
                                            onClick={addOutput}
                                        >
                                            <span className={styles.addMenuIcon}>
                                                {isVideoMedia(detail.media)
                                                    ? <LuFilm size={15} />
                                                    : isAudioMedia(detail.media) ? <LuMusic size={15} /> : <LuImage size={15} />}
                                            </span>
                                            <span className={styles.addMenuText}>
                                                <strong>{t('chat_v2_add_output')}</strong>
                                                <small>{t('chat_v2_add_output_hint')}</small>
                                            </span>
                                        </button>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </div>
                ) : null}
            />

            {/* «بیشتر بدانید» نوبت ناموفق — توضیح هوشتون + بررسی فایل‌های ورودی */}
            <ModalHelper
                open={Boolean(errorDetailsTurn)}
                onClose={() => setErrorDetailsTurn(null)}
                size="md"
                sheetTitle={te('details.read_more')}
                component={errorDetailsTurn ? (
                    <FailedTurnDetailsDialog
                        errorMessage={errorDetailsTurn.errorMessage}
                        modelName={errorDetailsTurn.modelName}
                        inputs={errorDetailsInputs}
                        canRetry={Boolean(errorDetailsTurn.retryable)}
                        canEdit={Boolean(errorDetailsTurn.retryable && errorDetailsTurn.hasSnapshot)}
                        busy={Boolean(retryingMessageId) || Boolean(editingMessageId)}
                        onRetry={() => {
                            const key = errorDetailsTurn.key;
                            setErrorDetailsTurn(null);
                            void retryFailedTurn(key);
                        }}
                        onEdit={(excludeUrls) => {
                            const key = errorDetailsTurn.key;
                            setErrorDetailsTurn(null);
                            startEditFailedTurn(key, { excludeUrls });
                        }}
                    />
                ) : null}
            />

            {/* تأیید حذف: خروجی (فایل و thumbnail ها از storage) یا نوبت ناموفق (فقط از تاریخچه) */}
            <ModalHelper
                open={Boolean(deleteTarget || failedDeleteTarget)}
                onClose={closeDeleteConfirm}
                size="md"
                closeOnOverlayClick={!deleting}
                closeOnEsc={!deleting}
                sheetTitle={failedDeleteTarget ? t('chat_delete_turn') : t('chat_delete_output')}
                component={deleteTarget ? (
                    <DeleteOutputDialog
                        target={{
                            variant: 'output',
                            kind: isVideoMedia(deleteTarget.media) ? 'video' : isAudioMedia(deleteTarget.media) ? 'audio' : 'image',
                            thumbSrc: tileThumbSrc(deleteTarget.media) || mediaThumbLargeSrc(deleteTarget.media) || '',
                            sizeLabel: formatFileSize(fileSizes.get(mediaOriginalSrc(deleteTarget.media)) || 0),
                        }}
                        deleting={deleting}
                        error={deleteError}
                        onCancel={closeDeleteConfirm}
                        onConfirm={() => void confirmDelete()}
                    />
                ) : failedDeleteTarget ? (
                    <DeleteOutputDialog
                        target={{
                            variant: 'failed',
                            modelName: failedDeleteTarget.modelName,
                            errorMessage: failedDeleteTarget.errorMessage,
                        }}
                        deleting={deleting}
                        error={deleteError}
                        onCancel={closeDeleteConfirm}
                        onConfirm={() => void confirmFailedDelete()}
                    />
                ) : null}
            />

            {/* پخش ویدیو/صوت ورودی — روی مودال جزئیات */}
            <ModalHelper
                open={Boolean(viewerMedia)}
                onClose={() => setViewerMedia(null)}
                size={viewerMedia && isVideoMedia(viewerMedia) ? 'lg' : 'md'}
                sheetTitle={t('chat_v2_input_media_label', { defaultValue: 'رسانه‌های ورودی' })}
                component={viewerMedia ? (
                    <div className={`${styles.inputViewer} ${isAudioMedia(viewerMedia) ? styles.inputViewerAudio : ''}`}>
                        {isVideoMedia(viewerMedia) ? (
                            <video src={mediaOriginalSrc(viewerMedia)} controls autoPlay playsInline />
                        ) : (
                            <MiniAudioPlayer
                                src={mediaOriginalSrc(viewerMedia)}
                                title={audioTitle(viewerMedia)}
                                variant="waveform"
                                size="large"
                            />
                        )}
                    </div>
                ) : null}
            />
        </div>
    );
}

