'use client';

import React from 'react';
import parentStyles from '../../marketing/Marketing.module.scss';

type Variant = 'tickets' | 'categories' | 'chat';

/**
 * راهنمای فارسی مرکز پشتیبانی — هم‌سبک راهنمای بخش کارمندان (EmployeesGuide)
 * تا همه‌ی ماژول‌های پنل، آموزش یکدستی داشته باشند.
 */
export default function SupportGuide({ variant = 'tickets' }: { variant?: Variant }) {
    if (variant === 'chat') {
        return (
            <section className={parentStyles.guideContainer}>
                <div className={parentStyles.guideHeader}>
                    <div className={parentStyles.guideTitleGroup}>
                        <span className={parentStyles.guideIcon}>💬</span>
                        <h2 className={parentStyles.guideTitle}>آموزش اتاق چت پشتیبانی</h2>
                    </div>
                    <span className={parentStyles.guideBadge}>راهنمای ادمین</span>
                </div>

                <div className={parentStyles.guideGrid}>
                    <div className={parentStyles.guideCard}>
                        <h3>چت لحظه‌ای (وب‌سوکت)</h3>
                        <ul>
                            <li>اتصال تا زمانی که نشان «متصل» بالای چت روشن است، زنده است.</li>
                            <li>پیام شما بلافاصله برای کاربر نمایش داده می‌شود — بدون رفرش.</li>
                            <li>پیام‌های جدید کاربر هم بدون تأخیر همین‌جا می‌آید.</li>
                        </ul>
                    </div>

                    <div className={parentStyles.guideCard}>
                        <h3>پیوست عکس و فایل</h3>
                        <ul>
                            <li>دکمه گیره کاغذ (📎) در نوار ارسال، انتخاب عکس/فایل.</li>
                            <li>حداکثر ۱۰ فایل برای هر پیام.</li>
                            <li>فایل‌ها دکمه دانلود مستقل دارند؛ عکس‌ها پیش‌نمایش می‌گیرند.</li>
                        </ul>
                    </div>

                    <div className={parentStyles.guideCard}>
                        <h3>مدیریت تیکت از همین صفحه</h3>
                        <ul>
                            <li>منوی ⋯ بالای چت: ویرایش وضعیت، اولویت و دسته‌بندی.</li>
                            <li>با بستن تیکت، نوار ارسال فقط‌خواندنی می‌شود.</li>
                            <li>Enter پیام را می‌فرستد؛ Shift+Enter سطر جدید.</li>
                        </ul>
                    </div>

                    <div className={parentStyles.guideCard}>
                        <h3>نکته‌ها</h3>
                        <ul>
                            <li>اگر اتصال قطع شد، صفحه را دوباره باز کنید؛ پیام‌ها از سرور بازسازی می‌شوند.</li>
                            <li>پاسخ پشتیبان، وضعیت تیکت را خودکار به «در حال بررسی» می‌برد.</li>
                        </ul>
                    </div>
                </div>
            </section>
        );
    }

    if (variant === 'categories') {
        return (
            <section className={parentStyles.guideContainer}>
                <div className={parentStyles.guideHeader}>
                    <div className={parentStyles.guideTitleGroup}>
                        <span className={parentStyles.guideIcon}>🗂️</span>
                        <h2 className={parentStyles.guideTitle}>آموزش دسته‌بندی تیکت‌ها</h2>
                    </div>
                    <span className={parentStyles.guideBadge}>راهنمای ادمین</span>
                </div>

                <p className={parentStyles.guideIntro ?? undefined} style={{ lineHeight: 1.9, margin: '0 0 1.25rem' }}>
                    در این بخش <strong>دسته‌بندی‌های تیکت</strong> را تعریف می‌کنید — مثل «تسویه حساب»، «مسائل فنی» یا
                    «پیشنهاد و انتقاد». دسته‌بندی‌ها در فیلترهای لیست تیکت‌ها نمایش داده می‌شوند تا رسیدگی به موضوعات
                    هم‌نوع سریع‌تر شود.
                </p>

                <div className={parentStyles.guideGrid}>
                    <div className={parentStyles.guideCard}>
                        <h3>چطور دسته تعریف کنم؟</h3>
                        <ol>
                            <li>روی «دسته‌بندی جدید» بالای همین صفحه بزنید تا صفحه‌ی ثبت باز شود.</li>
                            <li>عنوان کوتاه و مشخص (مثلاً «تسویه حساب») بدهید.</li>
                            <li>یک رنگ متمایز انتخاب کنید تا در جدول تیکت‌ها قابل تشخیص باشد.</li>
                        </ol>
                    </div>

                    <div className={parentStyles.guideCard}>
                        <h3>دسته‌بندی کجا ظاهر می‌شود؟</h3>
                        <ul>
                            <li>ستون «دسته‌بندی» جدول تیکت‌ها.</li>
                            <li>فیلترهای پیشرفته لیست تیکت‌ها.</li>
                            <li>فرم ویرایش هر تیکت از منوی عملیات (⋯).</li>
                        </ul>
                    </div>

                    <div className={parentStyles.guideCard}>
                        <h3>حذف دسته‌بندی</h3>
                        <ul>
                            <li>حذف دسته، تیکت‌ها را پاک نمی‌کند؛ فقط آن‌ها «بدون دسته» می‌شوند.</li>
                            <li>برای اصلاح عنوان یا رنگ، از «ویرایش» استفاده کنید تا ارتباط تیکت‌ها حفظ بماند.</li>
                        </ul>
                    </div>

                    <div className={parentStyles.guideCard}>
                        <h3>دسته‌های پیشنهادی شروع</h3>
                        <ul>
                            <li>تسویه حساب — موضوعات مالی و پرداخت.</li>
                            <li>مسائل فنی — خطا و اشکال پلتفرم.</li>
                            <li>پیشنهاد و انتقاد — بازخورد کاربران.</li>
                        </ul>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className={parentStyles.guideContainer}>
            <div className={parentStyles.guideHeader}>
                <div className={parentStyles.guideTitleGroup}>
                    <span className={parentStyles.guideIcon}>🎫</span>
                    <h2 className={parentStyles.guideTitle}>آموزش مدیریت تیکت‌های پشتیبانی</h2>
                </div>
                <span className={parentStyles.guideBadge}>راهنمای ادمین</span>
            </div>

            <p style={{ lineHeight: 1.9, margin: '0 0 1.25rem' }}>
                این بخش <strong>مرکز کنترل تیکت‌های کاربران</strong> است. هر تیکت یک گفتگوی زنده بین کاربر و
                پشتیبان‌هاست؛ پاسخ‌ها از طریق <strong>اتاق چت (وب‌سوکت)</strong> بلافاصله برای کاربر نمایش داده می‌شود.
            </p>

            <div className={parentStyles.guideGrid}>
                <div className={parentStyles.guideCard}>
                    <h3>فیلترهای پیشرفته</h3>
                    <ul>
                        <li>دکمه «فیلترها» بالای جدول، پنجره‌ی فیلترها را باز می‌کند.</li>
                        <li>جستجوی عنوان، وضعیت، اولویت، دسته‌بندی و بازه تاریخ.</li>
                        <li>فیلترهای اعمال‌شده به‌صورت نشان (chip) بالای جدول دیده می‌شوند و قابل حذف‌اند.</li>
                    </ul>
                </div>

                <div className={parentStyles.guideCard}>
                    <h3>منوی عملیات هر تیکت (⋯)</h3>
                    <ul>
                        <li><strong>ورود به اتاق چت:</strong> پاسخ زنده به کاربر.</li>
                        <li><strong>ویرایش تیکت:</strong> تغییر وضعیت، اولویت و دسته‌بندی.</li>
                        <li><strong>بستن سریع:</strong> مختومه‌کردن تیکت‌های حل‌شده.</li>
                    </ul>
                </div>

                <div className={parentStyles.guideCard}>
                    <h3>معنی وضعیت‌ها</h3>
                    <ul>
                        <li><strong>باز:</strong> منتظر پاسخ پشتیبان.</li>
                        <li><strong>در حال بررسی:</strong> پشتیبان پاسخ داده، منتظر کاربر.</li>
                        <li><strong>حل شده / بسته:</strong> پایان ماجرا — چت فقط‌خواندنی می‌شود.</li>
                    </ul>
                </div>

                <div className={parentStyles.guideCard}>
                    <h3>چت لحظه‌ای و پیوست‌ها</h3>
                    <ul>
                        <li>پیام‌ها با وب‌سوکت بلافاصله ارسال و دریافت می‌شوند — بدون رفرش صفحه.</li>
                        <li>در اتاق چت می‌توانید <strong>عکس و فایل</strong> پیوست کنید.</li>
                        <li>فایل‌های پیوست دکمه <strong>دانلود</strong> مستقل دارند.</li>
                    </ul>
                </div>
            </div>
        </section>
    );
}
