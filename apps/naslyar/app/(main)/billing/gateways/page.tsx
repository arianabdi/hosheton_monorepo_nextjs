'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import styles from './GatewaysList.module.scss';
import { Container, Wrapper } from '@/app/(main)/layout';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { LoadingState, Pagination } from '@my-workspace/components';
import { toFarsiNumber } from '@my-workspace/utils';
import { GATEWAY_PROVIDER_DEFINITIONS } from './gateway-config.definitions';
import GatewaysStatsBar from './GatewaysStatsBar';
import GatewaysFilterBar from './GatewaysFilterBar';
import { Gateway } from './gateways.types';
import {
    applyGatewayFilters,
    DEFAULT_GATEWAY_FILTERS,
    GatewayListFilters,
} from './gateways-filter.utils';
import ExpandableSection from '../settings/ExpandableSection';

const PROVIDER_LABEL: Record<string, string> = Object.fromEntries(
    Object.values(GATEWAY_PROVIDER_DEFINITIONS).map((d) => [d.providerType, d.label]),
);

function GatewayLogo({ gateway }: { gateway: Gateway }) {
    if (gateway.logoUrl) {
        return <img src={gateway.logoUrl} alt="" width={44} height={44} />;
    }
    if (gateway.logoSvg) {
        return <span dangerouslySetInnerHTML={{ __html: gateway.logoSvg }} />;
    }
    return <span style={{ fontSize: '0.7rem', fontWeight: 700 }}>{gateway.slug.slice(0, 3).toUpperCase()}</span>;
}

function normalizeGatewayList(payload: unknown): Gateway[] {
    if (Array.isArray(payload)) {
        return payload as Gateway[];
    }
    if (payload && typeof payload === 'object' && Array.isArray((payload as { gateways?: Gateway[] }).gateways)) {
        return (payload as { gateways: Gateway[] }).gateways;
    }
    return [];
}

export default function GatewaysListPage() {
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const [allGateways, setAllGateways] = useState<Gateway[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState<GatewayListFilters>(DEFAULT_GATEWAY_FILTERS);
    const [pagination, setPagination] = useState({
        itemPerPage: 6,
        currentPage: 1,
    });
    const itemPerPageRef = useRef(pagination.itemPerPage);
    itemPerPageRef.current = pagination.itemPerPage;

    const refreshGateways = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const res = await axios.get(`${baseUrl}/api/billing/gateways`, {
                headers: { authorization: `Bearer ${token}` },
            });
            if (res.data.statusCode === 200) {
                setAllGateways(normalizeGatewayList(res.data.data));
            }
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, [baseUrl, token]);

    useEffect(() => {
        if (token) {
            refreshGateways();
        }
    }, [token, refreshGateways]);

    useEffect(() => {
        setPagination((prev) => ({ ...prev, currentPage: 1 }));
    }, [filters]);

    const filteredGateways = useMemo(
        () => applyGatewayFilters(allGateways, filters),
        [allGateways, filters],
    );

    const gateways = useMemo(() => {
        const limit = pagination.itemPerPage;
        const start = (pagination.currentPage - 1) * limit;
        return filteredGateways.slice(start, start + limit);
    }, [filteredGateways, pagination.currentPage, pagination.itemPerPage]);

    const summary = useMemo(
        () => ({
            total: allGateways.length,
            active: allGateways.filter((g) => g.isActive).length,
            checkout: allGateways.filter((g) => g.showInCheckout).length,
            card2card: allGateways.filter((g) => g.providerType === 'card2card').length,
        }),
        [allGateways],
    );

    const toggleField = async (id: string, field: 'isActive' | 'showInCheckout', value: boolean) => {
        try {
            await axios.put(
                `${baseUrl}/api/billing/gateways/${id}`,
                { [field]: value },
                { headers: { authorization: `Bearer ${token}` } },
            );
            SuccessToaster({ message: 'ذخیره شد' });
            await refreshGateways();
        } catch (e) {
            ErrorToaster(e);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`حذف درگاه «${name}»؟`)) return;
        try {
            await axios.delete(`${baseUrl}/api/billing/gateways/${id}`, {
                headers: { authorization: `Bearer ${token}` },
            });
            SuccessToaster({ message: 'درگاه حذف شد' });
            await refreshGateways();
        } catch (e) {
            ErrorToaster(e);
        }
    };

    const goToPage = (page: number) => {
        const totalPages = Math.max(1, Math.ceil(filteredGateways.length / itemPerPageRef.current));
        const safePage = Math.min(Math.max(1, page), totalPages);
        setPagination((prev) => ({ ...prev, currentPage: safePage }));
    };

    return (
        <Container>
            <Wrapper>
                <div className={`${styles.container} ${styles.rtl}`}>
                    <header className={styles.header}>
                        <div>
                            <h1 className={styles.mainTitle}>درگاه‌های پرداخت</h1>
                            <p className={styles.subtitle}>
                                مدیریت درگاه‌های آنلاین، اقساطی و کارت‌به‌کارت برای checkout و شارژ کیف پول در
                                اپلیکیشن‌های متصل به Naslyar.
                            </p>
                        </div>
                        <Link href="/billing/gateways/add" className={styles.primaryBtn}>
                            + درگاه جدید
                        </Link>
                    </header>

                    <GatewaysStatsBar stats={summary} pageScoped={false} />

                    <div className={styles.noticeWrap}>
                        <ExpandableSection
                            title="راهنمای انواع درگاه و تنظیمات"
                            subtitle="انواع درگاه، وضعیت فعال، ترتیب نمایش و آدرس بازگشت"
                            defaultOpen
                            badge={<span className={styles.noticeBadge}>مرجع: همین صفحه</span>}
                        >
                            <div className={styles.noticeGrid}>
                                <div className={styles.noticeCard}>
                                    <div className={styles.noticeCardHead}>
                                        <span className={styles.stepNumber}>۱</span>
                                        <h3>انواع درگاه</h3>
                                    </div>
                                    <p>
                                        <strong>مستقیم (direct):</strong> پرداخت آنلاین بانکی (زرین‌پال، سپ، …).{' '}
                                        <strong>اقساطی (installment):</strong> اسنپ‌پی، دیجی‌پی و مشابه.{' '}
                                        <strong>کارت‌به‌کارت (<code>card2card</code>):</strong> کاربر به شماره کارت واریز
                                        می‌کند، رسید آپلود می‌شود و در «پرداخت‌های دستی» تأیید می‌شود.
                                    </p>
                                </div>

                                <div className={styles.noticeCard}>
                                    <div className={styles.noticeCardHead}>
                                        <span className={styles.stepNumber}>۲</span>
                                        <h3>فعال و checkout</h3>
                                    </div>
                                    <p>
                                        <strong>فعال:</strong> فقط درگاه‌های روشن در API برای شروع پرداخت جدید قابل
                                        استفاده‌اند؛ خاموش کردن درگاه رکورد را حذف نمی‌کند.{' '}
                                        <strong>نمایش در checkout:</strong> تعیین می‌کند در{' '}
                                        <code>GET /api/billing/gateways/public</code> و صفحه کیف پول به کاربر دیده شود یا
                                        نه — می‌توانید درگاه را فعال نگه دارید ولی موقتاً از checkout پنهان کنید.
                                    </p>
                                </div>

                                <div className={styles.noticeCard}>
                                    <div className={styles.noticeCardHead}>
                                        <span className={styles.stepNumber}>۳</span>
                                        <h3>ترتیب (order)</h3>
                                    </div>
                                    <p>
                                        عدد کوچک‌تر یعنی بالاتر در لیست checkout. درگاه‌ها بر اساس <strong>order</strong>{' '}
                                        مرتب می‌شوند؛ برای اولویت دادن به کارت‌به‌کارت یا زرین‌پال، order را در فرم
                                        ویرایش تنظیم کنید.
                                    </p>
                                </div>

                                <div className={styles.noticeCard}>
                                    <div className={styles.noticeCardHead}>
                                        <span className={styles.stepNumber}>۴</span>
                                        <h3>آدرس بازگشت به UI</h3>
                                    </div>
                                    <p>
                                        آدرس فرانت‌اند و callback هر کسب‌وکار در{' '}
                                        <Link href="/billing/settings">تنظیمات مالی → آدرس‌های بازگشت درگاه</Link>{' '}
                                        تنظیم می‌شود، نه روی خود درگاه. برای هوشتون استودیو مثلاً
                                        {' '}<code>http://localhost:3001</code> و API{' '}
                                        <code>http://localhost:3379</code>.
                                    </p>
                                </div>
                            </div>

                            <div className={styles.noticeFooter}>
                                <p>
                                    کامپوننت‌های این بخش:{' '}
                                    <code>apps/naslyar/app/(main)/billing/gateways/page.tsx</code> (لیست)،{' '}
                                    <code>GatewayForm.tsx</code> (ایجاد/ویرایش)،{' '}
                                    <code>gateway-config.definitions.ts</code> (فیلدهای هر provider). پس از افزودن seed
                                    کارت‌به‌کارت، API را یک‌بار ری‌استارت کنید تا رکورد <code>card2card</code> ساخته شود.
                                </p>
                            </div>
                        </ExpandableSection>
                    </div>

                    <GatewaysFilterBar
                        filters={filters}
                        onChange={setFilters}
                        filteredCount={filteredGateways.length}
                        totalCount={allGateways.length}
                    />

                    <div className={styles.gatewayGrid}>
                        {loading ? (
                            <div className={styles.loadingState}>
                                <LoadingState />
                            </div>
                        ) : gateways.length === 0 ? (
                            <div className={styles.emptyState}>
                                {allGateways.length === 0
                                    ? 'درگاهی ثبت نشده — پس از ری‌استارت API، seed پیش‌فرض (شامل کارت‌به‌کارت) اجرا می‌شود.'
                                    : 'درگاهی با این فیلترها یافت نشد. فیلترها را تغییر دهید یا پاک کنید.'}
                                <br />
                                {allGateways.length === 0 ? (
                                    <Link href="/billing/gateways/add" className={styles.primaryBtn} style={{ marginTop: 12 }}>
                                        + درگاه جدید
                                    </Link>
                                ) : (
                                    <button
                                        type="button"
                                        className={styles.primaryBtn}
                                        style={{ marginTop: 12 }}
                                        onClick={() => setFilters(DEFAULT_GATEWAY_FILTERS)}
                                    >
                                        پاک کردن فیلترها
                                    </button>
                                )}
                            </div>
                        ) : (
                            gateways.map((g) => (
                                <article key={g._id} className={styles.gatewayCard}>
                                    <div className={styles.gatewayCardHead}>
                                        <div className={styles.logoBox}>
                                            <GatewayLogo gateway={g} />
                                        </div>
                                        <div className={styles.gatewayTitle}>
                                            <h3>{g.name}</h3>
                                            <div className={styles.slug}>{g.slug}</div>
                                        </div>
                                        <span className={styles.orderBadge}>#{toFarsiNumber(g.order)}</span>
                                    </div>

                                    <p className={styles.desc}>{g.description || '—'}</p>

                                    <div className={styles.metaRow}>
                                        <span
                                            className={`${styles.badge} ${
                                                g.category === 'direct' ? styles.badgeDirect : styles.badgeInstallment
                                            }`}
                                        >
                                            {g.category === 'direct' ? 'مستقیم' : 'اقساطی'}
                                        </span>
                                        {g.providerType === 'card2card' && (
                                            <span className={`${styles.badge} ${styles.badgeCard2card}`}>
                                                کارت‌به‌کارت
                                            </span>
                                        )}
                                        <span className={`${styles.badge} ${styles.badgeProvider}`}>
                                            {PROVIDER_LABEL[g.providerType] || g.providerType}
                                        </span>
                                    </div>

                                    <div className={styles.toggleRow}>
                                        <label className={styles.toggleLabel}>
                                            <span>فعال</span>
                                            <input
                                                type="checkbox"
                                                checked={g.isActive}
                                                onChange={(e) =>
                                                    toggleField(g._id, 'isActive', e.target.checked)
                                                }
                                            />
                                        </label>
                                        <label className={styles.toggleLabel}>
                                            <span>نمایش در checkout</span>
                                            <input
                                                type="checkbox"
                                                checked={g.showInCheckout}
                                                onChange={(e) =>
                                                    toggleField(g._id, 'showInCheckout', e.target.checked)
                                                }
                                            />
                                        </label>
                                    </div>

                                    <div className={styles.cardActions}>
                                        <Link href={`/billing/gateways/${g._id}`} className={styles.editLink}>
                                            ویرایش
                                        </Link>
                                        <button
                                            type="button"
                                            className={styles.removeBtn}
                                            onClick={() => handleDelete(g._id, g.name)}
                                        >
                                            حذف
                                        </button>
                                    </div>
                                </article>
                            ))
                        )}
                    </div>

                    {!loading && (
                        <Pagination
                            rtl
                            className={styles.paginationBar}
                            itemPerPage={pagination.itemPerPage}
                            totalItems={filteredGateways.length}
                            currentPage={pagination.currentPage}
                            paginate={goToPage}
                            setRowsPerPage={(next) => {
                                itemPerPageRef.current = next;
                                setPagination((prev) => ({
                                    ...prev,
                                    itemPerPage: next,
                                    currentPage: 1,
                                }));
                            }}
                        />
                    )}
                </div>
            </Wrapper>
        </Container>
    );
}