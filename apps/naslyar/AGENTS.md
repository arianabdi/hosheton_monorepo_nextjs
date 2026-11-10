<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# naslyar — قرارداد ماژول‌های پنل ادمین

هر ماژول جدید (و هر صفحهٔ فهرست / افزودن / ویرایش) باید از این الگو ساخته شود. کپی ظاهر و ساختار را از نمونه‌های موجود بگیر؛ فرم شلوغ و بدون آموزش نساز.

## نمونه‌های مرجع (اول این‌ها را بخوان)

| موضوع | مسیر |
| --- | --- |
| الگوی اصلی فرم + آموزش فهرست | `app/(main)/management/hr/` — مخصوصاً `employees/page.tsx`, `employees/new/page.tsx`, `components/EmployeesGuide.tsx` |
| ماژول چندصفحه‌ای کامل | `app/(main)/marketing/banners/` |
| فلو/فرم پیچیده‌تر | `app/(main)/campaigns/` |
| پایش + جزئیات مشکل | `app/(main)/error-tracking/` |

استایل مشترک:

- `app/(main)/marketing/Marketing.module.scss` → `guideContainer`, `guideHeader`, `guideGrid`, `guideCard`, `formCard`, `formSectionTitle`, `field`, `formActions`, `header`, `primaryBtn`, `secondaryBtn`
- `app/(main)/management/hr/Hr.module.scss` → `employeesGuideIntro`, `employeesGuideExample`, `employeesGuideNote`, `formGuideCard`, `formRow`, `fieldHint`, `fieldHintBlock`, `formNoteBox`

## ۱) صفحهٔ فهرست

همیشه بعد از هدر (و در صورت نیاز ناوبری تب‌های همان ماژول) یک **بخش آموزش همیشه ‌نمایان** باشد — نه آکاردئون، نه یک پاراگراف خاکستری ته صفحه.

ساختار آموزش (مثل `EmployeesGuide`):

1. هدر راهنما: آیکون + عنوان «آموزش …» + نشان «راهنمای ادمین»
2. مقدمهٔ کوتاه: این صفحه **چه کاری** می‌کند و چه چیزی **نیست**
3. گرید کارت: پیش‌نیازها، ترتیب کار، معنی وضعیت‌ها، اشتباهات رایج
4. بلوک «مثال عملی» با سناریوی واقعی محصول
5. بلوک «نکته» برای محدودیت/هشدار

قوانین فهرست:

- دکمهٔ افزودن در هدر باشد (`primaryBtn`)
- empty state لینک به صفحهٔ افزودن داشته باشد
- سلول‌های جدول `data-label` داشته باشند
- آموزش کاربردی باشد (قدم، مثال، لینک به صفحات مرتبط) نه تکرار مستند API

## ۲) صفحهٔ افزودن و ویرایش

صفحات فرم **تمرکز روی یک کار** دارند. ناوبری تب‌های ماژول را روی فرم نگذار.

ترتیب صفحه (اجباری):

1. **هدر:** عنوان (`افزودن …` / `ویرایش …`) + زیرعنوان یک‌خطی + لینک «بازگشت به فهرست»
2. **`formGuideCard`:** ۲–۴ جمله قبل از ثبت؛ لینک به پیش‌نیازها
3. **`formCard`:** فیلدها در بخش‌های `formSectionTitle` (هویت، اتصال، زمان‌بندی، …)
4. هر فیلد: `label` + کنترل + **`fieldHint` فارسی و کاربردی**
5. در صورت نیاز `formNoteBox` برای وضعیت بعد از ذخیره
6. اکشن‌ها: ثبت + انصراف (`formActions`)

قوانین فرم:

- فیلدها را در یک گرید شلوغ بدون توضیح نچین
- برای راهنمای عادی از `fieldHint` استفاده کن؛ رنگ هشدار نارنجی مخصوص خطا/قفل است
- به‌جای `window.location` از `useRouter` / `Link` استفاده کن
- استایل اینلاین برای input/select نگذار؛ از کلاس‌های ماژول استفاده کن
- انتخاب چندتایی (جایگاه، تگ، …) کارت/چیپ خوانا باشد نه checkbox نامرتب
- مودال تنظیمات (مثل نود کمپین) همان قانون hint زیر فیلد را دارد

## ۳) تب‌ها

تب باید **متن ساده با زیرخط** باشد — مثل ناوبری بنرها — نه دکمه، نه pill، نه chip رنگی.

- ناوبری بخش‌های یک ماژول (چند صفحه): `SimpleLineNav` یا `sectionNav` / `sectionNavLink` مثل `marketing/banners/components/BannerSectionNav.tsx`
- فیلتر وضعیت داخل همان صفحه: `SimpleLineTabs` (`app/components/SimpleLineTabs`)
- روی فرم افزودن/ویرایش تب ماژول نگذار

مرجع استایل: `Banners.module.scss` → `.sectionNav` و `SimpleLineTabs.module.scss`

### منویی که چند تب دارد و هر تب یک صفحه (مسیر) است — شل ثابت

اگر هر تب صفحهٔ خودش را دارد (`/module`، `/module/issues`، …) **هرگز** هدر و ناوبری تب را داخل هر `page.tsx` تکرار نکن؛ وگرنه `PageTransition` (کلید = pathname) با هر کلیک کل صفحه را ری‌مانت و انیمیت می‌کند و دادهٔ صفحه از نو با اسپینر بار می‌شود («ری‌رندر با کلیک روی تب»).

ساختار اجباری:

```
app/(main)/<module>/
  layout.tsx              ← Provider ماژول: دادهٔ مشترک (تنظیمات، فهرست پروژه‌ها…) + کش دادهٔ تب‌ها
  lib/<Module>Provider.tsx
  (tabs)/layout.tsx       ← شل: Container/هدر ماژول + SimpleLineNav/sectionNav + <div className={outlet}>{children}</div>
  (tabs)/page.tsx         ← تب اول
  (tabs)/<tab>/page.tsx   ← بقیهٔ تب‌ها (بدون container، بدون هدر h1، بدون ناوبری)
  <entity>/new/page.tsx   ← فرم‌ها و صفحهٔ جزئیات بیرون از (tabs) و بدون تب
```

1. مسیر پایهٔ ماژول را به `PERSISTENT_SHELL_BASES` در `app/config/page-shells.ts` اضافه کن — بدون این، شل هم ری‌مانت می‌شود.
2. هر تب به‌جای هدر، یک خط معرفی + اکشن‌های همان تب دارد (`SectionIntro` سایت‌مپ / `TabIntro` پایش خطا).
3. دادهٔ مشترک (مثل فهرست پروژه‌ها برای select فیلتر) فقط یک‌بار در Provider خوانده شود، نه در هر تب.
4. دادهٔ هر تب در کش Provider بنشیند (`useSitemapData` / `useCachedState`): برگشت به تب، دادهٔ قبلی را **فوراً** نشان می‌دهد و پشت صحنه تازه می‌کند. `LoadingState` تمام‌صفحه فقط وقتی هیچ دادهٔ قبلی نیست (`loading && !data`).
5. بعد از ذخیره در فرم‌های بیرون از (tabs) دادهٔ مشترک را invalidate کن (مثلاً `reloadProjects()` قبل از `router.push`).

مرجع: `marketing/sitemap/` (`layout.tsx` + `lib/SitemapProvider.tsx` + `(tabs)/layout.tsx`) و `error-tracking/` (`lib/ErrorTrackingProvider.tsx` + `(tabs)/layout.tsx` + `components/TabIntro.tsx`).

## ۴) جدول‌ها — صفحه‌بندی، فیلتر، مرتب‌سازی و راهنما

هر جدول فهرستی (هر چیزی که ممکن است از یک صفحه بیشتر شود) این چهار را **با هم** دارد؛ جدولِ بی‌صفحه‌بندی/بی‌فیلتر/بی‌مرتب‌سازی تحویل نده.

| نیاز | ابزار |
| --- | --- |
| state جدول (صفحه، تعداد، sort، dir، جستجو، فیلترها) در URL | `useUrlTableState(prefix, { sort, dir, limit, filters })` در `app/hooks/useUrlTableState.ts` — چند جدول در یک صفحه با prefix جدا (`'ap_'`، `'ev_'`) |
| صفحه‌بندی | `Pagination` از `@my-workspace/components` با `table.limit` / `table.page` / `table.setLimit` / `table.setPage` و `rowsPerPageOptions` |
| مرتب‌سازی | `SortHeader` (`app/components/SortHeader`) روی ستون‌های عددی/زمانی/نام — `onSort={table.toggleSort}`؛ برای ستون متنی `toggleSort(f, 'asc')` |
| جستجو | `TableSearch` (`app/components/TableSearch`) — debounce + Enter + ✕ |
| فیلتر enum | `select` با کلاس ماژول در نوار ابزار بالای جدول + `table.setFilter(name, value)` |

قوانین:

- **سمت سرور:** endpoint باید `page`، `limit` (سقف ۱۰۰)، `sort` (فقط از whitelist)، `dir=asc|desc`، `search` و فیلترها را بگیرد و `{ rows|items, totalItems, page, limit }` برگرداند. صفحه‌بندی/مرتب‌سازی سمت کلاینت روی دادهٔ کامل فقط برای فهرست‌های کوچک ثابت (زیر ۵۰ ردیف) مجاز است.
- مرتب‌سازی پیش‌فرض «مهم‌ترین اول» باشد (بیشترین رویداد، جدیدترین، …) نه ترتیب درج.
- هر تغییر فیلتر/جستجو/sort صفحه را به ۱ برمی‌گرداند (`useUrlTableState` خودش انجام می‌دهد). فیلترهای سطح صفحه (پروژه، بازهٔ زمانی) صفحهٔ همهٔ جدول‌ها را ریست کنند.
- **راهنمای هر جدول:** زیر عنوان دو خط کوتاه — «به چه درد می‌خورد؟» و «چطور استفاده کنم؟» (قدم بعدی بعد از دیدن عدد). برای ستون‌هایی که معنی‌شان واضح نیست `hint` روی `SortHeader` بگذار.
- ردیف‌ها قابل اقدام باشند: لینک به جزئیات یا فهرست فیلترشده (مثل culprit → `/error-tracking/issues?q=…`)؛ صفحهٔ مقصد فیلتر اولیه را از URL بخواند.
- انواع مختلف داده را در یک جدول قاطی نکن (محیط + سرور + صفحه)؛ با `SimpleLineTabs` بالای همان جدول جابه‌جا کن.
- نوار ابزار: جستجو + فیلترها + شمارندهٔ «N مورد»؛ empty state متفاوت برای «هیچ داده‌ای نیست» و «با این فیلتر چیزی نیست» + دکمهٔ «حذف فیلترها».
- هنگام تازه‌سازی، ردیف‌های قبلی کم‌رنگ بمانند (`tableLoading`)؛ جدول را با اسپینر جایگزین نکن.
- تاریخ‌ها نسبی («۵ دقیقه پیش») با تاریخ کامل در `title`؛ اعداد با `toFarsiNumber`.
- **عملیات هر ردیف فقط در منوی «⋯» (خیلی مهم):** آخرین ستون با سرستون «عملیات» فقط `HrRowActionMenu` (`app/(main)/management/hr/components/HrRowActionMenu.tsx`) دارد — ویرایش، ثبت مجدد، رفتن به صفحهٔ مرتبط، و حذف آخر با `danger: true` + `ConfirmDialog`. دکمه‌های کنار هم یا لینک «ویرایش» داخل سلول ممنوع است؛ کاری که برای آن ردیف مجاز نیست در منو نیاید. مرجع: `app/(main)/(hosheton)/(blogger)/zernio-keys/page.tsx`. قانون کامل: `AGENTS.md` ریشهٔ monorepo، بخش «عملیات هر ردیف».

مرجع کامل: `app/(main)/error-tracking/(tabs)/coverage/page.tsx` (چهار جدول با prefix جدا) و `app/(main)/(hosheton)/(core)/ai-usage/page.tsx`.

## ۵) کپی و زبان

- متن UI فارسی، کوتاه، برای ادمین غیر فنی
- مثال‌ها از خود محصول باشند (استودیو، کیف پول، سفارش، کارتابل) نه lorem
- وضعیت‌ها را معنی کن (پیش‌نویس / فعال / متوقف) نه فقط ترجمهٔ enum

## ۶) چک‌لیست قبل از تمام شدن ماژول جدید

- [ ] هر فهرست راهنمای کامل Employees-style دارد
- [ ] هر افزودن/ویرایش: هدر + راهنمای قبل از ثبت + کارت فرم بخش‌بندی‌شده + hint فیلد
- [ ] empty state با لینک
- [ ] جدول با `data-label`
- [ ] الگوی کد از HR / بنر / کمپین کپی شده، نه از فرم قدیمی شلوغ
- [ ] تب‌ها زیرخط‌دار (`SimpleLineTabs` / `SimpleLineNav` / `sectionNav`) هستند نه دکمه/pill
- [ ] منوی چندتبی: شل `(tabs)/layout.tsx` + Provider + ثبت در `PERSISTENT_SHELL_BASES` (کلیک تب = بدون ری‌مانت هدر)
- [ ] هر جدول: صفحه‌بندی سمت سرور + جستجو/فیلتر + `SortHeader` + state در URL + راهنمای «به چه درد می‌خورد / چطور استفاده کنم»
- [ ] عملیات هر ردیف فقط در منوی «⋯» (`HrRowActionMenu`) در ستون «عملیات»؛ حذف آخر، قرمز و با `ConfirmDialog`

## ۷) مستندات داخل پنل — فقط `DocLayout`

هر آموزش/مستند فنی پنل (نه آموزش کوتاه بالای جدول‌ها که بخش ۱ است) با کامپوننت مشترک `app/components/DocLayout/DocLayout.tsx` ساخته می‌شود — مثل سایت‌های مستندات (NestJS و…): **فهرست عناوین سمت راست (sticky، scroll-spy)** و مقاله کنارش؛ در عرض کم فهرست بالای مقاله بازشونده است (نه مودال، نه تب).

| کامپوننت | کار |
| --- | --- |
| `DocPage` | شل صفحه: عنوان، توضیح یک‌خطی، لینک برگشت (داخل Container/Wrapper) |
| `DocLayout` | مقاله + فهرست عناوین؛ ورودی `sections: DocSection[]` (`id`، `title`، `headings` زیرعنوان‌ها، `body`) |
| `DocH3` | زیرعنوان داخل بخش — `id` آن باید در `headings` همان بخش هم باشد تا در فهرست بیاید |
| `Callout` (`note/tip/warn/danger`)، `Code`، `CodeBlock`، `DocTable`، `DocSteps`، `DocFaq` | اجزای متن با ظاهر یکسان |
| `DocTopicIndex` + `DocPager` | مستند چندبخشی: صفحهٔ موضوعات گروه‌بندی‌شده و قبلی/بعدی در هر موضوع |

دو الگو:

1. **مستند یک‌صفحه‌ای** (موضوع کوچک‌تر): یک `page.tsx` با `DocPage` + `DocLayout`. مرجع: `app/(main)/files/storage-docs/page.tsx` (راهنمای استوریج).
2. **مستند چندبخشی** (موضوع بزرگ): `<module>/docs/topics.tsx` (آرایهٔ `DocTopic` + `sections` هر موضوع) + `<module>/docs/page.tsx` با `DocTopicIndex` + `<module>/docs/[topic]/page.tsx` با `DocLayout` و `DocPager`. مرجع: `app/(main)/error-tracking/docs/` (مستندات پایش خطا).

قواعد:

- محتوا فارسی، دقیق و مطابق کد فعلی (اعداد، مسیرها، نام endpointها را از کد بردار). کد/مسیر داخل `Code`/`CodeBlock`؛ **کامنت داخل CodeBlock انگلیسی** (فونت monospace حروف فارسی را جدا نشان می‌دهد).
- مستند ماژول مشترک (پایش خطا، استوریج، …) نباید آن را مخصوص یک اپ نشان دهد؛ مثال‌های اختصاصی اپ‌ها در موضوع جدای «یکپارچه‌سازی‌های فعلی».
- صفحهٔ مستند را در `config/navigation.ts` (زیرمنوی ماژول + عنوان مسیر) ثبت کن و از صفحهٔ تنظیمات/آموزش ماژول به آن لینک بده.
- با تغییر رفتار ماژول، مستندش را در همان تغییر به‌روز کن.

مستندهای موجود:

| مستند | مسیر پنل | کد مرجع |
| --- | --- | --- |
| استوریج فایل‌ها (اتصال، پشتیبان‌ها، آپلود، انتقال امن، بکاپ/بازگردانی) | `/files/storage-docs` | `my-workspace-api/libs/core/src/file/storage/` |
| پایش خطا (اتصال اپ‌ها، Scope، درخواست بیرونی، پنل، مرجع) | `/error-tracking/docs` | `my-workspace-api/libs/core/src/error-tracking/` |
| اشتراک (مفاهیم، راهنمای ادمین، اتصال اپ، افزودن محدودیت، مرجع API) | `/subscription/docs` | `my-workspace-api/libs/core/src/subscription/` |
