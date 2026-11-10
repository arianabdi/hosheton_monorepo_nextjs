export interface AiProviderLog {
    _id: string;
    userId: string;
    provider: string;
    endpoint: string;
    method: string;
    requestHeaders?: Record<string, any>;
    requestBody: Record<string, any>;
    responseStatus?: number;
    responseHeaders?: Record<string, any>;
    responseBody?: Record<string, any>;
    responseTime?: number;
    error?: string;
    status: 'pending' | 'sent' | 'success' | 'failed' | 'rejected';
    projectId?: string;
    nodeId?: string;
    runId?: string;
    nodeType?: string;
    modelId?: string;
    costEstimate?: Record<string, unknown> | null;
    actualCost?: Record<string, unknown> | null;
    modelSettingsRaw?: Record<string, unknown> | null;
    resolvedSettings?: Record<string, unknown> | null;
    settingsSchemaSource?: Record<string, unknown> | null;
    payloadTransformation?: Record<string, unknown> | null;
    runtimeMetrics?: Record<string, string | number | boolean> | null;
    createdAt: string;
    updatedAt: string;
}

export interface ProviderLogsPage {
    logs: AiProviderLog[];
    total: number;
    hasMore: boolean;
    limit: number;
    skip: number;
}

export interface DeveloperInterceptMode {
    interceptModeEnabled: boolean;
}

export interface CreateProviderLogPayload {
    provider: string;
    endpoint: string;
    method: string;
    requestHeaders?: Record<string, any>;
    requestBody: Record<string, any>;
}

export interface UpdateProviderLogPayload {
    responseStatus?: number;
    responseHeaders?: Record<string, any>;
    responseBody?: Record<string, any>;
    responseTime?: number;
    error?: string;
    status?: 'pending' | 'sent' | 'success' | 'failed' | 'rejected';
}
