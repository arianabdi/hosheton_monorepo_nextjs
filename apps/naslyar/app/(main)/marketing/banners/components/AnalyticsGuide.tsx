'use client';

import Link from 'next/link';
import parentStyles from '../../Marketing.module.scss';
import hrStyles from '../../../management/hr/Hr.module.scss';
import styles from '../Banners.module.scss';

export default function AnalyticsGuide() {
    return (
        <section className={parentStyles.guideContainer}>
            <div className={parentStyles.guideHeader}>
                <div className={parentStyles.guideTitleGroup}>
                    <span className={parentStyles.guideIcon}>📊</span>
                    <h2 className={parentStyles.guideTitle}>آموزش آمار بنر</h2>
                </div>
                <span className={parentStyles.guideBadge}>راهنمای ادمین</span>
            </div>

            <p className={hrStyles.employeesGuideIntro}>
                این صفحه فقط رویدادهایی را نشان می‌دهد که فرانت‌اند استودیو هنگام نمایش و کلیک بنر ارسال کرده است.
                تا وقتی بنر <strong>فعال</strong> روی یک جایگاه واقعی دیده نشود، جدول خالی می‌ماند.
            </p>

            <div className={parentStyles.guideGrid}>
                <div className={parentStyles.guideCard}>
                    <h3>معنی اعداد</h3>
                    <ul>
                        <li><strong>Impression:</strong> چند بار بنر برای کاربر رندر شده است.</li>
                        <li><strong>Click:</strong> چند بار روی بنر کلیک شده است.</li>
                        <li><strong>CTR:</strong> نسبت کلیک به نمایش؛ هرچه بالاتر، بنر جذاب‌تر یا جایگاه بهتر است.</li>
                    </ul>
                </div>

                <div className={parentStyles.guideCard}>
                    <h3>چطور پر می‌شود؟</h3>
                    <ol>
                        <li>بنر را در <Link href="/marketing/banners/list">فهرست بنرها</Link> فعال کنید.</li>
                        <li>صفحه مربوط در hosheton_studio را باز کنید (چت، کیف پول، سایدبار یا اکسپلور).</li>
                        <li>نمایش خودکار Impression می‌فرستد؛ کلیک روی تصویر Click را ثبت می‌کند.</li>
                    </ol>
                </div>

                <div className={parentStyles.guideCard}>
                    <h3>اگر صفر است</h3>
                    <ul>
                        <li>وضعیت بنر «فعال» باشد و تاریخ تمام نشده باشد.</li>
                        <li>خلاقیت فعال باشد و تصویر دستگاه کاربر موجود باشد.</li>
                        <li>key جایگاه با کد استودیو یکی باشد (مثلاً <span className={styles.keyBadge}>studio.wallet.balance</span>).</li>
                    </ul>
                </div>

                <div className={parentStyles.guideCard}>
                    <h3>تفسیر سریع</h3>
                    <ul>
                        <li>نمایش زیاد و CTR پایین: تصویر یا متن CTA را عوض کنید.</li>
                        <li>نمایش کم: جایگاه کم‌تر دیده می‌شود یا قوانین هدف‌گیری سخت است.</li>
                        <li>چند بنر روی یک جایگاه: اولویت بالاتر سهم نمایش را می‌گیرد.</li>
                    </ul>
                </div>
            </div>

            <div className={hrStyles.employeesGuideExample}>
                <h3>مثال عملی</h3>
                <p>
                    بنر زیر چت ۱۰۰۰ نمایش و ۴۰ کلیک دارد (CTR ۴٪). بنر سایدبار ۲۰۰ نمایش و ۲۰ کلیک دارد (CTR ۱۰٪).
                    یعنی سایدبار مخاطب درگیرتری دارد؛ می‌توانید همان خلاقیت موفق را با بنر جدا به جایگاه چت هم بدهید.
                </p>
            </div>

            <div className={hrStyles.employeesGuideNote}>
                <strong>نکته:</strong> رویدادها از مسیر <span className={styles.keyBadge}>POST /api/marketing/banners/track</span>{' '}
                می‌آیند. اگر API در دسترس نباشد بنر روی سایت باز هم دیده می‌شود ولی آمار اینجا به‌روز نمی‌شود.
            </div>
        </section>
    );
}
