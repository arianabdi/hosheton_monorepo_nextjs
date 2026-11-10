import type React from 'react';
import {
    LuCpu,
    LuNetwork,
    LuFolderGit,
    LuTerminal,
    LuBrain,
    LuFilm,
    LuMusic,
    LuImage,
    LuVideo,
    LuWand,
    LuSparkles,
} from 'react-icons/lu';
import type { MediaProject, ProjectUsageSummaryResponse } from '../types/media-api';

/** Curated icon set selectable for a project — kept small on purpose (settings/info page). */
export const PROJECT_ICON_OPTIONS: {
    key: string;
    label: string;
    Icon: React.ComponentType<{ size?: number; color?: string }>;
}[] = [
    { key: 'terminal', label: 'icon_terminal', Icon: LuTerminal },
    { key: 'film', label: 'icon_film', Icon: LuFilm },
    { key: 'video', label: 'icon_video', Icon: LuVideo },
    { key: 'image', label: 'icon_image', Icon: LuImage },
    { key: 'music', label: 'icon_music', Icon: LuMusic },
    { key: 'brain', label: 'icon_brain', Icon: LuBrain },
    { key: 'cpu', label: 'icon_cpu', Icon: LuCpu },
    { key: 'network', label: 'icon_network', Icon: LuNetwork },
    { key: 'folder', label: 'icon_folder', Icon: LuFolderGit },
    { key: 'wand', label: 'icon_wand', Icon: LuWand },
    { key: 'sparkles', label: 'icon_sparkles', Icon: LuSparkles },
];

export const PROJECT_COLOR_OPTIONS = [
    '#7d38ff', '#3b82f6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#06b6d4', '#8b5cf6',
];

export function getProjectIcon(key?: string) {
    return PROJECT_ICON_OPTIONS.find((o) => o.key === key)?.Icon || LuTerminal;
}

export function formatUsd(value?: number | null) {
    const n = Number(value || 0);
    return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

/** Percent of budget spent — keeps decimals for small amounts (e.g. $0.1 / $1 → 10%). */
export function getBudgetUsage(spent: number, budget: number | null | undefined) {
    if (!budget || budget <= 0) {
        return { percent: 0, percentLabel: '0', widthPercent: 0, hasBudget: false };
    }
    const raw = (spent / budget) * 100;
    const clamped = Math.min(100, raw);
    const percentLabel =
        clamped >= 100
            ? '100'
            : clamped >= 10
              ? clamped.toFixed(1).replace(/\.0$/, '')
              : clamped.toFixed(1);
    return {
        percent: clamped,
        percentLabel,
        widthPercent: clamped,
        hasBudget: true,
    };
}

/** Prefer run-aggregated total when the lazy usage popup has loaded (matches hover breakdown). */
export function resolveProjectSpentCost(
    project: MediaProject,
    usage?: ProjectUsageSummaryResponse | 'loading' | 'error',
): number {
    const stored = Number(project.spentCost ?? 0);
    if (usage && typeof usage === 'object' && usage.totalCost != null) {
        return Math.max(stored, Number(usage.totalCost));
    }
    return stored;
}
