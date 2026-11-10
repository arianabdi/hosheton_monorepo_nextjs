import assert from 'node:assert/strict';
import test from 'node:test';
import {
    isUsableCaretRect,
    mentionPickerLayout,
    resolveMentionAnchor,
    stepMentionIndex,
} from '../app/(developers)/projects/components/mention-picker-geometry.ts';

const desktop = { width: 1440, height: 900 };

test('a zero caret rect is rejected so the picker cannot jump to the page origin', () => {
    assert.equal(isUsableCaretRect({ top: 0, left: 0, width: 0, height: 0 }), false);
    assert.equal(isUsableCaretRect(null), false);
    assert.equal(isUsableCaretRect({ top: 480, left: 720, width: 0, height: 18 }), true);
});

test('usable caret wins over the editor box', () => {
    const caret = { top: 510, left: 640, bottom: 528, width: 0, height: 18 };
    const editor = { top: 700, left: 80, bottom: 760, width: 640, height: 60 };
    const anchor = resolveMentionAnchor(caret, editor, editor);
    assert.equal(anchor?.top, 510);
    assert.equal(anchor?.left, 640);
});

test('degenerate caret falls back to the editor, not 0,0', () => {
    const editor = { top: 640, left: 220, bottom: 700, width: 480, height: 60 };
    const anchor = resolveMentionAnchor({ top: 0, left: 0, bottom: 0, width: 0, height: 0 }, editor, null);
    assert.equal(anchor?.left, 220);
    assert.equal(anchor?.top, 640);
});

test('explore sidebar caret opens beside the caret, not at the top of the page', () => {
    const caret = { top: 520, left: 860, bottom: 538, width: 1, height: 18 };
    const layout = mentionPickerLayout(caret, { width: 1280, height: 800 }, true);
    assert.equal(layout.opensAbove, true);
    assert.ok(layout.top > 40, `picker top ${layout.top} stuck at the page origin`);
    assert.ok(layout.left <= caret.left && layout.left + layout.width >= caret.left);
    const pickerBottom = layout.top + layout.maxHeight;
    assert.ok(Math.abs(caret.top - pickerBottom - 8) < 1, `gap was ${caret.top - pickerBottom}`);
});

test('caret near the top of the viewport opens below it even when above is preferred', () => {
    const caret = { top: 12, left: 40, bottom: 30, width: 1, height: 18 };
    const layout = mentionPickerLayout(caret, desktop, true);
    assert.equal(layout.opensAbove, false);
    assert.equal(layout.top, caret.bottom + 8);
    assert.equal(layout.left, 40);
});

test('caret near the bottom opens above it', () => {
    const caret = { top: 860, left: 180, bottom: 878, width: 1, height: 18 };
    const layout = mentionPickerLayout(caret, desktop, false);
    assert.equal(layout.opensAbove, true);
    assert.ok(layout.top + layout.maxHeight <= caret.top);
});

test('caret near the right edge stays inside the viewport and still covers the caret', () => {
    const caret = { top: 400, left: 1200, bottom: 418, width: 1, height: 18 };
    const layout = mentionPickerLayout(caret, { width: 1280, height: 800 }, false);
    assert.ok(layout.left >= 8);
    assert.ok(layout.left + layout.width <= 1280 - 8);
    assert.ok(layout.left <= caret.left && layout.left + layout.width >= caret.left);
});

test('above placement anchors by bottom so a short list stays glued to the caret', () => {
    const caret = { top: 520, left: 300, bottom: 538, width: 1, height: 18 };
    const layout = mentionPickerLayout(caret, { width: 1280, height: 800, layoutHeight: 800 }, true);
    assert.equal(layout.opensAbove, true);
    assert.equal(layout.bottom, 800 - (520 - 8));
});

test('below placement has no bottom anchor', () => {
    const caret = { top: 12, left: 40, bottom: 30, width: 1, height: 18 };
    assert.equal(mentionPickerLayout(caret, desktop, true).bottom, null);
});

test('mobile docked picker spans the composer and sits right above it, not beside the caret', () => {
    const phone = { width: 390, height: 520, layoutHeight: 844 };
    const caret = { top: 470, left: 250, bottom: 488, width: 1, height: 18 };
    const composer = { top: 410, left: 12, bottom: 510, width: 366, height: 100 };
    const layout = mentionPickerLayout(caret, phone, true, composer);
    assert.equal(layout.opensAbove, true);
    assert.equal(layout.left, 12);
    assert.equal(layout.width, 366);
    assert.equal(layout.bottom, 844 - (410 - 8));
    assert.ok(layout.maxHeight <= 410 - 8 - 8);
});

test('desktop ignores the dock box and stays at the caret', () => {
    const caret = { top: 520, left: 860, bottom: 538, width: 1, height: 18 };
    const composer = { top: 480, left: 400, bottom: 600, width: 700, height: 120 };
    const layout = mentionPickerLayout(caret, { width: 1280, height: 800 }, true, composer);
    assert.ok(layout.width <= 420);
    assert.ok(layout.left <= caret.left && layout.left + layout.width >= caret.left);
});

test('arrow keys move within the image list and stop at the ends', () => {
    assert.equal(stepMentionIndex(0, 1, 4), 1);
    assert.equal(stepMentionIndex(3, 1, 4), 3);
    assert.equal(stepMentionIndex(0, -1, 4), 0);
    assert.equal(stepMentionIndex(2, -1, 4), 1);
    assert.equal(stepMentionIndex(9, 0, 3), 2);
    assert.equal(stepMentionIndex(0, 1, 0), 0);
});
