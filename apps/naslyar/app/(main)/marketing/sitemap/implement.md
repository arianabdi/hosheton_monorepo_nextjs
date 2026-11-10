اگر هدفت این است که **ماژول Sitemap داخل Admin Panel واقعاً در سطح Enterprise و مناسب 2026** باشد، من آن را صرفاً به شکل «یک لیست URL و دکمه Generate» طراحی نمی‌کنم.

بهتر است Sitemap را به‌عنوان یک **SEO Infrastructure Module** ببینی که تولید Sitemap، کنترل indexability، canonical، freshness، validation، monitoring و حتی IndexNow را مدیریت کند.

نکته مهم: Sitemap قرار نیست هر URL سیستم را نمایش دهد؛ باید عمدتاً **URLهای canonical و قابل index** را منتشر کند. Bing هم صراحتاً روی canonical بودن URLها، حذف redirect/deleted URLها و `lastmod` دقیق تأکید می‌کند. ([Search - Microsoft Bing][1])

## معماری پیشنهادی من

در Admin چیزی شبیه این داشته باش:

### 1. Overview / Dashboard

صفحه اول ماژول:

```text
Sitemap
────────────────────────────────────────────

Status
● Healthy

Last generated
2 minutes ago

Total URLs
1,284,921

Sitemap files
27

URLs added
+1,284 today

URLs updated
8,921 today

URLs removed
342 today

Warnings
3

Errors
0
```

و پایین‌تر:

```text
Sitemap Groups

✓ Pages                 42,891 URLs
✓ Products             824,192 URLs
✓ Categories            12,481 URLs
✓ Blog                  391,204 URLs
✓ Authors                1,284 URLs
✓ Images                 8,921 URLs
```

این Dashboard باید **health-oriented** باشد، نه صرفاً configuration-oriented.

---

# 2. Sitemap Types

به جای یک Sitemap بزرگ، مفهوم **Sitemap Group** داشته باش.

مثلاً:

```text
Sitemap Groups

Name          Type          URLs       Status
──────────────────────────────────────────────
Products      Dynamic       824K       Healthy
Categories    Dynamic        12K       Healthy
Blog          Dynamic       391K       Healthy
Pages         Dynamic        42K       Healthy
Images        Dynamic        8K        Warning
```

هر Group تنظیمات مستقل داشته باشد.

مثلاً:

### Products

```text
Enabled:             ON
Source:              Products
URL pattern:         /product/{slug}

Include:
[x] Indexable
[x] Canonical
[x] Published
[x] In stock
[x] Has description

Exclude:
[x] Draft
[x] Noindex
[x] Redirected
[x] Deleted
[x] Duplicate
```

البته **in stock بودن را به‌صورت پیش‌فرض شرط Sitemap نکن**؛ محصول out-of-stock ممکن است همچنان یک صفحه canonical/indexable و ارزشمند باشد. این باید business rule قابل تنظیم باشد.

---

# 3. URL Inclusion Rules

این قسمت به نظرم از مهم‌ترین بخش‌های ماژول است.

مثلاً:

```text
Include URL when:

✓ HTTP status = 200
✓ indexable = true
✓ canonical = self
✓ published = true
✓ URL is public

Exclude URL when:

☐ noindex
☐ canonical points elsewhere
☐ redirected
☐ 404
☐ 410
☐ draft
☐ private
☐ password protected
☐ duplicate
```

و مهم‌تر:

### Canonical Validation

سیستم باید قبل از publish کردن Sitemap بررسی کند:

```text
URL
↓
HTTP 200?
↓
Indexable?
↓
Canonical exists?
↓
Canonical == URL?
↓
Allowed in robots?
↓
Include in sitemap
```

اگر مثلاً:

```text
/product/iphone-15
```

دارای:

```html
<link rel="canonical" href="/product/iphone-15-pro">
```

باشد، نباید URL اول را در Sitemap قرار بدهی.

---

# 4. `lastmod` را جدی بگیر

این یکی از جاهایی است که خیلی از CMSها اشتباه می‌کنند.

نباید:

```text
lastmod = sitemap generation time
```

باشد.

باید واقعاً زمان آخرین تغییر meaningful content باشد. خود پروتکل Sitemap هم همین را مشخص می‌کند و Bing نیز روی آن تأکید کرده است. ([Sitemaps][2])

مثلاً:

```json
{
  "url": "/blog/seo-2026",
  "lastModified": "2026-09-19T14:32:11Z"
}
```

و در Admin:

```text
Last Modified Source

○ Database updated_at
○ Content updated_at
○ Published_at
○ Custom field
○ Custom resolver
```

حتی بهتر:

```text
lastmod strategy:

[ Content Change ]

Content changed:
✓ title
✓ body
✓ canonical
✓ important metadata

Ignore:
☐ internal analytics fields
☐ view counter
☐ cache timestamp
☐ admin notes
```

این برای سایت‌های بزرگ خیلی مهم است.

---

# 5. `changefreq` و `priority`

من این دو را در UI اصلی **Promote نمی‌کنم**.

چرا؟

چون در سیستم‌های مدرن ارزش عملی بسیار محدودی دارند و موتورهای جستجو الزاماً بر اساس آنها crawl نمی‌کنند. Bing نیز اعلام کرده که `changefreq` و `priority` را نادیده می‌گیرد. ([Bing Blogs][3])

اگر compatibility می‌خواهی:

```text
Advanced / Legacy

[ ] Generate changefreq
[ ] Generate priority
```

ولی default:

```text
OFF
```

---

# 6. Sitemap Index

برای سیستم Enterprise حتماً باید Sitemap Index داشته باشی.

مثلاً:

```text
/sitemap.xml

    ├── /sitemap-products-1.xml
    ├── /sitemap-products-2.xml
    ├── /sitemap-products-3.xml
    ├── /sitemap-categories.xml
    ├── /sitemap-pages.xml
    ├── /sitemap-blog-1.xml
    └── /sitemap-blog-2.xml
```

Sitemap protocol محدودیت **50,000 URL در هر Sitemap** و **50MB قبل از compression** دارد؛ Sitemap Index نیز برای شکستن مجموعه‌های بزرگ طراحی شده است. ([Sitemaps][2])

پس من configuration را این‌طور می‌گذارم:

```text
Max URLs per sitemap
[ 50,000 ]

Max uncompressed size
[ 50 MB ]

Compression
[x] GZIP
```

اما در عمل می‌توانی برای performance مثلاً 25k یا 40k URL را به‌عنوان threshold داخلی انتخاب کنی.

---

# 7. Sharding Strategy

برای سایت بزرگ خیلی مهم است.

دو روش:

### By entity

```text
products
categories
articles
pages
```

یا:

### By size

```text
products-001
products-002
products-003
```

من هر دو را پشتیبانی می‌کنم:

```text
Sharding strategy

○ By entity type
○ By URL count
○ By file size
○ Hybrid
```

و برای enterprise:

```text
Stable shard assignment
[x]
```

یعنی با اضافه شدن 1000 URL، همه URLهای قبلی بی‌دلیل بین فایل‌ها جابه‌جا نشوند.

---

# 8. Incremental / Dirty Sitemap Generation

اگر دیتابیس بزرگ است، هر بار نباید 5 میلیون رکورد را query کنی.

بهتر است:

```text
Content changed
       ↓
Mark sitemap group dirty
       ↓
Queue job
       ↓
Generate affected shard
       ↓
Update sitemap index
```

مثلاً:

```text
Event

product.updated
      ↓
SitemapService
      ↓
products sitemap marked dirty
      ↓
Queue
      ↓
regenerate shard
```

این architecture خیلی مهم‌تر از خود XML generation است.

---

# 9. Queue & Background Jobs

داخل Admin:

```text
Generation

Mode:
● Automatic
○ Manual

Queue:
Redis / RabbitMQ / SQS

Concurrency:
[ 4 ]

Batch size:
[ 5,000 ]

Timeout:
[ 120 sec ]

Retry:
[ 3 ]

Backoff:
[ Exponential ]
```

و Job history:

```text
Generation Jobs

Time         Group       URLs       Duration    Status
────────────────────────────────────────────────────
20:41        Products    824K       21.4s       ✓
20:38        Blog        391K       8.2s        ✓
20:31        Pages       42K        1.1s        ✓
```

---

# 10. Validation Engine

این را حتماً داشته باش.

یک دکمه:

**Run Sitemap Audit**

و نتیجه:

```text
Sitemap Audit

✓ Valid XML
✓ UTF-8
✓ URL count valid
✓ File size valid
✓ All URLs HTTPS
✓ All URLs return 200
✓ Canonicals match
✓ No noindex URLs
✓ No redirected URLs

⚠ 17 URLs have stale lastmod
⚠ 4 URLs have duplicate canonical
✕ 2 URLs return 404
```

حتی severity:

```text
Critical
Error
Warning
Info
```

---

# 11. URL Health

برای هر URL بتوانی ببینی:

```text
URL
/products/iphone-17

HTTP
200 OK

Indexable
YES

Canonical
SELF

Robots
Allowed

In Sitemap
YES

Lastmod
2026-09-19 14:32 UTC

Sitemap
products-17.xml
```

این debugging را فوق‌العاده ساده می‌کند.

---

# 12. Robots.txt Integration

داخل Sitemap Module:

```text
Robots.txt

Sitemap:
https://example.com/sitemap.xml

[x] Automatically add Sitemap directive
```

و ideally:

```text
Sitemap: https://example.com/sitemap.xml
```

Sitemap را همچنین می‌توان از طریق ابزارهای webmaster ثبت کرد؛ Bing هم قرار دادن Sitemap در `robots.txt` را برای discovery توصیه می‌کند. ([Bing Blogs][4])

---

# 13. IndexNow

اگر می‌خواهی واقعاً **2026-ready** باشد، یک Integration برای **IndexNow** بگذار.

مثلاً:

```text
IndexNow

Status
● Connected

API Key
••••••••••

Automatic submission
[x]

Submit when:

[x] URL created
[x] URL updated
[x] URL deleted
[x] URL restored

Batch size
100
```

Workflow:

```text
Product Updated
      ↓
Sitemap lastmod updated
      ↓
Sitemap shard regenerated
      ↓
IndexNow notification
      ↓
Search engine notified
```

Bing در راهنمای فعلی خودش IndexNow را برای URLهای اضافه‌شده، تغییرکرده و حذف‌شده توصیه می‌کند و Sitemap را برای پوشش کامل URLها در کنار آن قرار می‌دهد. ([Search - Microsoft Bing][1])

---

# 14. Image Sitemap / Video Sitemap / News

اگر سیستم شما این نوع محتوا دارد، Module باید extensible باشد:

```text
Sitemap Types

[x] Standard XML
[ ] Image
[ ] Video
[ ] News
```

ولی اینها را نباید بدون دلیل فعال کنی.

مثلاً برای Image:

```text
Image sitemap

Include:
✓ Primary image
✓ Gallery images

Exclude:
✓ Placeholder
✓ Tracking pixels
✓ Decorative images
```

---

# 15. Multilingual / hreflang

اگر سایت multilingual است، این بخش خیلی مهم می‌شود.

مثلاً:

```text
/en/product/iphone
/tr/product/iphone
/ar/product/iphone
```

و مدیریت:

```text
Language
en-US
tr-TR
fa-IR
ar-AE

Alternate URLs
✓ Validate
✓ Require reciprocal hreflang
```

سیستم باید بتواند خطاهایی مثل:

```text
fa → en exists
en → fa missing
```

را گزارش کند.

---

# 16. Multi-domain / Multi-tenant

اگر پنل شما SaaS یا Multi-tenant است، از اول این را در architecture لحاظ کن:

```text
Tenant
 ├── Domain
 ├── Sitemap
 ├── Robots
 ├── IndexNow
 └── Search Console integration
```

مثلاً:

```text
Tenant A
example.com/sitemap.xml

Tenant B
example.de/sitemap.xml

Tenant C
example.fr/sitemap.xml
```

هر domain باید Sitemap مستقل داشته باشد.

---

# 17. Cache / CDN

Sitemap را dynamic generate کنی ولی نباید هر request به DB برود.

Architecture:

```text
Request
  ↓
CDN
  ↓
Cached sitemap
  ↓
Origin only on cache miss
```

مثلاً:

```text
Cache-Control:
public, max-age=3600, s-maxage=86400
```

و هنگام تغییر:

```text
content update
   ↓
invalidate sitemap cache
```

---

# 18. Security

Sitemap عمومی است، بنابراین نباید هیچ اطلاعات خصوصی leak شود.

در Admin:

```text
Security Rules

✓ Exclude authenticated-only URLs
✓ Exclude admin URLs
✓ Exclude private content
✓ Exclude preview URLs
✓ Exclude temporary URLs
✓ Exclude signed URLs
✓ Exclude internal search URLs
✓ Exclude tracking URLs
```

---

# 19. URL Normalization

این را هم حتماً automated کن:

```text
HTTP → HTTPS
www vs non-www
trailing slash
duplicate query params
URL encoding
Unicode normalization
lowercase rules
```

مثلاً اینها نباید سه URL متفاوت تلقی شوند:

```text
/product/iphone
/product/iphone?utm_source=x
/product/iphone?utm_source=y
```

Sitemap باید URL canonical را بدهد، نه tracking variants.

---

# 20. Monitoring

یک سیستم بزرگ فقط Sitemap تولید نمی‌کند؛ **آن را monitor می‌کند.**

مثلاً:

```text
Monitoring

Sitemap availability
✓

Generation failures
0

HTTP errors
2

404 URLs
2

5xx URLs
0

Canonical mismatches
4

Noindex URLs
0

Stale lastmod
17

URL count change
+2.4%
```

حتی Alert:

```text
Alert if:

☑ Sitemap returns non-200
☑ URL count drops > 20%
☑ Error count > 0
☑ Generation fails
☑ Canonical mismatch > threshold
☑ Sitemap hasn't regenerated for X hours
```

---

# 21. Search Engine Submission

در Admin:

```text
Search Engines

Google
✓ Sitemap configured

Bing
✓ Sitemap configured
✓ IndexNow enabled

Yandex
○ Not configured
```

ولی من **Search Console API را optional integration** می‌گذارم، نه core dependency.

---

# 22. Audit Log

برای Enterprise:

```text
Audit Log

20:42
Admin changed:
Products sitemap → Include unpublished = OFF

20:31
System:
Generated products-17.xml

20:20
System:
Removed 341 deleted URLs

19:51
Admin:
Enabled IndexNow
```

این در production خیلی ارزشمند است.

---

# 23. Configuration پیشنهادی نهایی

اگر بخواهم configuration schema طراحی کنم، تقریباً چیزی در این سطح:

```yaml
sitemap:
  enabled: true

  index:
    enabled: true
    path: /sitemap.xml

  generation:
    mode: automatic
    strategy: incremental
    queue: true
    batch_size: 5000
    concurrency: 4

  limits:
    max_urls_per_file: 50000
    max_size_mb: 50
    compression: gzip

  url_rules:
    require_https: true
    require_200: true
    require_indexable: true
    require_canonical: true
    require_self_canonical: true
    exclude_redirects: true
    exclude_noindex: true
    exclude_deleted: true
    exclude_private: true

  lastmod:
    enabled: true
    source: content_updated_at
    ignore_sitemap_generation_time: true

  advanced:
    changefreq: false
    priority: false

  robots:
    enabled: true
    auto_publish_sitemap: true

  indexnow:
    enabled: true
    on_create: true
    on_update: true
    on_delete: true

  validation:
    enabled: true
    http_check: true
    canonical_check: true
    robots_check: true

  monitoring:
    enabled: true
    alert_on_generation_failure: true
    alert_on_url_drop_percent: 20
```

---

# 24. چیزی که من برای UI پنل پیشنهاد می‌کنم

ساختار نهایی:

```text
SEO
│
├── Sitemap
│   ├── Overview
│   ├── Sitemaps
│   ├── Groups
│   ├── URL Rules
│   ├── Generation
│   ├── Validation
│   ├── Monitoring
│   ├── IndexNow
│   └── Settings
│
├── Robots.txt
├── Redirects
├── Canonicals
├── Structured Data
└── SEO Audit
```

و **Sitemap > Overview** باید تقریباً شبیه یک monitoring dashboard باشد، نه یک CRUD ساده.

---

## یک نکته خیلی مهم

اگر واقعاً می‌خواهی این را در سطح شرکت‌های بزرگ بسازی، من **Sitemap را مستقیماً به Controller/Database Query وصل نمی‌کنم**.

Architecture بهتر:

```text
                 ┌──────────────┐
                 │   Content    │
                 │   Services   │
                 └──────┬───────┘
                        │
                        ▼
                 ┌──────────────┐
                 │ URL Eligibility│
                 │    Engine     │
                 └──────┬───────┘
                        │
             ┌──────────┴──────────┐
             ▼                     ▼
      ┌─────────────┐       ┌─────────────┐
      │ URL Registry│       │ Event Queue │
      └──────┬──────┘       └──────┬──────┘
             │                     │
             └──────────┬──────────┘
                        ▼
                 ┌──────────────┐
                 │ Sitemap      │
                 │ Generator    │
                 └──────┬───────┘
                        ▼
                 ┌──────────────┐
                 │ Sitemap      │
                 │ Index / XML  │
                 └──────┬───────┘
                        │
             ┌──────────┼──────────┐
             ▼          ▼          ▼
           CDN       Robots     IndexNow
```

**نقطه کلیدی این معماری `URL Eligibility Engine` است.**

چون بعداً همین Engine می‌تواند منبع truth برای اینها باشد:

```text
Sitemap
Canonical
Robots
SEO Audit
IndexNow
Internal Linking
```

و در نتیجه پنج سیستم مختلف، پنج تعریف متفاوت از «URL قابل ایندکس» نخواهند داشت.

در ضمن، استاندارد Sitemap همچنان XML و `lastmod` دقیق را پشتیبانی می‌کند و برای سایت‌های بزرگ Sitemap Index راهکار استاندارد scaling است. ([Sitemaps][2])

اگر بخواهی، قدم بعدی می‌توانم **خود دیتابیس/schema + APIها + UI کامل این Sitemap Module را هم به شکل یک specification فنی Production-ready** طراحی کنم؛ مثلاً دقیقاً بگویم چه جدول‌هایی مثل `sitemap_groups`, `sitemap_entries`, `sitemap_runs`, `sitemap_issues` داشته باشی و هر endpoint چه کاری انجام دهد.

[1]: https://www.bing.com/webmasters/help/bing-webmaster-guidelines-30fba23a?utm_source=chatgpt.com "Webmaster Guidelines - Bing Webmaster Tools"
[2]: https://www.sitemaps.org/protocol.html?utm_source=chatgpt.com "sitemaps.org - Protocol"
[3]: https://blogs.bing.com/webmaster/July-2025/Keeping-Content-Discoverable-with-Sitemaps-in-AI-Powered-Search?utm_source=chatgpt.com "Keeping Content Discoverable with Sitemaps in AI Powered Search..."
[4]: https://blogs.bing.com/webmaster/June-2025/Start-Using-Bing-Webmaster-Tools-to-Improve-Your-Site-Visibility?utm_source=chatgpt.com "Start Using Bing Webmaster Tools to Improve Your Site Visibility |..."
