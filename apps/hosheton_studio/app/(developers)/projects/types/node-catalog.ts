export type NodeSettingFieldType =
    | 'text'
    | 'textarea'
    | 'number'
    | 'select'
    | 'provider-select'
    | 'model-select'
    | 'checkbox'
    | 'avatar-select'
    | 'slider'
    | 'derived';

export interface NodeSettingFieldOption {
    value: string;
    label: string;
    /** Studio-only SVG markup for select chips. Not sent to providers. */
    iconSvg?: string;
    /**
     * Studio-only sample media URL (audio / image / video) so the user can
     * preview the selected option — e.g. a generated voice sample for
     * ElevenLabs voice options. Not sent to providers.
     */
    preview?: string;
}

/**
 * How a `select` field's options render in the Studio (set per field in Naslyar).
 * `auto` picks grid for icons/visual previews, list for audio previews, chips otherwise.
 */
export type NodeSettingOptionsDisplay = 'auto' | 'chips' | 'grid' | 'list' | 'dropdown';

/** Which option previews are shown. Missing keys mean enabled. */
export interface NodeSettingOptionsPreview {
    icon?: boolean;
    audio?: boolean;
    image?: boolean;
    video?: boolean;
}

/**
 * Fully data-driven "options from an arbitrary URL" source. Fetched live via
 * `POST /api/ai/options/fetch` (server-side, no CORS). Placeholders resolved at
 * request time: `{{baseUrl}}`, `{{apiKey}}`, `{{metadata.<key>}}` — using the
 * node's selected provider active account.
 *
 * Example (ElevenLabs voices):
 *   url: '{{baseUrl}}/voices', headers: { 'xi-api-key': '{{apiKey}}' },
 *   itemsPath: 'voices', valuePath: 'voice_id', labelPath: 'name'
 */
export interface NodeSettingUrlSource {
    url: string;
    method?: 'GET' | 'POST';
    headers?: Record<string, string>;
    query?: Record<string, string>;
    body?: Record<string, unknown>;
    /** Dot path to the array inside the response, e.g. `voices` or `data.items`. */
    itemsPath?: string;
    /** Dot path to the `value` inside each item, e.g. `voice_id`. */
    valuePath?: string;
    /** Dot path to the `label` inside each item, e.g. `name`. */
    labelPath?: string;
    /**
     * Dot path to a preview/sample media URL inside each item (passed through as
     * `option.preview`). Defaults to `preview_url` (ElevenLabs voices shape).
     */
    previewPath?: string;
}

export interface NodeSettingField {
    key: string;
    label: string;
    labelFa?: string;
    type: NodeSettingFieldType;
    placeholder?: string;
    options?: NodeSettingFieldOption[];
    /** `select` only — option layout in the Studio. Default `auto`. */
    optionsDisplay?: NodeSettingOptionsDisplay;
    /** `select` only — enable/disable icon/audio/image/video option previews. */
    optionsPreview?: NodeSettingOptionsPreview;
    providerClass?: 'text' | 'image' | 'video' | 'audio' | '3d';
    min?: number;
    max?: number;
    /** Step size for `number` / `slider` fields (defaults to 1). */
    step?: number;
    /**
     * When set, options are fetched live from `GET /api/ai/:provider/options/:resource`
     * (provider resolved from the node's selected `providerName`) instead of `options`.
     */
    optionsSource?: string;
    /**
     * When set, options are fetched live from an arbitrary URL via the generic
     * `POST /api/ai/options/fetch` endpoint instead of static `options` or the
     * provider-scoped `optionsSource`. Fully data-driven — any API can be wired.
     */
    urlSource?: NodeSettingUrlSource;
    /**
     * Derived/composite field (`type: 'derived'`): value is computed client-side
     * from the current values of these fields — see lib/derived-settings.ts.
     * Array order defines the combo-key order used by `mapping`.
     */
    dependsOn?: string[];
    /** Mapping table for `derived`: combo key (`"16:9|1K"`) → final value. */
    mapping?: Record<string, string>;
    /**
     * `derived` only. `false` hides the field from the end user while its
     * computed value still reaches the request. Default (absent/true): shown.
     */
    showToUser?: boolean;
    /** Free-form help text shown under the field (Farsi). */
    hintFa?: string;
    /**
     * Full help text (Farsi) shown inside the help modal when the user taps the
     * exclamation icon next to the field title in chat & workflow. When missing,
     * the icon is not shown at all.
     */
    helpFa?: string;
    /**
     * Default value applied when the user has not set this setting (written in
     * Naslyar). Used by the help modal to tell the user what happens by default.
     */
    default?: unknown;
}

export interface NodeCatalogEntry {
    _id: string;
    type: string;
    category: string;
    label: string;
    labelFa: string;
    description?: string;
    descriptionFa?: string;
    icon?: string;
    defaultData?: Record<string, unknown>;
    settingsFields?: NodeSettingField[];
    providerClass?: string;
    executable?: boolean;
    passthrough?: boolean;
    isActive?: boolean;
    sortOrder?: number;
}

export interface NodeCatalogListResponse {
    nodes: NodeCatalogEntry[];
    totalItems: number;
}

export type EdgeTypeOption = 'smoothstep' | 'step' | 'straight' | 'default' | 'simplebezier';

export const EDGE_TYPE_OPTIONS: { value: EdgeTypeOption; label: string }[] = [
    { value: 'smoothstep', label: 'Smooth Step' },
    { value: 'step', label: 'Step' },
    { value: 'straight', label: 'Straight' },
    { value: 'default', label: 'Bezier' },
    { value: 'simplebezier', label: 'Simple Bezier' },
];

export const EDGE_TYPE_LABEL_KEYS: Record<EdgeTypeOption, string> = {
    smoothstep: 'edge_smoothstep',
    step: 'edge_step',
    straight: 'edge_straight',
    default: 'edge_default',
    simplebezier: 'edge_simplebezier',
};

export const CATEGORY_LABEL_KEYS: Record<string, string> = {
    trigger: 'category.trigger',
    annotation: 'category.annotation',
    input: 'category.input',
    avatar: 'category.avatar',
    generation: 'category.generation',
    control: 'category.control',
    logic: 'category.logic',
    output: 'category.output',
    container: 'category.container',
};
