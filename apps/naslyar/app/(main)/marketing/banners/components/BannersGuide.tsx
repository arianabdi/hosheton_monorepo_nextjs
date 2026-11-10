'use client';

import Link from 'next/link';
import parentStyles from '../../Marketing.module.scss';
import hrStyles from '../../../management/hr/Hr.module.scss';
import styles from '../Banners.module.scss';

export default function BannersGuide() {
    return (
        <section className={parentStyles.guideContainer}>
            <div className={parentStyles.guideHeader}>
                <div className={parentStyles.guideTitleGroup}>
                    <span className={parentStyles.guideIcon}>📣</span>
                    <h2 className={parentStyles.guideTitle}>آموزش اتصال بنر به صفحه</h2>
                </div>
                <span className={parentStyles.guideBadge}>راهنمای ادمین</span>
            </div>

            <p className={hrStyles.employeesGuideIntro}>
                بنر یعنی <strong>کدام خلاقیت، در کدام جایگاه، با چه شرایطی</strong> نشان داده شود. خود تصویر در
                خلاقیت است و محل نمایش در جایگاه. اینجا فقط قوانین نمایش را می‌چینید: وضعیت، زمان، اولویت، سقف
                نمایش و مخاطب هدف. فقط بنرهای <strong>فعال</strong> در Renderer استودیو برمی‌گردند.
            </p>

            <div className={parentStyles.guideGrid}>
                <div className={parentStyles.guideCard}>
                    <h3>پیش‌نیازها</h3>
                    <ol>
                        <li>حداقل یک <Link href="/marketing/banners/placements">جایگاه</Link> با key معتبر استودیو.</li>
                        <li>حداقل یک <Link href="/marketing/banners/creatives">خلاقیت فعال</Link> با تصویر.</li>
                        <li>سپس از <Link href="/marketing/banners/list/new">بنر جدید</Link> آن دو را به هم وصل کنید.</li>
                    </ol>
                </div>

                <div className={parentStyles.guideCard}>
                    <h3>وضعیت‌ها یعنی چه؟</h3>
                    <ul>
                        <li><strong>پیش‌نویس:</strong> ذخیره شده ولی روی سایت نیست.</li>
                        <li><strong>فعال:</strong> اگر زمان و قوانین برقرار باشد نمایش داده می‌شود.</li>
                        <li><strong>متوقف:</strong> موقتاً خاموش؛ بعداً دوباره فعال کنید.</li>
                        <li><strong>بایگانی:</strong> تمام‌شده؛ برای آرشیو کمپین.</li>
                    </ul>
                </div>

                <div className={parentStyles.guideCard}>
                    <h3>اولویت و وزن</h3>
                    <ul>
                        <li>اگر چند بنر فعال روی یک جایگاه باشند، <strong>اولویت بالاتر</strong> برنده است.</li>
                        <li>بین هم‌اولویت‌ها، <strong>وزن</strong> احتمال چرخش را مشخص می‌کند (مثلاً ۷۰ و ۳۰).</li>
                        <li>برای یک کمپین ثابت معمولاً اولویت ۱۰ و وزن ۵۰ کافی است.</li>
                    </ul>
                </div>

                <div className={parentStyles.guideCard}>
                    <h3>زمان و هدف‌گیری</h3>
                    <ul>
                        <li>تاریخ شروع/پایان و ساعت روزانه اختیاری‌اند؛ خالی یعنی همیشه.</li>
                        <li>سقف نمایش جلوی تکرار زیاد برای یک کاربر را می‌گیرد.</li>
                        <li>قوانین دستگاه / زبان / ورود کاربر، بنر را فقط به همان مخاطب نشان می‌دهد.</li>
                    </ul>
                </div>
            </div>

            <div className={hrStyles.employeesGuideExample}>
                <h3>مثال عملی</h3>
                <p>
                    خلاقیت «ارتقای حساب» + جایگاه <span className={styles.keyBadge}>studio.chat.input.below</span> +
                    وضعیت فعال + اولویت ۱۰ → کاربر در صفحه چت استودیو نوار تبلیغ را زیر چت‌باکس می‌بیند. اگر همان
                    خلاقیت را به جایگاه کیف پول هم وصل کنید، یک تصویر در دو جای مختلف نشان داده می‌شود بدون آپلود دوباره.
                </p>
            </div>

            <div className={hrStyles.employeesGuideNote}>
                <strong>نکته:</strong> اگر بنر فعال است ولی در استودیو دیده نمی‌شود، خلاقیت را چک کنید (باید فعال باشد)،
                تاریخ را بررسی کنید، و در استودیو «نمایش لوکیشن بنرها» را روشن کنید تا ببینید جایگاه خالی است یا پر.
                آمار کلیک و نمایش بعد از دیدن واقعی کاربر در تب <Link href="/marketing/banners/analytics">آمار</Link> می‌آید.
            </div>
        </section>
    );
}
