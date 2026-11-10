import type { AppLanguage } from './config';

type CatalogLike = {
    label?: string;
    labelFa?: string;
    description?: string;
    descriptionFa?: string;
    hint?: string;
    hintFa?: string;
};

export function catalogLabel(entry?: CatalogLike | null, lang?: string): string {
    if (!entry) return '';
    if (lang === 'fa') return entry.labelFa || entry.label || '';
    return entry.label || entry.labelFa || '';
}

export function catalogDescription(entry?: CatalogLike | null, lang?: string): string {
    if (!entry) return '';
    if (lang === 'fa') return entry.descriptionFa || entry.description || '';
    return entry.description || entry.descriptionFa || '';
}

export function catalogHint(field?: CatalogLike | null, lang?: string): string {
    if (!field) return '';
    if (lang === 'fa') return field.hintFa || field.hint || '';
    return field.hint || field.hintFa || '';
}

export function isFaLang(lang?: AppLanguage | string): boolean {
    return lang === 'fa';
}
