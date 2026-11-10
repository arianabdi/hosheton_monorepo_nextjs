'use client';

import React from 'react';
import Link from 'next/link';
import parentStyles from '../../../marketing/Marketing.module.scss';
import styles from '../Documents.module.scss';

export default function WorkflowsGuide() {
    return (
        <section className={parentStyles.guideContainer}>
            <div className={parentStyles.guideHeader}>
                <div className={parentStyles.guideTitleGroup}>
                    <span className={parentStyles.guideIcon}>📋</span>
                    <h2 className={parentStyles.guideTitle}>آموزش کارتابل و گردش کار اسناد</h2>
                </div>
                <span className={parentStyles.guideBadge}>راهنمای ادمین</span>
            </div>

            <p className={styles.workflowGuideIntro}>
                کارتابل جایی است که فرآیند <strong>بررسی، تأیید و امضای اسناد</strong> را مدیریت می‌کنید.
                ابتدا در <Link href="/management/hr">منابع انسانی</Link> واحدها، سمت‌ها و کارمندان را تعریف کنید،
                سپس فرآیند بسازید و فایل را وارد مسیر تأیید کنید.
            </p>

            <div className={parentStyles.guideGrid}>
                <div className={parentStyles.guideCard}>
                    <h3>مرحله ۰ — منابع انسانی</h3>
                    <ol>
                        <li><Link href="/management/hr/departments">واحدهای سازمانی</Link> را تعریف کنید.</li>
                        <li><Link href="/management/hr/roles">سمت‌ها</Link> (مدیر، کارشناس، …) را ثبت کنید.</li>
                        <li><Link href="/management/hr/employees/new">نیروی انسانی</Link> را دستی یا از کاربران سیستم اضافه کنید.</li>
                    </ol>
                </div>

                <div className={parentStyles.guideCard}>
                    <h3>مرحله ۱ — ساخت فرآیند</h3>
                    <ol>
                        <li>تب «طراح گردش کار» → Wizard ساخت فرآیند.</li>
                        <li>برای هر مرحله: نام، توضیح کار، و «ارسال به» (سمت / واحد / شخص).</li>
                        <li>پیش‌نمایش مسیر را ببینید و قالب را ذخیره کنید.</li>
                    </ol>
                </div>

                <div className={parentStyles.guideCard}>
                    <h3>مرحله ۲ — ورود فایل به روند</h3>
                    <ol>
                        <li>فایل را در «مخزن اسناد» آپلود کنید.</li>
                        <li>«شروع گردش کار» → انتخاب فرآیند → ارسال به کارتابل.</li>
                    </ol>
                </div>

                <div className={parentStyles.guideCard}>
                    <h3>مرحله ۳ — تأیید</h3>
                    <ol>
                        <li><strong>در انتظار تأیید من:</strong> کارهایی که به سمت/واحد/شخص شما ارجاع شده.</li>
                        <li><strong>ارسال‌شده‌های من:</strong> فایل‌هایی که خودتان فرستاده‌اید.</li>
                        <li>«مرحله بعد» تا تکمیل و آرشیو تأیید.</li>
                    </ol>
                </div>
            </div>

            <div className={styles.workflowGuideExample}>
                <h3>مثال عملی</h3>
                <p>
                    HR: واحد IT + سمت «مدیر فنی» + کارمند متصل به حساب کاربری →
                    فرآیند «تأیید قرارداد» (ثبت→بررسی→امضا با مقصد مشخص) →
                    آپلود فایل → کارتابل → تکمیل
                </p>
            </div>

            <div className={styles.workflowGuideNote}>
                <strong>نکته:</strong> «کاربران» حساب ورود است؛ «منابع انسانی» ساختار سازمانی و ارجاع گردش کار.
                هر فایل فقط یک گردش کار فعال می‌تواند داشته باشد.
            </div>
        </section>
    );
}
