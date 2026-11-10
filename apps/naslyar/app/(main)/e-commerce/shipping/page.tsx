'use client';

import ModuleGuide from '../components/ModuleGuide';
import { ECOMMERCE_GUIDES } from '../components/guides';

import React, { useCallback, useEffect, useState } from 'react';
import { Container, Wrapper } from '@/app/(main)/layout';
import { LoadingState } from '@my-workspace/components';
import { ErrorToaster, SuccessToaster, toFarsiNumber } from '@my-workspace/utils';
import styles from '../Ecommerce.module.scss';
import {
    createShippingMethod,
    createShippingZone,
    deleteShippingMethod,
    deleteShippingZone,
    fetchShippingMethods,
    fetchShippingZones,
    updateShippingMethod,
    updateShippingZone,
} from '../e-commerce-api';
import { EcShippingMethod, EcShippingZone, SHIPPING_METHOD_TYPE_LABELS, formatToman } from '../e-commerce.types';

type Tab = 'zones' | 'methods';

const EMPTY_ZONE = { name: '', provinces: '', cities: '', postalCodePrefixes: '', isActive: true };
const EMPTY_METHOD = {
    name: '',
    zoneId: '',
    type: 'flat',
    baseCost: '',
    perUnitCost: '',
    freeAbove: '',
    estimatedDays: '',
    isActive: true,
};

export default function ShippingPage() {
    const [tab, setTab] = useState<Tab>('zones');
    const [zones, setZones] = useState<EcShippingZone[]>([]);
    const [methods, setMethods] = useState<EcShippingMethod[]>([]);
    const [loading, setLoading] = useState(true);

    const [showZoneForm, setShowZoneForm] = useState(false);
    const [editZoneId, setEditZoneId] = useState<string | null>(null);
    const [zoneForm, setZoneForm] = useState({ ...EMPTY_ZONE });

    const [showMethodForm, setShowMethodForm] = useState(false);
    const [editMethodId, setEditMethodId] = useState<string | null>(null);
    const [methodForm, setMethodForm] = useState({ ...EMPTY_METHOD });

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const [zonesRes, methodsRes] = await Promise.all([
                fetchShippingZones() as any,
                fetchShippingMethods() as any,
            ]);
            setZones(zonesRes?.zones || []);
            setMethods(methodsRes?.methods || []);
        } catch (error) {
            ErrorToaster(error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const zoneName = (zoneId?: string) => zones.find((z) => z._id === zoneId)?.name || '—';

    const handleZoneSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const body = {
                name: zoneForm.name,
                provinces: zoneForm.provinces.split('،').map((s) => s.trim()).filter(Boolean),
                cities: zoneForm.cities.split('،').map((s) => s.trim()).filter(Boolean),
                postalCodePrefixes: zoneForm.postalCodePrefixes.split('،').map((s) => s.trim()).filter(Boolean),
                isActive: zoneForm.isActive,
            };
            if (editZoneId) {
                await updateShippingZone(editZoneId, body);
                SuccessToaster({ message: 'ناحیه بروزرسانی شد' });
            } else {
                await createShippingZone(body);
                SuccessToaster({ message: 'ناحیه ارسال ساخته شد' });
            }
            setShowZoneForm(false);
            load();
        } catch (error) {
            ErrorToaster(error);
        }
    };

    const handleMethodSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const body = {
                ...methodForm,
                baseCost: Number(methodForm.baseCost) || 0,
                perUnitCost: Number(methodForm.perUnitCost) || 0,
                freeAbove: Number(methodForm.freeAbove) || 0,
                estimatedDays: Number(methodForm.estimatedDays) || 0,
            };
            if (editMethodId) {
                await updateShippingMethod(editMethodId, body);
                SuccessToaster({ message: 'روش ارسال بروزرسانی شد' });
            } else {
                await createShippingMethod(body);
                SuccessToaster({ message: 'روش ارسال ساخته شد' });
            }
            setShowMethodForm(false);
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
                            <h1 className={styles.mainTitle}>ارسال</h1>
                            <p className={styles.subtitle}>نواحی ارسال (استان/شهر/کدپستی) و روش‌های هزینه‌یابی</p>
                        </div>
                        <button
                            className={styles.primaryBtn}
                            onClick={() => {
                                if (tab === 'zones') {
                                    setZoneForm({ ...EMPTY_ZONE });
                                    setEditZoneId(null);
                                    setShowZoneForm(true);
                                } else {
                                    setMethodForm({ ...EMPTY_METHOD, zoneId: zones[0]?._id || '' });
                                    setEditMethodId(null);
                                    setShowMethodForm(true);
                                }
                            }}
                        >
                            {tab === 'zones' ? '+ ناحیه جدید' : '+ روش جدید'}
                        </button>
                    </header>

                    <ModuleGuide guide={ECOMMERCE_GUIDES.shipping} />

                    <div className={styles.tabs}>
                        <button className={`${styles.tab} ${tab === 'zones' ? styles.active : ''}`} onClick={() => setTab('zones')}>
                            نواحی ارسال
                        </button>
                        <button className={`${styles.tab} ${tab === 'methods' ? styles.active : ''}`} onClick={() => setTab('methods')}>
                            روش‌های ارسال
                        </button>
                    </div>

                    {loading ? (
                        <LoadingState />
                    ) : tab === 'zones' ? (
                        <div className={styles.tableWrap}>
                            <table className={styles.dataTable}>
                                <thead>
                                    <tr>
                                        <th>نام</th>
                                        <th>استان‌ها</th>
                                        <th>شهرها</th>
                                        <th>پیشوند کدپستی</th>
                                        <th>وضعیت</th>
                                        <th>عملیات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {zones.map((zone) => (
                                        <tr key={zone._id}>
                                            <td style={{ fontWeight: 600 }}>{zone.name}</td>
                                            <td>{(zone.provinces || []).join('، ') || '—'}</td>
                                            <td>{(zone.cities || []).join('، ') || '—'}</td>
                                            <td className={styles.cellLtr}>{(zone.postalCodePrefixes || []).join('، ') || '—'}</td>
                                            <td>
                                                <span className={`${styles.badge} ${zone.isActive ? styles.badgeSuccess : styles.badgeMuted}`}>
                                                    {zone.isActive ? 'فعال' : 'غیرفعال'}
                                                </span>
                                            </td>
                                            <td>
                                                <div className={styles.cellActions}>
                                                    <button
                                                        className={styles.smallBtn}
                                                        onClick={() => {
                                                            setZoneForm({
                                                                name: zone.name || '',
                                                                provinces: (zone.provinces || []).join('، '),
                                                                cities: (zone.cities || []).join('، '),
                                                                postalCodePrefixes: (zone.postalCodePrefixes || []).join('، '),
                                                                isActive: zone.isActive !== false,
                                                            });
                                                            setEditZoneId(zone._id);
                                                            setShowZoneForm(true);
                                                        }}
                                                    >
                                                        ویرایش
                                                    </button>
                                                    <button
                                                        className={styles.deleteBtn}
                                                        onClick={async () => {
                                                            if (!window.confirm(`ناحیه «${zone.name}» حذف شود؟`)) return;
                                                            try {
                                                                await deleteShippingZone(zone._id);
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
                                    {zones.length === 0 && (
                                        <tr>
                                            <td colSpan={6} style={{ textAlign: 'center' }}>ناحیه‌ای ثبت نشده است.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className={styles.tableWrap}>
                            <table className={styles.dataTable}>
                                <thead>
                                    <tr>
                                        <th>نام</th>
                                        <th>ناحیه</th>
                                        <th>نوع</th>
                                        <th>هزینه پایه</th>
                                        <th>رایگان بالای</th>
                                        <th>زمان تحویل</th>
                                        <th>وضعیت</th>
                                        <th>عملیات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {methods.map((method) => (
                                        <tr key={method._id}>
                                            <td style={{ fontWeight: 600 }}>{method.name}</td>
                                            <td>{zoneName(method.zoneId)}</td>
                                            <td>{SHIPPING_METHOD_TYPE_LABELS[method.type]}</td>
                                            <td>{formatToman(method.baseCost)}</td>
                                            <td>{method.freeAbove ? formatToman(method.freeAbove) : '—'}</td>
                                            <td>{method.estimatedDays ? `${toFarsiNumber(method.estimatedDays)} روز` : '—'}</td>
                                            <td>
                                                <span className={`${styles.badge} ${method.isActive ? styles.badgeSuccess : styles.badgeMuted}`}>
                                                    {method.isActive ? 'فعال' : 'غیرفعال'}
                                                </span>
                                            </td>
                                            <td>
                                                <div className={styles.cellActions}>
                                                    <button
                                                        className={styles.smallBtn}
                                                        onClick={() => {
                                                            setMethodForm({
                                                                name: method.name || '',
                                                                zoneId: method.zoneId || '',
                                                                type: method.type,
                                                                baseCost: String(method.baseCost ?? ''),
                                                                perUnitCost: String(method.perUnitCost ?? ''),
                                                                freeAbove: String(method.freeAbove ?? ''),
                                                                estimatedDays: String(method.estimatedDays ?? ''),
                                                                isActive: method.isActive !== false,
                                                            });
                                                            setEditMethodId(method._id);
                                                            setShowMethodForm(true);
                                                        }}
                                                    >
                                                        ویرایش
                                                    </button>
                                                    <button
                                                        className={styles.deleteBtn}
                                                        onClick={async () => {
                                                            if (!window.confirm(`روش «${method.name}» حذف شود؟`)) return;
                                                            try {
                                                                await deleteShippingMethod(method._id);
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
                                    {methods.length === 0 && (
                                        <tr>
                                            <td colSpan={8} style={{ textAlign: 'center' }}>روش ارسالی ثبت نشده است.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* مودال ناحیه */}
                    {showZoneForm && (
                        <div className={styles.modalOverlay} onClick={() => setShowZoneForm(false)}>
                            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                                <h3 className={styles.modalTitle}>{editZoneId ? 'ویرایش ناحیه' : 'ناحیه ارسال جدید'}</h3>
                                <form onSubmit={handleZoneSubmit}>
                                    <div className={styles.field}>
                                        <label>نام *</label>
                                        <input value={zoneForm.name} onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })} required />
                                    </div>
                                    <div className={styles.field}>
                                        <label>استان‌ها (با «،» جدا کنید)</label>
                                        <input value={zoneForm.provinces} onChange={(e) => setZoneForm({ ...zoneForm, provinces: e.target.value })} placeholder="تهران، البرز" />
                                    </div>
                                    <div className={styles.field}>
                                        <label>شهرها</label>
                                        <input value={zoneForm.cities} onChange={(e) => setZoneForm({ ...zoneForm, cities: e.target.value })} placeholder="کرج، مهرشهر" />
                                    </div>
                                    <div className={styles.field}>
                                        <label>پیشوندهای کدپستی</label>
                                        <input dir="ltr" value={zoneForm.postalCodePrefixes} onChange={(e) => setZoneForm({ ...zoneForm, postalCodePrefixes: e.target.value })} placeholder="1493, 1494" />
                                    </div>
                                    <div className={styles.formActions}>
                                        <button type="submit" className={styles.primaryBtn}>ذخیره</button>
                                        <button type="button" className={styles.secondaryBtn} onClick={() => setShowZoneForm(false)}>انصراف</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* مودال روش ارسال */}
                    {showMethodForm && (
                        <div className={styles.modalOverlay} onClick={() => setShowMethodForm(false)}>
                            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                                <h3 className={styles.modalTitle}>{editMethodId ? 'ویرایش روش ارسال' : 'روش ارسال جدید'}</h3>
                                <form onSubmit={handleMethodSubmit}>
                                    <div className={styles.formGrid}>
                                        <div className={styles.field}>
                                            <label>نام *</label>
                                            <input value={methodForm.name} onChange={(e) => setMethodForm({ ...methodForm, name: e.target.value })} required />
                                        </div>
                                        <div className={styles.field}>
                                            <label>ناحیه *</label>
                                            <select value={methodForm.zoneId} onChange={(e) => setMethodForm({ ...methodForm, zoneId: e.target.value })} required>
                                                <option value="">انتخاب ناحیه</option>
                                                {zones.map((z) => (
                                                    <option key={z._id} value={z._id}>{z.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className={styles.field}>
                                            <label>نوع هزینه‌یابی</label>
                                            <select value={methodForm.type} onChange={(e) => setMethodForm({ ...methodForm, type: e.target.value })}>
                                                {(Object.keys(SHIPPING_METHOD_TYPE_LABELS) as EcShippingMethod['type'][]).map((t) => (
                                                    <option key={t} value={t}>{SHIPPING_METHOD_TYPE_LABELS[t]}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className={styles.field}>
                                            <label>هزینه پایه (تومان)</label>
                                            <input dir="ltr" inputMode="numeric" value={methodForm.baseCost} onChange={(e) => setMethodForm({ ...methodForm, baseCost: e.target.value })} />
                                        </div>
                                        {methodForm.type === 'weight_based' && (
                                            <div className={styles.field}>
                                                <label>هزینه هر کیلوگرم اضافه (تومان)</label>
                                                <input dir="ltr" inputMode="numeric" value={methodForm.perUnitCost} onChange={(e) => setMethodForm({ ...methodForm, perUnitCost: e.target.value })} />
                                            </div>
                                        )}
                                        <div className={styles.field}>
                                            <label>ارسال رایگان بالای (تومان)</label>
                                            <input dir="ltr" inputMode="numeric" value={methodForm.freeAbove} onChange={(e) => setMethodForm({ ...methodForm, freeAbove: e.target.value })} />
                                        </div>
                                        <div className={styles.field}>
                                            <label>زمان تحویل تخمینی (روز)</label>
                                            <input dir="ltr" type="number" value={methodForm.estimatedDays} onChange={(e) => setMethodForm({ ...methodForm, estimatedDays: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className={styles.formActions}>
                                        <button type="submit" className={styles.primaryBtn}>ذخیره</button>
                                        <button type="button" className={styles.secondaryBtn} onClick={() => setShowMethodForm(false)}>انصراف</button>
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
