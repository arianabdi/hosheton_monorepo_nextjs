import Link from 'next/link';
import { Callout, Code, CodeBlock, DocFaq, DocH3, DocSteps, DocTable, type DocSection, type DocTopic } from '@/app/components/DocLayout/DocLayout';

/**
 * مستند اشتراک — هر موضوع یک صفحه (/subscription/docs/<slug>) با DocLayout.
 * ماژول برای همهٔ اپ‌هاست (my-workspace-api/libs/core/src/subscription)؛ مثال‌های اختصاصی اپ‌ها فقط در
 * موضوع «یکپارچه‌سازی‌های فعلی» می‌آیند. با تغییر رفتار ماژول همین فایل را به‌روز کنید.
 */
export interface SubDocTopic extends DocTopic {
    sections: DocSection[];
}

export const SUB_DOCS_BASE = '/subscription/docs';

// ---------------------------------------------------------------- code samples (comments in English)

const CATALOG_SAMPLE = `// apps/<app>/src/subscription/<app>-features.ts — the ONE list of this app's features
import { defineSubscriptionCatalog, FeatureType, FeatureUsageMode, FeatureResetInterval, UNLIMITED } from '@my-workspace/core';

export const MY_APP_SUBSCRIPTION = defineSubscriptionCatalog({
    app: 'myapp',
    features: [
        {
            code: 'max_projects',                 // never rename after launch
            name: 'تعداد پروژه',                  // admin may rename in the panel
            type: FeatureType.QUANTITY,
            mode: FeatureUsageMode.COUNTER,       // live count, freed on delete
            unit: 'پروژه',
            group: { slug: '1-workspace', title: 'پروژه و تیم' },
            order: 10,
            showInCard: true,
            description: 'for the admin: what it limits, how to pick a value',
            publicDescription: 'for customers: one line in the pricing table',
            usedIn: [
                { module: 'projects', where: 'ProjectsService.create', why: 'blocks a new project at the limit' },
            ],
        },
        {
            code: 'ai_messages',
            name: 'پیام دستیار',
            type: FeatureType.QUANTITY,
            mode: FeatureUsageMode.CONSUMABLE,
            resetInterval: FeatureResetInterval.MONTHLY,  // refills monthly, even on yearly plans
            unit: 'پیام در ماه',
            group: { slug: '3-ai', title: 'هوش مصنوعی' },
            description: '…',
            usedIn: [{ module: 'chat', where: 'ChatService.send', why: 'one message = 1 unit' }],
        },
        {
            code: 'exports',
            name: 'خروجی PDF',
            type: FeatureType.BOOLEAN,
            mode: FeatureUsageMode.SWITCH,
            defaultValue: true,                   // plans without a value keep it open
            group: { slug: '5-reports', title: 'گزارش' },
            description: '…',
            usedIn: [{ module: 'reports', where: 'ReportsService.exportPdf', why: 'PDF export' }],
        },
    ],
});

export const F = MY_APP_SUBSCRIPTION.codes;   // F.MAX_PROJECTS === 'max_projects'`;

const REGISTER_SAMPLE = `// apps/<app>/src/subscription/<app>-subscription.service.ts
@Injectable()
export class MyAppSubscriptionService implements OnModuleInit {
    constructor(
        readonly entitlements: SubscriptionEntitlementService,      // from @my-workspace/core (global)
        @InjectModel(Project.name) private projects: Model<Project>,
    ) {}

    async onModuleInit() {
        // syncs the catalog into the DB + registers live counters of COUNTER features
        await this.entitlements.registerCatalog(MY_APP_SUBSCRIPTION, {
            [F.MAX_PROJECTS]: (userId) => this.projects.countDocuments({ ownerId: userId, isAlive: true }),
        });
    }
}

// app.module.ts
@Module({ imports: [SubscriptionModule, MyAppSubscriptionModule /* global, provides the service above */] })`;

const ENFORCE_SAMPLE = `// SWITCH — is the section open in the plan?
await this.subscription.entitlements.assertFeature(payload.user, F.EXPORTS);

// COUNTER — +1 would pass the limit? (current comes from the registered counter)
await this.subscription.entitlements.assertWithinLimit(payload.user, F.MAX_PROJECTS);
await this.subscription.entitlements.assertWithinLimit(payload.user, F.STORAGE_MB, { adding: fileMb });

// CAP — is one thing bigger than allowed? (members of a project, size of a file)
// counting caps pass used (how many exist now) so the denial shows usage, not the requested amount
await this.subscription.entitlements.assertCap(payload.user, F.MAX_MEMBERS, membersAfterAdd, { ownerUserId, used: membersNow });
await this.subscription.entitlements.assertCap(payload.user, F.MAX_FILE_MB, fileMb, { ownerUserId });

// CONSUMABLE — check before the work, record after success
await this.subscription.entitlements.assertCanConsume(payload.user, F.AI_MESSAGES, 1);
const answer = await this.llm.reply(...);
await this.subscription.entitlements.consume(payload.user, F.AI_MESSAGES, 1, { refId: String(message._id) });

// project resources follow the project OWNER's plan
const ownerUserId = await this.subscription.projectOwnerId(projectId);
await this.subscription.entitlements.assertFeature(payload.user, F.SPRINTS, { ownerUserId });`;

const ERROR_BODY = `HTTP 403
{
  "statusCode": 403,
  "code": "SUBSCRIPTION_LIMIT_REACHED",          // or SUBSCRIPTION_FEATURE_LOCKED / SUBSCRIPTION_REQUIRED
  "message": "به سقف «تعداد پروژه» در پلن فعلی (۳ پروژه) رسیده‌اید. …",
  "details": {
    "feature": "max_projects",
    "featureName": "تعداد پروژه",
    "unit": "پروژه",
    "limit": 3,
    "used": 3,
    "requested": 1,
    "upgradeUrl": "/pricing"
  }
}`;

const GUARD_SAMPLE = `// route-level gate for a SWITCH (no counting, user's own plan)
@UseGuards(JwtAuthGuard, FeatureGuard)
@CheckSubscriptionFeature('exports')
@Get(':id/export.pdf')
exportPdf() { … }`;

const FRONT_SAMPLE = `import { useEntitlements, readSubscriptionDenial } from '@my-workspace/components';

// gate UI (the server enforces anyway — this only avoids a dead click)
const { can, entitlement } = useEntitlements({ apiBase: API_URL, getToken: () => token });
if (!can('sprints')) showLockedBadge();
const left = entitlement('ai_credits')?.remaining;

// react to a 403 anywhere
try { await axios.post(...) } catch (e) {
    const denial = readSubscriptionDenial(e);       // { code, message, details } | null
    if (denial) openUpgrade(denial); else ErrorToaster(e);
}`;

const STORAGE_HOOK = `// a COUNTER on storage: gate uploads before they are saved (core FileService calls the hook)
@Injectable()
export class MyAppSubscriptionService implements OnModuleInit, StorageQuotaHook {
    onModuleInit() { registerStorageQuotaHook(this); /* + registerCatalog(...) */ }

    async beforeUserUpload({ user, sizeBytes }: UserUploadIntent) {
        await this.entitlements.assertWithinLimit(user, F.STORAGE_MB, { adding: sizeBytes / 1024 / 1024 });
    }
    async afterUserFileSaved() {}
}`;

const SEED_RUN = `# from my-workspace-api (first launch — fills only what is missing)
node apps/taskvision/seed-subscription-plans.mjs --env=production
# reset values + prices to the file (overwrites admin edits!)
node apps/taskvision/seed-subscription-plans.mjs --env=production --force`;

// ---------------------------------------------------------------- topics

export const SUB_DOC_TOPICS: SubDocTopic[] = [
    {
        slug: 'overview',
        title: 'مرور کلی و مفاهیم',
        summary: 'ویژگی، پلن، قیمت، اشتراک و مصرف چیست؛ چهار نوع سنجش و پلن پیش‌فرض.',
        group: 'شروع',
        sections: [
            {
                id: 'what',
                title: 'این ماژول چه می‌کند',
                headings: [{ id: 'what-shared', title: 'برای همهٔ اپ‌ها' }, { id: 'what-flow', title: 'چرخه کامل' }],
                body: (
                    <>
                        <DocH3 id="what-shared">برای همهٔ اپ‌ها</DocH3>
                        <p>
                            ماژول اشتراک (<Code>libs/core/src/subscription</Code>) پلن‌ها، سقف‌ها، قیمت‌ها و اشتراک کاربران همهٔ اپ‌ها را
                            نگه می‌دارد. هر اپ دیتابیس اشتراک خودش را دارد (کانکشن <Code>APP_DB</Code>) و پنل با هر اپی که وارد شده باشید
                            همان را نشان می‌دهد. پرداخت و فاکتور در ماژول جدای Billing است و اتصال خرید به اشتراک در checkout هر اپ انجام می‌شود.
                        </p>
                        <Callout tone="tip" title="خلاصه در یک خط">
                            برنامه‌نویس هر محدودیت را <strong>یک‌بار در کد اپ</strong> تعریف و اعمال می‌کند؛ ادمین فقط <strong>مقدار هر پلن</strong> را در
                            پنل تعیین می‌کند. هیچ عددی در کد نیست.
                        </Callout>
                        <DocH3 id="what-flow">چرخه کامل</DocH3>
                        <DocSteps>
                            <li>برنامه‌نویس ویژگی را در کاتالوگ اپ تعریف و در سرویس مربوط اعمال می‌کند (<Link href={`${SUB_DOCS_BASE}/add-feature`}>افزودن محدودیت</Link>).</li>
                            <li>API اپ بالا می‌آید و ویژگی را خودکار در پنل می‌سازد/همگام می‌کند.</li>
                            <li>ادمین در <Link href="/subscription/matrix">مقادیر پلن‌ها</Link> سقف هر پلن را می‌گذارد.</li>
                            <li>صفحه قیمت‌های اپ همان اعداد را نشان می‌دهد؛ کاربر می‌خرد و checkout اشتراک را فعال می‌کند.</li>
                            <li>هر درخواست کاربر از لایه entitlement رد می‌شود؛ اگر از سقف رد شود ۴۰۳ با کد مشخص می‌گیرد و اپ پنجره ارتقا نشان می‌دهد.</li>
                        </DocSteps>
                    </>
                ),
            },
            {
                id: 'concepts',
                title: 'مفاهیم',
                headings: [{ id: 'concepts-table', title: 'اجزا' }, { id: 'concepts-default', title: 'پلن پیش‌فرض' }, { id: 'concepts-owner', title: 'پلن چه کسی ملاک است' }],
                body: (
                    <>
                        <DocH3 id="concepts-table">اجزا</DocH3>
                        <DocTable
                            headers={['مفهوم', 'یعنی', 'کالکشن']}
                            rows={[
                                ['ویژگی (Feature)', 'چیزی که پلن‌ها با آن فرق می‌کنند (سقف پروژه، اسپرینت، فضا)', <Code key="f">features</Code>],
                                ['پلن (Plan)', 'بسته قابل خرید: رایگان، حرفه‌ای، سازمانی — با slug ثابت', <Code key="p">plans</Code>],
                                ['مقدار پلن (PlanFeature)', 'سقف یک ویژگی در یک پلن (عدد، ‎-1 = نامحدود، true/false)', <Code key="pf">planfeatures</Code>],
                                ['قیمت (PlanPrice)', 'مبلغ یک پلن برای یک دوره (ماهانه، سالانه، …)', <Code key="pp">planprices</Code>],
                                ['اشتراک (Subscription)', 'کاربر X روی پلن Y از تاریخ A تا B', <Code key="s">subscriptions</Code>],
                                ['ثبت مصرف (UsageLog)', 'هر مصرف سهمیه‌ای (مثلاً یک پیام دستیار)', <Code key="u">usagelogs</Code>],
                            ]}
                        />
                        <DocH3 id="concepts-default">پلن پیش‌فرض</DocH3>
                        <p>
                            یک پلن (معمولاً رایگان) «پیش‌فرض» است. کاربری که اشتراک فعال ندارد — تازه ثبت‌نام کرده یا اشتراکش تمام شده — در
                            اولین برخورد با یک محدودیت یا باز کردن «اشتراک من» خودکار روی این پلن می‌رود (<Code>ensureDefaultSubscription</Code>).
                            اپی که پلن پیش‌فرض ندارد، کاربر بی‌اشتراک را با خطای <Code>SUBSCRIPTION_REQUIRED</Code> به صفحه قیمت‌ها می‌فرستد.
                        </p>
                        <DocH3 id="concepts-owner">پلن چه کسی ملاک است</DocH3>
                        <p>
                            پیش‌فرض پلن خود کاربر درخواست‌دهنده. برای منابع مشترک (پروژه، تیم) اپ <Code>ownerUserId</Code> را می‌دهد تا پلن
                            <strong> مالک</strong> ملاک باشد — اعضای دعوت‌شده لازم نیست پلن بخرند. سقف‌ها برای <strong>همهٔ حساب‌ها</strong>، حتی
                            ادمین‌ها، اعمال می‌شود تا ادمین همان چیزی را ببیند که مشتری می‌بیند. برای معاف کردن حساب‌های
                            <Code>admin</Code>/<Code>super-admin</Code> یک اپ، در env همان API <Code>SUBSCRIPTION_ADMIN_BYPASS=true</Code> بگذارید.
                        </p>
                    </>
                ),
            },
            {
                id: 'modes',
                title: 'چهار نوع سنجش',
                headings: [{ id: 'modes-table', title: 'جدول' }, { id: 'modes-reset', title: 'صفر شدن سهمیه' }, { id: 'modes-values', title: 'مقدارهای خاص' }],
                body: (
                    <>
                        <DocH3 id="modes-table">جدول</DocH3>
                        <DocTable
                            headers={['نوع (mode)', 'مقدار پلن', 'مصرف (used) =', 'کِی رد می‌شود', 'مثال']}
                            rows={[
                                [<Code key="1">switch</Code>, 'باز / قفل', '—', 'قفل باشد', 'اسپرینت، گزارش‌ساز پیشرفته'],
                                [<Code key="2">counter</Code>, 'حداکثر تعداد هم‌زمان', 'شمارش زنده از دادهٔ اپ', 'فعلی + افزودنی > سقف', 'تعداد پروژه، کل کارت‌ها، فضای فایل'],
                                [<Code key="3">cap</Code>, 'حداکثر اندازه یک مورد', '—', 'اندازه درخواست > سقف', 'اعضای یک پروژه، حجم یک فایل'],
                                [<Code key="4">consumable</Code>, 'سهمیه هر دوره', 'جمع UsageLog در دوره جاری', 'مصرف دوره ≥ سقف', 'پیام دستیار در ماه'],
                            ]}
                        />
                        <Callout tone="note">
                            counter و cap چیزی در UsageLog ثبت نمی‌کنند؛ با حذف پروژه/کارت/فایل ظرفیت خودبه‌خود آزاد می‌شود.
                        </Callout>
                        <DocH3 id="modes-reset">صفر شدن سهمیه (consumable)</DocH3>
                        <DocTable
                            headers={['resetInterval', 'پنجره', 'کاربرد']}
                            rows={[
                                [<Code key="m">monthly</Code>, 'هر ماه از روز شروع اشتراک — پلن سالانه هم ماهانه پر می‌شود', 'پیش‌فرض کاتالوگ'],
                                [<Code key="p">period</Code>, 'هر دوره پرداخت (ماهانه = ماه، سالانه = سال)', 'رفتار ویژگی‌های قدیمی بدون resetInterval'],
                                [<Code key="n">never</Code>, 'کل عمر اشتراک', 'اعتبار یک‌باره'],
                            ]}
                        />
                        <DocH3 id="modes-values">مقدارهای خاص</DocH3>
                        <ul>
                            <li><Code>-1</Code> (UNLIMITED) = نامحدود؛ همهٔ assert ها رد نمی‌کنند و پنل/صفحه قیمت «نامحدود» نشان می‌دهند.</li>
                            <li>بدون مقدار در پلن = <Code>defaultValue</Code> ویژگی؛ اگر آن هم نباشد = بسته.</li>
                            <li>تغییر مقدار در پنل حداکثر ۳۰ ثانیه بعد روی همهٔ سرورها اعمال می‌شود (کش حافظه) و روی اشتراک‌های فعلی هم اثر دارد.</li>
                        </ul>
                    </>
                ),
            },
        ],
    },
    {
        slug: 'admin-guide',
        title: 'راهنمای ادمین و چک‌لیست لانچ',
        summary: 'راه‌اندازی پلن‌ها، ماتریس سقف‌ها، اعطای اشتراک، پشتیبانی و چک‌لیست قبل از لانچ.',
        group: 'شروع',
        sections: [
            {
                id: 'setup',
                title: 'راه‌اندازی',
                headings: [{ id: 'setup-steps', title: 'ترتیب کار' }, { id: 'setup-checklist', title: 'چک‌لیست لانچ' }],
                body: (
                    <>
                        <DocH3 id="setup-steps">ترتیب کار</DocH3>
                        <DocSteps>
                            <li>API اپ را یک‌بار اجرا کنید تا ویژگی‌های کد در <Link href="/subscription/features">ویژگی‌ها</Link> ساخته شوند.</li>
                            <li>در <Link href="/subscription/plans">پلن‌ها</Link> پلن رایگان (slug: free، پیش‌فرض) و پلن‌های پولی را بسازید.</li>
                            <li>در <Link href="/subscription/matrix">مقادیر پلن‌ها</Link> برای هر ویژگی و هر پلن مقدار بگذارید.</li>
                            <li>در <Link href="/subscription/prices">قیمت‌ها</Link>: رایگان ماهانه ۰؛ پولی‌ها ماهانه و سالانه.</li>
                            <li>صفحه قیمت‌های اپ را باز کنید و با یک حساب تست، خرید آزمایشی/کد تخفیف ۱۰۰٪ را امتحان کنید.</li>
                        </DocSteps>
                        <DocH3 id="setup-checklist">چک‌لیست لانچ</DocH3>
                        <ul>
                            <li>بالای تب <Link href="/subscription">اشتراک‌ها</Link> هر سه مورد سبز باشد (پلن پیش‌فرض، مقدار همه ویژگی‌ها، همگامی کاتالوگ).</li>
                            <li>در env تولید <Code>SUBSCRIPTION_TEST_MODE</Code> خاموش باشد (خرید آزمایشی فقط برای ادمین).</li>
                            <li>کد تخفیف‌های تستی (مثل TEST100) در Billing غیرفعال شوند.</li>
                            <li>هر ویژگی در <Link href="/subscription/usage-map">نقشه استفاده</Link> «بدون مقدار در پلن‌ها» نداشته باشد.</li>
                        </ul>
                    </>
                ),
            },
            {
                id: 'support',
                title: 'پشتیبانی کاربران',
                headings: [{ id: 'support-why', title: '«چرا نمی‌توانم …؟»' }, { id: 'support-grant', title: 'اعطا، تمدید، لغو' }],
                body: (
                    <>
                        <DocH3 id="support-why">«چرا نمی‌توانم …؟»</DocH3>
                        <p>
                            در تب اشتراک‌ها ایمیل کاربر را جستجو و روی نامش بزنید: پلن، تاریخ پایان و برای هر ویژگی مصرف/سقف و تاریخ پر شدن
                            سهمیه دیده می‌شود. اگر پروژه مال کس دیگری است، پلن <strong>مالک پروژه</strong> را ببینید.
                        </p>
                        <DocH3 id="support-grant">اعطا، تمدید، لغو</DocH3>
                        <ul>
                            <li><strong>اعطای اشتراک:</strong> بدون پرداخت؛ اشتراک فعلی لغو و پلن جدید فعال می‌شود (همان مسیر خرید واقعی).</li>
                            <li><strong>تمدید:</strong> پایان را N روز جلو می‌برد (از امروز اگر منقضی بوده).</li>
                            <li><strong>لغو:</strong> فوری؛ کاربر به پلن پیش‌فرض برمی‌گردد. مبلغی برگشت داده نمی‌شود.</li>
                        </ul>
                    </>
                ),
            },
        ],
    },
    {
        slug: 'connect-app',
        title: 'اتصال یک اپ به اشتراک',
        summary: 'ماژول، کاتالوگ ویژگی‌ها، شمارنده‌ها، پلن پیش‌فرض، checkout و فرانت — برای اپ جدید.',
        group: 'برای برنامه‌نویس‌ها',
        sections: [
            {
                id: 'backend',
                title: 'بک‌اند',
                headings: [{ id: 'backend-steps', title: 'قدم‌ها' }, { id: 'backend-catalog', title: 'فایل کاتالوگ' }, { id: 'backend-register', title: 'ثبت کاتالوگ و شمارنده‌ها' }],
                body: (
                    <>
                        <DocH3 id="backend-steps">قدم‌ها</DocH3>
                        <DocSteps>
                            <li><Code>SubscriptionModule</Code> را در <Code>app.module.ts</Code> import کنید (گلوبال است) و کانکشن <Code>APP_DB</Code> را داشته باشید.</li>
                            <li>پوشه <Code>src/subscription/</Code> بسازید: فایل کاتالوگ + سرویس glue + ماژول گلوبال.</li>
                            <li>در <Code>onModuleInit</Code> سرویس، <Code>registerCatalog(catalog, counters)</Code> را صدا بزنید.</li>
                            <li>در هر سرویسی که منبع می‌سازد، assert مناسب را صدا بزنید (<Link href={`${SUB_DOCS_BASE}/enforcement-api`}>مرجع</Link>).</li>
                            <li>در checkout بعد از پرداخت موفق <Code>activateSubscriptionForUser(userId, planId, planPriceId)</Code>.</li>
                            <li>در پنل پلن پیش‌فرض و مقادیر را تعیین کنید.</li>
                        </DocSteps>
                        <DocH3 id="backend-catalog">فایل کاتالوگ</DocH3>
                        <CodeBlock caption="یک فایل = همهٔ ویژگی‌های اپ (منبع حقیقت)">{CATALOG_SAMPLE}</CodeBlock>
                        <DocH3 id="backend-register">ثبت کاتالوگ و شمارنده‌ها</DocH3>
                        <CodeBlock>{REGISTER_SAMPLE}</CodeBlock>
                        <Callout tone="note" title="همگام‌سازی چه چیزی را عوض می‌کند">
                            ویژگی نبود → ساخته می‌شود. بود → فیلدهای فنی (mode، resetInterval، usedIn، enforcement) از کد؛ نام، واحد، ترتیب و
                            «نمایش در کارت» که ادمین عوض کرده دست نمی‌خورد. اگر نوع (boolean/quantity) در دیتابیس با کد فرق کند تغییر نمی‌کند و
                            در پنل هشدار می‌آید.
                        </Callout>
                    </>
                ),
            },
            {
                id: 'frontend',
                title: 'فرانت',
                headings: [{ id: 'frontend-pricing', title: 'صفحه قیمت‌ها' }, { id: 'frontend-gate', title: 'قفل UI و پنجره ارتقا' }, { id: 'frontend-account', title: 'اشتراک من' }],
                body: (
                    <>
                        <DocH3 id="frontend-pricing">صفحه قیمت‌ها</DocH3>
                        <p>
                            داده از <Code>GET /api/subscription/public/plans</Code>. نمونهٔ کامل و قابل کپی: TaskVision —
                            <Code>apps/taskvision/app/(main)/pricing/</Code> (فایل <Code>pricing.config.ts</Code> + <Code>README.md</Code>).
                        </p>
                        <DocH3 id="frontend-gate">قفل UI و پنجره ارتقا</DocH3>
                        <CodeBlock>{FRONT_SAMPLE}</CodeBlock>
                        <p>
                            در TaskVision یک interceptor سراسری axios (<Code>app/components/SubscriptionUpgrade</Code>) هر ۴۰۳ اشتراکی را به
                            پنجره ارتقا تبدیل می‌کند و <Code>ErrorToaster</Code> برای همان خطا toast نمی‌زند — کد صفحات دست نمی‌خورد.
                        </p>
                        <DocH3 id="frontend-account">اشتراک من</DocH3>
                        <p>
                            <Code>useSubscriptionOverview</Code> + <Code>PlanUsagePanel</Code> از <Code>@my-workspace/components</Code>:
                            پلن، تاریخ پایان و مصرف هر ویژگی (نامحدود، «حداکثر …» برای cap، تاریخ پر شدن سهمیه).
                        </p>
                    </>
                ),
            },
        ],
    },
    {
        slug: 'add-feature',
        title: 'افزودن یک محدودیت جدید',
        summary: 'قدم‌به‌قدم: انتخاب نوع، تعریف در کاتالوگ، اعمال در سرویس، مقدار در پنل.',
        group: 'برای برنامه‌نویس‌ها',
        sections: [
            {
                id: 'steps',
                title: 'قدم‌ها',
                headings: [{ id: 'steps-choose', title: 'نوع را انتخاب کنید' }, { id: 'steps-do', title: 'پیاده‌سازی' }, { id: 'steps-dont', title: 'نکنید' }],
                body: (
                    <>
                        <DocH3 id="steps-choose">نوع را انتخاب کنید</DocH3>
                        <DocTable
                            headers={['سؤال', 'نوع']}
                            rows={[
                                ['فقط باز یا بسته است؟', <Code key="a">switch</Code>],
                                ['«حداکثر N تا از X داشته باشد» و با حذف آزاد شود؟', <Code key="b">counter</Code> ],
                                ['«هر X حداکثر N اندازه دارد» (یک فایل، یک پروژه)؟', <Code key="c">cap</Code>],
                                ['«هر ماه N بار می‌تواند»؟', <Code key="d">consumable</Code>],
                            ]}
                        />
                        <DocH3 id="steps-do">پیاده‌سازی</DocH3>
                        <DocSteps>
                            <li>در فایل کاتالوگ اپ یک تعریف اضافه کنید: <Code>code</Code> یکتا، <Code>mode</Code>، <Code>unit</Code>، <Code>group</Code>، توضیح‌ها و <Code>usedIn</Code> (کجا و چرا).</li>
                            <li>برای ویژگی‌ای که بعد از لانچ اضافه می‌شود <Code>defaultValue</Code> بدهید تا تا وقتی ادمین مقدار نگذاشته اپ رفتار قبلی را داشته باشد (switch: true؛ عدد: UNLIMITED).</li>
                            <li>counter: شمارنده‌اش را در <Code>registerCatalog</Code> ثبت کنید.</li>
                            <li>در همهٔ مسیرهای ساخت آن منبع assert بگذارید (API عادی، ویجت، دستیار هوشمند، import …) و همان‌ها را در <Code>usedIn</Code> بنویسید.</li>
                            <li>API را ری‌استارت کنید؛ ویژگی در پنل ظاهر می‌شود. در ماتریس مقدار پلن‌ها را بگذارید.</li>
                        </DocSteps>
                        <DocH3 id="steps-dont">نکنید</DocH3>
                        <ul>
                            <li>عدد سقف را در کد ننویسید؛ کد فقط <Code>code</Code> ویژگی را می‌شناسد.</li>
                            <li>کد ویژگی را بعد از لانچ عوض نکنید — مقدارهای پلن به آن بسته‌اند.</li>
                            <li><Code>checkFeature</Code>/<Code>consumeFeature</Code> را مستقیم صدا نزنید؛ پلن پیش‌فرض، معافیت اختیاری ادمین و خطای ساخت‌یافته را از دست می‌دهید.</li>
                            <li>ویژگی‌ای که فقط در مرورگر ذخیره می‌شود را <Code>enforcement: 'client'</Code> علامت بزنید تا ادمین بداند API آن را بلاک نمی‌کند.</li>
                        </ul>
                    </>
                ),
            },
            {
                id: 'storage',
                title: 'سقف فضای فایل',
                headings: [{ id: 'storage-hook', title: 'هوک آپلود' }],
                body: (
                    <>
                        <DocH3 id="storage-hook">هوک آپلود</DocH3>
                        <p>
                            <Code>FileService</Code> هسته قبل از هر آپلود کاربر (multer، <Code>init-upload</Code> اگر <Code>size</Code> ارسال شود، و
                            قطعی در <Code>complete-upload</Code> قبل از merge) هوک <Code>beforeUserUpload</Code> را صدا می‌زند. رد شدن در
                            complete-upload باعث Abort پارت‌ها روی استوریج می‌شود.
                        </p>
                        <CodeBlock>{STORAGE_HOOK}</CodeBlock>
                        <Callout tone="warn">
                            حجم در complete-upload از <Code>metadata.size</Code> ارسالی کلاینت خوانده می‌شود. مصرف فضا = جمع حجم فایل‌هایی که خود
                            کاربر آپلود کرده (<Code>FileService.getUserStorageUsage</Code>).
                        </Callout>
                    </>
                ),
            },
        ],
    },
    {
        slug: 'enforcement-api',
        title: 'مرجع اعمال محدودیت (API کد)',
        summary: 'SubscriptionEntitlementService، خطای ۴۰۳ ساخت‌یافته و FeatureGuard.',
        group: 'برای برنامه‌نویس‌ها',
        sections: [
            {
                id: 'service',
                title: 'SubscriptionEntitlementService',
                headings: [{ id: 'service-methods', title: 'متدها' }, { id: 'service-examples', title: 'نمونه' }],
                body: (
                    <>
                        <DocH3 id="service-methods">متدها</DocH3>
                        <DocTable
                            headers={['متد', 'کار', 'خطا']}
                            rows={[
                                [<Code key="1">assertFeature(user, code, {'{ownerUserId}'})</Code>, 'switch باز است؟', 'FEATURE_LOCKED'],
                                [<Code key="2">assertWithinLimit(user, code, {'{current?, adding=1, ownerUserId}'})</Code>, 'counter: فعلی + افزودنی ≤ سقف', 'LIMIT_REACHED'],
                                [<Code key="3">assertCap(user, code, requested, {'{ownerUserId, used?}'})</Code>, 'cap: اندازه ≤ سقف. برای سقف‌های شمارشی (کارت رنگی، تگ، عضو) used = تعداد فعلی تا پیام خطا «مقدار استفاده‌شده» را نشان دهد نه «مقدار درخواستی»', 'LIMIT_REACHED'],
                                [<Code key="4">assertCanConsume(user, code, amount)</Code>, 'consumable: باقی‌مانده ≥ amount (قبل از کار)', 'LIMIT_REACHED'],
                                [<Code key="5">consume(user, code, amount, {'{refId, note}'})</Code>, 'ثبت مصرف بعد از موفقیت — هرگز throw نمی‌کند', '—'],
                                [<Code key="6">can(user, code)</Code>, 'boolean بدون throw', '—'],
                                [<Code key="7">getEntitlement(userId, code)</Code>, 'یک ردیف کامل (limit, used, remaining, unlimited, resetsAt)', 'REQUIRED'],
                                [<Code key="8">getEntitlements(userId)</Code>, 'همه ردیف‌ها + اشتراک — همان entitlements/me', '—'],
                                [<Code key="9">registerCatalog(catalog, counters)</Code>, 'همگام‌سازی کاتالوگ در boot', '—'],
                            ]}
                        />
                        <p>
                            همه متدها: برای همه حساب‌ها اعمال می‌شوند (ادمین فقط با <Code>SUBSCRIPTION_ADMIN_BYPASS=true</Code> معاف است)، کاربر بدون اشتراک → پلن پیش‌فرض، ویژگی تعریف‌نشده → آزاد با هشدار در لاگ (اپ نمی‌شکند).
                        </p>
                        <DocH3 id="service-examples">نمونه</DocH3>
                        <CodeBlock>{ENFORCE_SAMPLE}</CodeBlock>
                    </>
                ),
            },
            {
                id: 'errors',
                title: 'خطای ۴۰۳',
                headings: [{ id: 'errors-body', title: 'بدنه پاسخ' }, { id: 'errors-guard', title: 'FeatureGuard' }],
                body: (
                    <>
                        <DocH3 id="errors-body">بدنه پاسخ</DocH3>
                        <CodeBlock caption="SubscriptionLimitException — SharedService.errorHelper هم code و details را نگه می‌دارد">{ERROR_BODY}</CodeBlock>
                        <DocH3 id="errors-guard">FeatureGuard</DocH3>
                        <p>برای switch روی کل یک endpoint با پلن خود کاربر:</p>
                        <CodeBlock>{GUARD_SAMPLE}</CodeBlock>
                    </>
                ),
            },
        ],
    },
    {
        slug: 'api-reference',
        title: 'مرجع endpointها',
        summary: 'مسیرهای عمومی، کاربر و ادمین ماژول اشتراک.',
        group: 'مرجع',
        sections: [
            {
                id: 'routes',
                title: 'مسیرها',
                headings: [{ id: 'routes-public', title: 'عمومی و کاربر' }, { id: 'routes-admin', title: 'ادمین' }],
                body: (
                    <>
                        <DocH3 id="routes-public">عمومی و کاربر</DocH3>
                        <DocTable
                            headers={['متد', 'مسیر', 'کار']}
                            rows={[
                                ['GET', <Code key="1">/api/subscription/public/plans</Code>, 'صفحه قیمت‌ها (بدون ورود)'],
                                ['GET', <Code key="2">/api/subscription/plan-prices/:id</Code>, 'سند یک قیمت (checkout)'],
                                ['GET', <Code key="3">/api/subscription/subscriptions/me</Code>, 'پلن + مصرف کاربر جاری'],
                                ['GET', <Code key="4">/api/subscription/entitlements/me</Code>, 'نقشه دسترسی برای قفل UI'],
                                ['POST', <Code key="5">/api/subscription/usage-status</Code>, '{"{ features: [codes] }"} → وضعیت هر کد'],
                                ['GET', <Code key="6">/api/subscription/my-usage-logs</Code>, 'تاریخچه مصرف کاربر'],
                                ['POST', <Code key="7">/api/subscription/test/purchase</Code>, 'خرید آزمایشی (ادمین، یا SUBSCRIPTION_TEST_MODE=true)'],
                            ]}
                        />
                        <DocH3 id="routes-admin">ادمین</DocH3>
                        <DocTable
                            headers={['متد', 'مسیر', 'کار']}
                            rows={[
                                ['GET', <Code key="1">/api/subscription/admin/overview</Code>, 'اعداد بالای پنل + هشدارهای راه‌اندازی'],
                                ['GET', <Code key="2">/api/subscription/admin/subscriptions</Code>, 'جدول صفحه‌بندی‌شده (status، planId، search)'],
                                ['POST', <Code key="3">/api/subscription/admin/subscriptions/grant</Code>, 'اعطای دستی'],
                                ['POST', <Code key="4">/api/subscription/admin/subscriptions/:id/extend | cancel</Code>, 'تمدید / لغو'],
                                ['GET', <Code key="5">/api/subscription/admin/users/:userId/entitlements</Code>, 'سهمیه لحظه‌ای کاربر (بدون اثر جانبی)'],
                                ['GET', <Code key="6">/api/subscription/admin/usage-logs | usage-summary</Code>, 'ثبت‌ها و جمع مصرف'],
                                ['GET/PUT', <Code key="7">/api/subscription/admin/matrix</Code>, 'پلن × ویژگی'],
                                ['GET', <Code key="8">/api/subscription/admin/catalog</Code>, 'نقشه استفاده در کد'],
                                ['CRUD', <Code key="9">/api/subscription/features | plans | plan-prices</Code>, 'تعریف‌ها'],
                                ['…', <Code key="10">/api/subscription/commerce/*</Code>, 'تمدید خودکار و سفارش‌های تمدید'],
                            ]}
                        />
                    </>
                ),
            },
        ],
    },
    {
        slug: 'integrations',
        title: 'یکپارچه‌سازی‌های فعلی',
        summary: 'TaskVision: ویژگی‌ها، جای اعمال، هوک فضا و seed پلن‌ها.',
        group: 'مرجع',
        sections: [
            {
                id: 'taskvision',
                title: 'TaskVision',
                headings: [{ id: 'tv-files', title: 'فایل‌ها' }, { id: 'tv-features', title: 'ویژگی‌ها' }, { id: 'tv-seed', title: 'seed اولیه' }],
                body: (
                    <>
                        <DocH3 id="tv-files">فایل‌ها</DocH3>
                        <DocTable
                            headers={['فایل', 'کار']}
                            rows={[
                                [<Code key="1">apps/taskvision/src/subscription/taskvision-features.ts</Code>, 'کاتالوگ — همهٔ ویژگی‌ها و usedIn'],
                                [<Code key="2">apps/taskvision/src/subscription/taskvision-subscription.service.ts</Code>, 'شمارنده‌ها، مالک پروژه، هوک آپلود، assertCanAddCard'],
                                [<Code key="3">apps/taskvision/seed-subscription-plans.mjs</Code>, 'ساخت سه پلن و مقادیر اولیه (فقط موارد ناموجود)'],
                                [<Code key="4">my-workspace-nextjs/apps/taskvision/app/(main)/pricing/</Code>, 'صفحه قیمت‌ها (pricing.config.ts)'],
                                [<Code key="5">my-workspace-nextjs/apps/taskvision/app/components/SubscriptionUpgrade/</Code>, 'پنجره ارتقا برای هر ۴۰۳ اشتراکی'],
                            ]}
                        />
                        <DocH3 id="tv-features">ویژگی‌ها</DocH3>
                        <p>
                            فهرست زنده با جای اعمال هرکدام: <Link href="/subscription/usage-map">نقشه استفاده در کد</Link> (وقتی در پنل روی API
                            TaskVision هستید). منابع پروژه (اعضا، کارت، پیوست، اسپرینت، اپیک، worklog، گزارش، ویجت) با پلن مالک پروژه سنجیده
                            می‌شوند؛ پیام دستیار و فضای فایل شخصی کاربرند. پس‌زمینه‌های ویژه بورد فقط در UI قفل می‌شوند.
                        </p>
                        <DocH3 id="tv-seed">seed اولیه</DocH3>
                        <CodeBlock>{SEED_RUN}</CodeBlock>
                        <Callout tone="note">
                            اگر پلن پیش‌فرض نباشد، API در boot پلن «رایگان» را پیش‌فرض و slugهای free/pro/business را روی پلن‌های اولیه می‌گذارد
                            (فقط اگر خالی باشند).
                        </Callout>
                    </>
                ),
            },
        ],
    },
    {
        slug: 'faq',
        title: 'سؤال‌ها و عیب‌یابی',
        summary: 'مشکلات رایج: ویژگی ظاهر نمی‌شود، سقف اعمال نمی‌شود، مصرف صفر نمی‌شود، …',
        group: 'مرجع',
        sections: [
            {
                id: 'faq',
                title: 'سؤال‌ها',
                headings: [],
                body: (
                    <DocFaq
                        items={[
                            ['ویژگی جدید در پنل نیست.', 'API اپ را ری‌استارت کنید؛ registerCatalog در boot اجرا می‌شود. در لاگ API دنبال «[subscription catalog]» بگردید.'],
                            ['مقدار را عوض کردم ولی اثر ندارد.', 'تا ۳۰ ثانیه کش حافظه هر سرور. اگر بیشتر شد، مطمئن شوید پنل روی API همان اپ است (انتخاب اپ هنگام ورود).'],
                            ['کاربر می‌گوید سقف پر است ولی پروژه کمی دارد.', 'سقف پروژه‌های خودش (مالک) را می‌شمارد؛ اگر در پروژه کس دیگری کار می‌کند، پلن مالک آن پروژه ملاک است.'],
                            ['سهمیه ماهانه در پلن سالانه پر نمی‌شود.', 'resetInterval ویژگی باید monthly باشد (پیش‌فرض کاتالوگ). ویژگی‌های قدیمی بدون resetInterval هر دوره پرداخت صفر می‌شوند.'],
                            ['ویژگی‌ای ساختم ولی هیچ چیزی محدود نمی‌شود.', 'ویژگی دستی فقط نمایشی است؛ اعمال باید در کد باشد (افزودن محدودیت جدید).'],
                            ['با حساب ادمین هم سقف‌ها اعمال می‌شود؟', 'بله، به‌طور پیش‌فرض برای همه حساب‌ها. فقط اگر در env همان API مقدار SUBSCRIPTION_ADMIN_BYPASS=true باشد، حساب‌های admin و super-admin معاف می‌شوند و مصرفشان ثبت نمی‌شود.'],
                            ['پلن را نمی‌توانم حذف کنم.', 'وقتی اشتراکی (حتی قدیمی) روی آن ثبت شده حذف ممکن نیست؛ غیرفعالش کنید.'],
                        ]}
                    />
                ),
            },
        ],
    },
];
