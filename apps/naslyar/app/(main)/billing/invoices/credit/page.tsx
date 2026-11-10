'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import hubStyles from '../../Billing.module.scss';
import styles from '../InvoicesList.module.scss';
import { Container, Wrapper } from '@/app/(main)/layout';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import UserByEmailPicker from '@/app/(main)/users/UserByEmailPicker';
import type { AdminUserListItem } from '@/app/(main)/users/user-list-api';

type WalletSnapshot = {
    balance: number;
    availableBalance: number;
    currency: string;
};

export default function CreditWalletPage() {
    const router = useRouter();
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const [creating, setCreating] = useState(false);
    const [invoiceUser, setInvoiceUser] = useState<AdminUserListItem | null>(null);
    const [wallet, setWallet] = useState<WalletSnapshot | null>(null);
    const [walletLoading, setWalletLoading] = useState(false);
    const [form, setForm] = useState({
        amount: '',
        description: '',
    });

    useEffect(() => {
        if (!token || !invoiceUser?._id) {
            setWallet(null);
            return;
        }
        let cancelled = false;
        setWalletLoading(true);
        axios.get(`${baseUrl}/api/billing/wallet/admin/${invoiceUser._id}`, {
            headers: { authorization: `Bearer ${token}` },
        }).then((res) => {
            if (cancelled || res.data?.statusCode !== 200) return;
            const data = res.data.data || {};
            setWallet({
                balance: Number(data.balance || 0),
                availableBalance: Number(data.availableBalance ?? data.balance ?? 0),
                currency: String(data.currency || 'USD'),
            });
        }).catch((err) => {
            if (!cancelled) {
                setWallet(null);
                ErrorToaster(err);
            }
        }).finally(() => {
            if (!cancelled) setWalletLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [token, baseUrl, invoiceUser?._id]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;
        const amount = Number(form.amount);
        if (!invoiceUser?._id || !Number.isFinite(amount) || amount <= 0) {
            alert('ابتدا کاربر را با ایمیل پیدا کنید و مبلغ شارژ (بزرگ‌تر از صفر) را وارد کنید');
            return;
        }
        try {
            setCreating(true);
            const res = await axios.post(
                `${baseUrl}/api/billing/wallet/credit`,
                {
                    userId: invoiceUser._id,
                    amount,
                    description: form.description.trim() || undefined,
                },
                { headers: { authorization: `Bearer ${token}` } },
            );
            if (res.data?.statusCode === 200) {
                const credited = res.data.data?.wallet;
                const currency = credited?.currency || wallet?.currency || 'USD';
                const nextBalance = Number(credited?.availableBalance ?? credited?.balance ?? 0);
                SuccessToaster({
                    message: `کیف پول شارژ شد — موجودی جدید: ${nextBalance} ${currency}`,
                });
                router.push('/billing/invoices');
            }
        } catch (err) {
            ErrorToaster(err);
        } finally {
            setCreating(false);
        }
    };

    const currency = wallet?.currency || 'USD';

    return (
        <Container>
            <Wrapper>
                <div className={`${styles.page} ${styles.rtl}`}>
                    <Link href="/billing/invoices" className={styles.backLink}>
                        ← بازگشت به لیست فاکتورها
                    </Link>

                    <header className={styles.header}>
                        <div>
                            <h1 className={styles.mainTitle}>شارژ مستقیم کیف پول</h1>
                            <p className={styles.subtitle}>
                                مبلغ به ارز کیف پول (معمولاً {currency}) به موجودی کاربر اضافه می‌شود.
                                فاکتور پرداخت‌شده و ردیف دفترکل همانند شارژ موفق درگاه ثبت می‌گردد؛ کاربر به درگاه نمی‌رود.
                            </p>
                        </div>
                    </header>

                    <section className={styles.createCard}>
                        <form onSubmit={handleCreate}>
                            <div className={styles.createGrid}>
                                <div className={`${styles.field} ${styles.fullWidth}`}>
                                    <label>کاربر (جستجو با ایمیل)</label>
                                    <UserByEmailPicker
                                        selectedUser={invoiceUser}
                                        onSelect={setInvoiceUser}
                                        disabled={creating}
                                    />
                                </div>
                                {invoiceUser ? (
                                    <div className={`${styles.field} ${styles.fullWidth}`}>
                                        <div className={styles.balanceBox}>
                                            {walletLoading
                                                ? 'در حال دریافت موجودی…'
                                                : wallet
                                                    ? `موجودی فعلی: ${wallet.availableBalance} ${wallet.currency}`
                                                    : 'موجودی در دسترس نیست'}
                                        </div>
                                    </div>
                                ) : null}
                                <div className={styles.field}>
                                    <label>مبلغ شارژ ({currency})</label>
                                    <input
                                        required
                                        type="number"
                                        min={0.000001}
                                        step="any"
                                        value={form.amount}
                                        onChange={e => setForm({ ...form, amount: e.target.value })}
                                    />
                                </div>
                                <div className={`${styles.field} ${styles.fullWidth}`}>
                                    <label>توضیح (اختیاری)</label>
                                    <input
                                        value={form.description}
                                        onChange={e => setForm({ ...form, description: e.target.value })}
                                        placeholder="مثلاً شارژ هدیه پشتیبانی"
                                    />
                                </div>
                            </div>
                            <div className={styles.actions}>
                                <button
                                    type="submit"
                                    className={styles.primaryBtn}
                                    disabled={creating || !invoiceUser}
                                >
                                    {creating ? 'در حال شارژ…' : 'شارژ کیف پول'}
                                </button>
                                <Link href="/billing/invoices" className={hubStyles.secondaryBtn}>
                                    انصراف
                                </Link>
                            </div>
                        </form>
                    </section>
                </div>
            </Wrapper>
        </Container>
    );
}
