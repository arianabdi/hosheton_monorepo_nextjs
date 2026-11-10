/**
 * Help-center registry — every product section registers its guide file here.
 * Guide files are named after their section (sections/<section-id>.tsx).
 * Adding a new product section? Ship its guide file and register it below
 * (required by AGENTS.md — "every new feature ships its guide update").
 */
import type {HelpSection} from '../helpGuideTypes';
import {levelDesignSection} from './level-design';

export const helpGuideRegistry: HelpSection[] = [
    levelDesignSection,
    // ← register new sections here, e.g. storySection, projectsSection, …
];

export function findHelpSection(id: string): HelpSection | undefined {
    return helpGuideRegistry.find(section => section.id === id);
}
