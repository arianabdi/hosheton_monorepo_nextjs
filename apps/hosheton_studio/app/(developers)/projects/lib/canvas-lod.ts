export type CanvasLod = 'full' | 'lite' | 'mini';

export const CANVAS_LOD_LITE_ZOOM = 0.5;
export const CANVAS_LOD_MINI_ZOOM = 0.32;

export function zoomToCanvasLod(zoom: number): CanvasLod {
    if (zoom < CANVAS_LOD_MINI_ZOOM) return 'mini';
    if (zoom < CANVAS_LOD_LITE_ZOOM) return 'lite';
    return 'full';
}

export function connectionRadiusForLod(lod: CanvasLod, isMobile: boolean): number {
    if (isMobile) return lod === 'full' ? 40 : 48;
    if (lod === 'mini') return 40;
    if (lod === 'lite') return 32;
    return 20;
}
