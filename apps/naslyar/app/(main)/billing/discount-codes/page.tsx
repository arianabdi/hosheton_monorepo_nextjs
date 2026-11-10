'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import styles from '../Billing.module.scss';
import { Container, Wrapper } from '@/app/(main)/layout';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';

interface DiscountCode {
    _id: string;
    code: string;
    description?: string;
    planId?: string | null;
    discountType: 'percent' | 'fixed';
    discountValue: number;
    maxUses?: number | null;
    usedCount: number;
    isActive: boolean;
    expiresAt?: string;
}

export default function DiscountCodesListPage() {
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const [codes, setCodes] = useState<DiscountCode[]>([]);
    const [loading, setLoading] = useState(true);

    const loadCodes = async () => {
        if (!token) return;
        try {
            setLoading(true);
            const res = await axios.get(`${baseUrl}/api/billing/discount-codes`, {
                headers: { authorization: `Bearer ${token}` },
            });
            if (res.data.statusCode === 200) {
                setCodes(res.data.data || []);
            }
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadCodes(); }, [token]);

    const handleDelete = async (id: string, code: string) => {
        if (!confirm(`حذف کد "${code}"؟`)) return;
        try {
            await axios.delete(`${baseUrl}/api/billing/discount-codes/${id}`, {
                headers: { authorization: `Bearer ${token}` },
            });
            SuccessToaster({ message: 'کد تخفیف حذف شد' });
            await loadCodes();
        } catch (e) {
            ErrorToaster(e);
        }
    };

    return (
        <Container>
            <Wrapper>
                <div className={`${styles.container} ${styles.rtl}`}>
                    <header className={styles.header}>
                        <div>
                            <h1 className={styles.mainTitle}>کدهای تخفیف</h1>
                            <p className={styles.subtitle}>
                                کد عمومی روی هر فاکتوری اعمال می‌شود. اگر پلن انتخاب کنید، فقط برای همان پلن valid است.
                            </p>
                        </div>
                        <Link href="/billing/discount-codes/add" className={styles.primaryBtn}>+ کد جدید</Link>
                    </header>

                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>کد</th>
                                    <th>نوع</th>
                                    <th>مقدار</th>
                                    <th>پلن</th>
                                    <th>استفاده</th>
                                    <th>وضعیت</th>
                                    <th>عملیات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={7}>در حال بارگذاری...</td></tr>
                                ) : codes.length === 0 ? (
                                    <tr><td colSpan={7}>کد تخفیفی ثبت نشده است.</td></tr>
                                ) : codes.map(c => (
                                    <tr key={c._id}>
                                        <td><strong>{c.code}</strong></td>
                                        <td>{c.discountType === 'percent' ? 'درصدی' : 'مبلغ ثابت'}</td>
                                        <td>{c.discountType === 'percent' ? `${c.discountValue}%` : c.discountValue.toLocaleString()}</td>
                                        <td>{c.planId ? 'مخصوص پلن' : 'عمومی'}</td>
                                        <td>{c.usedCount}{c.maxUses != null ? ` / ${c.maxUses}` : ''}</td>
                                        <td>
                                            <span className={c.isActive ? styles.badgeActive : styles.badgeInactive}>
                                                {c.isActive ? 'فعال' : 'غیرفعال'}
                                            </span>
                                        </td>
                                        <td>
                                            <button type="button" className={styles.removeBtn} onClick={() => handleDelete(c._id, c.code)}>حذف</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </Wrapper>
        </Container>
    );
}
