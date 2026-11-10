'use client';

import Link from 'next/link';
import parentStyles from '../../marketing/Marketing.module.scss';
import hrStyles from '../../management/hr/Hr.module.scss';

export default function ProjectsGuide() {
    return (
        <section className={parentStyles.guideContainer}>
            <div className={parentStyles.guideHeader}>
                <div className={parentStyles.guideTitleGroup}>
                    <span className={parentStyles.guideIcon}>🔑</span>
                    <h2 className={parentStyles.guideTitle}>آموزش پروژه‌های پایش خطا</h2>
                </div>
                <span className={parentStyles.guideBadge}>راهنمای ادمین</span>
            </div>

            <p className={hrStyles.employeesGuideIntro}>
                هر اپ یا سرویس یک <strong>پروژه با کلید عمومی (DSN)</strong> است. SDK با همین کلید رویداد می‌فرستد.
                بدون پروژه، داشبورد و مشکلات خالی می‌مانند.
            </p>

            <div className={parentStyles.guideGrid}>
                <div className={parentStyles.guideCard}>
                    <h3>ترتیب کار</h3>
                    <ol>
                        <li>از <Link href="/error-tracking/projects/new">پروژه جدید</Link> نام و پلتفرم را بزنید.</li>
                        <li>کلید عمومی را کپی کنید.</li>
                        <li>طبق <Link href="/error-tracking/integration">راهنمای اتصال</Link> در اپ بگذارید.</li>
                        <li>یک خطای تست بفرستید تا در مشکلات ظاهر شود.</li>
                    </ol>
                </div>
                <div className={parentStyles.guideCard}>
                    <h3>کلید و چرخش</h3>
                    <ul>
                        <li>کلید عمومی مثل رمز ورود رویداد است؛ در فرانت هم می‌آید ولی نرخ محدود دارد.</li>
                        <li>اگر لو رفت «چرخش کلید» بزنید؛ SDKهای قدیمی دیگر قبول نمی‌شوند.</li>
                        <li>Slug بعد از ساخت عوض نمی‌شود.</li>
                    </ul>
                </div>
                <div className={parentStyles.guideCard}>
                    <h3>پلتفرم و محیط</h3>
                    <ul>
                        <li>پلتفرم فقط برای دسته‌بندی است (Node، Next، مرورگر…).</li>
                        <li>محیط پیش‌فرض production / staging / development را جدا می‌کند.</li>
                        <li>برای استودیو و API معمولاً دو پروژه جدا بهتر از یکی است.</li>
                    </ul>
                </div>
                <div className={parentStyles.guideCard}>
                    <h3>حذف</h3>
                    <ul>
                        <li>حذف پروژه مشکلات و رویدادهایش را از پنل برمی‌دارد.</li>
                        <li>اگر اپ هنوز کلید قدیم را دارد، رویدادها خطا می‌خورند و گم می‌شوند.</li>
                    </ul>
                </div>
            </div>

            <div className={hrStyles.employeesGuideExample}>
                <h3>مثال عملی</h3>
                <p>
                    پروژه «hosheton_studio» با پلتفرم Next.js → کلید در متغیر محیطی فرانت → خطاهای چت در مشکلات همین
                    پروژه جمع می‌شوند. API جداگانه پروژه «hosheton API» می‌گیرد تا لاگ سرور با خطای UI قاطی نشود.
                </p>
            </div>

            <div className={hrStyles.employeesGuideNote}>
                <strong>نکته:</strong> محدودیت در دقیقه جلوی اسپم را می‌گیرد. اگر رویدادها کم می‌رسند، این عدد و شبکه را چک کنید نه فقط SDK.
            </div>
        </section>
    );
}
