'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { LuFilePlus2 } from 'react-icons/lu';
import { Container, Wrapper } from '@/app/(main)/layout';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { LoadingState } from '@my-workspace/components';
import TableEmptyState from '@/app/(main)/components/TableEmptyState';
import { AccountingContextBar, useAccountingContext } from '../../components/useAccountingContext';
import HelpIcon from '../../components/HelpIcon';
import AccountingGuide from '../../components/AccountingGuide';
import { ACCOUNTING_GUIDES } from '../../components/guides';
import VoucherForm from '../../components/VoucherForm';
import { accountingApi, AccountingAccount, VoucherPayloadEntry } from '../../accounting-api';
import styles from '../../Accounting.module.scss';

export default function NewVoucherPage() {
    const router = useRouter();
    const context = useAccountingContext();
    const { company, fiscalYear } = context;
    const [accounts, setAccounts] = React.useState<AccountingAccount[]>([]);
    const [accountsLoading, setAccountsLoading] = React.useState(true);
    const [submitting, setSubmitting] = React.useState(false);

    React.useEffect(() => {
        if (!company?._id) {
            setAccounts([]);
            setAccountsLoading(false);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                setAccountsLoading(true);
                const result = await accountingApi.listAccounts({
                    companyId: company._id,
                    leafOnly: 'true',
                });
                if (!cancelled) setAccounts(result?.items || []);
            } catch (e) {
                ErrorToaster(e);
            } finally {
                if (!cancelled) setAccountsLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [company?._id]);

    const fiscalYearClosed = Boolean(fiscalYear && fiscalYear.status === 'closed');

    const handleSubmit = async (payload: {
        date: string;
        description: string;
        entries: VoucherPayloadEntry[];
    }) => {
        if (!company?._id || !fiscalYear?._id) {
            ErrorToaster(new Error('ابتدا شرکت و سال مالی را از نوار بالای صفحه انتخاب کنید'));
            return;
        }
        try {
            setSubmitting(true);
            const voucher = await accountingApi.createVoucher({
                companyId: company._id,
                fiscalYearId: fiscalYear._id,
                date: payload.date,
                description: payload.description,
                entries: payload.entries,
            });
            SuccessToaster({ message: 'پیش‌نویس سند ذخیره شد' });
            router.push(`/accounting/vouchers/${voucher._id}`);
        } catch (e) {
            ErrorToaster(e);
            setSubmitting(false);
        }
    };

    const canShowForm = Boolean(company && fiscalYear) && !fiscalYearClosed;

    return (
        <Container>
            <Wrapper>
                <div className={`${styles.page} ${styles.rtl}`}>
                    <header className={styles.header}>
                        <div>
                            <div className={styles.titleRow}>
                                <h1 className={styles.mainTitle}>ثبت سند جدید</h1>
                                <HelpIcon topic="voucherNew" />
                            </div>
                            <p className={styles.subtitle}>
                                سند به‌صورت پیش‌نویس ذخیره می‌شود و پس از ثبت قطعی، شماره می‌گیرد و در گزارش‌ها اثر می‌کند.
                            </p>
                        </div>
                    </header>

                    <AccountingGuide guide={ACCOUNTING_GUIDES.voucherNew} />

                    <AccountingContextBar context={context} />

                    {context.loading || accountsLoading ? (
                        <LoadingState />
                    ) : !company ? (
                        <TableEmptyState
                            icon={<LuFilePlus2 size={28} />}
                            title="شرکتی انتخاب نشده"
                            description="برای ثبت سند، ابتدا یک شرکت بسازید یا انتخاب کنید."
                            primaryLabel="مدیریت شرکت‌ها"
                            primaryHref="/accounting/companies"
                        />
                    ) : !fiscalYear ? (
                        <TableEmptyState
                            icon={<LuFilePlus2 size={28} />}
                            title="سال مالی وجود ندارد"
                            description="برای این شرکت سال مالی تعریف نشده است؛ ابتدا از بخش سال‌های مالی یک دوره بسازید."
                            primaryLabel="مدیریت سال‌های مالی"
                            primaryHref="/accounting/fiscal-years"
                        />
                    ) : fiscalYearClosed ? (
                        <TableEmptyState
                            icon={<LuFilePlus2 size={28} />}
                            title="سال مالی بسته است"
                            description="دوره مالی انتخاب‌شده بسته شده و امکان ثبت سند در آن وجود ندارد. سال مالی باز را انتخاب کنید."
                            primaryLabel="مدیریت سال‌های مالی"
                            primaryHref="/accounting/fiscal-years"
                        />
                    ) : accounts.length === 0 ? (
                        <TableEmptyState
                            icon={<LuFilePlus2 size={28} />}
                            title="حساب معینی وجود ندارد"
                            description="برای ثبت سند حداقل به دو حساب معین (بدون زیرمجموعه) نیاز دارید."
                            primaryLabel="مدیریت کدینگ حساب‌ها"
                            primaryHref="/accounting/accounts"
                        />
                    ) : (
                        canShowForm && (
                            <VoucherForm
                                accounts={accounts}
                                submitting={submitting}
                                onSubmit={handleSubmit}
                                onCancel={() => router.push('/accounting/vouchers')}
                            />
                        )
                    )}
                </div>
            </Wrapper>
        </Container>
    );
}
