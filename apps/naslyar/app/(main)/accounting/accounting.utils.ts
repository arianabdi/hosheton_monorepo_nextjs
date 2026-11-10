/**
 * منطق محض ماژول حسابداری — بدون وابستگی به React/axios (قابل تست با node --test)
 */

export type AccountingAccountType = 'asset' | 'liability' | 'equity' | 'income' | 'expense';
export type AccountingAccountNature = 'debit' | 'credit';
export type AccountingVoucherStatus = 'draft' | 'posted' | 'reversed';
export type AccountingFiscalYearStatus = 'open' | 'closed';

export const ACCOUNT_TYPE_LABELS: Record<AccountingAccountType, string> = {
    asset: 'دارایی',
    liability: 'بدهی',
    equity: 'سرمایه',
    income: 'درآمد',
    expense: 'هزینه',
};

export const ACCOUNT_NATURE_LABELS: Record<AccountingAccountNature, string> = {
    debit: 'بدهکار',
    credit: 'بستانکار',
};

export const VOUCHER_STATUS_LABELS: Record<AccountingVoucherStatus, string> = {
    draft: 'پیش‌نویس',
    posted: 'قطعی',
    reversed: 'معکوس شده',
};

export const FISCAL_YEAR_STATUS_LABELS: Record<AccountingFiscalYearStatus, string> = {
    open: 'باز',
    closed: 'بسته',
};

export const ACCOUNT_TYPE_NATURE: Record<AccountingAccountType, AccountingAccountNature> = {
    asset: 'debit',
    expense: 'debit',
    liability: 'credit',
    equity: 'credit',
    income: 'credit',
};

export interface VoucherRowInput {
    accountId?: string;
    description?: string;
    debit?: number | string;
    credit?: number | string;
}

function toNumber(value: number | string | undefined): number {
    const n = typeof value === 'string' ? Number(value.replace(/[,٬\s]/g, '')) : Number(value || 0);
    return Number.isFinite(n) ? n : 0;
}

/** گرد کردن روی ۲ رقم اعشار برای جلوگیری از خطای اعشار شناور */
export function round2(value: number): number {
    return Math.round((Number(value) || 0) * 100) / 100;
}

export function computeVoucherTotals(rows: VoucherRowInput[]) {
    let totalDebit = 0;
    let totalCredit = 0;
    for (const row of rows || []) {
        totalDebit = round2(totalDebit + toNumber(row.debit));
        totalCredit = round2(totalCredit + toNumber(row.credit));
    }
    return {
        totalDebit,
        totalCredit,
        difference: round2(totalDebit - totalCredit),
        isBalanced: rows.length >= 2 && totalDebit > 0 && round2(totalDebit - totalCredit) === 0,
    };
}

/**
 * پیشنهاد کد فرزند برای درخت حساب
 * @param parentCode کد حساب والد (null برای ریشه)
 * @param siblingCodes کدهای خواهر/برادر موجود
 */
export function suggestChildCode(parentCode: string | null, siblingCodes: string[]): string {
    if (!parentCode) {
        const maxRoot = (siblingCodes || []).reduce((max, code) => Math.max(max, Number(code) || 0), 0);
        return String(maxRoot + 1);
    }
    const maxSuffix = (siblingCodes || []).reduce((max, code) => {
        const suffix = Number(String(code).slice(parentCode.length)) || 0;
        return Math.max(max, suffix);
    }, 0);
    return `${parentCode}${String(maxSuffix + 1).padStart(2, '0')}`;
}

/** اعتبارسنجی ردیف‌های سند در سمت کلاینت — پیام فارسی اولین خطا یا null */
export function validateVoucherRows(rows: VoucherRowInput[]): string | null {
    if (!rows || rows.length < 2) return 'حداقل دو ردیف برای سند لازم است';
    for (let i = 0; i < rows.length; i += 1) {
        const debit = round2(toNumber(rows[i].debit));
        const credit = round2(toNumber(rows[i].credit));
        if (!rows[i].accountId) return `ردیف ${i + 1}: حساب انتخاب نشده است`;
        if (debit < 0 || credit < 0) return `ردیف ${i + 1}: مبلغ منفی مجاز نیست`;
        if (debit > 0 && credit > 0) return `ردیف ${i + 1}: یک ردیف نمی‌تواند همزمان بدهکار و بستانکار باشد`;
        if (debit === 0 && credit === 0) return `ردیف ${i + 1}: مبلغ ردیف نمی‌تواند صفر باشد`;
    }
    const { isBalanced, totalDebit, totalCredit } = computeVoucherTotals(rows);
    if (!isBalanced) return `جمع بدهکار (${totalDebit}) و بستانکار (${totalCredit}) برابر نیست`;
    return null;
}
