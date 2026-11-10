const BASE = '/api/studio/marketplace';

export interface MarketplacePreviewMedia {
    url: string;
    type: 'image' | 'video';
    fileId?: string;
    fileKey?: string;
    thumbnailUrl?: string;
    thumbnailUrlLarge?: string;
    label?: string;
    isCover?: boolean;
    width?: number;
    height?: number;
    aspectRatio?: number;
}

export interface ExploreWorkflowPreviewNode {
    id: string;
    type: string;
    label: string;
    position: { x: number; y: number };
}

export interface ExploreWorkflowPreviewEdge {
    id: string;
    source: string;
    target: string;
}

export interface ExploreWorkflowPreview {
    nodes: ExploreWorkflowPreviewNode[];
    edges: ExploreWorkflowPreviewEdge[];
}

export interface MarketplaceTemplateItem {
    _id: string;
    title: string;
    description: string;
    kind: 'workflow' | 'prompt';
    aiModels: string[];
    promptText: string;
    tags: string[];
    previewMedia: MarketplacePreviewMedia[];
    primaryPreview: MarketplacePreviewMedia | null;
    /** Public SEO URL key — may be empty on legacy items; fall back to _id. */
    slug?: string;
    metaTitle?: string;
    metaDescription?: string;
    usageCount: number;
    viewCount?: number;
    likeCount?: number;
    purchaseCount?: number;
    price: number;
    currency: string;
    isForSale: boolean;
    isPurchased?: boolean;
    hasAccess?: boolean;
    isLocked?: boolean;
    promptPreview?: string;
    creator?: { _id: string; fullName: string; avatar: string; bio?: string } | null;
    isBookmarked?: boolean;
    isLiked?: boolean;
    version?: number;
    approvedAt?: string;
    workflowPreview?: ExploreWorkflowPreview | null;
    /** «موضوع»های تخت (badgeهای بالای اکسپلور) */
    categoryIds?: string[];
    /** slugهای زنجیرهٔ اولین تگ قالب (دستهٔ اصلی) → /explore/<...categoryPath>/<slug> */
    categoryPath?: string[];
    /** فقط در جزئیات: همان زنجیره با key/نام هر تگ (breadcrumb) */
    categoryTrail?: Array<{ key: string; name: string; slug: string; path: string[] }>;
}

export type TemplatePurchaseQuote = {
    templateId: string;
    title: string;
    sourceAmount: number;
    sourceCurrency: string;
    chargeAmount: number;
    chargeCurrency: string;
    availableBalance: number;
    canAfford: boolean;
    alreadyPurchased: boolean;
    alreadyFree: boolean;
    isOwner: boolean;
};

export function isMarketplaceTemplateLocked(item: MarketplaceTemplateItem): boolean {
    return !!(item.isLocked || (item.isForSale && item.price > 0 && !item.hasAccess));
}

export interface MarketplaceExploreCategory {
    _id: string;
    name: string;
    slug: string;
    description: string;
    coverImages: string[];
    icon?: string;
    iconUrl?: string;
}

export interface TemplateTagCategoryItem {
    key: string;
    sortOrder: number;
}

export interface ExploreResponse {
    templates: MarketplaceTemplateItem[];
    /** قالب‌های ویژهٔ دستهٔ اصلی (انتخاب ادمین) — فقط صفحهٔ اول و بدون فیلتر؛ نبودن = بلوک پنهان */
    featured?: MarketplaceTemplateItem[];
    /** کاور جدیدترین قالب هر زیردسته (key تگ → media) — نوار کارت‌های صفحهٔ دسته */
    subcategoryCovers?: Record<string, MarketplacePreviewMedia>;
    total: number;
    page: number;
    limit: number;
    facets: { kinds: ('workflow' | 'prompt')[]; aiModels: string[] };
}

export interface CreatorProfile {
    creator: {
        _id: string;
        fullName: string;
        avatar: string;
        bio: string;
        website: string;
        twitter: string;
        joinedAt?: string;
    };
    templates: MarketplaceTemplateItem[];
    stats: {
        templateCount: number;
        totalUsage: number;
        totalViews: number;
        totalSales: number;
        totalLikes?: number;
    };
}

export interface AnalyticsDashboard {
    summary: {
        views: number;
        sales: number;
        revenue: number;
        usage: number;
        templateCount: number;
        approvedCount: number;
        pendingCount: number;
        conversionRate: number;
        avgRevenuePerSale: number;
    };
    topTemplates: Array<{
        _id: string;
        title: string;
        viewCount: number;
        purchaseCount: number;
        totalRevenue: number;
        usageCount: number;
        price: number;
        isForSale: boolean;
        conversionRate: number;
    }>;
    recentSales: Array<{ _id: string; templateId: string; amount: number; currency?: string; createdAt: string }>;
    salesChart: Array<{ date: string; sales: number; revenue: number }>;
    templates: Array<{
        _id: string;
        title: string;
        status: string;
        viewCount: number;
        purchaseCount: number;
        totalRevenue: number;
        usageCount: number;
        price: number;
        isForSale: boolean;
    }>;
}

/** کیف پول فروش محصولات creator — موجودی تومانی، جدا از کیف پول اصلی */
export interface CreatorSalesWalletSnapshot {
    walletId: string;
    balance: number;
    totalEarned: number;
    totalPaidOut: number;
    pendingSettlementAmount: number;
    pendingSettlementCount: number;
    currency: 'IRT';
    status: string;
    minSettlementAmount: number;
    recentLedger: Array<{
        _id: string;
        type: 'sale' | 'settlement_hold' | 'settlement_refund' | 'adjustment' | 'referral_bonus';
        amount: number;
        templateId: string | null;
        settlementRequestId: string | null;
        description: string;
        createdAt: string;
    }>;
}

export type CreatorSettlementStatus = 'pending' | 'approved' | 'paid' | 'rejected';

export interface CreatorSettlementRequestItem {
    _id: string;
    userId: string;
    amount: number;
    status: CreatorSettlementStatus;
    payoutMethod: 'sheba' | 'card';
    payoutDetails: string;
    note: string;
    ticketId: string;
    adminNote: string;
    trackingCode: string;
    createdAt: string;
    reviewedAt: string | null;
}

export interface ConversationItem {
    _id: string;
    templateId: string | null;
    /** قالبی که گفتگو از صفحه‌اش شروع شد */
    template?: { _id: string; title: string; slug: string; cover: string } | null;
    /** نقش من در این گفتگو: سازندهٔ قالب یا خریدار */
    role?: 'creator' | 'buyer';
    lastMessagePreview: string;
    /** نوع پیوست آخرین پیام ('' = فقط متن) */
    lastAttachmentKind?: DirectAttachmentKind | '';
    lastMessageAt: string;
    unreadCount: number;
    /** پیام‌های من که طرف مقابل هنوز نخوانده */
    otherUnreadCount?: number;
    /** من طرف مقابل را مسدود کرده‌ام */
    blockedByMe?: boolean;
    /** طرف مقابل مرا مسدود کرده است */
    blockedMe?: boolean;
    /** زمان سنجاق شدن توسط من (null = سنجاق نیست) */
    pinnedAt?: string | null;
    /** در بایگانی من است */
    archived?: boolean;
    otherUser: { _id: string; fullName: string; avatar: string } | null;
    /** فقط برای ادمین: این گفتگو مال کدام کاربر نمایشی است (ادمین از طرف او جواب می‌دهد) */
    persona?: { _id: string; fullName: string; avatar: string } | null;
}

export type DirectAttachmentKind = 'image' | 'video' | 'audio' | 'file';

export interface DirectAttachment {
    fileId: string;
    kind: DirectAttachmentKind;
    url: string;
    name: string;
    mimetype: string;
    size: number;
    width: number | null;
    height: number | null;
}

export type SharedKind = 'media' | 'files' | 'links';

export interface SharedItemsResponse {
    conversationId: string;
    kind: SharedKind;
    items: Array<{
        messageId: string;
        senderId: string;
        isMine: boolean;
        createdAt: string;
        attachment?: DirectAttachment;
        body?: string;
    }>;
    hasMore: boolean;
    nextBefore: string | null;
    counts: Record<SharedKind, number>;
}

export type MessageReportReason = 'spam' | 'harassment' | 'scam' | 'inappropriate' | 'other';

export interface DirectReplyRef {
    _id: string;
    senderId: string;
    isMine: boolean;
    body: string;
    attachmentKind: string;
    attachmentName: string;
}

export interface DirectMessageItem {
    _id: string;
    conversationId: string;
    senderId: string;
    body: string;
    attachments?: DirectAttachment[];
    /** خلاصهٔ پیامی که این پیام پاسخ آن است */
    replyTo?: DirectReplyRef | null;
    /** فرستندهٔ اصلی پیام بازارسال‌شده */
    forwardedFrom?: { userId: string; name: string } | null;
    createdAt: string;
    readAt: string | null;
    isMine: boolean;
    /** فقط در نمای ادمینِ گفتگوی کاربر نمایشی: ادمینی که این پیام را از طرف پرسونا نوشت */
    sentByName?: string;
    /** فقط سمت کلاینت: پیام خوش‌بینانه در حال ارسال / ناموفق */
    pending?: boolean;
    failed?: boolean;
    error?: unknown;
}
