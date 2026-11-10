'use client';

import AdsVideoWorkspace from './AdsVideoWorkspace';

/**
 * استودیو تولید ویدیوهای تبلیغاتی (ads-video) — دسترسی فقط برای ادمین‌ها.
 * ساخت موشن‌گرافیک‌های HTML با چت هوش مصنوعی، ورژن‌بندی کات‌ها، قالب‌کات،
 * صداگذاری و خروجی ffmpeg. کنترل دسترسی در API هم با @Roles(admin) اعمال می‌شود.
 */
export default function AdsVideoPage() {
    return <AdsVideoWorkspace />;
}
