'use client';

import React from 'react';
import Link from 'next/link';
import parentStyles from '../marketing/Marketing.module.scss';

/** بخش آموزش صفحه احراز هویت — با همان ساختار راهنمای بخش کارمندان */
export default function VerificationGuide() {
    return (
        <section className={parentStyles.guideContainer}>
            <div className={parentStyles.guideHeader}>
                <div className={parentStyles.guideTitleGroup}>
                    <span className={parentStyles.guideIcon}>🛡️</span>
                    <h2 className={parentStyles.guideTitle}>آموزش احراز هویت کاربران</h2>
                </div>
                <span className={parentStyles.guideBadge}>راهنمای ادمین</span>
            </div>

            <p style={{ fontSize: '0.85rem', lineHeight: 1.9, margin: '0 0 1rem' }}>
                در این بخش <strong>سابقه احراز هویت کاربران</strong> را می‌بینید. کاربر در سایت، از تنظیمات پروفایل
                شماره موبایل و کد ملی خود را وارد می‌کند و سامانه <strong>شاهکار</strong> (از طریق پلتفرم فعال مثل
                زحل یا نوین) مالکیت خط را بررسی می‌کند. نتیجه هر استعلام اینجا ثبت می‌شود.
            </p>

            <div className={parentStyles.guideGrid}>
                <div className={parentStyles.guideCard}>
                    <h3>جریان احراز از سمت کاربر</h3>
                    <ol>
                        <li>کاربر در سایت به <strong>تنظیمات ← احراز هویت</strong> می‌رود.</li>
                        <li>نام، موبایل و کد ملی ۱۰ رقمی را وارد می‌کند (اعتبارسنجی چک‌سام کد ملی قبل از ارسال انجام می‌شود).</li>
                        <li>در صورت تطبیق، فیلدهای <strong>identity_verified</strong> روی حساب کاربر فعال می‌شود.</li>
                    </ol>
                </div>

                <div className={parentStyles.guideCard}>
                    <h3>پلتفرم فعال و تنظیمات</h3>
                    <ul>
                        <li>از <Link href="/verification/settings">تنظیمات پلتفرم</Link> فقط <strong>یک پلتفرم</strong> در لحظه فعال است.</li>
                        <li>برای هر پلتفرم، توکن/کلید دسترسی را وارد کنید و حالت آزمایشی (سندباکس) را خاموش کنید.</li>
                        <li>با دکمه «اجرای تست» می‌توانید هر پلتفرم را بدون ثبت در سابقه، آزمایش کنید.</li>
                    </ul>
                </div>

                <div className={parentStyles.guideCard}>
                    <h3>تفسیر ستون‌های لیست</h3>
                    <ul>
                        <li><strong>نتیجه استعلام:</strong> پاسخ خود پلتفرم (تطبیق موبایل با کد ملی).</li>
                        <li><strong>حساب کاربر:</strong> وضعیت فعلی احراز کاربر — با لغو احراز از صفحه جزئیات، جدا می‌شود.</li>
                        <li>برچسب <strong>آزمایشی</strong> یعنی آن رکورد در حالت سندباکس ثبت شده، نه استعلام واقعی.</li>
                    </ul>
                </div>

                <div className={parentStyles.guideCard}>
                    <h3>نکات مهم</h3>
                    <ul>
                        <li>سامانه شاهکار فقط <strong>تطبیق موبایل و کد ملی</strong> را بررسی می‌کند؛ نام ثبت‌شده صرفاً برای نمایش است.</li>
                        <li>پلتفرم‌ها (زحل/نوین) فقط به IP اعلام‌شده در پنل خودشان پاسخ می‌دهند؛ IP سرور API را در پنل پلتفرم ثبت کنید.</li>
                        <li>پاسخ خام هر استعلام در صفحه جزئیات نگهداری می‌شود تا خطاها قابل ردیابی باشند.</li>
                    </ul>
                </div>
            </div>

            <div style={{
                background: 'color-mix(in srgb, var(--brand-color) 6%, transparent)',
                border: '1px solid color-mix(in srgb, var(--brand-color) 25%, transparent)',
                borderRadius: 10,
                padding: '0.9rem 1.1rem',
                fontSize: '0.82rem',
                lineHeight: 1.9,
                marginTop: '1rem',
            }}>
                <strong>مثال عملی:</strong> کاربر «آرین عبدی» با موبایل ۰۹۰۳۹۶۷۶۱۳۶ و کد ملی ۰۰۱۶۳۴۴۹۸۷ در فرم
                احراز ثبت می‌کند ← پلتفرم فعال (زحل/نوین) تطبیق را از شاهکار می‌گیرد ← اگر matched باشد، وضعیت
                کاربر «احراز شده» و رکورد این لیست با برچسب سبز ثبت می‌شود.
            </div>
        </section>
    );
}
