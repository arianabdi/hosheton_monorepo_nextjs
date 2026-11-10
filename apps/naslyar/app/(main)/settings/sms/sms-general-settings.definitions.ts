export type SmsProviderSlugField =
    | 'activeProviderSlug'
    | 'lowWalletProviderSlug'
    | 'billingProviderSlug'
    | 'newTicketProviderSlug'
    | 'securityProviderSlug';

export type SmsNotifyField =
    | 'notifyLowWalletBalance'
    | 'notifyWalletTopUpSuccess'
    | 'notifyInvoiceIssued'
    | 'notifyInvoicePaymentReminder'
    | 'notifyInvoicePaid'
    | 'notifyManualPaymentApproved'
    | 'notifyManualPaymentRejected'
    | 'notifySubscriptionExpiring'
    | 'notifySubscriptionExpired'
    | 'notifyNewTicket'
    | 'notifyTicketReply'
    | 'notifyTicketStatusChanged'
    | 'notifyRegistrationWelcome'
    | 'notifyPasswordChanged'
    | 'notifyNewDeviceLogin'
    | 'notifyPhoneNumberChanged'
    | 'notifySmsDeliveryFailure';

export interface SmsGeneralSettingsForm {
    activeProviderSlug: string;
    lowWalletProviderSlug: string;
    billingProviderSlug: string;
    newTicketProviderSlug: string;
    securityProviderSlug: string;
    notifyLowWalletBalance: boolean;
    notifyWalletTopUpSuccess: boolean;
    notifyInvoiceIssued: boolean;
    notifyInvoicePaymentReminder: boolean;
    notifyInvoicePaid: boolean;
    notifyManualPaymentApproved: boolean;
    notifyManualPaymentRejected: boolean;
    notifySubscriptionExpiring: boolean;
    notifySubscriptionExpired: boolean;
    notifyNewTicket: boolean;
    notifyTicketReply: boolean;
    notifyTicketStatusChanged: boolean;
    notifyRegistrationWelcome: boolean;
    notifyPasswordChanged: boolean;
    notifyNewDeviceLogin: boolean;
    notifyPhoneNumberChanged: boolean;
    notifySmsDeliveryFailure: boolean;
    respectQuietHours: boolean;
    quietHoursStart: string;
    quietHoursEnd: string;
    maxAutomatedSmsPerUserPerDay: number;
    dedupeIdenticalMessageMinutes: number;
}

export const SMS_NOTIFY_FIELDS: SmsNotifyField[] = [
    'notifyLowWalletBalance',
    'notifyWalletTopUpSuccess',
    'notifyInvoiceIssued',
    'notifyInvoicePaymentReminder',
    'notifyInvoicePaid',
    'notifyManualPaymentApproved',
    'notifyManualPaymentRejected',
    'notifySubscriptionExpiring',
    'notifySubscriptionExpired',
    'notifyNewTicket',
    'notifyTicketReply',
    'notifyTicketStatusChanged',
    'notifyRegistrationWelcome',
    'notifyPasswordChanged',
    'notifyNewDeviceLogin',
    'notifyPhoneNumberChanged',
    'notifySmsDeliveryFailure',
];

export const DEFAULT_SMS_GENERAL_SETTINGS: SmsGeneralSettingsForm = {
    activeProviderSlug: '',
    lowWalletProviderSlug: '',
    billingProviderSlug: '',
    newTicketProviderSlug: '',
    securityProviderSlug: '',
    notifyLowWalletBalance: false,
    notifyWalletTopUpSuccess: false,
    notifyInvoiceIssued: false,
    notifyInvoicePaymentReminder: false,
    notifyInvoicePaid: false,
    notifyManualPaymentApproved: false,
    notifyManualPaymentRejected: false,
    notifySubscriptionExpiring: false,
    notifySubscriptionExpired: false,
    notifyNewTicket: false,
    notifyTicketReply: false,
    notifyTicketStatusChanged: false,
    notifyRegistrationWelcome: false,
    notifyPasswordChanged: false,
    notifyNewDeviceLogin: false,
    notifyPhoneNumberChanged: false,
    notifySmsDeliveryFailure: false,
    respectQuietHours: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
    maxAutomatedSmsPerUserPerDay: 0,
    dedupeIdenticalMessageMinutes: 15,
};

export function mapSmsSettingsFromApi(raw: Record<string, unknown>): SmsGeneralSettingsForm {
    const base = { ...DEFAULT_SMS_GENERAL_SETTINGS };
    for (const key of Object.keys(base) as (keyof SmsGeneralSettingsForm)[]) {
        if (raw[key] === undefined || raw[key] === null) continue;
        if (typeof base[key] === 'number') {
            (base as Record<string, unknown>)[key] = Number(raw[key]) || 0;
        } else if (typeof base[key] === 'boolean') {
            (base as Record<string, unknown>)[key] = Boolean(raw[key]);
        } else {
            (base as Record<string, unknown>)[key] = String(raw[key]);
        }
    }
    return base;
}

export function countEnabledAutoEvents(form: Pick<SmsGeneralSettingsForm, SmsNotifyField>): number {
    return SMS_NOTIFY_FIELDS.filter(k => form[k]).length;
}

const BILLING_NOTIFY: SmsNotifyField[] = [
    'notifyWalletTopUpSuccess',
    'notifyInvoiceIssued',
    'notifyInvoicePaymentReminder',
    'notifyInvoicePaid',
    'notifyManualPaymentApproved',
    'notifyManualPaymentRejected',
];

const TICKET_NOTIFY: SmsNotifyField[] = [
    'notifyNewTicket',
    'notifyTicketReply',
    'notifyTicketStatusChanged',
];

const SECURITY_NOTIFY: SmsNotifyField[] = [
    'notifyRegistrationWelcome',
    'notifyPasswordChanged',
    'notifyNewDeviceLogin',
    'notifyPhoneNumberChanged',
];

export function isBillingChannelActive(form: SmsGeneralSettingsForm): boolean {
    return form.notifyLowWalletBalance || BILLING_NOTIFY.some(k => form[k]);
}

export function isTicketChannelActive(form: SmsGeneralSettingsForm): boolean {
    return TICKET_NOTIFY.some(k => form[k]);
}

export function isSecurityChannelActive(form: SmsGeneralSettingsForm): boolean {
    return SECURITY_NOTIFY.some(k => form[k]);
}

export const SMS_PROVIDER_PURPOSE_ROWS: {
    slugKey: SmsProviderSlugField;
    title: string;
    hint: string;
    isEnabled: (form: SmsGeneralSettingsForm) => boolean;
}[] = [
    {
        slugKey: 'activeProviderSlug',
        title: 'ورود و کد یکبارمصرف (OTP)',
        hint: 'پنل اصلی برای کد تأیید ورود و بازیابی.',
        isEnabled: () => true,
    },
    {
        slugKey: 'lowWalletProviderSlug',
        title: 'کمبود موجودی کیف پول',
        hint: 'خالی = OTP یا اولین پنل فعال.',
        isEnabled: f => f.notifyLowWalletBalance,
    },
    {
        slugKey: 'billingProviderSlug',
        title: 'مالی و صورتحساب',
        hint: 'شارژ موفق، فاکتور، یادآوری پرداخت، تأیید/رد کارت‌به‌کارت.',
        isEnabled: isBillingChannelActive,
    },
    {
        slugKey: 'newTicketProviderSlug',
        title: 'پشتیبانی و تیکت',
        hint: 'تیکت جدید، پاسخ پشتیبان، تغییر وضعیت.',
        isEnabled: isTicketChannelActive,
    },
    {
        slugKey: 'securityProviderSlug',
        title: 'امنیت و حساب کاربری',
        hint: 'خوش‌آمد، ورود از دستگاه جدید، تغییر رمز یا موبایل.',
        isEnabled: isSecurityChannelActive,
    },
];

export const SMS_EVENT_GROUPS: {
    title: string;
    items: { key: SmsNotifyField; label: string; hint: string }[];
}[] = [
    {
        title: 'کیف پول',
        items: [
            {
                key: 'notifyLowWalletBalance',
                label: 'کمبود موجودی کیف پول',
                hint: 'هشدار به کاربر وقتی موجودی از حد مجاز کمتر شود.',
            },
            {
                key: 'notifyWalletTopUpSuccess',
                label: 'شارژ موفق کیف پول',
                hint: 'پس از واریز موفق (درگاه یا تأیید دستی).',
            },
        ],
    },
    {
        title: 'صورتحساب و پرداخت',
        items: [
            {
                key: 'notifyInvoiceIssued',
                label: 'صدور فاکتور جدید',
                hint: 'اطلاع‌رسانی با مبلغ و لینک پرداخت.',
            },
            {
                key: 'notifyInvoicePaymentReminder',
                label: 'یادآوری پرداخت فاکتور',
                hint: 'برای فاکتورهای پرداخت‌نشده (قبل از سررسید).',
            },
            {
                key: 'notifyInvoicePaid',
                label: 'پرداخت موفق فاکتور',
                hint: 'تأیید پرداخت و ثبت نهایی.',
            },
            {
                key: 'notifyManualPaymentApproved',
                label: 'تأیید واریز کارت‌به‌کارت',
                hint: 'پس از تأیید ادمین و شارژ کیف.',
            },
            {
                key: 'notifyManualPaymentRejected',
                label: 'رد رسید کارت‌به‌کارت',
                hint: 'اطلاع به کاربر همراه دلیل کوتاه (در صورت ثبت).',
            },
        ],
    },
    {
        title: 'اشتراک',
        items: [
            {
                key: 'notifySubscriptionExpiring',
                label: 'نزدیک به پایان اشتراک',
                hint: 'چند روز قبل از انقضا.',
            },
            {
                key: 'notifySubscriptionExpired',
                label: 'انقضای اشتراک',
                hint: 'پس از پایان دوره فعال.',
            },
        ],
    },
    {
        title: 'پشتیبانی',
        items: [
            {
                key: 'notifyNewTicket',
                label: 'ثبت تیکت جدید',
                hint: 'به کاربر یا مسئول پشتیبانی.',
            },
            {
                key: 'notifyTicketReply',
                label: 'پاسخ جدید روی تیکت',
                hint: 'وقتی پشتیبان یا کاربر پاسخ می‌دهد.',
            },
            {
                key: 'notifyTicketStatusChanged',
                label: 'تغییر وضعیت تیکت',
                hint: 'مثلاً باز → در حال بررسی → بسته.',
            },
        ],
    },
    {
        title: 'امنیت و حساب',
        items: [
            {
                key: 'notifyRegistrationWelcome',
                label: 'خوش‌آمد پس از ثبت‌نام',
                hint: 'پیام خوش‌آمد و لینک شروع (اختیاری در قالب).',
            },
            {
                key: 'notifyNewDeviceLogin',
                label: 'ورود از دستگاه یا مکان جدید',
                hint: 'هشدار امنیتی برای ورود مشکوک.',
            },
            {
                key: 'notifyPasswordChanged',
                label: 'تغییر رمز عبور',
                hint: 'تأیید تغییر رمز برای اطمینان کاربر.',
            },
            {
                key: 'notifyPhoneNumberChanged',
                label: 'تغییر شماره موبایل',
                hint: 'اطلاع به شماره قبلی در صورت امکان.',
            },
        ],
    },
    {
        title: 'عملیات سیستم',
        items: [
            {
                key: 'notifySmsDeliveryFailure',
                label: 'خطا در ارسال پیامک',
                hint: 'اعلان به ادمین وقتی API سرویس‌دهنده خطا برگرداند.',
            },
        ],
    },
];
