// One-off mongosh fix: unify the option icons (iconSvg) of the "Nano Banana 2"
// provider model so every icon in the chat settings panel has the same visual
// weight (24×24 viewBox, 2-unit stroke / bar width, currentColor).
//
// Problem: the aspect-ratio icons shared stroke-width="16" but had different
// viewBox sizes (148…303), so after scaling into the 16px chip slot each icon
// rendered with a different stroke thickness (1:1 thickest, 21:9 thinnest).
// The 4k icon came from a different icon set (1-unit frame vs the 2-unit frame
// of 1k/2k), and the media-resolution bars used a 137×105 viewBox with 0.1
// opacity for inactive bars.
//
// Usage:
//   docker exec -i mongodb mongosh --quiet -u admin -p strongpassword \
//     --authenticationDatabase admin hosheton < scripts/fix-nano-banana-2-option-icons.mongodb.js
//
// Run backup first (see backup command in the commit message / PR notes).

const ID = ObjectId('6aa9907b6f6133f2f7f5754a'); // google/nano-banana-2

const doc = db.providermodels.findOne({ _id: ID });
if (!doc) throw new Error('model not found: ' + ID);

const fieldOf = (key) => (doc.settingsSchema || []).find((f) => f.key === key);
const optionOf = (key, value) => {
    const f = fieldOf(key);
    return f && (f.options || []).find((o) => o.value === value);
};

// ─── safety: only proceed when the doc still carries the known broken icons ───
const checks = [
    ['aspectRatio', '1:1', 'viewBox="0 0 148 148"'],
    ['aspectRatio', '21:9', 'viewBox="0 0 303 148"'],
    ['mediaResolution', 'low', 'width="137"'],
    ['resolution', '4k', 'M4 5V19H20V5H4Z'],
];
for (const [key, value, needle] of checks) {
    const svg = (optionOf(key, value) || {}).iconSvg || '';
    if (!svg.includes(needle)) {
        throw new Error('unexpected current iconSvg for ' + key + '/' + value + ' — aborting, nothing written');
    }
}

// ─── new icons ───
// Aspect ratio: shared 24×24 viewBox, centered rect whose OUTER size keeps the
// exact ratio and fills the box, constant stroke-width 2 → identical rendered
// stroke at every chip size.
const arRect = (x, y, w, h) =>
    '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" stroke="currentColor" stroke-width="2"/></svg>';
const AR_ICONS = {
    '1:1': arRect(1, 1, 22, 22),
    '3:2': arRect(1, 5, 22, 14),
    '2:3': arRect(5, 1, 14, 22),
    '3:4': arRect(4, 1, 16, 22),
    '4:3': arRect(1, 4, 22, 16),
    '4:5': arRect(3.4, 1, 17.2, 22),
    '5:4': arRect(1, 3.4, 22, 17.2),
    '9:16': arRect(6.25, 1, 11.5, 22),
    '16:9': arRect(1, 6.25, 22, 11.5),
    '21:9': arRect(1, 7.86, 22, 8.29),
};

// Media resolution: same 24×24 grid, four equal bars (width 4, rx 1) rising
// from a common baseline; inactive bars at 0.2 opacity.
const MR_BARS = [[1, 13, 10], [7, 9, 14], [13, 5, 18], [19, 1, 22]];
const mrSvg = (active) =>
    '<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">' +
    MR_BARS.map(([x, y, h], i) =>
        '<rect x="' + x + '" y="' + y + '" width="4" height="' + h + '" rx="1"' + (i < active ? '' : ' fill-opacity="0.2"') + '/>',
    ).join('') +
    '</svg>';
const MR_ICONS = { low: mrSvg(2), medium: mrSvg(3), high: mrSvg(4) };

// Resolution 4k: official Material "4k" glyph on the same frame as 1k/2k
// (the previous 4k icon used a thinner 1-unit frame from a different set).
const RES_4K = '<svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" height="200px" width="200px" xmlns="http://www.w3.org/2000/svg"><path fill="none" d="M0 0h24v24H0z"></path><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2m0 16H5V5h14z"></path><path d="M11 15H9.5v-2h-2v2H6V9h1.5v2.5h2V9H11v6zm7.5-6h-1.75l-1.75 2.25V9H13.5v6H15v-2.25L16.75 15h1.75l-2.25-3z"></path></svg>';

let changed = 0;
for (const f of doc.settingsSchema || []) {
    if (f.key === 'aspectRatio') {
        for (const o of f.options || []) {
            if (AR_ICONS[o.value]) { o.iconSvg = AR_ICONS[o.value]; changed++; }
        }
    } else if (f.key === 'mediaResolution') {
        for (const o of f.options || []) {
            if (MR_ICONS[o.value]) { o.iconSvg = MR_ICONS[o.value]; changed++; }
        }
    } else if (f.key === 'resolution') {
        for (const o of f.options || []) {
            if (o.value === '4k') { o.iconSvg = RES_4K; changed++; }
        }
    }
}

const res = db.providermodels.updateOne({ _id: ID }, { $set: { settingsSchema: doc.settingsSchema } });
print('matched=' + res.matchedCount + ' modified=' + res.modifiedCount + ' option icons rewritten=' + changed);

// ─── verify ───
const after = db.providermodels.findOne({ _id: ID });
const ar = after.settingsSchema.find((f) => f.key === 'aspectRatio');
const mr = after.settingsSchema.find((f) => f.key === 'mediaResolution');
const rs = after.settingsSchema.find((f) => f.key === 'resolution');
print('aspectRatio viewBoxes: ' + ar.options.map((o) => (o.iconSvg.match(/viewBox="([^"]+)"/) || [])[1]).join(', '));
print('aspectRatio strokes:   ' + [...new Set(ar.options.map((o) => (o.iconSvg.match(/stroke-width="([^"]+)"/) || [])[1]))].join(', '));
print('mediaResolution sizes: ' + [...new Set(mr.options.filter((o) => o.iconSvg).map((o) => (o.iconSvg.match(/viewBox="([^"]+)"/) || [])[1]))].join(', '));
print('resolution 4k starts:  ' + rs.options.find((o) => o.value === '4k').iconSvg.slice(0, 80));
