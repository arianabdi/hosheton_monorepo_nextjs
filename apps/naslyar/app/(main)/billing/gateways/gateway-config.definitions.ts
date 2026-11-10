/** آینهٔ تعاریف API — برای فرم ادمین Naslyar */

export type GatewayProviderType =
    | 'zarinpal'
    | 'sep'
    | 'behpardakht'
    | 'parsian'
    | 'sheppa'
    | 'generic'
    | 'card2card';

export type GatewayConfigFieldType = 'text' | 'password' | 'url' | 'boolean' | 'select' | 'number' | 'textarea';

export interface GatewayConfigField {
    key: string;
    label: string;
    type: GatewayConfigFieldType;
    required?: boolean;
    placeholder?: string;
    helpText?: string;
    options?: { value: string; label: string }[];
    defaultValue?: string | boolean | number;
    section?: string;
}

export interface GatewayFieldSection {
    title: string;
    hint?: string;
}

export interface GatewayProviderDefinition {
    providerType: GatewayProviderType;
    label: string;
    description: string;
    docUrl?: string;
    fields: GatewayConfigField[];
    fieldSections?: Record<string, GatewayFieldSection>;
    defaultConfig: Record<string, unknown>;
}

export const ZARINPAL_PRODUCTION_URLS = {
    requestUrl: 'https://api.zarinpal.com/pg/v4/payment/request.json',
    verifyUrl: 'https://api.zarinpal.com/pg/v4/payment/verify.json',
    paymentUrl: 'https://www.zarinpal.com/pg/StartPay/',
} as const;

export const ZARINPAL_SANDBOX_URLS = {
    requestUrl: 'https://sandbox.zarinpal.com/pg/v4/payment/request.json',
    verifyUrl: 'https://sandbox.zarinpal.com/pg/v4/payment/verify.json',
    paymentUrl: 'https://sandbox.zarinpal.com/pg/StartPay/',
} as const;

function isZarinpalSandboxHost(url: unknown): boolean {
    return typeof url === 'string' && /sandbox\.zarinpal\.com/i.test(url.trim());
}

/** Move leftover sandbox hosts out of live URL fields so the form shows two distinct environments. */
export function migrateZarinpalSandboxUrls(config: Record<string, unknown>): Record<string, unknown> {
    const next = { ...config };
    const move = (liveKey: string, sandboxKey: string) => {
        if (!String(next[sandboxKey] || '').trim() && isZarinpalSandboxHost(next[liveKey])) {
            next[sandboxKey] = next[liveKey];
            next[liveKey] = '';
        }
    };
    move('requestUrl', 'sandboxRequestUrl');
    move('verifyUrl', 'sandboxVerifyUrl');
    move('paymentUrl', 'sandboxPaymentUrl');
    return next;
}

export function normalizeGatewayConfig(
    providerType: string,
    config: Record<string, unknown> | undefined,
): Record<string, unknown> {
    const base = { ...(config || {}) };
    if (providerType === 'zarinpal') return migrateZarinpalSandboxUrls(base);
    return base;
}

export const GATEWAY_PROVIDER_DEFINITIONS: Record<GatewayProviderType, GatewayProviderDefinition> = {
    zarinpal: {
        providerType: 'zarinpal',
        label: 'زرین‌پال (ZarinPal)',
        description: 'merchant_id، amount، callback_url، description — REST v4',
        docUrl: 'https://www.zarinpal.com/docs/apiDocs/',
        fields: [
            { key: 'merchantId', label: 'Merchant ID (۳۶ کاراکتر)', type: 'text', required: true, placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', helpText: 'از پنل زرین‌پال → درگاه‌های پرداخت' },
            { key: 'sandbox', label: 'حالت Sandbox (تست)', type: 'boolean', defaultValue: true, helpText: 'برای تست پرداخت بدون تراکنش واقعی' },
            { key: 'currency', label: 'واحد پول', type: 'select', defaultValue: 'IRT', options: [{ value: 'IRT', label: 'تومان (IRT)' }, { value: 'IRR', label: 'ریال (IRR)' }] },
            {
                key: 'requestUrl',
                label: 'Request URL',
                type: 'url',
                section: 'live',
                placeholder: ZARINPAL_PRODUCTION_URLS.requestUrl,
                helpText: 'اگر خالی باشد، آدرس رسمی محیط واقعی استفاده می‌شود',
            },
            {
                key: 'verifyUrl',
                label: 'Verify URL',
                type: 'url',
                section: 'live',
                placeholder: ZARINPAL_PRODUCTION_URLS.verifyUrl,
            },
            {
                key: 'paymentUrl',
                label: 'StartPay URL',
                type: 'url',
                section: 'live',
                placeholder: ZARINPAL_PRODUCTION_URLS.paymentUrl,
            },
            {
                key: 'sandboxRequestUrl',
                label: 'Request URL',
                type: 'url',
                section: 'sandbox',
                placeholder: ZARINPAL_SANDBOX_URLS.requestUrl,
                helpText: 'اگر خالی باشد، آدرس رسمی sandbox استفاده می‌شود',
            },
            {
                key: 'sandboxVerifyUrl',
                label: 'Verify URL',
                type: 'url',
                section: 'sandbox',
                placeholder: ZARINPAL_SANDBOX_URLS.verifyUrl,
            },
            {
                key: 'sandboxPaymentUrl',
                label: 'StartPay URL',
                type: 'url',
                section: 'sandbox',
                placeholder: ZARINPAL_SANDBOX_URLS.paymentUrl,
            },
        ],
        fieldSections: {
            live: {
                title: 'آدرس‌های محیط واقعی',
                hint: 'فقط وقتی Sandbox خاموش است استفاده می‌شوند',
            },
            sandbox: {
                title: 'آدرس‌های Sandbox',
                hint: 'فقط وقتی Sandbox روشن است استفاده می‌شوند',
            },
        },
        defaultConfig: {
            merchantId: '',
            sandbox: true,
            currency: 'IRT',
            requestUrl: '',
            verifyUrl: '',
            paymentUrl: '',
            sandboxRequestUrl: '',
            sandboxVerifyUrl: '',
            sandboxPaymentUrl: '',
        },
    },
    sep: {
        providerType: 'sep',
        label: 'سپ — سامان',
        description: 'TerminalId، ResNum، RedirectUrl',
        fields: [
            { key: 'terminalId', label: 'Terminal ID', type: 'text', required: true },
            { key: 'password', label: 'رمز ترمینال', type: 'password' },
            { key: 'requestUrl', label: 'Token URL', type: 'url', placeholder: 'https://sep.shaparak.ir/onlinepg/onlinepg' },
            { key: 'verifyUrl', label: 'Verify URL', type: 'url' },
            { key: 'paymentUrl', label: 'SendToken URL', type: 'url', placeholder: 'https://sep.shaparak.ir/OnlinePG/SendToken' },
            { key: 'sandbox', label: 'حالت تست', type: 'boolean', defaultValue: false },
        ],
        defaultConfig: { terminalId: '', password: '', requestUrl: 'https://sep.shaparak.ir/onlinepg/onlinepg', verifyUrl: 'https://sep.shaparak.ir/verifyTxnRandomSessionkey/ipg/VerifyTransaction', paymentUrl: 'https://sep.shaparak.ir/OnlinePG/SendToken', sandbox: false },
    },
    behpardakht: {
        providerType: 'behpardakht',
        label: 'به‌پرداخت ملت',
        description: 'terminalId، userName، userPassword',
        fields: [
            { key: 'terminalId', label: 'Terminal ID', type: 'text', required: true },
            { key: 'username', label: 'User Name', type: 'text', required: true },
            { key: 'password', label: 'User Password', type: 'password', required: true },
            { key: 'requestUrl', label: 'bpPayRequest URL', type: 'url' },
            { key: 'paymentUrl', label: 'StartPay URL', type: 'url' },
            { key: 'sandbox', label: 'حالت تست', type: 'boolean', defaultValue: false },
        ],
        defaultConfig: { terminalId: '', username: '', password: '', requestUrl: 'https://bpm.shaparak.ir/pgwchannel/services/pgw?wsdl', paymentUrl: 'https://bpm.shaparak.ir/pgwchannel/startpay.mellat', sandbox: false },
    },
    parsian: {
        providerType: 'parsian',
        label: 'پارسیان (PEC)',
        description: 'LoginAccount (PIN)',
        fields: [
            { key: 'loginAccount', label: 'Login Account (PIN)', type: 'password', required: true },
            { key: 'requestUrl', label: 'SalePaymentRequest URL', type: 'url' },
            { key: 'verifyUrl', label: 'ConfirmPayment URL', type: 'url' },
            { key: 'paymentUrl', label: 'Redirect URL', type: 'url' },
            { key: 'sandbox', label: 'حالت تست', type: 'boolean', defaultValue: false },
        ],
        defaultConfig: { loginAccount: '', requestUrl: 'https://pec.shaparak.ir/NewIPGServices/Sale/SaleService.asmx', verifyUrl: 'https://pec.shaparak.ir/NewIPGServices/Confirm/ConfirmService.asmx', paymentUrl: 'https://pec.shaparak.ir/NewIPG/', sandbox: false },
    },
    sheppa: {
        providerType: 'sheppa',
        label: 'شپا (Sheppa)',
        description: 'merchantId + URLهای REST',
        fields: [
            { key: 'merchantId', label: 'Merchant ID', type: 'text', required: true },
            { key: 'apiKey', label: 'API Key', type: 'password' },
            { key: 'requestUrl', label: 'Request URL', type: 'url', required: true },
            { key: 'verifyUrl', label: 'Verify URL', type: 'url', required: true },
            { key: 'paymentUrl', label: 'Payment URL', type: 'url', required: true },
        ],
        defaultConfig: { merchantId: '', apiKey: '', requestUrl: '', verifyUrl: '', paymentUrl: '' },
    },
    generic: {
        providerType: 'generic',
        label: 'Generic (اسنپ‌پی، دیجی‌پی، ...)',
        description: 'REST سفارشی — requestUrl، verifyUrl، paymentUrl',
        fields: [
            { key: 'merchantId', label: 'Merchant / Client ID', type: 'text' },
            { key: 'apiKey', label: 'API Key', type: 'password' },
            { key: 'requestUrl', label: 'Request URL', type: 'url', required: true },
            { key: 'verifyUrl', label: 'Verify URL', type: 'url', required: true },
            { key: 'paymentUrl', label: 'Payment URL ({authority})', type: 'url', required: true, helpText: 'از {authority} یا {token} در URL استفاده کنید' },
        ],
        defaultConfig: { merchantId: '', apiKey: '', requestUrl: '', verifyUrl: '', paymentUrl: '' },
    },
    card2card: {
        providerType: 'card2card',
        label: 'کارت‌به‌کارت / واریز دستی',
        description: 'کاربر مبلغ را کارت‌به‌کارت واریز می‌کند، رسید آپلود می‌کند و پس از تأیید ادمین کیف پول شارژ می‌شود',
        fields: [
            { key: 'cardNumber', label: 'شماره کارت مقصد', type: 'text', required: true, placeholder: '6037-****-****-****', helpText: 'شماره‌ای که به کاربر نمایش داده می‌شود' },
            { key: 'sheba', label: 'شماره شبا (اختیاری)', type: 'text', placeholder: 'IR...' },
            { key: 'accountHolder', label: 'نام صاحب حساب', type: 'text', required: true },
            { key: 'bankName', label: 'نام بانک', type: 'text', required: true, placeholder: 'ملی / ملت / ...' },
            { key: 'instructions', label: 'راهنمای واریز', type: 'textarea', placeholder: 'مبلغ دقیق را واریز کنید و رسید را آپلود کنید', helpText: 'متن کوتاه راهنما برای کاربر در صفحه کیف پول' },
        ],
        defaultConfig: {
            cardNumber: '',
            sheba: '',
            accountHolder: '',
            bankName: '',
            instructions: 'مبلغ دقیق را کارت‌به‌کارت واریز کنید، سپس تصویر رسید را آپلود کنید تا پس از تأیید، موجودی شارژ شود.',
        },
    },
};

export const PROVIDER_OPTIONS = Object.values(GATEWAY_PROVIDER_DEFINITIONS).map(d => ({
    value: d.providerType,
    label: d.label,
}));

export function getProviderDefinition(type: string): GatewayProviderDefinition {
    return GATEWAY_PROVIDER_DEFINITIONS[type as GatewayProviderType] || GATEWAY_PROVIDER_DEFINITIONS.generic;
}

export function buildDefaultConfig(type: string): Record<string, unknown> {
    return { ...getProviderDefinition(type).defaultConfig };
}

/** نگاشت slug پیش‌فرض seed به providerType */
export const SLUG_PROVIDER_MAP: Record<string, GatewayProviderType> = {
    zarinpal: 'zarinpal',
    seppay: 'sep',
    behpardakht: 'behpardakht',
    parsian: 'parsian',
    sheppa: 'sheppa',
    snappay: 'generic',
    digipay: 'generic',
    card2card: 'card2card',
    'card-to-card': 'card2card',
    manual: 'card2card',
};
