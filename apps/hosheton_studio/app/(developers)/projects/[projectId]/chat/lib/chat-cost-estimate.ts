import type { CostEstimatePayload, CostEstimateResult } from '@/app/(developers)/projects/components/CostEstimatePanel';
import type {
    StudioChatMediaKind,
    StudioChatSettings,
    TemplatePreviewMedia,
} from '@/app/(developers)/projects/types/media-api';
import { chatAttachmentsRuntimeMetrics } from './chat-attachment-kind';
import { angleQuoteInput, angleShotCount, withoutMultiImageSettings } from '@/app/(developers)/projects/lib/angle-studio';

/** نوع نود هر نوع چت — همان CHAT_KIND_TO_NODE که API برای ارسال واقعی می‌سازد */
export const CHAT_KIND_TO_NODE: Record<StudioChatMediaKind, string> = {
    image: 'textToImage',
    video: 'textToVideo',
    audio: 'musicSfx',
    text: 'llmChat',
};

/**
 * تنظیماتی که ارسال واقعی چت روی نود می‌گذارد (buildStudioChatGenerationGraph در API):
 * modelSettings به‌علاوه aspectRatio / resolution / capabilityMode فقط وقتی مقدار دارند.
 * تخمین قیمت باید دقیقاً همین را بفرستد تا مبلغ تخمین با مبلغ کسرشده یکی باشد.
 */
export function chatRunModelSettings(settings: StudioChatSettings): Record<string, unknown> {
    const capabilityMode = String(settings.capabilityMode || settings.extras?.capabilityMode || '').trim();
    return {
        ...(settings.modelSettings || {}),
        ...(settings.aspectRatio ? { aspectRatio: settings.aspectRatio } : {}),
        ...(settings.resolution ? { resolution: settings.resolution } : {}),
        ...(capabilityMode ? { capabilityMode } : {}),
    };
}

/** تعداد نماهای «زاویه و نور» این ارسال (۰ = ابزار خاموش یا چت غیرتصویری) */
export function chatAngleShotCount(settings: StudioChatSettings, mediaKind: StudioChatMediaKind): number {
    if (mediaKind !== 'image' || settings.chatPanels?.angles === false) return 0;
    return angleShotCount(settings.angleStudio);
}

/**
 * بخش تنظیمات/طول/تعداد درخواست قیمت — همان که سرور قفل می‌کند (quoteChatTurn):
 * با «زاویه و نور» هر نما یک تصویر است، پس تعداد = نماها و طول = متن + پرامپت JSON.
 */
export function chatEstimateRequest(input: {
    settings: StudioChatSettings;
    mediaKind: StudioChatMediaKind;
    promptLength: number;
}): { modelSettings: Record<string, unknown>; promptLength?: number; unitCount?: number } {
    const modelSettings = chatRunModelSettings(input.settings);
    const shots = chatAngleShotCount(input.settings, input.mediaKind);
    if (!shots) return { modelSettings, promptLength: input.promptLength || undefined };
    const quote = angleQuoteInput(input.promptLength, shots);
    return { modelSettings: withoutMultiImageSettings(modelSettings), ...quote };
}

/** درخواست تخمین هزینه یک ارسال چت — مشترک بین قیمت کنار دکمه ارسال، پنجره تأیید و پنجره developer */
export function chatCostEstimatePayload(input: {
    settings: StudioChatSettings;
    mediaKind: StudioChatMediaKind;
    attachments: TemplatePreviewMedia[];
    promptLength: number;
}): CostEstimatePayload {
    const request = chatEstimateRequest(input);
    return {
        modelId: String(input.settings.modelId || ''),
        nodeType: CHAT_KIND_TO_NODE[input.mediaKind],
        modelSettings: request.modelSettings,
        promptLength: request.promptLength ?? input.promptLength,
        ...(request.unitCount ? { unitCount: request.unitCount } : {}),
        runtimeMetrics: chatAttachmentsRuntimeMetrics(input.attachments) as unknown as Record<string, unknown>,
    };
}

/**
 * واحد برچسب مبلغ تخمین (مثل «$0.07/ساخت»). مبلغ همیشه هزینه کل همین یک اجراست؛
 * اگر مبنای قیمت مدل «هر ساخت» (generation) باشد برچسب «ساخت» است، وگرنه نوع خروجی.
 */
export function estimateUnitKey(
    result: { unit?: CostEstimateResult['unit']; breakdown?: CostEstimateResult['breakdown'] } | null | undefined,
    fallback: string,
): string {
    const unit = String(result?.unit || '');
    const basis = unit === 'formula_usd'
        ? String(result?.breakdown?.pricingRatePer || '')
        : unit.replace(/^per_/, '');
    return basis === 'generation' ? 'generation' : fallback;
}
