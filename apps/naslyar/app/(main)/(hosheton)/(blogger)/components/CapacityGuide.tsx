'use client';

import Link from 'next/link';
import parentStyles from '@/app/(main)/marketing/Marketing.module.scss';
import hrStyles from '@/app/(main)/management/hr/Hr.module.scss';

export default function CapacityGuide() {
    return (
        <section className={parentStyles.guideContainer}>
            <div className={parentStyles.guideHeader}>
                <div className={parentStyles.guideTitleGroup}>
                    <span className={parentStyles.guideIcon}>🔌</span>
                    <h2 className={parentStyles.guideTitle}>آموزش اکانت‌ها</h2>
                </div>
                <span className={parentStyles.guideBadge}>راهنمای ادمین</span>
            </div>

            <p className={hrStyles.employeesGuideIntro}>
                مشتری‌های بلاگر اکانت <strong>اینستاگرام، یوتیوب، تیک‌تاک، ایکس و لینکدین</strong> خود را از طریق
                {' '}<Link href="/zernio-keys">ظرفیت‌ها</Link> وصل می‌کنند. هر کلید چند <strong>جای خالی</strong>
                {' '}(پیش‌فرض ۲) دارد و هر اکانت متصل یکی از آن‌ها را می‌گیرد. این صفحه نشان می‌دهد چند جا مانده و
                {' '}<strong>کدام مشتری (نام و ایمیل)</strong> روی کدام کلید نشسته است. تلگرام، بله و روبیکا مستقیم وصل
                می‌شوند و اینجا نمی‌آیند.
            </p>

            <div className={parentStyles.guideGrid}>
                <div className={parentStyles.guideCard}>
                    <h3>معنی اعداد بالا</h3>
                    <ul>
                        <li><strong>ظرفیت کل</strong>: جمع سقف همهٔ کلیدها.</li>
                        <li><strong>مصرف‌شده</strong>: اکانت‌هایی که الان یک جا گرفته‌اند.</li>
                        <li><strong>آزاد</strong>: اگر صفر شود، دکمهٔ افزودن این شبکه‌ها برای مشتری غیرفعال می‌شود.</li>
                    </ul>
                </div>

                <div className={parentStyles.guideCard}>
                    <h3>وقتی ظرفیت کم شد</h3>
                    <ol>
                        <li>در Zernio یک حساب/کلید تازه بسازید.</li>
                        <li>از <Link href="/zernio-keys/new">افزودن کلید</Link> آن را ثبت کنید — webhook خودکار ساخته می‌شود.</li>
                        <li>یا اگر پلن Zernio اجازه می‌دهد، سقف یک کلید را در صفحهٔ ویرایش همان کلید بالا ببرید.</li>
                    </ol>
                </div>

                <div className={parentStyles.guideCard}>
                    <h3>دو نمای جدول</h3>
                    <ul>
                        <li><strong>مشتری‌ها</strong>: هر مشتری یک ردیف — چند اکانت و روی چه شبکه‌هایی.</li>
                        <li><strong>اکانت‌ها</strong>: هر اکانت متصل یک ردیف — کلید، زمان اتصال و وضعیت.</li>
                    </ul>
                </div>

                <div className={parentStyles.guideCard}>
                    <h3>وضعیت «قطع»</h3>
                    <ul>
                        <li>اکانت هنوز جایش را نگه داشته ولی اتصالش از سمت شبکه قطع شده.</li>
                        <li>از مشتری بخواهید از «اکانت‌ها» دوباره وصلش کند، یا اکانت را حذف کند تا جا آزاد شود.</li>
                    </ul>
                </div>
            </div>

            <div className={hrStyles.employeesGuideExample}>
                <h3>مثال عملی</h3>
                <p>
                    ۳ کلید با سقف ۲ = ظرفیت ۶. خانم «مریم احمدی» (maryam@example.com) پیج اینستاگرام و کانال یوتیوب
                    فروشگاهش را وصل کرده → ۲ جا مصرف شده و در تب «مشتری‌ها» با نام و ایمیلش دیده می‌شود. وقتی «آزاد»
                    به ۱ رسید، قبل از تمام‌شدن یک کلید تازه اضافه کنید.
                </p>
            </div>

            <div className={hrStyles.employeesGuideNote}>
                <strong>نکته:</strong> اگر هشدار «کلید بدون webhook» دیدید، کامنت‌ها و پیام‌های اکانت‌های آن کلید به
                صندوق «تعامل» نمی‌رسد. از <Link href="/zernio-keys">ظرفیت‌ها</Link> دکمهٔ «ثبت webhook» همان کلید را
                بزنید؛ با هر اتصال اکانت جدید هم این کار خودکار انجام می‌شود.
            </div>
        </section>
    );
}
