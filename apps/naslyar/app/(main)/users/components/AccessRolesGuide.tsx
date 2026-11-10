'use client';

import React from 'react';
import Link from 'next/link';
import styles from '../access-roles.module.scss';

export default function AccessRolesGuide() {
    return (
        <section className={styles.accessRolesGuide}>
            <h2>نقش‌ها و دسترسی‌های پویا</h2>
            <p>
                در این بخش می‌توانید نقش‌های سفارشی بسازید و برای هر نقش، بخش‌های مجاز پنل naslyar را انتخاب کنید.
                کاربران از صفحه{' '}
                <Link href="/users" style={{ color: 'var(--brand-color)', fontWeight: 600 }}>
                    همه کاربران
                </Link>
                {' '}به یک نقش متصل می‌شوند. برای افزودن بخش‌های جدید پروژه، کافی است در منو `permissionKey` تعریف
                کنید و دکمه «همگام‌سازی با منو» را بزنید.
            </p>
        </section>
    );
}
