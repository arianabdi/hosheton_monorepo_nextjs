'use client';

import React from 'react';
import Link from 'next/link';
import parentStyles from '../../../../marketing/Marketing.module.scss';
import hrStyles from '../../../../management/hr/Hr.module.scss';

export default function AiUsageGuide() {
    return (
        <section className={parentStyles.guideContainer}>
            <div className={parentStyles.guideHeader}>
                <div className={parentStyles.guideTitleGroup}>
                    <span className={parentStyles.guideIcon}>📊</span>
                    <h2 className={parentStyles.guideTitle}>آموزش گزارش‌های هوش مصنوعی</h2>
                </div>
                <span className={parentStyles.guideBadge}>راهنمای ادمین</span>
            </div>

            <p className={hrStyles.employeesGuideIntro}>
                این صفحه برای <strong>هر پردازش پولی</strong> سه عدد را کنار هم نشان می‌دهد: مبلغی که
                <strong> به کاربر نشان دادیم</strong>، مبلغی که <strong>از کاربر کم شد</strong>، و مبلغی که
                <strong> ارائه‌دهنده (Atlas Cloud، fal و …) واقعاً از ما کم کرد</strong>. از تفاوت این‌ها سود یا زیان
                هر پردازش و دقت فرمول قیمت هر مدل معلوم می‌شود. این صفحه قیمت‌ها را تغییر نمی‌دهد؛ برای اصلاح قیمت به
                <Link href="/models/pricing"> قیمت‌گذاری مدل‌ها</Link> بروید.
            </p>

            <div className={parentStyles.guideGrid}>
                <div className={parentStyles.guideCard}>
                    <h3>معنی ستون‌ها</h3>
                    <ul>
                        <li><strong>نمایش‌داده:</strong> مبلغ کنار دکمه ارسال چت و پنجره تأیید.</li>
                        <li><strong>کسر از کاربر:</strong> مبلغ برداشت‌شده از کیف پول یا بودجه پروژه. برای چت باید دقیقاً برابر «نمایش‌داده» باشد.</li>
                        <li><strong>هزینه واقعی:</strong> مبلغی که ارائه‌دهنده برای همان پردازش گزارش کرده است.</li>
                        <li><strong>سود ٪:</strong> (کسر از کاربر − هزینه واقعی) ÷ هزینه واقعی.</li>
                    </ul>
                </div>

                <div className={parentStyles.guideCard}>
                    <h3>وضعیت هزینه واقعی</h3>
                    <ul>
                        <li><strong>دریافت شد:</strong> مبلغ از پاسخ ارائه‌دهنده یا API آن خوانده شد.</li>
                        <li><strong>در انتظار:</strong> هنوز استعلام نشده؛ هر ۵ دقیقه خودکار بررسی می‌شود.</li>
                        <li><strong>نامشخص:</strong> ارائه‌دهنده مبلغ را گزارش نکرد. علت در همان ردیف نوشته شده است.</li>
                    </ul>
                </div>

                <div className={parentStyles.guideCard}>
                    <h3>ترتیب بررسی</h3>
                    <ol>
                        <li>کارت «اختلاف نمایش و کسر» باید صفر باشد. اگر نبود، نتیجه را روی «اختلاف نمایش و کسر» بگذارید.</li>
                        <li>مبنا را روی <strong>بدون مارکاپ</strong> بگذارید: مارکاپ (اختصاصی مدل یا عمومی) کنار می‌رود و «خطای فرمول» هر مدل دیده می‌شود.</li>
                        <li>در جدول مدل‌ها روی «خطای فرمول ٪» مرتب کنید؛ بالاترین خطا یعنی خراب‌ترین فرمول.</li>
                        <li>فرمول همان مدل را در صفحه مدل اصلاح کنید.</li>
                    </ol>
                </div>

                <div className={parentStyles.guideCard}>
                    <h3>فیلتر و مرتب‌سازی</h3>
                    <ul>
                        <li><strong>مدل / کاربر:</strong> چند حرف از نام مدل یا نام و ایمیل کاربر بنویسید و از نتایج انتخاب کنید.</li>
                        <li><strong>نتیجه:</strong> فقط پردازش‌های زیان‌ده، سودده یا دارای اختلاف نمایش و کسر.</li>
                        <li>در تب «پردازش‌ها» روی سرستون‌ها بزنید تا بیشترین/کمترین هزینه، سود یا اختلاف بالا بیاید.</li>
                        <li>فیلترها در آدرس صفحه ذخیره می‌شوند؛ لینک را برای همکار بفرستید تا همان گزارش را ببیند.</li>
                    </ul>
                </div>

                <div className={parentStyles.guideCard}>
                    <h3>استعلام یک پردازش</h3>
                    <ul>
                        <li>در تب «پردازش‌ها» شماره پردازش (runId) یا شناسه درخواست ارائه‌دهنده را جستجو کنید.</li>
                        <li>دکمه «استعلام دوباره» مبلغ واقعی را از API ارائه‌دهنده می‌گیرد و ذخیره می‌کند.</li>
                    </ul>
                </div>
            </div>

            <div className={hrStyles.employeesGuideExample}>
                <h3>مثال عملی</h3>
                <p>
                    کاربر در چت تصویر با GPT Image 2.5 مبلغ $0.0143 را دید و تأیید کرد → دقیقاً $0.0143 از کیف پولش کم
                    شد → Atlas Cloud برای همان پردازش $0.0144392 گزارش کرد → سود این پردازش منفی (حدود −۱٪) است و مدل
                    در نمودار قرمز می‌شود؛ یعنی فرمول قیمت این مدل باید اصلاح شود.
                </p>
            </div>

            <div className={hrStyles.employeesGuideNote}>
                <strong>نکته:</strong> fal مبلغ هر درخواست را مستقیم برنمی‌گرداند؛ هزینه آن از «واحدهای قابل‌محاسبه»
                × «قیمت واحد» همان endpoint محاسبه می‌شود. اگر fal واحد را گزارش نکند، ردیف «نامشخص» می‌ماند.
                ردیف‌ها از زمان فعال شدن این گزارش ثبت می‌شوند و پردازش‌های قبلی را شامل نمی‌شوند.
            </div>
        </section>
    );
}
