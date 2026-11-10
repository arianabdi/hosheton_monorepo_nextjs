export type AudioCategory = 'tts' | 'sfx' | 'music';

export const AUDIO_CATEGORIES: { value: AudioCategory; labelKey: string; descKey: string }[] = [
    { value: 'tts', labelKey: 'audio_cat_tts', descKey: 'audio_cat_tts_desc' },
    { value: 'sfx', labelKey: 'audio_cat_sfx', descKey: 'audio_cat_sfx_desc' },
    { value: 'music', labelKey: 'audio_cat_music', descKey: 'audio_cat_music_desc' },
];

const CATEGORY_HINTS: Record<AudioCategory, string[]> = {
    tts: ['tts', 'speech', 'voice', 'eleven', 'say', 'talk'],
    sfx: ['sfx', 'sound', 'effect', 'foley', 'ambient'],
    music: ['music', 'suno', 'udio', 'melody', 'song'],
};

export function normalizeAudioCategory(value?: string | null): AudioCategory {
    if (value === 'speech') return 'tts';
    if (value === 'sfx' || value === 'music' || value === 'tts') return value;
    return 'tts';
}

export function getAudioCategoryLabelKey(value?: string | null): string {
    const normalized = normalizeAudioCategory(value);
    return AUDIO_CATEGORIES.find((item) => item.value === normalized)?.labelKey ?? 'generate_audio';
}

export function filterAudioModelsByCategory<T extends { name?: string; displayName?: string }>(
    models: T[],
    category: AudioCategory,
): T[] {
    const hints = CATEGORY_HINTS[category];
    const filtered = models.filter((model) => {
        const haystack = `${model.displayName || ''} ${model.name || ''}`.toLowerCase();
        return hints.some((hint) => haystack.includes(hint));
    });
    return filtered.length > 0 ? filtered : models;
}
