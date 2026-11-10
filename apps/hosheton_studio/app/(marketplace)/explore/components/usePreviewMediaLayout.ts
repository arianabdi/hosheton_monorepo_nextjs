'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { TemplatePreviewMedia } from '@/app/(developers)/projects/types/media-api';

export type PreviewOrientation = 'landscape' | 'portrait';

export type PreviewLayoutMode = 'column' | 'row';

function classifyOrientation(width: number, height: number): PreviewOrientation | null {
    if (!width || !height) return null;
    return height > width ? 'portrait' : 'landscape';
}

export function resolvePreviewLayout(
    previews: TemplatePreviewMedia[],
    orientations: Array<PreviewOrientation | null>,
): PreviewLayoutMode {
    if (previews.length <= 1) return 'column';

    const resolved = orientations.slice(0, previews.length);
    if (resolved.some((o) => o === null)) return 'column';

    const allPortrait = resolved.every((o) => o === 'portrait');
    return allPortrait ? 'row' : 'column';
}

export function usePreviewMediaLayout(previews: TemplatePreviewMedia[]) {
    const [orientations, setOrientations] = useState<Array<PreviewOrientation | null>>(() =>
        previews.map(() => null),
    );

    const previewKey = previews.map((p) => p.url).join('|');

    useEffect(() => {
        setOrientations(previews.map(() => null));
    }, [previewKey, previews.length]);

    const registerDimensions = useCallback((index: number, width: number, height: number) => {
        const orientation = classifyOrientation(width, height);
        if (!orientation) return;

        setOrientations((prev) => {
            if (prev[index] === orientation) return prev;
            const next = [...prev];
            next[index] = orientation;
            return next;
        });
    }, []);

    const layout = useMemo(
        () => resolvePreviewLayout(previews, orientations),
        [previews, orientations],
    );

    return { layout, registerDimensions };
}
