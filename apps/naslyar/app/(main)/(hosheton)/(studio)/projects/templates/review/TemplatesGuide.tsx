'use client';

import Link from 'next/link';
import parentStyles from '@/app/(main)/marketing/Marketing.module.scss';
import styles from '@/app/(main)/management/hr/Hr.module.scss';

export default function TemplatesGuide() {
    return (
        <section className={parentStyles.guideContainer}>
            <div className={parentStyles.guideHeader}>
                <div className={parentStyles.guideTitleGroup}>
                    <span className={parentStyles.guideIcon}>🧩</span>
                    <h2 className={parentStyles.guideTitle}>آموزش مدیریت قالب‌ها</h2>
                </div>
                <span className={parentStyles.guideBadge}>راهنمای ادمین</span>
            </div>

            <p className={styles.employeesGuideIntro}>
                در این بخش قالب‌های استودیو را می‌بینید، بررسی می‌کنید و در صورت نیاز <strong>بدون صف تایید</strong>
                قالب جدید می‌سازید. قالب منتشرشده در صفحه ایده‌ها برای کاربران نمایش داده می‌شود.
            </p>

            <div className={parentStyles.guideGrid}>
                <div className={parentStyles.guideCard}>
                    <h3>وضعیت‌ها یعنی چه؟</h3>
                    <ul>
                        <li><strong>پیش‌نویس:</strong> هنوز برای بررسی ارسال نشده.</li>
                        <li><strong>در انتظار:</strong> کاربر ارسال کرده و باید تایید یا رد شود.</li>
                        <li><strong>تایید شده:</strong> منتشر شده و در صفحه ایده‌ها دیده می‌شود.</li>
                        <li><strong>رد شده:</strong> منتشر نشده؛ می‌تواند بعداً دوباره ارسال شود.</li>
                    </ul>
                </div>

                <div className={parentStyles.guideCard}>
                    <h3>افزودن مستقیم از پنل</h3>
                    <ol>
                        <li>از دکمه <Link href="/projects/templates/review/new">افزودن قالب</Link> استفاده کنید.</li>
                        <li>عنوان، نوع، پرامپت و دسته‌بندی را پر کنید.</li>
                        <li>مدیاها را در بخش جداگانه آپلود کنید.</li>
                        <li>با «انتشار» قالب بلافاصله تایید و منتشر می‌شود.</li>
                    </ol>
                </div>

                <div className={parentStyles.guideCard}>
                    <h3>بررسی درخواست کاربران</h3>
                    <ul>
                        <li>از منوی «⋯» روی هر ردیف، «جزئیات» یا «بررسی» را بزنید.</li>
                        <li>چک‌لیست را تیک بزنید و بعد تایید یا رد کنید.</li>
                        <li>«ادیتور» قالب را در استودیو باز می‌کند.</li>
                    </ul>
                </div>

                <div className={parentStyles.guideCard}>
                    <h3>دسته‌بندی</h3>
                    <ul>
                        <li>دسته‌ها را از <Link href="/projects/marketplace/categories">دسته‌بندی موضوعی</Link> بسازید.</li>
                        <li>کارت‌های افقی صفحه ایده‌ها از همین دسته‌ها ساخته می‌شوند.</li>
                        <li>اگر دسته خالی باشد، فیلتر صفحه ایده‌ها چیزی نشان نمی‌دهد.</li>
                    </ul>
                </div>
            </div>

            <div className={styles.employeesGuideExample}>
                <h3>مثال عملی</h3>
                <p>
                    قالب «افزایش کیفیت عکس» از نوع Prompt + دسته «ادیت تصویر» + دو تصویر پیش‌نمایش →
                    انتشار از پنل → کاربر در صفحه ایده‌ها آن را می‌بیند و با Use Idea پروژه می‌سازد.
                </p>
            </div>

            <div className={styles.employeesGuideNote}>
                <strong>نکته:</strong> افزودن از پنل ادمین صف بررسی ندارد. قالب‌هایی که کاربران می‌فرستند همچنان باید تایید شوند.
            </div>
        </section>
    );
}
