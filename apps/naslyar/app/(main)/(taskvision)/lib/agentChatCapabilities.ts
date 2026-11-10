export type AgentChatCapabilityKind = 'read' | 'action' | 'system';

export interface AgentChatCapability {
    id: string;
    name: string;
    kind: AgentChatCapabilityKind;
    summary: string;
    description: string;
    parameters?: string[];
    requiresConfirmation?: boolean;
}

export const AGENT_CHAT_OVERVIEW = {
    title: 'دستیار هوشمند TaskVision',
    provider: 'DeepSeek (function-calling)',
    confirmationModel: 'هر تغییر روی بورد فقط پس از تأیید کاربر اجرا می‌شود.',
    sessionModel: 'یک گفتگوی فعال برای هر کاربر در هر پروژه؛ گفتگوهای قبلی آرشیو می‌شوند.',
    historyLimit: 'هر پیام کاربر مستقل پردازش می‌شود؛ تاریخچه گفتگو به مدل ارسال نمی‌شود.',
    toolLoopLimit: 'حداکثر ۵ دور فراخوانی ابزار در هر پاسخ.',
};

export const AGENT_CHAT_CAPABILITIES: AgentChatCapability[] = [
    {
        id: 'find_cards',
        name: 'جستجوی کارت‌ها',
        kind: 'read',
        summary: 'فیلتر و پیدا کردن کارت‌ها بر اساس مسئول، تگ، تاریخ، ستون، وضعیت، اولویت یا متن.',
        description: 'قبل از پیشنهاد هر تغییری، مدل می‌تواند کارت‌های هدف را با فیلترهای مختلف پیدا کند. این ابزار فقط خواندن است و تغییری در بورد ایجاد نمی‌کند.',
        parameters: [
            'assigneeName',
            'tagNames',
            'columnTitle',
            'status',
            'priority',
            'dueDateFrom / dueDateTo',
            'startDateFrom / startDateTo',
            'searchText',
        ],
    },
    {
        id: 'list_columns',
        name: 'لیست ستون‌ها',
        kind: 'read',
        summary: 'دریافت ستون‌های (لیست‌های) بورد با شناسه و عنوان.',
        description: 'برای پیدا کردن ستون مقصد یا مبدأ قبل از پیشنهاد ایجاد/جابه‌جایی کارت استفاده می‌شود.',
    },
    {
        id: 'list_tags',
        name: 'لیست تگ‌ها',
        kind: 'read',
        summary: 'دریافت تگ‌های پروژه با شناسه، نام و رنگ.',
        description: 'برای تبدیل نام تگ به شناسه قبل از پیشنهاد افزودن/حذف تگ روی کارت‌ها.',
    },
    {
        id: 'list_members',
        name: 'لیست اعضا',
        kind: 'read',
        summary: 'دریافت اعضای پروژه با شناسه و نام.',
        description: 'برای پیدا کردن assignee مناسب قبل از پیشنهاد تغییر مسئول کارت‌ها.',
    },
    {
        id: 'propose_create_cards',
        name: 'پیشنهاد ایجاد کارت',
        kind: 'action',
        requiresConfirmation: true,
        summary: 'پیشنهاد ساخت یک یا چند کارت جدید در یک ستون.',
        description: 'کارت واقعی ساخته نمی‌شود تا کاربر پیشنهاد را تأیید کند. می‌تواند عنوان، تگ، مسئول، تاریخ سررسید و اولویت را مشخص کند.',
        parameters: ['columnTitle / columnId', 'cards[].title', 'cards[].tagNames', 'cards[].assigneeNames', 'cards[].dueDate', 'cards[].priority'],
    },
    {
        id: 'propose_delete_cards',
        name: 'پیشنهاد حذف کارت',
        kind: 'action',
        requiresConfirmation: true,
        summary: 'پیشنهاد حذف یک یا چند کارت با شناسه.',
        description: 'حذف واقعی فقط پس از تأیید کاربر انجام می‌شود.',
        parameters: ['cardIds'],
    },
    {
        id: 'propose_update_tags',
        name: 'پیشنهاد تغییر تگ',
        kind: 'action',
        requiresConfirmation: true,
        summary: 'پیشنهاد افزودن و/یا حذف تگ روی کارت‌ها.',
        description: 'نام تگ‌ها به شناسه تبدیل می‌شود؛ اگر تگی پیدا نشود، خطا به مدل برمی‌گردد تا از کاربر توضیح بخواهد.',
        parameters: ['cardIds', 'addTagNames', 'removeTagNames'],
    },
    {
        id: 'propose_update_assignees',
        name: 'پیشنهاد تغییر مسئول',
        kind: 'action',
        requiresConfirmation: true,
        summary: 'پیشنهاد assign/unassign یا reassign اعضا روی کارت‌ها.',
        description: 'برای reassign، نام قبلی در removeAssigneeNames و نام جدید در addAssigneeNames قرار می‌گیرد.',
        parameters: ['cardIds', 'addAssigneeNames', 'removeAssigneeNames'],
    },
    {
        id: 'propose_update_dates',
        name: 'پیشنهاد تغییر تاریخ',
        kind: 'action',
        requiresConfirmation: true,
        summary: 'پیشنهاد تغییر تاریخ شروع و/یا سررسید کارت‌ها.',
        description: 'تاریخ‌ها با فرمت ISO (YYYY-MM-DD) ارسال می‌شوند.',
        parameters: ['cardIds', 'startDate', 'dueDate'],
    },
    {
        id: 'propose_move_cards',
        name: 'پیشنهاد جابه‌جایی کارت',
        kind: 'action',
        requiresConfirmation: true,
        summary: 'پیشنهاد انتقال کارت‌ها به ستون دیگر.',
        description: 'برای تغییر مرحله/وضعیت کارت در بورد استفاده می‌شود.',
        parameters: ['cardIds', 'targetColumnTitle / targetColumnId'],
    },
    {
        id: 'propose_update_priority',
        name: 'پیشنهاد تغییر اولویت',
        kind: 'action',
        requiresConfirmation: true,
        summary: 'پیشنهاد تغییر اولویت کارت‌ها.',
        description: 'مقادیر مجاز: low، medium، high، urgent.',
        parameters: ['cardIds', 'priority'],
    },
];

export const AGENT_CHAT_API_ENDPOINTS = [
    {method: 'GET', path: '/api/agent-chat/:projectId/messages', description: 'دریافت/ایجاد گفتگوی فعال و پیام‌های آن'},
    {method: 'GET', path: '/api/agent-chat/:projectId/sessions', description: 'لیست گفتگوهای قبلی کاربر در پروژه'},
    {method: 'GET', path: '/api/agent-chat/:projectId/sessions/:sessionId/messages', description: 'دریافت پیام‌های یک گفتگوی مشخص'},
    {method: 'POST', path: '/api/agent-chat/:projectId/messages', description: 'ارسال پیام و دریافت پاسخ/پیشنهاد تغییرات'},
    {method: 'POST', path: '/api/agent-chat/:projectId/messages/:messageId/confirm', description: 'تأیید و اجرای تغییرات انتخاب‌شده'},
    {method: 'DELETE', path: '/api/agent-chat/:projectId/messages', description: 'آرشیو گفتگوی فعلی و شروع گفتگوی جدید'},
];
