'use client';

import React, { useEffect, useState } from 'react';
import styles from './SupportPage.module.scss';
import { SupportEmptyHint } from './components/SupportEmptyHint';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { notifyError } from '@/app/lib/errors';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { promptGuestLogin } from '@/app/components/guest/guestAccess';
import { supportApi, SupportTicket } from '@/app/(developers)/support/lib/support-api';
import { usePageLoading } from '@/app/components/PageTransition';
import { isRtlLanguage } from '@/app/lib/i18n/config';
import { formatAppNumber } from '@/app/lib/i18n/formatLocaleNumber';

export default function TicketList() {
    const { t, i18n } = useTranslation('support');
    const { t: tc } = useTranslation('common');
    const router = useRouter();
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [loading, setLoading] = useState(true);
    usePageLoading(loading);
    const { token } = useAuthStore();
    const rtl = isRtlLanguage(i18n.language);
    const dateLocale = i18n.language === 'ar' ? 'ar' : rtl ? 'fa-IR' : i18n.language;

    useEffect(() => {
        if (!token) {
            setLoading(false);
            return;
        }

        async function fetchUserTickets() {
            try {
                setLoading(true);
                const data = await supportApi.listTickets({ page: 1, limit: 20 });
                setTickets(data.items || []);
            } catch (error) {
                notifyError(error);
            } finally {
                setLoading(false);
            }
        }

        fetchUserTickets();
    }, [token]);

    const getStatusDetails = (status: string) => {
        switch (status) {
            case 'open':
                return { text: t('open'), className: styles.statusPending };
            case 'pending':
                return { text: t('reviewing'), className: styles.statusPending };
            case 'resolved':
                return { text: t('resolved'), className: styles.statusSuccess };
            case 'closed':
                return { text: t('closed_status'), className: styles.statusClosed };
            default:
                return { text: status, className: styles.statusClosed };
        }
    };

    const formatTicketDate = (dateString?: string) => {
        if (!dateString) return tc('empty_dash');
        return new Date(dateString).toLocaleDateString(dateLocale, {
            month: 'long',
            day: 'numeric',
        });
    };

    const priorityLabel = (priority?: string) => {
        if (priority === 'high') return `⚠️ ${t('urgent')}`;
        if (priority === 'low') return t('low');
        return t('medium');
    };

    return (
        <div className={`${styles.container} ${styles.listPage} ${!loading && tickets.length === 0 ? styles.listEmpty : ''} ${rtl ? styles.rtl : ''}`}>
            <header className={styles.header}>
                <h1 className={styles.mainTitle}>{t('title')}</h1>
                <p className={styles.subtitle}>{t('subtitle')}</p>
            </header>

            <div className={styles.layoutGrid}>
                <section>
                    <div>
                        <h2 className={styles.sectionTitle}>{t('recent')}</h2>
                        <div className={styles.sectionHeader}>
                            <h2 className={styles.subTitle}>
                                {loading
                                    ? t('loading_tickets')
                                    : t('ticket_count', { count: formatAppNumber(tickets.length, i18n.language) })}
                            </h2>
                            <button
                                className={styles.addKeyBtn}
                                onClick={() => (token ? router.push('/support/tickets/new') : promptGuestLogin('/support/tickets/new'))}
                            >
                                {t('add_ticket')}
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className={styles.loadingWrapper}>
                            <p>{t('loading_data')}</p>
                        </div>
                    ) : (
                        <>
                        {/* موبایل: حالت خالی بیرون از جدول، وسط ارتفاع صفحه */}
                        {tickets.length === 0 ? (
                            <div className={styles.mobileEmpty}>
                                <SupportEmptyHint />
                            </div>
                        ) : null}
                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>{t('id')}</th>
                                        <th>{t('subject')}</th>
                                        <th>{t('priority')}</th>
                                        <th>{t('last_update')}</th>
                                        <th>{tc('status')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tickets.length === 0 ? (
                                        <tr>
                                            <td colSpan={5}>
                                                <SupportEmptyHint />
                                            </td>
                                        </tr>
                                    ) : (
                                        tickets.map((ticket) => {
                                            const statusInfo = getStatusDetails(ticket.status);
                                            return (
                                                <tr
                                                    key={ticket._id}
                                                    className={styles.ticketRow}
                                                    onClick={() => router.push(`/support/tickets/${ticket._id}`)}
                                                    style={{ cursor: 'pointer' }}
                                                >
                                                    <td data-label={t('id')} className={styles.codeText}>
                                                        {ticket._id.substring(ticket._id.length - 6).toUpperCase()}
                                                    </td>
                                                    <td data-label={t('subject')} className={styles.ticketSubject}>
                                                        {ticket.title}
                                                    </td>
                                                    <td data-label={t('priority')}>
                                                        {priorityLabel(ticket.priority)}
                                                    </td>
                                                    <td data-label={t('last_update')}>
                                                        {formatTicketDate(ticket.updatedAt)}
                                                    </td>
                                                    <td data-label={tc('status')}>
                                                        <span className={statusInfo.className}>
                                                            {statusInfo.text}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                        </>
                    )}

                    <div className={styles.infoMiniCard}>
                        <div className={styles.infoIcon}>💡</div>
                        <p>{t('studio_hint')}</p>
                    </div>
                </section>
            </div>
        </div>
    );
}
