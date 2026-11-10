import { createApiClient, unwrapApiData } from './api-client';
import type {
    BookmarkedTemplatesResponse,
    CreateMediaProjectPayload,
    CreateMediaSpacePayload,
    CreateStandaloneTemplatePayload,
    ExploreTemplatesResponse,
    ListRunsResponse,
    MarketplaceTemplatesResponse,
    MediaCommentsResponse,
    MediaComment,
    MediaMemberSearchResponse,
    MediaProject,
    MediaProjectBudgetLogsResponse,
    MediaProjectBudgetSummary,
    MediaProjectDetailResponse,
    MediaProjectListResponse,
    MediaProjectMember,
    MediaProjectMembersResponse,
    MediaSpace,
    MediaSpaceListResponse,
    MediaWorkflowTemplate,
    MyTemplatesResponse,
    ProjectLogsResponse,
    ProjectUsageSummaryResponse,
    RunLogsResponse,
    RunNodeResponse,
    RunPipelineResponse,
    RunStatusResponse,
    TemplateCreateInfoResponse,
    TemplatePreviewMedia,
    TemplateReviewRequestsResponse,
    ToggleTemplateBookmarkResponse,
    UpdateMediaProjectSettingsPayload,
    UpdateMediaSpacePayload,
    UpdateMediaWorkflowPayload,
    UpdateTemplatePayload,
    UsageHistoryResponse,
    UsageSummaryResponse,
    UpdateVideoEditorPayload,
    ExportVideoEditorResponse,
    VideoProxyResponse,
    StudioChat,
    StudioChatListItem,
    StudioChatMediaKind,
    StudioChatSettings,
    StudioMediaMention,
} from '../types/media-api';
import type {
    CostEstimatePayload,
    CostEstimateResult,
} from '../components/CostEstimatePanel';

const BASE = '/api/studio/media';

export type RetryStudioChatBody = {
    assistantMessageId: string;
    clientRequestId: string;
    mode: 'retry' | 'edit';
    promptText?: string;
    mentionRefs?: StudioMediaMention[];
    attachments?: TemplatePreviewMedia[];
    mediaKind?: StudioChatMediaKind;
    settings?: StudioChatSettings;
};

export const mediaApi = {
    async listSpaces(): Promise<MediaSpaceListResponse> {
        const res = await createApiClient().get(`${BASE}/spaces`);
        return unwrapApiData(res);
    },

    async createSpace(payload: CreateMediaSpacePayload): Promise<MediaSpace> {
        const res = await createApiClient().post(`${BASE}/spaces`, payload);
        return unwrapApiData(res);
    },

    async updateSpace(spaceId: string, payload: UpdateMediaSpacePayload): Promise<MediaSpace> {
        const res = await createApiClient().put(`${BASE}/spaces/${spaceId}`, payload);
        return unwrapApiData(res);
    },

    async deleteSpace(spaceId: string): Promise<{ success: boolean }> {
        const res = await createApiClient().delete(`${BASE}/spaces/${spaceId}`);
        return unwrapApiData(res);
    },

    /** بدون `page`/`limit` = ۱۰۰ پروژهٔ اخیر (انتخابگرها)؛ صفحهٔ پروژه‌ها صفحه‌بندی می‌فرستد */
    async listProjects(
        spaceId?: string,
        pagination?: { page: number; limit: number },
        /** فیلترهای صفحهٔ پروژه‌ها (q، status، ownership، budget، deadline) — مقدار خالی فرستاده نمی‌شود */
        filters?: Record<string, string | undefined>,
    ): Promise<MediaProjectListResponse> {
        const params = {
            ...(spaceId && spaceId !== 'all' ? { spaceId } : {}),
            ...(pagination ?? {}),
            ...Object.fromEntries(Object.entries(filters ?? {}).filter(([, value]) => Boolean(value))),
        };
        const res = await createApiClient().get(`${BASE}/projects`, { params });
        return unwrapApiData(res);
    },

    async createProject(payload: CreateMediaProjectPayload): Promise<MediaProject> {
        const res = await createApiClient().post(`${BASE}/projects`, payload);
        return unwrapApiData(res);
    },

    async getProject(projectId: string): Promise<MediaProjectDetailResponse> {
        const res = await createApiClient().get(`${BASE}/projects/${projectId}`);
        return unwrapApiData(res);
    },

    async updateWorkflow(projectId: string, payload: UpdateMediaWorkflowPayload): Promise<MediaProject> {
        const res = await createApiClient().put(`${BASE}/projects/${projectId}`, payload);
        return unwrapApiData(res);
    },

    async updateVideoEditor(projectId: string, payload: UpdateVideoEditorPayload): Promise<MediaProject> {
        const res = await createApiClient().put(`${BASE}/projects/${projectId}/video-editor`, payload);
        return unwrapApiData(res);
    },

    async exportVideoEditor(projectId: string): Promise<ExportVideoEditorResponse> {
        const res = await createApiClient().post(`${BASE}/projects/${projectId}/video-editor/export`);
        return unwrapApiData(res);
    },

    /** Get (or create once) a lightweight preview proxy for a source video. */
    async createVideoProxy(projectId: string, url: string): Promise<VideoProxyResponse> {
        const res = await createApiClient().post(`${BASE}/projects/${projectId}/video-proxy`, { url });
        return unwrapApiData(res);
    },

    async deleteProject(projectId: string): Promise<{ success: boolean }> {
        const res = await createApiClient().delete(`${BASE}/projects/${projectId}`);
        return unwrapApiData(res);
    },

    async updateProjectSettings(projectId: string, payload: UpdateMediaProjectSettingsPayload): Promise<MediaProject> {
        const res = await createApiClient().put(`${BASE}/projects/${projectId}/settings`, payload);
        return unwrapApiData(res);
    },

    // ── Project budget escrow ───────────────────────────────────────────
    async getProjectBudget(projectId: string): Promise<MediaProjectBudgetSummary> {
        const res = await createApiClient().get(`${BASE}/projects/${projectId}/budget`);
        return unwrapApiData(res);
    },

    async allocateProjectBudget(projectId: string, amount: number, description?: string): Promise<MediaProjectBudgetSummary> {
        const res = await createApiClient().post(`${BASE}/projects/${projectId}/budget/allocate`, { amount, description });
        return unwrapApiData(res);
    },

    async refundProjectBudget(projectId: string, amount?: number): Promise<MediaProjectBudgetSummary> {
        const res = await createApiClient().post(`${BASE}/projects/${projectId}/budget/refund`, amount != null ? { amount } : {});
        return unwrapApiData(res);
    },

    async getProjectBudgetLogs(projectId: string, params?: { page?: number; limit?: number; type?: string }): Promise<MediaProjectBudgetLogsResponse> {
        const res = await createApiClient().get(`${BASE}/projects/${projectId}/budget/logs`, { params });
        return unwrapApiData(res);
    },

    async getProjectUsageSummary(projectId: string): Promise<ProjectUsageSummaryResponse> {
        const res = await createApiClient().get(`${BASE}/projects/${projectId}/usage/summary`);
        return unwrapApiData(res);
    },

    async runPipeline(projectId: string, body?: { providerId?: string; modelId?: string; targetNodeIds?: string[] }): Promise<RunPipelineResponse> {
        const res = await createApiClient().post(`${BASE}/projects/${projectId}/run`, body ?? {});
        return unwrapApiData(res);
    },

    async runNode(projectId: string, body: { nodeId: string; providerId?: string; modelId?: string; overrides?: Record<string, unknown> }): Promise<RunNodeResponse> {
        const res = await createApiClient().post(`${BASE}/projects/${projectId}/nodes/run`, body);
        return unwrapApiData(res);
    },

    async listRuns(
        projectId: string,
        params?: { page?: number; limit?: number; active?: boolean },
    ): Promise<ListRunsResponse> {
        const res = await createApiClient().get(`${BASE}/projects/${projectId}/runs`, {
            params: {
                page: params?.page,
                limit: params?.limit,
                ...(params?.active ? { active: '1' } : {}),
            },
        });
        return unwrapApiData(res);
    },

    async getRunStatus(runId: string): Promise<RunStatusResponse> {
        const res = await createApiClient().get(`${BASE}/runs/${runId}/status`);
        return unwrapApiData(res);
    },

    async getRunLogs(projectId: string, runId: string): Promise<RunLogsResponse> {
        const res = await createApiClient().get(`${BASE}/projects/${projectId}/runs/${runId}/logs`);
        return unwrapApiData(res);
    },

    async getProjectLogs(projectId: string, params?: { limit?: number; nodeId?: string }): Promise<ProjectLogsResponse> {
        const res = await createApiClient().get(`${BASE}/projects/${projectId}/logs`, { params });
        return unwrapApiData(res);
    },

    // ── Workflow templates / clone marketplace ──────────────────────────
    async createWorkflowTemplate(projectId: string, body: {
        title: string;
        description?: string;
        previewMedia?: TemplatePreviewMedia[];
    }): Promise<MediaWorkflowTemplate> {
        const res = await createApiClient().post(`${BASE}/projects/${projectId}/create-template`, body);
        return unwrapApiData(res);
    },

    async getTemplateCreateInfo(projectId: string): Promise<TemplateCreateInfoResponse> {
        const res = await createApiClient().get(`${BASE}/projects/${projectId}/template-create-info`);
        return unwrapApiData(res);
    },

    async createStandaloneTemplate(body: CreateStandaloneTemplatePayload): Promise<MediaWorkflowTemplate> {
        const res = await createApiClient().post(`${BASE}/workflow-templates`, body);
        return unwrapApiData(res);
    },

    async updateTemplate(templateId: string, body: UpdateTemplatePayload): Promise<MediaWorkflowTemplate> {
        const res = await createApiClient().put(`${BASE}/workflow-templates/${templateId}`, body);
        return unwrapApiData(res);
    },

    async getTemplate(templateId: string): Promise<MediaWorkflowTemplate> {
        const res = await createApiClient().get(`${BASE}/workflow-templates/${templateId}`);
        return unwrapApiData(res);
    },

    async getTemplatePreview(templateId: string): Promise<MediaWorkflowTemplate> {
        const res = await createApiClient().get(`${BASE}/workflow-templates/${templateId}/preview`);
        return unwrapApiData(res);
    },

    async forkPromptTemplateRevision(templateId: string, body: UpdateTemplatePayload): Promise<MediaWorkflowTemplate> {
        const res = await createApiClient().post(`${BASE}/workflow-templates/${templateId}/fork-prompt-revision`, body);
        return unwrapApiData(res);
    },

    /** فقط ادمین: منتشرکنندهٔ قالب (شناسهٔ کاربر نمایشی، یا '' برای برگشت به سازندهٔ واقعی) */
    async setTemplatePublisher(templateId: string, publisherUserId: string): Promise<MediaWorkflowTemplate> {
        const res = await createApiClient().put(`${BASE}/workflow-templates/admin/${templateId}/publisher`, { publisherUserId });
        return unwrapApiData(res);
    },

    /** فقط ادمین: انتشار مستقیم (بدون صف بررسی) یا برگشت به پیش‌نویس خصوصی */
    async setTemplateStatus(templateId: string, status: 'draft' | 'approved'): Promise<MediaWorkflowTemplate> {
        const res = await createApiClient().put(`${BASE}/workflow-templates/admin/${templateId}/status`, { status });
        return unwrapApiData(res);
    },

    async importTemplate(projectId: string, templateId: string): Promise<MediaProject> {
        const res = await createApiClient().post(`${BASE}/projects/${projectId}/import-template`, { templateId });
        return unwrapApiData(res);
    },

    async listMyTemplates(): Promise<MyTemplatesResponse> {
        const res = await createApiClient().get(`${BASE}/workflow-templates/mine`);
        return unwrapApiData(res);
    },

    async listReviewRequests(params?: {
        status?: 'pending' | 'approved' | 'rejected' | 'all';
        page?: number;
        limit?: number;
    }): Promise<TemplateReviewRequestsResponse> {
        const res = await createApiClient().get(`${BASE}/workflow-templates/mine/review-requests`, { params });
        return unwrapApiData(res);
    },

    async listMarketplaceTemplates(): Promise<MarketplaceTemplatesResponse> {
        const res = await createApiClient().get(`${BASE}/workflow-templates/marketplace`);
        return unwrapApiData(res);
    },

    async exploreTemplates(params?: {
        search?: string;
        kind?: string;
        aiModel?: string;
        page?: number;
        limit?: number;
    }): Promise<ExploreTemplatesResponse> {
        const res = await createApiClient().get(`${BASE}/workflow-templates/explore`, { params });
        return unwrapApiData(res);
    },

    async listBookmarkedTemplates(): Promise<BookmarkedTemplatesResponse> {
        const res = await createApiClient().get(`${BASE}/workflow-templates/bookmarks`);
        return unwrapApiData(res);
    },

    async toggleTemplateBookmark(templateId: string): Promise<ToggleTemplateBookmarkResponse> {
        const res = await createApiClient().post(`${BASE}/workflow-templates/bookmarks/${templateId}/toggle`);
        return unwrapApiData(res);
    },

    async submitTemplateForReview(templateId: string): Promise<MediaWorkflowTemplate> {
        const res = await createApiClient().post(`${BASE}/workflow-templates/${templateId}/submit-review`);
        return unwrapApiData(res);
    },

    async deleteTemplate(templateId: string): Promise<{ success: boolean }> {
        const res = await createApiClient().delete(`${BASE}/workflow-templates/${templateId}`);
        return unwrapApiData(res);
    },

    // ── AI usage / cost ──────────────────────────────────────────────────
    async getUsageSummary(): Promise<UsageSummaryResponse> {
        const res = await createApiClient().get(`${BASE}/usage/summary`);
        return unwrapApiData(res);
    },

    async getUsageHistory(params: { page?: number; limit?: number } = {}): Promise<UsageHistoryResponse> {
        const res = await createApiClient().get(`${BASE}/usage/history`, { params });
        return unwrapApiData(res);
    },

    async estimateCost(payload: CostEstimatePayload): Promise<CostEstimateResult> {
        const res = await createApiClient({ allowGuest: true }).post(`${BASE}/cost/estimate`, payload);
        return unwrapApiData<CostEstimateResult>(res);
    },

    async optimizePrompt(payload: {
        modelId: string;
        providerId?: string;
        action: 'optimize_en' | 'optimize_fa' | 'generate';
        prompt: string;
        projectId?: string;
    }): Promise<{ prompt: string; chargedUsd: number; modelName: string }> {
        const res = await createApiClient().post(`${BASE}/prompt-optimize`, payload, { timeout: 180_000 });
        return unwrapApiData(res);
    },

    // ── Team members ─────────────────────────────────────────────────────
    async listMembers(projectId: string): Promise<MediaProjectMembersResponse> {
        const res = await createApiClient().get(`${BASE}/projects/${projectId}/members`);
        return unwrapApiData(res);
    },

    async searchMemberCandidates(projectId: string, email: string): Promise<MediaMemberSearchResponse> {
        const res = await createApiClient().get(`${BASE}/projects/${projectId}/members/search/${encodeURIComponent(email)}`);
        return unwrapApiData(res);
    },

    async addMember(projectId: string, userId: string, body: { role?: string; authority?: string }): Promise<MediaProjectMember> {
        const res = await createApiClient().post(`${BASE}/projects/${projectId}/members/${userId}`, body);
        return unwrapApiData(res);
    },

    async updateMember(projectId: string, userId: string, body: { role?: string; authority?: string }): Promise<MediaProjectMember> {
        const res = await createApiClient().put(`${BASE}/projects/${projectId}/members/${userId}`, body);
        return unwrapApiData(res);
    },

    async removeMember(projectId: string, userId: string): Promise<{ success: boolean }> {
        const res = await createApiClient().delete(`${BASE}/projects/${projectId}/members/${userId}`);
        return unwrapApiData(res);
    },

    // ── Comments ─────────────────────────────────────────────────────────
    async listComments(projectId: string): Promise<MediaCommentsResponse> {
        const res = await createApiClient().get(`${BASE}/projects/${projectId}/comments`);
        return unwrapApiData(res);
    },

    async addComment(projectId: string, body: { text?: string; attachments?: MediaComment['attachments'] }): Promise<MediaComment> {
        const res = await createApiClient().post(`${BASE}/projects/${projectId}/comments`, body);
        return unwrapApiData(res);
    },

    async deleteComment(projectId: string, commentId: string): Promise<{ success: boolean }> {
        const res = await createApiClient().delete(`${BASE}/projects/${projectId}/comments/${commentId}`);
        return unwrapApiData(res);
    },

    async getChatDraft(projectId: string): Promise<{ chat: StudioChat | null }> {
        const res = await createApiClient().get(`${BASE}/projects/${projectId}/chats/draft`);
        return unwrapApiData(res);
    },

    async listChats(projectId: string): Promise<{ chats: StudioChatListItem[] }> {
        const res = await createApiClient().get(`${BASE}/projects/${projectId}/chats`);
        return unwrapApiData(res);
    },

    async createChat(projectId: string, body?: { keepDraft?: boolean }): Promise<StudioChat | null> {
        const res = await createApiClient().post(`${BASE}/projects/${projectId}/chats`, body ?? {});
        return unwrapApiData(res);
    },

    async upsertChatDraft(projectId: string, body: {
        mediaKind?: StudioChatMediaKind;
        promptText?: string;
        attachments?: TemplatePreviewMedia[];
        mentionRefs?: StudioMediaMention[];
        settings?: StudioChatSettings;
    }): Promise<StudioChat | null> {
        const res = await createApiClient().put(`${BASE}/projects/${projectId}/chats/draft`, body);
        return unwrapApiData(res);
    },

    async getChat(projectId: string, chatId: string): Promise<StudioChat> {
        const res = await createApiClient().get(`${BASE}/projects/${projectId}/chats/${chatId}`);
        return unwrapApiData(res);
    },

    async patchChat(projectId: string, chatId: string, body: {
        mediaKind?: StudioChatMediaKind;
        promptText?: string;
        attachments?: TemplatePreviewMedia[];
        mentionRefs?: StudioMediaMention[];
        settings?: StudioChatSettings;
    }): Promise<StudioChat> {
        const res = await createApiClient().patch(`${BASE}/projects/${projectId}/chats/${chatId}`, body);
        return unwrapApiData(res);
    },

    async sendChat(projectId: string, chatId: string, body?: { promptText?: string; mentionRefs?: StudioMediaMention[]; quotedUsd?: number }): Promise<StudioChat> {
        const res = await createApiClient().post(`${BASE}/projects/${projectId}/chats/${chatId}/send`, body ?? {});
        return unwrapApiData(res);
    },

    async retryChat(projectId: string, chatId: string, body: RetryStudioChatBody): Promise<StudioChat> {
        const res = await createApiClient().post(`${BASE}/projects/${projectId}/chats/${chatId}/retry`, body);
        return unwrapApiData(res);
    },

    async deleteChat(projectId: string, chatId: string): Promise<{ success: boolean }> {
        const res = await createApiClient().delete(`${BASE}/projects/${projectId}/chats/${chatId}`);
        return unwrapApiData(res);
    },

    /** حذف یک خروجی تولیدشده + فایل‌هایش از storage (storageDeleted=false یعنی جای دیگری هنوز استفاده می‌شد) */
    /** حذف نوبت ناموفق (پیام FAILED + پرامپت همان نوبت) از تاریخچه چت */
    async deleteChatFailedTurn(projectId: string, chatId: string, messageId: string): Promise<{ chat: StudioChat }> {
        const res = await createApiClient().post(
            `${BASE}/projects/${projectId}/chats/${chatId}/messages/${encodeURIComponent(messageId)}/delete-turn`,
        );
        return unwrapApiData(res);
    },

    async deleteChatOutput(projectId: string, chatId: string, messageId: string, url: string): Promise<{ chat: StudioChat; storageDeleted: boolean }> {
        const res = await createApiClient().post(
            `${BASE}/projects/${projectId}/chats/${chatId}/messages/${encodeURIComponent(messageId)}/delete-output`,
            { url },
        );
        return unwrapApiData(res);
    },

    async getPersonalChatDraft(): Promise<{ chat: StudioChat | null }> {
        const res = await createApiClient().get(`${BASE}/chats/draft`);
        return unwrapApiData(res);
    },

    async listPersonalChats(): Promise<{ chats: StudioChatListItem[] }> {
        const res = await createApiClient().get(`${BASE}/chats`);
        return unwrapApiData(res);
    },

    async createPersonalChat(body?: { keepDraft?: boolean }): Promise<StudioChat | null> {
        const res = await createApiClient().post(`${BASE}/chats`, body ?? {});
        return unwrapApiData(res);
    },

    async upsertPersonalChatDraft(body: {
        mediaKind?: StudioChatMediaKind;
        promptText?: string;
        attachments?: TemplatePreviewMedia[];
        mentionRefs?: StudioMediaMention[];
        settings?: StudioChatSettings;
    }): Promise<StudioChat | null> {
        const res = await createApiClient().put(`${BASE}/chats/draft`, body);
        return unwrapApiData(res);
    },

    async getPersonalChat(chatId: string): Promise<StudioChat> {
        const res = await createApiClient().get(`${BASE}/chats/${chatId}`);
        return unwrapApiData(res);
    },

    async patchPersonalChat(chatId: string, body: {
        mediaKind?: StudioChatMediaKind;
        promptText?: string;
        attachments?: TemplatePreviewMedia[];
        mentionRefs?: StudioMediaMention[];
        settings?: StudioChatSettings;
    }): Promise<StudioChat> {
        const res = await createApiClient().patch(`${BASE}/chats/${chatId}`, body);
        return unwrapApiData(res);
    },

    async sendPersonalChat(chatId: string, body?: { promptText?: string; mentionRefs?: StudioMediaMention[]; quotedUsd?: number }): Promise<StudioChat> {
        const res = await createApiClient().post(`${BASE}/chats/${chatId}/send`, body ?? {});
        return unwrapApiData(res);
    },

    async retryPersonalChat(chatId: string, body: RetryStudioChatBody): Promise<StudioChat> {
        const res = await createApiClient().post(`${BASE}/chats/${chatId}/retry`, body);
        return unwrapApiData(res);
    },

    async deletePersonalChat(chatId: string): Promise<{ success: boolean }> {
        const res = await createApiClient().delete(`${BASE}/chats/${chatId}`);
        return unwrapApiData(res);
    },

    async deletePersonalChatFailedTurn(chatId: string, messageId: string): Promise<{ chat: StudioChat }> {
        const res = await createApiClient().post(
            `${BASE}/chats/${chatId}/messages/${encodeURIComponent(messageId)}/delete-turn`,
        );
        return unwrapApiData(res);
    },

    async deletePersonalChatOutput(chatId: string, messageId: string, url: string): Promise<{ chat: StudioChat; storageDeleted: boolean }> {
        const res = await createApiClient().post(
            `${BASE}/chats/${chatId}/messages/${encodeURIComponent(messageId)}/delete-output`,
            { url },
        );
        return unwrapApiData(res);
    },

    /** chatId: چتی که فایل از کادرش برداشته شد — سرور فایلِ هنوز در استفاده (نوبت/چت دیگر/قالب) را پاک نمی‌کند */
    async deleteOwnedFile(fileId: string, chatId?: string): Promise<{ success: boolean; kept?: boolean }> {
        const res = await createApiClient().delete(`${BASE}/files/${fileId}`, { params: chatId ? { chatId } : undefined });
        return unwrapApiData(res);
    },
};
