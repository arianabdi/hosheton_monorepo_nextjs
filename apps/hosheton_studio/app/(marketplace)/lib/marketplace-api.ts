import axios from 'axios';
import { attachStatusInterceptors, createApiClient, unwrapApiData } from '@/app/(developers)/projects/lib/api-client';
import type { BookmarkedTemplatesResponse } from '@/app/(developers)/projects/types/media-api';
import type {
    AnalyticsDashboard,
    ConversationItem,
    CreatorProfile,
    CreatorSalesWalletSnapshot,
    CreatorSettlementRequestItem,
    DirectMessageItem,
    ExploreResponse,
    MessageReportReason,
    SharedItemsResponse,
    SharedKind,
    MarketplaceExploreCategory,
    MarketplaceTemplateItem,
    TemplatePurchaseQuote,
    TemplateTagCategoryItem,
} from './types';

const BASE = '/api/studio/marketplace';

type OutgoingAttachment = { fileId: string; width?: number | null; height?: number | null };

type SentDirectMessage = {
    conversationId: string;
    messageId: string;
    message: DirectMessageItem;
    conversation: ConversationItem | null;
};

/** Public API client — works without auth token */
function createPublicClient() {
    return attachStatusInterceptors(axios.create({
        baseURL: process.env.NEXT_PUBLIC_API_URL,
        headers: { 'Content-Type': 'application/json' },
    }));
}

/** Optional-auth client — sends token if available */
function createOptionalAuthClient() {
    return createApiClient();
}

export const marketplaceApi = {
    async exploreTemplates(params?: {
        search?: string;
        kind?: string;
        aiModel?: string;
        /** slug «موضوع» (badge) */
        category?: string;
        /** مسیر دستهٔ سلسله‌مراتبی (a/b) — قالب‌های خودش و زیرشاخه‌ها */
        categoryPath?: string;
        page?: number;
        limit?: number;
    }): Promise<ExploreResponse> {
        const client = createOptionalAuthClient();
        const res = await client.get(`${BASE}/explore`, { params });
        return unwrapApiData(res);
    },

    /** `onlyUsed`: فقط موضوع‌هایی که قالب دارند (در `categoryPath` اگر آمده) — برای چیپ‌های اکسپلور */
    async listCategories(params?: { onlyUsed?: boolean; categoryPath?: string }): Promise<{ categories: MarketplaceExploreCategory[] }> {
        const res = await createPublicClient().get(`${BASE}/categories`, { params });
        return unwrapApiData(res);
    },

    async listTemplateTags(): Promise<{ tags: TemplateTagCategoryItem[] }> {
        const res = await createPublicClient().get(`${BASE}/template-tags`);
        return unwrapApiData(res);
    },

    async getTemplate(id: string): Promise<MarketplaceTemplateItem> {
        const client = createOptionalAuthClient();
        const res = await client.get(`${BASE}/templates/${id}`);
        return unwrapApiData(res);
    },

    async listSimilar(id: string): Promise<{ templates: MarketplaceTemplateItem[] }> {
        const client = createOptionalAuthClient();
        const res = await client.get(`${BASE}/templates/${id}/similar`);
        return unwrapApiData(res);
    },

    async getCreatorProfile(id: string): Promise<CreatorProfile> {
        const res = await createOptionalAuthClient().get(`${BASE}/creators/${id}`);
        return unwrapApiData(res);
    },

    async getPurchaseQuote(id: string): Promise<TemplatePurchaseQuote> {
        const res = await createApiClient().get(`${BASE}/templates/${id}/purchase-quote`);
        return unwrapApiData(res);
    },

    async purchaseTemplate(id: string): Promise<{ purchaseId?: string; alreadyPurchased?: boolean; alreadyFree?: boolean; amount?: number; currency?: string }> {
        const res = await createApiClient().post(`${BASE}/templates/${id}/purchase`);
        return unwrapApiData(res);
    },

    async listPurchasedTemplates(): Promise<BookmarkedTemplatesResponse> {
        const res = await createApiClient().get(`${BASE}/purchases`);
        return unwrapApiData(res);
    },

    async listChatFeatured(): Promise<{ templates: MarketplaceTemplateItem[] }> {
        const client = createOptionalAuthClient();
        const res = await client.get(`${BASE}/chat-featured`);
        return unwrapApiData(res);
    },

    async getAnalytics(): Promise<AnalyticsDashboard> {
        const res = await createApiClient().get(`${BASE}/analytics/dashboard`);
        return unwrapApiData(res);
    },

    // ── Creator product-sales wallet (IRT) ──────────────────────────────

    async getSalesWallet(): Promise<CreatorSalesWalletSnapshot> {
        const res = await createApiClient().get(`${BASE}/creator-wallet`);
        return unwrapApiData(res);
    },

    async listSettlementRequests(): Promise<{ items: CreatorSettlementRequestItem[] }> {
        const res = await createApiClient().get(`${BASE}/creator-wallet/settlement-requests`);
        return unwrapApiData(res);
    },

    async createSettlementRequest(payload: {
        amount: number;
        payoutMethod: 'sheba' | 'card';
        payoutDetails: string;
        note?: string;
    }): Promise<CreatorSettlementRequestItem> {
        const res = await createApiClient().post(`${BASE}/creator-wallet/settlement-requests`, payload);
        return unwrapApiData(res);
    },

    async listConversations(asCreator?: boolean): Promise<{ conversations: ConversationItem[] }> {
        const params = typeof asCreator === 'boolean' ? { asCreator: asCreator ? 'true' : 'false' } : undefined;
        const res = await createApiClient().get(`${BASE}/messages/conversations`, { params });
        return unwrapApiData(res);
    },

    async getMessageUnreadCount(): Promise<{ count: number }> {
        const res = await createApiClient().get(`${BASE}/messages/unread-count`);
        return unwrapApiData(res);
    },

    async getMessages(
        conversationId: string,
        params?: { before?: string; limit?: number },
    ): Promise<{ conversation: ConversationItem; messages: DirectMessageItem[]; hasMore: boolean; unreadBefore?: number }> {
        const res = await createApiClient().get(`${BASE}/messages/conversations/${conversationId}`, { params });
        return unwrapApiData(res);
    },

    async sendMessage(payload: {
        creatorUserId: string;
        templateId?: string;
        body: string;
        attachments?: OutgoingAttachment[];
    }): Promise<SentDirectMessage> {
        const res = await createApiClient().post(`${BASE}/messages/send`, payload);
        return unwrapApiData(res);
    },

    async replyMessage(
        conversationId: string,
        body: string,
        attachments?: OutgoingAttachment[],
        replyToId?: string,
    ): Promise<SentDirectMessage> {
        const res = await createApiClient().post(`${BASE}/messages/conversations/${conversationId}/reply`, {
            body,
            attachments,
            ...(replyToId ? { replyToId } : {}),
        });
        return unwrapApiData(res);
    },

    async forwardMessages(payload: {
        conversationId: string;
        messageIds: string[];
        targetConversationIds: string[];
    }): Promise<{ forwarded: number; results: Array<{ conversationId: string; ok: boolean; conversation?: ConversationItem | null }> }> {
        const res = await createApiClient().post(`${BASE}/messages/forward`, payload);
        return unwrapApiData(res);
    },

    async getSharedItems(conversationId: string, params: { kind: SharedKind; before?: string }): Promise<SharedItemsResponse> {
        const res = await createApiClient().get(`${BASE}/messages/conversations/${conversationId}/shared`, { params });
        return unwrapApiData(res);
    },

    async organizeConversation(
        conversationId: string,
        action: 'pin' | 'unpin' | 'archive' | 'unarchive',
    ): Promise<{ conversation: ConversationItem }> {
        const res = await createApiClient().post(`${BASE}/messages/conversations/${conversationId}/organize/${action}`);
        return unwrapApiData(res);
    },

    /** حذف گفتگو فقط برای من — طرف مقابل نسخهٔ خودش را دارد */
    async deleteConversation(conversationId: string): Promise<{ conversationId: string }> {
        const res = await createApiClient().delete(`${BASE}/messages/conversations/${conversationId}`);
        return unwrapApiData(res);
    },

    async setConversationBlocked(conversationId: string, blocked: boolean): Promise<{ conversation: ConversationItem | null }> {
        const res = await createApiClient().post(`${BASE}/messages/conversations/${conversationId}/${blocked ? 'block' : 'unblock'}`);
        return unwrapApiData(res);
    },

    async reportConversation(
        conversationId: string,
        payload: { reason: MessageReportReason; details?: string; messageId?: string; block?: boolean },
    ): Promise<{ reportId: string; alreadyReported: boolean; blocked: boolean }> {
        const res = await createApiClient().post(`${BASE}/messages/conversations/${conversationId}/report`, payload);
        return unwrapApiData(res);
    },

    async markConversationRead(conversationId: string): Promise<{ conversationId: string; count: number }> {
        const res = await createApiClient().post(`${BASE}/messages/conversations/${conversationId}/read`);
        return unwrapApiData(res);
    },

    async deleteMessage(conversationId: string, messageId: string) {
        const res = await createApiClient().delete(`${BASE}/messages/conversations/${conversationId}/messages/${messageId}`);
        return unwrapApiData(res);
    },

    async toggleLike(templateId: string): Promise<{ liked: boolean; likeCount: number; templateId: string }> {
        const res = await createApiClient().post(`${BASE}/templates/${templateId}/like`);
        return unwrapApiData(res);
    },
};

export const notificationApi = {
    async list(params?: { page?: number; limit?: number }) {
        const res = await createApiClient().get('/api/notification', { params });
        return unwrapApiData(res);
    },

    async getUnreadCount(): Promise<{ count: number }> {
        const res = await createApiClient().get('/api/notification/unread-count');
        return unwrapApiData(res);
    },

    async markAsRead(id: string) {
        const res = await createApiClient().patch(`/api/notification/${id}/read`);
        return unwrapApiData(res);
    },

    async markAllAsRead() {
        const res = await createApiClient().post('/api/notification/read-all');
        return unwrapApiData(res);
    },
};
