import { useEffect, useState } from 'react';
import { mediaApi } from '@/app/(developers)/projects/lib/media-api';
import type { CostEstimateResult } from '@/app/(developers)/projects/components/CostEstimatePanel';
import type { TemplatePreviewMedia, StudioChatMediaKind, StudioChatSettings } from '@/app/(developers)/projects/types/media-api';
import { chatCostEstimatePayload } from '@/app/(developers)/projects/[projectId]/chat/lib/chat-cost-estimate';

/**
 * Hook to estimate cost for chat message before sending
 */
export function useChatCostEstimate(
    settings: StudioChatSettings,
    mediaKind: StudioChatMediaKind,
    attachments: TemplatePreviewMedia[],
    readPromptText: () => string,
    enabled: boolean,
) {
    const [estimate, setEstimate] = useState<CostEstimateResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!enabled || !settings.modelId) {
            // با بسته شدن پنجره تخمین قبلی پاک می‌شود تا باز شدن بعدی مبلغ کهنه را نشان ندهد.
            // بدون مدل، خطا ست می‌شود تا پنجره تأیید در حالت «در حال محاسبه» گیر نکند.
            setLoading(false);
            setEstimate(null);
            setError(enabled ? 'Unable to calculate cost estimate' : null);
            return;
        }

        let cancelled = false;
        setLoading(true);
        setError(null);

        // همان درخواست قیمت کنار دکمه ارسال (نوع نود + تنظیمات ارسال واقعی) تا مبلغ پنجره تأیید
        // با مبلغی که کسر می‌شود یکی باشد
        const payload = chatCostEstimatePayload({
            settings,
            mediaKind,
            attachments,
            promptLength: readPromptText().trim().length,
        });

        mediaApi.estimateCost(payload)
            .then((data) => {
                if (!cancelled) {
                    setEstimate(data);
                    setError(null);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setEstimate(null);
                    setError('Unable to calculate cost estimate');
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [enabled, settings, mediaKind, attachments, readPromptText]);

    return { estimate, loading, error };
}
