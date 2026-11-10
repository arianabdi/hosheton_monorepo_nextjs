'use client';

import React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { LuNotebookPen } from 'react-icons/lu';
import { Container, Wrapper } from '@/app/(main)/layout';
import { ErrorToaster, MoneySeparator, SuccessToaster, toFarsiNumber } from '@my-workspace/utils';
import { LoadingState } from '@my-workspace/components';
import HelpIcon from '../../components/HelpIcon';
import AccountingGuide from '../../components/AccountingGuide';
import { ACCOUNTING_GUIDES } from '../../components/guides';
import VoucherForm from '../../components/VoucherForm';
import { AccountingContextBar, useAccountingContext } from '../../components/useAccountingContext';
import { accountingApi, AccountingAccount, AccountingVoucher, VoucherPayloadEntry } from '../../accounting-api';
import { VOUCHER_STATUS_LABELS, AccountingVoucherStatus } from '../../accounting.utils';
import styles from '../../Accounting.module.scss';

const STATUS_BADGE: Record<string, string> = {
    draft: styles.badgeDraft,
    posted: styles.badgePosted,
    reversed: styles.badgeReversed,
};

export default function VoucherDetailPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const voucherId = params?.id;
    const context = useAccountingContext();

    const [loading, setLoading] = React.useState(true);
    const [voucher, setVoucher] = React.useState<AccountingVoucher | null>(null);
    const [accounts, setAccounts] = React.useState<AccountingAccount[]>([]);
    const [editing, setEditing] = React.useState(false);
    const [busy, setBusy] = React.useState(false);

    const load = React.useCallback(async () => {
        if (!voucherId) return;
        try {
            setLoading(true);
            setVoucher(await accountingApi.getVoucher(String(voucherId)));
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, [voucherId]);

    React.useEffect(() => {
        load();
    }, [load]);

    // لیست حساب‌های معین برای حالت ویرایش
    React.useEffect(() => {
        if (!context.company?._id) return;
        let cancelled = false;
        (async () => {
            try {
                const result = await accountingApi.listAccounts({
                    companyId: context.company!._id,
                    leafOnly: 'true',
                });
                if (!cancelled) setAccounts(result?.items || []);
            } catch {
                /* بی‌صدا — لیست فقط برای ویرایش لازم است */
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [context.company?._id]);

    const post = async () => {
        if (!voucher) return;
        if (!confirm('سند قطعی شود؟ پس از ثبت، ویرایش و حذف امکان‌پذیر نیست.')) return;
        try {
            setBusy(true);
            await accountingApi.postVoucher(voucher._id);
            SuccessToaster({ message: 'سند قطعی و شماره‌گذاری شد' });
            await load();
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setBusy(false);
        }
    };

    const remove = async () => {
        if (!voucher) return;
        if (!confirm('این پیش‌نویس حذف شود؟')) return;
        try {
            setBusy(true);
            await accountingApi.deleteVoucher(voucher._id);
            SuccessToaster({ message: 'سند حذف شد' });
            router.push('/accounting/vouchers');
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setBusy(false);
        }
    };

    const reverse = async () => {
        if (!voucher) return;
        if (
            !confirm(
                'سند معکوس صادر شود؟ سندي با ردیف‌های برعکس ثبت و قطعی می‌شود و این سند «معکوس‌شده» خواهد شد.',
            )
        )
            return;
        try {
            setBusy(true);
            const result = await accountingApi.reverseVoucher(voucher._id);
            SuccessToaster({ message: `سند معکوس با شماره ${result.reversal.number} ثبت شد` });
            await load();
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setBusy(false);
        }
    };

    const handleUpdate = async (payload: {
        date: string;
        description: string;
        entries: VoucherPayloadEntry[];
    }) => {
        if (!voucher) return;
        try {
            setBusy(true);
            await accountingApi.updateVoucher(voucher._id, payload);
            SuccessToaster({ message: 'سند بروزرسانی شد' });
            setEditing(false);
            await load();
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setBusy(false);
        }
    };

    if (loading) {
        return (
            <Container>
                <Wrapper>
                    <LoadingState />
                </Wrapper>
            </Container>
        );
    }

    if (!voucher) {
        return (
            <Container>
                <Wrapper>
                    <div className={`${styles.page} ${styles.rtl}`}>
                        <p className={styles.subtitle}>سند یافت نشد.</p>
                        <Link href="/accounting/vouchers" className={styles.secondaryBtn} style={{ display: 'inline-block' }}>
                            بازگشت به اسناد
                        </Link>
                    </div>
                </Wrapper>
            </Container>
        );
    }

    return (
        <Container>
            <Wrapper>
                <div className={`${styles.page} ${styles.rtl}`}>
                    <header className={styles.header}>
                        <div>
                            <div className={styles.titleRow}>
                                <h1 className={styles.mainTitle}>
                                    سند {voucher.number ? `شماره ${toFarsiNumber(voucher.number)}` : 'پیش‌نویس'}
                                </h1>
                                <span className={STATUS_BADGE[voucher.status] || ''}>
                                    {VOUCHER_STATUS_LABELS[voucher.status as AccountingVoucherStatus]}
                                </span>
                                <HelpIcon topic="voucherDetail" />
                            </div>
                            <p className={styles.subtitle}>{voucher.description || 'بدون شرح'}</p>
                        </div>
                        <div className={styles.headerActions}>
                            {voucher.status === 'draft' && (
                                <>
                                    <button
                                        type="button"
                                        className={styles.secondaryBtn}
                                        onClick={() => setEditing((prev) => !prev)}
                                    >
                                        {editing ? 'بستن فرم ویرایش' : 'ویرایش'}
                                    </button>
                                    <button type="button" className={styles.primaryBtn} disabled={busy} onClick={post}>
                                        ثبت قطعی
                                    </button>
                                    <button type="button" className={styles.dangerBtn} disabled={busy} onClick={remove}>
                                        حذف
                                    </button>
                                </>
                            )}
                            {voucher.status === 'posted' && (
                                <button type="button" className={styles.secondaryBtn} disabled={busy} onClick={reverse}>
                                    صدور سند معکوس
                                </button>
                            )}
                        </div>
                    </header>

                    <AccountingGuide guide={ACCOUNTING_GUIDES.voucherDetail} />

                    <AccountingContextBar context={context} />

                    {voucher.status === 'reversed' && voucher.reversedByVoucherId && (
                        <p className={styles.subtitle} style={{ marginBottom: '0.8rem' }}>
                            ⓘ این سند معکوس شده است —{' '}
                            <Link href={`/accounting/vouchers/${voucher.reversedByVoucherId}`} className={styles.linkBtn}>
                                مشاهده سند معکوس
                            </Link>
                        </p>
                    )}
                    {voucher.status === 'posted' && voucher.reversesVoucherId && (
                        <p className={styles.subtitle} style={{ marginBottom: '0.8rem' }}>
                            ⓘ این سند، معکوسِ{' '}
                            <Link href={`/accounting/vouchers/${voucher.reversesVoucherId}`} className={styles.linkBtn}>
                                سند اصلی
                            </Link>{' '}
                            است.
                        </p>
                    )}

                    {editing && voucher.status === 'draft' ? (
                        <VoucherForm
                            accounts={accounts}
                            initial={{ date: voucher.date, description: voucher.description || '', entries: voucher.entries }}
                            submitting={busy}
                            submitLabel="ذخیره تغییرات"
                            onSubmit={handleUpdate}
                            onCancel={() => setEditing(false)}
                        />
                    ) : (
                        <>
                            <div className={styles.tableWrapper} style={{ marginTop: 0 }}>
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>کد حساب</th>
                                            <th>نام حساب</th>
                                            <th>شرح</th>
                                            <th>بدهکار</th>
                                            <th>بستانکار</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {voucher.entries.map((entry, index) => (
                                            <tr key={index}>
                                                <td className={styles.num}>{entry.accountCode}</td>
                                                <td>{entry.accountTitle}</td>
                                                <td>{entry.description || '—'}</td>
                                                <td className={`${styles.num} ${styles.amountDebit}`}>
                                                    {entry.debit ? toFarsiNumber(MoneySeparator(entry.debit)) : '—'}
                                                </td>
                                                <td className={`${styles.num} ${styles.amountCredit}`}>
                                                    {entry.credit ? toFarsiNumber(MoneySeparator(entry.credit)) : '—'}
                                                </td>
                                            </tr>
                                        ))}
                                        <tr className={styles.tableFooterRow}>
                                            <td colSpan={3}>جمع کل (ریال)</td>
                                            <td className={styles.num}>
                                                {toFarsiNumber(MoneySeparator(voucher.totalDebit))}
                                            </td>
                                            <td className={styles.num}>
                                                {toFarsiNumber(MoneySeparator(voucher.totalCredit))}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <p className={styles.subtitle} style={{ marginTop: '0.7rem' }}>
                                تاریخ سند: {voucher.dateJalali || '—'}
                                {voucher.postedAt ? ' — تاریخ ثبت قطعی: ' + toFarsiNumber(new Date(voucher.postedAt).toLocaleDateString('fa-IR')) : ''}
                            </p>
                            {!voucher.number && (
                                <p className={styles.subtitle} style={{ marginTop: '0.3rem' }}>
                                    ⓘ این سند پیش‌نویس است و در گزارش‌های مالی اثری ندارد؛ با «ثبت قطعی» شماره می‌گیرد.
                                </p>
                            )}
                        </>
                    )}

                    {busy && (
                        <p className={styles.subtitle} style={{ marginTop: '0.7rem' }}>
                            در حال پردازش...
                        </p>
                    )}
                </div>
            </Wrapper>
        </Container>
    );
}
