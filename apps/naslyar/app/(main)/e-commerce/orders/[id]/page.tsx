'use client';

import ModuleGuide from '../../components/ModuleGuide';
import { ECOMMERCE_GUIDES } from '../../components/guides';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Container, Wrapper } from '@/app/(main)/layout';
import { LoadingState } from '@my-workspace/components';
import { ErrorToaster, SuccessToaster, toFarsiNumber } from '@my-workspace/utils';
import styles from '../../Ecommerce.module.scss';
import {
    addOrderNote,
    createShipment,
    fetchCarriers,
    fetchOrder,
    recordOrderPayment,
    updateOrderStatus,
    updateShipmentStatus,
} from '../../e-commerce-api';
import {
    CARRIER_LABELS,
    EcOrder,
    EcOrderNote,
    EcOrderStatus,
    EcPayment,
    EcShipment,
    GATEWAY_LABELS,
    ORDER_STATUS_LABELS,
    PAYMENT_STATUS_LABELS,
    SHIPMENT_STATUS_LABELS,
    formatDate,
    formatToman,
} from '../../e-commerce.types';

/** مسیرهای مجاز تغییر وضعیت (هم‌راستا با بک‌اند) */
const NEXT_STATUSES: Record<string, EcOrderStatus[]> = {
    draft: ['pending_payment', 'cancelled'],
    pending_payment: ['paid', 'cancelled'],
    paid: ['processing', 'refunded', 'cancelled'],
    processing: ['packed', 'cancelled', 'refunded'],
    packed: ['shipped', 'cancelled'],
    shipped: ['delivered', 'returned'],
    delivered: ['returned'],
    cancelled: [],
    returned: ['refunded'],
    refunded: [],
};

export default function OrderDetailPage() {
    const params = useParams();
    const orderId = (params as any)?.id as string;

    const [order, setOrder] = useState<EcOrder | null>(null);
    const [notes, setNotes] = useState<EcOrderNote[]>([]);
    const [payments, setPayments] = useState<EcPayment[]>([]);
    const [shipments, setShipments] = useState<EcShipment[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);

    const [newNote, setNewNote] = useState('');
    const [nextStatus, setNextStatus] = useState('');
    const [paymentForm, setPaymentForm] = useState({ amount: '', gateway: 'manual', refId: '' });
    const [shipmentForm, setShipmentForm] = useState({ carrierId: '', trackingNumber: '', cost: '' });
    const [carriers, setCarriers] = useState<{ _id: string; name: string }[]>([]);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const res: any = await fetchOrder(orderId);
            setOrder(res?.order || null);
            setNotes(res?.notes || []);
            setPayments(res?.payments || []);
            setShipments(res?.shipments || []);
        } catch (error) {
            ErrorToaster(error);
        } finally {
            setLoading(false);
        }
    }, [orderId]);

    useEffect(() => {
        if (orderId) load();
        fetchCarriers()
            .then((res: any) => setCarriers((res?.carriers || []).filter((c: any) => c.isActive !== false)))
            .catch(() => setCarriers([]));
    }, [orderId, load]);

    const run = async (action: () => Promise<any>, message: string) => {
        try {
            setBusy(true);
            await action();
            SuccessToaster({ message });
            await load();
        } catch (error) {
            ErrorToaster(error);
        } finally {
            setBusy(false);
        }
    };

    if (loading) {
        return (
            <Container>
                <Wrapper>
                    <div className={`${styles.container} ${styles.rtl}`}>
                        <LoadingState />
                    </div>
                </Wrapper>
            </Container>
        );
    }

    if (!order) {
        return (
            <Container>
                <Wrapper>
                    <div className={`${styles.container} ${styles.rtl}`}>
                        <div className={styles.emptyState}>سفارش یافت نشد.</div>
                    </div>
                </Wrapper>
            </Container>
        );
    }

    const address = order.shippingAddress || {};
    const allowed = NEXT_STATUSES[order.status] || [];

    return (
        <Container>
            <Wrapper>
                <div className={`${styles.container} ${styles.rtl}`}>
                    <Link className={styles.backLink} href="/e-commerce/orders">← بازگشت به سفارشات</Link>
                    <header className={styles.header}>
                        <div>
                            <h1 className={styles.mainTitle}>
                                سفارش <span className={styles.cellLtr}>{order.orderNumber}</span>
                            </h1>
                            <p className={styles.subtitle}>
                                {order.customerName || 'مشتری'} — {formatDate(order.createdAt)}
                            </p>
                        </div>
                        <span className={`${styles.badge} ${order.status === 'delivered' || order.status === 'paid' ? styles.badgeSuccess : styles.badgeWarning}`}>
                            {ORDER_STATUS_LABELS[order.status]}
                        </span>
                    </header>

                    <ModuleGuide guide={ECOMMERCE_GUIDES.orderDetail} />

                    <div className={styles.statsBar}>
                        <div className={styles.statCard}>
                            <div className={styles.statValue}>{formatToman(order.subtotal)}</div>
                            <div className={styles.statLabel}>جمع اقلام (تومان)</div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.statValue}>{formatToman(order.discountAmount)}</div>
                            <div className={styles.statLabel}>تخفیف</div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.statValue}>{formatToman(order.taxAmount)}</div>
                            <div className={styles.statLabel}>مالیات ({toFarsiNumber(order.taxRate || 0)}٪)</div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.statValue}>{formatToman(order.grandTotal)}</div>
                            <div className={styles.statLabel}>مبلغ نهایی (تومان)</div>
                        </div>
                    </div>

                    <div className={styles.overviewGrid}>
                        <div className={styles.sectionCard}>
                            <h3>اقلام سفارش</h3>
                            <div className={styles.tableWrap}>
                                <table className={styles.dataTable} style={{ minWidth: 0 }}>
                                    <thead>
                                        <tr>
                                            <th>محصول</th>
                                            <th>قیمت واحد</th>
                                            <th>تعداد</th>
                                            <th>جمع</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {order.items.map((item, index) => (
                                            <tr key={item._id || index}>
                                                <td>
                                                    <div style={{ fontWeight: 600 }}>{item.title}</div>
                                                    {item.options?.length ? (
                                                        <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                                                            {item.options.map((o) => o.label).join('، ')}
                                                        </div>
                                                    ) : null}
                                                    <div className={styles.cellLtr} style={{ fontSize: '0.72rem', opacity: 0.6 }}>{item.sku}</div>
                                                </td>
                                                <td>{formatToman(item.unitPrice)}</td>
                                                <td>{toFarsiNumber(item.quantity)}</td>
                                                <td style={{ fontWeight: 700 }}>{formatToman(item.totalPrice)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className={styles.sectionCard}>
                            <h3>آدرس ارسال</h3>
                            <div className={styles.infoRow}>
                                <span className={styles.infoLabel}>گیرنده</span>
                                <span className={styles.infoValue}>{address.receiverName || '—'}</span>
                            </div>
                            <div className={styles.infoRow}>
                                <span className={styles.infoLabel}>موبایل</span>
                                <span className={styles.infoValue} dir="ltr">{address.receiverMobile || '—'}</span>
                            </div>
                            <div className={styles.infoRow}>
                                <span className={styles.infoLabel}>استان / شهر</span>
                                <span className={styles.infoValue}>{address.province || '—'} / {address.city || '—'}</span>
                            </div>
                            <div className={styles.infoRow}>
                                <span className={styles.infoLabel}>نشانی</span>
                                <span className={styles.infoValue} style={{ textAlign: 'right' }}>
                                    {address.street || ''} پلاک {address.plaque || '—'} واحد {address.unit || '—'}
                                </span>
                            </div>
                            <div className={styles.infoRow}>
                                <span className={styles.infoLabel}>کد پستی</span>
                                <span className={styles.infoValue} dir="ltr">{address.postalCode || '—'}</span>
                            </div>
                            <div className={styles.infoRow}>
                                <span className={styles.infoLabel}>روش ارسال</span>
                                <span className={styles.infoValue}>{order.shippingMethodName || '—'}</span>
                            </div>
                        </div>

                        <div className={styles.sectionCard}>
                            <h3>پرداخت‌ها</h3>
                            {payments.length === 0 ? (
                                <div className={styles.emptyState}>پرداختی ثبت نشده است.</div>
                            ) : (
                                payments.map((p) => (
                                    <div key={p._id} className={styles.infoRow}>
                                        <span className={styles.infoLabel}>
                                            {GATEWAY_LABELS[p.gateway] || p.gateway} — {formatDate(p.createdAt)}
                                        </span>
                                        <span className={styles.infoValue}>
                                            {formatToman(p.amount)} تومان
                                            <span className={`${styles.badge} ${p.status === 'captured' ? styles.badgeSuccess : p.status === 'failed' ? styles.badgeDanger : styles.badgeWarning}`} style={{ marginRight: '0.5rem' }}>
                                                {p.status === 'captured' ? 'موفق' : p.status === 'failed' ? 'ناموفق' : 'در انتظار'}
                                            </span>
                                        </span>
                                    </div>
                                ))
                            )}
                            <div style={{ borderTop: '1px solid var(--plan-card-border-color)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                                <div className={styles.formGrid}>
                                    <div className={styles.field}>
                                        <label>مبلغ پرداخت (تومان)</label>
                                        <input dir="ltr" inputMode="numeric" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} />
                                    </div>
                                    <div className={styles.field}>
                                        <label>درگاه</label>
                                        <select value={paymentForm.gateway} onChange={(e) => setPaymentForm({ ...paymentForm, gateway: e.target.value })}>
                                            {Object.entries(GATEWAY_LABELS).map(([key, label]) => (
                                                <option key={key} value={key}>{label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className={styles.field}>
                                        <label>شماره پیگیری</label>
                                        <input dir="ltr" value={paymentForm.refId} onChange={(e) => setPaymentForm({ ...paymentForm, refId: e.target.value })} />
                                    </div>
                                </div>
                                <button
                                    className={styles.primaryBtn}
                                    disabled={busy || !paymentForm.amount}
                                    onClick={() =>
                                        run(
                                            () =>
                                                recordOrderPayment(order._id, {
                                                    amount: parseInt(paymentForm.amount.replace(/\D/g, ''), 10) || 0,
                                                    gateway: paymentForm.gateway,
                                                    refId: paymentForm.refId,
                                                }),
                                            'پرداخت ثبت شد',
                                        )
                                        }
                                    >
                                        ثبت پرداخت
                                    </button>
                                <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', opacity: 0.7 }}>
                                    وضعیت پرداخت: {PAYMENT_STATUS_LABELS[order.paymentStatus]}
                                </div>
                            </div>
                        </div>

                        <div className={styles.sectionCard}>
                            <h3>مرسوله‌ها</h3>
                            {shipments.length === 0 ? (
                                <div className={styles.emptyState}>مرسوله‌ای ثبت نشده است.</div>
                            ) : (
                                shipments.map((s) => (
                                    <div key={s._id} style={{ borderBottom: '1px dashed var(--plan-card-border-color)', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
                                        <div className={styles.infoRow}>
                                            <span className={styles.infoLabel}>
                                                {CARRIER_LABELS[s.carrier] || s.carrier}
                                                {s.trackingNumber ? ` — کد رهگیری: ${s.trackingNumber}` : ''}
                                            </span>
                                            <span className={`${styles.badge} ${s.status === 'delivered' ? styles.badgeSuccess : s.status === 'in_transit' ? styles.badgeInfo : styles.badgeWarning}`}>
                                                {SHIPMENT_STATUS_LABELS[s.status]}
                                            </span>
                                        </div>
                                        {s.events && s.events.length > 0 && (
                                            <ul className={styles.timeline} style={{ marginTop: '0.5rem' }}>
                                                {s.events.map((ev, i) => (
                                                    <li key={i} style={{ fontSize: '0.8rem' }}>
                                                        <strong>{ev.title}</strong>
                                                        <div style={{ opacity: 0.6 }}>{formatDate(ev.occurredAt)}</div>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                        {s.status !== 'delivered' && (
                                            <div className={styles.cellActions} style={{ marginTop: '0.5rem' }}>
                                                <button
                                                    className={styles.smallBtn}
                                                    disabled={busy}
                                                    onClick={() => run(() => updateShipmentStatus(s._id, { status: 'in_transit', eventTitle: 'مرسوله ارسال شد' }), 'وضعیت بروزرسانی شد')}
                                                >
                                                    ارسال شد
                                                </button>
                                                <button
                                                    className={styles.smallBtn}
                                                    disabled={busy}
                                                    onClick={() => run(() => updateShipmentStatus(s._id, { status: 'delivered', eventTitle: 'تحویل شد' }), 'تحویل ثبت شد')}
                                                >
                                                    تحویل شد
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                            <div style={{ borderTop: '1px solid var(--plan-card-border-color)', paddingTop: '0.75rem' }}>
                                <div className={styles.formGrid}>
                                    <div className={styles.field}>
                                        <label>شرکت حمل‌ونقل</label>
                                        <select value={shipmentForm.carrierId} onChange={(e) => setShipmentForm({ ...shipmentForm, carrierId: e.target.value })}>
                                            <option value="">انتخاب شرکت</option>
                                            {carriers.map((c) => (
                                                <option key={c._id} value={c._id}>{c.name}</option>
                                            ))}
                                        </select>
                                        {carriers.length === 0 && (
                                            <span className={styles.fieldHint}>شرکتی ثبت نشده — از بخش «شرکت‌های حمل‌ونقل» اضافه کنید.</span>
                                        )}
                                    </div>
                                    <div className={styles.field}>
                                        <label>کد رهگیری</label>
                                        <input dir="ltr" value={shipmentForm.trackingNumber} onChange={(e) => setShipmentForm({ ...shipmentForm, trackingNumber: e.target.value })} />
                                    </div>
                                </div>
                                <button
                                    className={styles.secondaryBtn}
                                    disabled={busy}
                                    onClick={() =>
                                        run(
                                            () =>
                                                createShipment(order._id, {
                                                    carrierId: shipmentForm.carrierId || undefined,
                                                    trackingNumber: shipmentForm.trackingNumber,
                                                }),
                                            'مرسوله ثبت شد',
                                        )
                                    }
                                >
                                    + ثبت مرسوله
                                </button>
                            </div>
                        </div>

                        <div className={styles.sectionCard}>
                            <h3>تغییر وضعیت سفارش</h3>
                            {allowed.length === 0 ? (
                                <div className={styles.fieldHint}>این سفارش در وضعیت پایانی است و امکان تغییر وضعیت ندارد.</div>
                            ) : (
                                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                    {allowed.map((s) => (
                                        <button
                                            key={s}
                                            className={styles.secondaryBtn}
                                            disabled={busy}
                                            onClick={() => run(() => updateOrderStatus(order._id, s), 'وضعیت سفارش تغییر کرد')}
                                        >
                                            {ORDER_STATUS_LABELS[s]}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className={styles.sectionCard}>
                            <h3>یادداشت‌ها و تاریخچه</h3>
                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                                <input
                                    className={styles.searchInput}
                                    style={{ maxWidth: 'none', flex: 1 }}
                                    placeholder="یادداشت داخلی..."
                                    value={newNote}
                                    onChange={(e) => setNewNote(e.target.value)}
                                />
                                <button
                                    className={styles.primaryBtn}
                                    disabled={busy || !newNote.trim()}
                                    onClick={() => run(() => addOrderNote(order._id, newNote), 'یادداشت ثبت شد').then(() => setNewNote(''))}
                                >
                                    ثبت
                                </button>
                            </div>
                            {notes.length === 0 ? (
                                <div className={styles.fieldHint}>یادداشتی ثبت نشده است.</div>
                            ) : (
                                <ul className={styles.timeline}>
                                    {notes.map((note) => (
                                        <li key={note._id}>
                                            <strong>{note.note}</strong>
                                            <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>
                                                {note.type === 'system' ? 'سیستمی' : note.type === 'customer' ? 'مشتری' : 'داخلی'} — {formatDate(note.createdAt)}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            </Wrapper>
        </Container>
    );
}
