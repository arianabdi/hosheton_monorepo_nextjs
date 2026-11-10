export type GuideKey = 'overview' | 'dashboard' | 'projects' | 'issues' | 'issueDetail' | 'releases' | 'alerts' | 'sdk' | 'integration';

export interface GuideSection {
    heading?: string;
    paragraphs?: string[];
    bullets?: string[];
    table?: { headers: string[]; rows: string[][] };
    code?: string;
    codeCaption?: string;
}

export interface GuideContent {
    key: GuideKey;
    title: string;
    intro: string;
    sections: GuideSection[];
}

const SDK_SNIPPET = `// اتصال اپلیکیشن به پایش خطا — اسنیپت سبک بدون وابستگی
const ETR = {
  url: 'http://localhost:4077/api/error-tracking/store',
  key: 'کلید-عمومی-پروژه',
  breadcrumbs: [], user: {}, tags: {}, release: '', environment: 'production',

  addBreadcrumb(category, message, data = {}) {
    this.breadcrumbs.push({ timestamp: new Date().toISOString(), category, level: 'info', message, data });
    if (this.breadcrumbs.length > 100) this.breadcrumbs.shift();
  },

  capture(error, level = 'error') {
    const e = error instanceof Error ? error : new Error(String(error));
    return fetch(this.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-etr-key': this.key },
      body: JSON.stringify({
        event_id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        level,
        exception: {
          type: e.name,
          value: e.message,
          stacktrace: (e.stack || '').split('\\n').slice(1, 30).map((line) => ({ function: line.trim() })),
        },
        user: this.user, tags: this.tags, breadcrumbs: this.breadcrumbs,
        release: this.release, environment: this.environment,
      }),
    }).catch(() => {});
  },
};

// ثبت خطاهای مدیریت‌نشده در مرورگر
window.addEventListener('error', (event) => ETR.capture(event.error));
window.addEventListener('unhandledrejection', (event) => ETR.capture(event.reason));`;

export const ERROR_TRACKING_GUIDES: Record<GuideKey, GuideContent> = {
    overview: {
        key: 'overview',
        title: 'پایش خطا چیست و چگونه کار می‌کند؟',
        intro: 'پلتفرم پایش خطا، تمام خطاهای اپلیکیشن‌های شما را به‌صورت متمرکز دریافت، گروه‌بندی و تحلیل می‌کند؛ مشابه Sentry اما Self-hosted و سبک. به‌جای مرور هزاران لاگ پراکنده، هر خطای مشابه به یک «مشکل» تبدیل می‌شود و شما فقط موارد واقعاً مهم را می‌بینید.',
        sections: [
            {
                heading: 'جریان کار سیستم',
                paragraphs: [
                    'اپلیکیشن شما (فرانت‌اند یا بک‌اند) هنگام وقوع خطا، یک «رویداد» (Event) به API پایش خطا ارسال می‌کند. هر رویداد شامل نوع خطا، Stack Trace، اطلاعات کاربر، درخواست HTTP، Tagها و Breadcrumbها (رخدادهای قبل از خطا) است.',
                    'سرور برای هر رویداد یک «اثر انگشت» (Fingerprint) محاسبه می‌کند. رویدادهایی که اثر انگشت یکسانی دارند، همگی زیر یک مشکل گروه‌بندی می‌شوند و شمارنده‌های آن به‌روزرسانی می‌شود. به این ترتیب حتی ۱۰۰ هزار تکرار یک خطا فقط یک ردیف در لیست مشکلات ایجاد می‌کند.',
                ],
            },
            {
                heading: 'اجزای اصلی',
                table: {
                    headers: ['جزء', 'وظیفه'],
                    rows: [
                        ['پروژه‌ها', 'هر اپلیکیشن یا سرویس یک پروژه با کلید اختصاصی (DSN) است'],
                        ['رویدادها (Events)', 'گزارش کامل هر بروز خطا شامل کانتکست‌های فنی'],
                        ['مشکلات', 'گروه رویدادهای هم‌نوع + چرخه وضعیت (باز/حل‌شده/نادیده/برگشته)'],
                        ['نسخه‌ها (Releases)', 'رهگیری خطاها به تفکیک نسخه منتشرشده'],
                        ['هشدارها (Alerts)', 'اعلان خودکار در مشکلات جدید، جهش خطا یا بازگشت خطای حل‌شده'],
                    ],
                },
            },
            {
                heading: 'سطوح شدت خطا',
                table: {
                    headers: ['سطح', 'کاربرد'],
                    rows: [
                        ['بحرانی (Fatal)', 'کرش کامل سیستم، کمبود حافظه، خروج غیرمنتظره پروسه'],
                        ['خطا (Error)', 'Exception واقعی — خطای 500، خطای دیتابیس'],
                        ['هشدار (Warning)', 'رفتار غیرعادی — Timeout، Retry، API منسوخ'],
                        ['اطلاع (Info)', 'رویدادهای کسب‌وکاری — ورود کاربر، شروع پرداخت'],
                        ['دیباگ (Debug)', 'اطلاعات توسعه — فقط برای محیط Development'],
                    ],
                },
            },
            {
                heading: 'حریم خصوصی (PII Scrubbing)',
                paragraphs: [
                    'اطلاعات حساس مانند password، token، authorization، cookie و شماره کارت، پیش از ذخیره‌سازی به‌صورت خودکار ماسک می‌شوند. با این حال توصیه می‌شود سمت اپلیکیشن هم داده‌های حساس را ارسال نکنید.',
                ],
            },
        ],
    },

    dashboard: {
        key: 'dashboard',
        title: 'راهنمای داشبورد پایش خطا',
        intro: 'داشبورد، نمای کلی سلامت اپلیکیشن‌ها را در یک نگاه نشان می‌دهد: چند خطا رخ داده، چند مشکل جدید باز شده و کدام خطاها بیشترین تکرار را داشته‌اند.',
        sections: [
            {
                heading: 'کارت‌های آماری (KPI)',
                bullets: [
                    'رویدادهای امروز — تعداد کل رویدادهای دریافتی از ابتدای روز جاری',
                    'رویدادهای ۲۴ ساعت — کل رویدادهای یک روز گذشته (روند لحظه‌ای)',
                    'مشکلات جدید امروز — مشکلاتی که اولین بار امروز دیده شده‌اند؛ مهم‌ترین سیگنال رگرسیون کد جدید',
                    'مشکلات باز — مشکلات در وضعیت باز یا برگشته که نیاز به بررسی دارند',
                    'حل‌شده‌ها — مشکلاتی که تیم آن‌ها را علامت زده',
                    'کاربران متأثر — تعداد کاربران یکتایی که در ۲۴ ساعت گذشته با خطا مواجه شده‌اند',
                ],
            },
            {
                heading: 'نمودار روند ۱۴ روزه',
                paragraphs: [
                    'نمودار میزان رویدادهای هر روز را به تفکیک سطح (خطا، هشدار و...) نشان می‌دهد. جهش ناگهانی در این نمودار معمولاً یعنی یک Deploy مشکل‌دار یا قطعی یک سرویس وابسته.',
                ],
            },
            {
                heading: 'مشکلات پرتکرار',
                paragraphs: [
                    'پنج مشکل با بیشترین تعداد رویداد در وضعیت باز. این لیست پاسخ سؤال «الان بیشترین هزینه عملیاتی کجاست؟» است — از همان‌جا شروع به رفع اشکال کنید.',
                ],
            },
            {
                heading: 'هشدارهای اخیر',
                paragraphs: [
                    'آخرین هشدارهای ارسال‌شده به Webhook یا تلگرام به‌همراه وضعیت ارسال (موفق/ناموفق). اگر هشداری «ناموفق» است، مقصد آن (آدرس Webhook یا Bot تلگرام) را بررسی کنید.',
                ],
            },
            {
                heading: 'فیلتر پروژه',
                paragraphs: [
                    'با انتخاب یک پروژه از فیلتر بالای صفحه، همه آمارها فقط برای همان سرویس محاسبه می‌شود. گزینه «همه پروژه‌ها» نمای تجمیعی می‌دهد.',
                ],
            },
        ],
    },

    projects: {
        key: 'projects',
        title: 'راهنمای پروژه‌ها و کلید اتصال (DSN)',
        intro: 'هر اپلیکیشن، سرویس یا محیطی که می‌خواهید خطاهایش پایش شود، باید به‌صورت یک «پروژه» ثبت شود. پروژه یک کلید عمومی (Public Key) دارد که SDK برای ارسال خطا از آن استفاده می‌کند — دقیقاً مثل DSN در Sentry.',
        sections: [
            {
                heading: 'ایجاد پروژه',
                bullets: [
                    'نام — نام نمایشی، مثلاً «API پرداخت» یا «وب‌سایت»',
                    'شناسه (Slug) — شناسه یکتا در آدرس‌ها؛ اگر خالی بگذارید از نام ساخته می‌شود',
                    'پلتفرم — نوع اپلیکیشن (Node، مرورگر و...) فقط برای نمایش',
                    'محیط پیش‌فرض — اگر SDK محیط نفرستد، این مقدار ثبت می‌شود (production، staging و...)',
                    'محدودیت نرخ — حداکثر تعداد رویداد قابل قبول در هر دقیقه (پیش‌فرض ۶۰۰) برای مقابله با طوفان خطا',
                ],
            },
            {
                heading: 'کلید عمومی و امنیت',
                paragraphs: [
                    'کلید عمومی فقط هویت پروژه است و در سمت کلاینت هم قابل استفاده است. هرگز ترافیک را با کلید مخفی مهم پندارید؛ برای محدودسازی، Rate Limit هر پروژه را تنظیم کنید.',
                    'اگر کلید عمومی افشا شد، با دکمه «چرخش کلید» کلید جدیدی صادر کنید؛ SDKها باید با کلید جدید به‌روزرسانی شوند و کلید قبلی فوراً بی‌اعتبار می‌شود.',
                ],
            },
            {
                heading: 'اتصال اپلیکیشن',
                paragraphs: [
                    'پس از ساخت پروژه، کلید عمومی را در اسنیپت اتصال (راهنمای بعدی با آیکون ؟ در همین صفحه) قرار دهید. یک راهنمای کامل با کد آماده در بخش «اتصال اپلیکیشن» وجود دارد.',
                ],
                code: 'POST /api/error-tracking/store\nHeader: x-etr-key: <کلید عمومی پروژه>\nBody: رویداد به فرمت JSON',
                codeCaption: 'نقطه ورود رویدادها — بدون نیاز به JWT',
            },
            {
                heading: 'حذف پروژه',
                paragraphs: [
                    'حذف به‌صورت نرم انجام می‌شود: پروژه از لیست حذف و کلید آن باطل می‌شود، اما داده‌های قبلی برای ممیزی باقی می‌ماند.',
                ],
            },
        ],
    },

    issues: {
        key: 'issues',
        title: 'راهنمای مشکلات، فیلترها و چرخه وضعیت',
        intro: 'هر مشکل گروهی از رویدادهای مشابه است. سیستم با محاسبه اثر انگشت (نوع Exception + محل وقوع + قالب پیام) تشخیص می‌دهد کدام رویدادها یک مشکل واحد هستند. مدیریت روزانه خطاها یعنی مدیریت همین لیست.',
        sections: [
            {
                heading: 'ستون‌های جدول',
                bullets: [
                    'عنوان — نوع Exception و پیام خطا؛ با کلیک به جزئیات کامل می‌روید',
                    'محل وقوع (Culprit) — فایل و تابعی که خطا در آن رخ داده',
                    'سطح — شدت خطا (بحرانی/خطا/هشدار/...)',
                    'رویدادها / کاربران — تعداد تکرار و تعداد کاربران یکتای متأثر؛ معیار اولویت‌بندی',
                    'اولین / آخرین مشاهده — بازه زندگی مشکل؛ اگر «آخرین مشاهده» قدیمی است، احتمالاً برطرف شده',
                ],
            },
            {
                heading: 'چرخه وضعیت',
                table: {
                    headers: ['وضعیت', 'معنی'],
                    rows: [
                        ['باز', 'جدید یا در جریان — نیاز به بررسی دارد'],
                        ['حل‌شده', 'رفع شده علامت خورده؛ اگر دوباره رخ دهد به «برگشته» تبدیل می‌شود'],
                        ['نادیده‌گرفته', 'اهمیت ندارد یا پذیرفته شده؛ دیگر هشدار نمی‌فرستد'],
                        ['برگشته (Regressed)', 'خطای حل‌شده پس از انتشار نسخه جدید دوباره ظاهر شده — بالاترین اولویت!'],
                    ],
                },
            },
            {
                heading: 'فیلتر و جستجو',
                paragraphs: [
                    'می‌توانید بر اساس پروژه، سطح، وضعیت، سرویس (tags.service — هر اپ می‌فرستد، مثلاً ai-provider یا payment-gateway)، محیط (production/staging)، نسخه منتشرشده و متن آزاد (عنوان، پیام یا محل وقوع) فیلتر کنید. مثال رایج: قبل از Release فقط وضعیت «برگشته» و سطح «بحرانی» را ببینید.',
                ],
            },
            {
                heading: 'اقدامات سریع',
                paragraphs: [
                    'از دکمه‌های هر ردیف می‌توانید مشکل را «حل‌شده» یا «نادیده» علامت بزنید و یا از حالت حل‌شده به «باز» برگردانید. تغییر وضعیت روی آلارم‌ها اثر مستقیم دارد: مشکلات حل‌شده و نادیده‌گرفته‌شده هشدار جدید نمی‌سازند.',
                ],
            },
        ],
    },

    issueDetail: {
        key: 'issueDetail',
        title: 'راهنمای صفحه جزئیات مشکل',
        intro: 'این صفحه همه‌چیزِ لازم برای ریشه‌یابی یک خطا را بدون باز کردن کد نشان می‌دهد: Stack Trace، رخدادهای قبل از خطا (Breadcrumbs)، کاربر متأثر، درخواست HTTP و کانتکست سفارشی.',
        sections: [
            {
                heading: 'بخش خلاصه',
                bullets: [
                    'عنوان و محل وقوع — چه خطایی و کجا',
                    'شمارنده‌ها — تعداد کل رویدادها و کاربران متأثر',
                    'نمودار روند ۱۴ روزه — آیا خطا در حال رشد است یا میرا؟',
                    'دکمه‌های وضعیت — حل‌شده / نادیده / بازگشت به حالت باز',
                ],
            },
            {
                heading: 'Stack Trace',
                paragraphs: [
                    'لیست فریم‌های زنجیره فراخوانی از نقطه وقوع به بالا. برای هر فریم، فایل، تابع و شماره خط/ستون نمایش داده می‌شود و اگر SDK کد اطراف (context) ارسال کرده باشد، خط مربوطه هایلایت می‌شود — دقیقاً مثل Sentry.',
                ],
            },
            {
                heading: 'Breadcrumbs (ردپای رخدادها)',
                paragraphs: [
                    'تایم‌لاین ۱۰۰ رخداد آخر قبل از خطا: درخواست‌های HTTP، کوئری‌های دیتابیس، لاگ‌ها و رویدادهای کسب‌وکاری. این بخش معمولاً «چرا»ی خطا را روشن می‌کند؛ مثلاً می‌بینید ۲ ثانیه قبل از کرش، یک API خارجی timeout شده است.',
                ],
            },
            {
                heading: 'کانتکست‌ها',
                bullets: [
                    'کاربر — id، ایمیل و نام کاربری؛ برای تماس با کاربر متأثر یا بررسی Impact',
                    'درخواست — متد، آدرس، هدرها و بدنه (فیلدهای حساس ماسک شده‌اند)',
                    'محیط اجرا — مرورگر/سیستم‌عامل یا مشخصات سرور، نسخه و commit',
                    'Tagها و Context — داده‌های سفارشی مثل service:payment یا شناسه سفارش',
                ],
            },
            {
                heading: 'انتخاب بین رویدادها',
                paragraphs: [
                    'هر مشکل صدها رویداد می‌تواند داشته باشد. لیست «رویدادهای اخیر» به شما اجازه می‌دهد بین نمونه‌های مختلف جابه‌جا شوید — مثلاً رویدادی را ببینید که کاربر دیگری در محیط دیگری تجربه کرده است.',
                ],
            },
        ],
    },

    releases: {
        key: 'releases',
        title: 'راهنمای نسخه‌ها (Releases)',
        intro: 'اگر SDK شما نسخه (release) را ارسال کند، سیستم به‌طور خودکار آمار هر نسخه را جمع می‌زند و می‌فهمید هر خطا اولین بار در کدام Deploy معرفی شده است.',
        sections: [
            {
                heading: 'ستون‌های جدول',
                bullets: [
                    'نسخه — مقدار release که SDK ارسال می‌کند (مثل v2.4.0 یا شماره commit)',
                    'شاخه و Commit — اگر runtime شامل commit_sha و branch باشد نمایش داده می‌شود',
                    'رویدادها — تعداد رویدادهای ثبت‌شده در این نسخه',
                    'مشکلات جدید — مشکلاتی که اولین بار در همین نسخه دیده شده‌اند؛ عدد بزرگ = رگرسیون در این Deploy',
                    'اولین/آخرین رویداد — بازه فعالیت نسخه',
                ],
            },
            {
                heading: 'الگوی استفاده پیشنهادی',
                paragraphs: [
                    'پس از هر انتشار: وارد صفحه نسخه‌ها شوید و ستون «مشکلات جدید» را ببینید. اگر چند مشکل جدید ظاهر شده، سریع‌ترین راه بازگشت، Rollback است. ستون «آخرین رویداد» نشان می‌دهد نسخه‌های قدیمی هنوز ترافیک زنده دارند یا خیر.',
                ],
                code: "ETR.release = 'v2.4.1';        // شماره نسخه\nETR.tags = { branch: 'main', commit: 'abc123' };",
                codeCaption: 'ارسال نسخه از سمت SDK',
            },
        ],
    },

    alerts: {
        key: 'alerts',
        title: 'راهنمای هشدارها (Alert Engine)',
        intro: 'به‌جای چک کردن دستی داشبورد، موتور هشدار رویدادها را زیر نظر می‌گیرد و وقوع شرایط تعریف‌شده را به Webhook یا تلگرام شما اعلام می‌کند. برای جلوگیری از طوفان اعلان، هر قانون Cooldown دارد و در آن بازه هشدار تکراری ارسال نمی‌شود.',
        sections: [
            {
                heading: 'انواع قانون هشدار',
                table: {
                    headers: ['نوع', 'چه زمانی فعال می‌شود؟', 'تنظیمات'],
                    rows: [
                        ['مشکل جدید', 'اولین بار که یک مشکل تازه ساخته شود', 'فیلتر سطح (اختیاری)'],
                        ['بازگشت خطا', 'مشکل حل‌شده دوباره ظاهر شود (Regressed)', '—'],
                        ['جهش خطا', 'تعداد رویدادهای یک مشکل در بازه زمانی از آستانه بگذرد', 'آستانه (پیش‌فرض ۵۰)، پنجره دقیقه (پیش‌فرض ۵)، سطوح'],
                    ],
                },
            },
            {
                heading: 'مقصدهای ارسال',
                bullets: [
                    'Webhook — یک POST با بدنه JSON کامل (اطلاعات قانون و مشکل) به آدرس شما؛ مناسب Slack، Discord، n8n یا سرویس‌های داخلی',
                    'تلگرام — پیام متنی در چت/گروه موردنظر؛ برای راه‌اندازی، یک Bot با @BotFather بسازید، توکن و Chat ID گروه را وارد کنید و Bot را عضو گروه کنید',
                ],
            },
            {
                heading: 'Cooldown (مهلت تکرار)',
                paragraphs: [
                    'اگر ۵ هزار خطای مشابه در چند دقیقه برسد، فقط یک هشدار می‌گیرید. با Cooldown مثلاً ۶۰ دقیقه، تا یک ساعت برای همان قانون هشدار دوم ارسال نمی‌شود. تاریخچه همه ارسال‌ها (موفق و ناموفق) در پایین همین صفحه قابل بررسی است.',
                ],
            },
            {
                heading: 'نمونه پیکربندی',
                code: `{
  "name": "جهش خطای پرداخت",
  "type": "error_spike",
  "config": { "spikeThreshold": 50, "windowMinutes": 5, "levels": ["error", "fatal"] },
  "destination": { "type": "telegram", "botToken": "123:ABC", "chatId": "-100123" },
  "cooldownMinutes": 60
}`,
                codeCaption: 'قانون نمونه: جهش خطا با ارسال به تلگرام',
            },
        ],
    },

    integration: {
        key: 'integration',
        title: 'راهنمای اتصال پروژه‌ها به پایش خطا',
        intro: 'این راهنما توضیح می‌دهد هر پروژه چطور به پایش خطا وصل شده است: چه کدی کجا اضافه شده، چه متغیر محیطی لازم است و چطور اتصال را تست کنید. جزئیات کامل هر پروژه در صفحه «راهنمای اتصال» همین بخش است.',
        sections: [
            {
                heading: 'معماری اتصال',
                paragraphs: [
                    'API هوشتون (hosheton_studio) هاب پایش خطا است: ماژول ErrorTrackingModule در آن رجیستر شده و endpoint های ورود رویداد و پنل را سرو می‌کند. همه اپ‌های دیگر (بک‌اند و فرانت) رویدادها را با کلید عمومی پروژه‌شان به همین هاب می‌فرستند — همان مدل DSN در Sentry.',
                    'سمت بک‌اند، فقط یک خط به SharedService.errorHelper اضافه شده که همه catch های همه API ها را پوشش می‌دهد و با env فعال/خاموش می‌شود. سمت فرانت، SDK سبک مشترک (@my-workspace/utils) در ریشه هر اپ راه‌اندازی می‌شود.',
                ],
            },
            {
                heading: 'متغیرهای محیطی',
                table: {
                    headers: ['متغیر', 'سمت', 'نقش'],
                    rows: [
                        ['ETR_INGEST_URL', 'بک‌اند', 'آدرس endpoint ورود رویداد هاب'],
                        ['ETR_PUBLIC_KEY', 'بک‌اند', 'کلید عمومی پروژه — خالی = خاموش'],
                        ['ETR_APP_NAME / ETR_ENVIRONMENT / ETR_RELEASE', 'بک‌اند', 'تگ اپ، محیط و نسخه'],
                        ['NEXT_PUBLIC_ETR_KEY', 'فرانت', 'کلید عمومی پروژه — خالی = خاموش'],
                        ['NEXT_PUBLIC_ETR_URL', 'فرانت', 'آدرس هاب — پیش‌فرض NEXT_PUBLIC_API_URL'],
                    ],
                },
            },
            {
                heading: 'تست اتصال',
                code: `// در Console مرورگر (فرانت):
Promise.reject(new Error('تست پایش خطا'));

// در ترمینال (بک‌اند):
curl -X POST http://localhost:3379/api/error-tracking/store \\
  -H "content-type: application/json" -H "x-etr-key: <کلید>" \\
  -d '{"message":"تست پایش خطا","level":"info"}'`,
                codeCaption: 'رویداد باید تا چند ثانیه در صفحه «مشکلات» ظاهر شود',
            },
        ],
    },

    sdk: {
        key: 'sdk',
        title: 'راهنمای اتصال اپلیکیشن (SDK سبک)',
        intro: 'برای اتصال هر اپلیکیشن JavaScript/TypeScript (Node، Next.js، React، مرورگر) به این اسنیپت سبک نیاز دارید — بدون نصب پکیج. کد زیر را در پروژه خود کپی کنید و کلید عمومی پروژه را جایگزین کنید.',
        sections: [
            {
                heading: 'کد آماده اتصال',
                code: SDK_SNIPPET,
                codeCaption: 'اسنیپت اتصال — قابل کپی در پروژه شما',
            },
            {
                heading: 'استفاده در کد',
                code: `// ثبت خطاهای مدیریت‌شده
try {
  await chargeCard(order);
} catch (error) {
  ETR.capture(error, 'error');
}

// پیام بدون Exception
ETR.capture(new Error('پرداخت بیش از حد طول کشید'), 'warning');

// ثبت ردپای رخدادها (Breadcrumbs)
ETR.addBreadcrumb('http', 'POST /api/payment', { status: 200, duration: 84 });
ETR.addBreadcrumb('db', 'SELECT * FROM orders WHERE id = $1');

// کانتکست کاربر و نسخه (مثلاً بعد از لاگین یا بیلد)
ETR.user = { id: user.id, email: user.email };
ETR.release = 'v2.4.1';
ETR.tags = { service: 'payment' };`,
                codeCaption: 'نمونه استفاده در کد',
            },
            {
                heading: 'گروه‌بندی سفارشی (Fingerprint)',
                paragraphs: [
                    'اگر می‌خواهید خطاهای مختلف در یک گروه واحد بیفتند (مثلاً خطای هر درگاه پرداخت جداگانه گروه شود)، فیلد fingerprint را ارسال کنید:',
                ],
                code: "body: JSON.stringify({ fingerprint: ['payment', gatewayName], ... })",
            },
            {
                heading: 'ارسال دسته‌ای (Envelope)',
                paragraphs: [
                    'برای حجم بالا، چند رویداد را در یک درخواست بفرستید تا هزینه شبکه کم شود:',
                ],
                code: `POST /api/error-tracking/envelope
x-etr-key: <کلید پروژه>

{ "events": [ { ...رویداد۱ }, { ...رویداد۲ } ] }`,
            },
            {
                heading: 'نکات عملیاتی',
                bullets: [
                    'ارسال خطا همیشه داخل try/catch و بدون انتظار پاسخ انجام شود تا هرگز اپلیکیشن اصلی را مختل نکند',
                    'کلید عمومی فقط هویت پروژه است؛ افشای آن فاجعه نیست اما چرخش کلید را در دسترس نگه دارید',
                    'در محیط production سطح debug را ارسال نکنید تا حجم داده کنترل شود',
                ],
            },
        ],
    },
};

// ============================================================ راهنمای یکپارچه‌سازی (تب آموزش اتصال)

/** محتوای هر تب صفحه «راهنمای اتصال» — یک تب به ازای هر پروژه متصل‌شده */
export interface EtrIntegrationProject {
    key: string;
    title: string;
    badge: string;
    sections: GuideSection[];
}

export const ETR_INTEGRATION_PROJECTS: EtrIntegrationProject[] = [
    {
        key: 'api',
        title: 'API هوشتون (hosheton_studio)',
        badge: 'Backend',
        sections: [
            {
                heading: 'چه چیزی پیاده شد؟',
                bullets: [
                    'ماژول ErrorTrackingModule در apps/hosheton_studio/src/app.module.ts رجیستر شد — این اپ حالا «هاب» پایش خطا است و هم endpoint های ورود رویداد (x-etr-key) و هم endpoint های پنل را سرو می‌کند.',
                    'در libs/core/src/error-tracking/error-tracking.transport.ts یک ترنسپورت سبک (EtrTransport) ساخته شد که خطا را fire-and-forget به هاب ارسال می‌کند.',
                    'در SharedService.errorHelper (libs/core/src/shared/shared.service.ts) فقط یک خط اضافه شد: EtrTransport.captureHttpError(res, error). چون همه catch های همه API های مونوریپو از errorHelper رد می‌شوند، با همین یک خط، تمام بک‌اندها پوشش داده شدند.',
                ],
            },
            {
                heading: 'پیکربندی (فقط env — بدون کد)',
                paragraphs: [
                    'ترنسپورت تا وقتی این متغیرها در apps/hosheton_studio/.env.* ست نشده باشند کاملاً خاموش است؛ پس سایر اپ‌های مونوریپو بدون هیچ هزینه‌ای از همین کد استفاده می‌کنند و هر وقت خواستند با ست‌کردن env وصل می‌شوند:',
                ],
                code: `ETR_INGEST_URL=http://localhost:3379/api/error-tracking/store
ETR_PUBLIC_KEY=<کلید عمومی پروژه «API هوشتون»>
ETR_APP_NAME=hosheton-studio-api
ETR_ENVIRONMENT=production   # یا development
ETR_RELEASE=v1.0.0           # اختیاری — برای رهگیری نسخه‌ها`,
                codeCaption: 'apps/hosheton_studio/.env.development و .env.production (الان با مقدار خالی اضافه شده‌اند)',
            },
            {
                heading: 'چه اطلاعاتی با هر خطا ذخیره می‌شود؟',
                bullets: [
                    'کاربر: از req.user گارد JWT — id، email و username؛ ستون «کاربران متأثر» پنل از همین داده پر می‌شود.',
                    'درخواست: متد، مسیر (originalUrl) و User-Agent.',
                    'Stack Trace نرمال‌شده، نسخه Node، تگ app و environment.',
                ],
            },
            {
                heading: 'مستندات داخل پروژه',
                paragraphs: ['شرح کامل در apps/hosheton_studio/Tutorial/Error_Tracking_Integration.md قرار دارد.'],
            },
        ],
    },
    {
        key: 'studio-web',
        title: 'وب اپ استودیو (hosheton_studio)',
        badge: 'Frontend',
        sections: [
            {
                heading: 'چه چیزی پیاده شد؟',
                bullets: [
                    'SDK سبک مرورگر در packages/utils/src/errorTracking.ts (@my-workspace/utils) — مشترک بین همه اپ‌های فرانت؛ هندلرهای سراسری error و unhandledrejection، breadcrumb خودکار fetch، صف و ارسال دسته‌ای، سقف ۲۰ رویداد در دقیقه و حذف تکراری‌ها.',
                    'کامپوننت apps/hosheton_studio/app/etr-init.tsx ساخته و در app/layout.tsx رجیستر شد — SDK را راه‌اندازی می‌کند و بعد از لاگین، اطلاعات کاربر را از zustand (authStore + useAppStore) به همه رویدادها ضمیمه می‌کند.',
                    'app/error.tsx هم خطاهای رندر React را با سطح fatal ثبت می‌کند.',
                ],
            },
            {
                heading: 'پیکربندی',
                code: `# .env.development / .env.production
NEXT_PUBLIC_ETR_KEY=<کلید عمومی پروژه «وب استودیو»>
# NEXT_PUBLIC_ETR_URL=...   # اختیاری — پیش‌فرض همان NEXT_PUBLIC_API_URL`,
                codeCaption: 'هاب روی API استودیو است؛ در این اپ پیش‌فرض درست است و فقط کلید لازم است',
            },
            {
                heading: 'پوشش صفحات',
                paragraphs: [
                    'چون هندلرها سراسری هستند، خطاهای همه صفحات از جمله بوم پروژه (projects/[projectId])، چت استودیو و ویرایشگر ویدیو به‌صورت خودکار با آدرس صفحه (tag: screen) ثبت می‌شوند و در پنل قابل فیلتراند.',
                ],
            },
            {
                heading: 'مستندات داخل پروژه',
                paragraphs: ['شرح کامل در ERROR_TRACKING.md ریشه همین اپ قرار دارد.'],
            },
        ],
    },
    {
        key: 'chat-web',
        title: 'وب اپ چت (hosheton_chat)',
        badge: 'Frontend',
        sections: [
            {
                heading: 'چه چیزی پیاده شد؟',
                bullets: [
                    'همان SDK مشترک (@my-workspace/utils) با کامپوننت apps/hosheton_chat/app/etr-init.tsx که در app/layout.tsx رجیستر شده — شامل خطاهای مدیریت‌نشده، خطاهای رندر (app/error.tsx) و اطلاعات کاربر از store ها.',
                    'صفحه چت (app/(main)/chat) و بقیه صفحات نیازی به تغییر ندارند؛ خطاهای هر صفحه با tag صفحه ثبت می‌شوند.',
                ],
            },
            {
                heading: 'پیکربندی',
                code: `# .env.development
NEXT_PUBLIC_ETR_KEY=<کلید عمومی پروژه «وب چت»>
NEXT_PUBLIC_ETR_URL=http://localhost:3379        # هاب روی API استودیو است نه API چت (۳۳۷۷)

# .env.production
NEXT_PUBLIC_ETR_KEY=<کلید عمومی پروژه «وب چت»>
NEXT_PUBLIC_ETR_URL=https://api.hosheton.com/studio`,
                codeCaption: 'نکته مهم: در توسعه، فرانت چت به API خودش (۳۳۷۷) وصل است ولی رویدادها باید به هاب (۳۳۷۹) بروند',
            },
            {
                heading: 'مستندات داخل پروژه',
                paragraphs: ['شرح کامل در ERROR_TRACKING.md ریشه همین اپ قرار دارد.'],
            },
        ],
    },
];

export const ETR_INTEGRATION_QUICKSTART: GuideSection[] = [
    {
        heading: 'شروع سریع (۳ قدم)',
        bullets: [
            '۱) در همین بخش، صفحه «پروژه‌ها» برای هر اپ یک پروژه بسازید (API هوشتون، وب استودیو، وب چت) و کلید عمومی هر کدام را کپی کنید.',
            '۲) کلید را در env همان اپ بگذارید (در هر پروژه، تب مربوطه را ببینید) و اپ را ری‌استارت کنید — بدون کلید، پایش کاملاً خاموش است.',
            '۳) اتصال را تست کنید: در Console مرورگر Promise.reject(new Error("تست پایش خطا")) اجرا کنید یا روی API دستور curl نمونه زیر را بزنید؛ رویداد باید تا چند ثانیه در «مشکلات» ظاهر شود.',
        ],
        code: `curl -X POST http://localhost:3379/api/error-tracking/store \\
  -H "content-type: application/json" \\
  -H "x-etr-key: <کلید عمومی>" \\
  -d '{"message":"تست پایش خطا","level":"info"}'`,
    },
    {
        heading: 'چرا قبلاً متصل نبود؟',
        bullets: [
            'ماژول ErrorTrackingModule فقط در اپ lingeecko رجیستر شده بود و API هوشتون هیچ endpoint ای برای دریافت رویداد نداشت.',
            'هیچ SDK ای در اپ‌های فرانت وجود نداشت و errorHelper هم خطاها را فقط به کلاینت برمی‌گرداند — چیزی به پایش خطا ارسال نمی‌شد.',
        ],
    },
];

export function getGuide(key: GuideKey): GuideContent {
    return ERROR_TRACKING_GUIDES[key];
}
