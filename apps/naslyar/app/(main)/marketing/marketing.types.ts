/** نوع پلتفرم آنالیتیکس. فقط GA4 در نسخه اول فعال است؛ بقیه برای نسخه‌های بعدی رزرو شده‌اند. */
export type AnalyticsPlatformType = 'ga4' | 'search-console' | 'mixpanel' | 'hotjar';

/** یک اتصال آنالیتیکس ثبت‌شده برای پروژه فعلی. */
export interface AnalyticsConnection {
    _id: string;
    platform: AnalyticsPlatformType;
    /** نام نمایشی (مثلاً «وبسایت فارسی») */
    title: string;
    /** نام پراپرتی GA4 */
    propertyName: string;
    /** شناسه پراپرتی GA4 (properties/123456789) */
    propertyId: string;
    /** URL جاسازی داشبورد Looker Studio */
    embedUrl: string;
    /** توضیح/یادداشت اختیاری */
    notes: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

/** مقادیر فرم ساخت/ویرایش (بدون متادیتای سرور). */
export interface ConnectionFormValues {
    platform: AnalyticsPlatformType;
    title: string;
    propertyName: string;
    propertyId: string;
    embedUrl: string;
    notes: string;
    isActive: boolean;
}
