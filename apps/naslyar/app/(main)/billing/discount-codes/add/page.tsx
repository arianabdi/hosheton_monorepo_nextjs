'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import styles from '../../Billing.module.scss';
import { Container, Wrapper, FormCard } from '@/app/(main)/layout';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';

export default function AddDiscountCodePage() {
    const router = useRouter();
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const [plans, setPlans] = useState<any[]>([]);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        code: '',
        description: '',
        planId: '',
        discountType: 'percent' as 'percent' | 'fixed',
        discountValue: 10,
        maxUses: '',
        minAmount: 0,
        expiresAt: '',
        isActive: true,
    });

    useEffect(() => {
        if (!token) return;
        axios.get(`${baseUrl}/api/subscription/plans`, {
            headers: { authorization: `Bearer ${token}` },
        }).then(res => {
            if (res.data.statusCode === 200) setPlans(res.data.data || []);
        }).catch(() => {});
    }, [token, baseUrl]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;
        try {
            setSaving(true);
            await axios.post(`${baseUrl}/api/billing/discount-codes`, {
                code: form.code,
                description: form.description,
                planId: form.planId || null,
                discountType: form.discountType,
                discountValue: Number(form.discountValue),
                maxUses: form.maxUses ? Number(form.maxUses) : undefined,
                minAmount: Number(form.minAmount) || 0,
                expiresAt: form.expiresAt || undefined,
                isActive: form.isActive,
            }, { headers: { authorization: `Bearer ${token}` } });

            SuccessToaster({ message: 'کد تخفیف ایجاد شد' });
            router.push('/billing/discount-codes');
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Container>
            <Wrapper>
                <FormCard className={styles.rtl}>
                    <h1 className={styles.mainTitle}>افزودن کد تخفیف</h1>
                    <p className={styles.subtitle}>پلن را خالی بگذارید تا کد روی همه فاکتورها (از جمله غیر اشتراکی) اعمال شود.</p>

                    <form className={styles.form} onSubmit={handleSubmit}>
                        <div className={styles.field}>
                            <label>کد تخفیف *</label>
                            <input required value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="OFF30" />
                        </div>
                        <div className={styles.field}>
                            <label>توضیح</label>
                            <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                        </div>
                        <div className={styles.row}>
                            <div className={styles.field}>
                                <label>نوع تخفیف</label>
                                <select value={form.discountType} onChange={e => setForm({ ...form, discountType: e.target.value as any })}>
                                    <option value="percent">درصدی</option>
                                    <option value="fixed">مبلغ ثابت (تومان)</option>
                                </select>
                            </div>
                            <div className={styles.field}>
                                <label>مقدار</label>
                                <input type="number" required min={1} value={form.discountValue} onChange={e => setForm({ ...form, discountValue: Number(e.target.value) })} />
                            </div>
                        </div>
                        <div className={styles.field}>
                            <label>محدود به پلن (اختیاری)</label>
                            <select value={form.planId} onChange={e => setForm({ ...form, planId: e.target.value })}>
                                <option value="">— عمومی (همه فاکتورها) —</option>
                                {plans.map(p => (
                                    <option key={p._id} value={p._id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className={styles.row}>
                            <div className={styles.field}>
                                <label>حداکثر استفاده (خالی = نامحدود)</label>
                                <input type="number" min={1} value={form.maxUses} onChange={e => setForm({ ...form, maxUses: e.target.value })} />
                            </div>
                            <div className={styles.field}>
                                <label>حداقل مبلغ فاکتور</label>
                                <input type="number" min={0} value={form.minAmount} onChange={e => setForm({ ...form, minAmount: Number(e.target.value) })} />
                            </div>
                        </div>
                        <div className={styles.field}>
                            <label>تاریخ انقضا (اختیاری)</label>
                            <input type="date" value={form.expiresAt} onChange={e => setForm({ ...form, expiresAt: e.target.value })} />
                        </div>
                        <button type="submit" className={styles.primaryBtn} disabled={saving}>
                            {saving ? 'در حال ذخیره...' : 'ذخیره کد تخفیف'}
                        </button>
                    </form>
                </FormCard>
            </Wrapper>
        </Container>
    );
}
