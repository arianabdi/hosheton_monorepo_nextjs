اگر بخواهم Sentry را از صفر طراحی کنم (نه فقط یک Logger)، معماری‌ای که پیشنهاد می‌کنم چیزی بین Error Tracking + Structured Logging + Observability Platform است؛ اما به گونه‌ای که SDK آن کمتر از 20KB باشد، latency اضافه نکند، و بتواند روزانه میلیون‌ها event را ingest کند.

این پاسخ را مثل یک Software Architecture Design Doc می‌نویسم؛ از سطح Database تا SDK، API، پردازش، Alerting و Dashboard. بسیاری از قابلیت‌ها از معماری Sentry، Datadog و OpenTelemetry الهام گرفته شده‌اند، ولی برای یک سیستم Self-hosted و سبک طراحی شده‌اند. Sentry هم دقیقاً بر پایه‌ی event pipeline، grouping، breadcrumbs، release tracking، tracing و context enrichment کار می‌کند.

![](https://www.google.com/s2/favicons?domain=https://sentrydocs.dev\&sz=32)

Sentry+2

# معماری نهایی سیستم (Production Grade)

Production-grade architecture

# Lightweight Observability Platform

SDK کمتر از 20KB

Async ingestion

Grouping + Tracing + Alerts

![](data\:image/svg+xml;charset=utf-8,%3Csvg%20font-family%3D%22-apple-system-body%2C%20ui-sans-serif%2C%20-apple-system%2C%20system-ui%2C%20%26quot%3BSegoe%20UI%26quot%3B%2C%20Helvetica%2C%20%26quot%3BApple%20Color%20Emoji%26quot%3B%2C%20Arial%2C%20sans-serif%2C%20%26quot%3BSegoe%20UI%20Emoji%26quot%3B%2C%20%26quot%3BSegoe%20UI%20Symbol%26quot%3B%22%20font-weight%3D%22400%22%20data-d-component%3D%22svg%22%20fill%3D%22currentColor%22%20style%3D%22color%3Argb\(255%2C%20255%2C%20255\)%22%20viewBox%3D%220%200%20760%20540%22%20width%3D%22100%25%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20x%3D%22220%22%20y%3D%2220%22%20width%3D%22320%22%20height%3D%2256%22%20rx%3D%2214%22%20fill%3D%22%2316a34a%22%2F%3E%3Ctext%20x%3D%22380%22%20y%3D%2254%22%20fill%3D%22white%22%20font-size%3D%2218%22%20text-anchor%3D%22middle%22%3EApplication%20SDK%3C%2Ftext%3E%3Crect%20x%3D%22250%22%20y%3D%22110%22%20width%3D%22260%22%20height%3D%2246%22%20rx%3D%2212%22%20fill%3D%22%23DCFCE7%22%20stroke%3D%22%2316a34a%22%2F%3E%3Ctext%20x%3D%22380%22%20y%3D%22138%22%20font-size%3D%2214%22%20text-anchor%3D%22middle%22%20fill%3D%22%2314532D%22%3EAsync%20Event%20Buffer%3C%2Ftext%3E%3Crect%20x%3D%22220%22%20y%3D%22190%22%20width%3D%22320%22%20height%3D%2254%22%20rx%3D%2212%22%20fill%3D%22%23DBEAFE%22%20stroke%3D%22%232563EB%22%2F%3E%3Ctext%20x%3D%22380%22%20y%3D%22222%22%20font-size%3D%2215%22%20text-anchor%3D%22middle%22%20fill%3D%22%231E40AF%22%3EIngestion%20API%20%2F%20Relay%3C%2Ftext%3E%3Crect%20x%3D%2240%22%20y%3D%22290%22%20width%3D%22150%22%20height%3D%2270%22%20rx%3D%2212%22%20fill%3D%22%23FEF3C7%22%20stroke%3D%22%23D97706%22%2F%3E%3Ctext%20x%3D%22115%22%20y%3D%22320%22%20font-size%3D%2213%22%20text-anchor%3D%22middle%22%3EDeduplication%3C%2Ftext%3E%3Ctext%20x%3D%22115%22%20y%3D%22338%22%20font-size%3D%2212%22%20text-anchor%3D%22middle%22%3EFingerprint%3C%2Ftext%3E%3Crect%20x%3D%22220%22%20y%3D%22290%22%20width%3D%22150%22%20height%3D%2270%22%20rx%3D%2212%22%20fill%3D%22%23F3E8FF%22%20stroke%3D%22%239333EA%22%2F%3E%3Ctext%20x%3D%22295%22%20y%3D%22320%22%20font-size%3D%2213%22%20text-anchor%3D%22middle%22%3EEnrichment%3C%2Ftext%3E%3Ctext%20x%3D%22295%22%20y%3D%22338%22%20font-size%3D%2212%22%20text-anchor%3D%22middle%22%3EUser%20%2F%20Tags%20%2F%20Release%3C%2Ftext%3E%3Crect%20x%3D%22410%22%20y%3D%22290%22%20width%3D%22150%22%20height%3D%2270%22%20rx%3D%2212%22%20fill%3D%22%23E0F2FE%22%20stroke%3D%22%230284C7%22%2F%3E%3Ctext%20x%3D%22485%22%20y%3D%22320%22%20font-size%3D%2213%22%20text-anchor%3D%22middle%22%3EIssue%20Engine%3C%2Ftext%3E%3Ctext%20x%3D%22485%22%20y%3D%22338%22%20font-size%3D%2212%22%20text-anchor%3D%22middle%22%3EGrouping%20%2F%20Regression%3C%2Ftext%3E%3Crect%20x%3D%22590%22%20y%3D%22290%22%20width%3D%22130%22%20height%3D%2270%22%20rx%3D%2212%22%20fill%3D%22%23FEE2E2%22%20stroke%3D%22%23DC2626%22%2F%3E%3Ctext%20x%3D%22655%22%20y%3D%22320%22%20font-size%3D%2213%22%20text-anchor%3D%22middle%22%3EAlert%20Engine%3C%2Ftext%3E%3Ctext%20x%3D%22655%22%20y%3D%22338%22%20font-size%3D%2212%22%20text-anchor%3D%22middle%22%3ESlack%20%2F%20Email%3C%2Ftext%3E%3Crect%20x%3D%22190%22%20y%3D%22410%22%20width%3D%22380%22%20height%3D%2290%22%20rx%3D%2216%22%20fill%3D%22%23F8FAFC%22%20stroke%3D%22%2364748B%22%2F%3E%3Ctext%20x%3D%22380%22%20y%3D%22440%22%20font-size%3D%2215%22%20text-anchor%3D%22middle%22%3EStorage%20Layer%3C%2Ftext%3E%3Ctext%20x%3D%22380%22%20y%3D%22460%22%20font-size%3D%2213%22%20text-anchor%3D%22middle%22%3EEvents%20%E2%80%A2%20Issues%20%E2%80%A2%20Breadcrumbs%20%E2%80%A2%20Traces%20%E2%80%A2%20Metrics%3C%2Ftext%3E%3Ctext%20x%3D%22380%22%20y%3D%22478%22%20font-size%3D%2212%22%20text-anchor%3D%22middle%22%3EPostgreSQL%20%2B%20ClickHouse%20%2B%20Redis%3C%2Ftext%3E%3Cpath%20d%3D%22M380%2076V110M380%20156V190M380%20244V268%22%20stroke%3D%22%2364748B%22%20stroke-width%3D%222%22%2F%3E%3Cpath%20d%3D%22M380%20268L115%20290M380%20268L295%20290M380%20268L485%20290M380%20268L655%20290%22%20stroke%3D%22%2364748B%22%20stroke-width%3D%222%22%2F%3E%3Cpath%20d%3D%22M115%20360L260%20410M295%20360L330%20410M485%20360L440%20410M655%20360L500%20410%22%20stroke%3D%22%2364748B%22%20stroke-width%3D%222%22%2F%3E%3C%2Fsvg%3E)Pipeline غیرهمزمان باعث می‌شود درخواست اصلی اپلیکیشن تقریباً هیچ هزینه‌ای بابت ارسال لاگ نپردازد.

# ستون‌های اصلی اکوسیستم

| ماژول | وظیفه |
| ----- | ----- |
|       |       |
| SDK   |       |

| جمع‌آوری Error، Log، Trace، Breadcrumb و Context بدون ایجاد latency. |
|

Ingestion API

| دریافت میلیون‌ها Event، Authentication، Rate Limit، Validation. |
|

Issue Engine

| Deduplicate، Grouping، Fingerprint، Regression Detection. |
|

Storage Engine

| ذخیره Eventها، Metadata، Breadcrumbها، Traceها و Metrics. |
|

Search Engine

| فیلتر سریع روی میلیاردها Event. |
|

Alert Engine

| اعلان بر اساس Ruleها. |
|

Dashboard/UI

| Issue Timeline، Stack Trace، Context، Replay، Analytics. |

# لایه اول — SDK (مهم‌ترین قسمت)

SDK باید فوق‌العاده سبک باشد.

## قابلیت‌های SDK

| Feature                     | توضیح                                            |
| --------------------------- | ------------------------------------------------ |
| Unhandled Exception Capture | تمام Exceptionهای Handle نشده را خودکار ثبت کند. |
| Handled Exception Capture   | توسعه‌دهنده بتواند دستی Error بفرستد.            |
| Message Capture             | ثبت Logهای Info، Warning، Debug، Error.          |
| Breadcrumbs                 | ثبت اتفاقات قبل از Error.                        |
| User Context                | شناسه کاربر، ایمیل، پلن، سازمان.                 |
| Tags                        | کلید/مقدار برای جستجو.                           |
| Environment                 | Production / Staging / Dev.                      |
| Release                     | نسخه Deploy.                                     |
| Sampling                    | ارسال درصدی Eventها.                             |
| Offline Queue               | اگر شبکه قطع بود، Eventها Queue شوند.            |

## API طراحی SDK

TypeScript

```
logger.captureException(error, {
  tags: {
    service: "payment",
    provider: "zarinpal"
  },
  user: {
    id: "123",
    email: "user@test.com"
  },
  context: {
    orderId: 98123
  }
})

logger.captureMessage("Payment timeout", "warning")

logger.addBreadcrumb({
  category: "payment",
  message: "Calling payment gateway",
  level: "info"
})

logger.setUser(...)
logger.setTag(...)
logger.setRelease("v2.4.0")
logger.setEnvironment("production")
```

# Event Schema استاندارد

هر Event باید Structure مشخص داشته باشد.

JSON

```
{
  "event_id": "...",
  "timestamp": "...",
  "level": "error",
  "type": "exception",

  "message": "...",

  "exception": {
    "type": "TypeError",
    "value": "...",
    "stacktrace": [...]
  },

  "user": {...},

  "request": {...},

  "device": {...},

  "runtime": {...},

  "release": "v1.2.0",

  "environment": "production",

  "tags": {...},

  "breadcrumbs": [...],

  "trace": {...}
}
```

این دقیقاً همان فلسفه Event Envelope در Sentry است.

![](https://www.google.com/s2/favicons?domain=https://sentrydocs.dev\&sz=32)

Sentry+1

# Error Levels

fatal

کرش سیستم

Application Exit / Panic / OutOfMemory

error

Exception واقعی

HTTP 500، Database Error

warning

رفتار غیرعادی

Timeout، Retry، Deprecated API

info

Business Event

User Login، Payment Started

debug

فقط Development

SQL Query، Variable State

# Stack Trace حرفه‌ای

## باید چه چیزی ذخیره شود؟

![Tinkerer - How to Read Programming Error Messages](https://images.openai.com/static-rsc-4/2Q5sNfeT_y7gtV6IkZMf-dbr03m1dOLhdVWWhc3hUR2UbIE0nw6KvK6rfBn-_FrCg5haMoHPMry0rmxEdBUYiyxPeamXpBX2FVfHbe1urSy6-Zh-4RHS96umMSC4Uex4Cem5KearCybtzvBI_JBUbFClOWt6MCddOQKN8euLHFU?purpose=inline)

![laravel - ErrorException Undefined variable: contacts (View/resources/views/contacts/index.blade.php) - Stack Overflow](https://images.openai.com/static-rsc-4/fBZJyHeSb0PMjCcSPcfcSkeWHQOBuVNdkLgqtwU_DdT3HR2l8kmIQEw8fII-yrY6Zx9FlSmlq9basE1fYSZ6PDSR_mJSTz7FFAaT6YeI0PjmdlNexXffwnL6H_LxkkX8jGUPBgv8EtpwyeqWFrpiuikGSp4Fe8UTu2_hd86U5KU?purpose=inline)

![Understanding how this works in Javascript - Default Binding - DEV Community](https://images.openai.com/static-rsc-4/2RuWXZFizH1P66JWAczk5Yzwg3tA-CDtX-IbtJIwAvFCXGMNFkrp8sSQSeAKcRUW_rJ0U5IXH5aRjOmzCoreeOdMHOO1Z3hYN-LC3UnuyiI5WDXAGkyaSin6dpWhGwsevOUtKtQSfihE2ZFYL5aUbVLO0SaENk6Kc75K9O78pgM?purpose=inline)

6

هر Frame:

| Field                | مثال |
| -------------------- | ---- |
| filename             |      |
| `payment.service.ts` |      |

|
| line | 152 |
| column | 17 |
| function |

`createPayment()`

|
| context_line | کد همان خط |
| pre_context | ۵ خط قبل |
| post_context | ۵ خط بعد |

چرا؟

UI بدون مراجعه به Repository علت Error را نشان می‌دهد. Sentry هم Source Context را کنار Stack نمایش می‌دهد.

![](https://www.google.com/s2/favicons?domain=https://sentrydocs.dev\&sz=32)

Sentry

# Breadcrumb System (شاهکار Debugging)

قبل از Error چه اتفاقی افتاد؟

![Build IT Better - DevOps - Monitoring Roundup - This Dot Labs](https://images.openai.com/static-rsc-4/O4wAVZ7OA-sOM_vEPf-ofwtwarUXGAovUAyGXbjWCfMsDvX6B_r3JPP8UqCe7F9dS5TOv7P4sXH_o46OujrPh1Q5W0lShdgttkCKojRckjEzSXpkgU-nh5HdhfPgCsYjkEe3k02VrWzShitlQLmdGFhAEmJDYmI_0hWGEQj-Aes?purpose=inline)

![](https://images.openai.com/static-rsc-4/nc2DV3HSZlnoCJkpB-DxA41oFnSjYHZDdkF3qXN_bpCz-32Xeb2dJ47deV0E-1Y0tLmYZuxAiHym9IA9ktYJmCKbmOfGK4pLtGw_MuSJn1IBrxcWUM3xGCwKZsGN2ohGKWLyylhUKmOTw-5tWr-CHrkL-JzEtlzZymLGz4kdmXM?purpose=inline)

![Sentry: The Python App’s Debugging 10x Faster | by https://devputers.com/ | Medium](https://images.openai.com/static-rsc-4/r7IEh9QbPfACP_erVFo3ZrAt5mZuFMj7DQ-WBFJbwFDTI2C3P2FE4zt8WPgkKSnUEuqpJJQ1rxpoAmoDL-xaZzx81hwMab8Cl6t6YqRTvFWzG1O2WzhGefWnwjNox6CRuvEU7wbnTAAbdnQC8c6mIzqZvK4gLLGTKMjXnQOVKiY?purpose=inline)

5

نمونه Breadcrumbها:

| Category       | نمونه |
| -------------- | ----- |
| HTTP           |       |
| `GET /users/1` |       |

|
| Database |

`SELECT users`

|
| Auth | User authenticated. |
| Queue | Job dispatched. |
| Cache | Redis miss. |
| Business | Order created. |

هر Breadcrumb:

JSON

```
{
  "timestamp": "...",
  "category": "http",
  "level": "info",
  "message": "GET /api/users",
  "data": {
    "status": 200,
    "duration": 84
  }
}
```

SDK فقط آخرین 100 Breadcrumb را نگه دارد تا Memory رشد نکند. Sentry نیز Breadcrumb Buffer دارد و آن را هنگام وقوع Event ارسال می‌کند.

![](https://www.google.com/s2/favicons?domain=https://sentry.zendesk.com\&sz=32)

Sentry Help Center+1

# User Context

هر Event باید بداند چه کسی آسیب دیده.

JSON

```
"user": {
  "id": "u_123",
  "email": "...",
  "username": "...",
  "organization": "...",
  "plan": "pro"
}
```

مزایا:

* چند User متاثر شدند؟

* فقط کاربران VIP؟

* فقط کاربران Android؟

# Request Context

همه اطلاعات Request

JSON

```
{
  "method":"POST",
  "url":"/api/payment",
  "query":{},
  "headers":{},
  "body":{},
  "cookies":{},
  "ip":"..."
}
```

اما:

Sensitive Data Scrubbing

* Password

* Token

* Authorization

* Cookie

* Credit Card

Mask شوند.

# Environment Context

| Field        | Example     |
| ------------ | ----------- |
| environment  | production  |
| release      | 2.4.3       |
| commit_sha   | abc123      |
| branch       | main        |
| server_name  | api-3       |
| container_id | docker hash |
| region       | eu-west     |

Release Tracking یکی از قابلیت‌های کلیدی Sentry است.

![](https://www.google.com/s2/favicons?domain=https://sentrydocs.dev\&sz=32)

Sentry+1

# Device / Runtime Context

برای Frontend

JSON

```
{
 "browser":"Chrome 140",
 "os":"Windows 11",
 "screen":"1920x1080",
 "locale":"fa-IR"
}
```

Backend

JSON

```
{
 "language":"Node 22",
 "memory":512,
 "cpu":0.43
}
```

# Tag System (قوی‌ترین قابلیت Search)

Tagها ستون فقرات Query هستند.

نمونه:

JSON

```
{
 "service":"payment",
 "provider":"stripe",
 "tenant":"company_a",
 "country":"IR",
 "feature":"checkout"
}
```

بعداً Query:

SQL

```
service:payment environment:production country:IR
```

همین قابلیت باعث Search سریع می‌شود.

![](https://www.google.com/s2/favicons?domain=https://sentrydocs.dev\&sz=32)

Sentry

# Custom Context

برای هر Domain

JSON

```
"context": {
  "order": {
      "id":123,
      "price":90
  },
  "gateway":{
      "provider":"stripe"
  }
}
```

Structured JSON.

# Attachments

گاهی فایل لازم است.

* Request Body

* Screenshot

* HTML

* Config

* PDF

Attachment جدا ذخیره شود (S3/MinIO).

# Session Tracking

هر Session:

| Field      | Example      |
| ---------- | ------------ |
| session_id | UUID         |
| started_at | Timestamp    |
| ended_at   | Timestamp    |
| crashed    | Boolean      |
| duration   | Milliseconds |

Crash Rate از این محاسبه می‌شود.

# Release Health

![Mobile App Monitoring and Crash Reporting Solution | Sentry](https://images.openai.com/static-rsc-4/KxFUloni9m5bzb0iuywEaMfLTgnlQkw-P9_j2yPnrxIqWxbdMalFdBYG8NsjLvo7RUYx6PkX-uO-ADAvm3V2zHYFC7rZ8A08GkEz_ugBJFWvy4JsrxfRx_KwQWJiHwW5DHychLGPUGjsy6ZUaT8FzW_AO9Y4_rRRpgOeYajZydY?purpose=inline)

![Ozone Dashboard | Tutorials](https://images.openai.com/static-rsc-4/r8fxcyYtp6n4qu9t8C4wJYFQs0fuI4mRbyjK8gPMcuQzwq-qYBU-9rYpfKYAu5hfShRF-f-SeG5SKPqCrC8wp-0KNm7eJBjf9lNOAeoHnQPZd4oLsWnt34V4PNgyDETp962xtWa2COEWvkAwe1KbIbiNOoKHvhMF-lovIflbxCw?purpose=inline)

![](https://images.openai.com/static-rsc-4/Ymr064xO1SbUdLDEuxKDPx8Mso0CkjQgIAov_sJl2criIPnLnIiUnjw9KKhybZkh66PGggZ0U2_qAeTXK-hwv6QZGImbGSp4AC0TZ6kbcZ6MPMZttH5WPMKW5Q0yXSwZsA50Nh_xtoJV8LSHzfMSjXxZHGrE7wNm5kCddYlWf-c?purpose=inline)

6

برای هر Deploy:

| Metric           | توضیح               |
| ---------------- | ------------------- |
| Users            | تعداد کاربران نسخه. |
| Sessions         | تعداد Sessionها.    |
| Crashed Sessions | Session Crash Rate. |
| First Seen       | اولین Error.        |
| Last Seen        | آخرین Error.        |

# Fingerprinting & Issue Grouping (مهم‌ترین Engine)

بدون Grouping سیستم نابود می‌شود.

## Event

100,000 Error

↓

## Issue

5 Issue

## الگوریتم پیشنهادی

![機能詳細: アプリケーション性能管理 IBM Observability by Instana APM | NEC](https://images.openai.com/static-rsc-4/ugcGUwoPMFaUDcQTNetvWBx-YEFymfv9uM9RgOSN_1jYOATYi1weHedqr6gbbDPeXTH71Ih1OWikvs0MYM4EUuDUr8zDLgUsdfw2Lfua1eIK7IOXJrfGdkkzhcdanu-ouWA7xoK-6Lr4S2Hl43_egbJ7zQTRivvY1DlXkewRVnM?purpose=inline)

![Mobile: Group crashes tab | New Relic Documentation](https://images.openai.com/static-rsc-4/KIo7CUFv2sV7LvGIb8ydSDMyiqWcgQW8e4ioFCkGePRqzJBKLSwdpSBs9EvOb_8xJyeMUXzmunOlvX4ogZzZ9NJgCY9_glBWsSgO17OwIv5ol2g6gYZNk3Ps0fwR7cE4gNY97QllRxXah-5X4Z8jNDjXRc8FQxVMeUdDOksfd9U?purpose=inline)

![Solved: Create problem alert from Errors or Exception message - Dynatrace Community](https://images.openai.com/static-rsc-4/XZHnftOY5XNAaKc9yylJRQg-qgUN1OwHiO0A6iap6gMgX7bRo-_lU0cW_8SP4Do00w80DRPTatUJTFt9hWGCFykR7rBGgzoa7Tbc4ltQ4bCkTyz00me-yx_jF0vkeAqaB6cUUiWp19X9NWezzHwJBc8IL8MJ81bCXNqKOQ2Nnxc?purpose=inline)

Fingerprint از:

* Exception Type

* Stack Trace

* Root Function

* File

* Message Template

نمونه:

```
TypeError
payment.service.ts
createPayment()
```

Hash → SHA256.

تمام Eventهای مشابه به یک Issue متصل می‌شوند. Sentry نیز دقیقاً همین مفهوم Fingerprint و Grouping Rules را دارد.

![](https://www.google.com/s2/favicons?domain=https://sentrydocs.dev\&sz=32)

Sentry+1

## Custom Fingerprint

TypeScript

```
logger.captureException(error,{
   fingerprint:[
      "payment",
      gatewayName
   ]
})
```

# Issue Lifecycle

![Asana Bug Tracking Template](https://images.openai.com/static-rsc-4/h4C6sHcJWZVHyl8xeeeUhG_KPq1TyF3X7BNZohW0lIZH11e62KSsat7s-1cniDUeMayv0BhvPP-sgcEA33T4Z5__Xyb0EvOUtLy1GEgdoFX1a9dI5pGyN0Dn9JvFBRnlfDLzDNPm0a0IlpBsEwVBQJtO6_-WuyfHzWnEDsrHqB8?purpose=inline)

![Jira vs Trello: Which Meets Your Needs? (2024 Hands-On Testing)](https://images.openai.com/static-rsc-4/vGXwdRzo01fnMR7iRfzOW83Y7f8ADWpQC64rfActvaS_a-431hYz3Hk5BEOW3iHaA5jeb9JoSEDtgz8D4X-8prTUlJOkf95DMz8rPms3QSRvA__YBATeq3QEEJ3k5gQvUHz_6-05gsNODvZhHyerckRuINiUaTw3LODKDAu5d6c?purpose=inline)

![Bug Report Template: Free Copy-Paste Format + Exa...](https://images.openai.com/static-rsc-4/sAPDXsC74AGJleiP4UXpKI_Ze8g9Y0sOsD6JJaNkh5lOSgIHvZmS5A0LrBV-kAAjwgdU4cpFHIJsRbjE23Xr45kLZ9XtanlpKE6vIDAZdCqj6AwNcDwcnG-D0RXteFJUpqAuynH4C-LjWQbhNSmTlc-ufvnt2OrnB7LQzH45H_8?purpose=inline)

6

| Status    | توضیح                      |
| --------- | -------------------------- |
| Open      | جدید.                      |
| Ignored   | نادیده گرفته شده.          |
| Resolved  | حل شده.                    |
| Regressed | بعد از حل دوباره ظاهر شده. |

## Regression Detection

اگر Release جدید آمد و Issue دوباره ظاهر شد:

Issue → Regressed

Alert.

# Deduplication Engine

جلوگیری از ذخیره هزار Event مشابه.

روش‌ها:

* Fingerprint Cache

* Redis TTL

* Bloom Filter

* Time Window

مثلاً 100 Error در 2 ثانیه

↓

یک Batch.

# Event Sampling

برای سیستم‌های پرترافیک.

| Sampling Type | Example           |
| ------------- | ----------------- |
| Fixed         | 10%               |
| Dynamic       | Fatal = 100%      |
| User Based    | VIP همیشه.        |
| Error Based   | اولین وقوع همیشه. |

Sampling یکی از راهکارهای اصلی کاهش هزینه در Sentry است.

![](https://www.google.com/s2/favicons?domain=https://deepwiki.com\&sz=32)

DeepWiki+1

# Rate Limiting

SDK

↓

Server

↓

Queue

↓

Database

Rate Limit بر اساس:

* API Key

* Project

* IP

* Organization

# Retry Mechanism

SDK:

* Exponential Backoff

* Jitter

* Queue

اگر API Down شد.

# Offline Queue

Browser / Mobile

IndexedDB / SQLite

↓

ارسال هنگام آنلاین شدن.

# Event Enrichment Pipeline

هر Event بعد از دریافت غنی می‌شود.

مراحل:

1. GeoIP

2. Release

3. Git Commit

4. Organization

5. Service Name

6. Environment

7. Tags Normalization

# Source Maps / Symbolication

![Sentry Errors Are Unreadable by Default. Here's How to Fix It with Source Maps](https://images.openai.com/static-rsc-4/AlH-zfeEJNytWeAemuBQCj97tBHYCwNdBNY-Z89P5hGQ_zio3-WKNhM5wEk-VE8jGOduiteZTSp_W1pKGbh3i1NubrBq97IqjZG8n8vWx53vzSpenNgvvvkSy-4fHtMC5bHHQ2JgnOoUu2FCIYWKmf49hJX8-yr4ukndrJA7ZS4?purpose=inline)

![](https://images.openai.com/static-rsc-4/n3g8qyzHyPZsm2ME9eN227szcpInFrN1w0LNiCdSW4iKdSHRHOiG2VAC7mWmrMHIigKAu3tQESD0ulLWtX5CS_9EY_D7Ke-U2XzbqkJxFfOm7JPjbejX7B1LQHfBd4dxop6I4Wkr6LFdg9H6taNi50CmVErwKC-WeYdHTKtDFxE?purpose=inline)

![\[New feature\] Easy JavaScript error debugging with Source Maps - Site24x7 Forum](https://images.openai.com/static-rsc-4/LlcjH4V0KBdnehKlyjMOH275hQRjGmId_XO2qfMTcdJs3GJEYzl-kjvsKjKyDEjjQIWnsbyiR8gMJmUSwXtbTFQv5VjgioqzrjPY6McP61x0fwU01qWP52fq-4IUS6bKrjD51xmS5biAz2PNM2z5_yqAHLxs-MSnQ-cToZxFqIg?purpose=inline)

4

Frontend:

Minified Stack

↓

Original Source

Backend:

DWARF / Symbols.

# Search Engine

باید Query Language داشته باشد.

نمونه:

SQL

```
level:error environment:production
service:payment
release:2.4.1
user.id:123
tag.provider:zarinpal
```

پشتیبانی:

* AND

* OR

* NOT

* Wildcard

* Exists

# Database Design (Best Practice)

## PostgreSQL + ClickHouse + Redis

| Database   | وظیفه                                |
| ---------- | ------------------------------------ |
| PostgreSQL | Metadata / Issues / Projects / Users |
| ClickHouse | Events میلیاردی                      |
| Redis      | Cache / Dedup / Queue                |

## Tables

### issues

| Field       | Type      |
| ----------- | --------- |
| id          | uuid      |
| fingerprint | text      |
| title       | text      |
| status      | enum      |
| level       | enum      |
| first_seen  | timestamp |
| last_seen   | timestamp |
| event_count | bigint    |
| user_count  | bigint    |

### events

ClickHouse.

Partition:

* project

* month

Order By:

* fingerprint

* timestamp

TTL:

90 Days.

### breadcrumbs

Separate Table.

### releases

Release Metadata.

### sessions

Session Health.

### traces

Distributed Trace.

# Performance Monitoring

این قسمت Sentry را از Logger جدا می‌کند.

![](https://www.google.com/s2/favicons?domain=https://getsentry-sentry.mintlify.app\&sz=32)

Sentry+1

## Transaction

![Distributed Tracing 101 for Full Stack Developers | Sentry Blog](https://images.openai.com/static-rsc-4/6p-7b_JYMfnOJVlx6JQz1cBVI5S1CifeuQLyaSciOTJcCm5rzAUNsdmPCQaTZ8J_0SRSq3cTAoIoGhcYdvA0jQFVBT7gioysFjXb5Dk3w__TOUsEXoinqIJVh6gHKSMRb3W2Sgyvd1yCnHiy0Jdw_8Fu_wTKiPtkJdaLNTUd-mE?purpose=inline)

![Distributed Tracing - High-Performance Trace Analysis Powered by OpenTelemetry | SigNoz](https://images.openai.com/static-rsc-4/b7xx2c7RoQgwWYlUyFOQemK9qYCakA9YMGnv97buSnZ1hMB0nlUW6mSwao7zv_0hB7jf9Mq3e4orqHKotJBPKZnzN7bUM_dFilwLJJdEEg-t8Y8_2n7hru2lSs6qkTdz_fD6aGeooUHzAn9sY5BhiHHRce0Eba3bjFxDx6JbJtg?purpose=inline)

![5. OpenTelemetry Traces - Dynatrace Enablement Lab: Kubernetes OpenTelemetry](https://images.openai.com/static-rsc-4/nhHeJmnR7id0XdD2bdbDFKGqM5vmeXIWK3IY0gPaKSEqdWHBva3f2sahwAB0TwQ7KWxwW1zWxXOP1i4WiudlGW8i2dZdkv1Bja1vUzXz7NYRNTSA-FF0KQ3bLpd74uVpeDWxeTR0tNk_vih-DaPHP7ycQCyO0AKUDycmkPe2Hvs?purpose=inline)

6

```
HTTP Request
    │
Controller
    │
Service
    │
Redis
    │
Postgres
    │
External API
```

هر Span:

| Field     | Example  |
| --------- | -------- |
| span_id   | UUID     |
| parent_id | UUID     |
| operation | db.query |
| duration  | 82ms     |
| status    | ok       |

## Trace View

نمای Waterfall.

## Slow Query Detection

* SQL بیشتر از 200ms

* HTTP بیشتر از 1s

* Redis بیشتر از 50ms

Tag شود.

# Metrics Engine

![Should I run performance test as part of CI pipeline?](https://images.openai.com/static-rsc-4/5ShUFLpazMz3IQudGrxDZ97dMMUIkQv6GptVOb0h5U3wC3DlTaKSdF075FcGPvN8Lch_XsCYJBHY-b503x2bVlwxAHDd9hF1tgxIWm_M0C9MjKMqYbJy1mQaDAlyM1hDtHZKnjN-CEd6clcPHsG8WOkpLhh7y52tIwAfaUrgrEY?purpose=inline)

![nekuda | Agentic Commerce Infrastructure](https://images.openai.com/static-rsc-4/_b1l_1W1hZnBzfCPZKLAlG0bxQMmzeZNQVLF8FSqJlcpuMMPU4Bf8zbrFaMTHVnQzzotMENlqwmjTPOlTyysZ80H2B-gSYu_OprEeqolBrB4xcV4sbzzZwxNm2Rb2nEDadij872FGm53NWrkO-v31PeRAZ1BC9RQpy40hkVircw?purpose=inline)

![How to implement OpenTelemetry strategy | John Gathercole posted on the topic | LinkedIn](https://images.openai.com/static-rsc-4/PHHsQxjaHz-py_NIbvKJ0diFp_kn9hgnm4Luo02P3nyi_ERt91pKfH2aSjwu-shf3ih_n59GXZybYkxEeSKwrYdd9H7wzW5jBrYp5Dlslqtzbekb5YueDWrCzBuP3I0veRyXhTzDx5if62NSKjChIMf9HOdj-X5z1hzOTtW9j0M?purpose=inline)

6

سه نوع Metric:

| Type      | Example          |
| --------- | ---------------- |
| Counter   | Login Count      |
| Gauge     | Queue Depth      |
| Histogram | Request Duration |

# Alert Engine

![Features](https://images.openai.com/static-rsc-4/rjxbA_tWIJSOq1Oimi5aKwroNEAuuuo9YvKe1bJcD6xUfR4fouyOnf1Fvcw3i616AtRd4yetMyW9xjrJJ55OIz59i_blRu8xXtv--DlmsSP3Govbw2oJe2xffCMgCClmH2eDUJMLHSBRmsdBW2c7DwG_Mm2D8_jMiWTp6ZLYvx0?purpose=inline)

![Démocratisez les capacités d'automatisation de votre équipe grâce aux actions d'automatisation de PagerDuty| PagerDuty](https://images.openai.com/static-rsc-4/0KIYHGK_EXrimYlvJgqds19DaxsUI5uOJeoxqq3-AbFdWEQuJS89zFSD6DxfvIlYgsJEc2eBSQdlxd0cOb6CP6WLUWAArviKjFU4je7t0U3-Qn3nBvtvRIui-V0RrGpKDgTsOHezGU3huQQ1CkPc6F7eHYuQXatI_IGacBQpP4U?purpose=inline)

![Enterprise | Better Stack](https://images.openai.com/static-rsc-4/Rpf99amyARol5bGe1IUyW0EzRjGPGSIK3Y92H2QQQjtJdMAtd8Ngt85CdKNinCnDA-O9lz9DthCOtKKti0SfBxZBaJ8S6_EZJ5LA1LmxncCzTqEMJBZypcDFwHBNO8ipZwOsnZqc6bb1aVXAYPwjCdqr_1b4keAok86nZ63Ie9I?purpose=inline)

6

قابلیت‌ها:

| Rule             | Example              |
| ---------------- | -------------------- |
| Error Spike      | 100 Error / Minute   |
| New Issue        | اولین بار دیده شد.   |
| Regression       | Issue برگشت.         |
| Release Alert    | Error بعد Deploy.    |
| Metric Threshold | Latency بیشتر از 2s. |

Destination:

* Slack

* Discord

* Email

* Webhook

* Telegram

# Notification Deduplication

اگر 5000 Error آمد.

یک Alert.

Cooldown.

Grouping.

# Dashboard حرفه‌ای

![Error Monitoring Built for Developers | Sentry](https://images.openai.com/static-rsc-4/hmyBL9OFDXblH9sXfyEPO8IgvmwD4mAWBF5Q3TN6gCpCYasMfoGr6F1QHJDE4Gq9mRY98rI4vrPUFs3YKOyUICjGx8-Jeh25vVnArY8NHUF83drUCC9Kg-TjaZ26rjgM3EP3qlRd00EOd2ShH2bQuvs8jtbywtz0Rt47d-Xf2aM?purpose=inline)

![10 Log Analysis Tools in 2026 | Better Stack Community](https://images.openai.com/static-rsc-4/G9aQ1R3PWKOLATgwGClWrrjPPSchJEcXPrk2uWarElb5AMuPSvOjccd0vcXgU0Sr3Dxsr8HgQvrzQNlwZiy1syDQ7RW2ZRN4ybc3JysgnneaSk3BAFNwcT0XNo3qIa4DE4kYBCba-meUOsDG3xitAMgKnwwZl5mkDt4AaNJX8wg?purpose=inline)

![New Relic and Observability](https://images.openai.com/static-rsc-4/BqYKHfINTKynlHNbsKbofpqVm2AjqOKJTYEEUMH1ocDy7Y-JAT2XCPNl8vSDiS2KBgShY-ES9TFtLpbPsxppOzdeMwG1U-IaCW6d2VsgHdqIUfhxKZatMai4tvGOphJgDlh-I6WPCfBJRBK5aUlgXn9hPYGULSyxToMl18pOnfM?purpose=inline)

6

صفحه اول:

| Widget              | توضیح     |
| ------------------- | --------- |
| Errors Today        | Chart     |
| New Issues          | Count     |
| Resolved            | Count     |
| Crash Free Sessions | Gauge     |
| Top Services        | Bar Chart |
| Top Releases        | Table     |

# Issue Details Page

![GlitchTip vs. Sentry vs. Bugsink](https://images.openai.com/static-rsc-4/PK45W4x_i0TpRAtO4GKi8DXDMulwCsRfhXk2BULxoMuIDS0tn7NmcARF3lO-q9V0Hcub2cQaKq1V_jEFGybf9P3LsEEAFxImco9iktUK7pqMRiz2eLsL1bm5GYMYXmK9SlwvJEG2-ObW8p-BlDoW2JaDlsnBkyrNOnR-C2dQjlw?purpose=inline)

![How We Run Successful Beta Tests with Error Reporting | Sentry](https://images.openai.com/static-rsc-4/p-6FfLE5I6is2PpQbRbYeeIYjS3brdrrYKNgQV5zWMiVKCRtx6em3uuvj8oaFcWYlylSe6TfqFglnAVDEiyE0s6Xyoy_ksdQ4nHC7vCCDk6zzxTmvd0dO9AiZMwgrTjKN10B5T6KcpXUpqFLWM1rxVRTV-E_z-FNBWQPO9XuIcs?purpose=inline)

![Monitoring Critical E-commerce Experiences: Developer's Checklist | Sentry](https://images.openai.com/static-rsc-4/E_askHJK66fWM0vHKXsj56BdkQ3-0lIunDsu6B-_VvAPBRIoffGibkCIdoM58-pCR4XmyQRnhxiOfmSF597V_2FtprLEAsJOJF2VITBKPxoB4BxP2PI8bItn5D1o-yIhWl1jAOmXO_5cYKE60Pzp3MajwYL4sFJhn8ly5aT3nGk?purpose=inline)

7

بخش‌ها:

* Stack Trace

* Event Timeline

* Breadcrumbs

* User

* Request

* Tags

* Attachments

* Related Issues

* Trace

* Metrics

* Deploy Info

دقیقاً مشابه صفحه Issue Details در Sentry.

![](https://www.google.com/s2/favicons?domain=https://docs.sentry.io\&sz=32)

Sentry Documentation

# Analytics

![Building a Robust Metrics Monitoring & Alerting System | by Namrata | Jan, 2026 | Medium](https://images.openai.com/static-rsc-4/y6uEXxIRE5O2Qdvb3kg_0s_oY1kRMzS8P9M5fjoTgdJS9olBrlGl5FItLKhtGrFY3vcgY1SMAgbNLuedWF8sEB30W_AEZaOs8Pw0lxrMENKnSJ4q9IQtANNL2AyYZNq_KbxkYo4lUprWokGN-SHslVR3kxRNFSHCK_yhZRVyPEs?purpose=inline)

![Postman: The World's Leading API Platform | Sign Up for Free](https://images.openai.com/static-rsc-4/2_6VGuk1xEtWHKjyq3iuf6Rs7O8xAJfHX_tVfV9dJVRgaU88o5cg3loSuhBhe0KqRLcAxtahopdN_tus6xk1Vz_bH11HvKfoVEavMnpjXtB8xgumA-iHgnCScUbDZuOJVY-rGwhSYLeK400VVh3DVOXjO4FcGTogsQ2KUgPG-Ug?purpose=inline)

![New APM Capabilities Help Optimize Application Performance Across Monoliths or Microservices | Splunk](https://images.openai.com/static-rsc-4/FaU4l91RcVgyOR6O-lRVXYDhZ735FsNSHT3AXJDoctVXnauzojlJyncTCcuxFdVCWbbz_kZ7dlQAJiMWoTFUpbTMc3V46UnPdLl0nXG8X35YDwaoTcpk2DjvTXrKMo0rOY91WFQEkBGFTnrduDgMPw6jzFKywLVPQAzYMyI6RCI?purpose=inline)

6

گزارش‌ها:

* Error Trend.

* Top Exception.

* Top Endpoint.

* Top Browser.

* Top Country.

* Top User Impact.

# AI آماده برای آینده

حتی اگر AI نسازی.

Schema را آماده کن.

| Feature            | توضیح           |
| ------------------ | --------------- |
| Suspect Commit     | Commit احتمالی. |
| Root Cause Summary | خلاصه Error.    |
| Fix Suggestion     | پیشنهاد رفع.    |
| Issue Similarity   | Issueهای مشابه. |

Sentry این قابلیت را با Seer پیاده کرده است.

![](https://www.google.com/s2/favicons?domain=https://docs.sentry.io\&sz=32)

Sentry Documentation

# Security

باید از روز اول وجود داشته باشد.

| Feature       | شرح                   |
| ------------- | --------------------- |
| API Key       | Per Project           |
| DSN           | Public Identifier     |
| Secret Key    | Server Auth           |
| PII Scrubbing | Mask Sensitive Data   |
| Encryption    | AES برای Attachmentها |

# Performance Best Practices

![Kafka : The Highway System of Big Data | by Heril Mistry | DevlUp Labs | Mar, 2026 | Medium](https://images.openai.com/static-rsc-4/aN68Mq5UbfTI3Sc66NAZZmWr0S7f2e3caFg7igMlPz8_2jt9MUElrh8tncqjAY7D_evYWZbeQNy3vPwtQphAQzZEYtZHiOmhkEcMf441mklt_hRVMg7zULfWlJdOP3KqdS9ncOSPTuWPaHe3FKkIMf4J-a7-ZDw-GzcHr599LVM?purpose=inline)

![I tried building a distributed task queue from scratch—and quickly realized how fragile backend systems actually are.
At first, the idea seemed simple:
API → Redis Queue →… | Shafaathullah A.S](https://images.openai.com/static-rsc-4/j1RDdFoZnIn-89WLVc080B8MuR1Y9dyhhstqyTDHscSNuVWNYm_EcNRSHo71j9RrnJdPGfa5dTnIDNGPZeKi8N-9RRiM5A5ObNbVvoU9B7HFqhTWAJJxmbU2rSpxT5BFm_CoQEpNDYPH8Ty_7vk6QR2xVazGaElYq0Ole5JEEJU?purpose=inline)

![🚀 From Chaos to Kafka: How Event-Driven Systems Changed the Way We Move Data | by Arpit Srivastav | Medium](https://images.openai.com/static-rsc-4/b4V0mrve_ZHvpdhraD1O3Ymhv4e8XLUVqt1hxh3OS50dBgnctaiHvJEweWncugDPZeXyV4b_KldIc_SNxGZeZpkwLoeHnpEsnnDmw-gGV9oWsZyqCWJJtd6HnEg3pzYGUyhZxaZ1qaexmXr110fpcs_YfQMvFZz4gy50WlHxKIk?purpose=inline)

5

Pipeline:

```
SDK
 ↓
Memory Queue
 ↓
HTTP Batch
 ↓
Relay API
 ↓
Kafka / RabbitMQ
 ↓
Workers
 ↓
ClickHouse
 ↓
Postgres Metadata
```

چرا؟

* API سریع پاسخ می‌دهد.

* Worker Async.

* Backpressure.

* Retry.

## Batch ارسال Event

بد:

هر Error یک Request.

خوب:

20 Event

↓

یک HTTP Request.

## Compression

SDK:

gzip / zstd.

## Async Transport

Main Thread Block نشود.

# Multi Project / Multi Tenant

ساختار:

```
Organization
   ├── Project API
   ├── Project Frontend
   ├── Project Worker
```

هر Project:

* DSN

* Rate Limit

* Alert Rules

* Members

# SDK Plugins

Plugin Architecture.

| Plugin         | وظیفه             |
| -------------- | ----------------- |
| HTTP Plugin    | Auto Breadcrumb.  |
| Prisma Plugin  | SQL Span.         |
| Redis Plugin   | Cache Span.       |
| Express Plugin | Error Middleware. |
| Queue Plugin   | Job Tracking.     |

# قابلیت‌های Enterprise

| Feature          | اهمیت               |
| ---------------- | ------------------- |
| Issue Assignment | به Developer.       |
| Code Owners      | اتوماتیک Assign.    |
| Release Compare  | قبل/بعد Deploy.     |
| Audit Log        | چه کسی Resolve کرد. |
| Comments         | روی Issue.          |

# Retention Policy

| نوع داده     | Retention پیشنهادی |
| ------------ | ------------------ |
| Fatal Events | 365 روز            |
| Error Events | 180 روز            |
| Warning      | 90 روز             |
| Info         | 30 روز             |
| Debug        | 7 روز              |

ClickHouse TTL انجام می‌دهد.

# قابلیت‌های جستجوی حرفه‌ای

نمونه Query Language:

SQL

```
is:unresolved
level:error
release:2.4.*
user.email:test@test.com
service:payment
country:IR
first_seen:>7d
```

# معماری API

| Endpoint               | کاربرد        |
| ---------------------- | ------------- |
| POST /api/events       | ارسال Event.  |
| POST /api/envelope     | ارسال Batch.  |
| GET /issues            | لیست Issue.   |
| GET /issues/:id/events | تمام Eventها. |
| GET /metrics           | Dashboard.    |

Envelope API همان الگوی Sentry است.

![](https://www.google.com/s2/favicons?domain=https://getsentry-sentry.mintlify.app\&sz=32)

Sentry+1

# اولویت‌بندی قابلیت‌ها (Roadmap واقعی)

## Phase 1 — Core Logger (MVP)

SDK سبک با captureException / captureMessage

PostgreSQL + ClickHouse

Issue Grouping + Fingerprint

Breadcrumb Buffer

Tags / User / Release / Environment

Dashboard اولیه + Search + Alert Webhook

حجم تقریبی: ۲–۳ هفته توسعه.

## Phase 2 — Production Observability

Distributed Tracing

Performance Metrics

Session Tracking

Regression Detection

Release Health

Slack / Email Alerts

Source Maps / Symbolication

## Phase 3 — Enterprise

Multi Tenant

Code Owners

RBAC

AI Root Cause آماده

Custom Dashboards

OpenTelemetry Compatibility

# پیشنهاد معماری نهایی (Best Practice 2026)

این Stack تعادل بسیار خوبی بین سرعت، مقیاس‌پذیری و سادگی دارد:

| لایه               | تکنولوژی پیشنهادی                                                |
| ------------------ | ---------------------------------------------------------------- |
| SDK                | TypeScript با Plugin Architecture و Transport قابل تعویض.        |
| Gateway / Relay    | NestJS یا Fastify با Validation و Rate Limiting.                 |
| Queue              | Kafka (مقیاس بالا) یا RabbitMQ/NATS (سادگی بیشتر).               |
| Cache              | Redis برای Deduplication، Fingerprint Cache و Rate Limit.        |
| Events Storage     | ClickHouse (ستون‌محور، مناسب میلیاردها Event و Queryهای تحلیلی). |
| Metadata Storage   | PostgreSQL (Issues، Projects، Users، Alerts).                    |
| Object Storage     | MinIO یا S3 برای Attachments و Source Maps.                      |
| Realtime Dashboard | WebSocket یا Server-Sent Events.                                 |

### نتیجه این معماری

در عمل سیستمی خواهید داشت که تقریباً تمام قابلیت‌های اصلی Sentry را پوشش می‌دهد: Error Monitoring، Issue Grouping، Breadcrumbs، Release Tracking، Performance Tracing، Structured Logging، Metrics و Alerting، اما با معماری Self-hosted، ماژولار و سبک که می‌تواند از یک پروژه کوچک تا چندین Microservice با میلیون‌ها Event در روز مقیاس بگیرد.

![](https://www.google.com/s2/favicons?domain=https://getsentry-sentry.mintlify.app\&sz=32)

Sentry+2
