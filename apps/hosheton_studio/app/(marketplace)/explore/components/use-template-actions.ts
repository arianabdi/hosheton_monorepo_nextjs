'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { marketplaceApi } from '@/app/(marketplace)/lib/marketplace-api';
import { mediaApi } from '@/app/(developers)/projects/lib/media-api';
import {
    isMarketplaceTemplateLocked,
    type MarketplaceTemplateItem,
} from '@/app/(marketplace)/lib/types';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { useLoginModalStore } from '@/app/zustand/store/useLoginModalStore';
import { useStudioPersonalChatStore } from '@/app/zustand/store/useStudioPersonalChatStore';
import {
    PERSONAL_CHAT_INJECT_KEY,
    writeStudioChatInject,
} from '@/app/zustand/store/useStudioExploreStore';
import { previewToChatAttachment } from '@/app/(developers)/projects/[projectId]/chat/explore/StudioExploreGrid';
import { notifyError } from '@/app/lib/errors';

export type ChatInjectPayload = {
    prompt?: string;
    attachments?: ReturnType<typeof previewToChatAttachment>[];
};

/**
 * Shared explore template actions (like / save / use / purchase / chat-inject).
 * The grid and the detail overlay provide different state back-ends via callbacks,
 * so both stay behaviourally identical.
 */
export function useTemplateActions(deps: {
    getItem: (id: string) => MarketplaceTemplateItem | null | undefined;
    isLiked: (id: string) => boolean;
    isSaved: (id: string) => boolean;
    setLiked: (id: string, liked: boolean, likeCount: number) => void;
    setSaved: (id: string, saved: boolean) => void;
    /** Locked templates open the detail modal route instead of being used directly. */
    onOpenDetail: (item: MarketplaceTemplateItem) => void;
}) {
    const { t } = useTranslation('marketplace');
    const router = useRouter();
    const { token } = useAuthStore();
    const setPersonalChatOpen = useStudioPersonalChatStore((s) => s.setOpen);

    const toggleLike = useCallback(async (id: string) => {
        if (!token) {
            useLoginModalStore.getState().openLoginModal();
            return;
        }
        const wasLiked = deps.isLiked(id);
        const current = deps.getItem(id);
        const nextCount = Math.max((current?.likeCount || 0) + (wasLiked ? -1 : 1), 0);
        deps.setLiked(id, !wasLiked, nextCount);
        try {
            const res = await marketplaceApi.toggleLike(id);
            deps.setLiked(id, res.liked, res.likeCount);
        } catch (err) {
            deps.setLiked(id, wasLiked, current?.likeCount || 0);
            notifyError(err, { fallback: t('like_error') });
        }
    }, [token, deps, t]);

    const toggleSave = useCallback(async (id: string) => {
        if (!token) {
            useLoginModalStore.getState().openLoginModal();
            return;
        }
        const wasSaved = deps.isSaved(id);
        deps.setSaved(id, !wasSaved);
        try {
            const res = await mediaApi.toggleTemplateBookmark(id);
            deps.setSaved(id, res.bookmarked);
        } catch (err) {
            deps.setSaved(id, wasSaved);
            notifyError(err, { fallback: t('save_error') });
        }
    }, [token, deps, t]);

    const handleUseTemplate = useCallback(async (item: MarketplaceTemplateItem) => {
        if (isMarketplaceTemplateLocked(item)) {
            deps.onOpenDetail(item);
            return;
        }
        if (!token) {
            useLoginModalStore.getState().openLoginModal();
            return;
        }
        try {
            const { spaces } = await mediaApi.listSpaces();
            const spaceId = spaces[0]?._id;
            if (!spaceId) {
                router.push('/projects/new');
                return;
            }
            const project = await mediaApi.createProject({
                title: t('from_template'),
                templateId: item._id,
                spaceId,
            });
            router.push(`/projects/${project._id}`);
        } catch (err) {
            notifyError(err, { fallback: t('from_template_error') });
        }
    }, [token, router, t, deps]);

    const handlePurchase = useCallback((item: MarketplaceTemplateItem) => {
        if (!token) {
            useLoginModalStore.getState().openLoginModal();
            return;
        }
        router.push(`/explore/buy/${item._id}`);
    }, [token, router]);

    // مهمان هم می‌تواند متن/مرجع را به چت ببرد؛ ورود فقط موقع ارسال پرسیده می‌شود
    const injectToPersonalChat = useCallback((payload: ChatInjectPayload) => {
        writeStudioChatInject(PERSONAL_CHAT_INJECT_KEY, payload);
        setPersonalChatOpen(true);
    }, [setPersonalChatOpen]);

    return {
        toggleLike,
        toggleSave,
        handleUseTemplate,
        handlePurchase,
        injectToPersonalChat,
    };
}
