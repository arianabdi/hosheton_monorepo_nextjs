'use client';

import { useEffect, useState } from 'react';
import { providersApi, type ProviderModelItem } from '../../../lib/providers-api';
import { SvgMarkup } from '../../chat/lib/modeIcon';
import type { StudioNodeData } from '../../types/studio';
import styles from './nodes.module.scss';

type ProviderClass = 'image' | 'video' | 'audio' | 'text' | '3d';

// Shared per page-load so N nodes on the canvas trigger one request per class.
const modelsCache = new Map<string, Promise<ProviderModelItem[]>>();

function fetchModelsCached(providerClass?: ProviderClass, providerId?: string) {
    const key = `${providerClass || ''}|${providerId || ''}`;
    let cached = modelsCache.get(key);
    if (!cached) {
        cached = providersApi.listModels({
            class: providerClass,
            ...(providerClass ? {} : { providerId }),
        }).then((res) => res.models ?? []);
        modelsCache.set(key, cached);
    }
    return cached;
}

/**
 * Header title for AI generation nodes: shows the selected model's icon and
 * name instead of the node's own icon/label. Falls back to the node icon and
 * label while no model is selected (or before the model list resolves).
 */
export function ModelHeaderTitle({
    nodeData,
    providerClass,
    fallbackIcon,
    fallbackTitle,
}: {
    nodeData: StudioNodeData;
    providerClass?: ProviderClass;
    fallbackIcon: React.ReactNode;
    fallbackTitle: string;
}) {
    const directLabel = String(nodeData.modelName || nodeData.model || '');
    const modelId = String(nodeData.modelId || '');
    const providerId = nodeData.providerId ? String(nodeData.providerId) : undefined;
    const [resolved, setResolved] = useState<{ name?: string; iconSvg?: string }>({});

    useEffect(() => {
        if (!modelId) {
            setResolved({});
            return;
        }
        let cancelled = false;
        fetchModelsCached(providerClass, providerId)
            .then((models) => {
                if (cancelled) return;
                const match = models.find((model) => model._id === modelId);
                setResolved({
                    name: match?.displayName || match?.name || '',
                    iconSvg: match?.iconSvg || '',
                });
            })
            .catch(() => { if (!cancelled) setResolved({}); });
        return () => { cancelled = true; };
    }, [modelId, providerClass, providerId]);

    if (!modelId && !directLabel) {
        return (
            <>
                {fallbackIcon} <span>{fallbackTitle}</span>
            </>
        );
    }

    // modelId set but not resolved yet → node title stays until the name arrives
    const label = directLabel || resolved.name || fallbackTitle;

    return (
        <>
            {resolved.iconSvg
                ? <SvgMarkup svg={resolved.iconSvg} className={styles.headerModelIcon} />
                : fallbackIcon}
            <span className={styles.headerModelName} title={label}>{label}</span>
        </>
    );
}
