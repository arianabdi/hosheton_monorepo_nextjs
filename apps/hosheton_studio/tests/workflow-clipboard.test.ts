import assert from 'node:assert/strict';
import test from 'node:test';
import type { Edge, Node } from '@xyflow/react';
import {
    edgesForClipboardPayload,
    expandSelectionIds,
    remapPastedEdgeEndpoints,
    selectionHasExternalEdges,
} from '../app/(developers)/projects/lib/workflow-clipboard-edges.ts';

const node = (id: string, type = 'prompt', extra: Partial<Node> = {}) => ({
    id,
    type,
    data: { label: id },
    position: { x: 0, y: 0 },
    ...extra,
}) as Node;

const edge = (id: string, source: string, target: string, targetHandle?: string) => ({
    id,
    source,
    target,
    ...(targetHandle ? { targetHandle } : {}),
}) as Edge;

test('detects external edges for a single cloned node', () => {
    const nodes = [node('prompt'), node('image', 'textToImage')];
    const edges = [edge('e1', 'prompt', 'image', 'prompt-in')];

    assert.equal(selectionHasExternalEdges(nodes, edges, ['image']), true);
    assert.equal(selectionHasExternalEdges(nodes, edges, ['prompt', 'image']), false);
    assert.equal(selectionHasExternalEdges(nodes, [], ['image']), false);
});

test('group clone treats child connections inside the group as internal', () => {
    const nodes = [
        node('group', 'customGroup'),
        node('child-a', 'prompt', { parentId: 'group' }),
        node('child-b', 'textToImage', { parentId: 'group' }),
        node('outside', 'resultGallery'),
    ];
    const edges = [
        edge('internal', 'child-a', 'child-b', 'prompt-in'),
        edge('external', 'child-b', 'outside'),
    ];

    assert.equal(selectionHasExternalEdges(nodes, edges, ['group']), true);
    const idSet = expandSelectionIds(['group'], nodes);
    const internalOnly = edgesForClipboardPayload(edges, idSet, false);
    const withExternal = edgesForClipboardPayload(edges, idSet, true);
    assert.equal(internalOnly.length, 1);
    assert.equal(internalOnly[0].id, 'internal');
    assert.equal(withExternal.length, 2);
});

test('clone without external edges omits neighbor links', () => {
    const idSet = new Set(['image']);
    const edges = [
        edge('in', 'prompt', 'image', 'prompt-in'),
        edge('out', 'image', 'gallery'),
    ];
    assert.equal(edgesForClipboardPayload(edges, idSet, false).length, 0);
    assert.equal(edgesForClipboardPayload(edges, idSet, true).length, 2);
});

test('remap keeps uncloned endpoints and rewrites the cloned node id', () => {
    const idMap = new Map([['image', 'image-copy']]);
    const incoming = remapPastedEdgeEndpoints({ source: 'prompt', target: 'image' }, idMap);
    const outgoing = remapPastedEdgeEndpoints({ source: 'image', target: 'gallery' }, idMap);

    assert.deepEqual(incoming, { source: 'prompt', target: 'image-copy' });
    assert.deepEqual(outgoing, { source: 'image-copy', target: 'gallery' });
});
