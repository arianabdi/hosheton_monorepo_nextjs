'use client';

import { use } from 'react';
import { ExploreDetailOverlay } from '@/app/(marketplace)/explore/components/ExploreDetailOverlay';
import { decodeSegments, resolveExplorePath } from '@/app/(marketplace)/lib/explore-taxonomy';
import { useTemplateCategoryTree } from '@/app/(marketplace)/lib/useTemplateCategoryTree';

/**
 * Soft navigation from /explore intercepts /explore/<...path> here:
 * the grid underneath stays mounted (scroll + loaded pages preserved) while the URL already
 * shows the shareable link. Category paths render nothing — the grid underneath reads the
 * pathname and switches its category filter (see ExploreMasonry).
 */
export default function InterceptedExplorePath({
    params,
}: {
    params: Promise<{ path: string[] }>;
}) {
    const { path } = use(params);
    // Params arrive percent-encoded for Persian slugs; decode before matching/fetching.
    const segments = decodeSegments(path);
    const { nodes, loaded } = useTemplateCategoryTree();
    if (!loaded) return null;

    const resolution = resolveExplorePath(segments, nodes);
    if (resolution.kind !== 'template') return null;
    return <ExploreDetailOverlay key={resolution.slug} slugKey={resolution.slug} />;
}
