export interface SnapResult {
    snappedTime: number;
    isSnapped: boolean;
    snapPoint?: number;
}

/**
 * Stateless snap used for drop-targets and simple cases:
 * returns the closest snap point within `thresholdPixels` of `proposedTime`.
 */
export function calculateSnap(
    proposedTime: number,
    snapPoints: number[],
    zoomLevel: number,
    thresholdPixels: number = 8
): SnapResult {
    const thresholdSeconds = thresholdPixels / zoomLevel;
    let closestPoint: number | null = null;
    let minDistance = Infinity;

    for (const point of snapPoints) {
        const distance = Math.abs(proposedTime - point);
        if (distance <= thresholdSeconds && distance < minDistance) {
            minDistance = distance;
            closestPoint = point;
        }
    }

    if (closestPoint !== null) {
        return { snappedTime: closestPoint, isSnapped: true, snapPoint: closestPoint };
    }

    return { snappedTime: proposedTime, isSnapped: false };
}

export type SnapEdge = 'start' | 'end';

export interface EdgeSnapResult {
    start: number;
    /** Snap line to highlight in the timeline, if any edge is snapped. */
    snapPoint: number | null;
    snappedEdge: SnapEdge | null;
}

/**
 * Sticky stateful snapper for clip-move gestures.
 *
 * Both edges (start & end) of the moving clip are compared against the snap
 * points and the closest one wins. While an edge stays locked on a point the
 * lock is only released after the pointer moves `releaseFactor` beyond the
 * engage threshold — this hysteresis prevents the flicker/jitter that made
 * butting clips against each other feel impossible before.
 */
export function createClipSnapper(
    snapPoints: number[],
    zoomLevel: number,
    options: { thresholdPixels?: number; releaseFactor?: number } = {},
) {
    const thresholdPixels = options.thresholdPixels ?? 8;
    const releaseFactor = options.releaseFactor ?? 2.2;
    let locked: { edge: SnapEdge; point: number } | null = null;

    const reset = () => {
        locked = null;
    };

    const snap = (rawStart: number, duration: number, edges: readonly SnapEdge[] = ['start', 'end']): EdgeSnapResult => {
        const engage = thresholdPixels / zoomLevel;
        const release = engage * releaseFactor;

        // Keep the existing lock while the edge is within the release distance.
        if (locked && edges.includes(locked.edge)) {
            const edgeTime = locked.edge === 'start' ? rawStart : rawStart + duration;
            if (Math.abs(edgeTime - locked.point) <= release) {
                const start = locked.edge === 'start'
                    ? locked.point
                    : locked.point - duration;
                return { start: Math.max(0, start), snapPoint: locked.point, snappedEdge: locked.edge };
            }
        }
        locked = null;

        // Find the closest (edge, point) pair inside the engage threshold.
        let bestEdge: SnapEdge = 'start';
        let bestPoint = 0;
        let bestDistance = Infinity;
        const consider = (edge: SnapEdge, edgeTime: number) => {
            for (const point of snapPoints) {
                const distance = Math.abs(edgeTime - point);
                if (distance <= engage && distance < bestDistance) {
                    bestDistance = distance;
                    bestEdge = edge;
                    bestPoint = point;
                }
            }
        };
        if (edges.includes('start')) consider('start', rawStart);
        if (edges.includes('end')) consider('end', rawStart + duration);

        if (!Number.isFinite(bestDistance)) {
            return { start: rawStart, snapPoint: null, snappedEdge: null };
        }

        locked = { edge: bestEdge, point: bestPoint };
        const start = bestEdge === 'start'
            ? bestPoint
            : bestPoint - duration;
        return { start: Math.max(0, start), snapPoint: bestPoint, snappedEdge: bestEdge };
    };

    return { snap, reset };
}
