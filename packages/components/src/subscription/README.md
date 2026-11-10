# اشتراک و مصرف (Subscription UI)

کامپوننت‌ها و هوک مشترک برای نمایش «پلن فعلی کاربر + مصرف و محدودیت‌های هر قابلیت».
این کد عمداً app-agnostic نوشته شده تا **همه اپلیکیشن‌های مونوریپو** (taskvision، hosheton، openforex و…) از آن استفاده کنند و منطق تکراری در هر اپ نوشته نشود.

منبع داده، اندپوینت استاندارد کتابخانه اشتراک بک‌اند است که در همه اپ‌هایی که `SubscriptionModule` را import کرده‌اند موجود است:

```
GET {apiBase}/api/subscription/subscriptions/me
Authorization: Bearer <token>

{
  "statusCode": 200,
  "data": {
    "hasSubscription": true,
    "subscription": { "planId": {...}, "planPriceId": {...}, "status", "startsAt", "endsAt", "isTest" },
    "usage": [{ "code", "name", "unit", "type": "boolean|quantity", "allowed", "limit", "used", "remaining" }]
  }
}
```

## استفاده

```tsx
'use client';
import { useSubscriptionOverview, PlanUsagePanel } from '@my-workspace/components';
import { useAuthStore } from '@/app/zustand/store/authStore'; // استور احراز هویت خود اپ

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const { token } = useAuthStore();

const { overview, loading, refresh } = useSubscriptionOverview({
    apiBase: API_URL,
    getToken: () => token,
    enabled: !!token, // تا زمان لاگین، درخواست زده نشود
});

<PlanUsagePanel
    overview={overview}
    loading={loading}
    onUpgrade={() => router.push('/pricing')}
    labels={{ /* ترجمه‌های خود اپ؛ پیش‌فرض انگلیسی است */ }}
    formatDate={(d) => new Date(d).toLocaleDateString('fa-IR')}
    formatNumber={toFarsiNumber}
/>
```

- `useSubscriptionOverview` فقط `apiBase` و توکن می‌گیرد؛ با استور احراز هویت هر اپ سازگار است.
- `PlanUsagePanel` کاملاً presentational است: برچسب‌ها از طریق `labels`، قالب‌بندی تاریخ/عدد/قیمت از طریق `formatDate` / `formatNumber` / `formatPrice` به آن تزریق می‌شود.
- استایل‌ها با CSS Variables ورک‌اسپیس (`--card-background`، `--border-color`، `--blue-bg` و…) و fallback ساخته می‌شوند و از logical properties استفاده می‌کنند تا در RTL و LTR درست باشد.
- ظاهر اختصاصی هر اپ فقط با متغیرهای `--plan-usage-*` روی `className` خود اپ (کلاس‌های داخلی را override نکن): `radius`، `title-weight`، `label-weight`، `strong-weight`، `name-size`، `row-padding`، `track`، `on-color`، `off-color` — فهرست و پیش‌فرض‌ها بالای `PlanUsagePanel.module.scss`. نمونه: `.usagePanel` در `apps/taskvision/app/(main)/settings/subscription/subscription.module.scss`.
