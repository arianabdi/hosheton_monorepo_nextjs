'use client';

import React from 'react';
import Link from 'next/link';
import styles from './Billing.module.scss';
import { Container, Wrapper } from '@/app/(main)/layout';

export default function BillingHubPage() {
    return (
        <Container>
            <Wrapper>
                <div className={`${styles.container} ${styles.rtl}`}>
                    <header className={styles.header}>
                        <div>
                            <h1 className={styles.mainTitle}>مدیریت مالی (Billing)</h1>
                            <p className={styles.subtitle}>
                                درگاه‌های پرداخت، ارزش افزوده، کدهای تخفیف، فاکتورها و مانیتورینگ جاب‌های پرداخت را از این بخش مدیریت کنید.
                                این ماژول مستقل از Subscription است؛ اتصال خرید اشتراک در TaskVision انجام می‌شود.
                            </p>
                        </div>
                    </header>

                    <div className={styles.grid}>
                        <Link href="/billing/gateways" className={styles.card}>
                            <h3>درگاه‌های پرداخت</h3>
                            <p>افزودن، ویرایش، فعال/غیرفعال و نمایش در checkout</p>
                        </Link>
                        <Link href="/billing/gateways/add" className={styles.card}>
                            <h3>+ درگاه جدید</h3>
                            <p>ثبت درگاه با لوگو SVG، تنظیمات API و دسته‌بندی</p>
                        </Link>
                        <Link href="/billing/settings" className={styles.card}>
                            <h3>تنظیمات مالی</h3>
                            <p>VAT، کیف پول، و آدرس بازگشت درگاه برای هر کسب‌وکار</p>
                        </Link>
                        <Link href="/billing/payment-jobs" className={styles.card}>
                            <h3>جاب‌های پرداخت</h3>
                            <p>مانیتورینگ صف پرداخت، موفق، خطا و در حال انجام</p>
                        </Link>
                        <Link href="/billing/discount-codes" className={styles.card}>
                            <h3>کدهای تخفیف</h3>
                            <p>ایجاد، ویرایش و لیست کدهای تخفیف (عمومی یا مخصوص یک پلن)</p>
                        </Link>
                        <Link href="/billing/discount-codes/add" className={styles.card}>
                            <h3>+ کد تخفیف جدید</h3>
                            <p>ساخت سریع کد برای تست خرید اشتراک</p>
                        </Link>
                        <Link href="/billing/manual-payments" className={styles.card}>
                            <h3>واریز کارت‌به‌کارت</h3>
                            <p>بررسی رسیدها، تأیید شارژ کیف پول یا رد درخواست</p>
                        </Link>
                        <Link href="/billing/invoices" className={styles.card}>
                            <h3>فاکتورها</h3>
                            <p>مشاهده تاریخچه فاکتورهای صادر شده در سیستم</p>
                        </Link>
                        <Link href="/billing/invoices/add" className={styles.card}>
                            <h3>+ فاکتور جدید</h3>
                            <p>صدور فاکتور برای کاربر و لینک پرداخت در اپ</p>
                        </Link>
                        <Link href="/billing/invoices/credit" className={styles.card}>
                            <h3>شارژ کیف پول</h3>
                            <p>افزایش مستقیم موجودی کاربر بدون درگاه، با ثبت فاکتور و دفترکل</p>
                        </Link>
                    </div>
                </div>
            </Wrapper>
        </Container>
    );
}
