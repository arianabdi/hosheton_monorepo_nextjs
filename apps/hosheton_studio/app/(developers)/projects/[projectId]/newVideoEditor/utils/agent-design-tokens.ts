/**
 * تنظیمات واحد طراحی ادیتور (Editor Design Tokens)
 * ─────────────────────────────────────────────────────────────────────────────
 * تنها منبع مقادیر بصری که دستیار هوش مصنوعی برای «هر المان جدید» اجازه دارد
 * استفاده کند: پالت رنگ، تایپوگرافی، پریست‌های موشن، ترنزیشن، قاب‌های استاندارد
 * و زمان‌بندی. این آبجکت با هر درخواست چت به بک‌اند ارسال و در پرامپت سیستم
 * تزریق می‌شود — پس با ویرایش همین فایل، خروجی AI در کل ادیتور عوض می‌شود.
 *
 * قواعد:
 *  - همه‌ی مختصات frame نرمال‌شده‌ی ۰ تا ۱ نسبت به بوم‌اند (x,y = گوشه‌ی بالا-چپ).
 *  - fontSize ها بر اساس بوم با ارتفاع ۷۲۰ پیکسل‌اند.
 *  - مقادیر باید همیشه با پریست‌های همین فایل مقدار دهی شوند، نه عدد آزاد.
 */

import { CAPTION_FRAME } from '../types/timeline';

export type EditorDesignPalette = {
    /** رنگ برند — عناصر تأکیدی و پس‌زمینه‌ی متن‌های برجسته. */
    primary: string;
    /** رنگ مکمل برای کنتراست. */
    secondary: string;
    /** رنگ تأکید (CTA، اعداد، هایلایت). */
    accent: string;
    /** رنگ اصلی متن روی پس‌زمینه‌ی تیره/روشن. */
    text: string;
    textMuted: string;
    background: string;
    surface: string;
    /** رنگ‌های معنایی. */
    success: string;
    warning: string;
    danger: string;
};

export type EditorDesignTypography = {
    fontFamily: string;
    /** نقش‌های متنی استاندارد — هر متن جدید باید یکی از این نقش‌ها را بگیرد. */
    roles: {
        title: { fontSize: number; bold: boolean; motion: 'fadeIn' | 'slideUp' | 'pop' | 'typewriter' };
        heading: { fontSize: number; bold: boolean; motion: 'fadeIn' | 'slideUp' | 'pop' | 'typewriter' };
        body: { fontSize: number; bold: boolean; motion: 'fadeIn' | 'slideUp' | 'pop' | 'typewriter' };
        caption: { fontSize: number; bold: boolean; motion: 'fadeIn' | 'slideUp' | 'pop' | 'typewriter' };
    };
    color: string;
    align: 'left' | 'center' | 'right';
    lineHeight: number;
    /** استروک دور متن برای خوانایی روی پس‌زمینه‌ی شلوغ. */
    strokeColor: string;
    strokeWidth: number;
};

export type EditorDesignMotion = {
    enter: Array<{ motion: 'fadeIn' | 'slideUp' | 'slideLeft' | 'slideRight' | 'zoomIn' | 'bounceIn'; duration: number }>;
    exit: Array<{ motion: 'fadeIn' | 'slideUp' | 'slideLeft' | 'slideRight' | 'zoomIn' | 'bounceIn'; duration: number }>;
    loop: Array<{ kind: 'float' | 'pulse' | 'sway' | 'shake'; amplitude: number; speed: number }>;
    textEnter: Array<{ motion: 'none' | 'fadeIn' | 'slideUp' | 'pop' | 'typewriter'; duration: number }>;
    textExit: Array<{ motion: 'none' | 'fadeOut' | 'slideOutDown' | 'slideOutUp' | 'shrinkOut'; duration: number }>;
};

export type EditorDesignTokens = {
    version: number;
    palette: EditorDesignPalette;
    typography: EditorDesignTypography;
    motion: EditorDesignMotion;
    transition: {
        /** تنها نوع ترنزیشن پشتیبانی‌شده‌ی موتور. */
        type: 'crossDissolve';
        duration: number;
        intensity: number;
        curve: 'linear' | 'smooth' | 'easeIn' | 'easeOut';
    };
    /** قاب‌های نرمال‌شده‌ی استاندارد — المان‌های جدید باید یکی از این‌ها را بگیرند. */
    frames: {
        /** پرکردن کل بوم (رسانه‌ی اصلی). */
        fullCover: { x: number; y: number; width: number; height: number };
        /** تیتر وسط کادر. */
        titleCenter: { x: number; y: number; width: number; height: number };
        /** زیرنویس پایین (مثل زیرنویس اتوماتیک). */
        caption: { x: number; y: number; width: number; height: number };
        /** لوگو/واترمارک گوشه‌ی بالا-راست. */
        cornerLogo: { x: number; y: number; width: number; height: number };
        /** کارت/ستون کناری. */
        sideCard: { x: number; y: number; width: number; height: number };
    };
    /** حاشیه‌ی امن: هیچ المان مهمی نباید از این نسبت به لبه‌ها نزدیک‌تر شود. */
    safeMargin: number;
    timing: {
        image: number;
        clip: number;
        title: number;
        minClip: number;
        /** فاصله‌ی استاندارد بعد از تیتر پایانی قبل از کات بعدی. */
        tailPadding: number;
    };
    /** چیدمان استاندارد ترک‌ها — AI هنگام addTrack/addMedia از این پیروی می‌کند. */
    trackPlan: {
        /** رسانه‌ی اصلی روی اولین ترک ویدیویی، لایه‌های روی‌تصویر روی ترک‌های بالاتر. */
        baseMedia: 'video';
        /** متن/زیرنویس همیشه روی ترک متن (بالای همه). */
        text: 'text';
        /** صدا/موسیقی روی ترک صوتی. */
        audio: 'audio';
    };
};

export const EDITOR_DESIGN_TOKENS: EditorDesignTokens = {
    version: 1,

    palette: {
        primary: '#6366f1',
        secondary: '#22d3ee',
        accent: '#f59e0b',
        text: '#ffffff',
        textMuted: 'rgba(255,255,255,0.72)',
        background: '#0f172a',
        surface: 'rgba(15,23,42,0.72)',
        success: '#22c55e',
        warning: '#facc15',
        danger: '#ef4444',
    },

    typography: {
        fontFamily: "'Vazirmatn', 'Segoe UI', Tahoma, sans-serif",
        roles: {
            title: { fontSize: 64, bold: true, motion: 'slideUp' },
            heading: { fontSize: 46, bold: true, motion: 'fadeIn' },
            body: { fontSize: 34, bold: false, motion: 'fadeIn' },
            caption: { fontSize: 28, bold: false, motion: 'fadeIn' },
        },
        color: '#ffffff',
        align: 'center',
        lineHeight: 1.25,
        strokeColor: '#000000',
        strokeWidth: 3,
    },

    motion: {
        enter: [
            { motion: 'fadeIn', duration: 0.5 },
            { motion: 'slideUp', duration: 0.5 },
            { motion: 'zoomIn', duration: 0.6 },
        ],
        exit: [
            { motion: 'fadeIn', duration: 0.4 },
        ],
        loop: [
            { kind: 'float', amplitude: 0.3, speed: 0.4 },
            { kind: 'pulse', amplitude: 0.2, speed: 0.5 },
        ],
        textEnter: [
            { motion: 'fadeIn', duration: 0.3 },
            { motion: 'slideUp', duration: 0.35 },
            { motion: 'pop', duration: 0.35 },
        ],
        textExit: [
            { motion: 'fadeOut', duration: 0.3 },
        ],
    },

    transition: {
        type: 'crossDissolve',
        duration: 0.5,
        intensity: 1,
        curve: 'smooth',
    },

    frames: {
        fullCover: { x: 0, y: 0, width: 1, height: 1 },
        titleCenter: { x: 0.06, y: 0.38, width: 0.88, height: 0.22 },
        caption: { ...CAPTION_FRAME },
        cornerLogo: { x: 0.84, y: 0.06, width: 0.1, height: 0.1 },
        sideCard: { x: 0.58, y: 0.22, width: 0.36, height: 0.5 },
    },

    safeMargin: 0.06,

    timing: {
        image: 3,
        clip: 5,
        title: 3.5,
        minClip: 0.25,
        tailPadding: 0.3,
    },

    trackPlan: {
        baseMedia: 'video',
        text: 'text',
        audio: 'audio',
    },
};
