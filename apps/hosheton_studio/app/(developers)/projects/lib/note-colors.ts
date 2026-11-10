export const NOTE_COLOR_PRESETS = [
    {
        id: 'yellow',
        label: 'Yellow',
        lightBg: '#fef9c3',
        darkBg: '#3d3520',
        lightBorder: '#fde047',
        darkBorder: 'rgba(253, 224, 71, 0.35)',
        lightText: '#713f12',
        darkText: '#fde68a',
    },
    {
        id: 'green',
        label: 'Green',
        lightBg: '#dcfce7',
        darkBg: '#2b3d38',
        lightBorder: '#86efac',
        darkBorder: 'rgba(134, 239, 172, 0.35)',
        lightText: '#14532d',
        darkText: '#86efac',
    },
    {
        id: 'blue',
        label: 'Blue',
        lightBg: '#dbeafe',
        darkBg: '#1e293b',
        lightBorder: '#93c5fd',
        darkBorder: 'rgba(147, 197, 253, 0.35)',
        lightText: '#1e3a5f',
        darkText: '#93c5fd',
    },
    {
        id: 'pink',
        label: 'Pink',
        lightBg: '#fce7f3',
        darkBg: '#4b313b',
        lightBorder: '#f9a8d4',
        darkBorder: 'rgba(251, 207, 232, 0.35)',
        lightText: '#831843',
        darkText: '#fbcfe8',
    },
    {
        id: 'purple',
        label: 'Purple',
        lightBg: '#ede9fe',
        darkBg: '#342243',
        lightBorder: '#c4b5fd',
        darkBorder: 'rgba(192, 132, 252, 0.35)',
        lightText: '#4c1d95',
        darkText: '#c084fc',
    },
    {
        id: 'gray',
        label: 'Gray',
        lightBg: '#f3f4f6',
        darkBg: '#2f3338',
        lightBorder: '#d1d5db',
        darkBorder: 'rgba(156, 163, 175, 0.35)',
        lightText: '#374151',
        darkText: '#9ca3af',
    },
] as const;

export type NoteColorPreset = (typeof NOTE_COLOR_PRESETS)[number];

export function getNoteColorPreset(colorId?: string) {
    return NOTE_COLOR_PRESETS.find((c) => c.id === colorId) ?? NOTE_COLOR_PRESETS[0];
}
