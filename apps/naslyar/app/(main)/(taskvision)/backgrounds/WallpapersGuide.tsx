'use client';

import React from 'react';
import parentStyles from '../../marketing/Marketing.module.scss';
import hrStyles from '../../management/hr/Hr.module.scss';

/** راهنمای همیشه‌نمایان فهرست والپیپرها (الگوی EmployeesGuide) */
export default function WallpapersGuide() {
    return (
        <section className={parentStyles.guideContainer}>
            <div className={parentStyles.guideHeader}>
                <div className={parentStyles.guideTitleGroup}>
                    <span className={parentStyles.guideIcon}>🖼️</span>
                    <h2 className={parentStyles.guideTitle}>آموزش والپیپرهای بورد</h2>
                </div>
                <span className={parentStyles.guideBadge}>راهنمای ادمین</span>
            </div>

            <p className={hrStyles.employeesGuideIntro}>
                اینجا <strong>تصویرهای آماده</strong> برای پس‌زمینه‌ی بورد TaskVision را مدیریت می‌کنید. هر دسته‌ی فعال با
                والپیپرهای فعالش در پنجره‌ی «پس‌زمینه بورد» برای همه‌ی کاربران دیده می‌شود. آن پنجره <strong>فقط</strong> همین
                دسته‌ها را نشان می‌دهد (به‌علاوه‌ی «تصویر دلخواه» که کاربر خودش آدرسش را می‌گذارد)؛ پس‌زمینه‌ی آماده‌ای در کد نیست.
            </p>

            <div className={parentStyles.guideGrid}>
                <div className={parentStyles.guideCard}>
                    <h3>ترتیب کار</h3>
                    <ol>
                        <li>«افزودن دسته» — مثلاً طبیعت، شهر، انتزاعی، متحرک.</li>
                        <li>دسته را از تب‌ها انتخاب کنید و «افزودن والپیپر» بزنید.</li>
                        <li>تصویر را آپلود کنید؛ نسخه‌ی تیره اختیاری است.</li>
                    </ol>
                </div>
                <div className={parentStyles.guideCard}>
                    <h3>فرمت و حجم</h3>
                    <ul>
                        <li>ثابت: <strong>webp</strong> (بهترین)، png، avif یا jpg.</li>
                        <li>متحرک: <strong>webp متحرک</strong> (سبک‌ترین)، gif یا apng.</li>
                        <li>ثابت زیر ۵۰۰KB، متحرک زیر ۲MB — بورد روی موبایل هم باز می‌شود.</li>
                    </ul>
                </div>
                <div className={parentStyles.guideCard}>
                    <h3>معنی وضعیت‌ها</h3>
                    <ul>
                        <li><strong>فعال:</strong> کاربران آن را در پنجره‌ی انتخاب می‌بینند.</li>
                        <li><strong>غیرفعال:</strong> پنهان است ولی پاک نشده؛ هر وقت خواستید فعالش کنید.</li>
                        <li>دسته‌ی بدون والپیپر فعال به کاربر نشان داده نمی‌شود.</li>
                    </ul>
                </div>
                <div className={parentStyles.guideCard}>
                    <h3>اشتباهات رایج</h3>
                    <ul>
                        <li>تصویر خیلی شلوغ/پرکنتراست — کارت‌ها روی آن خوانا نیستند.</li>
                        <li>gif سنگین چند مگابایتی — به‌جایش webp متحرک بسازید.</li>
                        <li>تصویر عمودی — بورد افقی است؛ نسبت ۱۶:۹ بگذارید.</li>
                    </ul>
                </div>
            </div>

            <div className={hrStyles.employeesGuideExample}>
                <h3>مثال عملی</h3>
                <p>
                    دسته‌ی «طبیعت» → والپیپر «کوهستان مه‌آلود» (webp، ۱۹۲۰×۱۰۸۰، نسخه‌ی تیره‌ی شب‌هنگام) → کاربر در بورد
                    «پس‌زمینه بورد» را باز می‌کند، در بخش «تصویر» زیر عنوان «طبیعت» آن را می‌بیند و با یک کلیک می‌گذارد.
                </p>
            </div>

            <div className={hrStyles.employeesGuideNote}>
                <strong>نکته:</strong> پس‌زمینه‌ی تصویری جزو ویژگی «پس‌زمینه‌های ویژه بورد» پلن‌هاست؛ کاربر پلن رایگان آن را
                با نشان «ویژه» می‌بیند. حذف یا غیرفعال کردن والپیپر، بوردهایی را که از قبل آن را گذاشته‌اند عوض نمی‌کند.
            </div>
        </section>
    );
}
