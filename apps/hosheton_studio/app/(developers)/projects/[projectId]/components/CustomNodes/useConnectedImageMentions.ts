'use client';

import { useMemo } from 'react';
import {
    useEdges, useNodesData, type Node,
} from '@xyflow/react';
import {
    createStudioMediaId,
    mediaRefToMention,
    selectedAssetsForEdge,
    type StudioMediaMention,
} from '../../../lib/studio-media';
import type { StudioNodeData } from '../../types/studio';

/** Target handles that carry image references into a generation node. */
const IMAGE_INPUT_HANDLES = new Set(['ref-in', 'img-ref', 'image-in', 'images-in', 'ref']);

function outputImageMentions(sourceId: string, data: StudioNodeData): StudioMediaMention[] {
    const label = String(data.label || '').trim() || 'Image';
    const urls = [
        ...(Array.isArray(data.images) ? data.images : []),
        data.imageUrl,
    ]
        .map((url) => String(url || '').trim())
        .filter(Boolean);
    return [...new Set(urls)].map((url, index) => ({
        assetId: createStudioMediaId(`${sourceId}:${url}`),
        label: urls.length > 1 ? `${label} ${index + 1}` : label,
        type: 'image' as const,
        url,
        sourceNodeId: sourceId,
    }));
}

/**
 * Image inputs currently connected to a generation node — the only media its
 * prompt may @mention (like chat mentions attached photos).
 */
export function useConnectedImageMentions(nodeId: string): StudioMediaMention[] {
    const edges = useEdges();
    const imageEdges = useMemo(
        () => edges.filter((edge) => (
            edge.target === nodeId
            && IMAGE_INPUT_HANDLES.has(String(edge.targetHandle || '').trim().toLowerCase())
        )),
        [edges, nodeId],
    );
    const sourceIdsKey = [...new Set(imageEdges.map((edge) => edge.source))].sort().join('|');
    const sourceIds = useMemo(
        () => (sourceIdsKey ? sourceIdsKey.split('|') : []),
        [sourceIdsKey],
    );
    const sources = useNodesData(sourceIds);

    return useMemo(() => {
        if (!imageEdges.length) return [];
        const byId = new Map(sources.map((source) => [source.id, source]));
        const mentions: StudioMediaMention[] = [];
        const seen = new Set<string>();
        for (const edge of imageEdges) {
            const source = byId.get(edge.source);
            if (!source || source.type === 'avatarRef') continue;
            const data = (source.data || {}) as StudioNodeData;

            if (source.type === 'assetRef') {
                const node = { id: source.id, type: source.type, data } as Node;
                const assets = selectedAssetsForEdge(node, edge).filter((asset) => asset.type === 'image');
                for (const asset of assets) {
                    const mention: StudioMediaMention = {
                        ...mediaRefToMention(asset),
                        sourceNodeId: source.id,
                    };
                    if (seen.has(mention.assetId)) continue;
                    seen.add(mention.assetId);
                    mentions.push(mention);
                }
                continue;
            }

            for (const mention of outputImageMentions(source.id, data)) {
                if (seen.has(mention.assetId)) continue;
                seen.add(mention.assetId);
                mentions.push(mention);
            }
        }
        return mentions;
    }, [imageEdges, sources]);
}
