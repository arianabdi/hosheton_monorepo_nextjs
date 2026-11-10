'use client';

import Link from 'next/link';
import parentStyles from '@/app/(main)/marketing/Marketing.module.scss';
import hrStyles from '@/app/(main)/management/hr/Hr.module.scss';

export default function ZernioKeysGuide() {
    return (
        <section className={parentStyles.guideContainer}>
            <div className={parentStyles.guideHeader}>
                <div className={parentStyles.guideTitleGroup}>
                    <span className={parentStyles.guideIcon}>🔑</span>
                    <h2 className={parentStyles.guideTitle}>آموزش ظرفیت‌ها</h2>
                </div>
                <span className={parentStyles.guideBadge}>راهنمای ادمین</span>
            </div>

            <p className={hrStyles.employeesGuideIntro}>
                هر ردیف یک کلید API از یک حساب Zernio است و بین <strong>همهٔ مشتری‌ها مشترک</strong> است. وقتی مشتری
                اکانتی وصل می‌کند، کلیدی که بیشترین جای خالی را دارد انتخاب می‌شود. این صفحه جای مدیریت کلیدهاست؛
                {' '}اینکه کدام مشتری روی کدام کلید است را در <Link href="/capacity">اکانت‌ها</Link> ببینید.
            </p>

            <div className={parentStyles.guideGrid}>
                <div className={parentStyles.guideCard}>
                    <h3>پیش‌نیازها</h3>
                    <ol>
                        <li>در <Link href="/zernio-keys/settings">تنظیمات اتصال</Link> آدرس عمومی API (دامنه یا ngrok) درست باشد.</li>
                        <li>در پنل Zernio یک API Key بسازید (با <code>sk_</code> شروع می‌شود).</li>
                        <li>آن را در <Link href="/zernio-keys/new">افزودن کلید</Link> ثبت کنید.</li>
                    </ol>
                </div>

                <div className={parentStyles.guideCard}>
                    <h3>webhook خودکار است</h3>
                    <ul>
                        <li>با افزودن کلید و با <strong>هر اتصال اکانت</strong>، webhook در Zernio ساخته یا اصلاح می‌شود.</li>
                        <li>webhook دستی با آدرس اشتباه پیدا و درست می‌شود؛ لازم نیست در Zernio کاری کنید.</li>
                        <li>«ثبت webhook» همین کار را همین الان انجام می‌دهد.</li>
                    </ul>
                </div>

                <div className={parentStyles.guideCard}>
                    <h3>ویرایش کلید</h3>
                    <ul>
                        <li>برچسب و سقف ظرفیت همیشه قابل تغییرند (سقف کمتر از اکانت‌های فعلی نمی‌شود).</li>
                        <li>کلید چرخیده‌شده‌ی <strong>همان حساب Zernio</strong> را می‌توانید جایگزین کنید؛ اکانت‌ها وصل می‌مانند.</li>
                    </ul>
                </div>

                <div className={parentStyles.guideCard}>
                    <h3>اشتباهات رایج</h3>
                    <ul>
                        <li>ثبت کلید وقتی آدرس عمومی هنوز localhost است → webhook ساخته نمی‌شود.</li>
                        <li>حذف کلیدی که اکانت دارد ممکن نیست؛ اول اکانت‌ها باید حذف شوند.</li>
                        <li>کلید یک حساب دیگر Zernio را روی کلیدِ دارای اکانت نگذارید.</li>
                    </ul>
                </div>
            </div>

            <div className={hrStyles.employeesGuideExample}>
                <h3>مثال عملی</h3>
                <p>
                    کلید «hosheton_series_3» با سقف ۲ اضافه می‌شود → webhook آن در Zernio ساخته می‌شود → مشتری پیج
                    اینستاگرامش را وصل می‌کند → کامنت‌های پیج در «تعامل» بلاگر می‌آید و این ردیف «۱ از ۲» نشان می‌دهد.
                </p>
            </div>

            <div className={hrStyles.employeesGuideNote}>
                <strong>نکته:</strong> کلید فقط یک بار وارد می‌شود و رمزگذاری‌شده ذخیره می‌شود؛ اینجا فقط ۴ رقم آخرش را
                می‌بینید. تغییر آدرس ngrok در توسعه = webhookها با اولین اتصال یا «ثبت webhook» به آدرس تازه منتقل می‌شوند.
            </div>
        </section>
    );
}
