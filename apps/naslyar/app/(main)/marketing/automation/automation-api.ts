import { createId, loadSetting, saveSetting } from '@/app/utils/system-setting-api';
import type {
    AutomationAnalytics,
    AutomationStore,
    AutomationTrigger,
    DispatchLog,
    MarketingWorkflow,
    SmsPattern,
    AbTest,
} from './automation.types';
import { DEFAULT_AUTOMATION_ANALYTICS } from './automation.types';

const KEYS = {
    triggers: 'marketing.automation.triggers',
    patterns: 'marketing.automation.patterns',
    workflows: 'marketing.automation.workflows',
    dispatchLogs: 'marketing.automation.dispatchLogs',
    analytics: 'marketing.automation.analytics',
} as const;

const META = {
    group: 'marketing',
    label: 'اتوماسیون بازاریابی',
    description: 'تریگرها، پترن‌ها، سناریوها و لاگ ارسال پیامک مارکتینگ.',
};

function normalizeArray<T>(payload: unknown): T[] {
    return Array.isArray(payload) ? (payload as T[]) : [];
}

function normalizeAnalytics(payload: unknown): AutomationAnalytics {
    if (payload && typeof payload === 'object') {
        return { ...DEFAULT_AUTOMATION_ANALYTICS, ...(payload as AutomationAnalytics) };
    }
    return { ...DEFAULT_AUTOMATION_ANALYTICS };
}

export async function loadTriggers(baseUrl: string, token: string) {
    return loadSetting<AutomationTrigger[]>(
        baseUrl,
        token,
        KEYS.triggers,
        { ...META, label: 'تریگرهای اتوماسیون' },
        [],
        normalizeArray,
    );
}

export async function saveTriggers(baseUrl: string, token: string, triggers: AutomationTrigger[]) {
    await saveSetting(baseUrl, token, KEYS.triggers, triggers);
}

export async function loadPatterns(baseUrl: string, token: string) {
    return loadSetting<SmsPattern[]>(
        baseUrl,
        token,
        KEYS.patterns,
        { ...META, label: 'پترن‌های پیامک' },
        [],
        normalizeArray,
    );
}

export async function savePatterns(baseUrl: string, token: string, patterns: SmsPattern[]) {
    await saveSetting(baseUrl, token, KEYS.patterns, patterns);
}

export async function loadWorkflows(baseUrl: string, token: string) {
    return loadSetting<MarketingWorkflow[]>(
        baseUrl,
        token,
        KEYS.workflows,
        { ...META, label: 'سناریوهای مارکتینگ' },
        [],
        normalizeArray,
    );
}

export async function saveWorkflows(baseUrl: string, token: string, workflows: MarketingWorkflow[]) {
    await saveSetting(baseUrl, token, KEYS.workflows, workflows);
}

export async function loadDispatchLogs(baseUrl: string, token: string) {
    return loadSetting<DispatchLog[]>(
        baseUrl,
        token,
        KEYS.dispatchLogs,
        { ...META, label: 'لاگ ارسال پیامک' },
        [],
        normalizeArray,
    );
}

export async function saveDispatchLogs(baseUrl: string, token: string, logs: DispatchLog[]) {
    await saveSetting(baseUrl, token, KEYS.dispatchLogs, logs);
}

export async function loadAnalytics(baseUrl: string, token: string) {
    return loadSetting<AutomationAnalytics>(
        baseUrl,
        token,
        KEYS.analytics,
        { ...META, label: 'آمار اتوماسیون' },
        DEFAULT_AUTOMATION_ANALYTICS,
        normalizeAnalytics,
    );
}

export async function saveAnalytics(baseUrl: string, token: string, analytics: AutomationAnalytics) {
    await saveSetting(baseUrl, token, KEYS.analytics, analytics);
}

export async function loadAutomationStore(baseUrl: string, token: string): Promise<AutomationStore> {
    const [triggers, patterns, workflows, dispatchLogs, analytics] = await Promise.all([
        loadTriggers(baseUrl, token),
        loadPatterns(baseUrl, token),
        loadWorkflows(baseUrl, token),
        loadDispatchLogs(baseUrl, token),
        loadAnalytics(baseUrl, token),
    ]);
    return {
        triggers: triggers.value,
        patterns: patterns.value,
        workflows: workflows.value,
        dispatchLogs: dispatchLogs.value,
        analytics: analytics.value,
    };
}

export { createId as createAutomationId };

export type { AbTest };
