'use client';

/**
 * کلاینت API ماژول حسابداری
 * ------------------------------------------------------------------------------
 * API اختصاصی نسل‌یار (اپ neslar) — آدرس با NEXT_PUBLIC_ACCOUNTING_API_URL
 * تنظیم می‌شود و در نبود آن به API اصلی برمی‌گردد.
 */

import axios from 'axios';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import type {
    AccountingAccountNature,
    AccountingAccountType,
    AccountingFiscalYearStatus,
    AccountingVoucherStatus,
} from './accounting.utils';

export interface AccountingEnvelope<T> {
    data: T;
    statusCode: number;
    message?: string;
}

export interface AccountingCompany {
    _id: string;
    title: string;
    nationalId?: string | null;
    economicCode?: string | null;
    nationalCode?: string | null;
    registrationNumber?: string | null;
    postalCode?: string | null;
    baseCurrency?: string;
    address?: string | null;
    phone?: string | null;
    ownerId: string;
    isActive?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface AccountingFiscalYear {
    _id: string;
    companyId: string;
    title: string;
    year: number;
    startDate: string;
    endDate: string;
    startDateJalali?: string | null;
    endDateJalali?: string | null;
    status: AccountingFiscalYearStatus;
    closedAt?: string | null;
    createdAt?: string;
}

export interface AccountingAccount {
    _id: string;
    companyId: string;
    code: string;
    title: string;
    type: AccountingAccountType;
    nature: AccountingAccountNature;
    parentId?: string | null;
    path?: string;
    level?: number;
    isLeaf?: boolean;
    isControl?: boolean;
    ordering?: number;
    description?: string | null;
    isArchive?: boolean;
    createdAt?: string;
}

export interface AccountingAccountNode extends AccountingAccount {
    children: AccountingAccountNode[];
}

export interface AccountingVoucherEntry {
    accountId: string;
    accountCode: string;
    accountTitle: string;
    description?: string | null;
    debit: number;
    credit: number;
}

export interface AccountingVoucher {
    _id: string;
    companyId: string;
    fiscalYearId: string;
    number: number;
    date: string;
    dateJalali?: string | null;
    description?: string | null;
    status: AccountingVoucherStatus;
    entries: AccountingVoucherEntry[];
    totalDebit: number;
    totalCredit: number;
    postedAt?: string | null;
    reversesVoucherId?: string | null;
    reversedByVoucherId?: string | null;
    source?: string;
    createdAt?: string;
}

export interface ListResult<T> {
    items: T[];
    totalItems: number;
    page?: number;
    limit?: number;
}

export interface VoucherPayloadEntry {
    accountId: string;
    description?: string | null;
    debit?: number;
    credit?: number;
}

function getRequestConfig() {
    const { token } = useAuthStore.getState();
    const { baseUrl } = useAppStore.getState();
    const apiBase =
        process.env.NEXT_PUBLIC_ACCOUNTING_API_URL || baseUrl || process.env.NEXT_PUBLIC_API_URL || '';
    return {
        apiBase,
        headers: { authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    };
}

async function request<T>(
    method: 'get' | 'post' | 'put' | 'delete',
    path: string,
    options: { params?: Record<string, unknown>; body?: unknown } = {},
): Promise<T> {
    const { apiBase, headers } = getRequestConfig();
    const res = await axios.request<AccountingEnvelope<T>>({
        method,
        url: `${apiBase}${path}`,
        headers,
        params: options.params,
        data: options.body,
    });
    if (res.data.statusCode !== 200) {
        throw new Error(res.data.message || 'خطا در ارتباط با سرور حسابداری');
    }
    return res.data.data;
}

export const accountingApi = {
    // ---------------------------------------------------------------- companies
    listCompanies: (params?: { page?: number; limit?: number }) =>
        request<ListResult<AccountingCompany>>('get', '/api/accounting/companies', { params }),
    getCompany: (id: string) => request<AccountingCompany>('get', `/api/accounting/companies/${id}`),
    createCompany: (body: Record<string, unknown>) =>
        request<AccountingCompany>('post', '/api/accounting/companies', { body }),
    updateCompany: (id: string, body: Record<string, unknown>) =>
        request<AccountingCompany>('put', `/api/accounting/companies/${id}`, { body }),
    deleteCompany: (id: string) => request<{ success: boolean }>('delete', `/api/accounting/companies/${id}`),

    // ------------------------------------------------------------- fiscal years
    listFiscalYears: (companyId: string) =>
        request<ListResult<AccountingFiscalYear>>('get', '/api/accounting/fiscal-years', {
            params: { companyId },
        }),
    createFiscalYear: (body: { companyId: string; year: number; title?: string }) =>
        request<AccountingFiscalYear>('post', '/api/accounting/fiscal-years', { body }),
    closeFiscalYear: (id: string) =>
        request<AccountingFiscalYear>('post', `/api/accounting/fiscal-years/${id}/close`),
    reopenFiscalYear: (id: string) =>
        request<AccountingFiscalYear>('post', `/api/accounting/fiscal-years/${id}/reopen`),
    deleteFiscalYear: (id: string) =>
        request<{ success: boolean }>('delete', `/api/accounting/fiscal-years/${id}`),

    // ----------------------------------------------------------------- accounts
    getAccountTree: (companyId: string, includeArchive = false) =>
        request<ListResult<AccountingAccountNode>>('get', '/api/accounting/accounts/tree', {
            params: { companyId, includeArchive: String(includeArchive) },
        }),
    listAccounts: (params: {
        companyId: string;
        search?: string;
        type?: string;
        leafOnly?: string;
        includeArchive?: string;
    }) => request<ListResult<AccountingAccount>>('get', '/api/accounting/accounts', { params }),
    getNextAccountCode: (companyId: string, parentId?: string) =>
        request<{ code: string }>('get', '/api/accounting/accounts/next-code', {
            params: { companyId, parentId: parentId || '' },
        }),
    createAccount: (body: Record<string, unknown>) =>
        request<AccountingAccount>('post', '/api/accounting/accounts', { body }),
    updateAccount: (id: string, body: Record<string, unknown>) =>
        request<AccountingAccount>('put', `/api/accounting/accounts/${id}`, { body }),
    archiveAccount: (id: string) => request<{ success: boolean }>('delete', `/api/accounting/accounts/${id}`),

    // ----------------------------------------------------------------- vouchers
    listVouchers: (params: {
        companyId: string;
        fiscalYearId?: string;
        status?: string;
        search?: string;
        fromDate?: string;
        toDate?: string;
        accountId?: string;
        page?: number;
        limit?: number;
    }) => request<ListResult<AccountingVoucher>>('get', '/api/accounting/vouchers', { params }),
    getVoucher: (id: string) => request<AccountingVoucher>('get', `/api/accounting/vouchers/${id}`),
    createVoucher: (body: {
        companyId: string;
        fiscalYearId: string;
        date: string;
        description?: string | null;
        entries: VoucherPayloadEntry[];
    }) => request<AccountingVoucher>('post', '/api/accounting/vouchers', { body }),
    updateVoucher: (
        id: string,
        body: { date?: string; description?: string | null; entries?: VoucherPayloadEntry[] },
    ) => request<AccountingVoucher>('put', `/api/accounting/vouchers/${id}`, { body }),
    deleteVoucher: (id: string) => request<{ success: boolean }>('delete', `/api/accounting/vouchers/${id}`),
    postVoucher: (id: string) => request<AccountingVoucher>('post', `/api/accounting/vouchers/${id}/post`),
    reverseVoucher: (id: string) =>
        request<{ original: AccountingVoucher; reversal: AccountingVoucher }>(
            'post',
            `/api/accounting/vouchers/${id}/reverse`,
        ),

    // ------------------------------------------------------------------ reports
    journalReport: (params: {
        companyId: string;
        fiscalYearId?: string;
        fromDate?: string;
        toDate?: string;
        page?: number;
        limit?: number;
    }) =>
        request<
            ListResult<AccountingVoucher> & { totals: { totalDebit: number; totalCredit: number } }
        >('get', '/api/accounting/reports/journal', { params }),
    generalLedgerReport: (params: {
        companyId: string;
        accountId: string;
        fiscalYearId?: string;
        fromDate?: string;
        toDate?: string;
    }) =>
        request<{
            account: AccountingAccount;
            openingBalance: number;
            rows: {
                voucherId: string;
                voucherNumber: number;
                date: string;
                dateJalali?: string;
                description?: string;
                debit: number;
                credit: number;
                balance: number;
            }[];
            totals: { debit: number; credit: number; closingBalance: number };
        }>('get', '/api/accounting/reports/general-ledger', { params }),
    trialBalanceReport: (params: {
        companyId: string;
        fiscalYearId?: string;
        fromDate?: string;
        toDate?: string;
    }) =>
        request<{
            items: {
                accountId: string;
                accountCode: string;
                accountTitle: string;
                accountType: AccountingAccountType;
                accountNature: AccountingAccountNature;
                debit: number;
                credit: number;
                balanceDebit: number;
                balanceCredit: number;
            }[];
            totals: { debit: number; credit: number; balanceDebit: number; balanceCredit: number };
        }>('get', '/api/accounting/reports/trial-balance', { params }),
    dashboardReport: (params: { companyId: string; fiscalYearId?: string }) =>
        request<{
            balances: Record<string, number>;
            balanceLabels: Record<string, string>;
            voucherStats: Record<string, number>;
            recentVouchers: AccountingVoucher[];
        }>('get', '/api/accounting/reports/dashboard', { params }),
};
