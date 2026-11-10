import type { AiAvatarPlatform } from '@/app/(developers)/projects/types/ai-avatar-api';

export const AVATAR_PLATFORM_META: Record<
    AiAvatarPlatform,
    { label: string; short: string; accent: string }
> = {
    seedance: {
        label: 'Seedance',
        short: 'SD',
        accent: '#3b82f6',
    },
    byteplus: {
        label: 'BytePlus',
        short: 'BP',
        accent: '#06b6d4',
    },
};

export function normalizeAvatarPlatform(value?: string | null): AiAvatarPlatform {
    if (value === 'byteplus') return 'byteplus';
    return 'seedance';
}
