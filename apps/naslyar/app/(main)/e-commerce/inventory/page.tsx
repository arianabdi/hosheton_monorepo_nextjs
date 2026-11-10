'use client';

import ModuleGuide from '../components/ModuleGuide';
import { ECOMMERCE_GUIDES } from '../components/guides';

import React, { useCallback, useEffect, useState } from 'react';
import { Container, Wrapper } from '@/app/(main)/layout';
import { LoadingState } from '@my-workspace/components';
import { ErrorToaster, SuccessToaster, toFarsiNumber } from '@my-workspace/utils';
import styles from '../Ecommerce.module.scss';
import {
    adjustInventory,
    createWarehouse,
    deleteWarehouse,
    fetchInventoryLevels,
    fetchInventoryTransactions,
    fetchWarehouses,
    updateWarehouse,
} from '../e-commerce-api';
import { EcInventoryLevel, EcInventoryTransaction, EcWarehouse, formatToman } from '../e-commerce.types';

type Tab = 'levels' | 'transactions' | 'warehouses';

const TRANSACTION_TYPE_LABELS: Record<string, string> = {
    purchase: 'ورود کالا',
    sale: 'فروش',
    return: 'مرجوعی',
    adjustment: 'اصلاح دستی',
    transfer: 'انتقال بین انبار',
    reservation: 'رزرو',
    release: 'آزادسازی رزرو',
};

const EMPTY_WAREHOUSE = { name: '', code: '', city: '', address: '', phone: '', isDefault: false };

export default function InventoryPage() {
    const [tab, setTab] = useState<Tab>('levels');
    const [levels, setLevels] = useState<EcInventoryLevel[]>([]);
    const [transactions, setTransactions] = useState<EcInventoryTransaction[]>([]);
    const [warehouses, setWarehouses] = useState<EcWarehouse[]>([]);
    const [loading, setLoading] = useState(true);
    const [warehouseFilter, setWarehouseFilter] = useState('');

    // فرم ثبت انبار
    const [showWarehouseForm, setShowWarehouseForm] = useState(false);
    const [editWarehouseId, setEditWarehouseId] = useState<string | null>(null);
    const [warehouseForm, setWarehouseForm] = useState({ ...EMPTY_WAREHOUSE });

    // فرم اصلاح موجودی
    const [showAdjust, setShowAdjust] = useState(false);
    const [adjustForm, setAdjustForm] = useState({ variantId: '', warehouseId: '', quantity: '', type: 'purchase', note: '' });

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const [levelsRes, transactionsRes, warehousesRes] = await Promise.all([
                fetchInventoryLevels(warehouseFilter ? { warehouseId: warehouseFilter } : undefined) as any,
                fetchInventoryTransactions() as any,
                fetchWarehouses() as any,
            ]);
            setLevels(levelsRes?.levels || []);
            setTransactions(transactionsRes?.transactions || []);
            setWarehouses(warehousesRes?.warehouses || []);
        } catch (error) {
            ErrorToaster(error);
        } finally {
            setLoading(false);
        }
    }, [warehouseFilter]);

    useEffect(() => {
        load();
    }, [load]);

    const handleAdjust = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await adjustInventory({
                variantId: adjustForm.variantId,
                warehouseId: adjustForm.warehouseId,
                quantity: Number(adjustForm.quantity) || 0,
                type: adjustForm.type,
                note: adjustForm.note,
            });
            SuccessToaster({ message: 'موجودی بروزرسانی شد' });
            setShowAdjust(false);
            setTab('levels');
            load();
        } catch (error) {
            ErrorToaster(error);
        }
    };

    const handleWarehouseSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editWarehouseId) {
                await updateWarehouse(editWarehouseId, warehouseForm);
                SuccessToaster({ message: 'انبار بروزرسانی شد' });
            } else {
                await createWarehouse(warehouseForm);
                SuccessToaster({ message: 'انبار ساخته شد' });
            }
            setShowWarehouseForm(false);
            setEditWarehouseId(null);
            setWarehouseForm({ ...EMPTY_WAREHOUSE });
            load();
        } catch (error) {
            ErrorToaster(error);
        }
    };

    const handleDeleteWarehouse = async (warehouse: EcWarehouse) => {
        if (!window.confirm(`انبار «${warehouse.name}» حذف شود؟`)) return;
        try {
            await deleteWarehouse(warehouse._id);
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
                            <h1 className={styles.mainTitle}>انبار و موجودی</h1>
                            <p className={styles.subtitle}>
                                مدیریت چند انباره با دفتر تراکنش — هر تغییر موجودی به صورت تراکنش ثبت می‌شود
                            </p>
                        </div>
                        <button
                            className={styles.primaryBtn}
                            onClick={() => {
                                setAdjustForm({ variantId: '', warehouseId: warehouseFilter || '', quantity: '', type: 'purchase', note: '' });
                                setShowAdjust(true);
                            }}
                        >
                            + ثبت ورود / خروج کالا
                        </button>
                    </header>

                    <ModuleGuide guide={ECOMMERCE_GUIDES.inventory} />

                    <div className={styles.tabs}>
                        <button className={`${styles.tab} ${tab === 'levels' ? styles.active : ''}`} onClick={() => setTab('levels')}>
                            موجودی انبار
                        </button>
                        <button className={`${styles.tab} ${tab === 'transactions' ? styles.active : ''}`} onClick={() => setTab('transactions')}>
                            دفتر تراکنش‌ها
                        </button>
                        <button className={`${styles.tab} ${tab === 'warehouses' ? styles.active : ''}`} onClick={() => setTab('warehouses')}>
                            انبارها
                        </button>
                    </div>

                    {loading ? (
                        <LoadingState />
                    ) : (
                        <>
                            {tab === 'levels' && (
                                <div className={styles.tableWrap}>
                                    <table className={styles.dataTable}>
                                        <thead>
                                            <tr>
                                                <th>محصول</th>
                                                <th>SKU</th>
                                                <th>انبار</th>
                                                <th>موجودی</th>
                                                <th>رزرو شده</th>
                                                <th>قابل فروش</th>
                                                <th>وضعیت</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {levels.map((level) => {
                                                const available = (level.quantity || 0) - (level.reserved || 0);
                                                return (
                                                    <tr key={level._id}>
                                                        <td style={{ fontWeight: 600 }}>{(level as any).productTitle || '—'}</td>
                                                        <td className={styles.cellLtr}>{level.sku || level.variantId}</td>
                                                        <td>{level.warehouseName || '—'}</td>
                                                        <td>{toFarsiNumber(level.quantity || 0)}</td>
                                                        <td>{toFarsiNumber(level.reserved || 0)}</td>
                                                        <td style={{ fontWeight: 700 }}>{toFarsiNumber(available)}</td>
                                                        <td>
                                                            <span className={`${styles.badge} ${available <= 0 ? styles.badgeDanger : available <= (level.lowStockThreshold ?? 3) ? styles.badgeWarning : styles.badgeSuccess}`}>
                                                                {available <= 0 ? 'ناموجود' : available <= (level.lowStockThreshold ?? 3) ? 'کمبود موجودی' : 'مناسب'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {levels.length === 0 && (
                                                <tr>
                                                    <td colSpan={7} style={{ textAlign: 'center' }}>رکوردی یافت نشد.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {tab === 'transactions' && (
                                <div className={styles.tableWrap}>
                                    <table className={styles.dataTable}>
                                        <thead>
                                            <tr>
                                                <th>نوع</th>
                                                <th>SKU</th>
                                                <th>تغییر</th>
                                                <th>مانده پس از تراکنش</th>
                                                <th>توضیح</th>
                                                <th>تاریخ</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {transactions.map((t) => (
                                                <tr key={t._id}>
                                                    <td>{TRANSACTION_TYPE_LABELS[t.type] || t.type}</td>
                                                    <td className={styles.cellLtr}>{(t as any).sku || t.variantId}</td>
                                                    <td style={{ color: (t.quantity || 0) >= 0 ? '#15803d' : '#dc2626', fontWeight: 700 }}>
                                                        {(t.quantity || 0) >= 0 ? '+' : ''}{toFarsiNumber(t.quantity || 0)}
                                                    </td>
                                                    <td>{toFarsiNumber(t.balanceAfter || 0)}</td>
                                                    <td>{t.note || '—'}</td>
                                                    <td>{toFarsiNumber(new Date(t.createdAt || '').toLocaleDateString('fa-IR'))}</td>
                                                </tr>
                                            ))}
                                            {transactions.length === 0 && (
                                                <tr>
                                                    <td colSpan={6} style={{ textAlign: 'center' }}>تراکنشی ثبت نشده است.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {tab === 'warehouses' && (
                                <>
                                    <div className={styles.toolbar} style={{ justifyContent: 'flex-start' }}>
                                        <button
                                            className={styles.primaryBtn}
                                            onClick={() => {
                                                setWarehouseForm({ ...EMPTY_WAREHOUSE });
                                                setEditWarehouseId(null);
                                                setShowWarehouseForm(true);
                                            }}
                                        >
                                            + افزودن انبار
                                        </button>
                                    </div>
                                    <div className={styles.tableWrap}>
                                        <table className={styles.dataTable}>
                                            <thead>
                                                <tr>
                                                    <th>نام</th>
                                                    <th>کد</th>
                                                    <th>شهر</th>
                                                    <th>تلفن</th>
                                                    <th>پیش‌فرض</th>
                                                    <th>عملیات</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {warehouses.map((w) => (
                                                    <tr key={w._id}>
                                                        <td style={{ fontWeight: 600 }}>{w.name}</td>
                                                        <td className={styles.cellLtr}>{w.code}</td>
                                                        <td>{w.city || '—'}</td>
                                                        <td className={styles.cellLtr}>{w.phone || '—'}</td>
                                                        <td>
                                                            {w.isDefault ? (
                                                                <span className={`${styles.badge} ${styles.badgeSuccess}`}>پیش‌فرض</span>
                                                            ) : (
                                                                '—'
                                                            )}
                                                        </td>
                                                        <td>
                                                            <div className={styles.cellActions}>
                                                                <button
                                                                    className={styles.smallBtn}
                                                                    onClick={() => {
                                                                        setWarehouseForm({
                                                                            name: w.name || '',
                                                                            code: w.code || '',
                                                                            city: w.city || '',
                                                                            address: w.address || '',
                                                                            phone: w.phone || '',
                                                                            isDefault: !!w.isDefault,
                                                                        });
                                                                        setEditWarehouseId(w._id);
                                                                        setShowWarehouseForm(true);
                                                                    }}
                                                                >
                                                                    ویرایش
                                                                </button>
                                                                <button className={styles.deleteBtn} onClick={() => handleDeleteWarehouse(w)}>حذف</button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {warehouses.length === 0 && (
                                                    <tr>
                                                        <td colSpan={6} style={{ textAlign: 'center' }}>انباری ثبت نشده است.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}
                        </>
                    )}

                    {/* مودال اصلاح موجودی */}
                    {showAdjust && (
                        <div className={styles.modalOverlay} onClick={() => setShowAdjust(false)}>
                            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                                <h3 className={styles.modalTitle}>ثبت ورود / خروج کالا</h3>
                                <form onSubmit={handleAdjust}>
                                    <div className={styles.field}>
                                        <label>شناسه واریانت (Variant ID) *</label>
                                        <input dir="ltr" value={adjustForm.variantId} onChange={(e) => setAdjustForm({ ...adjustForm, variantId: e.target.value })} required />
                                        <span className={styles.fieldHint}>شناسه واریانت محصول را از صفحه ویرایش محصول کپی کنید.</span>
                                    </div>
                                    <div className={styles.formGrid}>
                                        <div className={styles.field}>
                                            <label>انبار *</label>
                                            <select value={adjustForm.warehouseId} onChange={(e) => setAdjustForm({ ...adjustForm, warehouseId: e.target.value })} required>
                                                <option value="">انتخاب انبار</option>
                                                {warehouses.map((w) => (
                                                    <option key={w._id} value={w._id}>{w.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className={styles.field}>
                                            <label>تعداد (مثبت = ورود، منفی = خروج) *</label>
                                            <input dir="ltr" type="number" value={adjustForm.quantity} onChange={(e) => setAdjustForm({ ...adjustForm, quantity: e.target.value })} required />
                                        </div>
                                        <div className={styles.field}>
                                            <label>نوع تراکنش</label>
                                            <select value={adjustForm.type} onChange={(e) => setAdjustForm({ ...adjustForm, type: e.target.value })}>
                                                <option value="purchase">ورود کالا</option>
                                                <option value="adjustment">اصلاح دستی</option>
                                                <option value="return">مرجوعی</option>
                                            </select>
                                        </div>
                                        <div className={styles.field}>
                                            <label>توضیح</label>
                                            <input value={adjustForm.note} onChange={(e) => setAdjustForm({ ...adjustForm, note: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className={styles.formActions}>
                                        <button type="submit" className={styles.primaryBtn}>ثبت تراکنش</button>
                                        <button type="button" className={styles.secondaryBtn} onClick={() => setShowAdjust(false)}>انصراف</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* مودال انبار */}
                    {showWarehouseForm && (
                        <div className={styles.modalOverlay} onClick={() => setShowWarehouseForm(false)}>
                            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                                <h3 className={styles.modalTitle}>{editWarehouseId ? 'ویرایش انبار' : 'انبار جدید'}</h3>
                                <form onSubmit={handleWarehouseSubmit}>
                                    <div className={styles.formGrid}>
                                        <div className={styles.field}>
                                            <label>نام *</label>
                                            <input value={warehouseForm.name} onChange={(e) => setWarehouseForm({ ...warehouseForm, name: e.target.value })} required />
                                        </div>
                                        <div className={styles.field}>
                                            <label>کد *</label>
                                            <input dir="ltr" value={warehouseForm.code} onChange={(e) => setWarehouseForm({ ...warehouseForm, code: e.target.value })} required />
                                        </div>
                                        <div className={styles.field}>
                                            <label>شهر</label>
                                            <input value={warehouseForm.city} onChange={(e) => setWarehouseForm({ ...warehouseForm, city: e.target.value })} />
                                        </div>
                                        <div className={styles.field}>
                                            <label>تلفن</label>
                                            <input dir="ltr" value={warehouseForm.phone} onChange={(e) => setWarehouseForm({ ...warehouseForm, phone: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className={styles.field}>
                                        <label>آدرس</label>
                                        <textarea value={warehouseForm.address} onChange={(e) => setWarehouseForm({ ...warehouseForm, address: e.target.value })} />
                                    </div>
                                    <div className={styles.field}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                checked={warehouseForm.isDefault}
                                                onChange={(e) => setWarehouseForm({ ...warehouseForm, isDefault: e.target.checked })}
                                            />
                                            انبار پیش‌فرض فروشگاه
                                        </label>
                                    </div>
                                    <div className={styles.formActions}>
                                        <button type="submit" className={styles.primaryBtn}>ذخیره</button>
                                        <button type="button" className={styles.secondaryBtn} onClick={() => setShowWarehouseForm(false)}>انصراف</button>
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
