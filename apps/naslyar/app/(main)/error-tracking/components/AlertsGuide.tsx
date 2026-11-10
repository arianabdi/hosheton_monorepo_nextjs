'use client';

import Link from 'next/link';
import parentStyles from '../../marketing/Marketing.module.scss';
import hrStyles from '../../management/hr/Hr.module.scss';

export default function AlertsGuide() {
    return (
        <section className={parentStyles.guideContainer}>
            <div className={parentStyles.guideHeader}>
                <div className={parentStyles.guideTitleGroup}>
                    <span className={parentStyles.guideIcon}>🔔</span>
                    <h2 className={parentStyles.guideTitle}>آموزش هشدارها</h2>
                </div>
                <span className={parentStyles.guideBadge}>راهنمای ادمین</span>
            </div>

            <p className={hrStyles.employeesGuideIntro}>
                قانون هشدار یعنی <strong>کی به شما خبر بدهیم</strong>: مشکل جدید، برگشت خطا، یا جهش ناگهانی تعداد.
                مقصد Webhook یا تلگرام است. پایین صفحه تاریخچهٔ ارسال‌هاست.
            </p>

            <div className={parentStyles.guideGrid}>
                <div className={parentStyles.guideCard}>
                    <h3>پیش‌نیاز</h3>
                    <ol>
                        <li>حداقل یک <Link href="/error-tracking/projects">پروژه</Link> با کلید معتبر.</li>
                        <li>از <Link href="/error-tracking/alerts/new">قانون جدید</Link> نوع و مقصد را مشخص کنید.</li>
                        <li>قانون را فعال بگذارید و یک خطای تست بفرستید.</li>
                    </ol>
                </div>
                <div className={parentStyles.guideCard}>
                    <h3>نوع قانون</h3>
                    <ul>
                        <li><strong>مشکل جدید:</strong> اولین بار که باگ تازه‌ای دیده شود.</li>
                        <li><strong>بازگشت خطا:</strong> مشکل حل‌شده دوباره رخ دهد.</li>
                        <li><strong>جهش خطا:</strong> در چند دقیقه تعداد رویداد از آستانه بیشتر شود.</li>
                    </ul>
                </div>
                <div className={parentStyles.guideCard}>
                    <h3>Cooldown</h3>
                    <ul>
                        <li>فاصلهٔ اجباری بین دو ارسال همان قانون؛ جلوی طوفان پیام را می‌گیرد.</li>
                        <li>۳۰ دقیقه برای شروع مناسب است.</li>
                        <li>غیرفعال کردن قانون ارسال جدید را قطع می‌کند؛ تاریخچه می‌ماند.</li>
                    </ul>
                </div>
                <div className={parentStyles.guideCard}>
                    <h3>اگر ارسال ناموفق است</h3>
                    <ul>
                        <li>آدرس Webhook یا Bot Token / Chat ID را در ویرایش قانون چک کنید.</li>
                        <li>ستون خطا در تاریخچه دلیل را نشان می‌دهد.</li>
                        <li>پروژهٔ قانون باید همان پروژه‌ای باشد که رویداد می‌فرستد.</li>
                    </ul>
                </div>
            </div>

            <div className={hrStyles.employeesGuideExample}>
                <h3>مثال عملی</h3>
                <p>
                    قانون «مشکل جدید» روی پروژه استودیو → مقصد تلگرام گروه فنی. اولین TypeError کیف پول یک پیام
                    می‌فرستد. تکرار همان مشکل در cooldown پیام جدید نمی‌سازد تا فهرست تلگرام شلوغ نشود.
                </p>
            </div>

            <div className={hrStyles.employeesGuideNote}>
                <strong>نکته:</strong> هشدار جایگزین دیدن مشکلات نیست؛ فقط زودتر خبر می‌دهد. بستن باگ هنوز از صفحهٔ مشکلات است.
            </div>
        </section>
    );
}
