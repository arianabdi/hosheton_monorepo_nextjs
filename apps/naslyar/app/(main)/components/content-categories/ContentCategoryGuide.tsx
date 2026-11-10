'use client';

import React from 'react';
import Link from 'next/link';
import parentStyles from '@/app/(main)/marketing/Marketing.module.scss';
import hrStyles from '@/app/(main)/management/hr/Hr.module.scss';
import type { ContentCategorySectionConfig } from './content-categories';

/** آموزش همیشه‌نمایان بالای فهرست دسته‌های سئو — متن با تنظیمات بخش (بلاگ/مستندات/قالب) عوض می‌شود */
export default function ContentCategoryGuide({ config }: { config: ContentCategorySectionConfig }) {
    const example = config.hierarchical
        ? `${config.urlPrefix}/image-generation/portrait`
        : `${config.urlPrefix}/getting-started`;
    return (
        <section className={parentStyles.guideContainer}>
            <div className={parentStyles.guideHeader}>
                <div className={parentStyles.guideTitleGroup}>
                    <span className={parentStyles.guideIcon}>🗂️</span>
                    <h2 className={parentStyles.guideTitle}>آموزش {config.title}</h2>
                </div>
                <span className={parentStyles.guideBadge}>راهنمای ادمین</span>
            </div>

            <p className={hrStyles.employeesGuideIntro}>
                هر دسته روی سایت اپ انتخاب‌شده یک <strong>صفحهٔ فرود مستقل</strong> با عنوان، توضیح و متن معرفی خودش
                می‌شود و آدرسش از <strong>slug</strong> ساخته می‌شود
                {config.hierarchical ? <> (زیردسته‌ها زیر مسیر والد: <code dir="ltr">{example}</code>)</> : <> (<code dir="ltr">{example}</code>)</>}.
                این صفحه برچسب داخلی یا فیلتر پنل <strong>نیست</strong>؛ هر تغییر مستقیماً روی سئوی سایت اثر دارد.
            </p>

            <div className={parentStyles.guideGrid}>
                <div className={parentStyles.guideCard}>
                    <h3>ترتیب کار</h3>
                    <ol>
                        <li>{config.hierarchical ? 'دسته‌های اصلی را بسازید، بعد زیردسته‌ها را با «افزودن زیردسته».' : 'موضوع‌ها را بسازید.'}</li>
                        <li>برای هر دسته عنوان و توضیح متای یکتا و متن معرفی کوتاه بنویسید.</li>
                        <li>محتوا را در فرم خودش به دسته وصل کنید.</li>
                        <li>
                            گروه سایت‌مپ را در <Link href="/marketing/sitemap/groups">سایت‌مپ › گروه‌ها</Link> فعال/بررسی کنید
                            {config.sitemapGroup ? <> (<code dir="ltr">{config.sitemapGroup}</code>)</> : null}.
                        </li>
                    </ol>
                </div>
                <div className={parentStyles.guideCard}>
                    <h3>قواعد slug</h3>
                    <ul>
                        <li>فقط حروف کوچک انگلیسی، عدد و خط تیره؛ در همین بخش یکتا.</li>
                        <li>بعد از انتشار عوضش نکنید — آدرس همهٔ محتوای زیرش هم عوض می‌شود.</li>
                        <li>کوتاه و توصیفی: <code dir="ltr">video-ads</code> نه <code dir="ltr">cat-12</code>.</li>
                    </ul>
                </div>
                <div className={parentStyles.guideCard}>
                    <h3>معنی ستون سئو</h3>
                    <ul>
                        <li><strong>کامل:</strong> توضیح متا دارد.</li>
                        <li><strong>بدون توضیح متا:</strong> گوگل خودش متن صفحه را برمی‌دارد — بهتر است پر شود.</li>
                        <li><strong>noindex:</strong> صفحه هست ولی ایندکس نمی‌شود و در سایت‌مپ نمی‌آید.</li>
                    </ul>
                </div>
                <div className={parentStyles.guideCard}>
                    <h3>اشتباهات رایج</h3>
                    <ul>
                        <li>دسته‌های تقریباً هم‌معنی (رقابت دو صفحه سر یک کلمه).</li>
                        <li>دستهٔ خالی و ایندکس‌شده — تا محتوا ندارد noindex بماند.</li>
                        <li>حذف دسته‌ای که زیردسته دارد ممکن نیست؛ اول زیردسته‌ها را جابه‌جا کنید.</li>
                    </ul>
                </div>
            </div>

            <div className={hrStyles.employeesGuideExample}>
                <h3>مثال عملی</h3>
                <p>
                    {config.section === 'docs'
                        ? 'موضوع «شروع کار» (getting-started) → صفحهٔ «ساخت اولین پروژه» در /docs/getting-started/first-project منتشر می‌شود و /docs/getting-started فهرست همهٔ آموزش‌های این موضوع است.'
                        : 'دستهٔ «هوش مصنوعی» (ai) + زیردستهٔ «مدل‌های زبانی» (llm) → مقالهٔ «مقایسهٔ GPT و Claude» در /blog/ai/llm/<slug-مقاله> منتشر می‌شود و صفحهٔ /blog/ai مقاله‌های هر دو را دارد.'}
                </p>
            </div>

            <div className={hrStyles.employeesGuideNote}>
                <strong>نکته:</strong> این دسته‌ها مخصوص اپی هستند که بالای پنل انتخاب شده؛ هر اپ درخت خودش را دارد.
            </div>
        </section>
    );
}
