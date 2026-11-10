import type { AiAvatarStatus } from '@/app/(developers)/projects/types/ai-avatar-api';

export type ActivationStepId = 'profile' | 'verify' | 'assets' | 'live';

export interface ActivationStep {
    id: ActivationStepId;
    title: string;
    description: string;
}

export const ACTIVATION_STEPS: ActivationStep[] = [
    {
        id: 'profile',
        title: 'step_profile',
        description: 'step_profile_desc',
    },
    {
        id: 'verify',
        title: 'step_verify',
        description: 'step_verify_desc',
    },
    {
        id: 'assets',
        title: 'step_assets',
        description: 'step_assets_desc',
    },
    {
        id: 'live',
        title: 'step_live',
        description: 'step_live_desc',
    },
];

export function resolveActivationStepIndex(status: AiAvatarStatus): number {
    if (status === 'active') return 3;
    if (status === 'asset_review' || status === 'asset_uploading') return 2;
    if (
        status === 'verification_pending' ||
        status === 'verification_failed' ||
        status === 'admin_pending'
    ) {
        return 1;
    }
    return 0;
}
