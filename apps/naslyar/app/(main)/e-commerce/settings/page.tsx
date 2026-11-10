'use client';

import ModuleGuide from '../components/ModuleGuide';
import { ECOMMERCE_GUIDES } from '../components/guides';

import React, { useCallback, useEffect, useState } from 'react';
import { Container, Wrapper } from '@/app/(main)/layout';
import { LoadingState } from '@my-workspace/components';
import { ErrorToaster, SuccessToaster, toFarsiNumber } from '@my-workspace/utils';
import styles from '../Ecommerce.module.scss';
import { fetchEcommerceSettings, fetchWarehouses, updateEcommerceSettings } from '../e-commerce-api';
import { EcSettings, EcWarehouse } from '../e-commerce.types';

export default function EcommerceSettingsPage() {
    const [settings, setSettings] = useState<EcSettings | null>(null);
    const [warehouses, setWarehouses] = useState<EcWarehouse[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const [settingsRes, warehousesRes] = await Promise.all([
                fetchEcommerceSettings() as any,
                fetchWarehouses() as any,
            ]);
            setSettings(settingsRes || null);
            setWarehouses(warehousesRes?.warehouses || []);
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
        if (!settings) return;
        try {
            setSaving(true);
            await updateEcommerceSettings(settings);
            SuccessToaster({ message: 'تنظیمات ذخیره شد' });
        } catch (error) {
            ErrorToaster(error);
        } finally {
            setSaving(false);
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

    return (
        <Container>
            <Wrapper>
                <div className={`${styles.container} ${styles.rtl}`}>
                    <header className={styles.header}>
                        <div>
                            <h1 className={styles.mainTitle}>تنظیمات فروشگاه</h1>
                            <p className={styles.subtitle}>
                                مالیات ارزش افزوده، شماره‌گذاری سفارش‌ها، واحد پول و قوانین رزرو موجودی
                            </p>
                        </div>
                    </header>

                    <ModuleGuide guide={ECOMMERCE_GUIDES.settings} />

                    <form onSubmit={handleSubmit}>
                        <div className={styles.sectionCard}>
                            <h3>مالیات (لایه ایران)</h3>
                            <div className={styles.formGrid}>
                                <div className={styles.field}>
                                    <label>مالیات ارزش افزوده (٪)</label>
                                    <input
                                        dir="ltr"
                                        type="number"
                                        value={settings?.vatPercent ?? 9}
                                        onChange={(e) => setSettings({ ...settings, vatPercent: Number(e.target.value) })}
                                    />
                                    <span className={styles.fieldHint}>نرخ استاندارد فعلی ایران ۹٪ است.</span>
                                </div>
                                <div className={styles.field}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={settings?.taxEnabled !== false}
                                            onChange={(e) => setSettings({ ...settings, taxEnabled: e.target.checked })}
                                        />
                                        اعمال مالیات روی سفارش‌ها
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className={styles.sectionCard}>
                            <h3>شماره‌گذاری سفارش</h3>
                            <div className={styles.formGrid}>
                                <div className={styles.field}>
                                    <label>پیشوند شماره سفارش</label>
                                    <input
                                        dir="ltr"
                                        value={settings?.orderNumberPrefix || 'IR'}
                                        onChange={(e) => setSettings({ ...settings, orderNumberPrefix: e.target.value })}
                                    />
                                </div>
                                <div className={styles.field}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={settings?.orderNumberIncludeJalaliYear !== false}
                                            onChange={(e) => setSettings({ ...settings, orderNumberIncludeJalaliYear: e.target.checked })}
                                        />
                                        درج سال شمسی (مثل IR-1405-000001)
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className={styles.sectionCard}>
                            <h3>انبار و موجودی</h3>
                            <div className={styles.formGrid}>
                                <div className={styles.field}>
                                    <label>انبار پیش‌فرض</label>
                                    <select
                                        value={(settings?.defaultWarehouseId as string) || ''}
                                        onChange={(e) => setSettings({ ...settings, defaultWarehouseId: e.target.value || null })}
                                    >
                                        <option value="">انتخاب انبار</option>
                                        {warehouses.map((w) => (
                                            <option key={w._id} value={w._id}>{w.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className={styles.field}>
                                    <label>آستانه هشدار کمبود موجودی</label>
                                    <input
                                        dir="ltr"
                                        type="number"
                                        value={settings?.lowStockThreshold ?? 3}
                                        onChange={(e) => setSettings({ ...settings, lowStockThreshold: Number(e.target.value) })}
                                    />
                                </div>
                                <div className={styles.field}>
                                    <label>مدت اعتبار رزرو موجودی (دقیقه)</label>
                                    <input
                                        dir="ltr"
                                        type="number"
                                        value={settings?.reservationTtlMinutes ?? 120}
                                        onChange={(e) => setSettings({ ...settings, reservationTtlMinutes: Number(e.target.value) })}
                                    />
                                    <span className={styles.fieldHint}>
                                        پس از ثبت سفارش، موجودی به مدت {toFarsiNumber(settings?.reservationTtlMinutes ?? 120)} دقیقه رزرو می‌شود.
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className={styles.sectionCard}>
                            <h3>خرید مهمان</h3>
                            <div className={styles.field}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={settings?.guestCheckoutEnabled !== false}
                                        onChange={(e) => setSettings({ ...settings, guestCheckoutEnabled: e.target.checked })}
                                    />
                                    امکان ثبت سفارش بدون ثبت‌نام
                                </label>
                            </div>
                        </div>

                        <div className={styles.formActions}>
                            <button type="submit" className={styles.primaryBtn} disabled={saving}>
                                {saving ? 'در حال ذخیره...' : 'ذخیره تنظیمات'}
                            </button>
                        </div>
                    </form>
                </div>
            </Wrapper>
        </Container>
    );
}
