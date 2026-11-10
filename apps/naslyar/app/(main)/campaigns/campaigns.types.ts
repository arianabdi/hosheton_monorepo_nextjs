// انواع داده ماژول کمپین‌ها (فلو-بیلدر) — مستقل از ماژول بنر/مارکتینگ

export type CampaignFlowStatusType = 'draft' | 'live' | 'paused' | 'archived';
export type CampaignTriggerTypeType = 'manual' | 'event';
export type CampaignRunStatusType = 'running' | 'waiting' | 'completed' | 'failed' | 'cancelled';

export type CampaignNodeType =
    | 'sms'
    | 'wallet_charge'
    | 'discount_grant'
    | 'internal_alert'
    | 'webhook'
    | 'profile_update'
    | 'time_delay'
    | 'conditional_split';

export type CampaignConditionOpType =
    | 'eq'
    | 'neq'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'contains'
    | 'exists';

export interface FlowNodeNext {
    default?: string;
    yes?: string;
    no?: string;
}

export interface FlowNode {
    id: string;
    type: CampaignNodeType;
    title?: string;
    config: Record<string, unknown>;
    isEnabled: boolean;
    next: FlowNodeNext;
}

export interface CampaignFlow {
    _id: string;
    name: string;
    description?: string;
    status: CampaignFlowStatusType;
    triggerType: CampaignTriggerTypeType;
    /** نام رویداد پلتفرم برای تریگر event مثل order_placed */
    triggerEvent?: string;
    entryNodeId: string;
    nodes: FlowNode[];
    isAlive?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export type CampaignFlowForm = Omit<CampaignFlow, '_id' | 'isAlive' | 'createdAt' | 'updatedAt'>;

export interface CampaignRunHistoryItem {
    nodeId: string;
    nodeType: CampaignNodeType;
    status?: string;
    detail?: string;
    at: string;
}

export interface CampaignRun {
    _id: string;
    flowId: string;
    flowName?: string;
    userId: string;
    userName?: string;
    phone?: string;
    status: CampaignRunStatusType;
    currentNodeId?: string;
    waitUntil?: string | null;
    context?: Record<string, unknown>;
    history: CampaignRunHistoryItem[];
    error?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface CampaignRunsSummaryItem {
    flowId: string;
    total: number;
    completed: number;
    failed: number;
    waiting: number;
    running: number;
}

// ─── برچسب‌ها ───
export const CAMPAIGN_FLOW_STATUS_LABELS: Record<CampaignFlowStatusType, string> = {
    draft: 'پیش‌نویس',
    live: 'زنده',
    paused: 'متوقف',
    archived: 'بایگانی',
};

export const CAMPAIGN_TRIGGER_TYPE_LABELS: Record<CampaignTriggerTypeType, string> = {
    manual: 'اجرای دستی',
    event: 'رویداد پلتفرم',
};

export const CAMPAIGN_RUN_STATUS_LABELS: Record<CampaignRunStatusType, string> = {
    running: 'در حال اجرا',
    waiting: 'منتظر (تاخیر)',
    completed: 'تکمیل شده',
    failed: 'ناموفق',
    cancelled: 'لغو شده',
};

export const CAMPAIGN_NODE_TYPE_LABELS: Record<CampaignNodeType, string> = {
    sms: 'ارسال پیامک',
    wallet_charge: 'شارژ کیف پول',
    discount_grant: 'صدور کد تخفیف',
    internal_alert: 'اطلاع داخلی',
    webhook: 'وب‌هوک',
    profile_update: 'به‌روزرسانی پروفایل',
    time_delay: 'تاخیر زمانی',
    conditional_split: 'تفکیک شرطی',
};

export const CAMPAIGN_CONDITION_OP_LABELS: Record<CampaignConditionOpType, string> = {
    eq: 'مساوی',
    neq: 'نامساوی',
    gt: 'بزرگ‌تر از',
    gte: 'بزرگ‌تر یا مساوی',
    lt: 'کوچک‌تر از',
    lte: 'کوچک‌تر یا مساوی',
    contains: 'شامل',
    exists: 'موجود باشد',
};

/** پیکربندی پیش‌فرض هر نوع نود */
export const NODE_DEFAULT_CONFIG: Record<CampaignNodeType, Record<string, unknown>> = {
    sms: { message: '', phone: '' },
    wallet_charge: { amount: 0, description: '' },
    discount_grant: { discountType: 'percent', discountValue: 10, expiresInDays: 7, maxUses: 1 },
    internal_alert: { title: '', message: '' },
    webhook: { url: '' },
    profile_update: { field: '', value: '' },
    time_delay: { minutes: 0, hours: 1, days: 0 },
    conditional_split: { left: '', op: 'eq', right: '' },
};

/** پالت فلو-بیلدر — سه گروه مثل Klaviyo */
export const NODE_PALETTE: Array<{ group: string; items: CampaignNodeType[] }> = [
    {
        group: 'اکشن‌ها',
        items: ['sms', 'wallet_charge', 'discount_grant', 'internal_alert', 'webhook', 'profile_update'],
    },
    { group: 'زمان‌بندی', items: ['time_delay'] },
    { group: 'منطق', items: ['conditional_split'] },
];

export function createNodeId(): string {
    return `node_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** خط خلاصه روی کارت نود */
export function nodeSummary(node: FlowNode): string {
    const c = node.config || {};
    switch (node.type) {
        case 'sms':
            return c.message ? `پیام: ${String(c.message).slice(0, 60)}` : 'متن پیامک تنظیم نشده';
        case 'wallet_charge':
            return c.amount ? `شارژ کیف پول به مبلغ ${c.amount}` : 'مبلغ شارژ تنظیم نشده';
        case 'discount_grant':
            return c.discountType === 'fixed'
                ? `${c.discountValue} تومان تخفیف — ${c.expiresInDays || 0} روزه`
                : `${c.discountValue}٪ تخفیف — ${c.expiresInDays || 0} روزه`;
        case 'internal_alert':
            return c.title ? `اطلاع: ${String(c.title).slice(0, 50)}` : 'اطلاع داخلی';
        case 'webhook':
            return String(c.url || 'آدرس وب‌هوک تنظیم نشده');
        case 'profile_update':
            return c.field ? `${c.field} = ${String(c.value ?? '')}` : 'فیلد پروفایل تنظیم نشده';
        case 'time_delay': {
            const parts: string[] = [];
            if (Number(c.days) > 0) parts.push(`${c.days} روز`);
            if (Number(c.hours) > 0) parts.push(`${c.hours} ساعت`);
            if (Number(c.minutes) > 0) parts.push(`${c.minutes} دقیقه`);
            return parts.length ? `تاخیر ${parts.join(' و ')}` : 'مدت تاخیر تنظیم نشده';
        }
        case 'conditional_split':
            return c.left ? `${c.left} ${CAMPAIGN_CONDITION_OP_LABELS[(c.op as CampaignConditionOpType) || 'eq']} ${String(c.right ?? '')}` : 'شرط تنظیم نشده';
        default:
            return '';
    }
}
