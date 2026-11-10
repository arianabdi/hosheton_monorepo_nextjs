# قیمت‌گذاری مدل‌های FLUX روی Atlas Cloud

این مستند تنظیمات نهایی قیمت سه مدل FLUX (پیاده‌سازی‌شده در دیتابیس `hosheton.providermodels`) را توضیح می‌دهد.
منبع قیمت‌ها صفحات رسمی Atlas Cloud و API عمومی آن است:

| مدل | صفحه قیمت |
|------|-----------|
| FLUX.2 Pro T2I | https://www.atlascloud.ai/models/black-forest-labs/flux-2-pro/text-to-image |
| FLUX.2 Pro Edit | https://www.atlascloud.ai/models/black-forest-labs/flux-2-pro/edit |
| FLUX.2 Flex T2I | https://www.atlascloud.ai/models/black-forest-labs/flux-2-flex/text-to-image |
| FLUX.2 Flex Edit | https://www.atlascloud.ai/models/black-forest-labs/flux-2-flex/edit |
| Flux Schnell | https://www.atlascloud.ai/models/black-forest-labs/flux-schnell + `api/v1/pricing/models` |

## قابلیت‌های قیمت‌گذاری پنل که استفاده شد

| ساختار | کجا | کاربرد |
|--------|-----|--------|
| `pricing.mode = matrix` + محور `size` (source: setting) | مدل | قیمت هر سایز خروجی، `per: image` (در تعداد تصویر ضرب می‌شود) |
| `pricing.mode = per_unit` با `unit.per: image` | مدل | قیمت فلت هر تصویر (Schnell) |
| `pricingOverride` روی mode `image-to-image` | mode | قیمت متفاوت endpoint /edit |
| `pricing.tokenEstimator.formula` با `resultType: vendor_cost_usd` | داخل pricingOverride | قیمت ترکیبی: `lookup(size) + lookup(inputImageCount) × نرخ مرجع` |
| `notesMarkdown` | مدل | توضیح فرمول و مثال‌ها برای ادمین |

## ۱) FLUX.2 Pro (`black-forest-labs/flux-2-pro`)

- T2I: `cost = 0.03 + (min(4, ceil(w×h/1,048,576)) − 1) × 0.015`
  - مگاپیکسل اول $0.03، هر MP اضافه $0.015، سقف 4MP، گرد کردن به بالا.
  - مثال: 1MP=$0.030 ، 2MP=$0.045 ، 3MP=$0.060 ، 4MP=$0.075
- Edit (composite): خروجی مثل بالا + عکس مرجع:
  - چند مرجع: هر عکس 1MP فلت → `count × $0.015` (دقیق)
  - تک مرجع: رزولوشن واقعی تا 4MP → در موتور ما ~1MP فرض شده (تقریب)

## ۲) FLUX.2 Flex (`black-forest-labs/flux-2-flex`)

- T2I: `cost = min(4, ceil(w×h/1,048,576)) × 0.05` (فلت per-MP)
  - مثال: 1MP=$0.050 ، 2MP=$0.100 ، 3MP=$0.150 ، 4MP=$0.200
- Edit: `(MP خروجی + MP مرجع) × 0.05` — قواعد مرجع مثل Pro با نرخ $0.05.

## ۳) Flux Schnell (`black-forest-labs/flux-schnell`)

- فلت **$0.003 به ازای هر تصویر** مستقل از رزولوشن (`per_unit / image`).

## نکات فنی مهم (چرا این شکل انتخاب شد)

1. **محور ماتریس باید با dim زمان اجرا match شود.** در مسیر بیلینگ (`media-worker → computeAndLogGenerationCost`) تمام `modelSettings` اولیه به `context` پاس داده می‌شود؛ پس محور با `settingKey: size` روی مقدارهایی مثل `1024*1024` match می‌شود. (حذف محور دستی «قیمت» قبلی و `per: second` اشتباه.)
2. **موتور فرمول ceil ندارد** (فقط + − × ÷ و lookup)؛ به همین دلیل قیمت سایزها با lookup جدول‌محور شده و هزینه عکس مرجع با `lookup(inputImageCount)` (مقادیر 1..8) حساب می‌شود.
3. **fallback‌ها**: سایز ناشناخته → ردیف اول ماتریس ($0.03/$0.05)؛ نبود متریک `inputImageCount` → هزینه یک مرجع.
4. بدون `usage` واقعی از provider، این قیمت‌ها «برآورد» هستند؛ اگر Atlas در پاسخ هزینه واقعی برگرداند می‌توان `actualCost.jsonPath` را روی mode تنظیم کرد که بر pricing اولویت دارد.

## اسکریپت‌های مرتبط

- بک‌آپ قبل از تغییر: `Projects/db-backups/flux-models-backup-2026-09-17.json`
- اسکریپت آپدیت: `Projects/db-backups/update-flux-pricing.js`
- تست شبیه‌سازی موتور هزینه: `Projects/db-backups/simulate-engine.js` (۲۰/۲۰ پاس)
