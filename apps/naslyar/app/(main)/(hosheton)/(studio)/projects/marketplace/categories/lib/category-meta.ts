export interface MarketplaceCategoryMeta {
    text?: string;
    coverImages?: string[];
    /** Raw inline SVG content for the category icon. */
    icon?: string;
    /** Public URL of an uploaded icon (SVG or PNG). */
    iconUrl?: string;
}

export function parseCategoryMeta(description?: string): MarketplaceCategoryMeta {
    if (!description?.trim()) return {};
    try {
        const parsed = JSON.parse(description);
        if (parsed && typeof parsed === 'object') {
            return {
                text: typeof parsed.text === 'string' ? parsed.text : '',
                coverImages: Array.isArray(parsed.coverImages)
                    ? parsed.coverImages.filter((url: unknown) => typeof url === 'string' && url.trim())
                    : [],
                icon: typeof parsed.icon === 'string' ? parsed.icon : '',
                iconUrl: typeof parsed.iconUrl === 'string' ? parsed.iconUrl : '',
            };
        }
    } catch {
        return { text: description };
    }
    return {};
}

export function serializeCategoryMeta(meta: MarketplaceCategoryMeta): string {
    return JSON.stringify({
        text: meta.text || '',
        coverImages: (meta.coverImages || []).filter(Boolean),
        icon: meta.icon || '',
        iconUrl: meta.iconUrl || '',
    });
}

export function coverImagesToField(coverImages?: string[]): string {
    return (coverImages || []).join('\n');
}

export function fieldToCoverImages(value: string): string[] {
    return value
        .split(/[\n,]+/)
        .map((item) => item.trim())
        .filter(Boolean);
}
