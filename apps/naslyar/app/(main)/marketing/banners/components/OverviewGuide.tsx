'use client';

import Link from 'next/link';
import parentStyles from '../../Marketing.module.scss';
import hrStyles from '../../../management/hr/Hr.module.scss';
import styles from '../Banners.module.scss';

export default function OverviewGuide() {
    return (
        <section className={parentStyles.guideContainer}>
            <div className={parentStyles.guideHeader}>
                <div className={parentStyles.guideTitleGroup}>
                    <span className={parentStyles.guideIcon}>🎯</span>
                    <h2 className={parentStyles.guideTitle}>آموزش سیستم بنر استودیو</h2>
                </div>
                <span className={parentStyles.guideBadge}>راهنمای ادمین</span>
            </div>

            <p className={hrStyles.employeesGuideIntro}>
                بنرهای تبلیغاتی در سه لایه جدا مدیریت می‌شوند تا یک تصویر را بدون تغییر کد، در چند جای
                hosheton_studio نشان دهید. جایگاه می‌گوید <strong>کجا</strong>، خلاقیت می‌گوید <strong>چه چیزی</strong>،
                و بنر می‌گوید <strong>کی و با چه شرایطی</strong>.
            </p>

            <div className={parentStyles.guideGrid}>
                <div className={parentStyles.guideCard}>
                    <h3>۱. جایگاه (Placement)</h3>
                    <ul>
                        <li>لوکیشن ثابت صفحه با key یکتا.</li>
                        <li>تیم فنی باکس را در استودیو می‌گذارد؛ شما ابعاد و فرمت را ثبت می‌کنید.</li>
                        <li>شروع از <Link href="/marketing/banners/placements">جایگاه‌ها</Link>.</li>
                    </ul>
                </div>

                <div className={parentStyles.guideCard}>
                    <h3>۲. خلاقیت (Creative)</h3>
                    <ul>
                        <li>فایل تصویر دسکتاپ / تبلت / موبایل + متن و لینک دکمه.</li>
                        <li>یک بار آپلود می‌شود و در چند بنر قابل استفاده است.</li>
                        <li>شروع از <Link href="/marketing/banners/creatives">خلاقیت‌ها</Link>.</li>
                    </ul>
                </div>

                <div className={parentStyles.guideCard}>
                    <h3>۳. بنر (نمایش)</h3>
                    <ul>
                        <li>اتصال خلاقیت به یک یا چند جایگاه.</li>
                        <li>وضعیت، تاریخ، اولویت، سقف نمایش و هدف‌گیری.</li>
                        <li>شروع از <Link href="/marketing/banners/list">بنرها</Link>.</li>
                    </ul>
                </div>

                <div className={parentStyles.guideCard}>
                    <h3>۴. آمار</h3>
                    <ul>
                        <li>نمایش، کلیک و CTR بعد از دیده شدن در استودیو.</li>
                        <li>برای مقایسه خلاقیت‌ها و جایگاه‌ها.</li>
                        <li>مشاهده در <Link href="/marketing/banners/analytics">آمار</Link>.</li>
                    </ul>
                </div>
            </div>

            <div className={hrStyles.employeesGuideExample}>
                <h3>مثال عملی</h3>
                <p>
                    جایگاه سایدبار با key <span className={styles.keyBadge}>studio.sidebar.square</span> + خلاقیت مربع
                    ۲۴۰×۲۴۰ «ابزارهای سریع» + بنر فعال → کاربر در همه صفحات استودیو مربع تبلیغ را پایین منو می‌بیند.
                    برای تست محل‌ها، در منوی Developer استودیو «نمایش لوکیشن بنرها» را روشن کنید.
                </p>
            </div>

            <div className={hrStyles.employeesGuideNote}>
                <strong>نکته:</strong> اگر تازه شروع می‌کنید، از «داده‌های نمونه استودیو» در فهرست جایگاه‌ها یا بنرها
                استفاده کنید؛ چهار جایگاه واقعی به‌همراه خلاقیت و بنر فعال ساخته می‌شود و موارد موجود تکرار نمی‌شوند.
            </div>
        </section>
    );
}
