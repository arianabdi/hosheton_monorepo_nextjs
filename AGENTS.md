# قواعد مشترک همه اپ‌های این monorepo

این قواعد برای همه پروژه‌های `apps/*` و پکیج‌های `packages/*` معتبر است (هر اپ می‌تواند AGENTS.md اختصاصی هم داشته باشد).

## مودال‌ها، دیالوگ‌ها و BottomSheet — فقط `ModalHelper`

برای **هر** مودال، دیالوگ، پنجره تأیید، کشوی جزئیات یا BottomSheet از کامپوننت مشترک `ModalHelper` در پکیج `@my-workspace/components` استفاده کن. این کامپوننت هم نسخه وب (مودال وسط صفحه) و هم نسخه موبایل (BottomSheet با Vaul، زیر ۵۷۶px) را خودش مدیریت می‌کند.

- ❌ مودال اختصاصی با `createPortal`، overlay دستی، `position: fixed` یا کتابخانه دیگر (MUI Dialog، reactstrap Modal، react-modal و...) نساز.
- ❌ برای مودال، Escape، قفل اسکرول body یا دکمه بستن کد جداگانه ننویس؛ `ModalHelper` همه را دارد.
- ✅ محتوای مودال را به‌صورت یک کامپوننت ساده (بدون overlay و کادر) بساز و به `component` بده.

```tsx
import { ModalHelper, ModalHeader, ModalBody, ModalFooter } from '@my-workspace/components';

<ModalHelper
  open={open}
  onClose={() => setOpen(false)}
  size="md"                 // sm=300 | md=500 | lg=800 | xl=1140 (پیش‌فرض md)
  sheetTitle="عنوان مودال"  // عنوان BottomSheet موبایل و aria-label
  component={open ? <MyDialogContent onDone={() => setOpen(false)} /> : null}
/>
```

نکته‌ها:
- برای اینکه state محتوا با هر بار باز شدن از نو ساخته شود، محتوا را فقط وقتی `open` است بساز (`open ? <Content/> : null`) یا به آن `key` بده.
- دکمه بستن (✕) را خود `ModalHelper` می‌گذارد (گوشه چپ در RTL)؛ در هدر محتوا حدود ۶۰px فاصله برایش خالی بگذار یا با `hideCloseBtn` حذفش کن.
- کادر دسکتاپ `max-height: 90vh` دارد؛ برای محتوای بلند از `ModalBody` (اسکرول داخلی) یا یک wrapper با `overflow-y: auto` استفاده کن.
- برای popup کوچک کنار یک المان: `type="popup"` و `targetElement` (المان HTML یا رویداد کلیک).
- برای همیشه BottomSheet (حتی در دسکتاپ): `forceSheet`.
- پاپ‌اورهای پورتال‌شده داخل مودال (dropdown، date picker) را با `data-modal-popover` علامت بزن تا کلیک رویشان مودال را نبندد.
- `closeOnOverlayClick={false}` / `closeOnEsc={false}` برای فرم‌هایی که نباید تصادفی بسته شوند.

مستندات کامل: `packages/components/src/modal-helper/README.md`

**استثنا — پنجره‌های تمام‌صفحه‌ی مرور رسانه:** گالری استودیو (`hosheton_studio/app/(developers)/gallery/GalleryModal.tsx`) و جزئیات قالب explore (`ExploreDetailModal`) عمداً `ModalHelper` نیستند؛ پنجره‌ی تمام‌صفحه (`position: fixed; inset: 0`) هستند تا اندازه از فریم اول ثابت باشد و با بارگذاری عکس‌ها نپرد. پنجره‌ی مرور رسانه‌ی جدید هم همین الگو را بگیرد، با `ModalCloseButton` در هدر.

### دکمه بستن (✕) — فقط `ModalCloseButton`

همه‌ی دکمه‌های بستن مودال/شیت/popup/پنل یک شکل دارند: **مربع با گوشه گرد (نه دایره)**، آیکون SVG (نه کاراکتر `✕`/`×`)، پس‌زمینه نامحسوس. `ModalHelper` خودش از همین استفاده می‌کند.

- ❌ دکمه بستن دستی نساز (`<button>✕</button>`، `<LuX/>`، `<IoClose/>`، `border-radius: 50%`/`999px`).
- ✅ اگر با `hideCloseBtn` هدر/نوار ابزار اختصاصی می‌سازی، همین را بگذار:

```tsx
import { ModalCloseButton } from '@my-workspace/components';

<ModalCloseButton placement="inline" onClick={onClose} aria-label={tc('close')} />
// placement="floating" (پیش‌فرض) = گوشه بالای مودال، جهت‌دار (چپ در RTL)
// size="sm" برای popup و نوارهای فشرده
```

- دکمه‌های آیکونی کنار آن در همان نوار (دانلود، حذف، …) هم مربع گوشه‌گرد هم‌اندازه باشند تا ردیف یکدست بماند.
- دکمه ✕ را **حذف نکن** — هر جا ✕ هست (حتی پنجره‌های تأیید که «انصراف» دارند) همین کامپوننت باشد. `hideCloseBtn` فقط وقتی است که خودت `ModalCloseButton` را در هدر اختصاصی می‌گذاری (یا BottomSheet/منویی که از اول ✕ نداشته).
- هدر محتوای مودال باید جای ✕ شناور را خالی بگذارد: `padding-inline-end: 44px` (✕ در RTL سمت چپ است).
- ظاهر را فقط داخل `packages/components/src/modal-helper/components/modalCloseButton` عوض کن، نه با override در اپ‌ها.

## عملیات هر ردیف — فقط منوی «⋯» (خیلی مهم، همه اپ‌ها)

هر جا روی یک ردیف/آیتم (جدول، فهرست، کارت) «عملیاتی» هست — ویرایش، حذف، ثبت مجدد، کپی، فعال/غیرفعال، رفتن به صفحهٔ مرتبط — **همه** داخل **یک دکمهٔ «⋯»** در آخرین ستون با سرستون «عملیات» قرار می‌گیرند. این قانون استثنا ندارد و در هر صفحهٔ جدید یا تغییر صفحهٔ قدیمی رعایت می‌شود.

- ❌ ردیف دکمه‌های کنار هم در سلول (ویرایش | حذف | ثبت …)، آیکون‌های تکی عملیات، لینک «ویرایش» جدا داخل سلول.
- ✅ ستون «عملیات»: کم‌عرض، فقط دکمهٔ ⋯ (`aria-label` = «عملیات …»)؛ منو به body پورتال شود، با Escape و کلیک بیرون بسته شود، در نمای کارتی موبایل هم همان ⋯.
- آیتم‌ها: متن کوتاه فعل‌محور؛ کار مخرب (حذف/لغو) **آخر و قرمز** (`danger`)؛ کاری که برای آن ردیف مجاز نیست نمایش داده نشود؛ هر کار برگشت‌ناپذیر بعد از کلیک با `ConfirmDialog` / `ModalHelper` تأیید شود (نه `window.confirm`).
- کامپوننت: در naslyar `HrRowActionMenu` (`apps/naslyar/app/(main)/management/hr/components/HrRowActionMenu.tsx`)؛ در اپ‌های دیگر منوی ⋯ خود همان اپ، و اگر ندارد یک‌بار همین الگو را در `components` اپ بساز (نه یک نسخه برای هر صفحه).
- مستثنا فقط: دکمهٔ اصلی صفحه در هدر (مثل «افزودن …») و دکمه‌های فرم (ثبت / انصراف). لینک عنوان ردیف به صفحهٔ جزئیات «ناوبری» است و می‌ماند، ولی جای عملیات نیست.

## صفحه‌بندی — فقط `Pagination`

برای هر فهرست صفحه‌بندی‌شده از `Pagination` در `@my-workspace/components` استفاده کن؛ کامپوننت صفحه‌بندی محلی/کپی‌شده نساز.

```tsx
import { Pagination } from '@my-workspace/components';

<Pagination
  rtl
  itemPerPage={limit}
  currentPage={page}
  totalItems={total}
  setRowsPerPage={setLimit}      // خودش بعد از تغییر، paginate(1) را صدا می‌زند
  paginate={setPage}
  rowsPerPageOptions={[10, 25, 50]}  // اختیاری
/>
```

- نام propها `paginate` و `setRowsPerPage` است (نه `onPaginate` / `onSetRowsPerPage`).
- تم هر اپ فقط با متغیرهای CSS: `--pagination-active-bg`، `--pagination-active-text`، `--pagination-hover-bg`، `--pagination-border`، `--pagination-surface` (کلاس‌های داخلی کامپوننت را با سلکتور override نکن).

## جدول‌ها — صفحه‌بندی، فیلتر و مرتب‌سازی (همه اپ‌ها)

هر جدول فهرستی که ممکن است از یک صفحه بیشتر شود باید **هر سه** را داشته باشد؛ جدولی که فقط ۱۵ ردیف اول را بی‌فیلتر و بی‌مرتب‌سازی نشان می‌دهد قابل تحویل نیست.

1. **صفحه‌بندی سمت سرور** با `Pagination` (بخش بالا). API: `page`، `limit` (سقف ۱۰۰) → `{ rows|items, totalItems, page, limit }`.
2. **فیلتر/جستجو** در نوار ابزار بالای جدول: یک جستجوی متنی (debounce + Enter) + select برای فیلترهای enum + شمارندهٔ «N مورد». فیلترها سمت سرور اعمال شوند.
3. **مرتب‌سازی** با کلیک روی سرستون (`aria-sort` + آیکون جهت)؛ سرور فقط فیلدهای whitelist را بپذیرد. پیش‌فرض: مهم‌ترین اول (بیشترین/جدیدترین)، نه ترتیب درج.

قوانین مشترک:

- state جدول (صفحه، تعداد، sort، dir، جستجو، فیلترها) در **URL** باشد تا لینک قابل اشتراک بماند و با بازگشت مرورگر/عوض‌کردن تب از بین نرود؛ هر تغییر فیلتر/جستجو/sort صفحه را به ۱ برگرداند.
- بالای هر جدول دو خط راهنما: «به چه درد می‌خورد؟» و «چطور استفاده کنم؟» (بعد از دیدن این عدد چه کار کنم). ستون مبهم = `title` توضیحی.
- empty state جدا برای «داده‌ای نیست» و «با این فیلتر چیزی نیست» (+ دکمهٔ حذف فیلترها).
- موقع تازه‌سازی ردیف‌های قبلی کم‌رنگ بمانند؛ جدول را با اسپینر تمام‌صفحه عوض نکن.
- انواع مختلف داده را در یک جدول قاطی نکن؛ با تب زیرخط‌دار بالای جدول جابه‌جا کن.
- سلول‌ها `data-label` داشته باشند (نمای کارتی موبایل).

پیاده‌سازی آماده در naslyar (برای اپ‌های دیگر همین الگو را کپی کن): `useUrlTableState` (`apps/naslyar/app/hooks`)، `SortHeader` و `TableSearch` (`apps/naslyar/app/components`)؛ مرجع کامل: `apps/naslyar/app/(main)/error-tracking/(tabs)/coverage/page.tsx` و بخش ۴ `apps/naslyar/AGENTS.md`.

## منوی چندتبی که هر تب یک صفحه است (همه اپ‌ها)

هدر و ناوبری تب‌ها را **در هر `page.tsx` تکرار نکن**؛ در `layout.tsx` یک route group مشترک (`<module>/(tabs)/layout.tsx`) بگذار تا با کلیک روی تب فقط محتوای تب عوض شود و هدر/ناوبری/دادهٔ مشترک ری‌مانت نشوند. دادهٔ مشترک (فهرست انتخاب‌گرها، تنظیمات) در Provider همان `layout` یک‌بار خوانده شود و دادهٔ هر تب کش شود تا برگشت به تب بدون اسپینر باشد. فرم‌ها و صفحهٔ جزئیات بیرون از `(tabs)` و بدون تب.

در naslyar اگر `PageTransition` با کلید pathname صفحه را انیمیت می‌کند، مسیر پایهٔ ماژول را به `apps/naslyar/app/config/page-shells.ts` اضافه کن؛ جزئیات و مرجع: بخش ۳ `apps/naslyar/AGENTS.md` (`marketing/sitemap`، `error-tracking`).

## مستندات داخل پنل ادمین (naslyar)

مستند فنی ماژول‌های مشترک داخل خود پنل naslyar است و قبل از تغییر هر کدام از این ماژول‌ها خوانده/به‌روز شود:

- استوریج فایل‌ها: `/files/storage-docs` — `apps/naslyar/app/(main)/files/storage-docs/page.tsx`
- پایش خطا: `/error-tracking/docs` — `apps/naslyar/app/(main)/error-tracking/docs/topics.tsx`
- اشتراک (پلن، سقف، مصرف، صفحه قیمت‌ها): `/subscription/docs` — `apps/naslyar/app/(main)/subscription/docs/topics.tsx`. در فرانت از `useEntitlements` / `readSubscriptionDenial` / `PlanUsagePanel` (`@my-workspace/components`) استفاده کن؛ صفحه قیمت‌ها نمونه: `apps/taskvision/app/(main)/pricing/` (`pricing.config.ts` + `README.md`).

مستند جدید با کامپوننت مشترک `apps/naslyar/app/components/DocLayout` ساخته می‌شود (یک‌صفحه‌ای یا چندبخشی با صفحهٔ موضوعات) — جزئیات: بخش ۷ `apps/naslyar/AGENTS.md`.

## محتوا و دسته‌بندی سئو (همه اپ‌ها)

بلاگ، مستندات/آموزش و دسته‌بندی‌ها ماژول‌های **مشترک** هسته‌اند (`my-workspace-api/libs/core/src/{blog,docs,category,sitemap}`) و محتوایشان برای هر اپ از naslyar > «محتوا» نوشته می‌شود؛ هیچ‌کدام را مخصوص یک اپ پیاده نکن. هر اپ فقط صفحه‌های عمومی را با همین قرارداد می‌سازد.

**قرارداد URL (ثابت؛ سایت‌مپ و breadcrumbها به آن وابسته‌اند):**

| صفحه | مسیر | API عمومی |
| --- | --- | --- |
| خانهٔ بلاگ / دسته / مقاله | `/blog` · `/blog/<cat>/<sub>` · `/blog/<cat>/<sub>/<post>` | `GET api/blog/public/resolve?path=&page=&limit=` → `type: root \| category \| post` |
| مستندات و آموزش | `/docs` · `/docs/<موضوع>` · `/docs/<موضوع>/<صفحه>` | `api/docs/public/{landing, category/:slug, page/:cat/:page}` |
| صفحه‌های حقوقی (قوانین، حریم خصوصی) | `/legal/terms` · `/legal/privacy` (آدرس قدیمی `/terms`، `/privacy` → ریدایرکت دائمی) | `GET api/blog/public/system/:key` — پست بلاگ قفل‌شده با `systemKey` (بی‌دسته، حذف‌نشدنی؛ seed: `my-workspace-api/scripts/seed-legal-posts.mjs`) |
| قالب‌های اکسپلور (استودیو) | `/explore/<tag>/<sub-tag>` · `/explore/<tag>/<slug>` (بی‌تگ: `/explore/<slug>`) | `GET api/studio/marketplace/template-tags` (درخت «دسته‌بندی تگ‌ها») + `explore?categoryPath=a/b` |

- محتوای دسته‌دار **زیر زنجیرهٔ کامل slug دسته‌هایش** است؛ صفحهٔ هر دسته محتوای خودش و همهٔ زیرشاخه‌ها را نشان می‌دهد. زنجیره را از درخت (`path` هر نود در `api/categories/public/tree`) بساز، نه با حدس.
- هر آدرس یک نسخهٔ canonical دارد؛ آدرس قدیمی/بدون دسته با `permanentRedirect` به canonical برود (نمونه: `hosheton_studio/app/(marketplace)/explore/[...path]/page.tsx`).
- section هر درخت جداست: `post` (بلاگ)، `docs`، `marketplace` (موضوع‌های تخت = فقط فیلتر، بدون URL)، `product`. slug در هر section یکتاست.
- طبقه‌بندی محتوای اختصاصی یک اپ که خودش درخت دارد (مثل «دسته‌بندی تگ‌ها»ی قالب‌های استودیو) **دوباره در core ساخته نمی‌شود**؛ همان طبقه‌بندی با helperهای درخت core (`buildCategoryTree` …) دستهٔ سئو می‌شود. قبل از ساختن طبقه‌بندی جدید، طبقه‌بندی موجود اپ را پیدا کن.
- هر صفحهٔ دسته: `generateMetadata` با `metaTitle`/`metaDescription` دسته (fallback: نام/توضیح)، `canonical`، `robots: noindex` اگر `noindex`، H1 = نام دسته، متن معرفی (`content`)، breadcrumb قابل‌کلیک + JSON-LD (`BreadcrumbList`، و `CollectionPage`/`BlogPosting`/`TechArticle` بسته به صفحه)، و لینک واقعی (`<Link href>`) به زیردسته‌ها و محتوا تا خزنده دنبال کند.
- صفحه‌های عمومی سئو server component باشند و داده را با `fetch(..., { next: { revalidate: 60 } })` بخوانند (نه فقط کلاینت).
- پنل: دسته‌های core هر بخش فقط با کامپوننت مشترک `apps/naslyar/app/(main)/components/content-categories/` (`ContentCategoryList`، `ContentCategoryForm`) مدیریت شوند؛ بخش جدید = یک ورودی در `CONTENT_CATEGORY_SECTIONS`. تگ‌های قالب استودیو: naslyar › زیرساخت › دسته‌بندی تگ‌ها (`projects/marketplace/tag-categories`).
- سایت‌مپ: گروه هر نوع محتوا با الگوی همین مسیرها (`{categoryPath}`، `{categoryPath?}` اختیاری، `{categorySlug}`، `{slug}`) در naslyar > بازاریابی > سایت‌مپ؛ اپ جدید پیش‌فرض‌ها را با `SitemapModule.register({ seed })` می‌دهد. با افزودن مسیر عمومی جدید، `staticPages` و گروه سایت‌مپ را هم به‌روز کن.
