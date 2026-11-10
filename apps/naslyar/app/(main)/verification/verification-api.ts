import axios from 'axios';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';

function getAuthHeaders() {
    const { token } = useAuthStore.getState();
    const { baseUrl } = useAppStore.getState();
    return {
        baseUrl,
        headers: {
            authorization: `Bearer ${token}`,
        },
    };
}

export interface VerificationRecord {
    _id: string;
    userId: string;
    fullName?: string;
    username?: string;
    email?: string;
    userMobile?: string;
    mobile: string;
    nationalCode: string;
    providerKey: string;
    providerName?: string;
    status: 'verified' | 'failed';
    matched: boolean;
    simulated: boolean;
    errorMessage?: string;
    userVerified: boolean;
    createdAt?: string;
}

export interface VerificationProviderItem {
    _id: string;
    providerKey: string;
    displayName: string;
    isActive: boolean;
    sandbox: boolean;
    hasToken: boolean;
    tokenPreview?: string;
    hasKey?: boolean;
    keyPreview?: string;
    hasSecret?: boolean;
    secretPreview?: string;
    baseUrl?: string;
    timeoutMs?: number;
    createdAt?: string;
    updatedAt?: string;
}

const ENDPOINT = '/api/identity-verification';

export async function fetchVerificationList(query: {
    page?: number;
    limit?: number;
    status?: string;
    providerKey?: string;
    query?: string;
}): Promise<{ verifications: VerificationRecord[]; totalItems: number }> {
    const { baseUrl, headers } = getAuthHeaders();
    const params: Record<string, string | number> = {
        page: query.page ?? 1,
        limit: query.limit ?? 20,
    };
    if (query.status) params.status = query.status;
    if (query.providerKey) params.providerKey = query.providerKey;
    if (query.query?.trim()) params.query = query.query.trim();

    const res = await axios.get(`${baseUrl}${ENDPOINT}/admin/list`, { headers, params });
    const data = res.data?.data;
    return {
        verifications: (data?.verifications || []) as VerificationRecord[],
        totalItems: data?.totalItems ?? 0,
    };
}

export async function fetchVerificationById(id: string): Promise<{
    verification: Record<string, unknown> | null;
    user: Record<string, unknown> | null;
} | null> {
    const { baseUrl, headers } = getAuthHeaders();
    const res = await axios.get(`${baseUrl}${ENDPOINT}/admin/${id}`, { headers });
    return res.data?.data ?? null;
}

export async function revokeUserVerification(userId: string): Promise<void> {
    const { baseUrl, headers } = getAuthHeaders();
    await axios.patch(`${baseUrl}${ENDPOINT}/admin/revoke/${userId}`, {}, { headers });
}

export async function fetchVerificationProviders(): Promise<{
    providers: VerificationProviderItem[];
    supported: Array<{ key: string; name: string }>;
}> {
    const { baseUrl, headers } = getAuthHeaders();
    const res = await axios.get(`${baseUrl}${ENDPOINT}/admin/providers/list`, { headers });
    const data = res.data?.data;
    return {
        providers: (data?.providers || []) as VerificationProviderItem[],
        supported: data?.supported || [],
    };
}

export async function updateVerificationProvider(
    id: string,
    payload: {
        displayName?: string;
        baseUrl?: string;
        apiToken?: string;
        apiKey?: string;
        apiSecret?: string;
        sandbox?: boolean;
        timeoutMs?: number;
        isActive?: boolean;
    },
): Promise<VerificationProviderItem> {
    const { baseUrl, headers } = getAuthHeaders();
    const res = await axios.patch(`${baseUrl}${ENDPOINT}/admin/providers/${id}`, payload, { headers });
    return res.data?.data?.provider as VerificationProviderItem;
}

export async function testVerificationProvider(payload: {
    providerKey?: string;
    mobile: string;
    nationalCode: string;
}): Promise<{
    providerKey: string;
    providerDisplayName: string;
    sandbox: boolean;
    success: boolean;
    matched?: boolean;
    simulated?: boolean;
    message?: string;
    errorMessage?: string;
}> {
    const { baseUrl, headers } = getAuthHeaders();
    const res = await axios.post(`${baseUrl}${ENDPOINT}/admin/test`, payload, { headers });
    return res.data?.data;
}
