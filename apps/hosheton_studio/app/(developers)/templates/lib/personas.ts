'use client';

import { useEffect, useState } from 'react';
import { createApiClient, unwrapApiData } from '@/app/(developers)/projects/lib/api-client';
import { canUseDeveloperTools } from '@/app/lib/user-roles';
import { useAppStore } from '@/app/zustand/store/useAppStore';

/** کاربر نمایشی (فقط ادمین‌ها می‌دانند ساختگی است) */
export type PersonaOption = {
    _id: string;
    fullName: string;
    username: string;
    avatar: string;
    gender: string;
    /** حوزهٔ کاری = کلید تگ‌های قالب */
    tagKeys?: string[];
};

/** filtered = فقط هم‌حوزه‌های تگ‌ها، no_match = تگ بود ولی کسی هم‌حوزه نبود (همه)، all = بدون تگ (همه) */
export type PersonaOptionsResult = {
    personas: PersonaOption[];
    mode: 'all' | 'filtered' | 'no_match';
    tags: string[];
    matchedCount?: number;
};

const EMPTY: PersonaOptionsResult = { personas: [], mode: 'all', tags: [] };
const CACHE_MS = 60_000;
const cache = new Map<string, { at: number; result: PersonaOptionsResult }>();
const inflight = new Map<string, Promise<PersonaOptionsResult>>();

async function fetchPersonaOptions(tags: string[], include: string): Promise<PersonaOptionsResult> {
    const key = `${tags.join(',')}|${include}`;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_MS) return hit.result;
    let pending = inflight.get(key);
    if (!pending) {
        pending = createApiClient()
            .get('/api/studio/personas/options', {
                params: {
                    ...(tags.length ? { tags: tags.join(',') } : {}),
                    ...(include ? { include } : {}),
                },
            })
            .then((res) => {
                const data = unwrapApiData<Partial<PersonaOptionsResult>>(res) || {};
                const result: PersonaOptionsResult = {
                    personas: data.personas ?? [],
                    mode: data.mode ?? 'all',
                    tags: data.tags ?? [],
                    matchedCount: data.matchedCount,
                };
                cache.set(key, { at: Date.now(), result });
                return result;
            })
            .finally(() => {
                inflight.delete(key);
            });
        inflight.set(key, pending);
    }
    return pending;
}

/** ادمین بودن کاربر فعلی (همان شرط ابزار توسعه‌دهنده) */
export function useIsStaff(): boolean {
    const roles = useAppStore((state) => state.roles);
    return canUseDeveloperTools(roles);
}

/**
 * کاربران نمایشی فعال — فقط برای ادمین درخواست می‌شود. با `tags` (تگ‌های قالب) فقط هم‌حوزه‌ها
 * (همان تگ، والد یا زیرشاخه‌اش)؛ `include` = منتشرکنندهٔ فعلی حتی اگر خارج از حوزه باشد.
 */
export function usePersonaOptions(enabled: boolean, tags: string[] = [], include = '') {
    const tagSignature = [...new Set(tags)].sort().join(',');
    const [result, setResult] = useState<PersonaOptionsResult>(EMPTY);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!enabled) return;
        let cancelled = false;
        setLoading(true);
        fetchPersonaOptions(tagSignature ? tagSignature.split(',') : [], include)
            .then((next) => {
                if (!cancelled) setResult(next);
            })
            .catch(() => {
                if (!cancelled) setResult(EMPTY);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [enabled, tagSignature, include]);

    return { ...(enabled ? result : EMPTY), loading };
}
