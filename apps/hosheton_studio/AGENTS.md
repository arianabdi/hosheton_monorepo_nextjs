<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# hosheton_studio

## تب‌های افقی در موبایل

اگر ردیف تب در عرض کم جا نشود، **اسکرول افقی** بده — نه شکستن به خط بعد، نه مخفی کردن تب.

الزامات:

- `flex-wrap: nowrap` + `overflow-x: auto` + `-webkit-overflow-scrolling: touch`
- اسکرول‌بار را مخفی کن (`scrollbar-width: none` و `::-webkit-scrollbar { display: none }`)
- وقتی محتوا از لبه بیرون می‌زند، **هاله تیره** روی همان لبه نشان بده تا معلوم باشد اسکرول دارد
- هاله فقط سمتی باشد که هنوز محتوا دارد (با `scroll` / `ResizeObserver` و مقایسهٔ `getBoundingClientRect` اولین و آخرین تب — RTL را در نظر بگیر)
- گرادیان هاله: از تیره به شفاف، مخلوط با `--body-background` تا در تم روشن و تیره دیده شود

مرجع: `app/(marketplace)/creators/[creatorId]/page.tsx` و `CreatorProfile.module.scss` → `.tabScroller` / `.tabRow` / `.fadeStart` / `.fadeEnd`

## نمایش خطا — فقط `app/lib/errors`

کاربر فقط پیام‌های **خود هوشتون** را می‌بیند؛ نام ارائه‌دهنده (Atlas، fal، OpenAI، Kling و…)، HTTP status، stack، URL و متن خام API هرگز نمایش داده نمی‌شود. متن خام با همهٔ جزئیات در پایش خطا ثبت می‌شود (naslyar > پایش خطا؛ سمت API: `StudioErrorReporterService` برای خطاهای worker تولید، `errorHelper` برای خطاهای HTTP).

| نیاز | ابزار |
| --- | --- |
| خطا در UI (کارت، تایل، پاپ‌آپ، لاگ) | `<HoshetonError error={raw} kind="generation">{(e) => <span className={…}>{e.message}</span>}</HoshetonError>` — headless؛ هیچ استایل/DOM اضافه ندارد |
| همان در hook | `const e = useHoshetonError(raw, { kind })` → `{ code, title, message, retryable, action }` |
| toast | `notifyError(err)` / `notifyError(err, { fallback: t('save_error') })` — جای `ErrorToaster` |
| رشته خارج از React | `getHoshetonErrorMessage(err, { fallback })` (همین داخل `getApiErrorMessage` است) |
| قطع اینترنت / سرور در دسترس نیست | خودکار: بنر بالای صفحه (`app/lib/errors/status`) — toast نمی‌شود و با برگشت اتصال خودش بسته می‌شود |

### بنر وضعیت سراسری (`app/lib/errors/status`)

خطاهایی که مال یک درخواست نیستند (آفلاین، نرسیدن به سرور، 502/503/504 دروازه) **یک بنر** بالای صفحه می‌شوند، نه toastهای پشت‌سرهم.

- `notifyError(err)` خودش تشخیص می‌دهد (`detectStatusIssue`)؛ اول `/api/health` (API استودیو) را چک می‌کند — قطعی واقعی = بنر، خطای تکی = همان toast عادی. پس خطا را **خام** بده: `notifyError(err, { fallback })`، نه `notifyError({ message: getApiErrorMessage(err) })`.
- هر `axios.create` جدید را با `attachStatusInterceptors` بپیچ (`createApiClient` خودش دارد): پاسخ موفق بنر را می‌بندد، قطعی حتی در درخواست بی‌صدا بنر را باز می‌کند.
- بازیابی: چک دوره‌ای با فاصلهٔ افزایشی + رویداد online/برگشت به تب + هر پاسخ موفق API + دکمهٔ «تلاش دوباره». بعد از بازیابی «اتصال برقرار شد» کوتاه نمایش داده می‌شود.
- صفحه‌ای که در قطعی داده‌اش بار نشد: `useStatusRecovery(() => reload())`. اسکرول بی‌نهایت بعد از خطا متوقف شود و با همین hook ادامه دهد (نمونه: `ExploreMasonry`) — وگرنه حلقهٔ درخواست می‌سازد.
- مشکل جدید: ورودی در `STATUS_ISSUES` (`issues.ts`) + متن `errors.status_banner.<id>` در ۱۰ زبان + تشخیص در `detect.ts` (یا `reportStatusIssue('<id>')`).
- toastهای خطای عادی هم با پیام یکسان روی هم جمع می‌شوند (یک toast به ازای هر پیام).

قوانین:

- ❌ `ErrorToaster` از `@my-workspace/utils`، `toast.error(err.message)`، `{err.message}`، `{run.errorMessage}` یا `{data.runError}` را مستقیم رندر نکن.
- `kind="generation"` برای خطای اجرای گره/چت/worker (متن آزاد هرگز عیناً نشان داده نمی‌شود)؛ پیش‌فرض `request` برای خطای API و خطای ساخته‌شده در کد (پیام تمیز خود API همان نمایش داده می‌شود).
- متن خود فرانت (اعتبارسنجی فرم) را مستقیم بده: `notifyError({ message: t('name_required') })`.
- خطای خام را در state نگه دار و موقع نمایش resolve کن (با عوض‌شدن زبان دوباره ترجمه می‌شود).
- پیام جدید = کلید جدید در namespace `errors` هر ۱۰ زبان (`app/lib/i18n/locales/*.json`) + کد در `hoshetonErrors.ts`؛ دسته‌بندی متن خام هم همان‌جاست.
- کپی خطا (دکمه copy) هم فقط پیام هوشتون را کپی کند.

## عملیات هر ردیف — فقط منوی «⋯» (خیلی مهم)

هر جا روی یک ردیف/آیتم (جدول، فهرست، کارت) عملیاتی هست — ویرایش، حذف، ثبت مجدد، کپی، فعال/غیرفعال، رفتن به صفحهٔ مرتبط — همه داخل **یک دکمهٔ «⋯»** در آخرین ستون با سرستون «عملیات» باشد؛ ردیف دکمه‌های کنار هم یا لینک «ویرایش» داخل سلول ممنوع است. کار مخرب آخر و قرمز، و برگشت‌ناپذیرها با دیالوگ تأیید (`ModalHelper`). کاری که برای آن ردیف مجاز نیست در منو نیاید. فقط دکمهٔ اصلی هدر («افزودن …») و دکمه‌های فرم (ثبت / انصراف) مستثنا هستند. اگر این اپ منوی ⋯ مشترک ندارد، یک‌بار در `components` اپ بساز (الگو: `apps/naslyar/app/(main)/management/hr/components/HrRowActionMenu.tsx`). قانون کامل: `AGENTS.md` ریشهٔ monorepo، بخش «عملیات هر ردیف».

## اکسپلور: موضوع در برابر دستهٔ سئو، بلاگ و آموزش

- **موضوع** (`categoryIds`، section=`marketplace`): چیپ‌های بالای اکسپلور، فقط فیلتر داخل صفحه، بدون URL.
- **دستهٔ سئو = «دسته‌بندی تگ‌ها»** (`tags` قالب؛ naslyar › زیرساخت › دسته‌بندی تگ‌ها): هر تگ صفحهٔ فرود `/explore/<tag>` دارد (slug = key با خط تیره، زیرتگ با `parentKey`: `/explore/<tag>/<sub>`) و آدرس قالب زیر **اولین تگش** است: `/explore/<tag>/<slug>`. طبقه‌بندی جدیدی برای قالب نساز. قرارداد و resolver: `app/(marketplace)/lib/explore-taxonomy.ts`؛ لینک قالب فقط با `templateDetailPath(item)`؛ نام تگ در UI با `useCategoryName` (ترجمهٔ `templateTags`)، در HTML سرور/سئو `node.name` فارسی؛ انتخابگر: `ExploreCategoryPicker`.
- `explore/[...path]` هم صفحهٔ دسته است هم جزئیات قالب؛ مودال رهگیری‌شده (`@modal/(.)explore/[...path]`) برای مسیر دسته `null` برمی‌گرداند و گرید دسته را از pathname می‌خواند.
- بلاگ و آموزش عمومی: `app/(blog)/blog` و `app/(blog)/docs` (سرور کامپوننت، داده از `app/(marketplace)/lib/content-api.ts`)؛ محتوا از naslyar > محتوا.
  - layout جدا **بدون سایدبار اصلی** (`app/(blog)/layout.tsx` + `_content/ContentHeader`)، محدودهٔ وسط‌چین به سبک blog2: پست ویژه + «تازه‌ها» + گرید (`_content/ContentParts`). لینک ورود به این بخش فقط در منوی پروفایل است، نه سایدبار.
  - صفحهٔ آموزش مثل مستندات: درخت آموزش‌های موضوع | متن | «در این صفحه» (`DocsToc`: پرش نرم به عنوان + هایلایت عنوان فعلی)؛ در موبایل هر دو بازشوی بالای متن.
  - کاور آموزش = فیلد `image` صفحهٔ docs (مسیر/URL)؛ کاور مقاله = فایل `image`/`thumbnail` بلاگ.
  - قوانین و حریم خصوصی: `app/(blog)/legal/[key]` به سبک مقاله و بدون سایدبار، فقط پست‌های قفل‌شدهٔ بلاگ (`systemKey`) را باز می‌کند. مسیرها فقط با `legalHref` (`app/lib/legal-pages.ts`)؛ در صفحه‌های auth با `openLegalPageInNewTab` در تب جدید. صفحهٔ قوانین داخل authFrame نساز.

## «زاویه و نور» (Angle Studio) — تغییر زاویهٔ دوربین و نور یک عکس

ابزار سه‌بعدی (کره + چرخش/شیب/زوم + نور اصلی) که یک عکس را از زاویه یا با نور دیگر دوباره می‌سازد؛ هر «نما» یک خروجی است (تا ۱۲، با «۱۲ زاویهٔ برتر»).

- **یک مود در کاتالوگ مودها** (`id: angle-studio`، `constraints.tool`)؛ رکورد پیش‌فرضش در کد API است (`libs/hosheton_core/src/ai/angle-studio`) و تا ادمین در naslyar ذخیره‌اش نکند در دیتابیس نوشته نمی‌شود. پریست‌های ۱۲ زاویه و نور در `constraints` همان مود. سازگاری با مدل = مود اجرایی `image-to-image` (همان `checkAiModeCompatibility`). نمایش در چت با بخش `angles` در naslyar › مودها › تنظیمات.
- **state** در `settings.angleStudio` (چت) یا `node.data.angleStudio` (نود textToImage) — `lib/angle-studio.ts` (کپی محدوده‌ها/قراردادهای API؛ یکی بمانند). `resolvedShots` = نماهای نهایی برای قیمت/اجرا؛ سرور چت از constraints دوباره می‌سازد.
- **UI مشترک**: `components/AngleStudio/` — `AngleStudioPanel` (پنل)، `AngleSphere` (کره)، `AngleStudioDialog` (ModalHelper با پیش‌نمایش)، `AngleStudioNodeSettings` (سایدبار نود). چیپ چت در `CompactChatToolbar` (`showAngles`)، نود با میان‌بر جعبه‌ابزار (همان `textToImage` با ابزار روشن). کنترل جدا نساز؛ همین‌ها را گسترش بده.
- **قیمت**: تعداد = نماها، طول پرامپت = متن کاربر + `ANGLE_STUDIO_PROMPT_LENGTH`، بدون تنظیمات چندتصویری (`applyAngleEstimate` / `chatEstimateRequest`) — دقیقاً همان `quoteChatTurn` سرور؛ هر تغییر هر دو طرف.
- **اجرا**: worker برای هر نما یک درخواست ویرایش جدا با پرامپت JSON همان نما (`buildAngleStudioPrompt`) می‌فرستد، ۳ تا هم‌زمان، عکس مرجع یک بار آماده می‌شود؛ مبلغ قفل‌شدهٔ چت بین نماها تقسیم می‌شود و نمای ناموفق کسر نمی‌شود. مدلی که زاویه را عددی می‌گیرد: کلیدهای `cameraAzimuth`/`cameraElevation`/`cameraZoom` (و `light*`) در اسکیمای تنظیمات همان مدل برای هر نما پر می‌شوند.
