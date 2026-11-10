'use client';

import Link from 'next/link';
import parentStyles from '../../marketing/Marketing.module.scss';
import hrStyles from '../../management/hr/Hr.module.scss';

export default function IssuesGuide() {
    return (
        <section className={parentStyles.guideContainer}>
            <div className={parentStyles.guideHeader}>
                <div className={parentStyles.guideTitleGroup}>
                    <span className={parentStyles.guideIcon}>📋</span>
                    <h2 className={parentStyles.guideTitle}>آموزش مشکلات</h2>
                </div>
                <span className={parentStyles.guideBadge}>راهنمای ادمین</span>
            </div>

            <p className={hrStyles.employeesGuideIntro}>
                هر ردیف یک <strong>باگ گروه‌بندی‌شده</strong> است نه یک لاگ تکی. خطاهای مشابه با هم جمع می‌شوند تا
                همان TypeError صدبار تکرارشده یک مشکل باشد. برای Stack Trace روی عنوان کلیک کنید.
            </p>

            <div className={parentStyles.guideGrid}>
                <div className={parentStyles.guideCard}>
                    <h3>وضعیت‌ها یعنی چه؟</h3>
                    <ul>
                        <li><strong>باز:</strong> هنوز درست نشده؛ اولویت کار اینجاست.</li>
                        <li><strong>حل‌شده:</strong> فیکس شده. اگر دوباره بیاید «برگشته» می‌شود.</li>
                        <li><strong>نادیده:</strong> عمداً پیگیری نمی‌کنید (مثلاً خطای مرورگر قدیمی).</li>
                        <li><strong>برگشته:</strong> بعد از حل، دوباره رخ داده — Deploy را چک کنید.</li>
                    </ul>
                </div>
                <div className={parentStyles.guideCard}>
                    <h3>سطح اهمیت</h3>
                    <ul>
                        <li><strong>بحرانی / خطا:</strong> کاربر کارش گیر کرده؛ زودتر باز کنید.</li>
                        <li><strong>هشدار:</strong> کار می‌کند ولی غیرعادی است.</li>
                        <li><strong>اطلاع / دیباگ:</strong> برای تشخیص؛ معمولاً اولویت پایین.</li>
                    </ul>
                </div>
                <div className={parentStyles.guideCard}>
                    <h3>چه کار کنید</h3>
                    <ol>
                        <li>مشکل را باز کنید و Stack Trace و Breadcrumbs را بخوانید.</li>
                        <li>بعد از فیکس، در «یادداشت رفع» بنویسید مشکل چه بود و «حل شد» بزنید.</li>
                        <li>نویز بی‌اهمیت را «نادیده» کنید تا فهرست خلوت بماند.</li>
                    </ol>
                </div>
                <div className={parentStyles.guideCard}>
                    <h3>درخواست‌های ناموفق به سرویس بیرونی</h3>
                    <ul>
                        <li>فیلتر <strong>سرویس</strong> (tags.service): هر اپ دسته‌های خودش را می‌فرستد — مثلاً <code>ai-provider</code>، درگاه پرداخت، پیامک.</li>
                        <li>در جزئیات، کادر <strong>تشخیص خودکار</strong> و تب «درخواست به سرویس بیرونی» می‌گوید کدام URL ورودی ۴۰۴/۴۰۳ بوده.</li>
                        <li>راهنمای کامل: <Link href="/error-tracking/docs">مستندات پایش خطا</Link>.</li>
                    </ul>
                </div>
                <div className={parentStyles.guideCard}>
                    <h3>اگر خالی است</h3>
                    <ul>
                        <li>هنوز رویدادی نیامده — <Link href="/error-tracking/projects">پروژه</Link> و کلید را چک کنید.</li>
                        <li>فیلتر سطح/وضعیت را پاک کنید.</li>
                        <li>تست ارسال از <Link href="/error-tracking/integration">اتصال</Link>.</li>
                    </ul>
                </div>
            </div>

            <div className={hrStyles.employeesGuideExample}>
                <h3>مثال عملی</h3>
                <p>
                    مشکل «Cannot read properties of undefined» با ۲۰۰ رویداد و ۴۰ کاربر → جزئیات نشان می‌دهد خط
                    در صفحه کیف پول است → فیکس و «حل شد». اگر بعد از انتشار دوباره باز شود وضعیت «برگشته» می‌شود.
                </p>
            </div>

            <div className={hrStyles.employeesGuideNote}>
                <strong>نکته:</strong> حل‌کردن مشکل رویدادهای قبلی را پاک نمی‌کند؛ فقط می‌گوید این باگ دیگر در جریان کار نیست.
            </div>
        </section>
    );
}
