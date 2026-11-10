'use client';

import ModuleGuide from '../components/ModuleGuide';
import { ECOMMERCE_GUIDES } from '../components/guides';

import React, { useCallback, useEffect, useState } from 'react';
import { Container, Wrapper } from '@/app/(main)/layout';
import { LoadingState } from '@my-workspace/components';
import { ErrorToaster, SuccessToaster, toFarsiNumber } from '@my-workspace/utils';
import styles from '../Ecommerce.module.scss';
import { createCoupon, deleteCoupon, fetchCoupons, updateCoupon } from '../e-commerce-api';
import { COUPON_TYPE_LABELS, EcCoupon, formatDate, formatToman } from '../e-commerce.types';

const EMPTY_FORM = {
    code: '',
    title: '',
    type: 'percentage',
    value: '',
    maxDiscountAmount: '',
    minOrderAmount: '',
    usageLimit: '',
    perCustomerLimit: '1',
    startsAt: '',
    endsAt: '',
    isActive: true,
};

function toIsoInput(value?: string | null): string {
    if (!value) return '';
    try {
        return new Date(value).toISOString().slice(0, 10);
    } catch {
        return '';
    }
}

export default function CouponsPage() {
    const [coupons, setCoupons] = useState<EcCoupon[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [form, setForm] = useState({ ...EMPTY_FORM });

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const res: any = await fetchCoupons();
            setCoupons(res?.coupons || []);
        } catch (error) {
            ErrorToaster(error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const body: any = {
                ...form,
                value: Number(form.value) || 0,
                maxDiscountAmount: Number(form.maxDiscountAmount) || 0,
                minOrderAmount: Number(form.minOrderAmount) || 0,
                usageLimit: Number(form.usageLimit) || 0,
                perCustomerLimit: Number(form.perCustomerLimit) || 1,
                startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
                endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
            };
            if (editId) {
                await updateCoupon(editId, body);
                SuccessToaster({ message: 'کوپن بروزرسانی شد' });
            } else {
                await createCoupon(body);
                SuccessToaster({ message: 'کوپن ساخته شد' });
            }
            setShowForm(false);
            setEditId(null);
            load();
        } catch (error) {
            ErrorToaster(error);
        }
    };

    const handleDelete = async (coupon: EcCoupon) => {
        if (!window.confirm(`کوپن «${coupon.code}» حذف شود؟`)) return;
        try {
            await deleteCoupon(coupon._id);
            SuccessToaster({ message: 'حذف شد' });
            load();
        } catch (error) {
            ErrorToaster(error);
        }
    };

    const toggleActive = async (coupon: EcCoupon) => {
        try {
            await updateCoupon(coupon._id, { isActive: !coupon.isActive });
            load();
        } catch (error) {
            ErrorToaster(error);
        }
    };

    return (
        <Container>
            <Wrapper>
                <div className={`${styles.container} ${styles.rtl}`}>
                    <header className={styles.header}>
                        <div>
                            <h1 className={styles.mainTitle}>کدهای تخفیف (کوپن)</h1>
                            <p className={styles.subtitle}>کوپن درصدی، مبلغ ثابت و ارسال رایگان با محدودیت مصرف</p>
                        </div>
                        <button
                            className={styles.primaryBtn}
                            onClick={() => {
                                setForm({ ...EMPTY_FORM });
                                setEditId(null);
                                setShowForm(true);
                            }}
                        >
                            + کوپن جدید
                        </button>
                    </header>

                    <ModuleGuide guide={ECOMMERCE_GUIDES.coupons} />

                    {loading ? (
                        <LoadingState />
                    ) : coupons.length === 0 ? (
                        <div className={styles.emptyState}>کوپنی ثبت نشده است.</div>
                    ) : (
                        <div className={styles.tableWrap}>
                            <table className={styles.dataTable}>
                                <thead>
                                    <tr>
                                        <th>کد</th>
                                        <th>نوع</th>
                                        <th>مقدار</th>
                                        <th>حداقل خرید</th>
                                        <th>مصرف</th>
                                        <th>اعتبار</th>
                                        <th>وضعیت</th>
                                        <th>عملیات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {coupons.map((c) => (
                                        <tr key={c._id}>
                                            <td className={styles.cellLtr} style={{ fontWeight: 700 }}>{c.code}</td>
                                            <td>{COUPON_TYPE_LABELS[c.type]}</td>
                                            <td>{c.type === 'percentage' ? `${toFarsiNumber(c.value)}٪` : c.type === 'fixed' ? formatToman(c.value) : '—'}</td>
                                            <td>{c.minOrderAmount ? formatToman(c.minOrderAmount) : '—'}</td>
                                            <td>
                                                {toFarsiNumber(c.usedCount || 0)}
                                                {c.usageLimit ? ` از ${toFarsiNumber(c.usageLimit)}` : ''}
                                            </td>
                                            <td>
                                                {formatDate(c.startsAt)} — {formatDate(c.endsAt)}
                                            </td>
                                            <td>
                                                <span className={`${styles.badge} ${c.isActive ? styles.badgeSuccess : styles.badgeMuted}`}>
                                                    {c.isActive ? 'فعال' : 'غیرفعال'}
                                                </span>
                                            </td>
                                            <td>
                                                <div className={styles.cellActions}>
                                                    <button className={styles.smallBtn} onClick={() => toggleActive(c)}>
                                                        {c.isActive ? 'غیرفعال' : 'فعال'}
                                                    </button>
                                                    <button
                                                        className={styles.smallBtn}
                                                        onClick={() => {
                                                            setForm({
                                                                code: c.code || '',
                                                                title: c.title || '',
                                                                type: c.type,
                                                                value: String(c.value ?? ''),
                                                                maxDiscountAmount: String(c.maxDiscountAmount ?? ''),
                                                                minOrderAmount: String(c.minOrderAmount ?? ''),
                                                                usageLimit: String(c.usageLimit ?? ''),
                                                                perCustomerLimit: String(c.perCustomerLimit ?? 1),
                                                                startsAt: toIsoInput(c.startsAt),
                                                                endsAt: toIsoInput(c.endsAt),
                                                                isActive: c.isActive !== false,
                                                            });
                                                            setEditId(c._id);
                                                            setShowForm(true);
                                                        }}
                                                    >
                                                        ویرایش
                                                    </button>
                                                    <button className={styles.deleteBtn} onClick={() => handleDelete(c)}>حذف</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {showForm && (
                        <div className={styles.modalOverlay} onClick={() => setShowForm(false)}>
                            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                                <h3 className={styles.modalTitle}>{editId ? 'ویرایش کوپن' : 'کوپن جدید'}</h3>
                                <form onSubmit={handleSubmit}>
                                    <div className={styles.formGrid}>
                                        <div className={styles.field}>
                                            <label>کد *</label>
                                            <input dir="ltr" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} required />
                                        </div>
                                        <div className={styles.field}>
                                            <label>عنوان</label>
                                            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                                        </div>
                                        <div className={styles.field}>
                                            <label>نوع تخفیف</label>
                                            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                                                {(Object.keys(COUPON_TYPE_LABELS) as EcCoupon['type'][]).map((t) => (
                                                    <option key={t} value={t}>{COUPON_TYPE_LABELS[t]}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className={styles.field}>
                                            <label>{form.type === 'percentage' ? 'درصد تخفیف *' : 'مبلغ تخفیف (تومان) *'}</label>
                                            <input dir="ltr" inputMode="numeric" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} required />
                                        </div>
                                        {form.type === 'percentage' && (
                                            <div className={styles.field}>
                                                <label>حداکثر تخفیف (تومان)</label>
                                                <input dir="ltr" inputMode="numeric" value={form.maxDiscountAmount} onChange={(e) => setForm({ ...form, maxDiscountAmount: e.target.value })} />
                                            </div>
                                        )}
                                        <div className={styles.field}>
                                            <label>حداقل مبلغ سفارش (تومان)</label>
                                            <input dir="ltr" inputMode="numeric" value={form.minOrderAmount} onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })} />
                                        </div>
                                        <div className={styles.field}>
                                            <label>سقف استفاده کلی</label>
                                            <input dir="ltr" type="number" value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} />
                                            <span className={styles.fieldHint}>صفر = بدون محدودیت</span>
                                        </div>
                                        <div className={styles.field}>
                                            <label>از تاریخ</label>
                                            <input dir="ltr" type="date" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
                                        </div>
                                        <div className={styles.field}>
                                            <label>تا تاریخ</label>
                                            <input dir="ltr" type="date" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className={styles.formActions}>
                                        <button type="submit" className={styles.primaryBtn}>ذخیره</button>
                                        <button type="button" className={styles.secondaryBtn} onClick={() => setShowForm(false)}>انصراف</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </Wrapper>
        </Container>
    );
}
