import assert from 'node:assert/strict';
import test from 'node:test';
import {
    type LayoutNode,
    type PanelNode,
    type SplitNode,
    activateTab,
    collectPanelNodes,
    contentFromKey,
    contentKey,
    defaultLayout,
    dockLeaf,
    dockTab,
    findPanel,
    findPanelByKey,
    insertLeaf,
    isValidLayoutState,
    removeTab,
    resolveAreaSide,
    resolveZone,
    setSplitRatio,
    zoneRect,
} from '../app/(developers)/projects/[projectId]/newVideoEditor/utils/dock-layout.ts';

function panelOf(node: LayoutNode | null, id: string): PanelNode {
    assert.ok(node, 'tree is null');
    const found = findPanel(node, id);
    assert.ok(found, `panel ${id} not found`);
    return found;
}

function splitOf(node: LayoutNode | null): SplitNode {
    assert.ok(node && node.type === 'split', 'expected a split node');
    return node;
}

function treeKeys(node: LayoutNode | null): string[] {
    return collectPanelNodes(node).flatMap((panel) => panel.tabs);
}

test('content keys round-trip and reject unknown ids', () => {
    assert.deepEqual(contentFromKey(contentKey({ kind: 'panel', panel: 'media' })), { kind: 'panel', panel: 'media' });
    assert.deepEqual(contentFromKey('tab:settings'), { kind: 'tab', tab: 'settings' });
    assert.equal(contentFromKey('panel:nope'), null);
    assert.equal(contentFromKey('garbage'), null);
});

test('default layout places every singleton and tab exactly once', () => {
    const state = defaultLayout();
    const keys = [...treeKeys(state.root), ...state.floating.map((win) => win.key)];
    assert.equal(keys.filter((key) => key === 'panel:media').length, 1);
    assert.equal(keys.filter((key) => key === 'panel:preview').length, 1);
    assert.equal(keys.filter((key) => key === 'panel:timeline').length, 1);
    assert.equal(keys.filter((key) => key === 'panel:chat').length, 1);
    for (const tab of ['tab:logs', 'tab:settings', 'tab:export']) {
        assert.equal(keys.filter((key) => key === tab).length, 1, `${tab} placement`);
    }
    assert.ok(isValidLayoutState(state), 'default layout must validate');
});

test('dock right of a target leaf puts the dragged leaf to its right at 50%', () => {
    const state = defaultLayout();
    const media = collectPanelNodes(state.root).find((panel) => panel.tabs.includes('panel:media'))!;
    const preview = collectPanelNodes(state.root).find((panel) => panel.tabs.includes('panel:preview'))!;
    const next = dockLeaf(state.root, media.id, preview.id, 'right');
    // The preview leaf must now be a split child with media on its right.
    const previewPanel = findPanelByKey(next, 'panel:preview');
    assert.ok(previewPanel);
    // root = vertical(topRow, timeline); topRow = horizontal(inner, tabs);
    // docking media right of preview rebuilds inner as horizontal(preview, media).
    const inner = splitOf(splitOf(splitOf(next).first).first);
    assert.equal(inner.direction, 'horizontal');
    assert.equal((inner.first as PanelNode).id, previewPanel.id, 'target stays first (left)');
    assert.equal((inner.second as PanelNode).id, media.id, 'dragged leaf lands second (right)');
    assert.equal(inner.ratio, 0.5);
    assert.ok(treeKeys(next).includes('panel:media'), 'media still present');
});

test('the last surviving leaf stays a plain panel; a fresh leaf wraps the root', () => {
    const state = defaultLayout();
    let root: LayoutNode | null = state.root;
    for (const key of ['panel:media', 'panel:preview', 'tab:settings', 'tab:logs', 'tab:export']) {
        const owner = findPanelByKey(root, key)!;
        root = removeTab(root, owner.id, key).root;
    }
    // Every parent split collapsed — the timeline leaf IS the tree now.
    assert.ok(root && root.type === 'panel', 'timeline leaf survives alone');
    assert.deepEqual((root as PanelNode).tabs, ['panel:timeline']);
    // Edge-docking the only leaf is a no-op (nothing to split against).
    const wrapped = dockLeaf(root, root.id, null, 'top');
    assert.equal(wrapped?.type, 'panel');
    // Inserting a fresh leaf at a layout edge wraps the tree with a split.
    const withSettings = insertLeaf(root, 'tab:settings', null, 'left');
    const split = splitOf(withSettings);
    assert.equal(split.direction, 'horizontal');
    assert.deepEqual((split.first as PanelNode).tabs, ['tab:settings']);
    assert.ok(split.ratio < 0.5, 'edge dock takes the smaller share');
});

test('center drop merges the dragged leaf tabs into the target and removes the source', () => {
    const state = defaultLayout();
    const media = collectPanelNodes(state.root).find((panel) => panel.tabs.includes('panel:media'))!;
    const preview = collectPanelNodes(state.root).find((panel) => panel.tabs.includes('panel:preview'))!;
    const next = dockLeaf(state.root, media.id, preview.id, 'center');
    const target = panelOf(next, preview.id);
    assert.deepEqual(target.tabs, ['panel:preview', 'panel:media']);
    assert.equal(target.activeTab, 'panel:media', 'merged leaf becomes active');
    assert.equal(findPanelByKey(next, 'panel:media')?.id, preview.id, 'source leaf is gone');
});

test('moving a single tab extracts it without touching the source siblings', () => {
    const state = defaultLayout();
    const tabsPanel = collectPanelNodes(state.root).find((panel) => panel.tabs.includes('tab:logs'))!;
    const preview = collectPanelNodes(state.root).find((panel) => panel.tabs.includes('panel:preview'))!;
    const next = dockTab(state.root, 'tab:logs', tabsPanel.id, preview.id, 'bottom');
    const previewPanel = panelOf(next, preview.id);
    assert.deepEqual(previewPanel.tabs, ['panel:preview']);
    const media = collectPanelNodes(next).find((panel) => panel.tabs.includes('panel:media'))!;
    const below = dockTab(next, 'tab:logs', preview.id, media.id, 'bottom');
    const logsLeaf = collectPanelNodes(below).find((panel) => panel.tabs.includes('tab:logs'))!;
    assert.deepEqual(logsLeaf.tabs, ['tab:logs'], 'extracted tab lives in its own leaf');
    const source = panelOf(below, tabsPanel.id);
    assert.deepEqual(source.tabs, ['tab:settings', 'tab:export'], 'siblings untouched');
});

test('removing the last tab of a leaf collapses the leaf and its parent split', () => {
    const state = defaultLayout();
    const timeline = collectPanelNodes(state.root).find((panel) => panel.tabs.includes('panel:timeline'))!;
    const res = removeTab(state.root, timeline.id, 'panel:timeline');
    assert.ok(res.removed);
    assert.ok(!treeKeys(res.root).includes('panel:timeline'));
    // With the root split collapsed, the top row is the whole tree.
    assert.equal(splitOf(res.root!).direction, 'horizontal');
});

test('tab operations are no-ops for invalid requests', () => {
    const state = defaultLayout();
    const tabsPanel = collectPanelNodes(state.root).find((panel) => panel.tabs.includes('tab:logs'))!;
    assert.equal(dockTab(state.root, 'tab:logs', tabsPanel.id, tabsPanel.id, 'center'), state.root, 'self center');
    assert.equal(activateTab(state.root, tabsPanel.id, 'tab:export') === state.root, false);
    const activated = activateTab(state.root, tabsPanel.id, 'tab:export');
    assert.equal(panelOf(activated, tabsPanel.id).activeTab, 'tab:export');
    // Unknown tab / panel combinations keep identity.
    assert.equal(removeTab(state.root, tabsPanel.id, 'panel:media').removed, false);
});

test('setSplitRatio clamps and only clones the addressed path', () => {
    const state = defaultLayout();
    const root = splitOf(state.root as LayoutNode);
    const child = splitOf(root.first);
    const next = setSplitRatio(state.root, [0, 0], 0.9);
    const nextRoot = splitOf(next);
    assert.ok(nextRoot.ratio >= 0.08 && nextRoot.ratio <= 0.92, 'root untouched by deep path');
    const nextChild = splitOf(nextRoot.first);
    assert.ok(nextChild.ratio <= 0.92, 'deep ratio clamped');
    // Structural sharing: the second branch is the same object.
    assert.equal(nextRoot.second, root.second);
    assert.equal(nextChild.second, child.second);
});

test('insertLeaf docks a fresh key beside the last leaf or wraps an empty tree', () => {
    const state = defaultLayout();
    const ids = collectPanelNodes(state.root);
    const last = ids[ids.length - 1];
    const next = insertLeaf(state.root, 'panel:chat', last.id, 'right');
    const chatLeaf = collectPanelNodes(next).find((leaf) => leaf.tabs.includes('panel:chat'))!;
    assert.deepEqual(chatLeaf.tabs, ['panel:chat']);
    assert.equal(insertLeaf(null, 'panel:chat', null, 'right').type, 'panel');
});

test('zone geometry resolves 25% edge bands and layout-edge sides', () => {
    const rect = { x: 0, y: 0, width: 400, height: 200 };
    assert.equal(resolveZone(rect, 10, 100), 'left');
    assert.equal(resolveZone(rect, 390, 100), 'right');
    assert.equal(resolveZone(rect, 200, 5), 'top');
    assert.equal(resolveZone(rect, 200, 195), 'bottom');
    assert.equal(resolveZone(rect, 200, 100), 'center');
    assert.equal(resolveAreaSide(rect, 10, 100), 'left');
    assert.equal(resolveAreaSide(rect, 200, 100), null, 'area middle has no edge side');
    const band = zoneRect(rect, 'left');
    assert.deepEqual(band, { x: 0, y: 0, width: 100, height: 200 });
});

test('layout state validation rejects corrupted trees and duplicate content', () => {
    const state = defaultLayout();
    assert.ok(isValidLayoutState(JSON.parse(JSON.stringify(state))));
    const dupe = JSON.parse(JSON.stringify(state));
    // root.first = top row, .first = inner split, .first = the media leaf
    const mediaLeaf = (((dupe.root as SplitNode).first as SplitNode).first as SplitNode).first as PanelNode;
    mediaLeaf.tabs.push('panel:media');
    assert.equal(isValidLayoutState(dupe), false, 'duplicate singleton rejected');
    assert.equal(isValidLayoutState({ root: null, floating: [], hidden: [] }), false, 'missing content rejected');
    assert.equal(isValidLayoutState({ ...state, floating: 'nope' }), false);
});
