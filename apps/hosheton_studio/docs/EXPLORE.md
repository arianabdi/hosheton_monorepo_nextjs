# Explore & Workflow Templates

راهنمای استفاده از **Explore**، **ایجاد قالب**، **درخواست بررسی** و **انتشار در marketplace** در استودیو رسانه هوشتون.

## نمای کلی

```
کاربر استودیو                    ادمین (naslyar)                 Explore عمومی
     │                                  │                              │
     ├─ ایجاد قالب (/templates/new)    │                              │
     ├─ ویرایش پیش‌نویس                │                              │
     ├─ ارسال بررسی ──────────────────►│ صف بررسی                      │
     │                                  ├─ تایید → publishedSnapshot   │
     │                                  │                              │
     └─ درخواست‌ها (/templates/review-requests)                         │
                                                                        │
                                        قالب‌های تاییدشده ◄─────────────┘
                                        (/explore)
```

## جریان کاربر (Studio)

### ۱. ایجاد قالب

مسیر: `/templates/new`

فیلدها:
- **عنوان / توضیحات** — برای جستجو در Explore استفاده می‌شود
- **نوع قالب** — `workflow` یا `prompt`
- **پروژه مبدا (اختیاری)** — nodes/edges پروژه در قالب ذخیره می‌شود
- **Prompt** — برای قالب prompt الزامی است
- **مدل‌های AI** — دستی یا استخراج از گره‌های پروژه
- **برچسب‌ها** — مثل «تغییر لباس»، «افزایش کیفیت»
- **پیش‌نمایش** — حداکثر ۲ فایل image/video

همچنین از داخل ویرایشگر پروژه (`ایجاد قالب`) می‌توان workflow فعلی را سریع ذخیره کرد.

### ۲. مدیریت قالب‌ها

مسیر: `/templates`

- پیش‌نویس → دکمه **درخواست بررسی**
- رد شده → اصلاح و ارسال مجدد
- تایید شده → در Explore نمایش داده می‌شود (نسخه snapshot)

### ۳. پیگیری درخواست بررسی

مسیر: `/templates/review-requests`

وضعیت‌ها: `pending` | `approved` | `rejected` + یادداشت ادمین

## جریان ادمین (Naslyar)

مسیر: **هوش مصنوعی → بررسی قالب‌ها**

- لیست: `GET /api/studio/media/workflow-templates/admin/review-queue`
- جزئیات: `GET /api/studio/media/workflow-templates/admin/:id`
- تایید/رد: `PUT /api/studio/media/workflow-templates/:id/review`

با **تایید**:
- `publishedSnapshot` از وضعیت فعلی قالب ساخته می‌شود
- `visibility = public`
- نسخه کاربر قابل ویرایش می‌ماند؛ Explore همیشه snapshot را نشان می‌دهد

## Explore

مسیر: `/explore`

API:
```
GET /api/studio/media/workflow-templates/explore
  ?search=افزایش کیفیت عکس
  &kind=workflow|prompt
  &aiModel=Gemini
  &page=1&limit=24
```

### جستجو

- فیلد `searchText` + text index روی title/description/tags/prompt
- امتیازدهی توکنی برای تطابق نسبی (مثلاً «تغییر لباس» در توضیحات)
- فیلتر نوع قالب و مدل AI

### استفاده از قالب

دکمه «استفاده در پروژه جدید» → `POST /api/studio/media/projects` با `templateId`

## API خلاصه

| متد | مسیر | نقش |
|-----|------|-----|
| POST | `/workflow-templates` | ایجاد قالب standalone |
| PUT | `/workflow-templates/:id` | ویرایش پیش‌نویس |
| GET | `/workflow-templates/mine` | قالب‌های من |
| GET | `/workflow-templates/mine/review-requests` | درخواست‌های ارسالی |
| POST | `/workflow-templates/:id/submit-review` | ارسال بررسی |
| GET | `/workflow-templates/explore` | Explore |
| GET | `/workflow-templates/admin/review-queue` | صف ادمین |
| PUT | `/workflow-templates/:id/review` | تایید/رد |

## نکات

1. فقط قالب‌های `approved` با `publishedSnapshot` در Explore دیده می‌شوند.
2. ویرایش قالب تاییدشده، وضعیت را به `draft` برمی‌گرداند — برای انتشار مجدد باید دوباره بررسی شود.
3. import/clone پروژه از قالب عمومی، از **publishedSnapshot** استفاده می‌کند نه نسخه در حال ویرایش کاربر.
