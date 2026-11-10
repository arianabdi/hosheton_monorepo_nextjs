'use client';

import Link from 'next/link';
import parentStyles from '../../Marketing.module.scss';
import hrStyles from '../../../management/hr/Hr.module.scss';
import styles from '../Banners.module.scss';

export default function PlacementsGuide() {
    return (
        <section className={parentStyles.guideContainer}>
            <div className={parentStyles.guideHeader}>
                <div className={parentStyles.guideTitleGroup}>
                    <span className={parentStyles.guideIcon}>📍</span>
                    <h2 className={parentStyles.guideTitle}>آموزش جایگاه بنر</h2>
                </div>
                <span className={parentStyles.guideBadge}>راهنمای ادمین</span>
            </div>

            <p className={hrStyles.employeesGuideIntro}>
                جایگاه یعنی <strong>کجای صفحه</strong> بنر نشان داده شود — نه خود تصویر. هر جایگاه یک{' '}
                <strong>key یکتا</strong> دارد (مثل <span className={styles.keyBadge}>studio.sidebar.square</span>)
                که باید با کد فرانت‌اند استودیو یکی باشد. marکتر بعداً در بخش بنرها، خلاقیت را به همین key وصل می‌کند.
            </p>

            <div className={parentStyles.guideGrid}>
                <div className={parentStyles.guideCard}>
                    <h3>جایگاه چه چیزی نیست؟</h3>
                    <ul>
                        <li>جایگاه فایل تصویر ندارد؛ تصویر در <Link href="/marketing/banners/creatives">خلاقیت‌ها</Link> است.</li>
                        <li>جایگاه زمان‌بندی و اولویت ندارد؛ آن‌ها در <Link href="/marketing/banners/list">بنرها</Link> تنظیم می‌شوند.</li>
                        <li>اگر جایگاهی در پنل باشد ولی در کد استودیو استفاده نشود، چیزی روی سایت دیده نمی‌شود.</li>
                    </ul>
                </div>

                <div className={parentStyles.guideCard}>
                    <h3>ترتیب کار</h3>
                    <ol>
                        <li>با تیم فنی هماهنگ کنید key دقیقاً چه باشد (یا از داده‌های نمونه استودیو استفاده کنید).</li>
                        <li>از <Link href="/marketing/banners/placements/new">جایگاه جدید</Link> ابعاد و فرمت مجاز را ثبت کنید.</li>
                        <li>یک <Link href="/marketing/banners/creatives">خلاقیت</Link> با تصویر مناسب همان نسبت بسازید.</li>
                        <li>در <Link href="/marketing/banners/list">بنرها</Link> خلاقیت را به این جایگاه وصل و فعال کنید.</li>
                    </ol>
                </div>

                <div className={parentStyles.guideCard}>
                    <h3>ابعاد و قفل نسبت</h3>
                    <ul>
                        <li>عرض و ارتفاع «مجاز» راهنمای طراح است؛ نمایش نهایی با عرض ظرف صفحه کش می‌آید.</li>
                        <li>قفل نسبت یعنی با تغییر عرض، ارتفاع خودکار هم‌نسبت می‌ماند (مثلاً ۸:۱ برای نوار زیر چت).</li>
                        <li>نسبت را به شکل <span className={styles.keyBadge}>16:9</span> یا <span className={styles.keyBadge}>2.74:1</span> وارد کنید.</li>
                    </ul>
                </div>

                <div className={parentStyles.guideCard}>
                    <h3>کلیدهای واقعی استودیو</h3>
                    <ul>
                        <li><span className={styles.keyBadge}>studio.sidebar.square</span> مربع پایین سایدبار (۱:۱)</li>
                        <li><span className={styles.keyBadge}>studio.chat.input.below</span> نوار زیر چت‌باکس (۸:۱)</li>
                        <li><span className={styles.keyBadge}>studio.wallet.balance</span> بین موجودی و نرخ دلار</li>
                        <li><span className={styles.keyBadge}>studio.explore.top</span> اولین کارت صفحه اکسپلور</li>
                    </ul>
                </div>
            </div>

            <div className={hrStyles.employeesGuideExample}>
                <h3>مثال عملی</h3>
                <p>
                    جایگاه «زیر چت‌باکس» با key بالا + عرض ۹۶۰ و ارتفاع ۱۲۰ ساخته می‌شود → طراح تصویر ۹۶۰×۱۲۰ را در
                    خلاقیت آپلود می‌کند → بنر فعال به همین جایگاه وصل می‌شود → در hosheton_studio زیر چت دیده می‌شود.
                    برای دیدن محل دقیق روی سایت، در منوی Developer استودیو «نمایش لوکیشن بنرها» را روشن کنید.
                </p>
            </div>

            <div className={hrStyles.employeesGuideNote}>
                <strong>نکته:</strong> پس از ساخت جایگاه، key قابل تغییر نیست چون در کد فرانت قفل شده. اگر نام یا ابعاد
                را عوض کنید مشکلی نیست؛ اگر key اشتباه باشد باید جایگاه جدید بسازید. برای شروع سریع از دکمه «داده‌های
                نمونه استودیو» استفاده کنید — موارد تکراری دوباره ساخته نمی‌شوند.
            </div>
        </section>
    );
}
