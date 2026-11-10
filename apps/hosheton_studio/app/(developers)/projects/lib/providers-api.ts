import { createApiClient, unwrapApiData } from './api-client';
import type { NodeSettingField } from '../types/node-catalog';

export interface ProviderItem {
    _id: string;
    name: string;
    displayName?: string;
    isActive?: boolean;
    isAlive?: boolean;
}

export interface ProviderModelModeItem {
    id: string;
    label?: string;
    endpoint?: string;
    default?: boolean;
}

export interface AiModeCompatibility {
    compatible: boolean;
    reason: string;
    detailFa?: string;
}

/** یک حالت قابلیتی از کاتالوگ ai-modes — خروجی /api/ai-modes/for-model/:modelId */
export interface AiModeItem {
    _id: string;
    id: string;
    title: string;
    titleFa: string;
    group: string;
    icon?: string;
    iconSvg?: string;
    mediaClass: string;
    providerModes: string[];
    descriptionFa: string;
    guide?: string;
    guideImages?: string[];
    inputs?: Array<{ type: string; key: string; labelFa?: string; required?: boolean; min?: number; max?: number; maxMb?: number }>;
    /** مود ابزاری (مثل «زاویه و نور»): constraints.tool + پریست‌ها */
    constraints?: Record<string, unknown>;
    compatibility: AiModeCompatibility;
    binding: { modeId: string; providerModeId?: string; isActive?: boolean } | null;
    enabled: boolean;
}

export interface DirectorPresetItem {
    _id: string;
    kind: 'camera' | 'lighting';
    layer: string;
    layerTitleFa?: string;
    category?: string;
    categoryTitleFa?: string;
    id: string;
    title: string;
    titleFa: string;
    summaryFa?: string;
    promptText?: string;
    iconSvg?: string;
    guide?: string;
    guideImages?: string[];
    isActive?: boolean;
    sortOrder?: number;
}

export interface StudioDirectorSettings {
    camera?: Record<string, string>;
    lighting?: Record<string, string>;
}

export interface ProviderModelItem {
    _id: string;
    name: string;
    displayName?: string;
    /** توضیح کوتاه زیر نام مدل در لیست انتخاب */
    description?: string;
    iconSvg?: string;
    providerId?: string;
    /** نام ارائه‌دهنده (lookup لیست مدل‌ها) — عنوان گروه در لیست انتخاب مدل */
    providerName?: string;
    providerDisplayName?: string;
    class?: string;
    isActive?: boolean;
    isAlive?: boolean;
    modes?: ProviderModelModeItem[];
    /** Vendor-specific dynamic settings (ElevenLabs voice sliders, HeyGen/Kling fields, ...) */
    settingsSchema?: NodeSettingField[];
}

function activeModelsOnly(models: ProviderModelItem[] | undefined): ProviderModelItem[] {
    return (models ?? []).filter((m) => m.isActive === true);
}

export const providersApi = {
    async listProviders(): Promise<{ providers: ProviderItem[]; totalItems?: number }> {
        const res = await createApiClient().get('/api/providers', { params: { limit: 200, page: 1 } });
        return unwrapApiData(res);
    },

    async listModels(params?: { class?: string; search?: string; providerId?: string }): Promise<{ models: ProviderModelItem[]; totalItems?: number }> {
        const res = await createApiClient().get('/api/provider-models', {
            params: {
                limit: 200,
                page: 1,
                ...(params?.class ? { class: params.class } : {}),
                ...(params?.search ? { search: params.search } : {}),
                ...(params?.providerId ? { provider: params.providerId } : {}),
            },
        });
        const data = unwrapApiData(res) as any;
        return {
            ...data,
            models: activeModelsOnly(data.models),
            totalItems: activeModelsOnly(data.models).length,
        };
    },

    async getModel(modelId: string): Promise<ProviderModelItem> {
        const res = await createApiClient().get(`/api/provider-models/${encodeURIComponent(modelId)}`);
        return unwrapApiData(res);
    },

    /** حالت‌های قابلیتی قابل استفاده برای یک مدل (کاتالوگ ai-modes) */
    async listModesForModel(modelId: string): Promise<{ modes: AiModeItem[] }> {
        const res = await createApiClient().get(`/api/ai-modes/for-model/${encodeURIComponent(modelId)}`);
        const data = unwrapApiData<{ modes?: AiModeItem[] } | AiModeItem[]>(res);
        const modes = Array.isArray(data) ? data : (data?.modes || []);
        return { modes: modes.filter((mode) => mode.enabled !== false) };
    },

    async listDirectorPresets(kind: 'camera' | 'lighting'): Promise<{ presets: DirectorPresetItem[] }> {
        const res = await createApiClient().get('/api/ai-modes/presets', { params: { kind } });
        const data = unwrapApiData<{ presets?: DirectorPresetItem[] } | DirectorPresetItem[]>(res);
        const presets = Array.isArray(data) ? data : (data?.presets || []);
        return { presets: presets.filter((preset) => preset.isActive !== false) };
    },

    async getChatPanels(): Promise<{ mode: boolean; camera: boolean; lighting: boolean; angles: boolean }> {
        const res = await createApiClient().get('/api/ai-modes/chat-panels');
        const data = unwrapApiData<{ mode?: boolean; camera?: boolean; lighting?: boolean; angles?: boolean }>(res);
        return {
            mode: data?.mode !== false,
            camera: data?.camera !== false,
            lighting: data?.lighting !== false,
            angles: data?.angles !== false,
        };
    },

    /** نمای چت per-user (v1 کلاسیک / v2 گالری) — در systemSettings سمت سرور ذخیره می‌شود */
    async getChatView(): Promise<'v1' | 'v2'> {
        const res = await createApiClient().get('/api/ai-modes/chat-view');
        const data = unwrapApiData<'v1' | 'v2' | { view?: 'v1' | 'v2' }>(res);
        const view = typeof data === 'string' ? data : data?.view;
        return view === 'v2' ? 'v2' : 'v1';
    },

    async updateChatView(view: 'v1' | 'v2'): Promise<'v1' | 'v2'> {
        const res = await createApiClient().put('/api/ai-modes/chat-view', { view });
        const data = unwrapApiData<'v1' | 'v2' | { view?: 'v1' | 'v2' }>(res);
        const next = typeof data === 'string' ? data : data?.view;
        return next === 'v2' ? 'v2' : 'v1';
    },
};
