export type TriggerType = 'transactional' | 'behavioral' | 'scheduled';

export interface AutomationTrigger {
    id: string;
    name: string;
    type: TriggerType;
    condition: string;
    delayMinutes?: number;
    scheduleCron?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export type PatternStatus = 'active' | 'pending' | 'rejected';

export interface VariableMapping {
    patternVar: string;
    dbField: string;
}

export interface SmsPattern {
    id: string;
    name: string;
    patternCode: string;
    body: string;
    variables: string[];
    variableMappings: VariableMapping[];
    status: PatternStatus;
    createdAt: string;
    updatedAt: string;
}

export type WorkflowStepType = 'trigger' | 'delay' | 'pattern' | 'segment';

export interface WorkflowStep {
    id: string;
    type: WorkflowStepType;
    triggerId?: string;
    patternId?: string;
    delayMinutes?: number;
    segmentQuery?: string;
}

export interface MarketingWorkflow {
    id: string;
    name: string;
    description?: string;
    steps: WorkflowStep[];
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export type DispatchStatus = 'queued' | 'sent' | 'delivered' | 'failed';

export interface DispatchLog {
    id: string;
    phone: string;
    patternId?: string;
    patternName?: string;
    workflowId?: string;
    status: DispatchStatus;
    errorMessage?: string;
    cost?: number;
    sentAt: string;
    updatedAt: string;
}

export interface AbTestVariant {
    id: string;
    name: string;
    patternId: string;
    sent: number;
    delivered: number;
    conversions: number;
}

export interface AbTest {
    id: string;
    name: string;
    triggerId: string;
    variants: AbTestVariant[];
    isActive: boolean;
    createdAt: string;
}

export interface AutomationAnalytics {
    totalSent: number;
    totalDelivered: number;
    totalFailed: number;
    totalCost: number;
    roiPercent: number;
    conversionCount: number;
    abTests: AbTest[];
}

export interface AutomationStore {
    triggers: AutomationTrigger[];
    patterns: SmsPattern[];
    workflows: MarketingWorkflow[];
    dispatchLogs: DispatchLog[];
    analytics: AutomationAnalytics;
}

export const DEFAULT_AUTOMATION_ANALYTICS: AutomationAnalytics = {
    totalSent: 0,
    totalDelivered: 0,
    totalFailed: 0,
    totalCost: 0,
    roiPercent: 0,
    conversionCount: 0,
    abTests: [],
};

export const DEFAULT_AUTOMATION_STORE: AutomationStore = {
    triggers: [],
    patterns: [],
    workflows: [],
    dispatchLogs: [],
    analytics: DEFAULT_AUTOMATION_ANALYTICS,
};

export const TRIGGER_TYPE_LABELS: Record<TriggerType, string> = {
    transactional: 'تراکنشی',
    behavioral: 'رفتاری',
    scheduled: 'زمان‌بندی‌شده',
};

export const DISPATCH_STATUS_LABELS: Record<DispatchStatus, string> = {
    queued: 'در صف',
    sent: 'ارسال‌شده',
    delivered: 'تحویل‌شده',
    failed: 'ناموفق',
};
