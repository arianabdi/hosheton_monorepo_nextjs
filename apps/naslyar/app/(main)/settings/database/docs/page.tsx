'use client';

import Link from 'next/link';
import DocLayout, { Callout, Code, CodeBlock, DocFaq, DocH3, DocPage, DocSteps, DocTable, type DocSection } from '@/app/components/DocLayout/DocLayout';

const DOCKERFILE = `# Dockerfile (production stage) — every API image
RUN apk add --no-cache mongodb-tools && mongodump --version && mongorestore --version`;

const LOCAL_ENV = `# apps/<app>/.env.development — only if the tools are not on PATH
MONGO_TOOLS_PATH=C:/Users/<you>/tools/mongodb-database-tools-windows-x86_64-100.20.1/bin
# Windows MSI default (C:\\Program Files\\MongoDB\\Tools\\<ver>\\bin) is found automatically`;

const DUMP_FLOW = `POST /api/database-admin/backup/run  { db: "core", collections? }
  -> job on databaseBackupQueue (one job at a time)
  -> mongodump --config=<0600 temp file with the uri> --db=<name> --archive=<tmp> --gzip
  -> per-collection counts parsed from "done dumping <db>.<coll> (N documents)"
  -> uploadSystemFile(publicRead: false)   # private object, multipart above 64 MB
  -> files record: metadata { kind: "database-backup", format: "mongodump-archive", gzip: true,
                              database, collectionStats, documentCount, purpose, toolVersion }`;

const RESTORE_FLOW = `POST /api/database-admin/backups/:id/restore  { db, mode, collections?, safetyBackup?, confirm }
  replace / missing -> safety dump of the live collections first (purpose: "pre-restore")
  stream the archive from storage to a temp file
  mongorestore --archive --gzip --nsFrom=<archiveDb>.* --nsTo=<targetDb>.* [--nsInclude=...] [--drop]
     test     -> targetDb = <db>_restoretest (dropped first)
     replace  -> --drop on the restored collections
     missing  -> no --drop: an existing _id is a duplicate and stays untouched
  backup records in "files" are put back exactly as they were (same _id, same types)
  verify: countDocuments() of every restored collection == count in the archive`;

const UPLOAD_FLOW = `POST   backups/upload                 { files: [{ name, size }] }  -> { uploadId, chunkSize: 8 MB }
PUT    backups/upload/:id/chunk?file=0&offset=N   raw application/octet-stream (8 MB)
GET    backups/upload/:id             -> bytes received per file (resume after a network drop)
POST   backups/upload/:id/complete    -> parts joined in .partNN order, archive checked
                                         { ok: true, fileId } | { ok: false, message }
DELETE backups/upload/:id             -> cancel; unfinished uploads are removed after 24 h`;

const EMERGENCY = `# API down, panel unreachable — same file format by hand on the DB host
docker exec <mongo-container> mongodump --uri="mongodb://USER:PASS@127.0.0.1:27017/<db>?authSource=admin" \\
  --archive --gzip > /root/<db>-$(date +%F).archive.gz

# restore into a test copy first
docker exec -i <mongo-container> mongorestore --uri="mongodb://USER:PASS@127.0.0.1:27017/?authSource=admin" \\
  --archive --gzip --nsFrom='<db>.*' --nsTo='<db>_restoretest.*' --drop < /root/<db>-2026-11-04.archive.gz

# a backup that came in parts from Telegram/Bale (the panel joins them itself)
cat <name>.archive.gz.part* > <name>.archive.gz`;

const VERIFY = `// mongosh — run on both databases and diff the output
const crypto = require('crypto');
db.getCollectionNames().filter(n => !n.startsWith('system.')).sort().forEach(n => {
  const h = crypto.createHash('sha256'); let c = 0;
  db[n].find().sort({ _id: 1 }).forEach(d => { h.update(EJSON.stringify(d, { relaxed: false })); c++; });
  print(n, c, h.digest('hex').slice(0, 16));   // canonical EJSON = values + BSON types + field order
});`;

const sections: DocSection[] = [
    {
        id: 'trouble',
        title: 'وقتی مشکلی پیش آمد',
        headings: [
            { id: 'trouble-data', title: 'داده‌ای پاک یا خراب شد' },
            { id: 'trouble-undo', title: 'نتیجهٔ بازگردانی را نخواستم' },
            { id: 'trouble-server', title: 'سرور یا دیتابیس از دست رفت' },
        ],
        body: (
            <>
                <p>
                    همهٔ کارها از دکمهٔ <strong>«بازگردانی»</strong> بالای صفحهٔ <Link href="/settings/database/backups">دیتابیس و بک‌آپ</Link> شروع می‌شود. هر بک‌آپ
                    نسخهٔ دقیق داده‌هاست: بعد از بازگردانی هیچ شناسه، تاریخ یا عددی به متن تبدیل نمی‌شود.
                </p>
                <DocH3 id="trouble-data">داده‌ای پاک یا خراب شد</DocH3>
                <DocSteps>
                    <li>«بازگردانی» را بزنید؛ آخرین بک‌آپ کامل از قبل انتخاب شده (یا از «بک‌آپ قدیمی‌تر» تاریخ دیگری را بردارید).</li>
                    <li>
                        اگر فقط چند سند پاک شده: «تنظیمات بیشتر» ← روش <strong>«فقط داده‌های پاک‌شده»</strong> و همان مجموعه (مثلاً کارت‌ها). سندهای پاک‌شده با
                        همان شناسه برمی‌گردند و داده‌های امروز دست نمی‌خورند.
                    </li>
                    <li>دکمهٔ «بازگردانی به …» را بزنید. قبل از هر تغییری خودکار یک بک‌آپ ایمنی از وضعیت فعلی گرفته می‌شود.</li>
                </DocSteps>
                <DocH3 id="trouble-undo">نتیجهٔ بازگردانی را نخواستم</DocH3>
                <p>
                    تا ۲۴ ساعت بعد از هر بازگردانی، بالای صفحهٔ «بک‌آپ» و در منوی ⋯ همان ردیف در «لاگ‌ها» دکمهٔ <strong>«برگرداندن به قبل»</strong> هست؛ داده‌ها را به
                    لحظهٔ قبل از بازگردانی برمی‌گرداند (از روی بک‌آپ ایمنی). اگر بازگردانی وسط کار شکست بخورد هم همین دکمه نشان داده می‌شود.
                </p>
                <DocH3 id="trouble-server">سرور یا دیتابیس از دست رفت</DocH3>
                <DocSteps>
                    <li>
                        فایل بک‌آپ را از تلگرام/بله (همهٔ بخش‌های <Code>.part01</Code>، <Code>.part02</Code>، …) یا از دانلودهای خودتان بردارید.
                    </li>
                    <li>روی سرور جدید API و پنل را بالا بیاورید (دیتابیس خالی کافی است).</li>
                    <li>
                        «بازگردانی» ← <strong>«فایلی که دانلود کرده‌ام»</strong> و همهٔ فایل‌ها را با هم بکشید و رها کنید. فایل آپلود و قبل از بازگردانی کامل چک
                        می‌شود؛ فایل ناقص، خراب یا فایلی که بک‌آپ نیست پذیرفته نمی‌شود.
                    </li>
                </DocSteps>
                <Callout tone="tip" title="مطمئن نیستید؟ اول امتحان کنید">
                    در «تنظیمات بیشتر» روش «امتحان در یک کپی جدا» داده‌ها را در دیتابیس <Code>&lt;db&gt;_restoretest</Code> می‌ریزد و به داده‌های اصلی کاری ندارد. در صفحهٔ{' '}
                    <Link href="/settings/database?test=1">داده‌ها</Link> منبع «کپی آزمایشی» را بگذارید و ببینید؛ اگر درست بود «بازگردانی واقعی» را بزنید.
                </Callout>
            </>
        ),
    },
    {
        id: 'tabs',
        title: 'بخش‌های ماژول',
        body: (
            <DocTable
                headers={['صفحه (منوی دیتابیس)', 'به چه درد می‌خورد']}
                rows={[
                    [<Link key="b" href="/settings/database">داده‌ها</Link>, 'دیدن و جستجوی سندها، گزارش، تغییر داده، ایندکس‌ها؛ با منبع «کپی آزمایشی» نتیجهٔ امتحان بازگردانی.'],
                    [
                        <Link key="a" href="/settings/database/backups">بک‌آپ</Link>,
                        'کارت «بک‌آپ خودکار» (زمان، نگه‌داری، ارسال به تلگرام/بله) و یک جدول برای همهٔ بک‌آپ‌ها (نوع خودکار/دستی در هر ردیف)؛ بازگردانی، دانلود، جزئیات و حذف از منوی ⋯ هر ردیف.',
                    ],
                    [<Link key="d" href="/settings/database/jobs">لاگ‌ها</Link>, 'هر بک‌آپ‌گیری و بازگردانی با نتیجه، مدت و کاربر، با فیلتر وضعیت، کار، اجرا و دیتابیس؛ دلیل خطاها و «تلاش دوباره».'],
                ]}
            />
        ),
    },
    {
        id: 'modes',
        title: 'روش‌های بازگردانی',
        body: (
            <>
                <DocTable
                    headers={['روش', 'چه می‌کند', 'کی']}
                    rows={[
                        ['بازگردانی کامل (پیش‌فرض)', <>مجموعه‌های فایل <Code>--drop</Code> و دقیقاً مثل فایل می‌شوند؛ قبلش بک‌آپ ایمنی خودکار.</>, 'خرابی گسترده / برگشت به یک تاریخ'],
                        ['فقط داده‌های پاک‌شده', 'فقط سندهایی که _id آن‌ها الان نیست اضافه می‌شوند؛ هیچ سند موجودی بازنویسی نمی‌شود.', 'چند سند اشتباهی پاک شده'],
                        ['امتحان در یک کپی جدا', <>در <Code>&lt;db&gt;_restoretest</Code> (قبلش پاک می‌شود)؛ داده‌های اصلی دست نمی‌خورند.</>, 'وقتی مطمئن نیستید'],
                    ]}
                />
                <Callout tone="warn" title="تأیید با تایپ نام دیتابیس">
                    فقط وقتی فایل مال دیتابیس دیگری است (مثلاً بک‌آپ production روی سرور تست) نام دیتابیس مقصد باید تایپ شود. بازگردانی فایل همین دیتابیس با یک کلیک
                    انجام می‌شود چون بک‌آپ ایمنی همیشه گرفته می‌شود.
                </Callout>
                <p>
                    اگر مجموعهٔ <Code>files</Code> هم جایگزین شود، رکورد همهٔ بک‌آپ‌های موجود (از جمله بک‌آپ ایمنی همین الان) بعد از بازگردانی عیناً برگردانده می‌شود تا
                    فهرست بک‌آپ‌ها از دست نرود.
                </p>
            </>
        ),
    },
    {
        id: 'schedule',
        title: 'بک‌آپ خودکار',
        body: (
            <>
                <p>
                    در کارت «بک‌آپ خودکار» تب <Link href="/settings/database/backups?auto=1">بک‌آپ</Link> با یک دکمه «هر شب ساعت ۳، نگه‌داری ۱۴ نسخه» روشن می‌شود. زمان‌ها به وقت تهران
                    است؛ API هر دقیقه زمان‌بندی را چک می‌کند و اگر زمانی جا مانده باشد (تا ۵ دقیقه) همان را اجرا می‌کند.
                </p>
                <DocSteps>
                    <li>«نگه‌داری» فقط بک‌آپ‌های خودکار را پاک می‌کند؛ بک‌آپ‌های دستی، آپلودی و ایمنی هیچ‌وقت خودکار پاک نمی‌شوند.</li>
                    <li>«تنظیمات پیشرفته»: بک‌آپ فقط از چند مجموعه (برای لاگ‌های حجیم) و زمان‌بندی دلخواه با cron پنج‌بخشی.</li>
                    <li>نتیجهٔ آخرین بک‌آپ خودکار (و اینکه به تلگرام/بله رسید یا نه) در همان کارت و نوار بالای ماژول دیده می‌شود.</li>
                </DocSteps>
            </>
        ),
    },
    {
        id: 'telegram',
        title: 'ارسال به تلگرام و بله',
        body: (
            <>
                <p>
                    در صفحهٔ <Link href="/settings/database/backups?auto=1#delivery">بک‌آپ ← بک‌آپ خودکار ← نسخهٔ بیرون از سرور</Link> «وصل کردن» را بزنید، توکن ربات و کانال/گروه را
                    بدهید و «ذخیره و امتحان اتصال» را بزنید. خود فایل بک‌آپ فرستاده می‌شود؛ فایل بزرگ‌تر از سقف (پیش‌فرض ۴۵ مگابایت تلگرام، ۱۹ مگابایت بله)
                    چندبخشی می‌رود. برای بازگردانی همهٔ بخش‌ها را با هم در «فایلی که دانلود کرده‌ام» بدهید؛ پنل خودش به ترتیب به هم می‌چسباند.
                </p>
                <Callout tone="warn" title="سرورهای داخل ایران">
                    سرور ایران معمولاً به <Code>api.telegram.org</Code> دسترسی ندارد. اگر امتحان اتصال خطای شبکه بدهد، «تنظیمات اتصال» خودکار باز می‌شود: آدرس یک
                    واسط (reverse proxy روی سرور خارج) یا پروکسی HTTP بدهید، یا بله را وصل کنید که از داخل در دسترس است.
                </Callout>
            </>
        ),
    },
    {
        id: 'explorer',
        title: 'داده‌ها (کاوشگر)',
        headings: [
            { id: 'explorer-syntax', title: 'نوشتن کوئری' },
            { id: 'explorer-safety', title: 'ویرایش امن' },
            { id: 'explorer-speed', title: 'پیشنهاد سرعت (ایندکس)' },
            { id: 'explorer-write', title: 'تغییر داده' },
        ],
        body: (
            <>
                <p>
                    تب <Link href="/settings/database">داده‌ها</Link> هر مجموعه را با تعداد سند و حجم نشان می‌دهد؛ سندها را جدولی یا JSON ببینید، جستجو و گزارش
                    بگیرید و یک سند را ویرایش کنید. با منبع «کپی آزمایشی» همین ابزار روی <Code>&lt;db&gt;_restoretest</Code> کار می‌کند و یک نوار نارنجی یادآوری
                    می‌کند که این‌ها داده‌های اصلی نیستند.
                </p>
                <DocH3 id="explorer-syntax">نوشتن کوئری</DocH3>
                <p>
                    همان نوشتار mongosh — بدون اجرای کد روی سرور (متن تجزیه می‌شود، eval نمی‌شود): کلید بدون کوتیشن، <Code>ObjectId(&quot;…&quot;)</Code>،{' '}
                    <Code>ISODate(&quot;…&quot;)</Code>، <Code>/regex/i</Code>، <Code>NumberLong(&quot;…&quot;)</Code>، <Code>NumberDecimal(&quot;…&quot;)</Code>،{' '}
                    <Code>Double(5)</Code> و Extended JSON. نتیجه‌ها با نوع دقیق BSON برمی‌گردند (عدد صحیح = <Code>5</Code>، اعشاری صحیح‌مقدار ={' '}
                    <Code>Double(5)</Code>).
                </p>
                <CodeBlock>{`// find — filter / sort / projection
{ projectId: ObjectId("66f1…"), status: { $in: ["todo", "doing"] }, createdAt: { $gte: ISODate("2026-11-01") } }

// aggregate — documents per day (Tehran time)
[ { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Tehran" } }, n: { $sum: 1 } } } ]`}</CodeBlock>
                <p>
                    بالای ویرایشگر «پیشنهادها» از روی فیلدهای همان مجموعه ساخته می‌شوند (آخرین سندها، امروز، بازهٔ تاریخ، بر اساس شناسهٔ مرجع، فیلد ناموجود…). کلیک روی
                    نام فیلد آن را در کادر فعال درج می‌کند؛ کوئری‌ها در «تاریخچه» می‌مانند و با «ذخیرهٔ کوئری» نام می‌گیرند (در همین مرورگر). سقف: ۵۰۰ سند در هر صفحه، ۳۰
                    ثانیه برای هر کوئری.
                </p>
                <DocH3 id="explorer-safety">ویرایش امن</DocH3>
                <p>
                    ردیف جدول همیشه کل سند نیست: «فیلدهای خروجی» بعضی فیلدها را حذف می‌کند و «گزارش» ردیف تازه می‌سازد. برای همین پنجرهٔ سند همیشه اول سند ذخیره‌شده
                    را با <Code>_id</Code> از دیتابیس می‌خواند و فقط همان قابل ویرایش و حذف است؛ ردیفی که سند ذخیره‌شده ندارد فقط دیدنی است. ذخیره، کل سند را با همان
                    _id جایگزین می‌کند.
                </p>
                <DocH3 id="explorer-speed">پیشنهاد سرعت (ایندکس)</DocH3>
                <p>
                    هر find با explain اجرا می‌شود. فقط وقتی کوئری واقعاً کند است (بیش از ۲٬۰۰۰ سند بررسی یا بیش از ۱۵۰ میلی‌ثانیه، بدون ایندکس یا با مرتب‌سازی در
                    حافظه) ایندکس پیشنهادی با قاعدهٔ «برابری ← مرتب‌سازی ← بازه» نشان داده می‌شود و با یک کلیک (و تأیید) ساخته می‌شود.
                </p>
                <DocH3 id="explorer-write">تغییر داده</DocH3>
                <p>
                    تغییر یک/چند سند، جایگزینی، افزودن و حذف: اول «بررسی» تعداد سندهای درگیر و سه سند اول را نشان می‌دهد، بعد اجرا با تأیید؛ اگر بین بررسی و اجرا
                    تعداد عوض شود سرور رد می‌کند. تغییر یا حذف چند سند با فیلتر خالی مجاز نیست. «اول از همین مجموعه بک‌آپ بگیر» قبل از تغییر یک بک‌آپ فقط از همان
                    مجموعه می‌گیرد. هر تغییر (و ساخت/حذف ایندکس، ویرایش و حذف سند) با کاربر و زمان در <Code>database_explorer_audit</Code> ثبت می‌شود.
                </p>
            </>
        ),
    },
    {
        id: 'how',
        title: 'چطور کار می‌کند (فنی)',
        headings: [
            { id: 'how-format', title: 'چرا BSON و نه JSON' },
            { id: 'how-dump', title: 'بک‌آپ‌گیری' },
            { id: 'how-restore', title: 'بازگردانی' },
            { id: 'how-upload', title: 'آپلود فایل' },
        ],
        body: (
            <>
                <DocH3 id="how-format">چرا BSON و نه JSON</DocH3>
                <p>
                    روش قدیمی همهٔ سندها را JSON می‌کرد و <Code>ObjectId</Code> و <Code>Date</Code>ِ داخل فیلدها بعد از بازگردانی متن می‌شدند. حالا هر بک‌آپ یک آرشیو
                    باینری <strong>mongodump</strong> است که هر مقدار را با نوع دقیق BSON نگه می‌دارد: ObjectId، Date، Int32/Int64/Double، Decimal128، Binary/UUID، ترتیب
                    فیلدها و تعریف ایندکس‌ها.
                </p>
                <Callout tone="tip" title="آزمایش‌شده روی دیتابیس واقعی">
                    ۱۳ آبان ۱۴۰۵: یک دیتابیس production (۹۷ مجموعه، ۱۰٬۲۰۴ سند) با mongodump گرفته و در یک mongod جدا بازگردانی شد؛ هش SHA-256 روی EJSON استاندارد
                    هر مجموعه و تعریف همهٔ ایندکس‌ها با اصلی یکی بود.
                </Callout>
                <p>
                    خود API ابزار رسمی MongoDB Database Tools را با همان آدرس اتصال اپ اجرا می‌کند (<Code>MONGO_DB_URI</Code> و برای دیتابیس دوم{' '}
                    <Code>MONGO_APP_DB_URI</Code>). SSH یا دسترسی Docker لازم نیست و رمز اتصال هیچ‌وقت در خط فرمان یا لاگ نمی‌آید (فایل موقت <Code>--config</Code> با
                    دسترسی 0600).
                </p>
                <DocH3 id="how-dump">بک‌آپ‌گیری</DocH3>
                <CodeBlock>{DUMP_FLOW}</CodeBlock>
                <DocH3 id="how-restore">بازگردانی</DocH3>
                <CodeBlock>{RESTORE_FLOW}</CodeBlock>
                <p>در هر اپ فقط یک کار در صف اجرا می‌شود؛ بازگردانی هیچ‌وقت خودکار تکرار نمی‌شود (attempts: 1) تا نیمه‌کاره دوباره اجرا نشود.</p>
                <DocH3 id="how-upload">آپلود فایل</DocH3>
                <p>
                    فایل در تکه‌های ۸ مگابایتی آپلود می‌شود و با قطع شدن اینترنت از همان‌جا ادامه می‌دهد (سقف کل ۲۰ گیگابایت). بعد از آپلود ساختار آرشیو و CRC هر مجموعه
                    چک می‌شود و تعداد سند هر مجموعه از خود فایل خوانده می‌شود؛ فایل خراب یا ناقص بک‌آپ نمی‌شود.
                </p>
                <CodeBlock>{UPLOAD_FLOW}</CodeBlock>
            </>
        ),
    },
    {
        id: 'install',
        title: 'نصب ابزار',
        headings: [
            { id: 'install-server', title: 'سرور (Docker)' },
            { id: 'install-local', title: 'سیستم محلی' },
        ],
        body: (
            <>
                <DocH3 id="install-server">سرور (Docker)</DocH3>
                <p>ایمیج مشترک APIها خودش نصب می‌کند؛ فقط API را دوباره deploy کنید. نسخهٔ 100.x با MongoDB 4.2 تا 8.x کار می‌کند.</p>
                <CodeBlock>{DOCKERFILE}</CodeBlock>
                <DocH3 id="install-local">سیستم محلی</DocH3>
                <p>
                    «MongoDB Database Tools» را از سایت MongoDB نصب کنید (یا zip را باز کنید) و اگر در PATH نیست، مسیر <Code>bin</Code> را بدهید. اگر ابزار نباشد، نوار
                    بالای <Link href="/settings/database">ماژول دیتابیس</Link> قرمز می‌شود.
                </p>
                <CodeBlock>{LOCAL_ENV}</CodeBlock>
            </>
        ),
    },
    {
        id: 'security',
        title: 'امنیت و دسترسی',
        body: (
            <DocSteps>
                <li>
                    فایل‌ها با <Code>publicRead: false</Code> روی استوریج فعال ذخیره می‌شوند. دانلود با یک لینک موقت ۱۰ دقیقه‌ای است که فقط ادمین می‌سازد (
                    <Code>POST backups/:id/download-link</Code>). bucket نباید policy عمومی داشته باشد.
                </li>
                <li>
                    کاربر Mongo داخل URI برای بک‌آپ‌گیری دسترسی read، برای بازگردانی readWrite و برای «امتحان» readWrite روی <Code>&lt;db&gt;_restoretest</Code> لازم دارد
                    (کاربر root با authSource=admin همه را دارد).
                </li>
                <li>همهٔ endpointها <Code>JwtAuthGuard</Code> + نقش ADMIN دارند.</li>
                <li>توکن ربات و پروکسی هیچ‌وقت به پنل برنمی‌گردند؛ فقط «ذخیره شده» نشان داده می‌شود.</li>
            </DocSteps>
        ),
    },
    {
        id: 'api',
        title: 'مرجع API',
        body: (
            <DocTable
                headers={['endpoint', 'کار']}
                rows={[
                    [<Code key="a">GET overview · summary · tools</Code>, 'دیتابیس‌ها و ابزار؛ وضعیت یک‌نگاه (آخرین بک‌آپ، کار در حال اجرا، آخرین بازگردانی، کپی‌های آزمایشی)'],
                    [<Code key="b">POST backup/run</Code>, '{ db, collections? } → { jobId }'],
                    [<Code key="c">GET backups · backups/:id</Code>, 'page، limit، sort (createdAt|size|documents)، dir، search، purpose، format، db، full'],
                    [<Code key="d">POST backups/:id/download-link</Code>, 'لینک دانلود ۱۰ دقیقه‌ای (GET /api/database-admin-download/:token)'],
                    [<Code key="e">POST backups/:id/restore</Code>, '{ db, mode: test|missing|replace, collections?, safetyBackup?, confirm } → { jobId }'],
                    [<Code key="f">DELETE backups/:id · POST backups/:id/notify</Code>, 'حذف فایل و رکورد · فرستادن همین بک‌آپ به تلگرام/بله'],
                    [<Code key="g">backups/upload…</Code>, 'آپلود تکه‌ای فایل بک‌آپ (بخش «آپلود فایل»)'],
                    [<Code key="h">GET schedule · PATCH schedule/:db</Code>, 'زمان‌بندی هر دیتابیس، اجرای بعدی، آخرین بک‌آپ خودکار؛ cron نامعتبر رد می‌شود'],
                    [<Code key="i">GET backup-jobs · backup-jobs/:jobId</Code>, 'لاگ‌ها (status، sort، dir) با نام کاربر؛ وضعیت و پیشرفت یک کار (phase، done/total)'],
                    [<Code key="j">GET | POST restore-test-db[/drop]</Code>, 'دیدن / حذف کپی آزمایشی'],
                    [<Code key="k">GET | PATCH notify · POST notify/test</Code>, 'تنظیمات تلگرام/بله و پیام آزمایشی برای یک کانال { channel }'],
                    [<Code key="l">explorer/collections · collection · query</Code>, 'فهرست و ساختار مجموعه‌ها؛ find|aggregate|count|distinct با EJSON + plan + suggestions'],
                    [<Code key="m">explorer/write · document · document/delete · index · audit</Code>, 'تغییر داده با dryRun (تعداد + ۳ نمونه) و expectedCount، ویرایش/حذف سند، ایندکس — همه در audit'],
                ]}
            />
        ),
    },
    {
        id: 'manual',
        title: 'اضطراری: دستی روی سرور',
        body: (
            <>
                <p>اگر API بالا نیست، همان فرمت را مستقیم با ابزار داخل کانتینر mongo بگیرید (ایمیج رسمی mongo ابزار را دارد):</p>
                <CodeBlock>{EMERGENCY}</CodeBlock>
                <p>برای مقایسهٔ دقیق دو دیتابیس (مقدار + نوع + ترتیب فیلد):</p>
                <CodeBlock>{VERIFY}</CodeBlock>
            </>
        ),
    },
    {
        id: 'faq',
        title: 'سؤال‌های رایج',
        body: (
            <DocFaq
                items={[
                    ['بک‌آپ‌های JSON قدیمی چه می‌شوند؟', 'در فهرست با برچسب «JSON قدیمی» می‌مانند و دانلود می‌شوند، ولی بازگردانی ندارند (دقیق نیستند). یک بک‌آپ جدید بگیرید.'],
                    ['فایل یک دیتابیس را می‌شود در دیتابیس دیگری ریخت؟', 'بله؛ نام دیتابیس عوض می‌شود و محتوا و نام مجموعه‌ها همان می‌ماند (مثلاً بک‌آپ production روی سرور تست). در این حالت نام دیتابیس مقصد باید تایپ شود.'],
                    ['چرا بعد از «امتحان» بعضی مجموعه‌ها با داده‌های اصلی فرق دارند؟', 'اصلی بعد از گرفتن بک‌آپ تغییر کرده (لاگ‌ها، updatedAt). ملاک، برابری با فایل بک‌آپ است که خود بازگردانی چک می‌کند.'],
                    ['بک‌آپ در حین کار اپ سازگار است؟', 'mongodump روی سرور تکی point-in-time نیست؛ سندی که وسط کار تغییر کند ممکن است نسخهٔ قبل یا بعدش ثبت شود. برای بک‌آپ شبانه ساعت کم‌کار را انتخاب کنید.'],
                    ['بک‌آپ ایمنی را کی پاک کنم؟', 'عجله نکنید؛ تا مطمئن نشده‌اید نتیجهٔ بازگردانی درست است نگهش دارید. خودکار پاک نمی‌شود.'],
                ]}
            />
        ),
    },
];

export default function DatabaseDocsPage() {
    return (
        <DocPage
            title="مستندات دیتابیس"
            lead="بازگردانی وقتی مشکلی پیش آمد، بک‌آپ خودکار و تلگرام/بله، کاوشگر داده و جزئیات فنی — برای همهٔ اپ‌هایی که DatabaseAdminModule دارند."
            back={{ href: '/settings/database', label: 'بازگشت به دیتابیس و بک‌آپ' }}
        >
            <DocLayout sections={sections} />
        </DocPage>
    );
}
