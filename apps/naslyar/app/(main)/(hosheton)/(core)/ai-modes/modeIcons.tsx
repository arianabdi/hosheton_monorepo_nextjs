'use client';

import * as LuIcons from 'react-icons/lu';
import type { IconType } from 'react-icons';
import styles from './ai-modes.module.scss';

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

export function ModeIcon({ name, size = 18 }: { name?: string | null; size?: number }) {
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

/** آیکون‌های قابل انتخاب در فرم نلیار — نام export از react-icons/lu */
export const MODE_ICON_CHOICES = [
    'LuWand',
    'LuWandSparkles',
    'LuSparkles',
    'LuImage',
    'LuImages',
    'LuImagePlus',
    'LuGalleryHorizontal',
    'LuLayers',
    'LuUser',
    'LuSmile',
    'LuScanFace',
    'LuPalette',
    'LuMap',
    'LuPackage',
    'LuActivity',
    'LuPersonStanding',
    'LuVideo',
    'LuClapperboard',
    'LuFilm',
    'LuMove',
    'LuZap',
    'LuBookOpen',
    'LuLink',
    'LuRotateCw',
    'LuReplace',
    'LuEraser',
    'LuMic',
    'LuVolume2',
    'LuMusic',
    'LuHeart',
    'LuCamera',
    'LuAperture',
    'LuFocus',
    'LuSun',
    'LuMoon',
    'LuFlame',
] as const;

export function ModeIconPicker({
    value,
    onChange,
}: {
    value: string;
    onChange: (icon: string) => void;
}) {
    return (
        <div className={styles.iconPicker}>
            {MODE_ICON_CHOICES.filter((icon) => LU[icon]).map((icon) => (
                <button
                    key={icon}
                    type="button"
                    className={`${styles.iconPick} ${value === icon ? styles.iconPickActive : ''}`}
                    title={icon}
                    onClick={() => onChange(icon)}
                >
                    <ModeIcon name={icon} size={18} />
                </button>
            ))}
            <span className={styles.iconPickValue}>{value || 'LuSparkles'}</span>
        </div>
    );
}
