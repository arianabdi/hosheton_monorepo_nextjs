'use client';

import { useConfigDraft } from '../../lib/SitemapProvider';
import { isValidRegex, SaveBar, SectionIntro, SectionLoading, StringListEditor, ToggleItem } from '../../components/fields';
import parentStyles from '../../../Marketing.module.scss';
import hrStyles from '@/app/(main)/management/hr/Hr.module.scss';
import styles from '../../Sitemap.module.scss';

const KEYS = ['urlRules', 'lastmod'] as const;

/** قوانین URL — نرمال‌سازی سراسری، الگوهای مسدود (امنیت) و آستانه تازگی lastmod */
export default function SitemapRulesPage() {
    const { draft, update, dirty, saving, save, reset } = useConfigDraft(KEYS);
    if (!draft) return <SectionLoading />;

    const rules = draft.urlRules;
    const setRule = (patch: Partial<typeof rules>) => update({ urlRules: { ...rules, ...patch } });
    const invalidPattern = rules.excludePatterns.some((p) => p.trim() && isValidRegex(p.trim()));

    return (
        <>
            <SectionIntro topic="rules">
                این قوانین روی همه گروه‌ها یکسان اعمال می‌شوند و تعیین می‌کنند هر URL با چه شکلی منتشر شود و کدام
                مسیرها هرگز وارد سایت‌مپ نشوند.
            </SectionIntro>

            <div className={parentStyles.formCard}>
                <h2 className={parentStyles.formSectionTitle}>۱. نرمال‌سازی خودکار</h2>
                <ToggleItem
                    title="اجبار HTTPS"
                    hint="آدرس‌های http به https تبدیل می‌شوند تا با آدرس نهایی سایت یکی باشند."
                    checked={rules.forceHttps}
                    onChange={(forceHttps) => setRule({ forceHttps })}
                />
                <ToggleItem
                    title="حذف query string"
                    hint="پارامترهایی مثل utm_source آدرس تکراری می‌سازند؛ سایت‌مپ فقط آدرس کانونی می‌دهد. پارامترهای ردیابی حتی با خاموش‌بودن این گزینه حذف می‌شوند."
                    checked={rules.stripQueryString}
                    onChange={(stripQueryString) => setRule({ stripQueryString })}
                />
                <ToggleItem
                    title="حذف اسلش انتهایی"
                    hint="/explore و /explore/ دو آدرس جدا حساب می‌شوند؛ فقط یکی منتشر می‌شود."
                    checked={rules.stripTrailingSlash}
                    onChange={(stripTrailingSlash) => setRule({ stripTrailingSlash })}
                />
                <ToggleItem
                    title="حروف کوچک در مسیر"
                    hint="فقط اگر همه slugها حروف کوچک‌اند روشن کنید؛ وگرنه آدرس ساخته‌شده با صفحه واقعی فرق می‌کند."
                    checked={rules.lowercasePaths}
                    onChange={(lowercasePaths) => setRule({ lowercasePaths })}
                />
            </div>

            <div className={`${parentStyles.formCard} ${styles.cardGap}`}>
                <h2 className={parentStyles.formSectionTitle}>۲. الگوهای مسدود (امنیت)</h2>
                <div className={parentStyles.field}>
                    <label>مسیرهایی که هرگز نباید در سایت‌مپ بیایند (regex)</label>
                    <StringListEditor
                        items={rules.excludePatterns}
                        onChange={(excludePatterns) => setRule({ excludePatterns })}
                        placeholder="^/login"
                        addLabel="افزودن الگو"
                        emptyLabel="هیچ الگویی ثبت نشده — توصیه نمی‌شود."
                        validate={isValidRegex}
                    />
                    <p className={parentStyles.fieldHint}>
                        صفحات ورود، پنل کاربری، پرداخت و مسیرهای API به‌صورت پیش‌فرض مسدودند. الگو روی مسیر بررسی می‌شود؛
                        برای «شروع مسیر» از <span className={styles.keyBadge}>^</span> استفاده کنید (مثل{' '}
                        <span className={styles.keyBadge}>^/wallet</span>).
                    </p>
                </div>
            </div>

            <div className={`${parentStyles.formCard} ${styles.cardGap}`}>
                <h2 className={parentStyles.formSectionTitle}>۳. تازگی lastmod</h2>
                <div className={parentStyles.field}>
                    <label htmlFor="stale-days">آستانه هشدار قدیمی‌بودن (روز)</label>
                    <input
                        id="stale-days"
                        type="number"
                        min={0}
                        dir="ltr"
                        value={draft.lastmod.staleDays}
                        onChange={(e) => update({ lastmod: { staleDays: Math.max(0, Number(e.target.value) || 0) } })}
                    />
                    <p className={parentStyles.fieldHint}>
                        URLهایی که این تعداد روز تغییری نداشته‌اند در ممیزی با «STALE_LASTMOD» گزارش می‌شوند. صفر = خاموش.
                    </p>
                </div>
                <div className={hrStyles.formNoteBox}>
                    <strong>اصل مهم:</strong> lastmod یعنی زمان آخرین تغییر واقعی محتوا، نه زمان تولید سایت‌مپ. منبع تاریخ
                    هر گروه در فرم همان گروه انتخاب می‌شود.
                </div>
            </div>

            <SaveBar
                dirty={dirty}
                saving={saving}
                onReset={reset}
                onSave={() => save('قوانین URL ذخیره شد و روی تولید بعدی اعمال می‌شود.')}
                label="ذخیره قوانین"
                disabled={invalidPattern}
            />
        </>
    );
}
