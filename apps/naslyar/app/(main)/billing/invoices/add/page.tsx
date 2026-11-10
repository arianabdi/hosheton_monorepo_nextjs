'use client';



import React, { useState } from 'react';

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



export default function AddInvoicePage() {

    const router = useRouter();

    const { baseUrl } = useAppStore();

    const { token } = useAuthStore();

    const [creating, setCreating] = useState(false);

    const [invoiceUser, setInvoiceUser] = useState<AdminUserListItem | null>(null);



    const [form, setForm] = useState({

        amount: '',

        description: '',

        type: 'purchase' as 'purchase' | 'deposit',

    });



    const handleCreate = async (e: React.FormEvent) => {

        e.preventDefault();

        if (!token) return;

        const amount = parseInt(form.amount.replace(/\D/g, ''), 10);

        if (!invoiceUser?._id || !amount || amount < 1000) {

            alert('ابتدا کاربر را با ایمیل پیدا کنید و مبلغ (حداقل ۱,۰۰۰) را وارد کنید');

            return;

        }

        try {

            setCreating(true);

            const res = await axios.post(

                `${baseUrl}/api/billing/invoices`,

                {

                    userId: invoiceUser._id,

                    amount,

                    description: form.description.trim() || undefined,

                    type: form.type,

                },

                { headers: { authorization: `Bearer ${token}` } },

            );

            if (res.data?.statusCode === 200) {

                SuccessToaster({ message: 'فاکتور ایجاد شد — لینک پرداخت از لیست فاکتورها قابل کپی است' });

                router.push('/billing/invoices');

            }

        } catch (err) {

            ErrorToaster(err);

        } finally {

            setCreating(false);

        }

    };



    return (

        <Container>

            <Wrapper>

                <div className={`${styles.page} ${styles.rtl}`}>

                    <Link href="/billing/invoices" className={styles.backLink}>

                        ← بازگشت به لیست فاکتورها

                    </Link>



                    <header className={styles.header}>

                        <div>

                            <h1 className={styles.mainTitle}>صدور فاکتور جدید</h1>

                            <p className={styles.subtitle}>

                                فاکتور برای کاربر مشخص صادر می‌شود. پس از ایجاد، لینک پرداخت در اپ hosheton_studio

                                (کیف پول + <code>payInvoice</code>) برای کاربر ارسال کنید.

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

                                <div className={styles.field}>

                                    <label>مبلغ (تومان)</label>

                                    <input

                                        required

                                        type="number"

                                        min={1000}

                                        value={form.amount}

                                        onChange={e => setForm({ ...form, amount: e.target.value })}

                                    />

                                </div>

                                <div className={styles.field}>

                                    <label>نوع</label>

                                    <select

                                        value={form.type}

                                        onChange={e => setForm({ ...form, type: e.target.value as 'purchase' | 'deposit' })}

                                    >

                                        <option value="purchase">خرید / خدمات</option>

                                        <option value="deposit">واریز</option>

                                    </select>

                                </div>

                                <div className={`${styles.field} ${styles.fullWidth}`}>

                                    <label>توضیح (نمایش به کاربر)</label>

                                    <input

                                        value={form.description}

                                        onChange={e => setForm({ ...form, description: e.target.value })}

                                        placeholder="مثلاً اشتراک ماهانه"

                                    />

                                </div>

                            </div>

                            <div className={styles.actions}>

                                <button

                                    type="submit"

                                    className={styles.primaryBtn}

                                    disabled={creating || !invoiceUser}

                                >

                                    {creating ? 'در حال ایجاد…' : 'ایجاد فاکتور'}

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


