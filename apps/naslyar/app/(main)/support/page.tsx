'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './Support.module.scss';
import { Container, Wrapper } from "@/app/(main)/layout";
import { ConvertDateToCalendarString, ErrorToaster, SuccessToaster, toFarsiNumber } from "@my-workspace/utils";
import { Pagination, LoadingState } from "@my-workspace/components";
import TableEmptyState from '@/app/(main)/components/TableEmptyState';
import TableTheme from "@my-workspace/components/src/TableTheme/TableTheme";
import { useAppStore } from "@/app/zustand/store/useAppStore";
import { useAuthStore } from "@/app/zustand/store/authStore";
import SupportGuide from './components/SupportGuide';
import TicketFiltersModal from './components/TicketFiltersModal';
import TicketRowMenu from './components/TicketRowMenu';
import TicketEditModal from './components/TicketEditModal';
import {
    SUPPORT_PRIORITY_LABELS,
    SUPPORT_STATUS_LABELS,
    SupportCategory,
    SupportTicketFilters,
    SupportTicketItem,
    fetchAdminTickets,
    listCategories,
    updateTicketStatus,
} from './lib/support-api';

const EMPTY_FILTERS: SupportTicketFilters = { search: '', status: '', priority: '', categoryId: '', startDate: '', endDate: '' };

const SupportAdminList: React.FC = () => {
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const router = useRouter();

    const [tickets, setTickets] = useState<SupportTicketItem[]>([]);
    const [categories, setCategories] = useState<SupportCategory[]>([]);
    const [loading, setLoading] = useState(true);

    // فیلترها فقط از پنجره‌ی ModalHelper اعمال می‌شوند
    const [filters, setFilters] = useState<SupportTicketFilters>({ ...EMPTY_FILTERS });
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [editTicket, setEditTicket] = useState<SupportTicketItem | null>(null);
    const [editOpen, setEditOpen] = useState(false);

    const [pagination, setPagination] = useState({
        itemPerPage: 10,
        currentPage: 1,
        totalItems: 0
    });

    const loadCategories = useCallback(async () => {
        if (!token) return;
        try {
            setCategories(await listCategories(baseUrl, token));
        } catch (err) {
            ErrorToaster(err);
        }
    }, [baseUrl, token]);

    const fetchTickets = useCallback(async (page: number, limit: number, activeFilters: SupportTicketFilters) => {
        if (!token) return;
        try {
            setLoading(true);
            const data = await fetchAdminTickets(baseUrl, token, activeFilters, page, limit);
            setTickets(data.items || []);
            setPagination(prev => ({
                ...prev,
                totalItems: data.total || 0,
                currentPage: page
            }));
        } catch (err) {
            ErrorToaster(err);
        } finally {
            setLoading(false);
        }
    }, [baseUrl, token]);

    useEffect(() => {
        fetchTickets(pagination.currentPage, pagination.itemPerPage, filters);
    }, [pagination.currentPage, pagination.itemPerPage, filters, fetchTickets]);

    useEffect(() => {
        loadCategories();
    }, [loadCategories]);

    const activeFilterEntries = useMemo(
        () => Object.entries(filters).filter(([, value]) => Boolean(value)),
        [filters]
    );

    const applyFilters = (next: SupportTicketFilters) => {
        setFilters(next);
        setPagination(prev => ({ ...prev, currentPage: 1 }));
    };

    const clearFilters = () => applyFilters({ ...EMPTY_FILTERS });

    const handleStatusChange = async (ticket: SupportTicketItem, status: string) => {
        try {
            const updated = await updateTicketStatus(baseUrl, token, ticket._id, status);
            setTickets(prev => prev.map(t => (t._id === ticket._id ? { ...t, ...updated } : t)));
            SuccessToaster(`وضعیت تیکت به «${SUPPORT_STATUS_LABELS[status] || status}» تغییر یافت.`);
        } catch (error) {
            ErrorToaster(error);
        }
    };

    const openEdit = (ticket: SupportTicketItem) => {
        setEditTicket(ticket);
        setEditOpen(true);
    };

    const getStatusBadge = (st: string) => {
        switch (st) {
            case 'open': return <span className={`${styles.statusBadge} ${styles.approved}`}>{SUPPORT_STATUS_LABELS[st]}</span>;
            case 'pending': return <span className={`${styles.statusBadge} ${styles.pending}`}>{SUPPORT_STATUS_LABELS[st]}</span>;
            case 'resolved': return <span className={`${styles.statusBadge} ${styles.resolvedBadge}`}>{SUPPORT_STATUS_LABELS[st]}</span>;
            case 'closed': return <span className={`${styles.statusBadge} ${styles.btnDelete}`}>{SUPPORT_STATUS_LABELS[st]}</span>;
            default: return <span>{st}</span>;
        }
    };

    return (
        <Container>
            <Wrapper>
                <div className={styles.rtl}>
                    <header className={styles.header}>
                        <div>
                            <h1 className={styles.mainTitle}>مرکز کنترل و پشتیبانی کاربران</h1>
                            <p className={styles.subtitle}>
                                تیکت‌های دریافتی، ردیابی بازه‌های زمانی و پاسخگویی زنده به زبان‌آموزان
                            </p>
                        </div>
                        <div className={styles.headerActions}>
                            <Link href="/support/categories" className={styles.secondaryBtn}>
                                🗂️ دسته‌بندی‌ها
                            </Link>
                            <button
                                type="button"
                                className={styles.filtersBtn}
                                onClick={() => setFiltersOpen(true)}
                            >
                                فیلترها
                                {activeFilterEntries.length ? (
                                    <span className={styles.filterCount}>{toFarsiNumber(activeFilterEntries.length)}</span>
                                ) : null}
                            </button>
                        </div>
                    </header>

                    <SupportGuide variant="tickets" />

                    {/* خلاصه‌ی فیلترهای فعال — قابل حذف تک‌تک */}
                    {activeFilterEntries.length ? (
                        <div className={styles.activeFiltersRow}>
                            <span className={styles.activeFiltersLabel}>فیلترهای فعال:</span>
                            {activeFilterEntries.map(([key, value]) => {
                                let display = value as string;
                                if (key === 'status') display = SUPPORT_STATUS_LABELS[value as string] || display;
                                if (key === 'priority') display = SUPPORT_PRIORITY_LABELS[value as string] || display;
                                if (key === 'categoryId') display = categories.find(c => c._id === value)?.title || 'دسته';
                                if (key === 'startDate') display = `از ${value}`;
                                if (key === 'endDate') display = `تا ${value}`;
                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        className={styles.filterChip}
                                        title="حذف این فیلتر"
                                        onClick={() => applyFilters({ ...filters, [key]: '' })}
                                    >
                                        {display} ✕
                                    </button>
                                );
                            })}
                            <button type="button" className={styles.clearFiltersBtn} onClick={clearFilters}>
                                پاک‌سازی همه
                            </button>
                        </div>
                    ) : null}

                    {/* جدول داده‌ها */}
                    <div style={{ marginTop: '20px' }}>
                        {loading ? (
                            <LoadingState />
                        ) : tickets.length === 0 ? (
                            <TableEmptyState
                                icon={<span style={{ fontSize: '2rem' }}>🎫</span>}
                                title={activeFilterEntries.length ? 'تیکتی با این فیلترها یافت نشد' : 'هنوز تیکتی ثبت نشده'}
                                description={
                                    activeFilterEntries.length
                                        ? 'فیلترها را تغییر دهید یا برای دیدن همه تیکت‌ها، فیلترها را پاک کنید.'
                                        : 'وقتی کاربران تیکت پشتیبانی ثبت کنند، اینجا نمایش داده می‌شوند.'
                                }
                                hint={activeFilterEntries.length ? 'می‌توانید جستجو، وضعیت یا بازه تاریخ را عوض کنید.' : undefined}
                                {...(activeFilterEntries.length
                                    ? {
                                          secondaryLabel: 'پاک کردن فیلترها',
                                          onSecondaryClick: clearFilters,
                                      }
                                    : {})}
                            />
                        ) : (
                            <TableTheme>
                                <table className={styles.customTable}>
                                    <thead>
                                    <tr>
                                        <th>عنوان تیکت</th>
                                        <th>دسته‌بندی</th>
                                        <th>اولویت</th>
                                        <th>وضعیت</th>
                                        <th>تاریخ ایجاد</th>
                                        <th>عملیات</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {tickets.map((ticket) => (
                                        <tr key={ticket._id}>
                                            <td className={styles.wordTextMain}>{ticket.title}</td>
                                            <td>
                                                {ticket.categoryId ? (
                                                    <span className={styles.categoryChip}>
                                                        <span className={styles.categoryDot} style={{ backgroundColor: ticket.categoryId.color }} />
                                                        {ticket.categoryId.title}
                                                    </span>
                                                ) : (
                                                    <span className={styles.mutedCell}>—</span>
                                                )}
                                            </td>
                                            <td>
                                                <span className={ticket.priority === 'high' ? styles.priorityHigh : ''}>
                                                    {SUPPORT_PRIORITY_LABELS[ticket.priority] || ticket.priority}
                                                </span>
                                            </td>
                                            <td>{getStatusBadge(ticket.status)}</td>
                                            <td className={styles.dateCell}>{toFarsiNumber(ConvertDateToCalendarString(ticket.createdAt))}</td>
                                            <td>
                                                <TicketRowMenu
                                                    rowId={ticket._id}
                                                    items={[
                                                        { label: '💬 ورود به اتاق چت', onClick: () => router.push(`/support/${ticket._id}`) },
                                                        { label: '⚙️ ویرایش وضعیت و دسته‌بندی', onClick: () => openEdit(ticket) },
                                                        ...(ticket.status !== 'closed'
                                                            ? [{ label: '🔒 بستن سریع تیکت', onClick: () => void handleStatusChange(ticket, 'closed') }]
                                                            : []),
                                                    ]}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </TableTheme>
                        )}

                        <Pagination
                            itemPerPage={pagination.itemPerPage}
                            currentPage={pagination.currentPage}
                            totalItems={pagination.totalItems}
                            setRowsPerPage={(num) => setPagination(prev => ({ ...prev, itemPerPage: num, currentPage: 1 }))}
                            paginate={(page) => setPagination(prev => ({ ...prev, currentPage: page }))}
                            rtl={true}
                        />
                    </div>
                </div>
            </Wrapper>

            <TicketFiltersModal
                open={filtersOpen}
                onClose={() => setFiltersOpen(false)}
                categories={categories}
                filters={filters}
                onApply={applyFilters}
            />

            <TicketEditModal
                open={editOpen}
                onClose={() => setEditOpen(false)}
                categories={categories}
                ticket={editTicket}
                baseUrl={baseUrl}
                token={token}
                onSaved={(updated) => {
                    setTickets(prev => prev.map(t => (t._id === updated._id ? { ...t, ...updated } : t)));
                    loadCategories();
                }}
            />
        </Container>
    );
};

export default SupportAdminList;
