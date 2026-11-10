/**
 * Level Design — help section content.
 * TWO guides by convention: one for the users of the editor, one for the
 * developers who extend it. Keep both in sync with behavior changes
 * (see AGENTS.md — "every new feature ships its guide update").
 */
import type {HelpSection} from '../helpGuideTypes';

export const levelDesignSection: HelpSection = {
    id: 'level-design',
    title: 'Level Design',
    icon: '🗺️',
    route: '/rooster/level-deisgn',
    guides: [
        {
            id: 'user',
            title: 'Level Design — User Guide',
            audience: 'user',
            description: 'Design game levels by drawing on a vector map, chatting with the AI designer, and reviewing the result in 3D.',
            topics: [
                {
                    id: 'overview',
                    title: 'What is the Level Designer?',
                    blocks: [
                        {type: 'p', text: 'The Level Designer lets you build a game level as a vector document instead of pixels or 3D meshes. You draw areas (regions), lines (paths) and points (props) on a 2D map, set rules on them, and a low-poly 3D viewport renders the same document instantly. Everything — every hill, forest, road, building, spawn point — is plain data, which is why the AI designer can create and edit it from a chat prompt.'},
                        {type: 'p', text: 'Levels live inside a game: open Levels from the game card, create a level, then click it to open the editor. Saving is automatic — the status pill in the header shows "Saved · r123" and every change is pushed to the server after about a second.'},
                        {type: 'ul', items: [
                            '2D vector map — draw and edit the world plan (machine-readable, AI-editable).',
                            '3D low-poly viewport — the same world rendered with terrain, water, vegetation and buildings.',
                            'Split view — map and 3D side by side (default).',
                            'AI Designer — describe changes in plain language (English or Persian).',
                        ]},
                    ],
                },
                {
                    id: 'drawing',
                    title: 'Drawing: regions, paths and props',
                    blocks: [
                        {type: 'p', text: 'Pick a brush from the left palette, then draw on the map. The first click on any object selects it; dragging an already-selected object moves it. Dragging empty space pans the map, and the wheel zooms.'},
                        {type: 'ul', items: [
                            'Region brush — click to add polygon points; click the first point (or double-click) to close. Regions are areas: forest, grass, water, urban, danger…',
                            'Path brush — click to add polyline points; double-click to finish. Paths are roads, rivers, trails, walls and rails. Width is in meters.',
                            'Prop brush — every click stamps one object: trees, rocks, houses, towers, NPCs, enemies, chests, portals, spawn points…',
                            'Select / move (V) — click to select, drag the selected object to move it, double-click to fly the 3D camera to it.',
                        ]},
                        {type: 'note', text: 'Hand-drawn elements are "locked" automatically (lock icon on the map). Locked elements are protected from AI rewrites — the server restores them even if the AI tries to remove them.'},
                    ],
                },
                {
                    id: 'height',
                    title: 'Height: hills, plateaus, trenches and floating structures',
                    blocks: [
                        {type: 'p', text: 'The world is 2.5D: the ground has real height. The base terrain comes from the seed/roughness sliders in World settings, and you add explicit height with elevation rules on regions.'},
                        {type: 'ol', items: [
                            'Arm a height preset in the palette: Hill (+15m), Plateau (+35m) or Trench (−12m) — or leave it on None.',
                            'Pick any region kind (e.g. Forest) and draw the polygon. The polygon becomes terrain height: the 3D viewport raises/lowers the ground smoothly.',
                            'Select the region to fine-tune it in the Inspector: exact height (−200..+200 m) and edge smoothing (0 = cliff, 1 = maximal ramp).',
                        ]},
                        {type: 'p', text: 'Everything follows the new surface automatically: vegetation, paths, bridges and buildings sit on the raised ground without extra work.'},
                        {type: 'ul', items: [
                            'Stack elevation zones for terraces (e.g. +10m, +25m, +40m rings).',
                            'Negative heights dig valleys/canyons — combine with a water level for lakes.',
                            'A building on a hill: just place the prop on the elevated region.',
                            'Floating structures: select a prop and set "Height above ground (z)" — bridges, platforms and rooftop markers hang in the air, shown with a small ↥ marker on the map.',
                        ]},
                        {type: 'note', tone: 'warn', text: 'The map readout (bottom-left) shows the live ground height under your cursor — handy for checking elevation before placing a spawn point.'},
                    ],
                },
                {
                    id: 'rules',
                    title: 'Rules: auto-fill vegetation and path decorations',
                    blocks: [
                        {type: 'p', text: 'Instead of placing hundreds of trees one by one, give a region a population rule: one polygon plus a density law. Every renderer derives the same vegetation from the same seed.'},
                        {type: 'ul', items: [
                            'Population rule (regions): density (props per m²), tree/pine/rock mix, scale range, seed (press the dice for a new layout), keep-clear options for paths and water.',
                            'Fill rule (paths): place a prop every N meters along the line — lamps, fences, flags — left/right/center with a scale.',
                        ]},
                        {type: 'p', text: 'Both rules live in the Inspector when a region/path is selected. They are ordinary document data, so the AI can read and edit them too.'},
                    ],
                },
                {
                    id: 'filters',
                    title: 'Layers and category filters',
                    blocks: [
                        {type: 'p', text: 'The four header chips (Terrain · Nature · Structures · Gameplay) toggle whole layer groups. The funnel button next to them opens the full visibility panel:'},
                        {type: 'ul', items: [
                            'View layers — the same four groups as switches.',
                            'Region / Path / Prop categories — one switch per vocabulary kind, with a live count of how many exist in this level. Hide every "road" but keep "rivers", hide all "enemy" props while you decorate, …',
                            'All / None per group, and Reset to bring everything back.',
                        ]},
                        {type: 'note', text: 'Filters only change what you see — nothing is deleted, and the AI still sees the full document. For hiding a single element (not a whole kind), use the eye toggle in the Scene tree.'},
                    ],
                },
                {
                    id: 'gizmo',
                    title: 'Transform gizmo (move / rotate / scale)',
                    blocks: [
                        {type: 'p', text: 'Select a prop with the select tool (V) and a Unity-style gizmo appears around it — on the 2D map AND in the 3D viewport. Gizmo handles always win the click: clicking a handle never selects another object behind it.'},
                        {type: 'ul', items: [
                            '2D map — center square: free move · red X arrow: east/west only · green Y arrow: north/south only · ring corners: uniform scale · blue ↻ handle: rotate.',
                            '3D viewport — the mode buttons sit at the top-left of the viewport (or M / R / S): Move, Rotate, Scale.',
                            '3D Move — the vertical Y handle changes the height ABOVE GROUND (the z offset): drag sideways and the prop sticks to the terrain, drag up and it floats.',
                            '3D Rotate — all THREE angles: yaw (rotation on the map), pitch (tilt around the east axis) and roll (tilt around the south axis). Lay a tree down with pitch 90°; fine-tune the same values in the Inspector.',
                            '3D Scale — uniform, snapped to 0.1.',
                        ]},
                        {type: 'p', text: 'You can still drag the object body itself for a plain move. Every gizmo drag is one undo step (Ctrl+Z). Dragging the gizmo temporarily disables camera orbit; drag empty space to orbit again.'},
                    ],
                },
                {
                    id: 'scene-tree',
                    title: 'Scene tree (outliner)',
                    blocks: [
                        {type: 'p', text: 'The left column of the editor has two tabs: Tools (the brushes) and Scene — a collapsible tree of every element in the level, grouped into Regions, Paths and Props.'},
                        {type: 'ul', items: [
                            'Click a row to select it (the Inspector opens its settings); double-click to fly the 3D camera to it.',
                            'Eye icon — hide/show that single element in BOTH views (item-level, independent of the layer/category filters).',
                            'Lock icon — protect the element from AI rewrites.',
                            'Badges show elevation on regions (⛰ +18m) and z-offsets on props (↥12m).',
                            'The search box filters by name; the tab badge shows the total element count.',
                        ]},
                    ],
                },
                {
                    id: 'ai-designer',
                    title: 'AI Designer (chat)',
                    blocks: [
                        {type: 'p', text: 'Open the AI Designer from the header (the sparkle button). Describe what you want in plain English or Persian — the model returns an edited world document and both views update instantly. The chat history is saved per level and survives reloads.'},
                        {type: 'ul', items: [
                            '"Build a small village by the river and connect a road from the west."',
                            '"Raise a forested hill (+20m) in the north-east."',
                            '"Put a danger zone between the spawn and the boss."',
                            'With something selected, "this one" refers to the selected region/path/prop.',
                        ]},
                        {type: 'note', tone: 'warn', text: 'Locked (hand-placed) elements are never moved or removed by the AI — it works around them. Unlock an element in the Inspector if you want the AI to manage it.'},
                    ],
                },
                {
                    id: 'vocab',
                    title: 'Custom brushes (vocabulary) & 3D models',
                    blocks: [
                        {type: 'p', text: 'The brush library is a vocabulary: region kinds, path kinds and prop types. The Vocabulary page (per game) lists them and lets the AI Librarian add new ones — "add a lava region kind with an orange color" — including color and visibility layer. Custom kinds appear in the palette, the filters and the AI prompt automatically.'},
                        {type: 'p', text: 'Each entry carries more than a name — open the ⚙ button on a row to edit everything:'},
                        {type: 'ul', items: [
                            'Description — what the brush means; shown in the library and given to the AI prompts.',
                            'Slug — the unique handle. Labels may repeat ("Tree", "درخت"), slugs never do; duplicates get -2/-3 suffixes automatically. Exports and deep links reference slugs.',
                            '3D model (prop types) — pick from the built-in lightweight library (procedural primitives with their real vertex counts) or upload your own .glb/.gltf. The server reads the vertex count and file size from the upload and shows weight badges: 🟢 ≤ 10k verts & ≤ 2MB, 🟡 medium, 🔴 heavy. Hard limit 15MB — the level library must stay light.',
                        ]},
                        {type: 'note', text: 'Attached models are the engine/export handoff reference. The web 3D viewport still renders its procedural meshes — attach the model so Unity/Unreal imports and future renderers know exactly which asset, slug and weight class to load.'},
                    ],
                },
                {
                    id: 'shortcuts',
                    title: 'Shortcuts',
                    blocks: [
                        {type: 'p', text: 'Letter shortcuts follow the physical key position, so they work on any Windows keyboard language (Persian, Arabic, …). Press ? (or F1) anytime to reopen this list.'},
                        {type: 'kbd-list', items: [
                            {keys: ['V'], desc: 'Select / move tool'},
                            {keys: ['Q'], desc: 'Region brush'},
                            {keys: ['P'], desc: 'Path brush'},
                            {keys: ['B'], desc: 'Prop brush'},
                            {keys: ['M'], desc: '3D gizmo: move (Y handle = height)'},
                            {keys: ['R'], desc: '3D gizmo: rotate (yaw · pitch · roll)'},
                            {keys: ['S'], desc: '3D gizmo: uniform scale'},
                            {keys: ['1'], desc: 'Map view'},
                            {keys: ['2'], desc: '3D view'},
                            {keys: ['3'], desc: 'Split view'},
                            {keys: ['Ctrl', 'Z'], desc: 'Undo'},
                            {keys: ['Ctrl', 'Y'], desc: 'Redo (or Ctrl+Shift+Z)'},
                            {keys: ['Ctrl', 'S'], desc: 'Save now'},
                            {keys: ['Delete'], desc: 'Delete selection'},
                            {keys: ['Esc'], desc: 'Close drawer → exit fullscreen → cancel draft → deselect'},
                        ]},
                        {type: 'ul', items: [
                            '3D viewport: drag = orbit, Ctrl+drag = pan, wheel = zoom.',
                            '2D map: drag empty space = pan, wheel = zoom, drag selected object = move.',
                        ]},
                    ],
                },
                {
                    id: 'lint-export',
                    title: 'Checking and exporting',
                    blocks: [
                        {type: 'p', text: 'World settings (the sliders button) opens the document Inspector: name, terrain size, roughness, water level, counts — and the pre-export lint. The linter catches the classic mistakes: no spawn point, spawn in water or on a steep slope, boss without a reachable path, danger/safe overlaps.'},
                        {type: 'p', text: 'The download button exports the world JSON exactly as a Unity/Unreal importer would consume it (document + manifest + revision). Everything is deterministic: the same seed and the same rules rebuild the identical terrain in every engine.'},
                    ],
                },
            ],
        },
        {
            id: 'developer',
            title: 'Level Design — Developer Guide',
            audience: 'developer',
            description: 'Architecture, file map, DSL contract and APIs of the level designer — what to touch and what to keep in sync.',
            topics: [
                {
                    id: 'architecture',
                    title: 'Architecture: one document, pure views',
                    blocks: [
                        {type: 'p', text: 'The editor is a single-source-of-truth design. A World DSL document (plain JSON) lives in a zustand store; the 2D SVG map, the 3D (react-three-fiber) viewport, the Inspector and the AI panel are all pure views of it. Mutating the store updates every view instantly, and a debounced autosave PUTs the whole document to the API.'},
                        {type: 'code', lang: 'text', code: 'level-store (zustand) ── WorldData ──┬─ Map2DEditor   (SVG, 2D plan)\n                                        ├─ Viewport3D    (R3F low-poly render)\n                                        ├─ Inspector     (selection/world settings)\n                                        └─ AiPanel ────── levelsApi.aiDesign → server normalizes → setWorld()'},
                        {type: 'ul', items: [
                            'Never store render state in the document — everything visual is derived (scatter, fill, elevation surface).',
                            'All mutations go through update()/setWorld() so undo/redo history and autosave stay consistent.',
                            'The server re-normalizes every incoming document (normalizeWorldData) — clients can send partial/dirty JSON safely.',
                        ]},
                    ],
                },
                {
                    id: 'file-map',
                    title: 'File map (frontend)',
                    blocks: [
                        {type: 'table', head: ['Path', 'Role'], rows: [
                            ['app/rooster/level-deisgn/[levelId]/page.tsx', 'Editor shell: header, panes, right-sidebar slots, global shortcuts, autosave'],
                            ['…/level-deisgn/lib/level-store.ts', 'zustand store: world, selection, tools, brush, layers, category + item filters, history'],
                            ['…/level-deisgn/lib/world-dsl.ts', 'DSL types + deterministic terrain/elevation math + linter mirror (keep in sync with the server copy!)'],
                            ['…/level-deisgn/lib/levels-api.ts', 'API client: levels CRUD, saveWorld, aiDesign, vocab, vocab model catalog, chat, export, lint'],
                            ['…/level-deisgn/lib/vocab-store.ts', 'Brush vocabulary store (built-ins + custom entries) and color/layer resolvers'],
                            ['…/level-deisgn/components/Map2DEditor.tsx', '2D SVG editor: draw/move/pan/zoom, transform gizmo, elevation badges, ground-height readout'],
                            ['…/level-deisgn/components/Viewport3D(.Inner).tsx', 'R3F scene: terrain mesh, region pads, ribbons, scatter, prop meshes, camera rig'],
                            ['…/level-deisgn/components/LeftDock.tsx', 'Left column tabs: Tools (palette) | Scene (outliner)'],
                            ['…/level-deisgn/components/Palette.tsx', 'Tools tab: tool buttons, brushes, height presets'],
                            ['…/level-deisgn/components/SceneTree.tsx', 'Scene tab: collapsible outliner with per-item visibility/lock, search, badges'],
                            ['…/level-deisgn/components/Inspector.tsx', 'Selection/world settings, population/fill/elevation rules, lint'],
                            ['…/level-deisgn/components/AiPanel.tsx', 'AI chat (world + vocab modes), persisted history'],
                            ['…/level-deisgn/components/CategoryFilterMenu.tsx', 'Visibility panel: layer + per-kind switches'],
                            ['…/level-deisgn/components/ShortcutsModal.tsx', 'ModalHelper-based shortcut reference (? / F1)'],
                            ['…/level-deisgn/vocab/page.tsx', 'Vocabulary library page (rows + editor modal + AI librarian)'],
                            ['…/level-deisgn/vocab/VocabEntryEditor.tsx', 'Entry editor: description, slug, 3D model picker/uploader with weight badges'],
                        ]},
                        {type: 'note', text: 'The folder is spelled "level-deisgn" (historic typo). Keep new links consistent with it rather than forking a second spelling.'},
                    ],
                },
                {
                    id: 'dsl',
                    title: 'World DSL contract',
                    blocks: [
                        {type: 'p', text: 'WorldData = { version, name, description, units, terrain, regions[], paths[], props[] }. Meters, y grows south, height is up. The terrain surface is deterministic:'},
                        {type: 'code', lang: 'ts', code: 'groundHeightAt(x, y, world)\n  = terrainHeightAt(x, y, terrain)          // seed + roughness formula\n  + Σ elevationOffsetAt(x, y, region)      // regions with meta.elevation'},
                        {type: 'ul', items: [
                            'meta.elevation on regions: {height: -200..200, falloff: 0..1} — smoothstep ramp from the polygon edge to the core; 0 falloff = cliff. Normalized server-side.',
                            'meta.z on props: height above ground (-500..500) — floating platforms, bridge decks. Rendered with an anchor stem in 3D.',
                            'prop.pitch / prop.roll (optional, degrees 0..360): the two remaining 3D rotation axes (yaw lives in `rotation`). The server normalizer wraps them and omits 0; the 3D gizmo (rotate mode) and the Inspector both drive them.',
                            'meta.population on regions and meta.fill on paths: deterministic derive rules (same seed ⇒ same scatter everywhere).',
                            'locked: true protects hand-placed work — mergeLockedElements() re-applies locked items after every AI rewrite.',
                        ]},
                        {type: 'note', tone: 'warn', text: 'world-dsl.ts exists TWICE: apps/rooster_arcade_studio/.../lib/world-dsl.ts and my-workspace-api/apps/roosterarcade/src/level-design/world-dsl.ts. Any contract change must land in BOTH files (types, terrain/elevation math, limits) — engines mirror the same formula.'},
                    ],
                },
                {
                    id: 'api',
                    title: 'API surface (roosterarcade)',
                    blocks: [
                        {type: 'table', head: ['Endpoint', 'Purpose'], rows: [
                            ['GET /api/level-design/levels', 'List levels (optionally by gameId)'],
                            ['POST /api/level-design/levels', 'Create level (starter world)'],
                            ['GET/PATCH/DELETE /api/level-design/levels/:id', 'Fetch / rename / delete'],
                            ['PUT /api/level-design/levels/:id/world', 'Autosave: full-document sync with optimistic revision (clientRevision)'],
                            ['GET /api/level-design/levels/:id/export', 'Engine handoff: DSL + manifest + lint'],
                            ['GET /api/level-design/levels/:id/lint', 'Server-side pre-export checks'],
                            ['POST /api/level-design/ai', 'Prompt → edited world (server normalizes + merges locked elements)'],
                            ['GET/DELETE /api/level-design/chat', 'Persisted chat threads (scopeId = levelId)'],
                            ['GET/POST/PATCH/DELETE /api/level-design/vocab', 'Brush vocabulary CRUD (label, slug, description, color, layer, model3d)'],
                            ['GET /api/level-design/vocab/models', 'Lightweight 3D model catalog (built-in procedural library + uploads)'],
                            ['POST /api/level-design/vocab/models/upload', 'Multipart .glb/.gltf upload (≤15MB) — vertex/tri counts parsed from the file, stored on object storage'],
                            ['POST /api/level-design/vocab/ai', 'AI Librarian ops (add/update/delete kinds, descriptions)'],
                        ]},
                        {type: 'p', text: 'Server modules live in my-workspace-api/apps/roosterarcade/src/level-design/: controller, service, dto, schemas, world-dsl (normalizer + linter), level-design-ai.service (prompting). The AI system prompt documents the DSL — when you extend the schema, extend the prompt in the same change so chat stays able to use the feature.'},
                    ],
                },
                {
                    id: 'filters-and-shortcuts',
                    title: 'Extending filters, gizmo & scene tree',
                    blocks: [
                        {type: 'ul', items: [
                            'Category filters: state is hiddenKinds (`${type}:${kind}` map) in level-store. Item visibility is hiddenIds (per element id, driven by the Scene tree eye). The visibility rule everywhere is layer-switch AND category-switch AND !hiddenIds[id] (see Map2DEditor / Viewport3DInner).',
                            'Transform gizmo: rendered inline in Map2DEditor when a prop is selected in select mode. Handles start a dragRef {mode: \'gizmo\'} — sizes are screen-pixels / camera.scale so they stay constant while zooming. Add new handles in the gizmo group + a branch in the gizmo move handler.',
                            'Scene tree: SceneTree.tsx reads the world document only — no extra state beyond selection/hiddenIds/locked. New element types must be added to its groups map.',
                            'Shortcuts: the global handler in [levelId]/page.tsx matches e.code (physical key) — never e.key — so layouts like Persian Windows still trigger V/Q/P/B (tools), M/R/S (3D gizmo) and 1/2/3 (views). Add new entries there, then mirror them in ShortcutsModal.tsx and the user guide.',
                            'Left dock: resizable via the drag handle (LeftDock.tsx, width persisted in localStorage); on ≤768px it turns into a drawer toggled from the header — keep new dock tabs inside that shell, not in the page body.'
                        ]},
                    ],
                },
                {
                    id: 'checklist',
                    title: 'Feature checklist',
                    blocks: [
                        {type: 'ol', items: [
                            'Schema change? Update BOTH world-dsl.ts copies (types + math + limits) and normalizeMeta on the server.',
                            'AI-editable? Document it in the system prompt (level-design-ai.service.ts) with an example.',
                            'Rendered? Update Map2DEditor (2D), Viewport3DInner (3D) and — if it affects ground placement — groundHeightAt consumers.',
                            'Editable by hand? Add Inspector controls; add a palette brush if it is a placement flow (see the height presets).',
                            'Filterable? Route visibility through layers + hiddenKinds so the funnel panel covers it.',
                            'Documented? Update this guide file (sections/level-design.tsx) — user AND developer guide — in the same PR.',
                        ]},
                    ],
                },
            ],
        },
    ],
};

export default levelDesignSection;
