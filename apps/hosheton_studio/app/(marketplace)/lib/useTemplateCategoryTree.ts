'use client';

import { useEffect, useState } from 'react';
import { fetchTemplateCategoryTree, type TemplateCategoryNode } from './explore-taxonomy';

// یک‌بار برای کل تب مرورگر — درخت کوچک است و بین صفحه‌های اکسپلور، مودال و فرم قالب مشترک است
let cached: TemplateCategoryNode[] | null = null;
let pending: Promise<TemplateCategoryNode[]> | null = null;

function loadTree(): Promise<TemplateCategoryNode[]> {
    if (cached) return Promise.resolve(cached);
    if (!pending) {
        pending = fetchTemplateCategoryTree()
            .then((nodes) => {
                cached = nodes;
                return nodes;
            })
            .finally(() => {
                pending = null;
            });
    }
    return pending;
}

/**
 * درخت دسته‌بندی قالب‌ها. صفحه‌های سرور درخت را به‌عنوان `initial` می‌دهند تا رندر اول (و HTML
 * سئو) بدون انتظار کامل باشد؛ بقیهٔ جاها از کش ماژول یا یک درخواست مشترک پر می‌شوند.
 */
export function useTemplateCategoryTree(initial?: TemplateCategoryNode[] | null) {
    if (initial && !cached) cached = initial;
    const [nodes, setNodes] = useState<TemplateCategoryNode[] | null>(() => initial || cached);

    useEffect(() => {
        if (nodes) return;
        let active = true;
        loadTree().then((tree) => {
            if (active) setNodes(tree);
        });
        return () => {
            active = false;
        };
    }, [nodes]);

    return { nodes: nodes || [], loaded: nodes !== null };
}
