'use client';

import React from 'react';
import Link from 'next/link';
import roleStyles from '../access-roles.module.scss';

export default function UsersGuide() {
    return (
        <section className={roleStyles.formGuideCard}>
            <h2>راهنمای ویرایش حساب کاربری</h2>
            <p>
                این صفحه برای مدیریت اطلاعات ورود و سطح دسترسی کاربران پلتفرم است. برای تعریف پروفایل سازمانی
                (واحد، سمت، گردش کار اسناد) به{' '}
                <Link href="/management/hr" style={{ color: 'var(--brand-color)', fontWeight: 600 }}>
                    منابع انسانی
                </Link>
                {' '}مراجعه کنید. نقش دسترسی تعیین می‌کند کاربر پس از ورود کدام بخش‌های naslyar را ببیند.
            </p>
        </section>
    );
}
