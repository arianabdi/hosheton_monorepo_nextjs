export type AiAvatarPlatform = 'seedance' | 'byteplus';

export type AiAvatarStatus =
    | 'draft'
    | 'admin_pending'
    | 'verification_pending'
    | 'verification_failed'
    | 'asset_uploading'
    | 'asset_review'
    | 'active'
    | 'rejected'
    | 'error';

export type AiAvatarAdminReviewStatus = 'none' | 'pending' | 'approved' | 'rejected';

export interface AiAvatarAssetEntry {
    assetId?: string;
    assetUri?: string;
    sourceUrl: string;
    name?: string;
    status?: string;
    failureReason?: string;
}

export interface AiAvatarCardProfile {
    sex?: string;
    hair?: string;
    eyes?: string;
    height?: string;
    weightLb?: number;
    dob?: string;
}

export interface AiAvatarProfile {
    _id: string;
    name: string;
    platform?: AiAvatarPlatform;
    description?: string;
    status: AiAvatarStatus;
    sourceImageUrls: string[];
    previewImageUrl?: string;
    previewFileKey?: string;
    cardProfile?: AiAvatarCardProfile;
    byteplusGroupId?: string;
    verificationUrl?: string;
    bytedToken?: string;
    assets?: AiAvatarAssetEntry[];
    byteplusAssetUri?: string;
    byteplusAssetId?: string;
    byteplusStatus?: string;
    failureReason?: string;
    adminReviewStatus?: AiAvatarAdminReviewStatus;
    lastByteplusError?: string;
    submittedForAdminAt?: string;
    reviewedAt?: string;
    reviewNote?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface AiAvatarListResponse {
    avatars: AiAvatarProfile[];
    totalItems: number;
}

export interface StartVerificationResponse {
    avatarId: string;
    verificationUrl?: string;
    bytedToken?: string;
    status: AiAvatarStatus;
    adminReviewPending?: boolean;
    message?: string;
    lastByteplusError?: string;
}

export interface VerificationStatusResponse {
    avatarId: string;
    status: AiAvatarStatus;
    verificationStatus: string;
    groupId: string | null;
    failureReason: string | null;
}

export interface SyncAvatarResponse {
    avatarId: string;
    status: AiAvatarStatus;
    byteplusAssetUri: string | null;
    byteplusStatus?: string;
    assets?: AiAvatarAssetEntry[];
    failureReason: string | null;
}

export interface CreateAiAvatarPayload {
    name: string;
    platform: AiAvatarPlatform;
    description?: string;
    sourceImageUrls?: string[];
    sourceFileKeys?: string[];
    cardSex?: 'M' | 'F';
    cardHair?: string;
    cardEyes?: string;
    cardHeight?: string;
    cardWeightLb?: number;
    cardDob?: string;
    previewImageUrl?: string;
    previewFileKey?: string;
}

export interface UpdateAiAvatarPayload {
    name?: string;
    description?: string;
    sourceImageUrls?: string[];
    sourceFileKeys?: string[];
    previewImageUrl?: string;
    previewFileKey?: string;
    cardSex?: 'M' | 'F';
    cardHair?: string;
    cardEyes?: string;
    cardHeight?: string;
    cardWeightLb?: number;
    cardDob?: string;
}
