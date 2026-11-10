'use client';

import React from 'react';
import Link from 'next/link';
import parentStyles from '@/app/(main)/marketing/Marketing.module.scss';
import hrStyles from '@/app/(main)/management/hr/Hr.module.scss';

/** آموزش همیشه‌نمایان فهرست کاربران نمایشی */
export default function PersonasGuide() {
    return (
        <section className={parentStyles.guideContainer}>
            <div className={parentStyles.guideHeader}>
                <div className={parentStyles.guideTitleGroup}>
                    <span className={parentStyles.guideIcon}>🎭</span>
                    <h2 className={parentStyles.guideTitle}>آموزش کاربران نمایشی</h2>
                </div>
                <span className={parentStyles.guideBadge}>راهنمای ادمین</span>
            </div>

            <p className={hrStyles.employeesGuideIntro}>
                کاربر نمایشی یک حساب عادی در استودیوست (پروفایل، عکس، بیو) که فقط ادمین‌ها می‌دانند ساختگی است.
                قالب‌های تیم به نام این افراد منتشر می‌شود تا اکسپلور زنده و متنوع به نظر برسد. این حساب‌ها
                <strong> رمز و موبایل ندارند</strong> و کسی نمی‌تواند با آن‌ها وارد شود؛ کاربران عادی هیچ نشانه‌ای از
                «نمایشی بودن» نمی‌بینند.
            </p>

            <div className={parentStyles.guideGrid}>
                <div className={parentStyles.guideCard}>
                    <h3>ترتیب کار</h3>
                    <ol>
                        <li>با «ساخت پرسوناهای پیش‌فرض» ۱۰ کاربر ایرانی (زن و مرد) بسازید یا خودتان یکی اضافه کنید.</li>
                        <li>برای هر کدام عکس پروفایل و بیو بگذارید تا پروفایلش واقعی به نظر برسد.</li>
                        <li>«حوزهٔ کاری» هر نفر را از تگ‌ها انتخاب کنید (مثلاً جواهرات).</li>
                        <li>هنگام ساخت یا ویرایش قالب، اول تگ‌ها را بزنید؛ «منتشرکننده» فقط هم‌حوزه‌ها (همان تگ، والد یا زیرشاخه‌اش) را نشان می‌دهد. بدون تگ، همه می‌آیند.</li>
                    </ol>
                </div>
                <div className={parentStyles.guideCard}>
                    <h3>کجا انتخاب می‌شود؟</h3>
                    <ul>
                        <li>همین پنل: <Link href="/projects/templates/review/new">افزودن قالب</Link> و ویرایش قالب.</li>
                        <li>استودیو (فقط برای ادمین‌ها): پنل «قالب» کنار چت و صفحهٔ ساخت/ویرایش قالب.</li>
                    </ul>
                </div>
                <div className={parentStyles.guideCard}>
                    <h3>پیام‌ها</h3>
                    <ul>
                        <li>هر پیامی که کسی به این افراد بدهد در صفحهٔ «پیام‌ها»ی استودیو برای همهٔ ادمین‌ها می‌آید.</li>
                        <li>برچسب «به …» در فهرست گفتگوها نشان می‌دهد پیام به کدام پرسوناست.</li>
                        <li>جواب شما از طرف همان پرسونا ارسال می‌شود؛ نام ادمین پاسخ‌دهنده فقط برای ادمین‌ها دیده می‌شود.</li>
                    </ul>
                </div>
                <div className={parentStyles.guideCard}>
                    <h3>معنی وضعیت‌ها</h3>
                    <ul>
                        <li><strong>فعال:</strong> در انتخابگر «منتشرکننده» می‌آید.</li>
                        <li><strong>غیرفعال:</strong> دیگر انتخاب نمی‌شود، ولی قالب‌ها و پروفایل و گفتگوهای قبلی‌اش سر جایشان می‌مانند.</li>
                    </ul>
                </div>
            </div>

            <div className={hrStyles.employeesGuideExample}>
                <h3>مثال عملی</h3>
                <p>
                    قالب «پرترهٔ نور طبیعی» را با منتشرکنندهٔ «سارا محمدی» منتشر می‌کنید؛ در اکسپلور زیر نام سارا می‌آید و
                    در پروفایلش دیده می‌شود. کاربری روی «پیام به سازنده» می‌زند و می‌پرسد «با چه مدلی ساختی؟» — همهٔ ادمین‌ها
                    پیام را با برچسب «به سارا محمدی» می‌بینند و هر کدام جواب بدهد، کاربر جواب را از سارا می‌گیرد.
                </p>
            </div>

            <div className={hrStyles.employeesGuideNote}>
                <strong>نکته:</strong> فروش قالب‌های پرسونا به کیف پول فروش همان پرسونا می‌رود. نام کاربری و عکس را واقعی و
                یکتا انتخاب کنید و برای چند پرسونا از یک عکس استفاده نکنید.
            </div>
        </section>
    );
}
