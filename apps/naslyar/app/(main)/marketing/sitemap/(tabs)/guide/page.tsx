'use client';

import Link from 'next/link';
import GuideDocument, { Callout, Code, CodeBlock, type GuideTopic } from '../../components/guide/GuideDocument';
import { sitemapHref, type GuideTopicId } from '../../lib/sections';
import styles from '../../Sitemap.module.scss';

const SAMPLE_INDEX = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://studio.hosheton.com/sitemaps/templates-1.xml</loc>
    <lastmod>2026-08-26T17:39:22+00:00</lastmod>
  </sitemap>
  …
</sitemapindex>`;

const SAMPLE_ROBOTS = `User-agent: *
Disallow: /api/
Disallow: /login
Disallow: /wallet
…

Sitemap: https://studio.hosheton.com/sitemap.xml`;

const AUDIT_CODES: Array<[string, string, string]> = [
    ['SITE_URL_INVALID / SITE_URL_NOT_HTTPS', 'آدرس سایت نامعتبر است یا https نیست', 'آدرس را در تنظیمات اصلاح کنید'],
    ['GROUP_EMPTY', 'گروه فعال است ولی URL واجد شرایطی ندارد', 'شرایط انتشار یا وجود محتوای منتشرشده را بررسی کنید'],
    ['GROUP_GENERATION_FAILED', 'خواندن منبع یا ساخت فایل گروه شکست خورد', 'پیام خطا را بخوانید؛ معمولاً اتصال دیتابیس یا منبع'],
    ['ROBOTS_BLOCKS_GROUP', 'یک مسیر Disallow الگوی یک گروه فعال را می‌بندد', 'مسیر را از robots حذف یا گروه را خاموش کنید'],
    ['STALE_LASTMOD', 'URLهایی که مدت زیادی تغییر نکرده‌اند', 'اطلاعی است؛ آستانه در قوانین URL قابل تغییر است'],
    ['URL_COUNT_DROPPED', 'تعداد URL گروه نسبت به ممیزی قبلی افت کرده', 'گروه غیرفعال‌شده یا شرط سخت‌گیرانه جدید را پیدا کنید'],
    ['TOO_MANY_SHARDS', 'گروه به بیش از ۱۰۰ فایل شکسته شده', 'سقف URL هر فایل را بیشتر کنید'],
    ['ROBOTS_NO_SITEMAP_DIRECTIVE', 'خط Sitemap: در robots.txt خاموش است', 'در تب Robots.txt روشن کنید'],
];

function TabLink({ href, children }: { href: string; children: string }) {
    return <Link href={href}>{children}</Link>;
}

const TOPICS: Array<GuideTopic & { id: GuideTopicId }> = [
    {
        id: 'basics',
        title: 'سایت‌مپ چیست و این ماژول چه می‌کند',
        summary: 'مفاهیم پایه: ایندکس، فایل‌ها، گروه و lastmod',
        body: (
            <>
                <p>
                    سایت‌مپ فایلی XML است که فهرست صفحات عمومی سایت را به موتورهای جستجو می‌دهد تا صفحات جدید و
                    تغییرکرده سریع‌تر کشف شوند. برای سایتی مثل استودیو که هر روز قالب و سازنده جدید پیدا می‌کند،
                    سایت‌مپ مهم‌ترین مسیر معرفی صفحات داینامیک است.
                </p>
                <p>این ماژول سایت‌مپ را از داده‌های واقعی می‌سازد و روی دامنه سایت در این آدرس‌ها سرو می‌کند:</p>
                <ul>
                    <li>
                        <Code>/sitemap.xml</Code> — فایل <strong>ایندکس</strong>؛ فقط به فایل‌های گروه‌ها لینک می‌دهد و همان
                        آدرسی است که در Search Console ثبت می‌شود.
                    </li>
                    <li>
                        <Code>/sitemaps/templates-1.xml</Code> و مشابه — فایل‌های هر <strong>گروه</strong> با لینک صفحات واقعی
                        (مثلاً هر قالب Explore).
                    </li>
                    <li>
                        <Code>/robots.txt</Code> — قوانین کرول به‌همراه خط <Code>Sitemap:</Code>.
                    </li>
                </ul>
                <CodeBlock>{SAMPLE_INDEX}</CodeBlock>
                <p>
                    <strong>گروه</strong> یعنی یک نوع محتوا (قالب‌ها، سازنده‌ها، صفحات ثابت…) با الگوی URL خودش.{' '}
                    <strong>lastmod</strong> تاریخ آخرین تغییر واقعی هر صفحه است و گوگل با آن تصمیم می‌گیرد کدام صفحه را
                    دوباره بخواند؛ این ماژول هرگز «زمان ساخت سایت‌مپ» را جای lastmod نمی‌گذارد.
                </p>
                <Callout title="چه چیزی در سایت‌مپ نیست">
                    صفحات ورود، پنل کاربری، کیف پول، پرداخت و هر صفحه‌ای که بدون لاگین باز نمی‌شود هرگز منتشر نمی‌شود؛
                    الگوهای مسدود در <TabLink href={sitemapHref.rules}>قوانین URL</TabLink> جلوی آن را می‌گیرند.
                </Callout>
            </>
        ),
    },
    {
        id: 'quickstart',
        title: 'راه‌اندازی در پنج دقیقه',
        summary: 'از تنظیم دامنه تا ثبت در گوگل',
        body: (
            <>
                <ol className={styles.docSteps}>
                    <li>
                        در <TabLink href={sitemapHref.settings}>تنظیمات</TabLink> مطمئن شوید ماژول روشن است و آدرس سایت دامنه
                        عمومی واقعی است (مثلاً <Code>https://studio.hosheton.com</Code>).
                    </li>
                    <li>
                        در <TabLink href={sitemapHref.groups}>گروه‌ها</TabLink> فقط گروه‌هایی را روشن نگه دارید که فرانت
                        صفحه واقعی‌شان را دارد. الگوی URL هر گروه باید دقیقاً مسیر صفحه در سایت باشد.
                    </li>
                    <li>دکمه «تولید مجدد همه» بالای صفحه را بزنید.</li>
                    <li>
                        در <TabLink href={sitemapHref.validation}>اعتبارسنجی</TabLink> ممیزی بگیرید و یافته‌های بحرانی و خطا را
                        رفع کنید.
                    </li>
                    <li>
                        آدرس <Code>/sitemap.xml</Code> سایت را باز کنید: باید فهرست فایل‌ها را ببینید و هر لینک صفحات همان
                        گروه را باز کند.
                    </li>
                    <li>
                        ایندکس را در Google Search Console و Bing ثبت کنید (<a href="#search-engines">معرفی به موتورهای جستجو</a>).
                    </li>
                </ol>
                <Callout tone="tip" title="روی محیط توسعه">
                    لینک‌های داخل سایت‌مپ همیشه با دامنه تنظیم‌شده ساخته می‌شوند. برای دیدن خروجی قبل از انتشار از
                    «پیش‌نمایش مستقیم از API» در نمای کلی یا دکمه XML کنار هر گروه استفاده کنید.
                </Callout>
            </>
        ),
    },
    {
        id: 'groups',
        title: 'گروه‌ها و الگوی URL',
        summary: 'منبع محتوا، الگو، شرایط انتشار و سلامت',
        body: (
            <>
                <p>
                    هر گروه یک <strong>منبع</strong> دارد و برای هر رکورد واجد شرایط آن منبع، با جایگزینی توکن‌ها در
                    <strong> الگوی URL</strong> یک آدرس می‌سازد:
                </p>
                <div className={styles.docTableWrap}>
                    <table className={styles.docTable}>
                        <thead>
                            <tr>
                                <th>منبع</th>
                                <th>الگوی پیش‌فرض</th>
                                <th>توکن‌ها</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td>صفحات ثابت</td><td><Code>{'{path}'}</Code></td><td>مسیرهای ثبت‌شده در تنظیمات</td></tr>
                            <tr><td>قالب‌های مارکت‌پلیس</td><td><Code>{'/explore/{slug}'}</Code></td><td><Code>{'{slug}'}</Code> <Code>{'{id}'}</Code></td></tr>
                            <tr><td>پروفایل سازنده‌ها</td><td><Code>{'/creators/{id}'}</Code></td><td><Code>{'{id}'}</Code></td></tr>
                            <tr><td>محصول</td><td><Code>{'/product/{slug}'}</Code></td><td><Code>{'{slug}'}</Code> <Code>{'{id}'}</Code></td></tr>
                            <tr><td>وبلاگ، مستندات، دسته‌بندی</td><td><Code>{'/blog/{slug}'}</Code> …</td><td><Code>{'{slug}'}</Code> <Code>{'{id}'}</Code> <Code>{'{categorySlug}'}</Code> <Code>{'{categoryPath}'}</Code></td></tr>
                            <tr><td>گزارش تغییرات</td><td><Code>{'/changelog/{version}'}</Code></td><td><Code>{'{version}'}</Code></td></tr>
                        </tbody>
                    </table>
                </div>
                <p>
                    <Code>{'{categorySlug}'}</Code> slug دسته رکورد است و <Code>{'{categoryPath}'}</Code> زنجیره slug دسته‌ها از
                    ریشه (مثل <Code>guides/kanban</Code>)؛ برای منبع دسته‌بندی، خود دسته. نمونه در لندینگ تسک‌ویژن:{' '}
                    <Code>{'/blog/{categoryPath}/{slug}'}</Code> و <Code>{'/docs/{categorySlug}/{slug}'}</Code>. رکوردی که دسته‌اش
                    حذف شده یا ندارد، با این توکن‌ها منتشر نمی‌شود چون آدرسش در سایت ۴۰۴ است.
                </p>
                <p>
                    <strong>شرایط انتشار</strong> مشخص می‌کند کدام رکوردها واجد شرایط‌اند: فقط منتشرشده، فقط عمومی، حذف‌نشده
                    و دارای slug. پیش‌فرض‌ها امن‌ترین حالت‌اند. قالب‌ها دقیقاً با همان فیلتر صفحه Explore انتخاب می‌شوند،
                    پس هر قالبی که در Explore دیده می‌شود در سایت‌مپ هم هست.
                </p>
                <p>معنی ستون سلامت در فهرست گروه‌ها:</p>
                <ul>
                    <li><strong>سالم</strong> — فعال است، URL دارد و یافته بازی ندارد.</li>
                    <li><strong>هشدار</strong> — فعال است ولی URL ندارد یا ممیزی هشدار ثبت کرده.</li>
                    <li><strong>خطا</strong> — تولید شکست خورده یا ممیزی خطا/بحرانی ثبت کرده.</li>
                    <li><strong>غیرفعال</strong> — عمداً از سایت‌مپ کنار گذاشته شده.</li>
                </ul>
                <Callout tone="warn" title="الگوی اشتباه = URL ۴۰۴">
                    الگوی هر گروه باید دقیقاً همان مسیر صفحه در فرانت اپ باشد. گروه را فقط وقتی روشن کنید که مسیرش در سایت
                    باز می‌شود؛ در فرم گروه «الگوهای آماده» همین قرارداد مشترک را پر می‌کنند.
                </Callout>
                <p>
                    <strong>آدرس‌های دسته‌دار (قرارداد مشترک همهٔ اپ‌ها):</strong> مقاله زیر زنجیرهٔ کامل دسته‌اش
                    (<Code>{'/blog/{categoryPath}/{slug}'}</Code> → <Code>/blog/ai/llm/my-post</Code>)، صفحهٔ فرود هر دسته
                    (<Code>{'/blog/{categoryPath}'}</Code>، منبع «دسته‌بندی‌ها» با بخش <Code>post</Code>)، آموزش‌ها
                    (<Code>{'/docs/{categorySlug}/{slug}'}</Code>) و قالب‌های استودیو
                    (<Code>{'/explore/{categoryPath?}/{slug}'}</Code> زیر اولین تگ قالب — علامت <Code>?</Code> یعنی قالب بی‌تگ هم با
                    <Code>{'/explore/{slug}'}</Code> منتشر شود) و صفحهٔ هر تگ (<Code>{'/explore/{categoryPath}'}</Code>، منبع
                    «دسته‌های قالب (تگ‌ها)»). دسته‌ها و تگ‌های noindex خودکار کنار می‌روند.
                    مدیریت: <Link href="/blog/categories">محتوا › دسته‌بندی‌ها</Link>،{' '}
                    <Link href="/docs/categories">موضوع‌های آموزش</Link>،{' '}
                    <Link href="/projects/marketplace/tag-categories">دسته‌بندی تگ‌ها</Link>.
                </p>
                <p>
                    شناسه گروه (مثل <Code>templates</Code>) نام فایل‌ها را می‌سازد و بعد از ساخت قابل تغییر نیست. حذف گروه
                    نرم است؛ ساختن دوباره گروهی با همان شناسه، رکورد قبلی را با مقادیر جدید زنده می‌کند.
                </p>
            </>
        ),
    },
    {
        id: 'rules',
        title: 'قوانین URL',
        summary: 'نرمال‌سازی، الگوهای مسدود و تازگی',
        body: (
            <>
                <p>این قوانین بعد از ساخت آدرس هر گروه و روی همه گروه‌ها یکسان اعمال می‌شوند:</p>
                <ul>
                    <li><strong>اجبار HTTPS</strong> — دامنه خروجی همیشه https است.</li>
                    <li>
                        <strong>حذف query string</strong> — آدرس کانونی بدون پارامتر. پارامترهای ردیابی (<Code>utm_*</Code>،{' '}
                        <Code>gclid</Code>، <Code>fbclid</Code>…) همیشه حذف می‌شوند.
                    </li>
                    <li><strong>حذف اسلش انتهایی</strong> و <strong>حروف کوچک</strong> — جلوی نسخه‌های تکراری یک صفحه را می‌گیرند.</li>
                    <li>آدرس‌های تکراری داخل یک گروه فقط یک‌بار منتشر می‌شوند.</li>
                </ul>
                <p>
                    <strong>الگوهای مسدود</strong> عبارت‌های regex روی مسیرند؛ هر مسیری که با یکی جور شود، حتی اگر گروهی آن را
                    بسازد، منتشر نمی‌شود. <Code>^/wallet</Code> یعنی «هر مسیری که با /wallet شروع شود». الگوی نامعتبر در فرم
                    قرمز می‌شود و ذخیره نمی‌شود.
                </p>
                <Callout tone="warn">
                    حذف الگوهای ورود یا پنل کاربری یعنی احتمال انتشار آدرس‌های خصوصی برای گوگل. فقط الگو اضافه کنید، مگر
                    دلیل روشنی برای حذف داشته باشید.
                </Callout>
                <p>
                    <strong>آستانه تازگی lastmod</strong> فقط برای گزارش است: URLهایی که بیش از این تعداد روز تغییر نکرده‌اند در
                    ممیزی با کد <Code>STALE_LASTMOD</Code> می‌آیند.
                </p>
            </>
        ),
    },
    {
        id: 'generation',
        title: 'تولید، کش و فایل‌ها',
        summary: 'حالت خودکار/دستی و چرخه کش',
        body: (
            <>
                <p>
                    خروجی هر گروه در حافظه API کش می‌شود و تا پایان «مدت کش» از همان‌جا سرو می‌شود. بعد از انقضا، اولین
                    درخواست گروه را دوباره می‌سازد. ذخیره هر تنظیم یا ویرایش گروه کش مربوط را فوراً باطل می‌کند.
                </p>
                <ul>
                    <li><strong>خودکار</strong> — کرون هر ساعت (دقیقه ۵) همه گروه‌های فعال را می‌سازد و در تاریخچه ثبت می‌کند.</li>
                    <li><strong>دستی</strong> — فقط با درخواست بازدیدکننده/کرولر بعد از انقضای کش یا دکمه «تولید مجدد همه».</li>
                </ul>
                <p>
                    گروه بزرگ‌تر از «سقف URL هر فایل» به چند فایل شکسته می‌شود (<Code>templates-1.xml</Code>،{' '}
                    <Code>templates-2.xml</Code>…). ترتیب پایدار است و با محتوای جدید URLها بین فایل‌ها جابه‌جا نمی‌شوند.
                    گروه خالی فایلی ندارد و در ایندکس نمی‌آید.
                </p>
                <p>
                    در جدول <TabLink href={sitemapHref.generation}>تولید و فایل‌ها</TabLink>، ستون «آخرین تغییر محتوا» همان
                    مقداری است که در <Code>&lt;lastmod&gt;</Code> ایندکس می‌نشیند: جدیدترین lastmod صفحات همان فایل.
                </p>
            </>
        ),
    },
    {
        id: 'validation',
        title: 'ممیزی و بازرسی URL',
        summary: 'کدهای یافته‌ها و راه رفع',
        body: (
            <>
                <p>
                    ممیزی همه گروه‌ها را می‌سازد و تنظیمات، الگوها، robots و تعداد URLها را بررسی می‌کند. هر ممیزی یافته‌های
                    قبلی را می‌بندد و وضعیت فعلی را ثبت می‌کند؛ پس بعد از رفع مشکل یک ممیزی دیگر بگیرید.
                </p>
                <div className={styles.docTableWrap}>
                    <table className={styles.docTable}>
                        <thead>
                            <tr>
                                <th>کد</th>
                                <th>معنی</th>
                                <th>راه رفع</th>
                            </tr>
                        </thead>
                        <tbody>
                            {AUDIT_CODES.map(([code, meaning, fix]) => (
                                <tr key={code}>
                                    <td><Code>{code}</Code></td>
                                    <td>{meaning}</td>
                                    <td>{fix}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <p>
                    <strong>بازرسی URL</strong> برای یک آدرس می‌گوید بعد از نرمال‌سازی چه شکلی دارد، با الگوی مسدود حذف
                    می‌شود یا نه، و کدام گروه و فایل آن را منتشر کرده. نتیجه بر اساس آخرین تولید هر گروه است؛ برای محتوای
                    همین الان منتشرشده اول «تولید» آن گروه را بزنید.
                </p>
            </>
        ),
    },
    {
        id: 'robots',
        title: 'robots.txt',
        summary: 'قوانین کرول و خط Sitemap',
        body: (
            <>
                <p>
                    robots.txt به کرولرها می‌گوید کجا را نخوانند و آدرس سایت‌مپ را برای کشف خودکار معرفی می‌کند. Disallow
                    پیشوندی است: <Code>/wallet</Code> همه زیرمسیرهای کیف پول را هم می‌بندد.
                </p>
                <CodeBlock>{SAMPLE_ROBOTS}</CodeBlock>
                <Callout title="Disallow ≠ noindex">
                    robots.txt فقط «خواندن» را می‌بندد؛ صفحه‌ای که لینک بیرونی دارد ممکن است بدون محتوا ایندکس شود. برای خروج
                    از نتایج باید خود صفحه noindex داشته باشد.
                </Callout>
                <p>
                    با خاموش‌کردن «مدیریت توسط این ماژول»، سایت یک robots.txt ثابت و امن سرو می‌کند. اگر API در دسترس نباشد هم
                    همین نسخه امن سرو می‌شود، چون robots.txt نباید هیچ‌وقت خطای سرور بدهد.
                </p>
            </>
        ),
    },
    {
        id: 'search-engines',
        title: 'معرفی به گوگل و بینگ',
        summary: 'یک‌بار ثبت در Search Console و Bing',
        body: (
            <>
                <h3>Google Search Console</h3>
                <ol className={styles.docSteps}>
                    <li>در search.google.com/search-console مالکیت دامنه را تایید کنید.</li>
                    <li>منوی Sitemaps را باز کنید.</li>
                    <li>
                        فقط <Code>sitemap.xml</Code> را وارد و Submit کنید؛ فایل‌های گروه‌ها خودکار از ایندکس خوانده می‌شوند.
                    </li>
                    <li>چند روز بعد گزارش Pages پوشش ایندکس را نشان می‌دهد.</li>
                    <li>برای یک صفحه مهم و فوری، از URL Inspection گزینه Request Indexing را بزنید.</li>
                </ol>
                <h3>Bing Webmaster Tools</h3>
                <ol className={styles.docSteps}>
                    <li>سایت را در bing.com/webmasters اضافه کنید (امکان ایمپورت از Search Console هست).</li>
                    <li>در بخش Sitemaps همان آدرس ایندکس را ثبت کنید.</li>
                    <li>برای اعلام لحظه‌ای تغییرات، IndexNow را فعال کنید.</li>
                </ol>
                <Callout tone="tip">
                    ثبت فقط یک‌بار لازم است. بعد از آن سایت‌مپ خودکار به‌روز می‌شود و موتورهای جستجو دوره‌ای آن را می‌خوانند.
                </Callout>
            </>
        ),
    },
    {
        id: 'indexnow',
        title: 'IndexNow',
        summary: 'اعلام فوری تغییرات به Bing و Yandex',
        body: (
            <>
                <p>
                    IndexNow پروتکلی است که با آن تغییر یک صفحه را همان لحظه به Bing، Yandex، Seznam و دیگر موتورهای همکار
                    اعلام می‌کنید. مکمل سایت‌مپ است، نه جایگزین آن؛ <strong>گوگل از IndexNow پشتیبانی نمی‌کند</strong>.
                </p>
                <ul>
                    <li>
                        با فعال‌سازی، یک کلید ساخته و فایل تایید آن روی <Code>{'https://دامنه/{کلید}.txt'}</Code> سرو می‌شود؛ نیازی
                        به ساخت دستی فایل نیست.
                    </li>
                    <li>در حالت خودکار، هر ۶ ساعت URLهایی که lastmodشان بعد از آخرین ارسال است اعلام می‌شوند.</li>
                    <li>
                        ارسال دستی برای صفحه‌های مهم: آدرس‌ها با همان قوانین سایت‌مپ نرمال می‌شوند و آدرس دامنه دیگر یا مسیر
                        مسدود ارسال نمی‌شود.
                    </li>
                </ul>
            </>
        ),
    },
    {
        id: 'settings',
        title: 'تنظیمات و هشدارها',
        summary: 'دامنه، صفحات ثابت، هشدارها، فیلدهای قدیمی',
        body: (
            <>
                <ul>
                    <li>
                        <strong>آدرس سایت</strong> مبنای همه آدرس‌هاست. مسیرهای <Code>/sitemap.xml</Code> و{' '}
                        <Code>/sitemaps/</Code> ثابت‌اند چون فرانت هر اپ (پوشه <Code>app/seo-files</Code> + rewrites در{' '}
                        <Code>next.config.ts</Code>؛ استودیو و لندینگ تسک‌ویژن) همین مسیرها را سرو می‌کند. مقادیر اولیه
                        (آدرس سایت، صفحات ثابت، الگوی گروه‌ها) را هر اپ با <Code>{'SitemapModule.register({ seed })'}</Code> می‌دهد و
                        فقط بار اول ثبت می‌شود؛ بعد از آن مرجع همین پنل است.
                    </li>
                    <li>
                        <strong>صفحات ثابت</strong> فقط صفحات عمومی که آدرس نهایی‌اند. «/» در استودیو به /explore ریدایرکت
                        می‌شود و صفحات پشت لاگین (مستندات، قیمت مدل‌ها) نباید ثبت شوند.
                    </li>
                    <li>
                        <strong>هشدار افت URL</strong> در ممیزی بعدی مقایسه می‌شود و افت ناگهانی (گروه خاموش‌شده، شرط
                        سخت‌گیرانه جدید) را با خطای <Code>URL_COUNT_DROPPED</Code> گزارش می‌کند.
                    </li>
                    <li>
                        <strong>changefreq و priority</strong> را گوگل و بینگ نادیده می‌گیرند؛ خاموش بمانند.
                    </li>
                </ul>
            </>
        ),
    },
    {
        id: 'best-practices',
        title: 'بهترین رویه‌ها',
        summary: 'انجام بدهید / انجام ندهید',
        body: (
            <div className={styles.docColumns}>
                <div>
                    <h3>انجام بدهید</h3>
                    <ul>
                        <li>فقط URLهای کانونی با پاسخ ۲۰۰ منتشر شوند.</li>
                        <li>lastmod از تغییر واقعی محتوا بیاید.</li>
                        <li>صفحات ورود، پنل و پرداخت مسدود بمانند.</li>
                        <li>بعد از هر تغییر ساختاری ممیزی بگیرید.</li>
                        <li>خط Sitemap در robots.txt روشن بماند.</li>
                    </ul>
                </div>
                <div>
                    <h3>انجام ندهید</h3>
                    <ul>
                        <li>آدرس ریدایرکت، ۴۰۴ یا noindex را منتشر نکنید.</li>
                        <li>lastmod را با زمان ساخت سایت‌مپ جعل نکنید.</li>
                        <li>چند نسخه یک صفحه (با و بدون utm) منتشر نکنید.</li>
                        <li>گروهی که الگویش صفحه ندارد را روشن نگذارید.</li>
                        <li>محصول ناموجود را فقط به‌خاطر موجودی حذف نکنید؛ هنوز صفحه ارزشمندی است.</li>
                    </ul>
                </div>
            </div>
        ),
    },
    {
        id: 'troubleshooting',
        title: 'عیب‌یابی',
        summary: 'مشکل رایج ← راه‌حل',
        body: (
            <dl className={styles.docFaq}>
                <dt>sitemap.xml روی سایت ۴۰۴ می‌دهد</dt>
                <dd>ماژول در تنظیمات خاموش است، یا فرانت استودیو هنوز نسخه دارای مسیرهای سایت‌مپ را deploy نکرده است.</dd>
                <dt>sitemap.xml خطای ۵۰۳ می‌دهد</dt>
                <dd>فرانت به API دسترسی ندارد (NEXT_PUBLIC_API_URL یا قطعی API). کرولرها با Retry-After بعداً دوباره می‌آیند.</dd>
                <dt>گروه فعال است ولی URL ندارد</dt>
                <dd>شرایط انتشار سخت‌گیرانه است یا محتوای منتشرشده‌ای نیست؛ یک آدرس نمونه را در بازرسی URL بررسی کنید.</dd>
                <dt>صفحه جدید در سایت‌مپ نیست</dt>
                <dd>کش گروه هنوز منقضی نشده؛ «تولید» همان گروه را بزنید یا منتظر کرون ساعتی بمانید.</dd>
                <dt>URL در گوگل ایندکس نمی‌شود</dt>
                <dd>با URL Inspection در Search Console بررسی کنید، مطمئن شوید robots.txt آن را نبسته و الگوی گروه به صفحه واقعی می‌رسد.</dd>
                <dt>فایل کلید IndexNow باز نمی‌شود</dt>
                <dd>IndexNow باید فعال و ذخیره شده باشد؛ کش CDN را برای همان مسیر .txt پاک کنید.</dd>
            </dl>
        ),
    },
    {
        id: 'glossary',
        title: 'واژه‌نامه',
        summary: 'کرول، ایندکس، کانونی، shard',
        body: (
            <dl className={styles.docFaq}>
                <dt>Crawl / Index</dt>
                <dd>کرول یعنی خواندن صفحه توسط ربات؛ ایندکس یعنی ثبت در نتایج. سایت‌مپ کرول را تسهیل می‌کند؛ ایندکس به کیفیت محتوا هم بستگی دارد.</dd>
                <dt>Canonical (کانونی)</dt>
                <dd>آدرس اصلی یک صفحه وقتی چند آدرس مشابه دارد؛ در سایت‌مپ فقط نسخه کانونی می‌آید.</dd>
                <dt>noindex / Disallow</dt>
                <dd>noindex یعنی «در نتایج نیاور»؛ Disallow یعنی «نخوان». برای خروج از نتایج Disallow کافی نیست.</dd>
                <dt>Sitemap index</dt>
                <dd>فایلی که به فایل‌های سایت‌مپ دیگر لینک می‌دهد؛ هر فایل حداکثر ۵۰٬۰۰۰ URL دارد.</dd>
                <dt>Shard</dt>
                <dd>هر قطعه از URLهای یک گروه در یک فایل جدا؛ تقسیم پایدار است.</dd>
            </dl>
        ),
    },
];

/** آموزش ماژول سایت‌مپ — مستند کامل؛ موضوعات به‌صورت تایم‌لاین در ستون چپ */
export default function SitemapGuidePage() {
    return (
        <GuideDocument
            title="راهنمای سایت‌مپ — از صفر تا ثبت در گوگل"
            lead={
                <p>
                    مرجع تیم مارکتینگ و محتوا: سایت‌مپ چیست، این ماژول چه چیزی را خودکار می‌کند و هر تب چطور کار می‌کند.
                    مشخصات فنی کامل در <Code>implement.md</Code> همین ماژول و کد API در <Code>libs/core/src/sitemap</Code> است.
                </p>
            }
            topics={TOPICS}
        />
    );
}
