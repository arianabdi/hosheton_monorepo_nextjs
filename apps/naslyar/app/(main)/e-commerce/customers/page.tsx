'use client';

import ModuleGuide from '../components/ModuleGuide';
import { ECOMMERCE_GUIDES } from '../components/guides';

import React, { useCallback, useEffect, useState } from 'react';
import { Container, Wrapper } from '@/app/(main)/layout';
import { LoadingState } from '@my-workspace/components';
import { ErrorToaster, SuccessToaster, toFarsiNumber } from '@my-workspace/utils';
import styles from '../Ecommerce.module.scss';
import { createCustomer, deleteCustomer, fetchCustomers, updateCustomer } from '../e-commerce-api';
import { CUSTOMER_TYPE_LABELS, EcCustomer, formatToman } from '../e-commerce.types';

const EMPTY_FORM = {
    firstName: '',
    lastName: '',
    mobile: '',
    email: '',
    type: 'individual',
    nationalCode: '',
    companyName: '',
    companyId: '',
    economicCode: '',
    tags: '',
};

export default function CustomersPage() {
    const [customers, setCustomers] = useState<EcCustomer[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [form, setForm] = useState({ ...EMPTY_FORM });

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const res: any = await fetchCustomers({ search: search || undefined });
            setCustomers(res?.customers || []);
        } catch (error) {
            ErrorToaster(error);
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => {
        load();
    }, [load]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const body: any = { ...form, tags: form.tags.split('،').map((t) => t.trim()).filter(Boolean) };
            if (editId) {
                await updateCustomer(editId, body);
                SuccessToaster({ message: 'مشتری بروزرسانی شد' });
            } else {
                await createCustomer(body);
                SuccessToaster({ message: 'مشتری ثبت شد' });
            }
            setShowForm(false);
            setEditId(null);
            load();
        } catch (error) {
            ErrorToaster(error);
        }
    };

    const handleDelete = async (customer: EcCustomer) => {
        if (!window.confirm(`مشتری «${customer.firstName} ${customer.lastName}» حذف شود؟`)) return;
        try {
            await deleteCustomer(customer._id);
            SuccessToaster({ message: 'حذف شد' });
            load();
        } catch (error) {
            ErrorToaster(error);
        }
    };

    const openEdit = (c: EcCustomer) => {
        setForm({
            firstName: c.firstName || '',
            lastName: c.lastName || '',
            mobile: c.mobile || '',
            email: c.email || '',
            type: c.type || 'individual',
            nationalCode: c.nationalCode || '',
            companyName: c.companyName || '',
            companyId: c.companyId || '',
            economicCode: c.economicCode || '',
            tags: (c.tags || []).join('، '),
        });
        setEditId(c._id);
        setShowForm(true);
    };

    return (
        <Container>
            <Wrapper>
                <div className={`${styles.container} ${styles.rtl}`}>
                    <header className={styles.header}>
                        <div>
                            <h1 className={styles.mainTitle}>مشتریان</h1>
                            <p className={styles.subtitle}>
                                پروفایل مشتریان حقیقی و حقوقی با پشتیبانی کد ملی، شناسه ملی و کد اقتصادی
                            </p>
                        </div>
                        <button
                            className={styles.primaryBtn}
                            onClick={() => {
                                setForm({ ...EMPTY_FORM });
                                setEditId(null);
                                setShowForm(true);
                            }}
                        >
                            + افزودن مشتری
                        </button>
                    </header>

                    <ModuleGuide guide={ECOMMERCE_GUIDES.customers} />

                    <div className={styles.toolbar}>
                        <input
                            className={styles.searchInput}
                            placeholder="جستجو بر اساس نام، موبایل یا ایمیل..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>{toFarsiNumber(customers.length)} مشتری</span>
                    </div>

                    {loading ? (
                        <LoadingState />
                    ) : customers.length === 0 ? (
                        <div className={styles.emptyState}>مشتری‌ای یافت نشد.</div>
                    ) : (
                        <div className={styles.tableWrap}>
                            <table className={styles.dataTable}>
                                <thead>
                                    <tr>
                                        <th>نام</th>
                                        <th>موبایل</th>
                                        <th>نوع</th>
                                        <th>امتیاز</th>
                                        <th>تعداد سفارش</th>
                                        <th>مجموع خرید (تومان)</th>
                                        <th>عملیات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {customers.map((c) => (
                                        <tr key={c._id}>
                                            <td style={{ fontWeight: 600 }}>
                                                {c.firstName} {c.lastName}
                                                {c.type === 'legal' && c.companyName ? (
                                                    <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{c.companyName}</div>
                                                ) : null}
                                            </td>
                                            <td className={styles.cellLtr}>{c.mobile}</td>
                                            <td>
                                                <span className={`${styles.badge} ${c.type === 'legal' ? styles.badgeInfo : styles.badgeMuted}`}>
                                                    {CUSTOMER_TYPE_LABELS[c.type]}
                                                </span>
                                            </td>
                                            <td>{toFarsiNumber(c.loyaltyPoints || 0)}</td>
                                            <td>{toFarsiNumber(c.totalOrdersCount || 0)}</td>
                                            <td>{formatToman(c.totalSpent || 0)}</td>
                                            <td>
                                                <div className={styles.cellActions}>
                                                    <button className={styles.smallBtn} onClick={() => openEdit(c)}>ویرایش</button>
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
                                <h3 className={styles.modalTitle}>{editId ? 'ویرایش مشتری' : 'مشتری جدید'}</h3>
                                <form onSubmit={handleSubmit}>
                                    <div className={styles.formGrid}>
                                        <div className={styles.field}>
                                            <label>نام *</label>
                                            <input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
                                        </div>
                                        <div className={styles.field}>
                                            <label>نام خانوادگی *</label>
                                            <input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
                                        </div>
                                        <div className={styles.field}>
                                            <label>موبایل *</label>
                                            <input dir="ltr" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} required />
                                        </div>
                                        <div className={styles.field}>
                                            <label>ایمیل</label>
                                            <input dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                                        </div>
                                        <div className={styles.field}>
                                            <label>نوع مشتری</label>
                                            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                                                <option value="individual">حقیقی</option>
                                                <option value="legal">حقوقی (B2B)</option>
                                            </select>
                                        </div>
                                        <div className={styles.field}>
                                            <label>کد ملی</label>
                                            <input dir="ltr" value={form.nationalCode} onChange={(e) => setForm({ ...form, nationalCode: e.target.value })} />
                                            <span className={styles.fieldHint}>۱۰ رقم — اعتبار رقم کنترل بررسی می‌شود.</span>
                                        </div>
                                        {form.type === 'legal' && (
                                            <>
                                                <div className={styles.field}>
                                                    <label>نام شرکت</label>
                                                    <input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
                                                </div>
                                                <div className={styles.field}>
                                                    <label>شناسه ملی</label>
                                                    <input dir="ltr" value={form.companyId} onChange={(e) => setForm({ ...form, companyId: e.target.value })} />
                                                </div>
                                                <div className={styles.field}>
                                                    <label>شماره اقتصادی</label>
                                                    <input dir="ltr" value={form.economicCode} onChange={(e) => setForm({ ...form, economicCode: e.target.value })} />
                                                </div>
                                            </>
                                        )}
                                        <div className={styles.field}>
                                            <label>برچسب‌ها (با «،» جدا کنید)</label>
                                            <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="VIP، عمده..." />
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
