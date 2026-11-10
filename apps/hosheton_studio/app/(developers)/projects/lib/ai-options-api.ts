import { createApiClient, unwrapApiData } from './api-client';
import type { NodeSettingUrlSource } from '../types/node-catalog';

export interface AiOptionItem {
    value: string;
    label: string;
    /** Optional preview sample media URL passed through from the vendor item. */
    preview?: string;
}

export interface UrlOptionsFetchRequest extends NodeSettingUrlSource {
    /** Optional provider name used to resolve `{{baseUrl}}` / `{{apiKey}}` placeholders. */
    providerName?: string;
}

/**
 * Generic proxy for vendor-specific `optionsSource` fields declared in
 * `ProviderModel.settingsSchema` (e.g. HeyGen avatars/voices, ElevenLabs voices).
 * Backed by `GET /api/ai/:provider/options/:resource`.
 */
export const aiOptionsApi = {
    async getOptions(providerName: string, resource: string): Promise<{ options: AiOptionItem[] }> {
        const res = await createApiClient().get(`/api/ai/${encodeURIComponent(providerName)}/options/${encodeURIComponent(resource)}`);
        return unwrapApiData(res);
    },

    /**
     * Generic, fully data-driven options source for `NodeSettingField.urlSource`.
     * Fetches an arbitrary URL server-side via `POST /api/ai/options/fetch` and maps
     * the response to `{ value, label }[]` using dot-paths.
     */
    async fetchUrlOptions(request: UrlOptionsFetchRequest): Promise<{ options: AiOptionItem[] }> {
        const res = await createApiClient().post('/api/ai/options/fetch', request);
        return unwrapApiData(res);
    },
};
