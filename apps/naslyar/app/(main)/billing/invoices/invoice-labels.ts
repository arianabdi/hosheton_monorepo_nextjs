export const INVOICE_TYPE_LABEL: Record<string, string> = {
    purchase: 'خرید / خدمات',
    deposit: 'واریز / شارژ',
    withdraw: 'برداشت',
};

export const INVOICE_PURPOSE_LABEL: Record<string, string> = {
    admin_invoice: 'فاکتور ادمین',
    wallet_recharge: 'شارژ کیف پول',
    admin_credit: 'شارژ ادمین',
    signup_bonus: 'هدیه ثبت‌نام',
    internal_credit: 'واریز داخلی',
};

export function formatInvoiceType(type?: string): string {
    if (!type) return '—';
    return INVOICE_TYPE_LABEL[type] || type;
}
