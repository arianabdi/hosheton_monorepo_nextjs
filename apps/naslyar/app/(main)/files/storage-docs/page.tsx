'use client';

import Link from 'next/link';
import DocLayout, { Callout, Code, CodeBlock, DocFaq, DocH3, DocPage, DocSteps, DocTable, type DocSection } from '@/app/components/DocLayout/DocLayout';

const PARSPACK_EXAMPLE = `Endpoint      c780242.parspack.net
Bucket        c780242            # ParsPack: first label of the endpoint host
Access Key    <from the ParsPack panel>
Secret Key    <from the ParsPack panel — entered once, never shown again>
Public base   (empty)  ->  https://c780242.parspack.net
Path-style    on`;

const STORED_VALUE = `// systemSettings (core DB) — key: "storage.s3"
{
  "enabled": true,
  "endpoint": "https://c780242.parspack.net",
  "region": "us-east-1",
  "bucket": "c780242",
  "accessKey": "…",
  "secretKey": "…",              // never returned to the panel
  "forcePathStyle": true,
  "publicBaseUrl": "",
  "requestTimeoutMs": 60000,
  "retired": [                    // replaced panel storages = read-only fallbacks
    { "endpoint": "…", "bucket": "…", "accessKey": "…", "secretKey": "…",
      "publicBaseUrl": "", "retiredAt": "2026-10-16T…" }
  ]
}`;

const LOOKUP_FLOW = `readFileAsBuffer("hosheton/videos/23be…mp4")
  1) uploads cached on this server in the last 5 minutes
  2) GetObject on the active storage (ParsPack)      -> NoSuchKey
  3) GetObject on the fallbacks, in order:
       retired:…  (replaced panel storages, newest first)
       env        (server S3_* — Contabo)            -> found ✔
  the location is cached 10 min (a miss: 1 min)`;

const DEV_DO = `import { FileService, isOwnStorageUrl } from '@my-workspace/core';

// ✔ read a file (from whichever storage has it)
const buffer = await this.fileService.readFileAsBuffer(fileKeyOrUrl);

// ✔ public URL of an existing file — where it really is (null = nowhere)
const url = await this.fileService.resolvePublicFileUrl(fileKey);

// ✔ URL of a file you just uploaded (always on the active storage)
const fresh = this.fileService.buildPublicFileUrl(newKey);

// ✔ file record: path is the storage the file was uploaded to
const publicUrl = file.path && isOwnStorageUrl(file.path)
    ? file.path
    : await this.fileService.resolvePublicFileUrl(file.key);

// ✔ delete (active + fallbacks)
await this.fileService.deleteFileByKey(file.key);`;

const DEV_DONT = `// ✖ URLs from env — wrong after the storage is switched in the panel
\`\${process.env.S3_ENDPOINT}/\${bucket}/\${key}\`
\`\${process.env.NEXT_PUBLIC_S3_ENDPOINT}/\${file.key}\`

// ✖ key-built URL for an old file (always points at the active storage)
this.fileService.buildPublicFileUrl(oldFile.key)

// ✖ a separate S3Client, or reading straight from getStorageRuntime().client
new S3Client({ endpoint: process.env.S3_ENDPOINT, … })

// ✖ handing an unchecked URL to an AI provider`;

const SECTIONS: DocSection[] = [
    {
        id: 'overview',
        title: 'مرور کلی',
        headings: [
            { id: 'overview-what', title: 'این صفحه چه می‌کند' },
            { id: 'overview-sources', title: 'دو منبع تنظیمات: env و پنل' },
            { id: 'overview-users', title: 'چه بخش‌هایی از آن استفاده می‌کنند' },
        ],
        body: (
            <>
                <DocH3 id="overview-what">این صفحه چه می‌کند</DocH3>
                <p>
                    همهٔ فایل‌های سایت — آپلود کاربران، تصویر و ویدیوی ساخته‌شده در استودیو، تامبنیل‌ها، نسخهٔ بهینهٔ تصویرهای چت،
                    پروکسی ویدیوی ادیتور و بک‌آپ‌ها — روی یک فضای ذخیره‌سازی سازگار با S3 نگه داشته می‌شوند و کاربران مستقیم از
                    آدرس عمومی همان فضا فایل را می‌گیرند. صفحهٔ <Link href="/files/settings">فایل‌ها ← تنظیمات</Link> اتصال به این
                    فضا را بدون دست زدن به سرور عوض می‌کند؛ مثلاً از Contabo (خارج) به پارس‌پک (داخل ایران) تا با قطعی اینترنت
                    بین‌الملل هم فایل‌ها باز شوند.
                </p>
                <Callout tone="tip" title="خلاصه در یک خط">
                    فایل‌های جدید روی «استوریج فعال» می‌روند؛ فایل‌های قدیمی هرگز جابه‌جا نمی‌شوند ولی خراب هم نمی‌شوند، چون
                    استوریجی که قبلاً فعال بود به‌عنوان «بک‌آپ فقط‌خواندنی» وصل می‌ماند.
                </Callout>

                <DocH3 id="overview-sources">دو منبع تنظیمات: env و پنل</DocH3>
                <DocTable
                    headers={['منبع', 'کجا', 'کی فعال است']}
                    rows={[
                        [
                            'env سرور',
                            <><Code>S3_ENDPOINT</Code>، <Code>S3_BUCKET_NAME</Code>، <Code>S3_ACCESS_KEY</Code>، <Code>S3_SECRET_KEY</Code>، <Code>S3_COMPATIBLE_STORAGE_ENDPOINT_PUBLIC_URL</Code> در فایل env هر API</>,
                            'وقتی در پنل استوریجی فعال نیست یا تنظیمات ناقص است (رفتار قبل از این قابلیت، بدون تغییر).',
                        ],
                        [
                            'پنل (دیتابیس)',
                            <>کلید <Code>storage.s3</Code> در کالکشن <Code>systemSettings</Code> دیتابیس core</>,
                            'وقتی «استفاده از این استوریج» روشن و هر چهار فیلد endpoint / bucket / access / secret پر و تست موفق باشد.',
                        ],
                    ]}
                />
                <p>
                    هر دقیقه همهٔ نمونه‌های API تنظیم را از دیتابیس می‌خوانند؛ پس تغییر بدون ری‌استارت و حداکثر تا یک دقیقه روی همهٔ
                    سرورها اعمال می‌شود (روی سروری که ذخیره را انجام داده، فوراً).
                </p>

                <DocH3 id="overview-users">چه بخش‌هایی از آن استفاده می‌کنند</DocH3>
                <ul>
                    <li><strong>آپلود چندتکه (chunk)</strong> فایل‌های کاربر و ثبت رکورد در کالکشن <Code>files</Code>.</li>
                    <li><strong>تامبنیل</strong> تصویر و ویدیو (صف <Code>thumbnailQueue</Code>).</li>
                    <li><strong>worker تولید استودیو</strong>: ذخیرهٔ خروجی مدل‌ها و خواندن فایل‌های مرجع برای ارسال به ارائه‌دهندهٔ AI.</li>
                    <li><strong>بهینه‌سازی تصویر چت</strong>، <strong>پروکسی ویدیوی ادیتور</strong>، <strong>بک‌آپ سیستم</strong>.</li>
                    <li>همهٔ اپ‌هایی که <Code>FileModule</Code> هسته را می‌گیرند (استودیو، taskvision و…) — هر کدام تنظیم دیتابیس core خودشان را دارند.</li>
                </ul>
            </>
        ),
    },
    {
        id: 'concepts',
        title: 'مفاهیم پایه',
        headings: [
            { id: 'concepts-key-path', title: 'کلید، مسیر و آدرس عمومی' },
            { id: 'concepts-active-fallback', title: 'استوریج فعال و بک‌آپ' },
            { id: 'concepts-bucket-host', title: 'endpoint اختصاصی باکت (پارس‌پک)' },
        ],
        body: (
            <>
                <DocH3 id="concepts-key-path">کلید، مسیر و آدرس عمومی</DocH3>
                <DocTable
                    headers={['اصطلاح', 'یعنی', 'مثال']}
                    rows={[
                        ['کلید (key)', 'نام شیء داخل باکت؛ بین همهٔ استوریج‌ها یکسان است', <Code key="k">hosheton/videos/23be…-clip.mp4</Code>],
                        ['آدرس عمومی پایه (public base)', 'ابتدای آدرسی که مرورگر فایل را از آن می‌گیرد', <Code key="b">https://c780242.parspack.net</Code>],
                        ['مسیر (path)', 'آدرس کامل ذخیره‌شده روی رکورد فایل — همان استوریجی که فایل رویش آپلود شد', <Code key="p">https://eu2.contabostorage.com/…:hosheton/hosheton/videos/23be…-clip.mp4</Code>],
                    ]}
                />
                <p>
                    قاعدهٔ مهم: <strong>کلید</strong> نمی‌گوید فایل کجاست؛ <strong>path</strong> می‌گوید. آدرسی که از روی کلید ساخته شود
                    همیشه به استوریج <em>فعال</em> اشاره می‌کند و برای فایلی که قبل از عوض‌شدن استوریج آپلود شده ۴۰۴ می‌دهد.
                </p>

                <DocH3 id="concepts-active-fallback">استوریج فعال و بک‌آپ</DocH3>
                <ul>
                    <li><strong>فعال:</strong> تنها جایی که آپلود جدید می‌رود. یا تنظیم پنل است یا env.</li>
                    <li>
                        <strong>بک‌آپ فقط‌خواندنی:</strong> استوریج‌هایی که قبلاً فعال بوده‌اند. خواندن، چک وجود، ساختن آدرس فایل
                        موجود و حذف، بعد از استوریج فعال سراغ این‌ها می‌روند. هیچ‌چیز رویشان آپلود نمی‌شود.
                    </li>
                </ul>
                <DocTable
                    headers={['وضعیت پنل', 'استوریج فعال', 'بک‌آپ‌ها (به ترتیب)']}
                    rows={[
                        ['خاموش یا ناقص', 'env', 'استوریج‌های قبلی پنل (اگر قبلاً فعال بوده‌اند)'],
                        ['روشن', 'تنظیم پنل', 'استوریج‌های قبلی پنل (جدیدترین اول) ← env'],
                    ]}
                />

                <DocH3 id="concepts-bucket-host">endpoint اختصاصی باکت (پارس‌پک)</DocH3>
                <p>
                    پارس‌پک برای هر باکت یک میزبان می‌دهد: <Code>c780242.parspack.net</Code> خودش باکت <Code>c780242</Code> است.
                    سرور این را تشخیص می‌دهد و درخواست‌های S3 را path-style به همان میزبان می‌فرستد
                    (<Code>/c780242/key</Code>)؛ آدرس عمومی هم بدون نام باکت ساخته می‌شود
                    (<Code>https://c780242.parspack.net/key</Code>). اگر نام باکت با بخش اول آدرس یکی نباشد، فرم هشدار می‌دهد و
                    تست با AccessDenied رد می‌شود.
                </p>
            </>
        ),
    },
    {
        id: 'setup',
        title: 'راه‌اندازی قدم‌به‌قدم',
        headings: [
            { id: 'setup-bucket', title: 'ساخت باکت و کلید' },
            { id: 'setup-form', title: 'پر کردن فرم' },
            { id: 'setup-activate', title: 'تست و فعال‌سازی' },
        ],
        body: (
            <>
                <DocH3 id="setup-bucket">ساخت باکت و کلید</DocH3>
                <DocSteps>
                    <li>در پنل ارائه‌دهنده (مثلاً پارس‌پک) یک باکت بسازید و دسترسی آن را <strong>عمومی (Public / public-read)</strong> کنید — کاربران فایل‌ها را مستقیم از آن می‌خوانند.</li>
                    <li>یک کلید دسترسی با اجازهٔ <strong>خواندن و نوشتن</strong> روی همان باکت بسازید (Access Key + Secret Key).</li>
                    <li>اگر CDN جلوی باکت دارید، آدرس CDN را هم آماده کنید (اختیاری).</li>
                </DocSteps>

                <DocH3 id="setup-form">پر کردن فرم</DocH3>
                <CodeBlock caption="نمونهٔ پارس‌پک">{PARSPACK_EXAMPLE}</CodeBlock>
                <p>
                    Secret Key فقط نوشته می‌شود و دیگر نمایش داده نمی‌شود؛ بعداً اگر خالی بماند یعنی «همان کلید قبلی را نگه دار».
                </p>

                <DocH3 id="setup-activate">تست و فعال‌سازی</DocH3>
                <DocSteps>
                    <li>«تست اتصال» را بزنید؛ هر سه مرحله (آپلود، خواندن از آدرس عمومی، حذف) باید سبز شوند.</li>
                    <li>تیک «استفاده از این استوریج برای همهٔ فایل‌های جدید» را بزنید و ذخیره کنید. سرور قبل از ذخیره دوباره تست می‌کند؛ با تست ناموفق چیزی فعال نمی‌شود و آپلودهای سایت قطع نمی‌شود.</li>
                    <li>در بخش «فایل‌های قدیمی و استوریج‌های قبلی» ببینید استوریج قبلی به‌عنوان بک‌آپ آمده و تعداد فایل‌هایش درست است.</li>
                    <li>یک فایل قدیمی را در ابزار «این فایل کجاست؟» امتحان کنید؛ باید «روی استوریج بک‌آپ» پیدا شود.</li>
                </DocSteps>
                <Callout tone="warn" title="قبل از فعال‌سازی در production">
                    میزبان جدید باید در فهرست میزبان‌های مجاز تصویر استودیو باشد (<Code>next.config.ts</Code> و
                    <Code>app/lib/media-storage-hosts.ts</Code> در hosheton_studio)؛ <Code>**.parspack.net</Code> از قبل هست.
                    برای ارائه‌دهندهٔ تازه هر دو را به‌روز کنید وگرنه پیش‌نمایش‌ها و دانلود باز نمی‌شوند.
                </Callout>
            </>
        ),
    },
    {
        id: 'fields',
        title: 'فیلدهای فرم',
        body: (
            <DocTable
                headers={['فیلد', 'معنی', 'مثال / پیش‌فرض', 'نکته']}
                rows={[
                    ['آدرس endpoint', 'آدرس API سازگار با S3', <Code key="e">c780242.parspack.net</Code>, 'بدون https هم پذیرفته می‌شود؛ اسلش انتها حذف می‌شود.'],
                    ['نام باکت', 'باکت مقصد', <Code key="b">c780242</Code>, 'در پارس‌پک خودکار از endpoint پر می‌شود.'],
                    ['Access Key / Secret Key', 'کلید دسترسی خواندن/نوشتن', '—', 'Secret هرگز به پنل برنمی‌گردد؛ خالی = حفظ قبلی.'],
                    ['آدرس عمومی فایل‌ها', 'پایهٔ آدرس فایل‌های جدید (CDN)', 'خالی → endpoint یا endpoint/bucket', 'آدرس خام endpoint هم شناخته می‌شود تا لینک‌های هر دو شکل کار کنند.'],
                    ['Region', 'منطقهٔ S3', <Code key="r">us-east-1</Code>, 'استوریج‌های داخلی معمولاً region ندارند.'],
                    ['حداکثر زمان هر درخواست', 'timeout درخواست S3 (ms)', '۶۰۰۰۰ (بین ۵۰۰۰ تا ۶۰۰۰۰۰)', 'اتصال ۱۰ ثانیه timeout و ۳ تلاش دارد.'],
                    ['path-style', 'آدرس‌دهی endpoint/bucket/key', 'روشن', 'برای پارس‌پک، آروان و MinIO روشن بماند.'],
                    ['استفاده از این استوریج', 'فعال‌سازی', 'خاموش', 'خاموش‌کردن بعدی، این استوریج را بک‌آپ می‌کند (فایل‌هایش خوانده می‌شوند).'],
                ]}
            />
        ),
    },
    {
        id: 'test',
        title: 'تست اتصال و خطاهای رایج',
        headings: [
            { id: 'test-steps', title: 'سه مرحلهٔ تست' },
            { id: 'test-errors', title: 'خطا ← راه‌حل' },
        ],
        body: (
            <>
                <DocH3 id="test-steps">سه مرحلهٔ تست</DocH3>
                <DocTable
                    headers={['مرحله', 'چه می‌کند', 'اگر شکست بخورد']}
                    rows={[
                        ['آپلود', <>یک فایل متنی در <Code>{'{app}/healthcheck/…'}</Code> می‌گذارد (با public-read؛ اگر استوریج ACL را نپذیرد بدون آن دوباره)</>, 'کلید، نام باکت یا اجازهٔ نوشتن مشکل دارد.'],
                        ['خواندن از آدرس عمومی', 'همان فایل را از آدرس عمومی می‌خواند (کاری که مرورگر کاربر می‌کند)', 'باکت عمومی نیست یا آدرس عمومی/CDN غلط است.'],
                        ['حذف', 'فایل آزمایشی را پاک می‌کند', 'کلید اجازهٔ حذف ندارد (حذف فایل کاربران هم کار نخواهد کرد).'],
                    ]}
                />
                <DocH3 id="test-errors">خطا ← راه‌حل</DocH3>
                <DocTable
                    headers={['خطا', 'علت', 'راه‌حل']}
                    rows={[
                        [<Code key="1">NoSuchBucket</Code>, 'باکتی با این نام نیست', 'نام باکت را از پنل ارائه‌دهنده کپی کنید.'],
                        [<Code key="2">InvalidAccessKeyId</Code>, 'Access Key اشتباه', 'کلید را دوباره بسازید/کپی کنید.'],
                        [<Code key="3">SignatureDoesNotMatch</Code>, 'Secret با Access جفت نیست', 'Secret همان کلید را وارد کنید.'],
                        [<Code key="4">AccessDenied</Code>, 'کلید به این باکت دسترسی ندارد یا نام باکت با میزبان پارس‌پک نمی‌خواند', 'در پارس‌پک نام باکت = بخش اول آدرس؛ کلید خواندن/نوشتن بسازید.'],
                        ['HTTP 403 در خواندن عمومی', 'باکت خصوصی است', 'دسترسی باکت را Public کنید.'],
                        [<Code key="5">STORAGE_DNS_ERROR</Code>, 'سرور API نام endpoint را resolve نمی‌کند', 'آدرس endpoint و DNS سرور را چک کنید.'],
                    ]}
                />
            </>
        ),
    },
    {
        id: 'switching',
        title: 'عوض‌کردن استوریج و فایل‌های قدیمی',
        headings: [
            { id: 'switching-what', title: 'چه چیزی عوض می‌شود و چه چیزی نه' },
            { id: 'switching-retired', title: 'فهرست استوریج‌های قبلی (retired)' },
            { id: 'switching-order', title: 'ترتیب جستجوی فایل' },
            { id: 'switching-disable', title: 'خاموش کردن استوریج پنل' },
            { id: 'switching-instances', title: 'چند سرور و درخواست‌های در جریان' },
        ],
        body: (
            <>
                <DocH3 id="switching-what">چه چیزی عوض می‌شود و چه چیزی نه</DocH3>
                <ul>
                    <li>آپلودها، خروجی مدل‌ها، تامبنیل‌ها و بک‌آپ‌های <strong>جدید</strong> فقط روی استوریج فعال جدید می‌روند.</li>
                    <li>فایل‌های <strong>قدیمی</strong> سر جایشان می‌مانند و path رکوردشان (و لینک‌هایی که در چت، گره‌ها و قالب‌ها ذخیره شده) همان آدرس قبلی است. مرورگر کاربران مثل قبل از همان آدرس می‌خواند.</li>
                    <li>هر جا خود سرور فایل را لازم دارد (ارسال به ارائه‌دهندهٔ AI، ساخت پیش‌نمایش، تامبنیل، پروکسی ویدیو) از روی کلید آن را در استوریج فعال و بعد بک‌آپ‌ها پیدا می‌کند.</li>
                </ul>
                <Callout tone="danger" title="شرط کار کردن فایل‌های قدیمی">
                    استوریج قبلی باید روشن، عمومی و با همان کلیدها در دسترس بماند. اگر سرویس قبلی (مثلاً Contabo) را تمدید نکنید
                    یا کلیدش را باطل کنید، فایل‌هایی که هنوز رویش هستند از دست می‌روند — عدد «فایل‌ها» در بخش وضعیت را قبلش ببینید.
                </Callout>

                <DocH3 id="switching-retired">فهرست استوریج‌های قبلی (retired)</DocH3>
                <p>
                    وقتی استوریج فعالِ پنل را با باکت/endpoint دیگری عوض می‌کنید یا خاموشش می‌کنید، تنظیم قبلی <em>با کلیدهایش</em> در
                    آرایهٔ <Code>retired</Code> همان تنظیم ذخیره می‌شود (جدیدترین اول، حداکثر ۵ مورد). برگشتن به همان استوریج، آن را از
                    فهرست برمی‌دارد. عوض‌کردن فقط timeout یا CDN همان باکت، چیزی را retired نمی‌کند. استوریج env چون در فایل سرور است
                    همیشه بک‌آپ است و در این فهرست نمی‌آید.
                </p>
                <CodeBlock caption="شکل ذخیرهٔ تنظیم">{STORED_VALUE}</CodeBlock>

                <DocH3 id="switching-order">ترتیب جستجوی فایل</DocH3>
                <CodeBlock caption="نمونه: ویدیوی قدیمی چت بعد از رفتن به پارس‌پک">{LOOKUP_FLOW}</CodeBlock>
                <p>
                    اگر آدرس کامل داده شود (نه کلید)، اول همان استوریجی که آدرس به آن تعلق دارد پرسیده می‌شود. خطای «شیء نیست»
                    (NoSuchKey / 404) سراغ استوریج بعدی می‌رود؛ خطای شبکه هم ثبت و بعد استوریج بعدی امتحان می‌شود و اگر هیچ‌کدام
                    فایل را نداشتند همان خطای اول برمی‌گردد.
                </p>

                <DocH3 id="switching-disable">خاموش کردن استوریج پنل</DocH3>
                <p>
                    با خاموش کردن، env دوباره فعال می‌شود و استوریج پنل به retired می‌رود؛ یعنی فایل‌هایی که در این مدت روی پارس‌پک
                    آپلود شده بودند همچنان خوانده و حذف می‌شوند.
                </p>

                <DocH3 id="switching-instances">چند سرور و درخواست‌های در جریان</DocH3>
                <ul>
                    <li>هر نمونهٔ API هر ۶۰ ثانیه تنظیم را دوباره می‌خواند؛ کلاینت S3 فقط وقتی تنظیم واقعاً عوض شده باشد از نو ساخته می‌شود.</li>
                    <li>کلاینت‌های قبلی ۱۵ دقیقه زنده می‌مانند تا آپلود/دانلودهای در جریان قطع نشوند.</li>
                    <li>اگر خواندن تنظیم از دیتابیس خطا بدهد، استوریج فعلی دست نمی‌خورد.</li>
                </ul>
            </>
        ),
    },
    {
        id: 'runtime',
        title: 'رفتار سرور: خواندن، آدرس، حذف',
        body: (
            <>
                <DocTable
                    headers={['عملیات', 'متد', 'رفتار']}
                    rows={[
                        ['آپلود', <Code key="u">uploadFile / putObject / multipart</Code>, 'فقط استوریج فعال؛ path رکورد = آدرس عمومی همان.'],
                        ['خواندن بایت‌ها', <Code key="r">readFileAsBuffer</Code>, 'فعال ← بک‌آپ‌ها؛ URL بیرونی (غیر از استوریج‌های خودمان) مستقیم دانلود می‌شود.'],
                        ['متن فایل', <Code key="t">getFileContentAsString</Code>, 'مثل خواندن بایت‌ها.'],
                        ['وجود فایل', <Code key="h">hasObject</Code>, 'HEAD روی فعال ← بک‌آپ‌ها.'],
                        ['جای فایل', <Code key="l">locateObject</Code>, 'کدام استوریج دارد + آدرس عمومی روی همان؛ نتیجه ۱۰ دقیقه کش (نبودن ۱ دقیقه).'],
                        ['آدرس فایل موجود', <Code key="p">resolvePublicFileUrl</Code>, 'آدرس روی استوریجی که واقعاً فایل را دارد؛ null = هیچ‌جا.'],
                        ['آدرس فایل تازه', <Code key="b">buildPublicFileUrl</Code>, 'همیشه استوریج فعال — فقط برای فایلی که همین الان آپلود شده.'],
                        ['اطلاعات فایل', <Code key="g">GET /api/file/:id</Code>, 'publicUrl = path ذخیره‌شده (اگر روی یکی از استوریج‌های خودمان است).'],
                        ['حذف', <Code key="d">deleteFileByKey / deleteFile / purge</Code>, 'روی فعال و همهٔ بک‌آپ‌ها؛ خطای بک‌آپ حذف را خراب نمی‌کند (breadcrumb ثبت می‌شود).'],
                    ]}
                />
                <Callout tone="note" title="شمای کلیدها">
                    آپلود کاربر: <Code>{'{APPLICATION_NAME}/{images|videos|audios|files}/{uuid}-{name}'}</Code> — خروجی تصویر AI:
                    {' '}<Code>{'images/{app}/{uuid}-{name}'}</Code> — بهینهٔ چت: <Code>{'images/{app}/optimized/…'}</Code> — بک‌آپ:
                    {' '}<Code>{'{app}/backups/…'}</Code>. کلیدها بین استوریج‌ها ثابت‌اند؛ برای همین جست‌وجو در بک‌آپ‌ها با همان کلید کار می‌کند.
                </Callout>
            </>
        ),
    },
    {
        id: 'uploads',
        title: 'آپلود: همه‌چیز به استوریج فعال',
        headings: [
            { id: 'uploads-flow', title: 'مسیر آپلود چندتکه' },
            { id: 'uploads-sessions', title: 'آپلود نیمه‌کاره و عوض‌شدن استوریج' },
        ],
        body: (
            <>
                <DocH3 id="uploads-flow">مسیر آپلود چندتکه</DocH3>
                <p>
                    تصویر، ویدیو، صوت و هر فایل دیگری که در چت استودیو، پنل یا هر اپ دیگر آپلود شود از یک مسیر می‌گذرد و همیشه روی
                    <strong> استوریج فعال</strong> می‌نشیند — اگر تیک استوریج پنل روشن باشد همان، وگرنه env:
                </p>
                <DocSteps>
                    <li><Code>POST /api/file/s3/init-upload</Code> روی استوریج فعال یک multipart upload باز می‌کند و <Code>uploadId</Code>، <Code>fileKey</Code> و <Code>storageId</Code> برمی‌گرداند.</li>
                    <li>برای هر تکهٔ ۵ مگابایتی <Code>get-chunk-url</Code> یک آدرس امضاشده روی همان استوریج می‌دهد و مرورگر تکه را مستقیم آنجا PUT می‌کند (CORS باکت باید PUT را بپذیرد و ETag را برگرداند).</li>
                    <li><Code>complete-upload</Code> تکه‌ها را یکی می‌کند، رکورد فایل با path روی همان استوریج ساخته می‌شود و تامبنیل در صف تولید می‌شود.</li>
                </DocSteps>
                <DocH3 id="uploads-sessions">آپلود نیمه‌کاره و عوض‌شدن استوریج</DocH3>
                <p>
                    آپلودکنندهٔ مرورگر یک آپلود نیمه‌کاره را (با نام و حجم فایل) نگه می‌دارد تا بعداً ادامه دهد. multipart upload فقط روی
                    استوریجی وجود دارد که بازش کرده؛ اگر بین دو تلاش استوریج عوض شده باشد، ادامه‌دادن یعنی فرستادن تکه‌ها به آپلودی که
                    وجود ندارد. برای همین:
                </p>
                <ul>
                    <li>سرور <Code>storageId</Code> هر جلسه را چک می‌کند و جلسهٔ استوریج دیگر را با <Code>409 UPLOAD_STORAGE_CHANGED</Code> رد می‌کند.</li>
                    <li>آپلودکننده جلسهٔ رد‌شده، بدون storageId یا قدیمی‌تر از ۱۲ ساعت را دور می‌ریزد و یک‌بار از اول روی استوریج فعال آپلود می‌کند.</li>
                </ul>
                <Callout tone="note">
                    هر اپی که آپلودکنندهٔ چندتکهٔ خودش را دارد باید <Code>storageId</Code> پاسخ init را نگه دارد و با get-chunk-url و
                    complete-upload بفرستد (نمونه: <Code>hosheton_studio/…/lib/chunk-uploader.ts</Code>).
                </Callout>
            </>
        ),
    },
    {
        id: 'transfer',
        title: 'انتقال امن فایل‌ها به استوریج فعال',
        headings: [
            { id: 'transfer-how', title: 'چطور کار می‌کند' },
            { id: 'transfer-safety', title: 'ضمانت‌های امنیت داده' },
            { id: 'transfer-steps', title: 'قدم‌ها در پنل' },
            { id: 'transfer-rollback', title: 'بازگرداندن' },
        ],
        body: (
            <>
                <DocH3 id="transfer-how">چطور کار می‌کند</DocH3>
                <p>
                    بخش «انتقال فایل‌ها به استوریج فعال» فایل‌هایی را نشان می‌دهد که path آن‌ها هنوز روی یک استوریج بک‌آپ است. می‌توانید
                    تک‌تک انتخاب کنید یا همه را (با فیلتر نوع). برای هر رکورد، خود فایل و تامبنیل‌هایش با همان کلید روی استوریج فعال
                    کپی و تأیید می‌شوند و بعد آدرس رکورد به استوریج فعال عوض می‌شود.
                </p>
                <DocH3 id="transfer-safety">ضمانت‌های امنیت داده</DocH3>
                <DocTable
                    headers={['ضمانت', 'چطور']}
                    rows={[
                        ['مبدأ دست نمی‌خورد', 'هیچ فایلی از استوریج قبلی پاک یا بازنویسی نمی‌شود.'],
                        ['کپی تأییدشده', 'حجم خوانده‌شده = حجم مبدأ؛ MD5 دانلود = ETag مبدأ؛ هدر Content-MD5 با آپلود فرستاده می‌شود؛ بعد از نوشتن حجم و ETag مقصد دوباره چک می‌شود؛ آدرس عمومی مقصد باید ۲۰۰ بدهد.'],
                        ['بدون بازنویسی', 'اگر در مقصد فایلی با همان کلید ولی محتوای دیگر باشد، کپی نمی‌شود و با DESTINATION_DIFFERS در خطاها می‌آید.'],
                        ['تغییر آدرس فقط بعد از تأیید', 'رکورد فقط وقتی عوض می‌شود که همهٔ کپی‌هایش تأیید شده و path رکورد هنوز همان قبلی است.'],
                        ['قابل برگشت', 'آدرس‌های قبلی روی رکورد (storageTransfer.from) می‌ماند.'],
                        ['قابل ادامه', 'پیشرفت در کالکشن storage_jobs؛ با ری‌استارت سرور ادامه می‌دهد؛ فایل کپی‌شده دوباره کپی نمی‌شود.'],
                        ['یک اجراکننده', 'هر کار lease دارد؛ دو نمونهٔ API هم‌زمان یک کار را اجرا نمی‌کنند.'],
                    ]}
                />
                <DocH3 id="transfer-steps">قدم‌ها در پنل</DocH3>
                <DocSteps>
                    <li>مبدأ (استوریج بک‌آپ) و در صورت نیاز نوع فایل را انتخاب کنید.</li>
                    <li>چند فایل را تیک بزنید و «انتقال انتخاب‌شده‌ها»؛ در «کارهای استوریج» نتیجه را ببینید و یکی را باز کنید.</li>
                    <li>اگر درست بود «انتقال همه». فایل‌های ناموفق با کد خطا فهرست می‌شوند؛ اجرای دوباره فقط باقی‌مانده‌ها را امتحان می‌کند.</li>
                    <li>وقتی عدد «فایل‌ها» برای استوریج قبلی در جدول وضعیت صفر شد، می‌توانید (اگر لینک‌های قدیمی داخل محتوا مهم نیستند) آن را از بک‌آپ‌ها حذف کنید.</li>
                </DocSteps>
                <DocH3 id="transfer-rollback">بازگرداندن</DocH3>
                <p>
                    «بازگرداندن آدرس یک فایل» با شناسهٔ فایل، رکورد را به آدرس قبل از آخرین انتقال برمی‌گرداند. چون هر دو کپی سر جایشان
                    هستند، این کار بی‌خطر است.
                </p>
            </>
        ),
    },
    {
        id: 'backup',
        title: 'بک‌آپ و بازگردانی',
        headings: [
            { id: 'backup-what', title: 'بک‌آپ چه چیزی را نگه می‌دارد' },
            { id: 'backup-setup', title: 'تنظیم استوریج بک‌آپ' },
            { id: 'backup-restore', title: 'بالا آوردن پلتفرم روی استوریج جدید' },
        ],
        body: (
            <>
                <DocH3 id="backup-what">بک‌آپ چه چیزی را نگه می‌دارد</DocH3>
                <ul>
                    <li>همهٔ objectهای این اپ روی استوریج فعال و همهٔ بک‌آپ‌ها، با همان کلید، در یک باکت جدا.</li>
                    <li>فقط پیشوندهای همین اپ (پیش‌فرض <Code>{'{app}/'}</Code>، <Code>{'images/{app}/'}</Code>، <Code>{'videos/{app}/'}</Code>، <Code>{'audios/{app}/'}</Code>) — فایل اپ‌های دیگرِ همان باکت نه.</li>
                    <li>افزایشی: فایلی که با همان محتوا در بک‌آپ هست دوباره کپی نمی‌شود.</li>
                    <li>بعد از هر بک‌آپ یک manifest در <Code>_storage-backups/</Code> همان باکت (منابع، پیشوندها، تعداد و حجم).</li>
                    <li>رکوردهای دیتابیس جزو این بک‌آپ نیستند؛ بک‌آپ دیتابیس از «تنظیمات ← دیتابیس» گرفته می‌شود.</li>
                </ul>
                <DocH3 id="backup-setup">تنظیم استوریج بک‌آپ</DocH3>
                <p>
                    باکت بک‌آپ باید غیر از استوریج فعال و بک‌آپ‌ها باشد (سرور این را چک می‌کند) و بهتر است نزد ارائه‌دهنده یا دیتاسنتر
                    دیگری باشد. عمومی بودن لازم نیست. ذخیره فقط بعد از تست موفق (نوشتن، خواندن، حذف) انجام می‌شود. تنظیم در
                    {' '}<Code>systemSettings</Code> با کلید <Code>storage.backup</Code> است و Secret آن هرگز به پنل برنمی‌گردد.
                </p>
                <DocH3 id="backup-restore">بالا آوردن پلتفرم روی استوریج جدید</DocH3>
                <DocSteps>
                    <li>دیتابیس را از بک‌آپ دیتابیس برگردانید (اگر لازم است).</li>
                    <li>در بالای صفحهٔ تنظیمات، استوریج جدید (با هر آدرسی) را وارد، تست و فعال کنید.</li>
                    <li>در «بک‌آپ و بازگردانی» همان استوریج بک‌آپ را وارد کنید (اگر از قبل نیست) و «بازگردانی روی استوریج فعال» را بزنید؛ تیک «آدرس رکوردها عوض شود» روشن بماند.</li>
                    <li>بازگردانی اول همهٔ فایل‌ها را کپی و تأیید می‌کند، بعد هر رکوردی را که فایلش روی استوریج جدید هست به آدرس جدید می‌برد (آدرس قبلی برای برگشت می‌ماند).</li>
                    <li>میزبان استوریج جدید را به فهرست میزبان‌های مجاز تصویر/دانلود اپ‌های فرانت اضافه کنید.</li>
                </DocSteps>
                <Callout tone="warn" title="لینک‌های داخل محتوا">
                    URLهایی که داخل چت‌ها، گره‌های پروژه و قالب‌ها ذخیره شده‌اند بازنویسی نمی‌شوند. سرور برای پردازش، فایل را با کلید
                    پیدا می‌کند؛ ولی مرورگر کاربر همان آدرس قدیمی را باز می‌کند. اگر میزبان قدیمی دیگر وجود ندارد، همان دامنه/CDN قبلی را به
                    استوریج جدید وصل کنید (آدرس عمومی پایه) تا لینک‌های قدیمی هم کار کنند.
                </Callout>
            </>
        ),
    },
    {
        id: 'ai-providers',
        title: 'ارسال فایل به ارائه‌دهندهٔ AI',
        headings: [
            { id: 'ai-stash', title: 'کپی موقت روی گیت‌وی' },
            { id: 'ai-fallback', title: 'وقتی گیت‌وی نیست' },
            { id: 'ai-incident', title: 'نمونهٔ واقعی: Nano Banana 2 و ویدیوی قدیمی' },
        ],
        body: (
            <>
                <DocH3 id="ai-stash">کپی موقت روی گیت‌وی</DocH3>
                <p>
                    ارائه‌دهنده‌ها (Atlas، fal و…) خارج از ایران‌اند و ممکن است به استوریج داخلی دسترسی نداشته باشند. برای همین worker
                    فایل مرجع را از استوریج می‌خواند و یک کپی موقت روی گیت‌وی AI (<Code>ai-gateway…/stash/…</Code>) می‌گذارد و همان
                    آدرس را به ارائه‌دهنده می‌دهد. خواندن فایل از مسیر «فعال ← بک‌آپ» انجام می‌شود، پس فایل قدیمی هم کپی می‌شود.
                </p>
                <DocH3 id="ai-fallback">وقتی گیت‌وی نیست</DocH3>
                <ul>
                    <li>آدرس با <Code>resolvePublicFileUrl</Code> روی استوریجی ساخته می‌شود که فایل واقعاً آنجاست — نه آدرس چک‌نشدهٔ استوریج فعال.</li>
                    <li>ویدیو/صوت مرجعی که روی هیچ استوریجی نیست، قبل از ارسال با <Code>STUDIO_REFERENCE_FILE_MISSING</Code> متوقف می‌شود (هزینه‌ای کسر نمی‌شود).</li>
                    <li>تصویر مرجعِ پیدا‌نشده به آدرس ذخیره‌شدهٔ خودش برمی‌گردد و یک breadcrumb خطا ثبت می‌شود.</li>
                </ul>
                <DocH3 id="ai-incident">نمونهٔ واقعی: Nano Banana 2 و ویدیوی قدیمی</DocH3>
                <p>
                    ویدیویی که ۱۹ مهر روی Contabo آپلود شده بود، بعد از فعال‌شدن پارس‌پک (۲۱ مهر) در چت به Nano Banana 2 داده شد. خواندن
                    فقط از پارس‌پک انجام می‌شد، کپی روی گیت‌وی شکست خورد و worker آدرس ساخته‌شده از کلید روی پارس‌پک را فرستاد که ۴۰۴
                    بود؛ Atlas هم فقط گفت «stream has been aborted» و چهار تلاش پشت‌سرهم شکست خورد. حالا همان فایل از Contabo خوانده
                    می‌شود و اگر جایی نبود، پایش خطا در تب «درخواست ارائه‌دهنده» می‌گوید <Code>video_clips[0].url → HTTP 404</Code>.
                </p>
            </>
        ),
    },
    {
        id: 'status-tools',
        title: 'وضعیت فایل‌ها و ابزار «این فایل کجاست؟»',
        body: (
            <>
                <p>
                    در <Link href="/files/settings">فایل‌ها ← تنظیمات</Link> بخش «فایل‌های قدیمی و استوریج‌های قبلی» دو ابزار دارد:
                </p>
                <ul>
                    <li>
                        <strong>جدول وضعیت:</strong> برای هر استوریج (فعال و بک‌آپ‌ها) تعداد و حجم رکوردهای فایل که path آن‌ها روی
                        همان استوریج است. این شمارش از دیتابیس است، نه فهرست‌گرفتن از باکت؛ ردیف «آدرس ناشناخته» یعنی رکوردهایی که
                        path آن‌ها به هیچ استوریج شناخته‌شده‌ای نمی‌خورد.
                    </li>
                    <li>
                        <strong>این فایل کجاست؟</strong> کلید یا آدرس کامل را بدهید؛ همهٔ استوریج‌ها به ترتیب چک می‌شوند و جواب همان
                        آدرسی است که سرور به ارائه‌دهندهٔ AI می‌دهد. «روی هیچ استوریجی نیست» یعنی فایل پاک شده یا استوریجش از
                        بک‌آپ‌ها حذف شده — کاربر باید دوباره آپلود کند.
                    </li>
                </ul>
            </>
        ),
    },
    {
        id: 'remove-retired',
        title: 'حذف استوریج قبلی از بک‌آپ‌ها',
        body: (
            <>
                <p>
                    دکمهٔ «حذف از بک‌آپ‌ها» کنار هر استوریج قبلی پنل، آن را از زنجیرهٔ جستجو بیرون می‌برد. فقط وقتی انجامش دهید که:
                </p>
                <ul>
                    <li>عدد «فایل‌ها» برای آن استوریج صفر است، یا</li>
                    <li>فایل‌هایش را با همان کلیدها به استوریج فعال کپی کرده‌اید، یا</li>
                    <li>آن فایل‌ها عمداً دیگر لازم نیستند.</li>
                </ul>
                <Callout tone="warn">
                    حذف از فهرست به خود فایل‌ها دست نمی‌زند؛ فقط سرور دیگر سراغشان نمی‌رود. لینک‌های مستقیم ذخیره‌شده در مرورگر کاربران
                    تا وقتی خود استوریج روشن است باز می‌شوند، ولی ارسال به AI و ساخت پیش‌نمایش برای آن فایل‌ها «پیدا نشد» می‌شود.
                </Callout>
            </>
        ),
    },
    {
        id: 'monitoring',
        title: 'پایش خطا و عیب‌یابی',
        headings: [
            { id: 'monitoring-events', title: 'چه چیزی در پایش خطا دیده می‌شود' },
            { id: 'monitoring-checklist', title: 'چک‌لیست «فایل پیدا نشد»' },
        ],
        body: (
            <>
                <DocH3 id="monitoring-events">چه چیزی در پایش خطا دیده می‌شود</DocH3>
                <ul>
                    <li>
                        <strong>Breadcrumb با دستهٔ <Code>storage</Code>:</strong> خوانده‌شدن فایل از بک‌آپ، خطای خواندن روی یک
                        استوریج، «روی هیچ استوریجی نیست» و خطای حذف روی بک‌آپ. روی رویداد خطای همان درخواست/اجرا می‌نشیند.
                    </li>
                    <li><strong>Breadcrumb با دستهٔ <Code>reference</Code>:</strong> هر فایل مرجعی که به چه آدرسی برای ارائه‌دهنده تبدیل شد.</li>
                    <li>
                        <strong>سرویس «درخواست به ارائه‌دهندهٔ AI»:</strong> هر درخواست ناموفق به ارائه‌دهنده با بدنهٔ ارسالی، پاسخ، و
                        وضعیت HTTP هر URL ورودی؛ کادر «تشخیص خودکار» می‌گوید کدام ورودی قابل دریافت نبوده.
                    </li>
                </ul>
                <p>
                    از <Link href="/error-tracking/issues">پایش خطا ← مشکلات</Link> فیلتر «سرویس» را روی «درخواست به ارائه‌دهندهٔ AI» بگذارید.
                </p>
                <DocH3 id="monitoring-checklist">چک‌لیست «فایل پیدا نشد»</DocH3>
                <DocSteps>
                    <li>کلید فایل را از رویداد یا رکورد فایل بردارید و در «این فایل کجاست؟» بزنید.</li>
                    <li>اگر روی بک‌آپ است ولی ارائه‌دهنده خطا داده: آدرس عمومی بک‌آپ از بیرون باز می‌شود؟ (عمومی بودن باکت، روشن بودن سرویس)</li>
                    <li>اگر هیچ‌جا نیست: در جدول وضعیت ببینید استوریجی حذف شده یا path رکورد به میزبان ناشناخته اشاره می‌کند.</li>
                    <li>در رویداد، تب Breadcrumbs را بخوانید؛ هشدارهای storage و reference همان اجرا آنجاست.</li>
                </DocSteps>
            </>
        ),
    },
    {
        id: 'dev-rules',
        title: 'قواعد برای توسعه‌دهنده',
        headings: [
            { id: 'dev-do', title: 'درست' },
            { id: 'dev-dont', title: 'نادرست' },
            { id: 'dev-frontend', title: 'فرانت‌اند' },
        ],
        body: (
            <>
                <DocH3 id="dev-do">درست</DocH3>
                <CodeBlock>{DEV_DO}</CodeBlock>
                <DocH3 id="dev-dont">نادرست</DocH3>
                <CodeBlock>{DEV_DONT}</CodeBlock>
                <DocH3 id="dev-frontend">فرانت‌اند</DocH3>
                <ul>
                    <li>آدرس فایل را از پاسخ API بگیرید (<Code>path</Code>، <Code>url</Code>، <Code>publicUrl</Code>)؛ API همیشه آدرس استوریجی را می‌دهد که فایل رویش است.</li>
                    <li>متغیرهای <Code>NEXT_PUBLIC_S3_*</Code> ثابت‌اند و تنظیم پنل را نمی‌بینند؛ فقط به‌عنوان آخرین fallback وقتی هیچ آدرسی نیست.</li>
                    <li>میزبان استوریج تازه را به فهرست میزبان‌های مجاز تصویر/دانلود اپ اضافه کنید.</li>
                </ul>
            </>
        ),
    },
    {
        id: 'api',
        title: 'مرجع API',
        body: (
            <>
                <p>همه با JWT و نقش ادمین؛ پاسخ‌ها کلید Secret (چه فعال، چه قبلی) را هرگز ندارند.</p>
                <DocTable
                    headers={['متد و مسیر', 'کار']}
                    rows={[
                        [<Code key="1">GET /api/file/storage-settings</Code>, 'تنظیم فعلی + استوریج در حال اجرا + بک‌آپ‌ها + فهرست retired (بدون کلید)'],
                        [<Code key="2">PUT /api/file/storage-settings</Code>, 'ذخیره؛ اگر enabled باشد اول تست کامل؛ استوریج جایگزین‌شده به retired می‌رود'],
                        [<Code key="3">POST /api/file/storage-settings/test</Code>, 'تست سه‌مرحله‌ای بدون ذخیره (Secret خالی = کلید ذخیره‌شده)'],
                        [<Code key="4">GET /api/file/storage-settings/status</Code>, 'تعداد و حجم رکوردهای فایل روی هر استوریج'],
                        [<Code key="5">GET /api/file/storage-settings/locate?key=…</Code>, 'کدام استوریج فایل را دارد + آدرس عمومی'],
                        [<Code key="6">DELETE /api/file/storage-settings/retired</Code>, <>حذف یک استوریج قبلی از بک‌آپ‌ها — بدنه: <Code>{'{ endpoint, bucket }'}</Code></>],
                        [<Code key="7">GET /api/file/storage-maintenance/transfer/candidates</Code>, 'فایل‌های یک استوریج بک‌آپ (sourceId، kind، search، page، limit)'],
                        [<Code key="8">POST /api/file/storage-maintenance/transfer</Code>, <>شروع انتقال — <Code>{'{ sourceId, fileIds?, kind? }'}</Code>؛ بدون fileIds یعنی همه</>],
                        [<Code key="9">POST /api/file/storage-maintenance/files/:id/rollback</Code>, 'برگرداندن آدرس رکورد به قبل از آخرین انتقال'],
                        [<Code key="10">GET | PUT /api/file/storage-maintenance/backup</Code>, 'تنظیم استوریج بک‌آپ (ذخیره بعد از تست)'],
                        [<Code key="11">POST /api/file/storage-maintenance/backup/test</Code>, 'تست نوشتن/خواندن/حذف روی باکت بک‌آپ'],
                        [<Code key="12">POST /api/file/storage-maintenance/backup/run</Code>, <>شروع بک‌آپ — <Code>{'{ prefixes? }'}</Code></>],
                        [<Code key="13">POST /api/file/storage-maintenance/restore</Code>, <>بازگردانی روی استوریج فعال — <Code>{'{ prefixes?, relink }'}</Code></>],
                        [<Code key="14">GET /api/file/storage-maintenance/jobs[/:id]</Code>, 'فهرست کارها / جزئیات و خطاهای یک کار'],
                        [<Code key="15">POST /api/file/storage-maintenance/jobs/:id/(pause|resume|cancel)</Code>, 'کنترل کار'],
                    ]}
                />
            </>
        ),
    },
    {
        id: 'limits',
        title: 'محدودیت‌ها و کارهای بعدی',
        body: (
            <ul>
                <li><strong>انتقال همیشه دستی است.</strong> فایل‌ها خودکار منتقل نمی‌شوند؛ از «انتقال فایل‌ها به استوریج فعال» استفاده کنید.</li>
                <li>لینک‌های ذخیره‌شده در چت/گره‌ها/قالب‌ها بازنویسی نمی‌شوند؛ مرورگر کاربر فایل قدیمی را از همان استوریج قبلی می‌گیرد.</li>
                <li>شمارش وضعیت بر اساس path رکوردهاست؛ فایلی که رکورد ندارد (مثلاً پروکسی ویدیو قدیمی) شمرده نمی‌شود.</li>
                <li>هر اپ API دیتابیس core خودش را دارد؛ تنظیم استوریج هر اپ جداست.</li>
            </ul>
        ),
    },
    {
        id: 'faq',
        title: 'سؤالات متداول',
        body: (
            <DocFaq
                items={[
                    ['بعد از فعال‌سازی پارس‌پک، تصویرهای قدیمی سایت خراب می‌شوند؟', 'نه. path آن‌ها همان آدرس قبلی است و سرور هم برای خواندنشان به استوریج قبلی سر می‌زند.'],
                    ['چرا Secret Key را نمی‌بینم؟', 'عمداً هیچ‌وقت به مرورگر برنمی‌گردد. برای تغییر، مقدار جدید را بنویسید؛ خالی یعنی همان قبلی.'],
                    ['استوریج را اشتباه عوض کردم؛ برگردم چه می‌شود؟', 'تنظیم قبلی را دوباره وارد و فعال کنید؛ از فهرست قبلی‌ها حذف و استوریج اشتباه به آن اضافه می‌شود — فایل‌هایی که در این فاصله آپلود شده‌اند هم خوانده می‌شوند.'],
                    ['چرا تست سبز است ولی ارائه‌دهندهٔ AI فایل را نمی‌گیرد؟', 'تست از سرور ما و مرورگر خوانده می‌شود؛ ارائه‌دهنده از خارج. برای همین فایل‌ها از گیت‌وی (کپی موقت) فرستاده می‌شوند. رویداد «درخواست به سرویس بیرونی» در پایش خطا وضعیت هر ورودی را نشان می‌دهد.'],
                    ['چند استوریج قبلی نگه داشته می‌شود؟', 'پنج مورد آخر (به‌علاوهٔ env). قدیمی‌تر از آن از فهرست می‌افتد.'],
                    ['ویدیو را در چت آپلود کردم ولی روی استوریج جدید نیست؟', 'آپلودها همیشه روی استوریج فعال می‌روند. اگر مرورگر آپلود نیمه‌کاره‌ای از قبل از عوض‌شدن استوریج داشته، سرور آن را با UPLOAD_STORAGE_CHANGED رد می‌کند و آپلودکننده از اول روی استوریج فعال آپلود می‌کند. در «این فایل کجاست؟» کلید فایل را بزنید.'],
                    ['انتقال یا بک‌آپ وسط کار متوقف شد؟', 'کارها در دیتابیس ثبت می‌شوند و بعد از ری‌استارت سرور از همان‌جا ادامه می‌دهند؛ «مکث» و «ادامه» هم دارند.'],
                ]}
            />
        ),
    },
];

export default function StorageDocsPage() {
    return (
        <DocPage
            title="راهنمای استوریج فایل‌ها"
            lead="اتصال استوریج از پنل، رفتار سرور هنگام عوض‌کردن استوریج، فایل‌های قدیمی، آپلود، انتقال امن، بک‌آپ و بازگردانی، ارسال فایل به ارائه‌دهندهٔ AI، ابزارهای وضعیت و عیب‌یابی، و قواعدی که کد باید رعایت کند."
            back={{ href: '/files/settings', label: '← فایل‌ها / تنظیمات' }}
        >
            <DocLayout sections={SECTIONS} />
        </DocPage>
    );
}
