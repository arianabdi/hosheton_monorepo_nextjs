import { useAuthStore } from '@/app/zustand/store/authStore';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import type { MediaProjectMember } from '../types/media-api';

/** Resolve the logged-in user's id from whichever store was populated at login. */
export function getCurrentUserId(): string {
    const authUser = useAuthStore.getState().user;
    if (authUser?.id) return String(authUser.id);

    const appState = useAppStore.getState();
    if (appState.userId) return String(appState.userId);

    // Legacy login wrote `_id` into profile before `userId` was added to the store shape.
    const legacyId = (appState as { _id?: string })._id;
    if (legacyId) return String(legacyId);

    return '';
}

export function getMemberUserId(member: Pick<MediaProjectMember, 'userId' | '_id'>): string {
    return String(member.userId || member._id || '');
}

export function findCurrentMember(
    members: MediaProjectMember[],
    currentUserId?: string,
): MediaProjectMember | undefined {
    const uid = currentUserId ?? getCurrentUserId();
    if (!uid) return undefined;
    return members.find((m) => getMemberUserId(m) === uid);
}

export function canManageProjectMembers(
    members: MediaProjectMember[],
    options?: { isProjectOwner?: boolean; currentUserId?: string },
): boolean {
    if (options?.isProjectOwner) return true;
    const me = findCurrentMember(members, options?.currentUserId);
    return !!me?.isOwner || me?.authority === 'admin';
}
