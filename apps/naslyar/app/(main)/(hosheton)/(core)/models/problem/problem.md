من یک پلتفرم هوش مصنوعی دارم که توش تمام مدل های تولید عکس و ویدیو رو جمع آوری کردم . قبلا توی ادمین اش برای اضافه کردن هر مدل اول provider اشو اضافه میکردم (مثلا openai) و بعد مدل اشو مثلا (gpt-image-2) ولی الان که مثلا fal.ai رو به عنوان provider اضافه کردم و برای کار با gpt-image--2 حالت های مختلف داره مثل image-to-image یا text-to-image که هرکدوم ساختار خودشونو داره .



به نظرت من این قابلت رو چجوری اضافه کنم که سیستم ام با حالات قبلی پابرجا بمونه و این حالت هم ساپورت بکنه؟

بهترین الگوی معماری برای حل این مسئله بدون شکستن سیستم قبلی، اضافه کردن لایه قابلیت/حالت (Mode / Task Layer) یا Endpoint Variants بین مدل و نحوه اجرای درخواست است.

در ساختار قبلی رابطه به صورت Provider -> Model بود. با ارتقای این ساختار به Provider -> Model -> ModelMode مشکل حل می‌شود.

۱. ساختار دیتابیس (Data Model)
ساختار مدل‌ها را تفکیک کنید تا هر مدل بتواند چند حالت داشته باشد:

Provider: اطلاعات کلی سرویس‌دهنده (مانند Fal.ai, OpenAI).

Model: نام پایه مدل (مانند gpt-image-2, flux-pro).

ModelMode (جدول/کالکشن جدید):

id

model_id (ارتباط با مدل والد)

mode_type: نوع عملیات (مانند text-to-image, image-to-image, inpainting)

endpoint_path: مسار اختصاصی API در آن Provider (مثلاً fal-ai/flux-pro/image-to-image)

input_schema: ساختار پارامترهای ورودی این حالت به صورت JSON

is_default: یک فلگ Boolean برای مشخص کردن حالت اصلی

۲. حفظ سازگاری با سیستم قبلی (Backward Compatibility)
برای اینکه درخواست‌های قدیمی بدون تغییر کار کنند:

داده‌های موجود (Data Migration): یک اسکریپت بنویسید که برای تمام مدل‌های فعلی شما، یک رکورد در ModelMode با mode_type: 'text-to-image' و is_default: true ایجاد کند.

Fallback منطقی در بک‌اند: در APIهایی که از سمت فرانت یا کاربران فراخوانی می‌شوند، ارسال پارامتر mode را اختیاری (Optional) کنید. اگر کلاینت mode را ارسال نکرد، بک‌اند به صورت خودکار حالتی که is_default: true است را اجرا می‌کند.

۳. مدیریت ورودی‌های متفاوت با Dynamic Schema
چون حالت image-to-image به عکس ورودی و پارامترهایی مثل strength نیاز دارد اما text-to-image فقط prompt می‌خواهد، فرم‌های ورودی در پنل ادمین و کلاینت باید پویا باشند. ساختار input_schema را در دیتابیس ذخیره کنید:

JSON
{
"mode_type": "image-to-image",
"endpoint_path": "fal-ai/flux-pro/image-to-image",
"schema": {
"prompt": { "type": "string", "required": true },
"image_url": { "type": "file", "required": true },
"strength": { "type": "number", "default": 0.8, "min": 0, "max": 1 }
}
}
فرانت‌اند با خواندن این Schema، فرم ورودی مربوط به هر حالت را به صورت Dynamic رندر می‌کند.

۴. لایه اجرا در بک‌اند (Adapter Pattern)
در بک‌اند، Handler هر Provider بر اساس mode_type ورودی، DTO متناسب با آن Endpoint را می‌سازد:

درخواست رسید: (provider: 'fal.ai', model: 'flux-pro', mode: 'image-to-image', payload: {...})

پردازش: آداپتور Fal.ai با توجه به mode انتخاب‌شده، payload را به مسیر endpoint_path مربوطه ارسال می‌کند.

می‌خواهی نمونه کد TypeScript برای آداپتور Providerها و مدیریت Dynamic Schema بنویسم؟

Yes
فقط من میخوام وقتی کاربرم به نود (تولید عکس) یک input اضافه میکنه عکس ورودی این خودش متوجه بشه و سوییچ بکنه روی image-to-image. این حالت رو میتونه پشتیبانی بکنمه؟

بله، این معماری دقیقاً برای همین نوع هوشمندسازی طراحی شده و می‌توان آن را هم در فرانت‌اند (Node UI) و هم در بک‌اند (Smart Router) پیاده‌سازی کرد.

۱. نحوه کار در بک‌اند (Payload-based Auto Routing)
اگر فرانت‌اند به هر دلیلی mode را به صورت مستقیم ارسال نکند یا فقط Payload ورودی را بفرستد، بک‌اند می‌تواند بر اساس کلیدهای موجود در درخواست، حالت (Mode) مناسب را به صورت هوشمند تشخیص دهد.

برای این کار، به ساختار ModelMode در دیتابیس یک فیلد تحت عنوان trigger_inputs یا detect_rules اضافه کنید:

JSON
[
{
"mode_type": "text-to-image",
"is_default": true,
"required_fields": ["prompt"]
},
{
"mode_type": "image-to-image",
"is_default": false,
"required_fields": ["prompt", "image_url"]
},
{
"mode_type": "inpainting",
"is_default": false,
"required_fields": ["prompt", "image_url", "mask_url"]
}
]
منطق تشخیص (Mode Resolver):
وقتی درخواستی به بک‌اند می‌رسد، بک‌اند ورودی‌ها را بررسی کرده و منطق زیر را اجرا می‌کند:

TypeScript
function resolveModelMode(modelModes: ModelMode[], payload: Record<string, any>): ModelMode {
// اگر کاربر صریحاً mode را فرستاده بود، همان را برگردان
if (payload.mode) {
return modelModes.find(m => m.mode_type === payload.mode) || getDefaultMode(modelModes);
}

// بر اساس ورودی‌های موجود، حالت مناسب را پیدا کن
// اول حالت‌های خاص‌تر (مثل inpainting یا image-to-image) بررسی می‌شوند
if (payload.image_url && payload.mask_url) {
return modelModes.find(m => m.mode_type === 'inpainting') || getDefaultMode(modelModes);
}

if (payload.image_url) {
return modelModes.find(m => m.mode_type === 'image-to-image') || getDefaultMode(modelModes);
}

// در غیر این صورت، حالت پیش‌فرض (text-to-image) انتخاب می‌شود
return getDefaultMode(modelModes);
}
۲. نحوه کار در فرانت‌اند (رابط کاربری نودی)
در Canvas یا ادیتور نودی (مانند React Flow)، نود تولید تصویر باید رفتار واکنشی (Reactive) داشته باشد:

بررسی اتصال ورودی‌ها (Sockets/Inputs):
وقتی کاربر یک Edge به سوکت ورودی عکس وصل می‌کند یا یک فایل در نود آپلود می‌کند، وضعیت داخلی نود (node.data) تغییر می‌کند.

سوییچ اتوماتیک حالت (Auto-Switch):
با متصل شدن سوکت عکس، activeMode روی نود به صورت خودکار از text-to-image به image-to-image تغییر می‌کند.

به‌روزرسانی اسکیما و فیلدهای نود:
با تغییر activeMode به image-to-image:

فیلدهای جدید مربوط به این حالت (مانند Denoising Strength یا Image Weight) روی نود ظاهر می‌شوند.

مسیر Endpoint اجرایی برای آن نود به‌روزرسانی می‌شود.

سناریوی نمونه برای کاربر:
حالت اول (بدون ورودی عکس):
کاربر نود gpt-image-2 را قرار می‌دهد. فقط یک ورودی متنی (prompt) دارد
←
سیستم روی text-to-image کار می‌کند.

حالت دوم (افزودن عکس):
کاربر ورودی عکس را به نود وصل می‌کند
←
فرانت‌اند صریحاً فیلد mode: 'image-to-image' را فعال می‌کند، فیلد strength به فرم اضافه می‌شود و بک‌اند درخواست را به Endpoint اختصاصی image-to-image هدایت می‌کند.

می‌خواهی نحوه پیاده‌سازی این منطق سوییچ هوشمند را در فرانت‌اند (React Flow یا نودها) بررسی کنیم؟