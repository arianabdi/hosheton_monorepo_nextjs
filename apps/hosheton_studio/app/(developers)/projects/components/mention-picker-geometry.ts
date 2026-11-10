/** Geometry for the @ mention picker. Pure so placement can be tested without a browser. */

export interface MentionRect {
    top: number;
    left: number;
    bottom: number;
    width: number;
    height: number;
}

export interface MentionViewport {
    width: number;
    height: number;
    offsetTop?: number;
    offsetLeft?: number;
    /** Layout-viewport height (the box `position: fixed` resolves against) — used for `bottom`. */
    layoutHeight?: number;
}

export interface MentionPickerLayout {
    left: number;
    top: number;
    width: number;
    maxHeight: number;
    opensAbove: boolean;
    /**
     * Above placement: distance from the picker's bottom edge to the layout-viewport bottom.
     * Anchoring by `bottom` keeps a short list glued to the caret instead of floating at `top`.
     */
    bottom: number | null;
}

const GAP = 8;
const PAD = 8;
const MIN_WIDTH = 260;
const MAX_WIDTH = 420;
const MIN_HEIGHT = 120;
const MAX_HEIGHT = 360;
/** Below this width a docked picker spans the composer and sits right above it (not beside the caret). */
export const MENTION_DOCK_MAX_VIEWPORT = 640;

/** A collapsed caret is valid (width can be 0). A 0×0 rect is the empty-range bug that pins the picker to the page origin. */
export function isUsableCaretRect(rect: { top: number; left: number; width: number; height: number } | null | undefined): boolean {
    if (!rect) return false;
    if (!Number.isFinite(rect.top) || !Number.isFinite(rect.left)) return false;
    if (!Number.isFinite(rect.width) || !Number.isFinite(rect.height)) return false;
    return rect.width > 0 || rect.height > 0;
}

/** Prefer the live caret. Fall back to the editor box, then the wrapper — never a degenerate 0,0 rect. */
export function resolveMentionAnchor(
    caret: MentionRect | null | undefined,
    editor: MentionRect | null | undefined,
    wrapper: MentionRect | null | undefined,
): MentionRect | null {
    if (isUsableCaretRect(caret)) return caret!;
    if (isUsableCaretRect(editor)) return editor!;
    if (isUsableCaretRect(wrapper)) return wrapper!;
    return null;
}

export function mentionPickerLayout(
    caretAnchor: MentionRect,
    viewport: MentionViewport,
    preferAbove = false,
    dock?: MentionRect | null,
): MentionPickerLayout {
    const offsetTop = viewport.offsetTop ?? 0;
    const offsetLeft = viewport.offsetLeft ?? 0;
    const vpRight = offsetLeft + viewport.width;
    const vpBottom = offsetTop + viewport.height;
    const layoutHeight = viewport.layoutHeight ?? vpBottom;
    const docked = Boolean(
        preferAbove && dock && isUsableCaretRect(dock) && viewport.width < MENTION_DOCK_MAX_VIEWPORT,
    );
    const anchor = docked ? dock! : caretAnchor;
    const width = docked
        ? Math.min(Math.max(160, anchor.width), viewport.width - PAD * 2)
        : Math.min(
            MAX_WIDTH,
            Math.max(MIN_WIDTH, anchor.width || 0),
            Math.max(160, viewport.width - PAD * 2),
        );
    let left = anchor.left;
    if (left + width > vpRight - PAD) left = vpRight - PAD - width;
    if (left < offsetLeft + PAD) left = offsetLeft + PAD;

    const anchorBottom = anchor.bottom ?? anchor.top + anchor.height;
    const spaceBelow = vpBottom - anchorBottom - GAP;
    const spaceAbove = anchor.top - offsetTop - GAP;
    const opensAbove = (preferAbove && spaceAbove >= (docked ? MIN_HEIGHT : 160))
        || (spaceBelow < 220 && spaceAbove > spaceBelow);

    if (opensAbove) {
        const maxHeight = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, spaceAbove - PAD));
        const top = Math.max(offsetTop + PAD, anchor.top - GAP - maxHeight);
        const fitted = Math.max(MIN_HEIGHT, Math.min(maxHeight, anchor.top - GAP - top));
        const bottom = Math.max(PAD, layoutHeight - (anchor.top - GAP));
        return { left, top, width, maxHeight: fitted, opensAbove: true, bottom };
    }

    const maxHeight = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, spaceBelow - PAD));
    let top = anchorBottom + GAP;
    const used = Math.min(maxHeight, Math.max(spaceBelow, MIN_HEIGHT));
    if (top + used > vpBottom - PAD) {
        top = Math.max(offsetTop + PAD, vpBottom - PAD - used);
    }
    return { left, top, width, maxHeight, opensAbove: false, bottom: null };
}

/** Clamp arrow-key movement inside the visible mention list. */
export function stepMentionIndex(current: number, direction: -1 | 0 | 1, count: number): number {
    if (count <= 0) return 0;
    const next = current + direction;
    if (next < 0) return 0;
    if (next >= count) return count - 1;
    return next;
}
