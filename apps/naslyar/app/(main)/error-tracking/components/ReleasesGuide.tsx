'use client';

import Link from 'next/link';
import parentStyles from '../../marketing/Marketing.module.scss';
import hrStyles from '../../management/hr/Hr.module.scss';

export default function ReleasesGuide() {
    return (
        <section className={parentStyles.guideContainer}>
            <div className={parentStyles.guideHeader}>
                <div className={parentStyles.guideTitleGroup}>
                    <span className={parentStyles.guideIcon}>🚀</span>
                    <h2 className={parentStyles.guideTitle}>آموزش نسخه‌ها (Releases)</h2>
                </div>
                <span className={parentStyles.guideBadge}>راهنمای ادمین</span>
            </div>

            <p className={hrStyles.employeesGuideIntro}>
                هر ردیف یک <strong>نسخهٔ منتشرشده</strong> است که SDK در فیلد <code>release</code> فرستاده. می‌فهمید
                باگ از کدام Deploy آمده و آن نسخه چند مشکل جدید ساخته.
            </p>

            <div className={parentStyles.guideGrid}>
                <div className={parentStyles.guideCard}>
                    <h3>از کجا می‌آید؟</h3>
                    <ul>
                        <li>خودتان ردیف نمی‌سازید؛ با اولین رویدادِ آن نسخه ساخته می‌شود.</li>
                        <li>در SDK مقدار release را مثلاً git sha یا شماره بیلد بگذارید.</li>
                        <li>جزئیات اتصال در <Link href="/error-tracking/integration">راهنمای اتصال</Link>.</li>
                    </ul>
                </div>
                <div className={parentStyles.guideCard}>
                    <h3>اعداد</h3>
                    <ul>
                        <li><strong>رویدادها:</strong> کل خطاهای آن نسخه.</li>
                        <li><strong>مشکلات جدید:</strong> باگ‌هایی که اولین بار در این نسخه دیده شده‌اند.</li>
                        <li>مشکلات جدید بالا یعنی Deploy احتمالاً باگ تازه وارد کرده.</li>
                    </ul>
                </div>
                <div className={parentStyles.guideCard}>
                    <h3>چه کار کنید</h3>
                    <ol>
                        <li>نسخه را با <Link href="/error-tracking/issues">مشکلات</Link> همان بازه مقایسه کنید.</li>
                        <li>اگر مشکلات جدید زیاد است، revert یا فیکس فوری.</li>
                        <li>نسخه پایدار را مبنای مقایسهٔ بعدی بگذارید.</li>
                    </ol>
                </div>
                <div className={parentStyles.guideCard}>
                    <h3>اگر خالی است</h3>
                    <ul>
                        <li>SDK فیلد release نمی‌فرستد.</li>
                        <li>هنوز Deploy با رویداد خطا نداشته‌اید.</li>
                        <li>فیلتر پروژه را روی «همه» بگذارید.</li>
                    </ul>
                </div>
            </div>

            <div className={hrStyles.employeesGuideExample}>
                <h3>مثال عملی</h3>
                <p>
                    نسخه 1.14.2 بعد از انتشار ۲۰ مشکل جدید دارد؛ 1.14.1 فقط دو تا. یعنی رگرسیون از همین Deploy است —
                    مشکلات باز همان نسخه را در فهرست فیلتر کنید و اول آن‌ها را ببندید.
                </p>
            </div>

            <div className={hrStyles.employeesGuideNote}>
                <strong>نکته:</strong> بدون release در SDK این صفحه همیشه خالی است حتی اگر مشکلات پر باشند.
            </div>
        </section>
    );
}
