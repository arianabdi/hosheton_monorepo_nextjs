'use client';

import { useEffect, useMemo, useState } from 'react';
import { providersApi, type AiModeItem } from './providers-api';
import { angleConfigFromMode, findAngleStudioMode, type AngleStudioConfig } from './angle-studio';

const TTL_MS = 5 * 60_000;
const cache = new Map<string, { at: number; promise: Promise<AiModeItem | null> }>();

function loadAngleMode(modelId: string): Promise<AiModeItem | null> {
    const hit = cache.get(modelId);
    if (hit && Date.now() - hit.at < TTL_MS) return hit.promise;
    const promise = providersApi.listModesForModel(modelId)
        .then((res) => findAngleStudioMode(res.modes))
        .catch(() => {
            cache.delete(modelId);
            return null;
        });
    cache.set(modelId, { at: Date.now(), promise });
    return promise;
}

/**
 * مود «زاویه و نور» برای یک مدل (اگر فعال و با مدل سازگار است) + پریست‌هایش.
 * چیپ چت و پنل نود هر دو از همین می‌خوانند؛ پاسخ هر مدل ۵ دقیقه کش می‌شود.
 */
export function useAngleStudioMode(modelId: string | undefined, enabled = true): {
    mode: AiModeItem | null;
    loaded: boolean;
    config: AngleStudioConfig;
} {
    const id = String(modelId || '').trim();
    const [state, setState] = useState<{ id: string; mode: AiModeItem | null; loaded: boolean }>({
        id: '',
        mode: null,
        loaded: false,
    });

    useEffect(() => {
        if (!enabled || !id) {
            setState({ id, mode: null, loaded: true });
            return;
        }
        let cancelled = false;
        loadAngleMode(id).then((mode) => {
            if (!cancelled) setState({ id, mode, loaded: true });
        });
        return () => { cancelled = true; };
    }, [id, enabled]);

    const current = state.id === id ? state : { id, mode: null, loaded: !enabled || !id };
    const config = useMemo(() => angleConfigFromMode(current.mode), [current.mode]);
    return { mode: current.mode, loaded: current.loaded, config };
}
