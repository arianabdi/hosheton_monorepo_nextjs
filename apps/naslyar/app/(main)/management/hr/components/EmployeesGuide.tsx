'use client';

import React from 'react';
import Link from 'next/link';
import parentStyles from '../../../marketing/Marketing.module.scss';
import styles from '../Hr.module.scss';

export default function EmployeesGuide() {
    return (
        <section className={parentStyles.guideContainer}>
            <div className={parentStyles.guideHeader}>
                <div className={parentStyles.guideTitleGroup}>
                    <span className={parentStyles.guideIcon}>👥</span>
                    <h2 className={parentStyles.guideTitle}>آموزش ثبت نیروی انسانی</h2>
                </div>
                <span className={parentStyles.guideBadge}>راهنمای ادمین</span>
            </div>

            <p className={styles.employeesGuideIntro}>
                در این بخش <strong>پروفایل سازمانی</strong> افراد را ثبت می‌کنید — یعنی مشخص می‌کنید هر شخص
                در چه <strong>واحدی</strong> و با چه <strong>سمتی</strong> فعالیت می‌کند. این اطلاعات در
                <Link href="/management/documents/workflows"> کارتابل و گردش کار اسناد</Link> برای ارجاع مراحل
                تأیید استفاده می‌شود.
            </p>

            <div className={parentStyles.guideGrid}>
                <div className={parentStyles.guideCard}>
                    <h3>تفاوت «کاربر» و «نیروی انسانی»</h3>
                    <ul>
                        <li><Link href="/users">کاربران</Link>: حساب ورود به سیستم (نام کاربری، نقش دسترسی).</li>
                        <li><strong>نیروی انسانی</strong>: پروفایل سازمانی (واحد، سمت، تماس) — حتی بدون حساب کاربری.</li>
                        <li>برای اینکه کارتابل «در انتظار تأیید من» درست کار کند، نیرو را به حساب کاربری متصل کنید.</li>
                    </ul>
                </div>

                <div className={parentStyles.guideCard}>
                    <h3>پیش‌نیازها</h3>
                    <ol>
                        <li><Link href="/management/hr/departments">واحدهای سازمانی</Link> را تعریف کنید.</li>
                        <li><Link href="/management/hr/roles">سمت‌های سازمانی</Link> را ثبت کنید.</li>
                        <li>سپس از <Link href="/management/hr/employees/new">افزودن نیروی انسانی جدید</Link> استفاده کنید.</li>
                    </ol>
                </div>

                <div className={parentStyles.guideCard}>
                    <h3>دو روش ثبت</h3>
                    <ol>
                        <li><strong>دستی:</strong> نام، واحد و سمت را خودتان وارد کنید (برای افراد بدون حساب).</li>
                        <li><strong>از کاربران:</strong> یک حساب موجود را انتخاب کنید تا نام و ایمیل پر شود.</li>
                    </ol>
                </div>

                <div className={parentStyles.guideCard}>
                    <h3>بعد از ثبت</h3>
                    <ul>
                        <li>در طراح گردش کار، مرحله را به «شخص»، «سمت» یا «واحد» ارجاع دهید.</li>
                        <li>نیروی متصل به حساب، کارهای مربوط به خود را در کارتابل می‌بیند.</li>
                        <li>وضعیت «غیرفعال» برای افرادی است که موقتاً در گردش کار دخالت نمی‌کنند.</li>
                    </ul>
                </div>
            </div>

            <div className={styles.employeesGuideExample}>
                <h3>مثال عملی</h3>
                <p>
                    واحد «فناوری اطلاعات» + سمت «مدیر فنی» + نیروی «علی رضایی» متصل به حساب admin →
                    در فرآیند «تأیید قرارداد»، مرحله بررسی به «مدیر فنی» یا «علی رضایی» ارجاع می‌شود →
                    علی در کارتابل «در انتظار تأیید من» فایل را می‌بیند.
                </p>
            </div>

            <div className={styles.employeesGuideNote}>
                <strong>نکته:</strong> اگر واحد یا سمت در فهرست نیست، ابتدا آن‌ها را در بخش‌های مربوطه بسازید.
                حذف واحد یا سمت، رکورد نیروی انسانی را پاک نمی‌کند؛ فقط نمایش «—» می‌شود تا دوباره ویرایش کنید.
            </div>
        </section>
    );
}
