export type TelegramBotNodeType =
    | 'start'
    | 'sendMessage'
    | 'sendPhoto'
    | 'sendDocument'
    | 'inlineKeyboard'
    | 'replyKeyboard'
    | 'condition'
    | 'switch'
    | 'waitInput'
    | 'httpRequest'
    | 'end';

export type TelegramConditionOperator =
    | 'equals'
    | 'notEquals'
    | 'contains'
    | 'startsWith'
    | 'endsWith'
    | 'isEmpty'
    | 'isNotEmpty'
    | 'regex';

export interface TelegramBotButton {
    text: string;
    saveTo?: string;
    url?: string;
}

export interface TelegramBotSwitchCase {
    id: string;
    label: string;
    value: string;
}

export interface TelegramBotNodeData {
    label?: string;
    command?: string;
    welcomeText?: string;
    text?: string;
    parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
    photoUrl?: string;
    fileUrl?: string;
    caption?: string;
    buttons?: TelegramBotButton[];
    variable?: string;
    operator?: TelegramConditionOperator;
    value?: string;
    cases?: TelegramBotSwitchCase[];
    saveTo?: string;
    inputPrompt?: string;
    httpMethod?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    url?: string;
    headers?: Record<string, string>;
    body?: string;
    responseDataKey?: string;
}

export interface TelegramBotFlowNode {
    id: string;
    type: TelegramBotNodeType;
    position: { x: number; y: number };
    data: TelegramBotNodeData;
}

export interface TelegramBotFlowEdge {
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
}

export interface TelegramBotFlowGraph {
    nodes: TelegramBotFlowNode[];
    edges: TelegramBotFlowEdge[];
}

export interface TelegramBot {
    _id: string;
    name: string;
    botToken: string;
    username: string;
    description?: string;
    isActive: boolean;
    isAlive: boolean;
    isWebhookSet: boolean;
    webhookSecret: string;
    graph: TelegramBotFlowGraph;
    lastError?: string;
    createdAt: string;
    updatedAt: string;
}

export interface TelegramBotListResult {
    items: TelegramBot[];
    totalItems: number;
    page: number;
    limit: number;
}

export const NODE_LABELS: Record<TelegramBotNodeType, string> = {
    start: 'شروع',
    sendMessage: 'ارسال پیام',
    sendPhoto: 'ارسال عکس',
    sendDocument: 'ارسال فایل',
    inlineKeyboard: 'دکمه‌های شیشه‌ای',
    replyKeyboard: 'صفحه‌کلید',
    condition: 'شرط',
    switch: 'سوئیچ',
    waitInput: 'انتظار ورودی',
    httpRequest: 'درخواست HTTP',
    end: 'پایان',
};

export const OPERATOR_LABELS: Record<TelegramConditionOperator, string> = {
    equals: 'برابر است با',
    notEquals: 'برابر نیست با',
    contains: 'شامل',
    startsWith: 'شروع می‌شود با',
    endsWith: 'پایان می‌یابد با',
    isEmpty: 'خالی است',
    isNotEmpty: 'خالی نیست',
    regex: 'عبارت باقاعده',
};

export function createNodeId(prefix: string) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createDefaultNodeData(type: TelegramBotNodeType): TelegramBotNodeData {
    switch (type) {
        case 'start':
            return { label: 'شروع', command: 'start' };
        case 'sendMessage':
            return { label: 'ارسال پیام', text: '' };
        case 'sendPhoto':
            return { label: 'ارسال عکس', photoUrl: '' };
        case 'sendDocument':
            return { label: 'ارسال فایل', fileUrl: '' };
        case 'inlineKeyboard':
            return { label: 'دکمه‌های شیشه‌ای', text: '', buttons: [{ text: 'گزینه ۱' }] };
        case 'replyKeyboard':
            return { label: 'صفحه‌کلید', text: '', buttons: [{ text: 'گزینه ۱' }] };
        case 'condition':
            return { label: 'شرط', variable: '', operator: 'equals', value: '' };
        case 'switch':
            return { label: 'سوئیچ', variable: '', cases: [] };
        case 'waitInput':
            return { label: 'انتظار ورودی', saveTo: '', inputPrompt: '' };
        case 'httpRequest':
            return { label: 'درخواست HTTP', httpMethod: 'GET', url: '' };
        case 'end':
            return { label: 'پایان' };
        default:
            return {};
    }
}
