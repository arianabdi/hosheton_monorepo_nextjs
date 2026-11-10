/**
 * Guard test for the shared HScrollStrip component.
 *
 * Regression context: chat attachment strips and the template gallery tab row
 * were re-implemented at least once as flex-wrap grids, which stacked the items
 * vertically again. These assertions pin the contract in place:
 *   1. the strip SCSS keeps a single non-wrapping row with a shrink guard,
 *   2. the chat composer and the templates header render through HScrollStrip,
 *   3. no legacy flex-wrap attachment strip class comes back.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import sass from 'sass';

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = join(here, '..');

const stripScssPath = join(appRoot, 'app/components/HScrollStrip/HScrollStrip.module.scss');
const stripTsxPath = join(appRoot, 'app/components/HScrollStrip/HScrollStrip.tsx');
const chatInputPath = join(appRoot, 'app/(developers)/projects/[projectId]/chat/chatInput/ChatInput.tsx');
const templatesPagePath = join(appRoot, 'app/(developers)/templates/page.tsx');

describe('HScrollStrip guard', () => {
    it('compiles to a single non-wrapping row with a shrink guard', () => {
        const compiled = sass.compile(stripScssPath).css;
        const scrollerMatch = compiled.match(/\.scroller[^{]*\{[^}]*\}/);
        assert.ok(scrollerMatch, 'compiled CSS must contain a .scroller rule');
        const scroller = scrollerMatch[0];
        assert.match(scroller, /display:\s*flex/, 'scroller must be a flex container');
        assert.match(scroller, /flex-wrap:\s*nowrap/, 'scroller must never wrap to a second row');
        assert.match(scroller, /overflow-x:\s*auto/, 'scroller must scroll horizontally');
        // Child guard: items keep their natural size on the row.
        assert.match(compiled, /flex:\s*0\s+0\s+auto/, 'scroller children must not shrink');
    });

    it('keeps the fade + chevron scroll cue', () => {
        const source = readFileSync(stripTsxPath, 'utf8');
        assert.match(source, /fadeStart/, 'start edge fade missing');
        assert.match(source, /fadeEnd/, 'end edge fade missing');
        assert.match(source, /LuChevronLeft/, 'start scroll cue missing');
        assert.match(source, /LuChevronRight/, 'end scroll cue missing');
        assert.match(source, /setPointerCapture/, 'mouse drag-to-scroll missing');
    });

    it('chat composer renders attachments through HScrollStrip', () => {
        const source = readFileSync(chatInputPath, 'utf8');
        assert.match(
            source,
            /@\/app\/components\/HScrollStrip\/HScrollStrip/,
            'ChatInput must import the shared HScrollStrip',
        );
        assert.match(source, /<HScrollStrip/, 'ChatInput must render HScrollStrip for attachments');
        assert.doesNotMatch(
            source,
            /styles\.attachmentStrip/,
            'legacy attachmentStrip flex-wrap class must not come back',
        );
    });

    it('templates gallery header renders its tabs through HScrollStrip', () => {
        const source = readFileSync(templatesPagePath, 'utf8');
        assert.match(
            source,
            /@\/app\/components\/HScrollStrip\/HScrollStrip/,
            'templates page must import the shared HScrollStrip',
        );
        assert.match(source, /<HScrollStrip/, 'templates tab nav must render HScrollStrip');
    });
});
