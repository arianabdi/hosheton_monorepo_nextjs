import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { developerApi } from '@/app/(developers)/projects/lib/developer-api';
import type { TemplatePreviewMedia, StudioChatSettings } from '@/app/(developers)/projects/types/media-api';
import { chatAttachmentsRuntimeMetrics, isChatFileAttachment } from './chat-attachment-kind';
import { chatRunModelSettings } from './chat-cost-estimate';
import { modeSettingsSchema, pickRoute, routeConditionsMatch, routeMatchesCounts as routeCountsMatch, runnableModes } from './model-route-match';
import {
    type AttachmentValidationResult,
    type ConstraintReviewLine,
    type ModeInputConstraints,
    type ValidationError,
    validateChatAttachments,
    formatConstraintsSummary,
    formatConstraintsLivePreview,
    formatConstraintsReviewFa,
    collectAttachmentErrors,
} from './chat-attachment-validator';

export interface ModelRouteLimits {
    imageMax: number | null;
    videoMax: number | null;
    audioMax: number | null;
    totalMax: number | null;
    /** سقف حجم هر فایل به بایت */
    imageFileSizeMax: number | null;
    videoFileSizeMax: number | null;
    audioFileSizeMax: number | null;
}

interface ModelModeInfo {
    modeId?: string;
    modeName?: string;
    constraints: ModeInputConstraints | null;
    /** false یعنی هیچ روتی از هیچ مودی این ترکیب ورودی را نمی‌پذیرد (رفتار fallback) */
    routeMatched: boolean;
    /** سقف قابل پذیرش کل مدل (بیشینه‌ی روت‌ها)؛ null یعنی نامحدود */
    modelLimits: ModelRouteLimits | null;
}

function emptyModelModeInfo(): ModelModeInfo {
    return { constraints: null, routeMatched: true, modelLimits: null };
}

type LooseRouteLimits = {
    imageCount?: { max?: number };
    videoCount?: { max?: number };
    audioCount?: { max?: number };
    totalCount?: { max?: number };
    imageFileSize?: { max?: number };
    videoFileSize?: { max?: number };
    audioFileSize?: { max?: number };
};

/**
 * Hook to validate chat attachments against selected model mode constraints
 */
export function useChatAttachmentValidation(
    settings: StudioChatSettings,
    allAttachments: TemplatePreviewMedia[],
) {
    // فایل‌های متنی (سند/کد/جدول) با «فایل‌های ورودی» مدل سنجیده می‌شوند، نه با route‌های رسانه‌ای
    const attachments = useMemo(
        () => allAttachments.filter((item) => !isChatFileAttachment(item)),
        [allAttachments],
    );
    const { t } = useTranslation('projects');
    const [modelModeInfo, setModelModeInfo] = useState<ModelModeInfo>(emptyModelModeInfo());
    const [loading, setLoading] = useState(false);

    const metrics = useMemo(
        () => chatAttachmentsRuntimeMetrics(attachments),
        [attachments],
    );
    // همان تنظیماتی که ارسال و قیمت با آن حساب می‌شوند — برای شرط تنظیمات مسیرها
    const runSettingsKey = useMemo(
        () => JSON.stringify(chatRunModelSettings(settings)),
        [settings],
    );

    // Fetch model configuration when modelId changes
    useEffect(() => {
        const modelId = settings.modelId;
        if (!modelId) {
            setModelModeInfo(emptyModelModeInfo());
            return;
        }

        let cancelled = false;
        setLoading(true);

        developerApi
            .getProviderModel(modelId)
            .then((model) => {
                if (cancelled) return;

                // Resolve mode based on connected inputs
                const connectedInputs = {
                    prompt: true, // always have prompt in chat
                    image: metrics.inputImageCount,
                    video: metrics.inputVideoCount,
                    audio: metrics.inputAudioCount,
                };

                // Find matching mode + route — switched-off modes/routes are ignored, and a
                // route's settings conditions (e.g. 4k → another provider) count like the API.
                const modes = runnableModes(model.modes);
                let selectedMode: any = null;
                let selectedRoute: any = null;
                const counts = {
                    image: metrics.inputImageCount,
                    video: metrics.inputVideoCount,
                    audio: metrics.inputAudioCount,
                };
                const routeSettings = JSON.parse(runSettingsKey) as Record<string, unknown>;

                const routeMatchesCounts = (route: any) => routeCountsMatch(route, counts);
                const routeMatchesRequest = (mode: any, route: any) => routeMatchesCounts(route)
                    && routeConditionsMatch(route, routeSettings, modeSettingsSchema(model, mode));

                for (const mode of modes) {
                    const required = Array.isArray(mode.requiredInputs) ? mode.requiredInputs : [];

                    const allRequiredPresent = required.every((input: string) => {
                        if (input === 'prompt') return true;
                        if (input === 'image') return metrics.inputImageCount > 0;
                        if (input === 'video') return metrics.inputVideoCount > 0;
                        if (input === 'audio') return metrics.inputAudioCount > 0;
                        return false;
                    });

                    if (!allRequiredPresent) continue;

                    const routes = Array.isArray(mode.routes) ? mode.routes : [];
                    const hasMatchingRoute = routes.some((route: any) => routeMatchesRequest(mode, route));

                    if (hasMatchingRoute || routes.length === 0) {
                        selectedMode = mode;
                        selectedRoute = pickRoute(mode, counts, routeSettings, modeSettingsSchema(model, mode))
                            || routes[0]
                            || null;
                        break;
                    }
                }

                // Fallback to default mode or first mode
                if (!selectedMode) {
                    selectedMode = modes.find((m: any) => m.default || m.isDefault) || modes[0];
                    const routes = Array.isArray(selectedMode?.routes) ? selectedMode.routes : [];
                    selectedRoute = pickRoute(selectedMode, counts, routeSettings, modeSettingsSchema(model, selectedMode))
                        || routes[0]
                        || null;
                }

                // Extract constraints from selected route
                let constraints: ModeInputConstraints | null = null;
                if (selectedRoute) {
                    constraints = {
                        imageCount: selectedRoute.imageCount,
                        videoCount: selectedRoute.videoCount,
                        audioCount: selectedRoute.audioCount,
                        totalCount: selectedRoute.totalCount,
                        imageFileSize: selectedRoute.imageFileSize,
                        videoFileSize: selectedRoute.videoFileSize,
                        audioFileSize: selectedRoute.audioFileSize,
                        totalFileSize: selectedRoute.totalFileSize,
                        imageTotalSize: selectedRoute.imageTotalSize,
                        videoTotalSize: selectedRoute.videoTotalSize,
                        audioTotalSize: selectedRoute.audioTotalSize,
                        videoDuration: selectedRoute.videoDuration,
                        audioDuration: selectedRoute.audioDuration,
                        supportedFormats: selectedRoute.supportedFormats,
                    };
                }

                setModelModeInfo({
                    modeId: selectedMode?.id,
                    modeName: selectedMode?.label || selectedMode?.id,
                    constraints,
                    routeMatched: selectedRoute ? routeMatchesCounts(selectedRoute) : true,
                        modelLimits: (() => {
                            const allRoutes: LooseRouteLimits[] = modes.flatMap(
                                (mode: { routes?: LooseRouteLimits[] }) => (Array.isArray(mode.routes) ? mode.routes : []),
                            );
                            if (!allRoutes.length) return null;
                            const maxOf = (
                                pick: (route: LooseRouteLimits) => { max?: number } | undefined,
                            ): number | null => allRoutes.reduce<number | null>((acc: number | null, route: LooseRouteLimits) => {
                                const max = pick(route)?.max;
                                if (typeof max !== 'number') return acc;
                                return acc == null ? max : Math.max(acc, max);
                            }, null);
                        return {
                            imageMax: maxOf((route) => route.imageCount),
                            videoMax: maxOf((route) => route.videoCount),
                            audioMax: maxOf((route) => route.audioCount),
                            totalMax: maxOf((route) => route.totalCount),
                            imageFileSizeMax: maxOf((route) => route.imageFileSize),
                            videoFileSizeMax: maxOf((route) => route.videoFileSize),
                            audioFileSizeMax: maxOf((route) => route.audioFileSize),
                        };
                    })(),
                });
            })
            .catch(() => {
                if (!cancelled) {
                    setModelModeInfo(emptyModelModeInfo());
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [settings.modelId, metrics.inputImageCount, metrics.inputVideoCount, metrics.inputAudioCount, runSettingsKey]);

    const validation: AttachmentValidationResult = useMemo(() => {
        return validateChatAttachments(attachments, modelModeInfo.constraints);
    }, [attachments, modelModeInfo.constraints]);

    const constraintsSummary = useMemo(() => {
        return formatConstraintsSummary(modelModeInfo.constraints, t);
    }, [modelModeInfo.constraints, t]);

    const livePreview = useMemo(() => {
        return formatConstraintsLivePreview(attachments, modelModeInfo.constraints);
    }, [attachments, modelModeInfo.constraints]);

    const review = useMemo(() => {
        return formatConstraintsReviewFa(attachments, modelModeInfo.constraints);
    }, [attachments, modelModeInfo.constraints]);

    const getAttachmentErrors = useCallback((media: TemplatePreviewMedia): ValidationError[] => {
        return collectAttachmentErrors(validation.errors, media);
    }, [validation.errors]);

    return {
        validation,
        constraints: modelModeInfo.constraints,
        routeMatched: modelModeInfo.routeMatched,
        modelLimits: modelModeInfo.modelLimits,
        constraintsSummary,
        livePreview,
        review,
        getAttachmentErrors,
        modeInfo: modelModeInfo,
        loading,
        metrics,
    };
}
