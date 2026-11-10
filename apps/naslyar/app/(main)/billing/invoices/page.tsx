'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import hubStyles from '../Billing.module.scss';
import styles from './InvoicesList.module.scss';
import { Container, Wrapper } from '@/app/(main)/layout';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { ErrorToaster, MoneySeparator, SuccessToaster, toFarsiNumber } from '@my-workspace/utils';
import { LoadingState } from '@my-workspace/components';
import TableEmptyState from '@/app/(main)/components/TableEmptyState';
import TableTheme from '@my-workspace/components/src/TableTheme/TableTheme';
import { TbFileInvoice } from 'react-icons/tb';
import InvoicesFilterBar from './InvoicesFilterBar';
import { formatInvoiceType } from './invoice-labels';
import {
    applyInvoiceFilters,
    DEFAULT_INVOICE_FILTERS,
    InvoiceFilterRow,
    InvoiceListFilters,
    InvoiceUserLookup,
} from './invoices-filter.utils';
import {
    AdminUserListItem,
    fetchAdminUserById,
    getAdminUserDisplayParts,
} from '@/app/(main)/users/user-list-api';

const STATUS_LABEL: Record<string, string> = {
    pending: 'در انتظار پرداخت',
    paid: 'پرداخت شده',
    failed: 'ناموفق',
    canceled: 'لغو شده',
    expired: 'منقضی شده',
    awaiting_receipt: 'منتظر رسید',
    awaiting_review: 'در انتظار بررسی',
    rejected: 'رد شده',
};

function statusClass(status: string) {
    if (status === 'paid') return styles.badgePaid;
    if (status === 'pending' || status === 'awaiting_receipt') return styles.badgePending;
    if (status === 'failed' || status === 'rejected' || status === 'expired' || status === 'canceled') return styles.badgeFailed;
    return '';
}

export default function InvoicesPage() {
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const [allInvoices, setAllInvoices] = useState<InvoiceFilterRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState<InvoiceListFilters>(DEFAULT_INVOICE_FILTERS);
    const [userMap, setUserMap] = useState<Record<string, AdminUserListItem>>({});
    const userMapRef = useRef(userMap);
    userMapRef.current = userMap;

    const hoshetonWalletBase = process.env.NEXT_PUBLIC_HOSHETON_STUDIO_URL || '';

    const load = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const res = await axios.get(`${baseUrl}/api/billing/invoices`, {
                headers: { authorization: `Bearer ${token}` },
            });
            if (res.data.statusCode === 200) {
                setAllInvoices(res.data.data || []);
            }
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, [baseUrl, token]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        if (!token || allInvoices.length === 0) return;
        const ids = [...new Set(allInvoices.map(inv => inv.userId).filter(Boolean))];
        const missing = ids.filter(id => !userMapRef.current[id]);
        if (missing.length === 0) return;

        let cancelled = false;
        (async () => {
            const results = await Promise.all(
                missing.map(async id => {
                    const user = await fetchAdminUserById(id);
                    return user ? ([id, user] as const) : null;
                }),
            );
            if (cancelled) return;
            setUserMap(prev => {
                const next = { ...prev };
                for (const row of results) {
                    if (row) next[row[0]] = row[1];
                }
                return next;
            });
        })();

        return () => {
            cancelled = true;
        };
    }, [allInvoices, token]);

    useEffect(() => {
        const filterId = filters.userId.trim();
        if (!token || !filterId || userMapRef.current[filterId]) return;
        let cancelled = false;
        (async () => {
            const user = await fetchAdminUserById(filterId);
            if (!cancelled && user) {
                setUserMap(prev => ({ ...prev, [filterId]: user }));
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [filters.userId, token]);

    const userLookup: InvoiceUserLookup = useMemo(() => {
        const lookup: InvoiceUserLookup = {};
        for (const inv of allInvoices) {
            lookup[inv.userId] = getAdminUserDisplayParts(userMap[inv.userId]);
        }
        return lookup;
    }, [allInvoices, userMap]);

    const filterSelectedUser = filters.userId.trim()
        ? userMap[filters.userId.trim()] ?? null
        : null;

    const filteredInvoices = useMemo(
        () => applyInvoiceFilters(allInvoices, filters, userLookup),
        [allInvoices, filters, userLookup],
    );

    const copyPayLink = async (invoiceId: string) => {
        const link = hoshetonWalletBase
            ? `${hoshetonWalletBase.replace(/\/$/, '')}/developers/wallet?payInvoice=${invoiceId}`
            : `/developers/wallet?payInvoice=${invoiceId}`;
        try {
            await navigator.clipboard.writeText(link);
            SuccessToaster({ message: 'لینک پرداخت کپی شد' });
        } catch {
            alert(link);
        }
    };

    const deleteInvoice = async (inv: InvoiceFilterRow) => {
        if (!token) return;
        if (inv.status === 'paid') {
            alert('فاکتور پرداخت‌شده قابل حذف نیست.');
            return;
        }
        if (!confirm('این فاکتور حذف شود؟')) return;
        try {
            await axios.delete(`${baseUrl}/api/billing/invoices/${inv._id}`, {
                headers: { authorization: `Bearer ${token}` },
            });
            SuccessToaster({ message: 'فاکتور حذف شد' });
            await load();
        } catch (e) {
            ErrorToaster(e);
        }
    };

    const emptyFiltered = !loading && allInvoices.length > 0 && filteredInvoices.length === 0;
    const emptyAll = !loading && allInvoices.length === 0;

    return (
        <Container>
            <Wrapper>
                <div className={`${styles.page} ${styles.rtl}`}>
                    <header className={styles.header}>
                        <div>
                            <h1 className={styles.mainTitle}>فاکتورها</h1>
                            <p className={styles.subtitle}>
                                نمایش کامل فاکتورهای سیستم — فیلتر اختیاری در پنل زیر.
                            </p>
                        </div>
                        <div className={styles.headerActions}>
                            <button type="button" className={styles.secondaryBtn} onClick={load}>
                                بروزرسانی
                            </button>
                            <Link href="/billing/invoices/add" className={styles.primaryBtn}>
                                + فاکتور جدید
                            </Link>
                            <Link href="/billing/invoices/credit" className={styles.secondaryBtn}>
                                شارژ کیف پول
                            </Link>
                        </div>
                    </header>

                    <InvoicesFilterBar
                        filters={filters}
                        onChange={setFilters}
                        filteredCount={filteredInvoices.length}
                        totalCount={allInvoices.length}
                        filterSelectedUser={filterSelectedUser}
                    />

                    {loading ? (
                        <LoadingState />
                    ) : emptyAll ? (
                        <TableEmptyState
                            icon={<TbFileInvoice size={28} />}
                            title="فاکتوری ثبت نشده"
                            description="برای صدور فاکتور و ارسال لینک پرداخت به کاربر، یک فاکتور جدید بسازید."
                            hint="فاکتورهای شارژ کیف پول و پرداخت درگاه نیز در این لیست دیده می‌شوند."
                            primaryLabel="صدور فاکتور جدید"
                            primaryHref="/billing/invoices/add"
                            secondaryLabel="بروزرسانی لیست"
                            onSecondaryClick={load}
                        />
                    ) : emptyFiltered ? (
                        <TableEmptyState
                            icon={<TbFileInvoice size={28} />}
                            title="نتیجه‌ای با این فیلتر نیست"
                            description="فیلترها را تغییر دهید یا همه را پاک کنید تا کل فاکتورها را ببینید."
                            primaryLabel="پاک کردن فیلترها"
                            onPrimaryClick={() => setFilters({ ...DEFAULT_INVOICE_FILTERS })}
                            secondaryLabel="بروزرسانی از سرور"
                            onSecondaryClick={load}
                        />
                    ) : (
                        <TableTheme>
                            <table className={hubStyles.table}>
                                <thead>
                                    <tr>
                                        <th>نام کاربر</th>
                                        <th>ایمیل</th>
                                        <th>نوع</th>
                                        <th>مبلغ</th>
                                        <th>وضعیت</th>
                                        <th>تاریخ</th>
                                        <th />
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredInvoices.map(inv => {
                                        const { name, email } = getAdminUserDisplayParts(userMap[inv.userId]);
                                        return (
                                            <tr key={inv._id}>
                                                <td className={styles.userName}>{name}</td>
                                                <td className={styles.userEmail}>
                                                    {email || '—'}
                                                </td>
                                                <td>{formatInvoiceType(inv.type)}</td>
                                                <td>{toFarsiNumber(MoneySeparator(Number(inv.amount)))}</td>
                                                <td className={statusClass(inv.status)}>
                                                    {STATUS_LABEL[inv.status] || inv.status}
                                                </td>
                                                <td>
                                                    {inv.createdAt
                                                        ? new Intl.DateTimeFormat('fa-IR', {
                                                            year: 'numeric',
                                                            month: '2-digit',
                                                            day: '2-digit',
                                                        }).format(new Date(inv.createdAt))
                                                        : '—'}
                                                </td>
                                                <td>
                                                    <div className={styles.rowActions}>
                                                        {inv.status === 'pending' && inv.metadata?.purpose === 'admin_invoice' ? (
                                                            <button
                                                                type="button"
                                                                className={hubStyles.secondaryBtn}
                                                                style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                                                                onClick={() => copyPayLink(inv._id)}
                                                            >
                                                                کپی لینک
                                                            </button>
                                                        ) : null}
                                                        {inv.status !== 'paid' ? (
                                                            <button
                                                                type="button"
                                                                className={styles.deleteBtn}
                                                                onClick={() => void deleteInvoice(inv)}
                                                            >
                                                                حذف
                                                            </button>
                                                        ) : null}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </TableTheme>
                    )}
                </div>
            </Wrapper>
        </Container>
    );
}
