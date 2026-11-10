# سیستم کد معرف (Referral) — یادداشت پیاده‌سازی

مشخصات کامل کسب‌وکار در `referral-implementation.md` است؛ این سند وضعیت فعلی کد را خلاصه می‌کند.

## ۱. API — ماژول عمومی core

`my-workspace-api/libs/core/src/referral/` — کمپین ← قانون (SIGNUP / FIRST_PAYMENT / PAYMENT) ← رویداد ← پاداش.
hosheton_studio فقط واریزکننده پاداش را می‌دهد: `src/(studio)/marketplace/services/referral-sales-wallet-payer.service.ts`
(کیف پول فروش تومانی، نوع تراکنش `referral_bonus`) و بعد از هر خرید قالب `processPaymentEvent` را صدا می‌زند.

### Endpoints کاربر — `api/marketing/referral`

```text
GET  /me          کد، لینک، آمار (فقط پاداش‌های معتبر)، پیشرفت پله، سری ماهانه ۱۲ ماه (monthly)
GET  /me/history  دعوت‌ها — نام دعوت‌شده یا موبایل ماسک‌شده (بدون ایمیل/موبایل کامل)
GET  /me/rewards  پاداش‌ها
POST /attribute   { code } — اتصال بعد از ثبت‌نام
```

### Endpoints ادمین — `api/marketing/referral/admin`

```text
GET    overview | audit-logs (با نام ادمین)
GET    campaigns | campaigns/:id        POST campaigns | campaigns/:id/status     PATCH campaigns/:id
POST   campaigns/:id/rules              PATCH rules/:id | DELETE rules/:id
GET    referrals | rewards              ?status= &campaignId= &page= &limit= → { items, total, page, limit }
                                        (با نام/موبایل کاربران و نام کمپین)
POST   rewards/:id/review               { action: approve | reject | pay | cancel, reason }
```

### قواعد رفتاری

- «تأیید» قبل از پایان دوره بررسی کمپین (`availableAt`) رد می‌شود.
- پرداخت اتمیک است (`APPROVED → PAID`)؛ شکست واریز وضعیت را برمی‌گرداند.
- Idempotency: unique (referral, rule, event)؛ هر کاربر فقط یک دعوت‌کننده (unique `referredUserId` + فیلد `invite`).
- «فقط کاربر جدید»: حساب ساخته‌شده در `REFERRAL_NEW_CUSTOMER_WINDOW_HOURS` ساعت اخیر (پیش‌فرض ۴۸).

## ۲. فرانت hosheton_studio

| بخش | فایل |
|---|---|
| کپچر `?ref=` (localStorage + session + کوکی) و ساخت لینک روی همین محیط | `app/lib/referral/capture.ts`، `proxy.ts` |
| حفظ `?ref=` در ریدایرکت «/» → «/explore» | `app/page.tsx` |
| یادآوری کد در صفحات ورود | `app/(auth)/components/ReferralInviteNotice.tsx` (در AuthFrame) |
| اتصال: کاربر جدید در «تکمیل پروفایل» (فیلد قابل ویرایش، نتیجه با toast)؛ بقیه خودکار در `ReferralAttributor` (روی complete-profile کاری نمی‌کند) | `app/(auth)/complete-profile/page.tsx`، `app/components/ReferralAttributor.tsx`، `app/lib/referral/attribute.ts` |
| داده مشترک `/me` (یک درخواست برای کارت hero، تب فروش و تب دعوت) | `app/(marketplace)/lib/useMyReferral.ts` |
| کارت دعوت hero صاحب پروفایل | `app/(marketplace)/lib/ReferralCardNew/` |
| تب دعوت / سری ماهانه در تب فروش | `creators/[creatorId]/CreatorReferralPanel.tsx`، `CreatorSalePanel.tsx` |

## ۳. پنل ادمین naslyar — `app/(main)/marketing/referral-code/`

تب‌ها مسیرهای جدا داخل layout مشترک‌اند (`(tabs)/layout.tsx`)؛ با جابه‌جایی تب فقط outlet عوض می‌شود
(`app/config/page-shells.ts`). فرم کمپین صفحه جداست و تب ندارد.

| مسیر | محتوا |
|---|---|
| `/marketing/referral-code` | آمار، کارهای منتظر اقدام، آموزش کامل |
| `/campaigns` | فهرست + فعال‌سازی/توقف/پایان (پایان با تأیید) |
| `/campaigns/new` · `/campaigns/[id]/edit` | فرم کمپین + قوانین + پله‌ها (همگام‌سازی قوانین با `_id`) |
| `/referrals` | دعوت‌شدگان — فیلتر وضعیت/کمپین، صفحه‌بندی |
| `/rewards?status=` | پاداش‌ها — تأیید/پرداخت/رد/لغو با `ConfirmDialog` (دلیل الزامی برای رد/لغو) |
| `/audit-log` | گزارش تغییرات |

کامپوننت‌های مشترک پنل: `app/components/ToggleField`، `app/components/ConfirmDialog`، `app/hooks/useRevisionData.ts`.
