'use client';

import * as LuIcons from 'react-icons/lu';
import type { IconType } from 'react-icons';

const LU = LuIcons as Record<string, IconType>;

const ALIASES: Record<string, string> = {
    wand: 'LuWand',
    'wand-2': 'LuWandSparkles',
    image: 'LuImage',
    images: 'LuImages',
    gallery: 'LuGalleryHorizontal',
    layers: 'LuLayers',
    user: 'LuUser',
    palette: 'LuPalette',
    map: 'LuMap',
    package: 'LuPackage',
    smile: 'LuSmile',
    activity: 'LuActivity',
    'person-standing': 'LuPersonStanding',
    video: 'LuVideo',
    move: 'LuMove',
    zap: 'LuZap',
    'book-open': 'LuBookOpen',
    film: 'LuClapperboard',
    link: 'LuLink',
    'rotate-cw': 'LuRotateCw',
    replace: 'LuReplace',
    eraser: 'LuEraser',
    'image-plus': 'LuImagePlus',
    mic: 'LuMic',
    'volume-2': 'LuVolume2',
    music: 'LuMusic',
    heart: 'LuHeart',
};

function kebabToLu(name: string): string {
    const pascal = name
        .split(/[-_\s]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join('');
    return `Lu${pascal}`;
}

export function resolveModeIcon(name?: string | null): IconType {
    const raw = String(name || '').trim();
    if (!raw) return LuIcons.LuSparkles;
    if (LU[raw]) return LU[raw];
    const aliased = ALIASES[raw] || kebabToLu(raw);
    return LU[aliased] || LuIcons.LuSparkles;
}

export function ModeIcon({ name, size = 16 }: { name?: string | null; size?: number }) {
    const Icon = resolveModeIcon(name);
    return <Icon size={size} />;
}

export function sanitizeSvg(svg?: string) {
    const raw = String(svg || '').trim();
    if (!raw.toLowerCase().includes('<svg')) return '';
    return raw
        .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
        .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
}

export function SvgMarkup({ svg, className }: { svg?: string; className?: string }) {
    const html = sanitizeSvg(svg);
    if (!html) return null;
    return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

export const MODE_GROUP_LABELS: Record<string, string> = {
    core: 'پایه',
    reference: 'مرجع',
    motion: 'حرکت',
    storytelling: 'روایت',
    editing: 'ویرایش',
    audio: 'صدا',
};

const GROUP_ORDER = ['core', 'reference', 'motion', 'storytelling', 'editing', 'audio'];

export function groupModesByCategory<T extends { group?: string }>(modes: T[]): Array<{ key: string; items: T[] }> {
    const map = new Map<string, T[]>();
    for (const mode of modes) {
        const key = mode.group || 'core';
        const list = map.get(key);
        if (list) list.push(mode);
        else map.set(key, [mode]);
    }
    const groups: Array<{ key: string; items: T[] }> = [];
    for (const key of GROUP_ORDER) {
        const items = map.get(key);
        if (items?.length) groups.push({ key, items });
    }
    for (const [key, items] of map) {
        if (!GROUP_ORDER.includes(key)) groups.push({ key, items });
    }
    return groups;
}
