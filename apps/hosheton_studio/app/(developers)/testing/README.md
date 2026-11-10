# QA Testing — پیاده‌سازی

این پوشه فقط سند طراحی (`guide.md`) است. سیستم QA Testing داخل خود استودیو پیاده شده:

| بخش | مسیر |
| --- | --- |
| کنسول QA (سایدبار → QA Testing — فقط super-admin) | `app/components/qa-testing/` — نصب‌شده در `(developers)/layout.tsx` |
| API (Release/TestCase/TestRun/Artifact + اندپوینت‌های panel و runner) | `my-workspace-api/libs/core/src/qa-testing/` — ثبت‌شده در `apps/hosheton_studio` (کالکشن‌های `qa_*` روی APP_DB) |
| رانر Playwright | `my-workspace-nextjs/apps/qa-runner/` — پک سناریوی `hosheton-studio` |

## استفاده سریع

1. رانر را روشن کنید: `cd apps/qa-runner && yarn qa:watch`
2. در استودیو با اکانت سوپرادمین: سایدبار → **QA Testing**
3. تب «راهنما» آموزش کامل است؛ تب «تست‌ها» کاتالوگ تست‌ها را نشان می‌دهد — تکی یا همه را اجرا کنید
4. تب «اجراها» پیشرفت زنده، لاگ و اسکرین‌شات‌ها؛ تب «باگ‌ها» خطاها با مدرک

جزئیات کامل: `my-workspace-nextjs/apps/qa-runner/README.md`
