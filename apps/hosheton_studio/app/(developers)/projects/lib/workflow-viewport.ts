export type WorkflowViewport = {
    x: number;
    y: number;
    zoom: number;
};

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 2;

export function workflowViewportStorageKey(projectId: string) {
    return `hosheton-media-viewport:${projectId}`;
}

function isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}

export function clampWorkflowZoom(zoom: number): number {
    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

export function readWorkflowViewport(projectId: string): WorkflowViewport | null {
    if (typeof window === 'undefined' || !projectId) return null;
    try {
        const raw = localStorage.getItem(workflowViewportStorageKey(projectId));
        if (!raw) return null;
        const parsed = JSON.parse(raw) as Partial<WorkflowViewport>;
        if (!isFiniteNumber(parsed.x) || !isFiniteNumber(parsed.y) || !isFiniteNumber(parsed.zoom)) {
            return null;
        }
        return {
            x: parsed.x,
            y: parsed.y,
            zoom: clampWorkflowZoom(parsed.zoom),
        };
    } catch {
        return null;
    }
}

export function writeWorkflowViewport(projectId: string, viewport: WorkflowViewport): void {
    if (typeof window === 'undefined' || !projectId) return;
    if (!isFiniteNumber(viewport.x) || !isFiniteNumber(viewport.y) || !isFiniteNumber(viewport.zoom)) {
        return;
    }
    try {
        localStorage.setItem(workflowViewportStorageKey(projectId), JSON.stringify({
            x: viewport.x,
            y: viewport.y,
            zoom: clampWorkflowZoom(viewport.zoom),
        }));
    } catch {
        // Quota / private mode — viewport restore is optional.
    }
}
