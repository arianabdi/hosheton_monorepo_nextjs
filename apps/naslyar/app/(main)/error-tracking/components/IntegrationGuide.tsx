'use client';

import Link from 'next/link';
import parentStyles from '../../marketing/Marketing.module.scss';
import hrStyles from '../../management/hr/Hr.module.scss';

export default function IntegrationGuide() {
    return (
        <section className={parentStyles.guideContainer}>
            <div className={parentStyles.guideHeader}>
                <div className={parentStyles.guideTitleGroup}>
                    <span className={parentStyles.guideIcon}>🔌</span>
                    <h2 className={parentStyles.guideTitle}>آموزش اتصال اپ به پایش خطا</h2>
                </div>
                <span className={parentStyles.guideBadge}>راهنمای ادمین</span>
            </div>

            <p className={hrStyles.employeesGuideIntro}>
                این صفحه <strong>چطور وصل شدن هر پروژه</strong> را نشان می‌دهد: کد، متغیر محیطی، تست. اول در{' '}
                <Link href="/error-tracking/projects">پروژه‌ها</Link> کلید بسازید، بعد تب همان اپ را پایین باز کنید.
            </p>

            <div className={parentStyles.guideGrid}>
                <div className={parentStyles.guideCard}>
                    <h3>زنجیره</h3>
                    <ol>
                        <li>پروژه و کلید عمومی.</li>
                        <li>SDK یا اسنیپت با همان کلید در اپ.</li>
                        <li>ارسال رویداد تست.</li>
                        <li>دیدن مشکل در <Link href="/error-tracking/issues">مشکلات</Link>.</li>
                    </ol>
                </div>
                <div className={parentStyles.guideCard}>
                    <h3>هاب</h3>
                    <ul>
                        <li>API هوشتون رویدادها را جمع می‌کند؛ بقیه اپ‌ها به همان هاب می‌فرستند.</li>
                        <li>هر اپ کلید خودش را دارد تا مشکلات قاطی نشوند.</li>
                    </ul>
                </div>
                <div className={parentStyles.guideCard}>
                    <h3>تب‌های پایین</h3>
                    <ul>
                        <li>برای هر ریپو متصل یک تب با مسیر فایل و دستور تست است.</li>
                        <li>اگر اپ جدیدی وصل می‌کنید، پروژه بسازید و الگوی همین تب‌ها را تکرار کنید.</li>
                    </ul>
                </div>
                <div className={parentStyles.guideCard}>
                    <h3>تست سریع</h3>
                    <ul>
                        <li>از اسنیپت curl یا Promise.reject در تب پروژه استفاده کنید.</li>
                        <li>اگر ۴۰۱ گرفتید کلید اشتباه است؛ اگر ۲۰۰ بود و مشکل نیامد فیلتر داشبورد را چک کنید.</li>
                    </ul>
                </div>
            </div>

            <div className={hrStyles.employeesGuideExample}>
                <h3>مثال عملی</h3>
                <p>
                    تب hosheton_studio را باز می‌کنید، کلید پروژه را در env می‌گذارید، یک خطا در چت می‌سازید، همان
                    مشکل ظرف چند ثانیه در فهرست مشکلات با Stack Trace ظاهر می‌شود.
                </p>
            </div>

            <div className={hrStyles.employeesGuideNote}>
                <strong>نکته:</strong> جزئیات کدی که پایین است باید با ریپو هم‌خوان بماند. اگر مسیر فایل عوض شد همین صفحه را به‌روز کنید.
            </div>
        </section>
    );
}
