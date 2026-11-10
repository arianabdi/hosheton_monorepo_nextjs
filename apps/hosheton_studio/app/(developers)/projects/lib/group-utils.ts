import type { Node, Edge } from '@xyflow/react';

export type GroupDeleteMode = 'keepNodes' | 'withNodes';

export const GROUP_MIN_WIDTH = 320;
export const GROUP_MIN_HEIGHT = 240;

const DEFAULT_NODE_WIDTH = 300;
const DEFAULT_NODE_HEIGHT = 120;

/** Map screen center of the visible React Flow pane to flow coords (respects zoom/pan). */
export function getViewportCenterFlowPosition(
    screenToFlowPosition: (pos: { x: number; y: number }) => { x: number; y: number },
    nodeWidth = DEFAULT_NODE_WIDTH,
    nodeHeight = DEFAULT_NODE_HEIGHT,
): { x: number; y: number } {
    const pane = document.querySelector('.react-flow');
    const rect = pane?.getBoundingClientRect();
    const centerX = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const centerY = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
    const center = screenToFlowPosition({ x: centerX, y: centerY });
    return {
        x: center.x - nodeWidth / 2,
        y: center.y - nodeHeight / 2,
    };
}

export function getAbsolutePosition(node: Node, allNodes: Node[]): { x: number; y: number } {
    if (!node.parentId) return { ...node.position };
    const parent = allNodes.find((n) => n.id === node.parentId);
    if (!parent) return { ...node.position };
    const parentAbs = getAbsolutePosition(parent, allNodes);
    return {
        x: parentAbs.x + node.position.x,
        y: parentAbs.y + node.position.y,
    };
}

export function getNodeSize(node: Node): { width: number; height: number } {
    const style = node.style as { width?: number | string; height?: number | string } | undefined;
    const styleWidth = typeof style?.width === 'number' ? style.width : undefined;
    const styleHeight = typeof style?.height === 'number' ? style.height : undefined;
    const width = node.width ?? styleWidth ?? (node.type === 'customGroup' ? GROUP_MIN_WIDTH : 260);
    const height = node.height ?? styleHeight ?? (node.type === 'customGroup' ? GROUP_MIN_HEIGHT : 80);
    return { width, height };
}

export function getGroupBounds(group: Node): { x: number; y: number; width: number; height: number } {
    const { width, height } = getNodeSize(group);
    return { x: group.position.x, y: group.position.y, width, height };
}

export function isPointInsideGroup(x: number, y: number, group: Node): boolean {
    const b = getGroupBounds(group);
    return x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height;
}

export function isNodeInsideGroup(node: Node, group: Node, allNodes: Node[]): boolean {
    const abs = getAbsolutePosition(node, allNodes);
    const { width, height } = getNodeSize(node);
    const cx = abs.x + width / 2;
    const cy = abs.y + height / 2;
    return isPointInsideGroup(cx, cy, group);
}

const GROUP_PADDING = 48;

export function buildGroupNode(
    id: string,
    position: { x: number; y: number },
    width: number,
    height: number,
    label = '',
    groupColor = 'purple',
): Node {
    const w = Math.max(width, GROUP_MIN_WIDTH);
    const h = Math.max(height, GROUP_MIN_HEIGHT);
    return {
        id,
        type: 'customGroup',
        position,
        width: w,
        height: h,
        style: { width: w, height: h },
        data: { label, groupColor },
        zIndex: -1,
        selectable: true,
        draggable: true,
    };
}

export function createGroupFromNodes(
    selected: Node[],
    allNodes: Node[],
    label = '',
    groupColor = 'purple',
): Node[] {
    const movable = selected.filter((n) => n.type !== 'customGroup' && n.type !== 'note');
    if (!movable.length) return allNodes;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const node of movable) {
        const abs = getAbsolutePosition(node, allNodes);
        const { width, height } = getNodeSize(node);
        minX = Math.min(minX, abs.x);
        minY = Math.min(minY, abs.y);
        maxX = Math.max(maxX, abs.x + width);
        maxY = Math.max(maxY, abs.y + height);
    }

    const groupId = `group-${Date.now()}`;
    const groupX = minX - GROUP_PADDING;
    const groupY = minY - GROUP_PADDING;
    const groupWidth = Math.max(maxX - minX + GROUP_PADDING * 2, GROUP_MIN_WIDTH);
    const groupHeight = Math.max(maxY - minY + GROUP_PADDING * 2, GROUP_MIN_HEIGHT);

    const groupNode = buildGroupNode(groupId, { x: groupX, y: groupY }, groupWidth, groupHeight, label, groupColor);
    const selectedIds = new Set(movable.map((n) => n.id));

    const updated = allNodes.map((n) => {
        if (!selectedIds.has(n.id)) return n;
        const abs = getAbsolutePosition(n, allNodes);
        return {
            ...n,
            parentId: groupId,
            extent: 'parent' as const,
            position: {
                x: abs.x - groupX,
                y: abs.y - groupY,
            },
        };
    });

    return [groupNode, ...updated];
}

export function assignNodeToGroup(node: Node, group: Node, allNodes: Node[]): Node {
    const abs = getAbsolutePosition(node, allNodes);
    return {
        ...node,
        parentId: group.id,
        extent: 'parent',
        position: {
            x: abs.x - group.position.x,
            y: abs.y - group.position.y,
        },
    };
}

export function removeNodeFromGroup(node: Node, allNodes: Node[]): Node {
    if (!node.parentId) return node;
    const abs = getAbsolutePosition(node, allNodes);
    const { parentId: _p, extent: _e, ...rest } = node;
    return {
        ...rest,
        position: abs,
    };
}

export function sortNodesForRender(nodes: Node[]): Node[] {
    const groups = nodes.filter((n) => n.type === 'customGroup');
    const others = nodes.filter((n) => n.type !== 'customGroup');
    return [...groups, ...others];
}

export function ensureGroupDimensions(node: Node): Node {
    if (node.type !== 'customGroup') return node;
    const { width, height } = getNodeSize(node);
    const w = Math.max(width, GROUP_MIN_WIDTH);
    const h = Math.max(height, GROUP_MIN_HEIGHT);
    if (node.width === w && node.height === h) return node;
    return {
        ...node,
        width: w,
        height: h,
        style: { ...(node.style as object), width: w, height: h },
    };
}

export function deleteGroupKeepNodes(groupId: string, nodes: Node[]): Node[] {
    const childIds = new Set(nodes.filter((n) => n.parentId === groupId).map((n) => n.id));
    const withoutGroup = nodes.filter((n) => n.id !== groupId);
    return withoutGroup.map((node) => {
        if (!childIds.has(node.id)) return node;
        return removeNodeFromGroup(node, nodes);
    });
}

export function deleteGroupWithChildren(groupId: string, nodes: Node[]): Node[] {
    const childIds = new Set(nodes.filter((n) => n.parentId === groupId).map((n) => n.id));
    return nodes.filter((n) => n.id !== groupId && !childIds.has(n.id));
}

export function filterEdgesForGroupDelete(
    groupId: string,
    mode: GroupDeleteMode,
    nodes: Node[],
    edges: Edge[],
): Edge[] {
    if (mode === 'keepNodes') {
        return edges.filter((edge) => edge.source !== groupId && edge.target !== groupId);
    }
    const removedNodeIds = new Set<string>([groupId]);
    nodes.filter((n) => n.parentId === groupId).forEach((n) => removedNodeIds.add(n.id));
    return edges.filter(
        (edge) => !removedNodeIds.has(edge.source) && !removedNodeIds.has(edge.target),
    );
}

export function getGroupChildIds(groupId: string, nodes: Node[]): string[] {
    return nodes.filter((n) => n.parentId === groupId).map((n) => n.id);
}
