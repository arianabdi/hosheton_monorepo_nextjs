import type { AiAvatarProfile } from '@/app/(developers)/projects/types/ai-avatar-api';

export type CardHair = 'BLK' | 'BRN' | 'BLN' | 'GRY';
export type CardEyes = 'BRN' | 'BLU' | 'GRN' | 'HZL';
export type CardSex = 'M' | 'F';

export interface AvatarCardProfileForm {
    sex: CardSex;
    hair: CardHair;
    eyes: CardEyes;
    height: string;
    weightLb: number;
    dob: string;
}

export interface ResolvedCardProfile extends AvatarCardProfileForm {
    wgtDisplay: string;
}

export function deriveCardMetricsFromId(id: string): AvatarCardProfileForm {
    let sum = 0;
    for (let i = 0; i < id.length; i++) {
        sum += id.charCodeAt(i);
    }
    const day = (sum % 28) + 1;
    const month = (sum % 12) + 1;
    const year = 1990 + (sum % 15);
    const dob = `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/${year}`;

    const sex: CardSex = sum % 2 === 0 ? 'F' : 'M';
    const hairOpts: CardHair[] = ['BLK', 'BRN', 'BLN', 'GRY'];
    const hair = hairOpts[sum % hairOpts.length];
    const eyeOpts: CardEyes[] = ['BRN', 'BLU', 'GRN', 'HZL'];
    const eyes = eyeOpts[(sum + 1) % eyeOpts.length];

    const hgtFeet = 5 + (sum % 2);
    const hgtInches = sum % 12;
    const height = `${hgtFeet}'${hgtInches}"`;
    const weightLb = 130 + (sum % 60);

    return { sex, hair, eyes, height, weightLb, dob };
}

export function resolveCardProfile(avatar: Pick<AiAvatarProfile, '_id' | 'cardProfile'>): ResolvedCardProfile {
    const derived = deriveCardMetricsFromId(avatar._id);
    const stored = avatar.cardProfile;

    const profile: AvatarCardProfileForm = {
        sex: (stored?.sex === 'M' || stored?.sex === 'F' ? stored.sex : derived.sex) as CardSex,
        hair: (['BLK', 'BRN', 'BLN', 'GRY'].includes(stored?.hair || '')
            ? stored!.hair
            : derived.hair) as CardHair,
        eyes: (['BRN', 'BLU', 'GRN', 'HZL'].includes(stored?.eyes || '')
            ? stored!.eyes
            : derived.eyes) as CardEyes,
        height: stored?.height?.trim() || derived.height,
        weightLb:
            stored?.weightLb && stored.weightLb > 0 ? stored.weightLb : derived.weightLb,
        dob: stored?.dob?.trim() || derived.dob,
    };

    return {
        ...profile,
        wgtDisplay: `${profile.weightLb} lb`,
    };
}

export function cardProfileFromAvatar(avatar: AiAvatarProfile): AvatarCardProfileForm {
    return resolveCardProfile(avatar);
}

export function formatLicenseDates(createdAt?: string): { iss: string; exp: string } {
    if (!createdAt) {
        return { iss: '08/08/2026', exp: '08/08/2031' };
    }
    try {
        const d = new Date(createdAt);
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const yyyy = d.getFullYear();
        const iss = `${mm}/${dd}/${yyyy}`;
        const exp = `${mm}/${dd}/${yyyy + 5}`;
        return { iss, exp };
    } catch {
        return { iss: '08/08/2026', exp: '08/08/2031' };
    }
}

export function parseAvatarName(fullName: string) {
    const name = fullName.trim();
    const parts = name.split(/\s+/);
    if (parts.length >= 2) {
        return {
            fn: parts[0].toUpperCase(),
            ln: parts.slice(1).join(' ').toUpperCase(),
        };
    }
    return {
        fn: name.toUpperCase(),
        ln: 'AVATAR',
    };
}

export const CARD_HAIR_OPTIONS: { value: CardHair; label: string }[] = [
    { value: 'BLK', label: 'Black (BLK)' },
    { value: 'BRN', label: 'Brown (BRN)' },
    { value: 'BLN', label: 'Blond (BLN)' },
    { value: 'GRY', label: 'Gray (GRY)' },
];

export const CARD_EYES_OPTIONS: { value: CardEyes; label: string }[] = [
    { value: 'BRN', label: 'Brown (BRN)' },
    { value: 'BLU', label: 'Blue (BLU)' },
    { value: 'GRN', label: 'Green (GRN)' },
    { value: 'HZL', label: 'Hazel (HZL)' },
];
