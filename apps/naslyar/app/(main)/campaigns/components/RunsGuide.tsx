'use client';

import Link from 'next/link';
import parentStyles from '../../marketing/Marketing.module.scss';
import hrStyles from '../../management/hr/Hr.module.scss';

export default function RunsGuide() {
    return (
        <section className={parentStyles.guideContainer}>
            <div className={parentStyles.guideHeader}>
                <div className={parentStyles.guideTitleGroup}>
                    <span className={parentStyles.guideIcon}>▶️</span>
                    <h2 className={parentStyles.guideTitle}>آموزش اجراهای کمپین</h2>
                </div>
                <span className={parentStyles.guideBadge}>راهنمای ادمین</span>
            </div>

            <p className={hrStyles.employeesGuideIntro}>
                هر ردیف یعنی <strong>عبور یک کاربر از یک فلو</strong>. تاریخچه نودها، نود فعلی و خطا اینجا دیده
                می‌شود. اجراهای «منتظر» بعد از تمام شدن تاخیر زمانی خودشان ادامه می‌یابند.
            </p>

            <div className={parentStyles.guideGrid}>
                <div className={parentStyles.guideCard}>
                    <h3>وضعیت اجرا</h3>
                    <ul>
                        <li><strong>در حال اجرا:</strong> الان روی یک نود است.</li>
                        <li><strong>منتظر (تاخیر):</strong> نود تاخیر هنوز تمام نشده.</li>
                        <li><strong>تکمیل شده:</strong> به انتهای فلو رسیده.</li>
                        <li><strong>ناموفق / لغو شده:</strong> خطا خورده یا دستی متوقف شده.</li>
                    </ul>
                </div>

                <div className={parentStyles.guideCard}>
                    <h3>چطور تست کنیم؟</h3>
                    <ol>
                        <li>کمپین را در <Link href="/campaigns">فهرست کمپین‌ها</Link> با تریگر «اجرای دستی» زنده کنید.</li>
                        <li>از همین صفحه فیلتر کمپین را بزنید یا از ردیف کمپین «اجراها» را باز کنید.</li>
                        <li>«تاریخچه» مسیر نود به نود همان کاربر را نشان می‌دهد.</li>
                    </ol>
                </div>

                <div className={parentStyles.guideCard}>
                    <h3>اگر خالی است</h3>
                    <ul>
                        <li>کمپین باید «زنده» باشد؛ پیش‌نویس اجرا نمی‌شود.</li>
                        <li>تریگر رویداد: رویداد واقعی باید از پلتفرم آمده باشد.</li>
                        <li>تریگر دستی: باید برای یک کاربر مشخص شروع شده باشد.</li>
                    </ul>
                </div>

                <div className={parentStyles.guideCard}>
                    <h3>لغو و خطا</h3>
                    <ul>
                        <li>اجرای در حال اجرا یا منتظر را می‌توانید لغو کنید.</li>
                        <li>متن قرمز زیر وضعیت، دلیل شکست نود است (مثلاً پیامک بدون متن).</li>
                        <li>از لینک «مشاهده فلو» همان کمپین را برای اصلاح نود باز کنید.</li>
                    </ul>
                </div>
            </div>

            <div className={hrStyles.employeesGuideExample}>
                <h3>مثال عملی</h3>
                <p>
                    کاربر «علی» کمپین تشکر از خرید را شروع کرده: گام ۱ پیامک ارسال شد، گام ۲ تاخیر ۱ ساعته
                    (وضعیت منتظر)، بعد از یک ساعت شاخه YES کد تخفیف می‌گیرد. اگر پیامک تنظیم نشده باشد اجرا ناموفق
                    می‌شود و همان خطا اینجاست.
                </p>
            </div>

            <div className={hrStyles.employeesGuideNote}>
                <strong>نکته:</strong> لغو اجرا، کمپین را متوقف نمی‌کند؛ فقط همین عبور کاربر قطع می‌شود. برای خاموش کردن
                کل فلو، وضعیت کمپین را در ویرایش به «متوقف» تغییر دهید.
            </div>
        </section>
    );
}
