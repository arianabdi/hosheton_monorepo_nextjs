export type EtrLevelType = 'fatal' | 'error' | 'warning' | 'info' | 'debug';
export type EtrIssueStatusType = 'open' | 'resolved' | 'ignored' | 'regressed';
export type EtrAlertRuleTypeType = 'new_issue' | 'regression' | 'error_spike';
export type EtrDestinationTypeType = 'webhook' | 'telegram';

export const ETR_LEVEL_LABELS: Record<EtrLevelType, string> = {
    fatal: 'بحرانی',
    error: 'خطا',
    warning: 'هشدار',
    info: 'اطلاع',
    debug: 'دیباگ',
};

export const ETR_STATUS_LABELS: Record<EtrIssueStatusType, string> = {
    open: 'باز',
    resolved: 'حل‌شده',
    ignored: 'نادیده‌گرفته‌شده',
    regressed: 'برگشته (Regressed)',
};

export const ETR_RULE_TYPE_LABELS: Record<EtrAlertRuleTypeType, string> = {
    new_issue: 'مشکل جدید',
    regression: 'بازگشت خطا',
    error_spike: 'جهش خطا',
};

export interface EtrProject {
    _id: string;
    name: string;
    slug: string;
    description: string;
    platform: string;
    publicKey: string;
    environment: string;
    rateLimitPerMinute: number;
    /** origin های مجاز خواندن source map */
    sourceMapOrigins?: string[];
    /** توکن هدر x-etr-sourcemap-token (env سرور اپ: ETR_SOURCEMAP_TOKEN) */
    sourceMapToken?: string;
    createdAt: string;
    updatedAt: string;
}

export interface EtrIssue {
    _id: string;
    projectId: string;
    fingerprint: string;
    title: string;
    culprit: string;
    type: string;
    value: string;
    level: EtrLevelType;
    status: EtrIssueStatusType;
    firstSeenAt: string;
    lastSeenAt: string;
    eventCount: number;
    userCount: number;
    environments: string[];
    /** سرویس‌های ارسال‌کننده (tags.service) */
    services?: string[];
    resolvedAt: string | null;
    release: string;
    /** یادداشت رفع: علت ریشه‌ای و راه‌حل */
    resolutionNote?: string;
    resolutionNoteUpdatedAt?: string | null;
    resolutionNoteBy?: string;
}


export interface EtrStackFrame {
    filename?: string;
    function?: string;
    lineno?: number;
    colno?: number;
    context_line?: string;
    pre_context?: string[];
    post_context?: string[];
}

export interface EtrBreadcrumbItem {
    timestamp: string;
    category: string;
    level: EtrLevelType;
    message: string;
    data?: Record<string, any>;
}

export interface EtrEvent {
    _id: string;
    eventId: string;
    projectId: string;
    issueId: string;
    level: EtrLevelType;
    type: string;
    message: string;
    exception: { type: string; value: string; stacktrace: EtrStackFrame[] } | null;
    user: Record<string, any>;
    request: Record<string, any>;
    runtime: Record<string, any>;
    extra: Record<string, any>;
    tags: Record<string, string>;
    breadcrumbs: EtrBreadcrumbItem[];
    environment: string;
    release: string;
    serverName: string;
    timestamp: string;
    createdAt: string;
}

export interface EtrRelease {
    _id: string;
    projectId: string;
    version: string;
    commitSha: string;
    branch: string;
    firstEventAt: string;
    lastEventAt: string;
    eventCount: number;
    newIssueCount: number;
}

export interface EtrAlertRule {
    _id: string;
    projectId: string;
    name: string;
    type: EtrAlertRuleTypeType;
    config: { spikeThreshold?: number; windowMinutes?: number; levels?: string[] };
    destination: {
        type: EtrDestinationTypeType;
        url?: string;
        botToken?: string;
        chatId?: string;
    };
    cooldownMinutes: number;
    lastSentAt: string | null;
    isEnabled: boolean;
}

export interface EtrAlert {
    _id: string;
    ruleId: string;
    projectId: string;
    issueId: string | null;
    ruleType: EtrAlertRuleTypeType;
    title: string;
    payload: Record<string, any>;
    status: 'sent' | 'failed';
    error: string;
    sentAt: string;
    createdAt: string;
}

export interface EtrDashboard {
    kpis: {
        eventsToday: number;
        events24h: number;
        newIssuesToday: number;
        openIssues: number;
        resolvedIssues: number;
        regressedIssues: number;
        affectedUsers: number;
    };
    series: { day: string; levels: Partial<Record<EtrLevelType, number>>; total: number }[];
    topIssues: EtrIssue[];
    recentAlerts: EtrAlert[];
}

export interface EtrIssueDetail {
    issue: EtrIssue;
    trend: { day: string; count: number }[];
    latestEventId: string | null;
}

export interface EtrPagedResponse<T> {
    totalItems: number;
    page: number;
    limit: number;
}

export interface EtrTransportStatus {
    configured: boolean;
    appName: string;
    environment: string;
    release: string;
    serverName: string;
    processHooksInstalled: boolean;
}

export interface EtrHealth {
    status: string;
    service: string;
    timestamp: string;
    uptimeSeconds: number;
    mongo: { connected: boolean; projects: number; issues: number };
    events24h: number;
    lastEventAt: string | null;
    transport: EtrTransportStatus;
}

/** پوشش رصد — کدام اپ‌ها/فایل‌ها/محیط‌ها در حال گزارش خطا هستند */
export interface EtrCoverage {
    kpis: {
        appsMonitored: number;
        events24h: number;
        lastEventAt: string | null;
    };
    apps: {
        app: string;
        platform: string;
        events: number;
        issues: number;
        events24h: number;
        lastEventAt: string;
    }[];
    screens: { screen: string; events: number; lastEventAt: string }[];
    environments: { environment: string; events: number; lastEventAt: string }[];
    servers: { serverName: string; events: number; lastEventAt: string }[];
    culprits: { culprit: string; issues: number; events: number; lastSeenAt: string }[];
    recentEvents: {
        eventId: string;
        level: EtrLevelType;
        type: string;
        message: string;
        app: string;
        platform: string;
        screen: string;
        environment: string;
        timestamp: string;
    }[];
    localTransport: EtrTransportStatus;
}

export interface EtrSelfTest {
    projectId: string;
    projectName: string;
    marker: string;
    durationMs: number;
    directIngest: { ok: boolean; accepted?: number; eventId?: string | null; error?: string };
    transportLoop: { ok: boolean; configured?: boolean; appName?: string; received?: boolean; note?: string; error?: string };
    healthy: boolean;
}

// ============================================================ جدول‌های پوشش رصد (panel/coverage/:dimension)

export type EtrCoverageDimension = 'apps' | 'culprits' | 'environments' | 'servers' | 'screens' | 'events';

export interface EtrTablePage<T> {
    rows: T[];
    totalItems: number;
    page: number;
    limit: number;
}

export interface EtrCoverageAppRow {
    app: string;
    platform: string;
    events: number;
    issues: number;
    events24h: number;
    lastEventAt: string;
}

export interface EtrCoverageCulpritRow {
    culprit: string;
    issues: number;
    openIssues: number;
    events: number;
    lastSeenAt: string;
}

export interface EtrCoverageSourceRow {
    value: string;
    events: number;
    issues: number;
    events24h: number;
    lastEventAt: string;
}

export interface EtrCoverageEventRow {
    eventId: string;
    issueId: string;
    level: EtrLevelType;
    type: string;
    message: string;
    exceptionType: string;
    app: string;
    platform: string;
    screen: string;
    environment: string;
    timestamp: string;
}
