# قیمت‌گذاری و تنظیمات مدل‌های 3D — Atlas Cloud

این مستند پنج مدل 3D اضافه‌شده به دیتابیس `hosheton.providermodels` (کلاس `3d`) را توضیح می‌دهد.
منبع قیمت‌ها و پارامترها صفحات رسمی Atlas Cloud است:

| مدل | name در DB | قیمت رسمی Atlas | حالت‌ها | صفحه منبع |
|------|-----------|----------------|---------|-----------|
| Meshy V7 | `meshy-v7` | **$0.02 / تولید** | text-to-3d، image-to-3d، multi-image-to-3d | [/models/meshy-v7/text-to-3d](https://www.atlascloud.ai/models/meshy-v7/text-to-3d) |
| Tripo H3.1 | `tripo-h3.1` | **$0.1 / تولید** | text-to-3d، image-to-3d | [/models/tripo-h3.1/text-to-3d](https://www.atlascloud.ai/models/tripo-h3.1/text-to-3d) |
| Hunyuan 3D Rapid | `tencent/hunyuan3d-rapid` | **$0.02 / تولید** | text-to-3d، image-to-3d | [/models/tencent/hunyuan3d-rapid/text-to-3d](https://www.atlascloud.ai/models/tencent/hunyuan3d-rapid/text-to-3d) |
| Hunyuan 3D Pro | `tencent/hunyuan3d-pro` | **$0.02 / تولید** | text-to-3d، image-to-3d | [/models/tencent/hunyuan3d-pro/text-to-3d](https://www.atlascloud.ai/models/tencent/hunyuan3d-pro/text-to-3d) |
| Seed3D 2.0 | `bytedance/seed3d-v2.0` | **$0.353 / تولید** | image-to-3d | [/models/bytedance/seed3d-v2.0/image-to-3d](https://www.atlascloud.ai/models/bytedance/seed3d-v2.0/image-to-3d) |

## ساختار قیمت‌گذاری

همه ۵ مدل نرخ **فلت به ازای هر تولید** دارند (مستقل از کیفیت/فرمت)، پس:

```
pricing = { currency: 'USD', mode: 'per_unit', unit: { amount: <قیمت>, per: 'generation' } }
```

- موتور هزینه (`model-cost.engine.ts`) برای `per: 'generation'` تعداد × قیمت حساب می‌کند (quantity = 1 برای هر تولید).
- راستی‌آزمایی با موتور واقعی: `Projects/db-backups/verify-3d-pricing.js` — ۱۱/۱۱ پاس
  (مثلاً meshy-v7: vendor=$0.02 → charged=$0.024 با مارک‌آپ ۲۰٪؛ seed3d: vendor=$0.353 → charged=$0.4236).

## نکات قیمت‌گذاری (مهم)

1. **Meshy V7**: طبق صفحه Atlas، نرخ فلت $0.02 است. گزینه‌های `ultra_mode` و `texture_resolution: 8k`
   روی پلتفرم خود Meshy «۵ کردیت اضافه» دارند، اما روی نرخ دلاری صفحه Atlas اثری ندارند؛
   برای همین قیمت شرطی در DB درج نشده است.
2. **Tripo H3.1**: نرخ فلت $0.1؛ `geometry_quality` / `texture_quality` / `face_limit` قیمت را تغییر نمی‌دهند.
3. **Hunyuan Rapid/Pro**: نرخ فلت $0.02؛ `face_count` (۴۰ هزار تا ۱٫۵ میلیون) و `generate_type` اثری روی قیمت ندارند.
4. **Seed3D 2.0**: نرخ فلت $0.353؛ `subdivision_level` و `file_format` اثری روی قیمت ندارند.

## ورودی‌ها (settingsSchema + modes)

هر مدل `modes` با `requiredInputs` و route اختصاصی Atlas (providerId `6a927328bceebb777e304911`) دارد:

| مدل | mode | ورودی اجباری | binding تصویر |
|------|------|--------------|----------------|
| meshy-v7 | text-to-3d | prompt | — |
| meshy-v7 | image-to-3d | image | `image` (تک عکس) |
| meshy-v7 | multi-image-to-3d | image | `reference_images` (تا ۴ عکس) |
| tripo-h3.1 | text-to-3d | prompt | — |
| tripo-h3.1 | image-to-3d | image | `image_url` (تک عکس — نام پارامتر متفاوت!) |
| hunyuan3d-rapid/pro | text-to-3d | prompt | — |
| hunyuan3d-rapid/pro | image-to-3d | image | `image` (تک عکس) |
| seed3d-v2.0 | image-to-3d | image | `image` (تک عکس) |

تنظیمات هر مدل (settingsSchema با `payloadPath` و `sendToProvider: true`) عیناً از مستندات Atlas:

- **Meshy V7**: mode (full/preview)، ultra_mode، should_texture، enable_pbr، texture_resolution (2k/4k/8k)،
  image_enhancement، should_remesh، topology (triangle/quad)، target_polycount (۱۰۰–۳۰۰هزار)، pose_mode
- **Tripo H3.1**: texture، pbr، texture_quality، geometry_quality، face_limit (۱هزار–۲ میلیون)، quad (خروجی FBX)،
  auto_size، texture_alignment، orientation
- **Hunyuan Rapid**: enable_pbr، enable_geometry، format (GLB/OBJ/USDZ/FBX/STL/MP4)
- **Hunyuan Pro**: generate_type (Normal/Geometry)، enable_pbr، face_count (۴۰هزار–۱.۵ میلیون، پیش‌فرض ۵۰۰هزار)
- **Seed3D 2.0**: subdivision_level (high/medium/low)، file_format (glb/obj/usd/usdz)

پارامترهای آرایه‌ای مثل `target_formats` (Meshy) در اسکیمای تنظیمات پنل درج نشدند چون نوع آرایه‌ای
پشتیبانی نمی‌شود؛ پیش‌فرض GLB از سمت Atlas اعمال می‌شود. فیلدهای عددی بدون مقدار پیش‌فرض (مثل
`face_limit` و `target_polycount`) عمداً min/max ندارند تا موتور به‌صورت خودکار min را به‌عنوان default نفرستد.

## اسکریپت‌ها و بک‌آپ

- اسکریپت درج: `Projects/db-backups/add-3d-models.js`
- بک‌آپ بعد از درج: `Projects/db-backups/3d-models-after-insert.json`
- تست موتور هزینه: `Projects/db-backups/verify-3d-pricing.js`

## پشتیبانی کلاس 3d در کد

- پنل naslyar: از قبل در `CLASS_OPTIONS`، فیلتر لیست و استودیوی ai-modes موجود بود.
- هسته (`libs/hosheton_core`): union های `model-pricing-ai-lookup.service.ts`، `pricing-source.interface.ts`،
  `node-setting-field.model.ts` (+3d)، `ai-modes.defaults.ts` (`AiModeMediaClass`)، `ai-mode.schema.ts`
  و ۵ ورودی جدید در `model-settings-catalog.ts` (برای Settings Sync).
- فرانت studio: `ModelBadge.tsx`، `node-catalog.ts`، صفحه `ai-model-pricing` (فیلتر + hint)،
  کلیدهای `catalog_3d`/`catalog_3d_hint` در ۱۰ زبان، و `UsageModelSummary.class`.
