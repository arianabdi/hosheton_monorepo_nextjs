import type { VideoEditorPersistedState } from '../lib/video-editor-serializer';
import type { StudioEdgeData, StudioMediaMention, StudioMediaRef } from '../lib/studio-media';

export interface WorkflowNode {
    id: string;
    type: string;
    data?: Record<string, unknown>;
    parentId?: string;
    position?: { x: number; y: number };
    style?: Record<string, unknown>;
    extent?: string;
    zIndex?: number;
    width?: number;
    height?: number;
}

export interface WorkflowEdge {
    id?: string;
    source: string;
    target: string;
    sourceHandle?: string;
    targetHandle?: string;
    type?: string;
    animated?: boolean;
    style?: Record<string, unknown>;
    data?: StudioEdgeData;
}

export type MediaProjectStatus = 'in_progress' | 'completed';

export interface MediaSpace {
    _id: string;
    name: string;
    description?: string;
    projectCount?: number;
    createdAt?: string;
    updatedAt?: string;
}

export interface MediaSpaceListResponse {
    spaces: MediaSpace[];
    totalItems: number;
}

export interface CreateMediaSpacePayload {
    name: string;
    description?: string;
}

export interface UpdateMediaSpacePayload {
    name?: string;
    description?: string;
}

export interface MediaProject {
    _id: string;
    title: string;
    description?: string;
    templateId?: string | null;
    spaceId?: string | null;
    space?: { _id: string; name: string; description?: string } | null;
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
    /** Persisted video editor timeline — separate from workflow graph */
    videoEditor?: VideoEditorPersistedState | null;
    isAlive?: boolean;
    createdAt?: string;
    updatedAt?: string;
    budget?: number | null;
    /** Settled consumption paid out of the project escrow (USD) */
    budgetSpent?: number;
    /** In-flight provider-call holds on the escrow (USD) */
    budgetReserved?: number;
    /** budget − budgetSpent − budgetReserved, computed server-side */
    budgetRemaining?: number;
    deadline?: string | null;
    status?: MediaProjectStatus;
    icon?: string;
    color?: string;
    spentCost?: number;
    generatedAssetsCount?: number;
    /** Computed server-side (in-memory, no aggregation) on list/get responses */
    aiModelsCount?: number;
    filesCount?: number;
    /** List only: AI outputs on the canvas by kind */
    generatedCounts?: { image: number; video: number; audio: number };
    /** List only: project owner + first active members (preview) and their total */
    owner?: MediaProjectPerson | null;
    members?: MediaProjectPerson[];
    membersCount?: number;
    isOwner?: boolean;
    canManage?: boolean;
}

export interface MediaProjectPerson {
    _id: string;
    fullName: string;
    avatar: string;
    initials: string;
}

export interface MediaProjectListResponse {
    projects: MediaProject[];
    totalItems: number;
    page?: number;
    limit?: number;
}

export interface MediaProjectDetailResponse {
    project: MediaProject;
    recentRuns?: unknown[];
}

export interface CreateMediaProjectPayload {
    title: string;
    description?: string;
    spaceId?: string;
    templateId?: string;
    nodes?: WorkflowNode[];
    edges?: WorkflowEdge[];
    budget?: number;
    deadline?: string;
    icon?: string;
    color?: string;
}

export interface UpdateMediaWorkflowPayload {
    title?: string;
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
}

export interface UpdateVideoEditorPayload {
    videoEditor: VideoEditorPersistedState;
}

export interface ExportVideoEditorResponse {
    runId: string;
    status: string;
    message: string;
    outputUrl?: string;
}

export interface VideoProxyResponse {
    /** Lightweight preview URL (≤480p H.264) for the requested source video. */
    proxyUrl: string;
    /** True when a proxy for this source already existed. */
    cached?: boolean;
}

export interface UpdateMediaProjectSettingsPayload {
    title?: string;
    description?: string;
    spaceId?: string | null;
    /** Budget escrow no longer moves through settings — use the budget allocate/refund endpoints */
    deadline?: string | null;
    status?: MediaProjectStatus;
    icon?: string;
    color?: string;
}

export interface MediaProjectBudgetSummary {
    projectId: string;
    /** Total escrowed (USD) */
    budget: number;
    budgetSpent: number;
    budgetReserved: number;
    remaining: number;
    isOwner: boolean;
}

export type MediaProjectBudgetLogType = 'allocate' | 'refund' | 'consume' | 'adjust';

export interface MediaProjectBudgetLog {
    _id: string;
    type: MediaProjectBudgetLogType;
    amount: number;
    remainingAfter: number;
    actorId: string;
    runId?: string | null;
    nodeId?: string;
    jobId?: string;
    modelId?: string;
    description?: string;
    createdAt: string;
}

export interface MediaProjectBudgetLogsResponse {
    logs: MediaProjectBudgetLog[];
    totalItems: number;
    page: number;
    limit: number;
}

export interface RunPipelineResponse {
    run: { _id: string; jobId: string; status: string };
    jobId: string;
}

export interface RunNodeResponse {
    run: { _id: string; jobId: string; status: string };
    jobId: string;
}

export interface MediaRun {
    _id: string;
    projectId: string;
    userId: string;
    jobId: string;
    status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
    executionOrder?: string[];
    nodeResults?: Record<string, unknown>;
    finalOutput?: Record<string, unknown>;
    errorMessage?: string;
    usage?: { totalCost?: number; currency?: string };
    jobState?: string;
    jobStateLabel?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface ListRunsResponse {
    runs: MediaRun[];
    totalItems?: number;
    page?: number;
    limit?: number;
}

export interface RunStatusResponse {
    runId: string;
    projectId: string;
    status: MediaRun['status'];
    executionOrder?: string[];
    nodeResults?: Record<string, unknown>;
    finalOutput?: Record<string, unknown>;
    errorMessage?: string;
    jobId?: string;
    jobState?: string;
    jobStateLabel?: string;
}

export type MediaJobLogLevel = 'info' | 'warning' | 'error';
export type MediaJobLogStage =
    | 'queued' | 'started' | 'attempt' | 'api_call' | 'polling' | 'retry' | 'completed' | 'failed';

export interface MediaJobLogErrorDetail {
    message?: string;
    code?: string;
    stack?: string;
    raw?: unknown;
}

export interface MediaJobLog {
    _id: string;
    runId: string;
    projectId: string;
    userId: string;
    nodeId?: string;
    nodeType?: string;
    level: MediaJobLogLevel;
    stage: MediaJobLogStage;
    message: string;
    errorDetail?: MediaJobLogErrorDetail | null;
    meta?: Record<string, unknown>;
    createdAt?: string;
}

export interface RunLogsResponse {
    logs: MediaJobLog[];
}

export interface ProjectLogsResponse {
    logs: MediaJobLog[];
}

export type MediaTemplateStatus = 'draft' | 'pending' | 'approved' | 'rejected';
export type MediaTemplateVisibility = 'private' | 'public';
export type MediaTemplateKind = 'workflow' | 'prompt';

export interface TemplatePreviewMedia {
    id?: string;
    assetId?: string;
    url: string;
    /** file = سند/کد/جدول پیوست چت متنی (LLM) — رسانه نیست؛ سرور متنش را به مدل می‌دهد */
    type: 'image' | 'video' | 'audio' | 'file';
    fileId?: string;
    fileKey?: string;
    thumbnailUrl?: string;
    thumbnailUrlLarge?: string;
    label?: string;
    /** نوع MIME فایل (برای فایل‌های چت متنی) */
    mime?: string;
    isCover?: boolean;
    width?: number;
    height?: number;
    aspectRatio?: number;
    durationSeconds?: number;
    sizeBytes?: number; // File size in bytes
    source?: 'upload' | 'generated' | 'gallery' | 'asset-library';
    inputKey?: string;
}

export type StudioChatMediaKind = 'image' | 'video' | 'audio' | 'text';
export type StudioChatStatus = 'draft' | 'active';

export interface StudioChatSettings {
    providerId?: string;
    providerName?: string;
    modelId?: string;
    model?: string;
    modelName?: string;
    modelSettings?: Record<string, unknown>;
    aspectRatio?: string;
    resolution?: string;
    zoom?: number;
    extra?: string;
    audioMode?: string;
    extras?: Record<string, unknown>;
    capabilityMode?: string;
    director?: {
        camera?: Record<string, string>;
        lighting?: Record<string, string>;
    };
    chatPanels?: {
        mode?: boolean;
        camera?: boolean;
        lighting?: boolean;
        angles?: boolean;
    };
    /** ابزار «زاویه و نور» (state ویرایشگر + resolvedShots) — lib/angle-studio */
    angleStudio?: Record<string, unknown>;
    [key: string]: unknown;
}

export interface StudioChatRequestSnapshot {
    promptText: string;
    attachments: TemplatePreviewMedia[];
    mentionRefs?: StudioMediaMention[];
    mediaKind: StudioChatMediaKind;
    settings: StudioChatSettings;
}

export interface StudioChatMessageEditVersion {
    content: string;
    editedAt?: string;
}

export interface StudioChatMessage {
    messageId?: string;
    role: 'user' | 'assistant';
    content: string;
    attachments?: TemplatePreviewMedia[];
    mentionRefs?: StudioMediaMention[];
    /** @deprecated transitional alias */
    mentions?: StudioMediaMention[];
    status?: 'processing' | 'complete' | 'failed';
    runId?: string;
    errorMessage?: string;
    requestSnapshot?: StudioChatRequestSnapshot;
    retryRequestId?: string;
    /** assistant: تعداد خروجی مورد انتظار (فیلد «تعداد خروجی» مدل، مثل n) — جای پردازش به‌هم‌پیوسته */
    expectedOutputs?: number;
    retryOfRunId?: string;
    attempt?: number;
    /** بایگانی محتواهای قبلی پیام کاربر — با هر ویرایش یک نسخه اضافه می‌شود */
    editHistory?: StudioChatMessageEditVersion[];
    cost?: { amount: number; currency?: string; unit?: string } | null;
    totalCost?: number;
    usage?: {
        inputTokens?: number;
        outputTokens?: number;
        cacheTokens?: number;
        prompt_tokens?: number;
        completion_tokens?: number;
        cached_tokens?: number;
    } | null;
    createdAt?: string;
}

export interface StudioChat {
    _id: string;
    projectId: string;
    userId: string;
    status: StudioChatStatus;
    mediaKind: StudioChatMediaKind;
    promptText: string;
    attachments: TemplatePreviewMedia[];
    mentionRefs?: StudioMediaMention[];
    /** @deprecated transitional alias */
    mentions?: StudioMediaMention[];
    settings: StudioChatSettings;
    messages: StudioChatMessage[];
    title?: string;
    createdAt?: string;
    updatedAt?: string;
}

export type { StudioMediaMention, StudioMediaRef };

export interface StudioChatListItem {
    _id: string;
    projectId: string;
    status: StudioChatStatus;
    mediaKind: StudioChatMediaKind;
    title?: string;
    providerName?: string;
    modelId?: string;
    modelName?: string;
    modelIconSvg?: string;
    previewMedia?: Array<{
        url: string;
        thumbnailUrl?: string;
        thumbnailUrlLarge?: string;
        type?: string;
        width?: number;
        height?: number;
        aspectRatio?: number;
        /** Model that generated this specific output (may differ per thumb). */
        modelId?: string;
        modelName?: string;
        modelIconSvg?: string;
        /** نوبت (درخواست) سازنده — خروجی‌های یک درخواست در تاریخچه یک تایل فولدری می‌شوند */
        turnId?: string;
        /** تعداد کل خروجی‌های همان درخواست (فقط ۳تای اول ارسال می‌شود → «+N») */
        turnSize?: number;
    }>;
    updatedAt?: string;
    createdAt?: string;
}

export interface TemplatePublishedSnapshot {
    title: string;
    description?: string;
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
    kind: MediaTemplateKind;
    aiModels: string[];
    promptText?: string;
    previewMedia: TemplatePreviewMedia[];
    tags: string[];
    approvedAt?: string;
    categoryIds?: string[];
}

export interface MediaWorkflowTemplate {
    _id: string;
    ownerUserId: string;
    /** فقط برای ادمین/سازنده: سازندهٔ واقعی وقتی به نام کاربر نمایشی منتشر شده */
    authorUserId?: string | null;
    /** فقط ادمین (قالب‌های من): کاربر نمایشی‌ای که قالب به نامش منتشر شده */
    persona?: { _id: string; fullName: string; username: string; avatar?: string } | null;
    sourceProjectId?: string;
    version?: number;
    rootTemplateId?: string;
    title: string;
    description?: string;
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
    kind?: MediaTemplateKind;
    aiModels?: string[];
    promptText?: string;
    tags?: string[];
    previewMedia?: TemplatePreviewMedia[];
    publishedSnapshot?: TemplatePublishedSnapshot | null;
    categoryIds?: string[];
    status: MediaTemplateStatus;
    visibility: MediaTemplateVisibility;
    reviewNote?: string;
    submittedAt?: string;
    reviewedAt?: string;
    usageCount?: number;
    viewCount?: number;
    isForSale?: boolean;
    price?: number;
    createdAt?: string;
    updatedAt?: string;
}

export interface ExploreTemplateCreator {
    _id: string;
    fullName: string;
    avatar: string;
}

export interface ExploreTemplateItem {
    _id: string;
    sourceProjectId?: string | null;
    version?: number;
    title: string;
    description: string;
    kind: MediaTemplateKind;
    aiModels: string[];
    promptText: string;
    tags: string[];
    previewMedia: TemplatePreviewMedia[];
    usageCount: number;
    viewCount?: number;
    likeCount?: number;
    approvedAt?: string;
    updatedAt?: string;
    primaryPreview: TemplatePreviewMedia | null;
    creator?: ExploreTemplateCreator | null;
    isBookmarked?: boolean;
    isLiked?: boolean;
    categoryIds?: string[];
    price?: number;
    isForSale?: boolean;
}

export interface BookmarkedTemplatesResponse {
    templates: ExploreTemplateItem[];
    total: number;
}

export interface ToggleTemplateBookmarkResponse {
    bookmarked: boolean;
}

export interface ExploreTemplatesResponse {
    templates: ExploreTemplateItem[];
    total: number;
    page: number;
    limit: number;
    facets: {
        kinds: MediaTemplateKind[];
        aiModels: string[];
    };
}

export interface CreateStandaloneTemplatePayload {
    title: string;
    description?: string;
    sourceProjectId?: string;
    kind?: MediaTemplateKind;
    promptText?: string;
    aiModels?: string[];
    tags?: string[];
    previewMedia?: TemplatePreviewMedia[];
    isForSale?: boolean;
    price?: number;
    categoryIds?: string[];
    /** فقط ادمین: انتشار به نام این کاربر نمایشی */
    publishAsUserId?: string;
}

export interface UpdateTemplatePayload {
    title?: string;
    description?: string;
    kind?: MediaTemplateKind;
    promptText?: string;
    aiModels?: string[];
    tags?: string[];
    previewMedia?: TemplatePreviewMedia[];
    isForSale?: boolean;
    price?: number;
    categoryIds?: string[];
}

export interface MyTemplatesResponse {
    templates: MediaWorkflowTemplate[];
}

export interface TemplateReviewRequestsResponse {
    templates: MediaWorkflowTemplate[];
    total: number;
    page: number;
    limit: number;
}

export interface TemplateCreateInfoResponse {
    canCreate: boolean;
    reason?: string;
    nextVersion: number | null;
    existingVersions: number[];
    sourceProjectId: string;
}

export interface MarketplaceTemplatesResponse {
    templates: MediaWorkflowTemplate[];
}

export interface UsageModelSummary {
    model: string;
    nodeType?: string;
    class: 'video' | 'image' | 'audio' | 'text' | '3d';
    count: number;
    succeeded?: number;
    failed?: number;
    totalCost: number;
}

export interface UsageSummaryResponse {
    currency: 'USD';
    totalCost: number;
    runCount: number;
    billedCount?: number;
    models: UsageModelSummary[];
    imageGeneration: {
        class: 'image';
        estimatedCount: number | null;
        totalCost: number;
        note?: string;
    };
    seedanceTotalCost: number;
    seedanceCount: number;
}

export interface UsageHistoryTask {
    _id: string;
    runId?: string;
    jobId?: string;
    model: string;
    nodeType?: string;
    status: string;
    videoUrl?: string;
    cost?: { amount: number; currency: string; unit: string; breakdown?: { model?: string; class?: string } } | null;
    createdAt?: string;
    projectId?: string;
    projectTitle?: string;
    nodeId?: string;
}

export interface UsageHistoryResponse {
    tasks: UsageHistoryTask[];
    total: number;
    page: number;
    limit: number;
}

// ── Project usage summary (per-project hover popup) ──────────────────────
export type ProjectUsageSummaryResponse = UsageSummaryResponse;

// ── Team members ──────────────────────────────────────────────────────────
export type MediaMemberAuthority = 'owner' | 'admin' | 'member' | 'guest';
export type MediaMemberStatus = 'active' | 'suspended';

export interface MediaProjectMember {
    memberId: string | null;
    userId: string;
    _id: string;
    fullName: string;
    email: string;
    avatar: string;
    role: string;
    authority: MediaMemberAuthority;
    status: MediaMemberStatus;
    isOwner: boolean;
    initials: string;
}

export interface MediaProjectMembersResponse {
    members: MediaProjectMember[];
    totalItems: number;
    viewerCanManage?: boolean;
}

export interface MediaMemberSearchUser {
    _id: string;
    fullName: string;
    email: string;
    avatar: string;
}

export interface MediaMemberSearchResponse {
    users: MediaMemberSearchUser[];
    totalItems: number;
}

// ── Comments ────────────────────────────────────────────────────────────
export interface MediaCommentAttachment {
    fileId?: string;
    fileKey?: string;
    fileName?: string;
    url?: string;
}

export interface MediaComment {
    _id: string;
    projectId: string;
    text: string;
    attachments: MediaCommentAttachment[];
    createdAt?: string;
    author: { _id: string; fullName: string; avatar: string } | null;
}

export interface MediaCommentsResponse {
    comments: MediaComment[];
}
