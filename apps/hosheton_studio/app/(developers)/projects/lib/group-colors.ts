export const GROUP_COLOR_PRESETS = [
    {
        id: 'purple',
        label: 'Purple',
        lightBg: 'rgba(139, 92, 246, 0.06)',
        darkBg: '#342243',
        lightBorder: 'rgba(139, 92, 246, 0.45)',
        darkBorder: 'rgba(192, 132, 252, 0.35)',
        accent: '#8b5cf6',
        darkAccent: '#c084fc',
    },
    {
        id: 'blue',
        label: 'Blue',
        lightBg: 'rgba(59, 130, 246, 0.06)',
        darkBg: '#1e293b',
        lightBorder: 'rgba(59, 130, 246, 0.45)',
        darkBorder: 'rgba(147, 197, 253, 0.35)',
        accent: '#3b82f6',
        darkAccent: '#93c5fd',
    },
    {
        id: 'green',
        label: 'Green',
        lightBg: 'rgba(16, 185, 129, 0.06)',
        darkBg: '#2b3d38',
        lightBorder: 'rgba(16, 185, 129, 0.45)',
        darkBorder: 'rgba(134, 239, 172, 0.35)',
        accent: '#10b981',
        darkAccent: '#86efac',
    },
    {
        id: 'orange',
        label: 'Orange',
        lightBg: 'rgba(245, 158, 11, 0.08)',
        darkBg: '#432d27',
        lightBorder: 'rgba(245, 158, 11, 0.45)',
        darkBorder: 'rgba(253, 186, 116, 0.35)',
        accent: '#f59e0b',
        darkAccent: '#fdba74',
    },
    {
        id: 'pink',
        label: 'Pink',
        lightBg: 'rgba(236, 72, 153, 0.06)',
        darkBg: '#4b313b',
        lightBorder: 'rgba(236, 72, 153, 0.45)',
        darkBorder: 'rgba(251, 207, 232, 0.35)',
        accent: '#ec4899',
        darkAccent: '#fbcfe8',
    },
    {
        id: 'gray',
        label: 'Gray',
        lightBg: 'rgba(107, 114, 128, 0.06)',
        darkBg: '#2f3338',
        lightBorder: 'rgba(107, 114, 128, 0.4)',
        darkBorder: 'rgba(156, 163, 175, 0.35)',
        accent: '#6b7280',
        darkAccent: '#9ca3af',
    },
] as const;

export type GroupColorPreset = (typeof GROUP_COLOR_PRESETS)[number];

export function getGroupColorPreset(colorId?: string) {
    return GROUP_COLOR_PRESETS.find((c) => c.id === colorId) ?? GROUP_COLOR_PRESETS[0];
}
