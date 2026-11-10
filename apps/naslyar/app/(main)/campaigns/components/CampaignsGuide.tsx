'use client';

import Link from 'next/link';
import parentStyles from '../../marketing/Marketing.module.scss';
import hrStyles from '../../management/hr/Hr.module.scss';
import styles from '../Campaigns.module.scss';

export default function CampaignsGuide() {
    return (
        <section className={parentStyles.guideContainer}>
            <div className={parentStyles.guideHeader}>
                <div className={parentStyles.guideTitleGroup}>
                    <span className={parentStyles.guideIcon}>⚡</span>
                    <h2 className={parentStyles.guideTitle}>آموزش ساخت کمپین</h2>
                </div>
                <span className={parentStyles.guideBadge}>راهنمای ادمین</span>
            </div>

            <p className={hrStyles.employeesGuideIntro}>
                کمپین یک <strong>فلو خودکار</strong> است: با یک تریگر شروع می‌شود و نود به نود ادامه پیدا می‌کند —
                پیامک، شارژ کیف پول، کد تخفیف، اطلاع داخلی، وب‌هوک، به‌روزرسانی پروفایل، تاخیر و تفکیک شرطی.
                مستقل از بخش بنرهاست؛ بنر تبلیغ روی صفحه است و کمپین کار روی کاربر.
            </p>

            <div className={parentStyles.guideGrid}>
                <div className={parentStyles.guideCard}>
                    <h3>ترتیب کار</h3>
                    <ol>
                        <li>از <Link href="/campaigns/new">کمپین جدید</Link> نام و نوع تریگر را مشخص کنید.</li>
                        <li>از پالت سمت راست اولین نود را بگذارید (نود شروع).</li>
                        <li>با دکمه + زیر هر نود، گام بعدی را اضافه کنید.</li>
                        <li>روی «تنظیم» هر نود، متن پیامک یا مبلغ و شرط را پر کنید.</li>
                        <li>اول «ذخیره پیش‌نویس»، بعد از تست «انتشار زنده».</li>
                    </ol>
                </div>

                <div className={parentStyles.guideCard}>
                    <h3>دو نوع تریگر</h3>
                    <ul>
                        <li><strong>اجرای دستی:</strong> خودتان از صفحه اجراها یا API برای یک کاربر شروع می‌کنید.</li>
                        <li><strong>رویداد پلتفرم:</strong> وقتی رویدادی مثل <span className={styles.keyBadge}>order_placed</span> بیاید، فلو خودش اجرا می‌شود.</li>
                        <li>نام رویداد باید دقیقاً با چیزی که بک‌اند می‌فرستد یکی باشد.</li>
                    </ul>
                </div>

                <div className={parentStyles.guideCard}>
                    <h3>وضعیت‌ها یعنی چه؟</h3>
                    <ul>
                        <li><strong>پیش‌نویس:</strong> ذخیره شده ولی اجرا نمی‌شود.</li>
                        <li><strong>زنده:</strong> تریگر رویداد یا اجرای دستی کار می‌کند.</li>
                        <li><strong>متوقف:</strong> موقتاً خاموش؛ اجراهای در جریان تمام می‌شوند ولی جدید شروع نمی‌شود.</li>
                        <li><strong>بایگانی:</strong> کمپین تمام‌شده؛ برای سابقه.</li>
                    </ul>
                </div>

                <div className={parentStyles.guideCard}>
                    <h3>نودهای مهم</h3>
                    <ul>
                        <li><strong>اکشن:</strong> پیامک، شارژ کیف پول، تخفیف، اطلاع، وب‌هوک، پروفایل.</li>
                        <li><strong>تاخیر:</strong> اجرا را چند دقیقه/ساعت/روز نگه می‌دارد (وضعیت «منتظر»).</li>
                        <li><strong>تفکیک شرطی:</strong> شاخه YES/NO مثلاً اگر موجودی کیف پول بیشتر از صفر باشد.</li>
                    </ul>
                </div>
            </div>

            <div className={hrStyles.employeesGuideExample}>
                <h3>مثال عملی</h3>
                <p>
                    کمپین «تشکر از خرید» با تریگر <span className={styles.keyBadge}>order_placed</span> + نود پیامک
                    «خریدت ثبت شد» + تاخیر ۱ ساعت + تفکیک: اگر خرید بالای ۵۰۰ هزار → کد تخفیف ۱۰٪، وگرنه فقط اطلاع
                    داخلی. وضعیت زنده → هر سفارش جدید این مسیر را برای همان کاربر طی می‌کند. مسیر هر کاربر را در
                    {' '}<Link href="/campaigns/runs">اجراها</Link> ببینید.
                </p>
            </div>

            <div className={hrStyles.employeesGuideNote}>
                <strong>نکته:</strong> تا وقتی نود شروع نداشته باشید نمی‌توانید منتشر کنید. نود غیرفعال در اجرا رد
                می‌شود و به بعدی می‌رود. اگر کمپین زنده است ولی اجرایی نمی‌بینید، نام رویداد و وضعیت «زنده» را چک کنید.
            </div>
        </section>
    );
}
