'use client';

import ModuleGuide from '../components/ModuleGuide';
import { ECOMMERCE_GUIDES } from '../components/guides';

import React, { useCallback, useEffect, useState } from 'react';
import { Container, Wrapper } from '@/app/(main)/layout';
import { LoadingState } from '@my-workspace/components';
import { ErrorToaster, SuccessToaster, toFarsiNumber } from '@my-workspace/utils';
import styles from '../Ecommerce.module.scss';
import {
    addOrganizationBuyer,
    createOrganization,
    deleteOrganization,
    fetchCustomers,
    fetchOrganizations,
    removeOrganizationBuyer,
    updateOrganization,
} from '../e-commerce-api';
import { EcCustomer, EcOrganization, ORGANIZATION_STATUS_LABELS, formatToman } from '../e-commerce.types';

const EMPTY_FORM = {
    name: '',
    nationalId: '',
    economicCode: '',
    registrationNumber: '',
    phone: '',
    email: '',
    address: '',
    creditLimit: '',
    paymentTermDays: '',
    discountPercent: '',
    status: 'active',
};

const statusBadge: Record<EcOrganization['status'], string> = {
    active: styles.badgeSuccess,
    pending: styles.badgeWarning,
    suspended: styles.badgeDanger,
};

export default function B2BPage() {
    const [organizations, setOrganizations] = useState<EcOrganization[]>([]);
    const [customers, setCustomers] = useState<EcCustomer[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [buyerPickerOrg, setBuyerPickerOrg] = useState<EcOrganization | null>(null);
    const [selectedBuyer, setSelectedBuyer] = useState('');

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const [orgRes, customersRes] = await Promise.all([fetchOrganizations() as any, fetchCustomers() as any]);
            setOrganizations(orgRes?.organizations || []);
            setCustomers(customersRes?.customers || []);
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
            const body = {
                ...form,
                creditLimit: Number(form.creditLimit) || 0,
                paymentTermDays: Number(form.paymentTermDays) || 0,
                discountPercent: Number(form.discountPercent) || 0,
            };
            if (editId) {
                await updateOrganization(editId, body);
                SuccessToaster({ message: 'سازمان بروزرسانی شد' });
            } else {
                await createOrganization(body);
                SuccessToaster({ message: 'سازمان ثبت شد' });
            }
            setShowForm(false);
            setEditId(null);
            load();
        } catch (error) {
            ErrorToaster(error);
        }
    };

    const customerName = (customerId: string) => {
        const c = customers.find((x) => x._id === customerId);
        return c ? `${c.firstName} ${c.lastName}` : customerId;
    };

    return (
        <Container>
            <Wrapper>
                <div className={`${styles.container} ${styles.rtl}`}>
                    <header className={styles.header}>
                        <div>
                            <h1 className={styles.mainTitle}>سازمان‌های B2B</h1>
                            <p className={styles.subtitle}>
                                شرکت‌ها با چند خریدار، سقف اعتبار خرید، مهلت پرداخت و تخفیف سازمانی
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
                            + سازمان جدید
                        </button>
                    </header>

                    <ModuleGuide guide={ECOMMERCE_GUIDES.b2b} />

                    {loading ? (
                        <LoadingState />
                    ) : organizations.length === 0 ? (
                        <div className={styles.emptyState}>سازمانی ثبت نشده است.</div>
                    ) : (
                        <div className={styles.tableWrap}>
                            <table className={styles.dataTable}>
                                <thead>
                                    <tr>
                                        <th>نام سازمان</th>
                                        <th>شناسه ملی</th>
                                        <th>اعتبار خرید</th>
                                        <th>مهلت پرداخت</th>
                                        <th>خریداران</th>
                                        <th>وضعیت</th>
                                        <th>عملیات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {organizations.map((org) => (
                                        <tr key={org._id}>
                                            <td style={{ fontWeight: 600 }}>
                                                {org.name}
                                                {org.discountPercent ? (
                                                    <span className={`${styles.badge} ${styles.badgeInfo}`} style={{ marginRight: '0.5rem' }}>
                                                        {toFarsiNumber(org.discountPercent)}٪ تخفیف
                                                    </span>
                                                ) : null}
                                            </td>
                                            <td className={styles.cellLtr}>{org.nationalId || '—'}</td>
                                            <td>
                                                {formatToman(org.creditUsed || 0)} / {formatToman(org.creditLimit || 0)}
                                            </td>
                                            <td>{org.paymentTermDays ? `${toFarsiNumber(org.paymentTermDays)} روز` : '—'}</td>
                                            <td>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                                    {(org.buyerIds || []).map((buyerId) => (
                                                        <div key={buyerId} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                                            <span style={{ fontSize: '0.8rem' }}>{customerName(buyerId)}</span>
                                                            <button
                                                                className={styles.deleteBtn}
                                                                style={{ padding: '0.15rem 0.5rem', fontSize: '0.7rem' }}
                                                                onClick={async () => {
                                                                    try {
                                                                        await removeOrganizationBuyer(org._id, buyerId);
                                                                        load();
                                                                    } catch (error) {
                                                                        ErrorToaster(error);
                                                                    }
                                                                }}
                                                            >
                                                                ×
                                                            </button>
                                                        </div>
                                                    ))}
                                                    <button
                                                        className={styles.smallBtn}
                                                        style={{ alignSelf: 'flex-start' }}
                                                        onClick={() => {
                                                            setBuyerPickerOrg(org);
                                                            setSelectedBuyer('');
                                                        }}
                                                    >
                                                        + افزودن خریدار
                                                    </button>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`${styles.badge} ${statusBadge[org.status]}`}>
                                                    {ORGANIZATION_STATUS_LABELS[org.status]}
                                                </span>
                                            </td>
                                            <td>
                                                <div className={styles.cellActions}>
                                                    <button
                                                        className={styles.smallBtn}
                                                        onClick={() => {
                                                            setForm({
                                                                name: org.name || '',
                                                                nationalId: org.nationalId || '',
                                                                economicCode: org.economicCode || '',
                                                                registrationNumber: org.registrationNumber || '',
                                                                phone: org.phone || '',
                                                                email: org.email || '',
                                                                address: org.address || '',
                                                                creditLimit: String(org.creditLimit ?? ''),
                                                                paymentTermDays: String(org.paymentTermDays ?? ''),
                                                                discountPercent: String(org.discountPercent ?? ''),
                                                                status: org.status,
                                                            });
                                                            setEditId(org._id);
                                                            setShowForm(true);
                                                        }}
                                                    >
                                                        ویرایش
                                                    </button>
                                                    <button
                                                        className={styles.deleteBtn}
                                                        onClick={async () => {
                                                            if (!window.confirm(`سازمان «${org.name}» حذف شود؟`)) return;
                                                            try {
                                                                await deleteOrganization(org._id);
                                                                SuccessToaster({ message: 'حذف شد' });
                                                                load();
                                                            } catch (error) {
                                                                ErrorToaster(error);
                                                            }
                                                        }}
                                                    >
                                                        حذف
                                                    </button>
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
                                <h3 className={styles.modalTitle}>{editId ? 'ویرایش سازمان' : 'سازمان جدید'}</h3>
                                <form onSubmit={handleSubmit}>
                                    <div className={styles.formGrid}>
                                        <div className={styles.field}>
                                            <label>نام سازمان *</label>
                                            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                                        </div>
                                        <div className={styles.field}>
                                            <label>شناسه ملی</label>
                                            <input dir="ltr" value={form.nationalId} onChange={(e) => setForm({ ...form, nationalId: e.target.value })} />
                                        </div>
                                        <div className={styles.field}>
                                            <label>شماره اقتصادی</label>
                                            <input dir="ltr" value={form.economicCode} onChange={(e) => setForm({ ...form, economicCode: e.target.value })} />
                                        </div>
                                        <div className={styles.field}>
                                            <label>شماره ثبت</label>
                                            <input dir="ltr" value={form.registrationNumber} onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })} />
                                        </div>
                                        <div className={styles.field}>
                                            <label>تلفن</label>
                                            <input dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                                        </div>
                                        <div className={styles.field}>
                                            <label>ایمیل</label>
                                            <input dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                                        </div>
                                        <div className={styles.field}>
                                            <label>سقف اعتبار خرید (تومان)</label>
                                            <input dir="ltr" inputMode="numeric" value={form.creditLimit} onChange={(e) => setForm({ ...form, creditLimit: e.target.value })} />
                                        </div>
                                        <div className={styles.field}>
                                            <label>مهلت پرداخت (روز)</label>
                                            <input dir="ltr" type="number" value={form.paymentTermDays} onChange={(e) => setForm({ ...form, paymentTermDays: e.target.value })} />
                                        </div>
                                        <div className={styles.field}>
                                            <label>تخفیف سازمانی (٪)</label>
                                            <input dir="ltr" type="number" value={form.discountPercent} onChange={(e) => setForm({ ...form, discountPercent: e.target.value })} />
                                        </div>
                                        <div className={styles.field}>
                                            <label>وضعیت</label>
                                            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                                                {(Object.keys(ORGANIZATION_STATUS_LABELS) as EcOrganization['status'][]).map((s) => (
                                                    <option key={s} value={s}>{ORGANIZATION_STATUS_LABELS[s]}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className={styles.field}>
                                        <label>آدرس</label>
                                        <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                                    </div>
                                    <div className={styles.formActions}>
                                        <button type="submit" className={styles.primaryBtn}>ذخیره</button>
                                        <button type="button" className={styles.secondaryBtn} onClick={() => setShowForm(false)}>انصراف</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {buyerPickerOrg && (
                        <div className={styles.modalOverlay} onClick={() => setBuyerPickerOrg(null)}>
                            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                                <h3 className={styles.modalTitle}>افزودن خریدار به «{buyerPickerOrg.name}»</h3>
                                <div className={styles.field}>
                                    <label>مشتری</label>
                                    <select value={selectedBuyer} onChange={(e) => setSelectedBuyer(e.target.value)}>
                                        <option value="">انتخاب مشتری</option>
                                        {customers
                                            .filter((c) => !(buyerPickerOrg.buyerIds || []).includes(c._id))
                                            .map((c) => (
                                                <option key={c._id} value={c._id}>
                                                    {c.firstName} {c.lastName} — {c.mobile}
                                                </option>
                                            ))}
                                    </select>
                                </div>
                                <div className={styles.formActions}>
                                    <button
                                        className={styles.primaryBtn}
                                        disabled={!selectedBuyer}
                                        onClick={async () => {
                                            try {
                                                await addOrganizationBuyer(buyerPickerOrg._id, selectedBuyer);
                                                SuccessToaster({ message: 'خریدار اضافه شد' });
                                                setBuyerPickerOrg(null);
                                                load();
                                            } catch (error) {
                                                ErrorToaster(error);
                                            }
                                        }}
                                    >
                                        افزودن
                                    </button>
                                    <button className={styles.secondaryBtn} onClick={() => setBuyerPickerOrg(null)}>انصراف</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </Wrapper>
        </Container>
    );
}
