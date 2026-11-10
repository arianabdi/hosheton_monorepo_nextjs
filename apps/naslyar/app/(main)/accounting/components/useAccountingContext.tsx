'use client';

/**
 * کانتکست مشترک صفحات حسابداری — انتخاب شرکت و سال مالی فعال
 * انتخاب‌ها در localStorage نگه‌داری می‌شوند تا بین صفحات حفظ شوند.
 */

import { useCallback, useEffect, useState } from 'react';
import { accountingApi, AccountingCompany, AccountingFiscalYear } from '../accounting-api';
import barStyles from '../Accounting.module.scss';

const COMPANY_KEY = 'accounting.selectedCompanyId';
const FISCAL_YEAR_KEY = 'accounting.selectedFiscalYearId';

export interface AccountingContextValue {
    loading: boolean;
    companies: AccountingCompany[];
    company: AccountingCompany | null;
    fiscalYears: AccountingFiscalYear[];
    fiscalYear: AccountingFiscalYear | null;
    setCompanyId: (id: string) => void;
    setFiscalYearId: (id: string) => void;
    reload: () => Promise<void>;
}

export function useAccountingContext(): AccountingContextValue {
    const [loading, setLoading] = useState(true);
    const [companies, setCompanies] = useState<AccountingCompany[]>([]);
    const [companyId, setCompanyIdState] = useState<string>('');
    const [fiscalYears, setFiscalYears] = useState<AccountingFiscalYear[]>([]);
    const [fiscalYearId, setFiscalYearIdState] = useState<string>('');

    const loadCompanies = useCallback(async () => {
        setLoading(true);
        try {
            const result = await accountingApi.listCompanies({ limit: 100 });
            const items = result?.items || [];
            setCompanies(items);
            const stored = typeof window !== 'undefined' ? window.localStorage.getItem(COMPANY_KEY) || '' : '';
            const valid = items.find((c) => c._id === stored) ? stored : items[0]?._id || '';
            setCompanyIdState(valid);
        } catch {
            setCompanies([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadCompanies();
    }, [loadCompanies]);

    useEffect(() => {
        if (!companyId) {
            setFiscalYears([]);
            setFiscalYearIdState('');
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const result = await accountingApi.listFiscalYears(companyId);
                if (cancelled) return;
                const items = result?.items || [];
                setFiscalYears(items);
                const stored =
                    typeof window !== 'undefined' ? window.localStorage.getItem(FISCAL_YEAR_KEY) || '' : '';
                const openFirst = items.find((fy) => fy.status === 'open') || items[0];
                const valid = items.find((fy) => fy._id === stored) ? stored : openFirst?._id || '';
                setFiscalYearIdState(valid);
            } catch {
                if (!cancelled) setFiscalYears([]);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [companyId]);

    const setCompanyId = useCallback((id: string) => {
        setCompanyIdState(id);
        if (typeof window !== 'undefined') window.localStorage.setItem(COMPANY_KEY, id);
    }, []);

    const setFiscalYearId = useCallback((id: string) => {
        setFiscalYearIdState(id);
        if (typeof window !== 'undefined') window.localStorage.setItem(FISCAL_YEAR_KEY, id);
    }, []);

    const company = companies.find((c) => c._id === companyId) || null;
    const fiscalYear = fiscalYears.find((fy) => fy._id === fiscalYearId) || null;

    return {
        loading,
        companies,
        company,
        fiscalYears,
        fiscalYear,
        setCompanyId,
        setFiscalYearId,
        reload: loadCompanies,
    };
}

/**
 * نوار انتخاب شرکت/سال مالی — در همه صفحات ماژول نمایش داده می‌شود.
 */
export function AccountingContextBar({
    context,
    onChangeCompany,
    showFiscalYear = true,
}: {
    context: AccountingContextValue;
    onChangeCompany?: (id: string) => void;
    showFiscalYear?: boolean;
}) {
    return (
        <div className={barStyles.contextBar}>
            <div className={barStyles.contextField}>
                <label>شرکت فعال</label>
                <select
                    value={context.company?._id || ''}
                    onChange={(e) => {
                        context.setCompanyId(e.target.value);
                        onChangeCompany?.(e.target.value);
                    }}
                >
                    {context.companies.length === 0 && <option value="">شرکتی وجود ندارد</option>}
                    {context.companies.map((c) => (
                        <option key={c._id} value={c._id}>
                            {c.title}
                        </option>
                    ))}
                </select>
            </div>
            {showFiscalYear && (
                <div className={barStyles.contextField}>
                    <label>سال مالی</label>
                    <select
                        value={context.fiscalYear?._id || ''}
                        onChange={(e) => context.setFiscalYearId(e.target.value)}
                    >
                        {context.fiscalYears.length === 0 && <option value="">سال مالی وجود ندارد</option>}
                        {context.fiscalYears.map((fy) => (
                            <option key={fy._id} value={fy._id}>
                                {fy.title} {fy.status === 'closed' ? '(بسته)' : ''}
                            </option>
                        ))}
                    </select>
                </div>
            )}
        </div>
    );
}
