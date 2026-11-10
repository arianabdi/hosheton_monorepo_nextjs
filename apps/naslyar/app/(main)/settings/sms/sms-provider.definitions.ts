/** آینهٔ تعاریف API — فرم پنل پیامک در Naslyar */

export type SmsProviderType =
    | 'iran_payamak'
    | 'sms_ir'
    | 'kavenegar'
    | 'melipayamak'
    | 'ghasedak'
    | 'magfa'
    | 'farapayamak'
    | 'payamak_panel';

export type SmsConfigFieldType = 'text' | 'password' | 'url' | 'select';

export interface SmsConfigField {
    key: string;
    label: string;
    type: SmsConfigFieldType;
    required?: boolean;
    placeholder?: string;
    helpText?: string;
    options?: { value: string; label: string }[];
    defaultValue?: string;
    section: 'credentials' | 'template' | 'line';
}

export interface SmsProviderDefinition {
    providerType: SmsProviderType;
    label: string;
    description: string;
    fields: SmsConfigField[];
    defaultConfig: Record<string, string>;
}

const patternFieldsIranPayamak: SmsConfigField[] = [
    {
        key: 'apiKey',
        label: 'کلید API',
        type: 'text',
        required: true,
        section: 'credentials',
        helpText: 'از پنل سرویس‌دهنده — معمولاً در هدر Api-Key',
    },
    {
        key: 'patternCode',
        label: 'کد پترن (قالب OTP)',
        type: 'text',
        required: true,
        section: 'template',
        helpText: 'کد قالب/پترن تأییدشده برای ارسال کد یکبارمصرف',
    },
    {
        key: 'otpVarName',
        label: 'نام متغیر کد در پترن',
        type: 'text',
        section: 'template',
        defaultValue: 'otp',
        helpText: 'نام فیلدی که در قالب با کد OTP پر می‌شود',
    },
    {
        key: 'numberFormat',
        label: 'فرمت نمایش عدد در متن',
        type: 'select',
        section: 'template',
        defaultValue: 'persian',
        options: [
            { value: 'persian', label: 'فارسی' },
            { value: 'en', label: 'لاتین' },
        ],
    },
    {
        key: 'lineNumber',
        label: 'شماره خط ارسال',
        type: 'text',
        section: 'line',
        helpText: 'در صورت نیاز سرویس‌دهنده',
    },
];

export const SMS_PROVIDER_DEFINITIONS: Record<SmsProviderType, SmsProviderDefinition> = {
    iran_payamak: {
        providerType: 'iran_payamak',
        label: 'پترن REST (نوع ایران‌پیامک)',
        description: 'ارسال OTP با API پترن و کد قالب',
        fields: patternFieldsIranPayamak,
        defaultConfig: {
            apiKey: '',
            patternCode: '',
            otpVarName: 'otp',
            numberFormat: 'persian',
            lineNumber: '',
        },
    },
    sms_ir: {
        providerType: 'sms_ir',
        label: 'sms.ir — verify و قالب OTP',
        description: 'پنل sms.ir — ارسال کد با Template ID و API Key',
        fields: [
            {
                key: 'token',
                label: 'کلید API',
                type: 'text',
                required: true,
                section: 'credentials',
                helpText: 'API Key از پنل sms.ir (هدر X-API-KEY)',
            },
            {
                key: 'templateId',
                label: 'شناسه قالب OTP',
                type: 'text',
                required: true,
                section: 'template',
                helpText: 'Template ID قالب verify در پنل sms.ir',
            },
            {
                key: 'templateParamName',
                label: 'نام پارامتر کد در قالب',
                type: 'text',
                section: 'template',
                defaultValue: 'CODE',
            },
            {
                key: 'apiUrl',
                label: 'آدرس API',
                type: 'url',
                section: 'template',
                placeholder: 'https://api.sms.ir/v1/send/verify',
                defaultValue: 'https://api.sms.ir/v1/send/verify',
                helpText: 'پیش‌فرض verify sms.ir — در صورت نیاز عوض کنید',
            },
        ],
        defaultConfig: {
            token: '',
            templateId: '',
            templateParamName: 'CODE',
            apiUrl: 'https://api.sms.ir/v1/send/verify',
        },
    },
    kavenegar: {
        providerType: 'kavenegar',
        label: 'کاوه‌نگار',
        description: 'Lookup / verify با نام قالب در API کاوه‌نگار',
        fields: [
            {
                key: 'apiKey',
                label: 'کلید API',
                type: 'text',
                required: true,
                section: 'credentials',
            },
            {
                key: 'template',
                label: 'نام قالب',
                type: 'text',
                required: true,
                section: 'template',
                helpText: 'نام قالب verify در پنل (مثلاً verify)',
            },
        ],
        defaultConfig: { apiKey: '', template: 'verify' },
    },
    melipayamak: {
        providerType: 'melipayamak',
        label: 'ملی‌پیامک',
        description: 'ارسال OTP با bodyId (کد قالب) و REST پنل',
        fields: [
            {
                key: 'username',
                label: 'نام کاربری',
                type: 'text',
                required: true,
                section: 'credentials',
            },
            {
                key: 'password',
                label: 'رمز',
                type: 'password',
                required: true,
                section: 'credentials',
            },
            {
                key: 'bodyId',
                label: 'کد قالب (bodyId)',
                type: 'text',
                required: true,
                section: 'template',
                helpText: 'شناسه قالب/پترن OTP در پنل',
            },
        ],
        defaultConfig: { username: '', password: '', bodyId: '' },
    },
    ghasedak: {
        providerType: 'ghasedak',
        label: 'قاصدک',
        description: 'ارسال verify ساده با نام قالب',
        fields: [
            {
                key: 'apiKey',
                label: 'کلید API',
                type: 'text',
                required: true,
                section: 'credentials',
            },
            {
                key: 'template',
                label: 'نام قالب',
                type: 'text',
                required: true,
                section: 'template',
            },
        ],
        defaultConfig: { apiKey: '', template: '' },
    },
    magfa: {
        providerType: 'magfa',
        label: 'مگفا',
        description: 'OTP با domain و قالب — تنظیمات پایه REST',
        fields: [
            {
                key: 'username',
                label: 'نام کاربری',
                type: 'text',
                required: true,
                section: 'credentials',
            },
            {
                key: 'password',
                label: 'رمز',
                type: 'password',
                required: true,
                section: 'credentials',
            },
            {
                key: 'domain',
                label: 'دامنه (Domain)',
                type: 'text',
                section: 'credentials',
            },
            {
                key: 'templateId',
                label: 'شناسه / نام قالب OTP',
                type: 'text',
                required: true,
                section: 'template',
            },
        ],
        defaultConfig: { username: '', password: '', domain: '', templateId: '' },
    },
    farapayamak: {
        providerType: 'farapayamak',
        label: 'فراپیامک',
        description: 'ارسال با username/password و کد پترن',
        fields: [
            {
                key: 'username',
                label: 'نام کاربری',
                type: 'text',
                required: true,
                section: 'credentials',
            },
            {
                key: 'password',
                label: 'رمز',
                type: 'password',
                required: true,
                section: 'credentials',
            },
            {
                key: 'patternCode',
                label: 'کد پترن / قالب',
                type: 'text',
                required: true,
                section: 'template',
            },
            {
                key: 'fromNumber',
                label: 'شماره فرستنده',
                type: 'text',
                section: 'line',
            },
        ],
        defaultConfig: { username: '', password: '', patternCode: '', fromNumber: '' },
    },
    payamak_panel: {
        providerType: 'payamak_panel',
        label: 'پنل پیامک REST (عمومی)',
        description: 'برای سرویس‌دهندگانی که API شبیه پنل‌های رایج دارند',
        fields: [
            {
                key: 'username',
                label: 'نام کاربری',
                type: 'text',
                section: 'credentials',
            },
            {
                key: 'password',
                label: 'رمز / API Key',
                type: 'password',
                section: 'credentials',
            },
            {
                key: 'apiUrl',
                label: 'آدرس API',
                type: 'url',
                required: true,
                section: 'credentials',
            },
            {
                key: 'templateId',
                label: 'شناسه قالب OTP',
                type: 'text',
                required: true,
                section: 'template',
            },
        ],
        defaultConfig: { username: '', password: '', apiUrl: '', templateId: '' },
    },
};

export const SMS_PROVIDER_OPTIONS = Object.values(SMS_PROVIDER_DEFINITIONS).map(d => ({
    value: d.providerType,
    label: d.label,
}));

export function getSmsProviderDefinition(type: string): SmsProviderDefinition {
    return SMS_PROVIDER_DEFINITIONS[type as SmsProviderType] || SMS_PROVIDER_DEFINITIONS.iran_payamak;
}

export function buildDefaultSmsConfig(type: SmsProviderType): Record<string, string> {
    return { ...getSmsProviderDefinition(type).defaultConfig };
}

/** ردیف پترن ذخیره‌شده برای یک پنل — آینهٔ اسکیمای sms_patterns سمت API */
export interface SmsPatternRow {
    _id: string;
    providerId: string;
    code: string;
    title?: string;
    varName?: string;
    isActive: boolean;
    order: number;
}

/**
 * کلید کانفیگ هر نوع پنل که کد پترن/قالب در آن ذخیره می‌شود —
 * هنگام انتخاب پترن، همین کلید در config پنل به‌روز می‌شود (آینهٔ SMS_PATTERN_CONFIG_KEYS سمت API).
 */
export const SMS_PATTERN_CONFIG_KEYS: Record<SmsProviderType, { code: string; varName?: string }> = {
    iran_payamak: { code: 'patternCode', varName: 'otpVarName' },
    sms_ir: { code: 'templateId', varName: 'templateParamName' },
    kavenegar: { code: 'template' },
    melipayamak: { code: 'bodyId' },
    ghasedak: { code: 'template' },
    magfa: { code: 'templateId' },
    farapayamak: { code: 'patternCode' },
    payamak_panel: { code: 'templateId' },
};

export const SMS_SECTION_LABELS: Record<SmsConfigField['section'], string> = {
    credentials: 'کلید API',
    template: 'قالب / پترن OTP',
    line: 'خط ارسال',
};

/** پنل‌های با نام‌کاربری/رمز عنوان جدا دارند */
export function getSmsSectionLabel(
    section: SmsConfigField['section'],
    providerType: SmsProviderType,
): string {
    if (section !== 'credentials') {
        return SMS_SECTION_LABELS[section];
    }
    const accountProviders: SmsProviderType[] = ['melipayamak', 'magfa', 'farapayamak', 'payamak_panel'];
    return accountProviders.includes(providerType) ? 'ورود به پنل' : SMS_SECTION_LABELS.credentials;
}
