'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Container, Wrapper } from '@/app/(main)/layout';
import { LoadingState } from '@my-workspace/components';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import styles from '../Ecommerce.module.scss';
import ModuleGuide from '../components/ModuleGuide';
import { ECOMMERCE_GUIDES } from '../components/guides';
import { createCarrier, deleteCarrier, fetchCarriers, updateCarrier } from '../e-commerce-api';
import { formatDate } from '../e-commerce.types';

interface EcCarrier {
    _id: string;
    name: string;
    code: string;
    logoUrl?: string;
    trackingUrlTemplate?: string;
    apiConfig?: Record<string, any>;
    supportsCod?: boolean;
    rateApiEnabled?: boolean;
    isDefault?: boolean;
    sortOrder?: number;
    isActive?: boolean;
    createdAt?: string;
}

const EMPTY_FORM = {
    name: '',
    code: '',
    logoUrl: '',
    trackingUrlTemplate: '',
    apiUrl: '',
    apiKey: '',
    merchantId: '',
    username: '',
    password: '',
    supportsCod: false,
    rateApiEnabled: false,
    isDefault: false,
    isActive: true,
    sortOrder: '0',
};

/** فرم اکانت شرکت حمل‌ونقل — کانفیگ‌ها داینامیک در apiConfig ذخیره می‌شوند */
export default function CarriersPage() {
    const [carriers, setCarriers] = useState<EcCarrier[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [form, setForm] = useState({ ...EMPTY_FORM });
    // فیلدهای config که کاربر اضافه می‌کند (key/value دلخواه)
    const [extraConfigs, setExtraConfigs] = useState<{ key: string; value: string }[]>([]);
    // نمایش/عدم نمایش کانفیگ هر ردیف
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const res: any = await fetchCarriers();
            setCarriers(res?.carriers || []);
        } catch (error) {
            ErrorToaster(error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const openCreate = () => {
        setForm({ ...EMPTY_FORM });
        setExtraConfigs([]);
        setEditId(null);
        setShowForm(true);
    };

    const openEdit = (c: EcCarrier) => {
        const cfg = c.apiConfig || {};
        setForm({
            name: c.name || '',
            code: c.code || '',
            logoUrl: c.logoUrl || '',
            trackingUrlTemplate: c.trackingUrlTemplate || '',
            apiUrl: cfg.apiUrl || '',
            apiKey: cfg.apiKey || '',
            merchantId: cfg.merchantId || '',
            username: cfg.username || '',
            password: cfg.password || '',
            supportsCod: !!c.supportsCod,
            rateApiEnabled: !!c.rateApiEnabled,
            isDefault: !!c.isDefault,
            isActive: c.isActive !== false,
            sortOrder: String(c.sortOrder ?? 0),
        });
        // کانفیگ‌های خارج از فیلدهای ثابت
        const fixed = ['apiUrl', 'apiKey', 'merchantId', 'username', 'password'];
        setExtraConfigs(
            Object.entries(cfg)
                .filter(([k]) => !fixed.includes(k))
                .map(([key, value]) => ({ key, value: typeof value === 'string' ? value : JSON.stringify(value) })),
        );
        setEditId(c._id);
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const apiConfig: Record<string, any> = {};
            if (form.apiUrl) apiConfig.apiUrl = form.apiUrl;
            if (form.apiKey) apiConfig.apiKey = form.apiKey;
            if (form.merchantId) apiConfig.merchantId = form.merchantId;
            if (form.username) apiConfig.username = form.username;
            if (form.password) apiConfig.password = form.password;
            extraConfigs.forEach(({ key, value }) => {
                if (key.trim()) {
                    try {
                        apiConfig[key.trim()] = JSON.parse(value);
                    } catch {
                        apiConfig[key.trim()] = value;
                    }
                }
            });
            const body = {
                name: form.name,
                code: form.code,
                logoUrl: form.logoUrl || undefined,
                trackingUrlTemplate: form.trackingUrlTemplate || undefined,
                apiConfig,
                supportsCod: form.supportsCod,
                rateApiEnabled: form.rateApiEnabled,
                isDefault: form.isDefault,
                isActive: form.isActive,
                sortOrder: Number(form.sortOrder) || 0,
            };
            if (editId) {
                await updateCarrier(editId, body);
                SuccessToaster({ message: 'شرکت حمل‌ونقل بروزرسانی شد' });
            } else {
                await createCarrier(body);
                SuccessToaster({ message: 'شرکت حمل‌ونقل اضافه شد' });
            }
            setShowForm(false);
            load();
        } catch (error) {
            ErrorToaster(error);
        }
    };

    const handleDelete = async (c: EcCarrier) => {
        if (!window.confirm(`شرکت «${c.name}» حذف شود؟`)) return;
        try {
            await deleteCarrier(c._id);
            SuccessToaster({ message: 'حذف شد' });
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
                            <h1 className={styles.mainTitle}>شرکت‌های حمل‌ونقل</h1>
                            <p className={styles.subtitle}>
                                شرکت‌های حمل کالا به‌صورت داینامیک — اکانت و کانفیگ هر شرکت را وارد کنید و در ثبت مرسوله‌ها استفاده شود
                            </p>
                        </div>
                        <button className={styles.primaryBtn} onClick={openCreate}>+ شرکت جدید</button>
                    </header>

                    <ModuleGuide guide={ECOMMERCE_GUIDES.carriers} />

                    {loading ? (
                        <LoadingState />
                    ) : carriers.length === 0 ? (
                        <div className={styles.emptyState}>هنوز شرکتی ثبت نشده — «شرکت جدید» را بزنید.</div>
                    ) : (
                        <div className={styles.tableWrap}>
                            <table className={styles.dataTable}>
                                <thead>
                                    <tr>
                                        <th>شرکت</th>
                                        <th>کد</th>
                                        <th>رهگیری آنلاین</th>
                                        <th>اکانت</th>
                                        <th>پیش‌فرض</th>
                                        <th>وضعیت</th>
                                        <th>عملیات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {carriers.map((c) => {
                                        const cfg = c.apiConfig || {};
                                        const cfgKeys = Object.keys(cfg);
                                        return (
                                            <React.Fragment key={c._id}>
                                                <tr>
                                                    <td style={{ fontWeight: 700 }}>{c.name}</td>
                                                    <td className={styles.cellLtr}>{c.code}</td>
                                                    <td>
                                                        {c.trackingUrlTemplate ? (
                                                            <a href={c.trackingUrlTemplate.replace('{tracking}', 'TEST')} target="_blank" rel="noreferrer" style={{ color: 'var(--brand-color)', fontSize: '0.75rem' }}>
                                                                لینک رهگیری
                                                            </a>
                                                        ) : '—'}
                                                    </td>
                                                    <td>
                                                        {cfgKeys.length > 0 ? (
                                                            <button className={styles.smallBtn} onClick={() => setExpandedId(expandedId === c._id ? null : c._id)}>
                                                                {cfgKeys.length} کانفیگ {expandedId === c._id ? '▲' : '▼'}
                                                            </button>
                                                        ) : '—'}
                                                    </td>
                                                    <td>{c.isDefault ? <span className={`${styles.badge} ${styles.badgeSuccess}`}>پیش‌فرض</span> : '—'}</td>
                                                    <td>
                                                        <span className={`${styles.badge} ${c.isActive ? styles.badgeSuccess : styles.badgeMuted}`}>
                                                            {c.isActive ? 'فعال' : 'غیرفعال'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div className={styles.cellActions}>
                                                            <button className={styles.smallBtn} onClick={() => openEdit(c)}>ویرایش</button>
                                                            <button className={styles.deleteBtn} onClick={() => handleDelete(c)}>حذف</button>
                                                        </div>
                                                    </td>
                                                </tr>
                                                {expandedId === c._id && (
                                                    <tr>
                                                        <td colSpan={7} style={{ background: 'rgba(0,0,0,0.02)' }}>
                                                            <div style={{ display: 'grid', gap: '0.3rem', padding: '0.5rem 0' }}>
                                                                {cfgKeys.map((k) => (
                                                                    <div key={k} className={styles.infoRow}>
                                                                        <span className={styles.infoLabel}>{k}</span>
                                                                        <span className={styles.infoValue} dir="ltr">
                                                                            {k.toLowerCase().includes('key') || k.toLowerCase().includes('password')
                                                                                ? '••••••••'
                                                                                : String(cfg[k])}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {showForm && (
                        <div className={styles.modalOverlay} onClick={() => setShowForm(false)}>
                            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                                <h3 className={styles.modalTitle}>{editId ? 'ویرایش شرکت حمل‌ونقل' : 'شرکت حمل‌ونقل جدید'}</h3>
                                <form onSubmit={handleSubmit}>
                                    <div className={styles.sectionCard} style={{ padding: '1rem', marginBottom: '1rem' }}>
                                        <h3 style={{ fontSize: '0.9rem' }}>اطلاعات پایه</h3>
                                        <div className={styles.formGrid}>
                                            <div className={styles.field}>
                                                <label>نام *</label>
                                                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                                            </div>
                                            <div className={styles.field}>
                                                <label>کد یکتا *</label>
                                                <input dir="ltr" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
                                                <span className={styles.fieldHint}>مثل post یا tipax</span>
                                            </div>
                                            <div className={styles.field}>
                                                <label>قالب لینک رهگیری</label>
                                                <input dir="ltr" placeholder="https://...?id={tracking}" value={form.trackingUrlTemplate} onChange={(e) => setForm({ ...form, trackingUrlTemplate: e.target.value })} />
                                                <span className={styles.fieldHint}>{'{tracking}'} جای کد رهگیری قرار می‌گیرد.</span>
                                            </div>
                                            <div className={styles.field}>
                                                <label>آدرس لوگو</label>
                                                <input dir="ltr" value={form.logoUrl} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className={styles.sectionCard} style={{ padding: '1rem', marginBottom: '1rem' }}>
                                        <h3 style={{ fontSize: '0.9rem' }}>اکانت و کانفیگ API</h3>
                                        <p className={styles.fieldHint} style={{ marginTop: 0 }}>
                                            اطلاعات اکانت خودتان در آن شرکت را وارد کنید — مرسوله‌ها از همین کانفیگ استفاده می‌کنند.
                                        </p>
                                        <div className={styles.formGrid}>
                                            <div className={styles.field}>
                                                <label>آدرس API</label>
                                                <input dir="ltr" value={form.apiUrl} onChange={(e) => setForm({ ...form, apiUrl: e.target.value })} />
                                            </div>
                                            <div className={styles.field}>
                                                <label>API Key</label>
                                                <input dir="ltr" value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} />
                                            </div>
                                            <div className={styles.field}>
                                                <label>شناسه پذیرنده (Merchant ID)</label>
                                                <input dir="ltr" value={form.merchantId} onChange={(e) => setForm({ ...form, merchantId: e.target.value })} />
                                            </div>
                                            <div className={styles.field}>
                                                <label>نام کاربری</label>
                                                <input dir="ltr" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
                                            </div>
                                            <div className={styles.field}>
                                                <label>رمز عبور</label>
                                                <input dir="ltr" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                                            </div>
                                        </div>

                                        {extraConfigs.map((row, index) => (
                                            <div key={index} className={styles.formGrid} style={{ alignItems: 'end' }}>
                                                <div className={styles.field}>
                                                    <label>نام کانفیگ</label>
                                                    <input dir="ltr" value={row.key} onChange={(e) => setExtraConfigs(extraConfigs.map((r, i) => (i === index ? { ...r, key: e.target.value } : r)))} />
                                                </div>
                                                <div className={styles.field}>
                                                    <label>مقدار</label>
                                                    <input dir="ltr" value={row.value} onChange={(e) => setExtraConfigs(extraConfigs.map((r, i) => (i === index ? { ...r, value: e.target.value } : r)))} />
                                                </div>
                                                <div className={styles.field} style={{ maxWidth: 90 }}>
                                                    <button type="button" className={styles.deleteBtn} onClick={() => setExtraConfigs(extraConfigs.filter((_, i) => i !== index))}>
                                                        حذف
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        <button type="button" className={styles.secondaryBtn} onClick={() => setExtraConfigs([...extraConfigs, { key: '', value: '' }])}>
                                            + کانفیگ دلخواه
                                        </button>
                                    </div>

                                    <div className={styles.formGrid}>
                                        <div className={styles.field}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                                <input type="checkbox" checked={form.supportsCod} onChange={(e) => setForm({ ...form, supportsCod: e.target.checked })} />
                                                پشتیبانی پرداخت در محل (COD)
                                            </label>
                                        </div>
                                        <div className={styles.field}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                                <input type="checkbox" checked={form.rateApiEnabled} onChange={(e) => setForm({ ...form, rateApiEnabled: e.target.checked })} />
                                                محاسبه خودکار هزینه از API شرکت
                                            </label>
                                        </div>
                                        <div className={styles.field}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                                <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} />
                                                شرکت پیش‌فرض
                                            </label>
                                        </div>
                                        <div className={styles.field}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                                                فعال
                                            </label>
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
