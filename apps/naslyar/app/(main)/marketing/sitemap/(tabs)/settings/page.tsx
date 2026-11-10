'use client';

import { useConfigDraft } from '../../lib/SitemapProvider';
import { isValidPath, SaveBar, SectionIntro, SectionLoading, StringListEditor, ToggleItem, UrlRow } from '../../components/fields';
import { siteLink } from '../../lib/format';
import { SITEMAP_FILES_PREFIX, SITEMAP_INDEX_PATH, SITEMAP_PROTOCOL_MAX_URLS } from '../../lib/sitemap.types';
import parentStyles from '../../../Marketing.module.scss';
import hrStyles from '@/app/(main)/management/hr/Hr.module.scss';
import styles from '../../Sitemap.module.scss';

const KEYS = ['enabled', 'siteUrl', 'maxUrlsPerFile', 'staticPages', 'monitoring', 'advanced'] as const;

function siteUrlError(value: string): string | null {
    return /^https?:\/\/[^/\s]+\.[^/\s]+/i.test(value.trim()) ? null : 'آدرس کامل با http(s) لازم است، مثل https://studio.hosheton.com';
}

/** تنظیمات سراسری — وضعیت ماژول، دامنه، تقسیم فایل‌ها، صفحات ثابت، هشدارها و فیلدهای قدیمی */
export default function SitemapSettingsPage() {
    const { draft, update, dirty, saving, save, reset } = useConfigDraft(KEYS);
    if (!draft) return <SectionLoading />;

    const urlError = siteUrlError(draft.siteUrl);
    const invalidPage = draft.staticPages.some((p) => p.trim() && isValidPath(p.trim()));

    return (
        <>
            <SectionIntro topic="settings">
                دامنه سایت مبنای همه آدرس‌های سایت‌مپ است. مسیرهای عمومی ثابت‌اند (فرانت استودیو همین مسیرها را سرو
                می‌کند)؛ اگر دامنه را عوض کردید، ایندکس جدید را دوباره در Search Console ثبت کنید.
            </SectionIntro>

            <div className={parentStyles.formCard}>
                <h2 className={parentStyles.formSectionTitle}>۱. وضعیت و دامنه</h2>
                <ToggleItem
                    title="ماژول سایت‌مپ فعال باشد"
                    hint="با خاموش‌کردن، sitemap.xml و فایل‌های گروه‌ها روی سایت ۴۰۴ می‌دهند و خط Sitemap از robots.txt حذف می‌شود."
                    checked={draft.enabled}
                    onChange={(enabled) => update({ enabled })}
                />
                <div className={parentStyles.field}>
                    <label htmlFor="site-url">آدرس سایت (Site URL)</label>
                    <input
                        id="site-url"
                        dir="ltr"
                        value={draft.siteUrl}
                        aria-invalid={!!urlError}
                        onChange={(e) => update({ siteUrl: e.target.value })}
                        placeholder="https://studio.hosheton.com"
                    />
                    {urlError ? (
                        <span className={parentStyles.fieldError}>{urlError}</span>
                    ) : /^http:\/\//i.test(draft.siteUrl.trim()) ? (
                        <span className={parentStyles.fieldError}>
                            روی http است؛ در محیط واقعی باید https باشد (اگر «اجبار HTTPS» در قوانین روشن باشد، خروجی https می‌شود).
                        </span>
                    ) : (
                        <p className={parentStyles.fieldHint}>همان دامنه‌ای که کاربران و گوگل سایت را با آن می‌بینند، بدون اسلش انتهایی.</p>
                    )}
                </div>
                {!urlError && (
                    <div className={styles.urlList}>
                        <UrlRow label="ایندکس سایت‌مپ" url={siteLink(draft.siteUrl, SITEMAP_INDEX_PATH)} />
                        <UrlRow label="فایل‌های گروه‌ها" url={siteLink(draft.siteUrl, `${SITEMAP_FILES_PREFIX}templates-1.xml`)} hint="الگو: /sitemaps/{شناسه گروه}-{شماره}.xml" />
                    </div>
                )}
            </div>

            <div className={`${parentStyles.formCard} ${styles.cardGap}`}>
                <h2 className={parentStyles.formSectionTitle}>۲. تقسیم فایل‌ها</h2>
                <div className={parentStyles.field}>
                    <label htmlFor="max-urls">سقف URL در هر فایل</label>
                    <input
                        id="max-urls"
                        type="number"
                        min={1}
                        max={SITEMAP_PROTOCOL_MAX_URLS}
                        dir="ltr"
                        value={draft.maxUrlsPerFile}
                        onChange={(e) => update({ maxUrlsPerFile: Number(e.target.value) || 1 })}
                    />
                    <p className={parentStyles.fieldHint}>
                        حداکثر پروتکل ۵۰٬۰۰۰ است؛ پیش‌فرض ۱۰٬۰۰۰ فایل‌های سبک‌تری می‌دهد. گروه‌ها می‌توانند سقف اختصاصی داشته باشند.
                    </p>
                </div>
            </div>

            <div className={`${parentStyles.formCard} ${styles.cardGap}`}>
                <h2 className={parentStyles.formSectionTitle}>۳. صفحات ثابت (گروه «صفحات ثابت»)</h2>
                <div className={parentStyles.field}>
                    <label>مسیرهای عمومی که به دیتابیس وابسته نیستند</label>
                    <StringListEditor
                        items={draft.staticPages}
                        onChange={(staticPages) => update({ staticPages })}
                        placeholder="/explore"
                        addLabel="افزودن صفحه"
                        validate={isValidPath}
                    />
                    <p className={parentStyles.fieldHint}>
                        فقط صفحاتی که بدون لاگین باز می‌شوند و خودشان آدرس نهایی‌اند (نه ریدایرکت). مثلاً «/» در استودیو به
                        /explore ریدایرکت می‌شود، پس فقط /explore را ثبت کنید.
                    </p>
                </div>
            </div>

            <div className={`${parentStyles.formCard} ${styles.cardGap}`}>
                <h2 className={parentStyles.formSectionTitle}>۴. هشدارها</h2>
                <ToggleItem
                    title="ثبت شکست تولید خودکار"
                    hint="اگر کرون ساعتی در تولید یک گروه شکست بخورد، اجرای «ناموفق» در تاریخچه ثبت و در نمای کلی نمایش داده می‌شود."
                    checked={draft.monitoring.alertOnGenerationFailure}
                    onChange={(alertOnGenerationFailure) => update({ monitoring: { ...draft.monitoring, alertOnGenerationFailure } })}
                />
                <div className={parentStyles.field}>
                    <label htmlFor="drop-percent">هشدار افت تعداد URL (درصد)</label>
                    <input
                        id="drop-percent"
                        type="number"
                        min={0}
                        max={100}
                        dir="ltr"
                        value={draft.monitoring.alertOnUrlDropPercent}
                        onChange={(e) =>
                            update({ monitoring: { ...draft.monitoring, alertOnUrlDropPercent: Math.min(100, Math.max(0, Number(e.target.value) || 0)) } })
                        }
                    />
                    <p className={parentStyles.fieldHint}>
                        اگر بین دو ممیزی تعداد URL یک گروه این مقدار کم شود، خطای «URL_COUNT_DROPPED» ثبت می‌شود. پیشنهاد: ۲۰. صفر = خاموش.
                    </p>
                </div>
            </div>

            <div className={`${parentStyles.formCard} ${styles.cardGap}`}>
                <h2 className={parentStyles.formSectionTitle}>۵. فیلدهای قدیمی (Legacy)</h2>
                <ToggleItem
                    title="تولید changefreq"
                    hint="گوگل و بینگ این فیلد را نادیده می‌گیرند. با روشن‌کردن، مقدار هر گروه از فرم همان گروه خوانده می‌شود."
                    checked={draft.advanced.changefreq}
                    onChange={(changefreq) => update({ advanced: { ...draft.advanced, changefreq } })}
                />
                <ToggleItem
                    title="تولید priority"
                    hint="عدد ۰ تا ۱ برای هر گروه؛ موتورهای جستجوی مدرن آن را هم نادیده می‌گیرند."
                    checked={draft.advanced.priority}
                    onChange={(priority) => update({ advanced: { ...draft.advanced, priority } })}
                />
                <div className={hrStyles.formNoteBox}>
                    <strong>بهترین رویه:</strong> هر دو خاموش بمانند؛ دقت lastmod مهم‌ترین سیگنال تازگی است.
                </div>
            </div>

            <SaveBar
                dirty={dirty}
                saving={saving}
                onReset={reset}
                onSave={() => save('تنظیمات ذخیره شد؛ سایت‌مپ با درخواست بعدی با مقادیر جدید ساخته می‌شود.')}
                label="ذخیره تنظیمات"
                disabled={!!urlError || invalidPage}
            />
        </>
    );
}
