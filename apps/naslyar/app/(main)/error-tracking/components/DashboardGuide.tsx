'use client';

import Link from 'next/link';
import parentStyles from '../../marketing/Marketing.module.scss';
import hrStyles from '../../management/hr/Hr.module.scss';

export default function DashboardGuide() {
    return (
        <section className={parentStyles.guideContainer}>
            <div className={parentStyles.guideHeader}>
                <div className={parentStyles.guideTitleGroup}>
                    <span className={parentStyles.guideIcon}>🐞</span>
                    <h2 className={parentStyles.guideTitle}>آموزش داشبورد پایش خطا</h2>
                </div>
                <span className={parentStyles.guideBadge}>راهنمای ادمین</span>
            </div>

            <p className={hrStyles.employeesGuideIntro}>
                اینجا <strong>خلاصهٔ سلامت اپ‌ها</strong> است: چند خطا امروز آمده، کدام مشکل پرتکرار است و آیا هشدار
                ارسال شده. جزئیات Stack Trace در فهرست مشکلات است؛ اتصال SDK در{' '}
                <Link href="/error-tracking/integration">راهنمای اتصال</Link>.
            </p>

            <div className={parentStyles.guideGrid}>
                <div className={parentStyles.guideCard}>
                    <h3>اعداد یعنی چه؟</h3>
                    <ul>
                        <li><strong>رویداد:</strong> یک بار وقوع خطا (ممکن است همان باگ صدها بار تکرار شود).</li>
                        <li><strong>مشکل:</strong> گروه‌بندی خطاهای مشابه در یک ردیف.</li>
                        <li><strong>کاربران متأثر:</strong> چند نفر این خطا را دیده‌اند.</li>
                    </ul>
                </div>
                <div className={parentStyles.guideCard}>
                    <h3>ترتیب کار</h3>
                    <ol>
                        <li>اگر پروژه‌ای نیست، از <Link href="/error-tracking/projects/new">پروژه جدید</Link> شروع کنید.</li>
                        <li>کلید را در اپ بگذارید — جزئیات در <Link href="/error-tracking/integration">اتصال</Link>.</li>
                        <li>خطاهای باز را از <Link href="/error-tracking/issues">مشکلات</Link> حل کنید.</li>
                        <li>برای اطلاع فوری، <Link href="/error-tracking/alerts">هشدار</Link> بسازید.</li>
                    </ol>
                </div>
                <div className={parentStyles.guideCard}>
                    <h3>نمودار ۱۴ روز</h3>
                    <ul>
                        <li>هر ستون یک روز است؛ رنگ‌ها سطح خطا (بحرانی تا اطلاع) را جدا می‌کنند.</li>
                        <li>اوج ناگهانی یعنی Deploy خراب یا وابستگی قطع شده.</li>
                        <li>با فیلتر پروژه فقط یک سرویس را ببینید.</li>
                    </ul>
                </div>
                <div className={parentStyles.guideCard}>
                    <h3>اگر صفر است</h3>
                    <ul>
                        <li>پروژه و کلید عمومی درست باشد.</li>
                        <li>رویداد تست از صفحه اتصال بفرستید.</li>
                        <li>فیلتر «همه پروژه‌ها» را چک کنید.</li>
                    </ul>
                </div>
            </div>

            <div className={hrStyles.employeesGuideExample}>
                <h3>مثال عملی</h3>
                <p>
                    بعد از انتشار استودیو، «مشکلات جدید امروز» از ۲ به ۴۰ می‌رسد و نمودار امروز قرمز است. روی مشکل
                    پرتکرار TypeError کلیک می‌کنید، Stack Trace را می‌بینید، باگ را فیکس و وضعیت را «حل‌شده» می‌زنید.
                    اگر قانون هشدار داشته باشید همان لحظه تلگرام هم خبر می‌دهد.
                </p>
            </div>

            <div className={hrStyles.employeesGuideNote}>
                <strong>نکته:</strong> داشبورد خطا را درست نمی‌کند؛ فقط اولویت می‌دهد. کار اصلی در مشکلات و هشدارهاست.
            </div>
        </section>
    );
}
