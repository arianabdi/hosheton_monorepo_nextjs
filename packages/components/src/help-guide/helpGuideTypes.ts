/**
 * Help-center content model.
 *
 * A SECTION is one area of the product (e.g. level-design). Each section
 * ships one or more GUIDES (typically "user" and "developer"), and each guide
 * is a list of TOPICS rendered as the middle column of the help page. Content
 * is structured blocks — no markdown runtime, no parser, i18n-ready.
 *
 * Convention (see AGENTS.md): every new product section must add a guide file
 * named after the section under help-guide/sections/ and register it in the
 * registry (sections/index.ts).
 */

export type HelpBlock =
    | {type: 'p'; text: string}
    | {type: 'ul'; items: string[]}
    | {type: 'ol'; items: string[]}
    /** Keyboard shortcut table — renders <kbd> chips. */
    | {type: 'kbd-list'; items: {keys: string[]; desc: string}[]}
    | {type: 'code'; code: string; lang?: string}
    | {type: 'table'; head: string[]; rows: string[][]}
    | {type: 'note'; tone?: 'info' | 'warn'; text: string};

export interface HelpTopic {
    /** Slug — used as the scroll anchor inside a guide. */
    id: string;
    title: string;
    blocks: HelpBlock[];
}

export type HelpAudience = 'user' | 'developer';

export interface HelpGuide {
    id: string;
    title: string;
    description?: string;
    audience: HelpAudience;
    topics: HelpTopic[];
}

export interface HelpSection {
    /** Slug — matches the product area (guide FILE is named after this). */
    id: string;
    title: string;
    /** Optional emoji/short glyph shown next to the title. */
    icon?: string;
    /** Where this section lives in the product (optional link). */
    route?: string;
    guides: HelpGuide[];
}

export interface HelpGuideLabels {
    sectionsTitle?: string;
    outlineTitle?: string;
    topicsToggle?: string;
    audienceUser?: string;
    audienceDeveloper?: string;
    emptySection?: string;
    backToGuides?: string;
    openGuide?: string;
}

export const DEFAULT_HELP_LABELS: Required<HelpGuideLabels> = {
    sectionsTitle: 'Guides',
    outlineTitle: 'On this page',
    topicsToggle: 'Topics',
    audienceUser: 'For users',
    audienceDeveloper: 'For developers',
    emptySection: 'No guides here yet.',
    backToGuides: 'All guides',
    openGuide: 'Open',
};
