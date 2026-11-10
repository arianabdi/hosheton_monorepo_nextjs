import axios from 'axios';
import {useAuthStore} from '@/app/zustand/store/authStore';
import {useAppStore} from '@/app/zustand/store/useAppStore';

function getRequestConfig() {
    const {token} = useAuthStore.getState();
    const {baseUrl} = useAppStore.getState();
    return {
        baseUrl: baseUrl || process.env.NEXT_PUBLIC_API_URL,
        headers: {
            authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    };
}

export interface PublicationItem {
    _id: string;
    entityId: string;
    status: string;
    extras?: Record<string, unknown>;
    createdAt?: string;
    updatedAt?: string;
}

export const openforexAdminApi = {
    async listPublications(): Promise<PublicationItem[]> {
        const {baseUrl, headers} = getRequestConfig();
        const res = await axios.get(`${baseUrl}/api/publication/bot/all/admin`, {headers});
        return res.data.data || [];
    },

    async approvePublication(botId: string, publicationId: string) {
        const {baseUrl, headers} = getRequestConfig();
        const res = await axios.put(
            `${baseUrl}/api/publication/bot/publish/${botId}/${publicationId}`,
            {},
            {headers},
        );
        return res.data.data;
    },

    async rejectPublication(publicationId: string, reason: string) {
        const {baseUrl, headers} = getRequestConfig();
        const res = await axios.put(
            `${baseUrl}/api/publication/bot/reject/${publicationId}`,
            {reason},
            {headers},
        );
        return res.data.data;
    },

    async listComments(params?: {status?: string; page?: number; limit?: number}) {
        const {baseUrl, headers} = getRequestConfig();
        const res = await axios.get(`${baseUrl}/api/bot/marketplace/admin/comments`, {headers, params});
        return res.data.data;
    },

    async reviewComment(commentId: string, status: string, adminNote?: string) {
        const {baseUrl, headers} = getRequestConfig();
        const res = await axios.put(
            `${baseUrl}/api/bot/marketplace/admin/comments/${commentId}`,
            {status, adminNote},
            {headers},
        );
        return res.data.data;
    },

    async listPurchases(params?: {status?: string; page?: number; limit?: number}) {
        const {baseUrl, headers} = getRequestConfig();
        const res = await axios.get(`${baseUrl}/api/bot/marketplace/admin/purchases`, {headers, params});
        return res.data.data;
    },
};
