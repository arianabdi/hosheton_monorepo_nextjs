'use client';

import Link from 'next/link';
import parentStyles from '../../Marketing.module.scss';
import hrStyles from '../../../management/hr/Hr.module.scss';
import styles from '../Banners.module.scss';

/**
 * راهنمای کتابخانه خلاقیت — الگوی آموزش کارمندان:
 * معرفی، کارت‌های مرحله‌ای، مثال عملی و نکته.
 */
export default function CreativeGuide() {
    return (
        <section className={parentStyles.guideContainer}>
            <div className={parentStyles.guideHeader}>
                <div className={parentStyles.guideTitleGroup}>
                    <span className={parentStyles.guideIcon}>🎨</span>
                    <h2 className={parentStyles.guideTitle}>آموزش کتابخانه خلاقیت</h2>
                </div>
                <span className={parentStyles.guideBadge}>راهنمای ادمین</span>
            </div>

            <p className={hrStyles.employeesGuideIntro}>
                خلاقیت یعنی <strong>خودِ بنر</strong>: تصویر هر دستگاه، متن دکمه، لینک، متن جایگزین و زبان.
                مستقل از جایگاه است؛ یک خلاقیت را می‌توانید در چند بنر و چند صفحه استودیو استفاده کنید بدون اینکه
                فایل را دوباره آپلود کنید.
            </p>

            <div className={parentStyles.guideGrid}>
                <div className={parentStyles.guideCard}>
                    <h3>تفاوت خلاقیت و بنر</h3>
                    <ul>
                        <li><strong>خلاقیت:</strong> فایل و متن تبلیغ (چه چیزی دیده شود).</li>
                        <li><Link href="/marketing/banners/list">بنر</Link>: اتصال همان فایل به جایگاه + زمان و اولویت.</li>
                        <li><Link href="/marketing/banners/placements">جایگاه</Link>: محل ثابت روی صفحه (کجا دیده شود).</li>
                    </ul>
                </div>

                <div className={parentStyles.guideCard}>
                    <h3>ترتیب ساخت</h3>
                    <ol>
                        <li>نسبت تصویر را از جزئیات جایگاه بردارید (مثلاً ۸:۱ برای زیر چت).</li>
                        <li>از <Link href="/marketing/banners/creatives/new">خلاقیت جدید</Link> فایل را از مدیریت فایل انتخاب کنید.</li>
                        <li>حداقل یک دستگاه کافی است؛ بهتر است دسکتاپ و موبایل جدا باشد.</li>
                        <li>خلاقیت را فعال بگذارید و بعد در بنرها وصلش کنید.</li>
                    </ol>
                </div>

                <div className={parentStyles.guideCard}>
                    <h3>فایل هر دستگاه</h3>
                    <ul>
                        <li>ابعاد تصویر بعد از انتخاب، خودکار تشخیص داده می‌شود.</li>
                        <li>اگر نسخه موبایل نباشد، استودیو همان دسکتاپ را نشان می‌دهد.</li>
                        <li>فرمت را با جایگاه هماهنگ کنید: معمولاً jpg، png یا webp.</li>
                    </ul>
                </div>

                <div className={parentStyles.guideCard}>
                    <h3>CTA و سئو</h3>
                    <ul>
                        <li>متن دکمه کوتاه باشد: «ارتقا بده»، «شارژ کیف پول».</li>
                        <li>لینک می‌تواند صفحه استودیو یا آدرس خارجی باشد.</li>
                        <li>Alt برای دسترس‌پذیری و زمانی که تصویر لود نشود لازم است.</li>
                    </ul>
                </div>
            </div>

            <div className={hrStyles.employeesGuideExample}>
                <h3>مثال عملی</h3>
                <p>
                    خلاقیت «ارتقای حساب حرفه‌ای» با تصویر دسکتاپ ۹۶۰×۱۲۰ و موبایل ۱۰۸۰×۲۷۰ → دو بنر جدا: یکی روی
                    <span className={styles.keyBadge}> studio.chat.input.below </span>
                    و یکی روی
                    <span className={styles.keyBadge}> studio.wallet.balance </span>
                    → یک فایل، دو محل نمایش. اگر خلاقیت را غیرفعال کنید هر دو بنر از سایت حذف می‌شوند.
                </p>
            </div>

            <div className={hrStyles.employeesGuideNote}>
                <strong>نکته:</strong> خلاقیت غیرفعال در هیچ بنری نمایش داده نمی‌شود حتی اگر بنر فعال باشد. برای شروع
                سریع، از دکمه «داده‌های نمونه استودیو» بالای فهرست جایگاه‌ها یا بنرها استفاده کنید.
            </div>
        </section>
    );
}
