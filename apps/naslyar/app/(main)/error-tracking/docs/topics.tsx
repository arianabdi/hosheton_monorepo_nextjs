import Link from 'next/link';
import { Callout, Code, CodeBlock, DocFaq, DocH3, DocSteps, DocTable, type DocSection, type DocTopic } from '@/app/components/DocLayout/DocLayout';

/**
 * مستند پایش خطا — هر موضوع یک صفحه (/error-tracking/docs/<slug>) با DocLayout.
 * پایش خطا برای همهٔ اپ‌های مونوریپو است؛ مثال‌های اختصاصی هر اپ فقط در موضوع «یکپارچه‌سازی‌های فعلی» می‌آیند.
 */
export interface EtrDocTopic extends DocTopic {
    sections: DocSection[];
}

export const ETR_DOCS_BASE = '/error-tracking/docs';

const NEST_MODULE = `// app.module.ts of any NestJS API
import { ErrorTrackingModule } from '@my-workspace/core';

@Module({
    imports: [ErrorTrackingModule /* , … */],
})
export class AppModule {}`;

const NEST_ENV = `# .env of any API (empty ETR_PUBLIC_KEY = transport fully off)
ETR_INGEST_URL=https://<hub-api>/api/error-tracking/store
ETR_PUBLIC_KEY=<public key of this app's project>
ETR_APP_NAME=my-app-api
ETR_ENVIRONMENT=production
ETR_RELEASE=1.4.0`;

const NEXT_INIT = `'use client';
// app/etr-init.tsx — render it in app/layout.tsx
import { useEffect } from 'react';
import { etr, initErrorTracking } from '@my-workspace/utils';

export default function EtrInit({ user }: { user?: { id?: string; email?: string } }) {
    useEffect(() => {
        initErrorTracking({
            baseUrl: process.env.NEXT_PUBLIC_ETR_URL || process.env.NEXT_PUBLIC_API_URL,
            publicKey: process.env.NEXT_PUBLIC_ETR_KEY,   // empty = SDK off
            environment: process.env.NODE_ENV,
            appName: 'my-app-web',
        });
    }, []);
    useEffect(() => etr.setUser(user), [user]);
    return null;
}`;

const SCOPE_EXAMPLE = `import { addEtrBreadcrumb, runInEtrScope, setEtrScopeTag } from '@my-workspace/core';

// queue job / cron: every run gets its own scope (HTTP requests get one automatically)
process(job: Job) {
    return runInEtrScope(() => this.handle(job), { job: job.name });
}

async handle(job: Job) {
    setEtrScopeTag('order_id', job.data.orderId);
    addEtrBreadcrumb({ category: 'payment', message: 'gateway token requested' });
    this.logger.warn('gateway slow, retrying');   // becomes a breadcrumb automatically
    // … if an error is captured later, these steps travel with that event
}`;

const CAPTURE_EXAMPLE = `import { EtrTransport } from '@my-workspace/core';

const eventId = EtrTransport.captureException(error, {
    level: 'error',                         // fatal | error | warning | info | debug
    user: { id: userId },
    tags: { service: 'billing', provider: 'zarinpal' },   // tags.service = the panel's "service" filter
    context: { orderId, amount },           // shown under "contexts"
    fingerprint: ['billing', 'verify', code],               // custom grouping (optional)
});`;

const EXTERNAL_EXAMPLE = `import { captureExternalRequestFailure } from '@my-workspace/core';

try {
    const result = await gateway.verify(payload);
} catch (error) {
    // fire-and-forget: body URLs are probed and a standard event is built
    void captureExternalRequestFailure({
        error,
        service: 'payment-gateway',          // the panel's "service" filter
        provider: 'zarinpal',
        endpoint: 'https://api.zarinpal.com/pg/v4/payment/verify.json',
        method: 'POST',
        operation: 'verify',                 // part of grouping (model, method, …)
        requestBody: payload,                // no keys/passwords — PII keys are filtered
        responseStatus: error.response?.status,
        responseBody: error.response?.data,
        user: { id: userId },
        context: { orderId },                // app-specific context
    });
    throw error;
}`;

const EVENT_SCHEMA = `{
  "event_id": "uuid (optional)",
  "timestamp": "ISO",
  "level": "fatal | error | warning | info | debug",
  "message": "for captureMessage",
  "exception": { "type": "TypeError", "value": "…", "stacktrace": [{ "filename": "…", "function": "…", "lineno": 12 }] },
  "user": { "id": "u_1", "email": "…" },
  "request": { "method": "POST", "url": "/api/…" },
  "context": { "orderId": 1 },
  "tags": { "service": "billing", "app": "my-app-api", "screen": "/checkout" },
  "breadcrumbs": [{ "timestamp": "…", "category": "http", "level": "info", "message": "GET /api/x" }],
  "environment": "production",
  "release": "1.4.0",
  "fingerprint": "optional — custom grouping"
}`;

export const ETR_DOC_TOPICS: EtrDocTopic[] = [
    {
        slug: 'overview',
        group: 'شروع',
        title: 'پایش خطا چیست',
        summary: 'معماری هاب، پروژه‌ها، رویداد و مشکل، و این‌که چه چیزی خودکار ثبت می‌شود.',
        sections: [
            {
                id: 'what',
                title: 'در یک نگاه',
                headings: [
                    { id: 'what-hub', title: 'هاب و اپ‌ها' },
                    { id: 'what-flow', title: 'از خطا تا مشکل' },
                    { id: 'what-auto', title: 'چه چیزی خودکار است' },
                ],
                body: (
                    <>
                        <p>
                            پایش خطا (Error Tracking، ماژول <Code>libs/core/src/error-tracking</Code>) یک سرویس شبیه Sentry برای
                            <strong> همهٔ اپ‌های مونوریپو</strong> است: هر API نست و هر وب‌اپ Next.js خطاهایش را به یک «هاب» می‌فرستد و
                            ادمین همه را از همین پنل می‌بیند. هیچ بخشی از آن به اپ خاصی وابسته نیست.
                        </p>
                        <DocH3 id="what-hub">هاب و اپ‌ها</DocH3>
                        <ul>
                            <li><strong>هاب:</strong> هر APIای که <Code>ErrorTrackingModule</Code> را import کند endpointهای دریافت (<Code>/api/error-tracking/store|envelope</Code>) و پنل را سرو می‌کند. کالکشن‌ها با پیشوند <Code>etr_</Code> در دیتابیس core همان API هستند.</li>
                            <li><strong>پروژه:</strong> هر اپ (یا هر بخش مستقل) یک پروژه با «کلید عمومی» دارد؛ رویداد با هدر <Code>x-etr-key</Code> به پروژهٔ خودش می‌رسد.</li>
                            <li><strong>اپ ارسال‌کننده:</strong> سمت سرور با متغیرهای <Code>ETR_*</Code>، سمت مرورگر با SDK <Code>@my-workspace/utils</Code>.</li>
                        </ul>
                        <DocH3 id="what-flow">از خطا تا مشکل</DocH3>
                        <DocSteps>
                            <li>اپ یک <strong>رویداد</strong> می‌فرستد (خطا، stack، کاربر، tagها، breadcrumbها، کانتکست).</li>
                            <li>هاب PII را فیلتر، stack مرورگر را با source map برمی‌گرداند و یک <strong>اثر انگشت</strong> می‌سازد.</li>
                            <li>رویدادهای هم‌اثرانگشت یک <strong>مشکل (Issue)</strong> می‌شوند با شمارش رویداد/کاربر و چرخهٔ وضعیت.</li>
                            <li>قوانین <strong>هشدار</strong> روی مشکل جدید، برگشته یا جهش خطا پیام تلگرام/وب‌هوک می‌فرستند.</li>
                        </DocSteps>
                        <DocH3 id="what-auto">چه چیزی خودکار است</DocH3>
                        <DocTable
                            headers={['مسیر', 'مکانیزم']}
                            rows={[
                                ['خطاهای HTTP که کنترلر با errorHelper جواب می‌دهد', <Code key="a">SharedService.errorHelper → EtrTransport.captureHttpError</Code>],
                                ['استثناهای مدیریت‌نشدهٔ مسیرها (5xx)', <Code key="b">EtrGlobalExceptionFilter</Code>],
                                ['unhandledRejection / uncaughtException', 'هوک فرایند (با env قابل تنظیم)'],
                                ['هشدارهای لاگ‌شده در همان درخواست/کار', <>scope + <Code key="c">logger.warn/error</Code> → breadcrumb</>],
                                ['خطاهای مرورگر', 'window.onerror، unhandledrejection، breadcrumb هر fetch، Error Boundary'],
                                ['درخواست ناموفق به سرویس بیرونی', <><Code key="d">captureExternalRequestFailure</Code> (یک خط در آداپتور)</>],
                            ]}
                        />
                    </>
                ),
            },
        ],
    },
    {
        slug: 'quickstart',
        group: 'شروع',
        title: 'اتصال یک اپ جدید',
        summary: 'چک‌لیست قدم‌به‌قدم برای اینکه یک API یا وب‌اپ تازه از روز اول پایش شود.',
        sections: [
            {
                id: 'checklist',
                title: 'چک‌لیست',
                body: (
                    <>
                        <DocSteps>
                            <li>در <Link href="/error-tracking/projects">پروژه‌ها</Link> برای اپ یک پروژه بسازید (برای API و وب جدا، تا فیلتر و هشدارشان جدا باشد) و کلید عمومی را بردارید.</li>
                            <li>API نست: <Code>ErrorTrackingModule</Code> را import و <Code>ETR_INGEST_URL</Code> + <Code>ETR_PUBLIC_KEY</Code> + <Code>ETR_APP_NAME</Code> را در env بگذارید (<Link href={`${ETR_DOCS_BASE}/backend`}>جزئیات</Link>).</li>
                            <li>وب Next.js: کامپوننت <Code>EtrInit</Code> را در layout ریشه بگذارید و <Code>NEXT_PUBLIC_ETR_KEY</Code> را ست کنید (<Link href={`${ETR_DOCS_BASE}/frontend`}>جزئیات</Link>).</li>
                            <li>صف‌ها و cronها را در <Code>runInEtrScope</Code> اجرا کنید (<Link href={`${ETR_DOCS_BASE}/scope`}>Scope</Link>).</li>
                            <li>هر آداپتور سرویس بیرونی (AI، پرداخت، پیامک…) در catch خود <Code>captureExternalRequestFailure</Code> را صدا بزند (<Link href={`${ETR_DOCS_BASE}/external-requests`}>جزئیات</Link>).</li>
                            <li>از <Link href="/error-tracking/coverage">پوشش رصد</Link> «تست سلامت خط لوله» را بزنید؛ باید اپ جدید در فهرست بیاید.</li>
                            <li>یک قانون <Link href="/error-tracking/alerts">هشدار</Link> «مشکل جدید» برای پروژه بسازید.</li>
                        </DocSteps>
                        <Callout tone="tip">
                            بدون کلید، همه‌چیز خاموش است و هزینه‌ای ندارد؛ پس افزودن ماژول و SDK به اپ جدید همیشه امن است.
                        </Callout>
                    </>
                ),
            },
        ],
    },
    {
        slug: 'backend',
        group: 'اتصال اپ‌ها',
        title: 'اپ بک‌اند (NestJS)',
        summary: 'ماژول، متغیرهای محیطی، مسیرهای ثبت خودکار و رفتار در کرش فرایند.',
        sections: [
            {
                id: 'module',
                title: 'ثبت ماژول و env',
                headings: [
                    { id: 'module-import', title: 'import ماژول' },
                    { id: 'module-env', title: 'متغیرهای محیطی' },
                    { id: 'module-process', title: 'کرش فرایند' },
                ],
                body: (
                    <>
                        <DocH3 id="module-import">import ماژول</DocH3>
                        <CodeBlock>{NEST_MODULE}</CodeBlock>
                        <p>
                            ماژول فیلتر سراسری 5xx، middleware ساختن scope برای هر درخواست، breadcrumb شدن <Code>logger.warn/error</Code> و
                            هوک‌های فرایند را نصب می‌کند. اگر اپ هاب هم هست (پنل را سرو می‌کند) همین ماژول کافی است.
                        </p>
                        <DocH3 id="module-env">متغیرهای محیطی</DocH3>
                        <CodeBlock>{NEST_ENV}</CodeBlock>
                        <DocTable
                            headers={['متغیر', 'کار']}
                            rows={[
                                [<Code key="1">ETR_INGEST_URL</Code>, 'آدرس store هاب'],
                                [<Code key="2">ETR_PUBLIC_KEY</Code>, 'کلید پروژه — خالی = ترنسپورت خاموش'],
                                [<Code key="3">ETR_APP_NAME</Code>, 'tags.app — ستون «اپ تحت رصد»'],
                                [<Code key="4">ETR_ENVIRONMENT / ETR_RELEASE</Code>, 'محیط و نسخه'],
                                [<Code key="5">ETR_EXIT_ON_UNCAUGHT=false</Code>, 'با uncaughtException فرایند زنده بماند'],
                                [<Code key="6">ETR_UNHANDLED_REJECTION_MODE=strict</Code>, 'با unhandledRejection هم خروج'],
                            ]}
                        />
                        <DocH3 id="module-process">کرش فرایند</DocH3>
                        <p>
                            uncaughtException ثبت و بعد (مثل رفتار پیش‌فرض Node) با کد ۱ خارج می‌شود؛ unhandledRejection ثبت می‌شود و فرایند
                            زنده می‌ماند. ارسال‌ها fire-and-forget هستند و پاسخ HTTP را کند نمی‌کنند؛ خطاهای تکراریِ بی‌شناسه در ۲ ثانیه یک‌بار
                            فرستاده می‌شوند.
                        </p>
                    </>
                ),
            },
        ],
    },
    {
        slug: 'frontend',
        group: 'اتصال اپ‌ها',
        title: 'اپ فرانت (Next.js)',
        summary: 'SDK مرورگر، کاربر و tag، breadcrumb شبکه و source map.',
        sections: [
            {
                id: 'sdk',
                title: 'SDK مرورگر',
                headings: [
                    { id: 'sdk-init', title: 'راه‌اندازی' },
                    { id: 'sdk-api', title: 'متدها' },
                    { id: 'sdk-sourcemap', title: 'Source map' },
                ],
                body: (
                    <>
                        <DocH3 id="sdk-init">راه‌اندازی</DocH3>
                        <CodeBlock>{NEXT_INIT}</CodeBlock>
                        <ul>
                            <li>خطاهای مدیریت‌نشده و rejectionها خودکار؛ هر fetch یک breadcrumb (آدرس، status، مدت).</li>
                            <li>رویدادها هر ۵ ثانیه دسته‌ای (و هنگام بستن تب با sendBeacon) فرستاده می‌شوند؛ سقف ۲۰ رویداد در دقیقه.</li>
                            <li>آدرس صفحه به‌عنوان tag <Code>screen</Code> ثبت می‌شود (فیلتر «صفحات» در پوشش رصد).</li>
                        </ul>
                        <DocH3 id="sdk-api">متدها</DocH3>
                        <DocTable
                            headers={['متد', 'کار']}
                            rows={[
                                [<Code key="1">etr.setUser(user)</Code>, 'کاربر برای رویدادهای بعدی'],
                                [<Code key="2">etr.setTags(tags)</Code>, 'tag ثابت برای همه رویدادها'],
                                [<Code key="3">etr.addBreadcrumb(category, message, data)</Code>, 'قدم دستی در تایم‌لاین'],
                                [<Code key="4">etr.capture(error, level)</Code>, 'ثبت دستی'],
                                [<Code key="5">etr.flush()</Code>, 'ارسال فوری صف'],
                            ]}
                        />
                        <DocH3 id="sdk-sourcemap">Source map</DocH3>
                        <p>
                            هاب stack مرورگر را با فایل‌های <Code>.map</Code> به فایل و خط اصلی برمی‌گرداند. originهای مجاز و توکن source map
                            در تنظیمات هر پروژه است؛ اپ در production فایل map را فقط با هدر <Code>x-etr-sourcemap-token</Code> بدهد.
                        </p>
                    </>
                ),
            },
        ],
    },
    {
        slug: 'scope',
        group: 'اتصال اپ‌ها',
        title: 'Scope و Breadcrumb سرور',
        summary: 'اینکه چرا خطا اتفاق افتاد: تایم‌لاین هر درخواست و هر job صف.',
        sections: [
            {
                id: 'scope-why',
                title: 'چرا Scope',
                headings: [
                    { id: 'scope-auto', title: 'خودکار' },
                    { id: 'scope-manual', title: 'job صف و cron' },
                    { id: 'scope-rules', title: 'قواعد' },
                ],
                body: (
                    <>
                        <p>
                            خیلی از خطاها «خطای دوم» هستند: کد جایی هشدار داده، fallback کرده و ادامه داده، و چند ثانیه بعد چیز دیگری شکسته.
                            Scope همان هشدارها را کنار رویداد خطا نگه می‌دارد تا علت اصلی در تب Breadcrumbs دیده شود. هر scope جداست؛
                            درخواست‌های هم‌زمان با هم قاطی نمی‌شوند (AsyncLocalStorage).
                        </p>
                        <DocH3 id="scope-auto">خودکار</DocH3>
                        <ul>
                            <li>هر درخواست HTTP: <Code>EtrScopeMiddleware</Code> (ثبت‌شده توسط ماژول).</li>
                            <li>هر <Code>logger.warn</Code> و <Code>logger.error</Code> نست داخل scope → breadcrumb با دستهٔ <Code>{'log.<Context>'}</Code>.</li>
                            <li>رویدادی که داخل scope ثبت شود breadcrumbها (حداکثر ۶۰ مورد آخر) و tagهای scope را می‌برد.</li>
                        </ul>
                        <DocH3 id="scope-manual">job صف و cron</DocH3>
                        <CodeBlock>{SCOPE_EXAMPLE}</CodeBlock>
                        <DocH3 id="scope-rules">قواعد</DocH3>
                        <ul>
                            <li>catch-and-continue بی‌صدا ممنوع: حداقل <Code>logger.warn</Code> یا <Code>addEtrBreadcrumb</Code>.</li>
                            <li>breadcrumb رویداد نمی‌سازد؛ برای خطایی که باید دیده شود رویداد ثبت کنید.</li>
                            <li>اطلاعات حساس (توکن، رمز) را در message breadcrumb نگذارید.</li>
                        </ul>
                    </>
                ),
            },
        ],
    },
    {
        slug: 'capture',
        group: 'اتصال اپ‌ها',
        title: 'ثبت دستی رویداد',
        summary: 'captureException، سطح، tagها، کانتکست، گروه‌بندی سفارشی و شناسهٔ رویداد.',
        sections: [
            {
                id: 'capture-api',
                title: 'captureException',
                headings: [
                    { id: 'capture-meta', title: 'پارامترها' },
                    { id: 'capture-tags', title: 'قرارداد tagها' },
                ],
                body: (
                    <>
                        <CodeBlock>{CAPTURE_EXAMPLE}</CodeBlock>
                        <DocH3 id="capture-meta">پارامترها</DocH3>
                        <DocTable
                            headers={['فیلد', 'معنی']}
                            rows={[
                                [<Code key="1">level</Code>, 'پیش‌فرض: error (برای HTTP 4xx: warning)'],
                                [<Code key="2">tags</Code>, 'کلید/مقدار کوتاه برای فیلتر (حداکثر ۲۰، هر کدام ۱۰۰ حرف)'],
                                [<Code key="3">context</Code>, 'هر شیء — در «کانتکست‌ها»؛ کلیدهای حساس فیلتر می‌شوند'],
                                [<Code key="4">fingerprint</Code>, 'گروه‌بندی سفارشی؛ خالی = نوع + فریم ریشه + قالب پیام'],
                                [<Code key="5">eventId</Code>, 'شناسهٔ از پیش ساخته — وقتی رکورد اپ باید به رویداد لینک شود؛ هرگز dedupe نمی‌شود'],
                                [<Code key="6">breadcrumbs</Code>, 'صریح؛ خالی = breadcrumbهای scope'],
                            ]}
                        />
                        <p>مقدار برگشتی شناسهٔ رویداد است (null = ترنسپورت خاموش یا تکراری حذف شد).</p>
                        <DocH3 id="capture-tags">قرارداد tagها</DocH3>
                        <DocTable
                            headers={['tag', 'یعنی', 'نمونه']}
                            rows={[
                                [<Code key="1">service</Code>, 'دستهٔ سرویس — فیلتر «سرویس» پنل؛ هر اپ دسته‌های خودش', 'ai-provider، payment-gateway، storage'],
                                [<Code key="2">provider</Code>, 'سرویس بیرونی', 'atlascloud، zarinpal'],
                                [<Code key="3">source</Code>, 'کجای کد', 'worker:node، cron:daily'],
                                [<Code key="4">app / platform / screen</Code>, 'خودکار (ETR_APP_NAME، node/javascript، صفحه)', '—'],
                            ]}
                        />
                    </>
                ),
            },
        ],
    },
    {
        slug: 'external-requests',
        group: 'اتصال اپ‌ها',
        title: 'درخواست ناموفق به سرویس بیرونی',
        summary: 'یک خط در آداپتور: بدنه، پاسخ، چک HTTP هر URL ورودی و تشخیص خودکار.',
        sections: [
            {
                id: 'ext-why',
                title: 'چرا و چطور',
                headings: [
                    { id: 'ext-usage', title: 'استفاده' },
                    { id: 'ext-shape', title: 'شکل رویداد' },
                    { id: 'ext-diagnosis', title: 'تشخیص خودکار ورودی‌ها' },
                ],
                body: (
                    <>
                        <p>
                            سرویس‌های بیرونی اغلب پیام مبهم می‌دهند («stream has been aborted»، «failed to download»). علت معمولاً ورودی
                            ماست: لینک ۴۰۴، باکت خصوصی، فایل خالی. <Code>captureExternalRequestFailure</Code> (libs/core) همهٔ URLهای بدنهٔ
                            درخواست را همان لحظه از سرور چک می‌کند و رویدادی استاندارد می‌سازد که پنل آن را در تب «درخواست به سرویس
                            بیرونی» و کادر «تشخیص خودکار» نشان می‌دهد.
                        </p>
                        <DocH3 id="ext-usage">استفاده</DocH3>
                        <CodeBlock>{EXTERNAL_EXAMPLE}</CodeBlock>
                        <DocH3 id="ext-shape">شکل رویداد</DocH3>
                        <DocTable
                            headers={['فیلد', 'محتوا']}
                            rows={[
                                [<Code key="1">extra.diagnosis</Code>, 'یک خط: «video_clips[0].url → HTTP 404»'],
                                [<Code key="2">extra.inputs</Code>, 'برای هر URL: مسیر فیلد، آدرس، HTTP، نوع، حجم'],
                                [<Code key="3">extra.provider</Code>, 'سرویس، endpoint، متد، status، پیام، بدنهٔ پاسخ'],
                                [<Code key="4">extra.request</Code>, 'operation و بدنهٔ ارسالی (کوتاه‌شده)'],
                                [<Code key="5">extra.*</Code>, 'کانتکست اختصاصی اپ (context) — در کارت «کانتکست اپ»'],
                                ['tags', 'service، provider، operation، provider_status، input_unreachable'],
                                ['گروه‌بندی', 'service + provider + operation + status + قالب پیام'],
                            ]}
                        />
                        <DocH3 id="ext-diagnosis">تشخیص خودکار ورودی‌ها</DocH3>
                        <ul>
                            <li>تا ۱۰ URL، هر کدام ۸ ثانیه؛ HEAD و اگر نشد GET یک‌بایتی.</li>
                            <li>فیلدهای webhook/callback/redirect چک نمی‌شوند. با <Code>probeInputs: false</Code> خاموش می‌شود.</li>
                            <li>نتیجه از دید سرور خودمان است؛ ۲۰۰ اینجا یعنی فایل وجود دارد، نه اینکه سرویس خارجی حتماً به آن دسترسی دارد.</li>
                        </ul>
                    </>
                ),
            },
        ],
    },
    {
        slug: 'issues',
        group: 'کار با پنل',
        title: 'مشکلات، گروه‌بندی و فیلترها',
        summary: 'اثر انگشت، چرخهٔ وضعیت، فیلتر سرویس و اولویت‌بندی.',
        sections: [
            {
                id: 'issues-main',
                title: 'مشکلات',
                headings: [
                    { id: 'issues-grouping', title: 'گروه‌بندی' },
                    { id: 'issues-status', title: 'وضعیت‌ها' },
                    { id: 'issues-filters', title: 'فیلترها' },
                ],
                body: (
                    <>
                        <DocH3 id="issues-grouping">گروه‌بندی</DocH3>
                        <p>
                            اثر انگشت = SHA-256 از نوع Exception + فایل/تابع اولین فریم کد خود اپ + قالب نرمال‌شدهٔ پیام (عدد، uuid، hash و
                            رشته‌های داخل گیومه جایگزین می‌شوند). اگر خطاهای متفاوت در یک مشکل جمع شده‌اند، در کد ارسال‌کننده
                            <Code>fingerprint</Code> بدهید.
                        </p>
                        <DocH3 id="issues-status">وضعیت‌ها</DocH3>
                        <DocTable
                            headers={['وضعیت', 'معنی']}
                            rows={[
                                ['باز', 'نیاز به رسیدگی'],
                                ['حل‌شده', 'فیکس شده؛ رویداد جدید آن را «برگشته» می‌کند'],
                                ['نادیده', 'پیگیری نمی‌شود و هشدار نمی‌سازد'],
                                ['برگشته', 'بعد از حل دوباره آمده — بالاترین اولویت'],
                            ]}
                        />
                        <DocH3 id="issues-filters">فیلترها</DocH3>
                        <p>
                            پروژه، سطح، وضعیت، <strong>سرویس</strong> (مقدار tags.service هر رویداد، از هر اپ) و جستجو در عنوان/پیام/محل وقوع.
                            همه در URL می‌مانند؛ لینک را برای هم‌تیمی بفرستید. گزینه‌های «سرویس» از خود داده ساخته می‌شوند.
                        </p>
                    </>
                ),
            },
        ],
    },
    {
        slug: 'issue-detail',
        group: 'کار با پنل',
        title: 'خواندن جزئیات یک مشکل',
        summary: 'Stack Trace، Breadcrumbs، کانتکست‌ها و تب درخواست به سرویس بیرونی.',
        sections: [
            {
                id: 'detail-tabs',
                title: 'تب‌ها',
                body: (
                    <>
                        <DocTable
                            headers={['تب', 'برای چه']}
                            rows={[
                                ['یادداشت رفع', 'علت ریشه‌ای و راه‌حل که ادمین/توسعه‌دهنده بعد از فیکس می‌نویسد؛ با تغییر وضعیت پاک نمی‌شود'],
                                ['کادر تشخیص خودکار', 'اگر رویداد extra.diagnosis دارد: علت احتمالی در یک خط'],
                                ['Stack Trace', 'کجا شکست (فریم‌های کد خود اپ؛ مرورگر با source map)'],
                                ['Breadcrumbs', 'چه اتفاقی قبلش افتاد — هشدارهای لاگ، fetchها، قدم‌های دستی'],
                                ['کانتکست‌ها', 'کاربر، درخواست HTTP، محیط/نسخه، tagها و context خام'],
                                ['درخواست به سرویس بیرونی', 'ورودی‌ها با HTTP هر کدام، پاسخ سرویس، کانتکست اپ، بدنهٔ ارسالی'],
                            ]}
                        />
                        <Callout tone="tip" title="ترتیب خواندن">
                            تشخیص خودکار → درخواست به سرویس بیرونی (ردیف قرمز) → Breadcrumbs → Stack Trace.
                        </Callout>
                        <Callout tone="note" title="بعد از فیکس">
                            در «یادداشت رفع» بنویسید مشکل چه بود و چه چیزی تغییر کرد، بعد «حل‌شده» بزنید. اگر مشکل «برگشته» شد، یادداشت
                            همان‌جا می‌ماند و نقطهٔ شروع بررسی بعدی است.
                        </Callout>
                    </>
                ),
            },
        ],
    },
    {
        slug: 'alerts',
        group: 'کار با پنل',
        title: 'هشدارها',
        summary: 'مشکل جدید، برگشته و جهش خطا به تلگرام یا وب‌هوک.',
        sections: [
            {
                id: 'alerts-rules',
                title: 'قوانین هشدار',
                body: (
                    <>
                        <DocTable
                            headers={['نوع', 'کی می‌فرستد']}
                            rows={[
                                ['مشکل جدید', 'اولین رویداد یک اثر انگشت تازه'],
                                ['برگشته', 'رویداد تازه برای مشکل حل‌شده'],
                                ['جهش خطا', 'بیش از N رویداد (با سطح‌های انتخابی) در پنجرهٔ چنددقیقه‌ای'],
                            ]}
                        />
                        <p>هر قانون cooldown دارد تا یک مشکل پرتکرار پیام‌باران نکند. مشکلات نادیده‌گرفته‌شده هشدار نمی‌سازند.</p>
                    </>
                ),
            },
        ],
    },
    {
        slug: 'coverage',
        group: 'کار با پنل',
        title: 'پوشش رصد و نسخه‌ها',
        summary: 'کدام اپ‌ها وصل‌اند، تست سلامت خط لوله، و رهگیری Release.',
        sections: [
            {
                id: 'coverage-main',
                title: 'پوشش و نسخه‌ها',
                body: (
                    <>
                        <ul>
                            <li><strong>پوشش رصد:</strong> اپ/پلتفرم‌های ارسال‌کننده، صفحات کلاینت، نقاط وقوع، محیط‌ها و سرورها؛ وضعیت ترنسپورت همین فرایند.</li>
                            <li><strong>تست سلامت خط لوله:</strong> یک رویداد مستقیم و یک رویداد از مسیر ترنسپورت می‌فرستد و رسیدن هر دو را چک می‌کند.</li>
                            <li><strong>نسخه‌ها:</strong> با ETR_RELEASE / release در SDK؛ «نسخهٔ اولین وقوع» هر مشکل می‌گوید کدام انتشار آن را آورد.</li>
                        </ul>
                    </>
                ),
            },
        ],
    },
    {
        slug: 'projects',
        group: 'کار با پنل',
        title: 'پروژه‌ها و کلیدها',
        summary: 'ساخت پروژه، چرخش کلید، rate limit و تنظیمات source map.',
        sections: [
            {
                id: 'projects-main',
                title: 'پروژه‌ها',
                body: (
                    <>
                        <ul>
                            <li>هر پروژه یک کلید عمومی دارد که فقط برای ارسال رویداد است (مثل DSN سنتری) — در کد فرانت قرار گرفتنش اشکالی ندارد.</li>
                            <li>«چرخش کلید» کلید قبلی را باطل می‌کند؛ env همهٔ اپ‌های آن پروژه را به‌روز کنید.</li>
                            <li>rate limit هر پروژه در دقیقه (پیش‌فرض ۶۰۰)؛ بیش از آن ۴۲۹ می‌گیرد.</li>
                        </ul>
                    </>
                ),
            },
        ],
    },
    {
        slug: 'event-schema',
        group: 'مرجع',
        title: 'شمای رویداد',
        summary: 'فیلدهای قابل ارسال به store/envelope برای هر زبان و هر اپ.',
        sections: [
            {
                id: 'schema',
                title: 'Event',
                body: (
                    <>
                        <CodeBlock>{EVENT_SCHEMA}</CodeBlock>
                        <p>
                            ارسال با <Code>POST /api/error-tracking/store</Code> (یک رویداد) یا <Code>/envelope</Code> (حداکثر ۱۰۰) و هدر
                            <Code>x-etr-key</Code>. پاسخ: <Code>{'{ accepted, duplicates, rejected }'}</Code>.
                        </p>
                    </>
                ),
            },
        ],
    },
    {
        slug: 'api',
        group: 'مرجع',
        title: 'مرجع API',
        summary: 'endpointهای دریافت رویداد و پنل.',
        sections: [
            {
                id: 'api-ingest',
                title: 'دریافت رویداد (بدون JWT)',
                body: (
                    <DocTable
                        headers={['مسیر', 'کار']}
                        rows={[
                            [<Code key="1">POST /api/error-tracking/store</Code>, 'یک رویداد'],
                            [<Code key="2">POST /api/error-tracking/envelope</Code>, 'دسته‌ای'],
                            [<Code key="3">GET /api/error-tracking/health</Code>, 'سلامت هاب'],
                            [<Code key="4">POST /api/error-tracking/self-test</Code>, 'تست کامل خط لوله برای کلید'],
                        ]}
                    />
                ),
            },
            {
                id: 'api-panel',
                title: 'پنل (JWT ادمین)',
                body: (
                    <DocTable
                        headers={['مسیر', 'کار']}
                        rows={[
                            [<Code key="1">GET /panel/issues</Code>, 'projectId، level، status، service، release، environment، search، sort، dir، page، limit → issues + services'],
                            [<Code key="2">GET /panel/issues/:id</Code>, 'جزئیات + روند ۱۴ روزه + آخرین رویداد'],
                            [<Code key="3">PATCH /panel/issues/:id/status</Code>, 'تغییر وضعیت'],
                            [<Code key="3n">PATCH /panel/issues/:id/note</Code>, 'یادداشت رفع: note (تا ۲۰٬۰۰۰ نویسه؛ خالی = پاک) → issue با resolutionNote، resolutionNoteBy، resolutionNoteUpdatedAt'],
                            [<Code key="4">GET /panel/issues/:id/events</Code>, 'رویدادهای یک مشکل'],
                            [<Code key="5">GET /panel/events/:eventId</Code>, 'رویداد کامل'],
                            [<Code key="6">GET /panel/dashboard | coverage | releases | alerts</Code>, 'داشبورد و گزارش‌ها'],
                            [<Code key="7">/panel/projects | /panel/alert-rules</Code>, 'مدیریت پروژه‌ها و قوانین'],
                        ]}
                    />
                ),
            },
        ],
    },
    {
        slug: 'privacy',
        group: 'مرجع',
        title: 'حریم خصوصی و محدودیت‌ها',
        summary: 'فیلتر خودکار اطلاعات حساس، سقف‌ها و نگه‌داری.',
        sections: [
            {
                id: 'privacy-main',
                title: 'PII و سقف‌ها',
                body: (
                    <ul>
                        <li>کلیدهای password، token، authorization، cookie، secret، api_key، card، cvv و… در هر سطح با <Code>[filtered]</Code> جایگزین می‌شوند.</li>
                        <li>رشته‌های بلند ۲۰۰۰ حرف، هر شیء ۵۰ کلید و ۶ سطح؛ ۱۰۰ breadcrumb آخر؛ ۲۰ tag.</li>
                        <li>base64 و فایل را در رویداد نفرستید؛ آدرس یا خلاصه کافی است.</li>
                        <li>به کاربر نهایی فقط پیام‌های خود محصول نشان داده می‌شود؛ متن خام سرویس‌ها فقط اینجاست.</li>
                    </ul>
                ),
            },
        ],
    },
    {
        slug: 'troubleshooting',
        group: 'مرجع',
        title: 'عیب‌یابی',
        summary: 'رویداد نمی‌رسد، گروه‌بندی غلط، breadcrumb خالی.',
        sections: [
            {
                id: 'trouble-faq',
                title: 'سؤالات متداول',
                body: (
                    <DocFaq
                        items={[
                            ['هیچ رویدادی از اپ نمی‌رسد', 'ETR_PUBLIC_KEY / NEXT_PUBLIC_ETR_KEY خالی است یا کلید چرخیده؛ از «پوشش رصد» تست سلامت را بزنید و GET /api/error-tracking/health را ببینید.'],
                            ['خطاهای متفاوت یک مشکل شده‌اند', 'پیام‌ها بعد از نرمال‌سازی یکی می‌شوند؛ در ارسال، fingerprint با کلیدهای متمایز (سرویس، عملیات، کد) بدهید.'],
                            ['Breadcrumbs خالی است', 'کار بیرون از scope اجرا شده؛ job/cron را در runInEtrScope بپیچید.'],
                            ['خطای 4xx معمولی پنل را پر کرده', 'فیلتر سراسری فقط 5xx می‌فرستد؛ این‌ها از errorHelper آمده‌اند — نادیده یا سطح را فیلتر کنید.'],
                            ['تشخیص خودکار نیامده', 'رویداد با captureExternalRequestFailure ثبت نشده یا بدنه URL نداشته است.'],
                        ]}
                    />
                ),
            },
        ],
    },
    {
        slug: 'integrations',
        group: 'مرجع',
        title: 'یکپارچه‌سازی‌های فعلی اپ‌ها',
        summary: 'هر اپ چه سرویس‌هایی را با چه tag سرویسی ثبت می‌کند — نمونه برای اپ‌های بعدی.',
        sections: [
            {
                id: 'integrations-table',
                title: 'اپ‌ها',
                body: (
                    <>
                        <p>این‌ها کد خود اپ‌ها هستند و روی هستهٔ مشترک ساخته شده‌اند؛ هر اپ جدید هم همین الگو را دنبال کند.</p>
                        <DocTable
                            headers={['اپ', 'tags.service', 'چه چیزی']}
                            rows={[
                                ['هستهٔ مشترک (libs/core)', 'storage', 'کار ناموفق انتقال/بک‌آپ/بازگردانی استوریج؛ breadcrumb خواندن از استوریج بک‌آپ'],
                                ['API استودیو', 'ai-provider', 'هر درخواست ناموفق به ارائه‌دهنده‌های AI از گذرگاه درخواست‌ها، با چک ورودی‌ها؛ درخواست گیرکرده بیش از ۳۰ دقیقه (ProviderRequestStuck)'],
                                ['API استودیو', 'studio-generation', 'شکست گره/اجرای تولید که علتش درخواست ارائه‌دهنده نبوده'],
                                ['وب‌اپ‌ها', '—', 'SDK مرورگر با tag screen'],
                            ]}
                        />
                        <Callout tone="note">
                            اپ جدید فقط مقدار service خودش را انتخاب می‌کند؛ فیلتر و تب‌های پنل بدون تغییر کد کار می‌کنند.
                        </Callout>
                    </>
                ),
            },
        ],
    },
];
