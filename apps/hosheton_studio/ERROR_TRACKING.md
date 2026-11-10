# پایش خطا در وب اپ استودیو (hosheton_studio)

اتصال این اپ به پلتفرم پایش خطا (naslyar > پایش خطا) — مشابه Sentry، Self-hosted و سبک.

## چطور کار می‌کند؟

خطاهای مدیریت‌نشده مرورگر (`window.onerror`، `unhandledrejection`)، خطاهای رندر React و خطاهای ثبت‌شدهٔ دستی، به‌صورت خودکار با اطلاعات کاربر و breadcrumb درخواست‌های fetch به هاب پایش خطا (API استودیو) ارسال می‌شوند. چون هندلرها سراسری هستند، **همه صفحات شامل بوم پروژه (`projects/[projectId]`)، چت و ویرایشگر ویدیو پوشش داده می‌شوند** و خطای هر صفحه با tag صفحه (`screen`) در پنل قابل فیلتر است.

## فایل‌های پیاده‌سازی

| فایل | نقش |
| --- | --- |
| `app/etr-init.tsx` | راه‌انداز SDK + ضمیمه‌کردن اطلاعات کاربر از zustand (`authStore` + `useAppStore`) |
| `app/layout.tsx` | رجیستر `<EtrInit/>` در ریشه اپ |
| `app/error.tsx` | ثبت خطاهای رندر React با سطح `fatal` |
| `packages/utils/src/errorTracking.ts` | SDK مشترک (در مونوریپوی فرانت، مشترک بین همه اپ‌ها) — هندلرهای سراسری، breadcrumb خودکار fetch، صف و ارسال دسته‌ای، سقف ۲۰ رویداد در دقیقه، dedup تکراری‌ها |

## راه‌اندازی

```bash
# ۱) در پنل (naslyar > پایش خطا > پروژه‌ها) پروژه «وب استودیو» را بسازید و کلید عمومی را کپی کنید

# ۲) در .env.development و .env.production این اپ:
NEXT_PUBLIC_ETR_KEY=<کلید عمومی>
# NEXT_PUBLIC_ETR_URL=...   # اختیاری — پیش‌فرض همان NEXT_PUBLIC_API_URL است که خودش هاب است

# ۳) ری‌استارت dev server / بیلد جدید
```

بدون `NEXT_PUBLIC_ETR_KEY` پایش کاملاً خاموش است (هیچ درخواست شبکه‌ای ارسال نمی‌شود).

## استفاده دستی (اختیاری)

```ts
import { etr } from '@my-workspace/utils';
import { notifyError } from '@/app/lib/errors';

// در catch هایی که خطا را می‌بلعید و کاربر متوجه آن نمی‌شود:
try {
    await something();
} catch (err) {
    etr.capture(err, 'error', { orderId });   // کانتکست اختیاری
    notifyError(err);                          // فقط پیام هوشتون به کاربر — AGENTS.md «نمایش خطا»
}

// breadcrumb برای ردپای رخدادهای قبل از خطا:
etr.addBreadcrumb('ws', 'socket disconnected', { namespace: '/media-studio' });

// اطلاعات کاربر (EtrInit به‌صورت خودکار از store انجام می‌دهد):
etr.setUser({ id, email, username });
```

## تست اتصال

در Console مرورگر:

```js
Promise.reject(new Error('تست پایش خطا'));
```

رویداد باید تا چند ثانیه در پنل (naslyar > پایش خطا > مسائل) ظاهر شود.

## خطاهای تولید (worker سمت API)

خطای ارائه‌دهنده در اجرای گره/چت داخل worker صف گرفته می‌شود و به `errorHelper` نمی‌رسد؛ برای همین `StudioErrorReporterService` (`my-workspace-api/apps/hosheton_studio/src/(studio)/developer-tools`) برای هر گره ناموفق **یک رویداد** با تگ `service=studio-generation`، `provider`، `model`، `node_type` و کانتکست کامل (runId، chatId، HTTP status و بدنهٔ پاسخ ارائه‌دهنده، شناسهٔ لاگ developer-tools) ثبت می‌کند. «اجرای گم‌شده» (`STUDIO_CHAT_RUN_LOST`) هم ثبت می‌شود. برای خبردار شدن قبل از کاربر، در پنل یک قانون هشدار `new_issue` / `error_spike` روی پروژهٔ API بسازید.

## نکات

- کلید عمومی فقط هویت پروژه است؛ افشای آن خطرناک نیست ولی با دکمه «چرخش کلید» در پنل قابل ابطال است.
- سمت سرور فیلدهای حساس (password، token، cookie و...) به‌صورت خودکار ماسک می‌شوند؛ با این حال داده حساس را دستی ارسال نکنید.
- راهنمای کامل پنل: naslyar > پایش خطا > «راهنمای اتصال».
