'use client';

import React from 'react';
import Link from 'next/link';
import parentStyles from '@/app/(main)/marketing/Marketing.module.scss';
import hrStyles from '@/app/(main)/management/hr/Hr.module.scss';

/** آموزش همیشه‌نمایان فهرست دسته‌بندی تگ‌ها (برچسب قالب + دستهٔ سئو اکسپلور) */
export default function TagCategoriesGuide() {
    return (
        <section className={parentStyles.guideContainer}>
            <div className={parentStyles.guideHeader}>
                <div className={parentStyles.guideTitleGroup}>
                    <span className={parentStyles.guideIcon}>🏷️</span>
                    <h2 className={parentStyles.guideTitle}>آموزش دسته‌بندی تگ‌ها</h2>
                </div>
                <span className={parentStyles.guideBadge}>راهنمای ادمین</span>
            </div>

            <p className={hrStyles.employeesGuideIntro}>
                تگ‌ها دو کار می‌کنند: سازنده‌ها هنگام ساخت قالب انتخابشان می‌کنند، و هر تگ در استودیو یک
                <strong> صفحهٔ فرود سئو</strong> است — آدرسش از کلید ساخته می‌شود (<code dir="ltr">human_portrait</code> →
                {' '}<code dir="ltr">/explore/human-portrait</code>). آدرس هر قالب زیر <strong>اولین تگش</strong> است
                (<code dir="ltr">/explore/human-portrait/&lt;slug-قالب&gt;</code>). «موضوع»های صفحهٔ ایده‌ها
                (<Link href="/projects/marketplace/categories">دسته‌بندی موضوعی</Link>) جدا هستند و فقط فیلترند.
            </p>

            <div className={parentStyles.guideGrid}>
                <div className={parentStyles.guideCard}>
                    <h3>ترتیب کار</h3>
                    <ol>
                        <li>تگ را با کلید انگلیسی بسازید؛ اگر ترجمه‌اش در استودیو نیست «نام فارسی» را پر کنید.</li>
                        <li>برای زیرشاخه، «تگ والد» را انتخاب کنید (مسیر: /explore/والد/تگ).</li>
                        <li>توضیح متا و متن معرفی تگ‌های مهم را بنویسید.</li>
                        <li>گروه <code dir="ltr">template-tags</code> را در <Link href="/marketing/sitemap/groups">سایت‌مپ › گروه‌ها</Link> روشن نگه دارید.</li>
                    </ol>
                </div>
                <div className={parentStyles.guideCard}>
                    <h3>آدرس قالب کدام تگ است؟</h3>
                    <ul>
                        <li>اولین تگ قالب (به ترتیبی که در فرم قالب آمده).</li>
                        <li>با عوض شدن تگ اول، آدرس قدیمی خودکار به آدرس جدید ریدایرکت می‌شود.</li>
                        <li>قالب بدون تگ: <code dir="ltr">/explore/&lt;slug&gt;</code>.</li>
                    </ul>
                </div>
                <div className={parentStyles.guideCard}>
                    <h3>معنی ستون سئو</h3>
                    <ul>
                        <li><strong>کامل:</strong> توضیح متا دارد.</li>
                        <li><strong>بدون توضیح متا:</strong> متن پیش‌فرض «قالب‌ها و ورک‌فلوهای آمادهٔ …» استفاده می‌شود.</li>
                        <li><strong>noindex:</strong> صفحه هست ولی ایندکس نمی‌شود و در سایت‌مپ نمی‌آید.</li>
                    </ul>
                </div>
                <div className={parentStyles.guideCard}>
                    <h3>اشتباهات رایج</h3>
                    <ul>
                        <li>عوض‌کردن کلید تگِ استفاده‌شده — آدرس همهٔ قالب‌هایش عوض می‌شود.</li>
                        <li>دو تگ تقریباً هم‌معنی (دو صفحه برای یک جست‌وجو).</li>
                        <li>حذف تگی که زیرتگ دارد ممکن نیست؛ اول زیرتگ‌ها را جابه‌جا کنید.</li>
                    </ul>
                </div>
            </div>

            <div className={hrStyles.employeesGuideExample}>
                <h3>مثال عملی</h3>
                <p>
                    تگ «انسان و پرتره» (<code dir="ltr">human_portrait</code>) + زیرتگ «عکس پرسنلی» با والد همان →
                    قالب «عکس پرسنلی رسمی» که اولین تگش «عکس پرسنلی» است در
                    {' '}<code dir="ltr">/explore/human-portrait/headshot/&lt;slug&gt;</code> باز می‌شود و
                    {' '}<code dir="ltr">/explore/human-portrait</code> قالب‌های هر دو تگ را نشان می‌دهد.
                </p>
            </div>

            <div className={hrStyles.employeesGuideNote}>
                <strong>نکته:</strong> نام تگ در استودیو به زبان کاربر از فایل ترجمهٔ استودیو (namespace <code dir="ltr">templateTags</code>) خوانده
                می‌شود؛ «نام فارسی» این فرم برای HTML سئو و تگ‌هایی است که هنوز ترجمه ندارند.
            </div>
        </section>
    );
}
