import { useEffect, useState } from 'react';
import { developerApi } from '@/app/(developers)/projects/lib/developer-api';
import { runnableModes } from './model-route-match';

/** تنظیم «فایل‌های ورودی» مدل متنی (naslyar) — پسوندهای مجاز بدون نقطه */
export type TextModelFileInputs = {
    formats: string[];
    maxFiles: number;
    maxFileMb: number;
};

export type TextModelInputs = {
    /** مدل vision است (route با ورودی تصویر) */
    imageAllowed: boolean;
    /** فایل سند/کد/جدول؛ null = این مدل فایل نمی‌پذیرد */
    files: TextModelFileInputs | null;
};

const NONE: TextModelInputs = { imageAllowed: false, files: null };

function readFileInputs(raw: unknown): TextModelFileInputs | null {
    if (!raw || typeof raw !== 'object') return null;
    const value = raw as { enabled?: boolean; formats?: unknown; maxFiles?: unknown; maxFileMb?: unknown };
    if (value.enabled !== true) return null;
    const formats = (Array.isArray(value.formats) ? value.formats : [])
        .map((item) => String(item || '').trim().toLowerCase().replace(/^\./, ''))
        .filter(Boolean);
    if (!formats.length) return null;
    const maxFiles = Number(value.maxFiles);
    const maxFileMb = Number(value.maxFileMb);
    return {
        formats,
        maxFiles: Number.isFinite(maxFiles) && maxFiles > 0 ? maxFiles : 5,
        maxFileMb: Number.isFinite(maxFileMb) && maxFileMb > 0 ? maxFileMb : 20,
    };
}

/**
 * ورودی‌های مدل انتخاب‌شده در چت متنی: تصویر (از modes/routes — مدل بدون route تصویری عکس نمی‌پذیرد)
 * و فایل‌های متنی (از تنظیم «فایل‌های ورودی» مدل در naslyar).
 */
export function useTextModelInputs(modelId: string): TextModelInputs {
    const [inputs, setInputs] = useState<TextModelInputs>(NONE);

    useEffect(() => {
        const id = String(modelId || '').trim();
        if (!id) {
            setInputs(NONE);
            return;
        }
        let cancelled = false;
        setInputs(NONE);
        developerApi.getProviderModel(id)
            .then((model) => {
                if (cancelled) return;
                // فقط مودها و مسیرهای روشن (خاموش‌ها در ادمین کنار گذاشته شده‌اند)
                const modes = runnableModes(model?.modes);
                const imageAllowed = modes.some((mode: {
                    routes?: Array<{ imageCount?: { max?: number | null } }>;
                }) => (
                    (Array.isArray(mode?.routes) ? mode.routes : []).some((route) => {
                        const max = route?.imageCount?.max;
                        return max == null || Number(max) >= 1;
                    })
                ));
                setInputs({ imageAllowed, files: readFileInputs(model?.fileInputs) });
            })
            .catch(() => {
                if (!cancelled) setInputs(NONE);
            });
        return () => { cancelled = true; };
    }, [modelId]);

    return inputs;
}

/** @deprecated useTextModelInputs — فقط ورودی تصویر */
export function useTextModelImageInput(modelId: string): boolean {
    return useTextModelInputs(modelId).imageAllowed;
}
