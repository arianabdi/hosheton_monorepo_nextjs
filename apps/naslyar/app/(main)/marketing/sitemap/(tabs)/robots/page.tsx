'use client';

import { useConfigDraft, useSitemap, useSitemapData } from '../../lib/SitemapProvider';
import { isValidPath, SaveBar, SectionIntro, SectionLoading, StringListEditor, ToggleItem } from '../../components/fields';
import { siteLink } from '../../lib/format';
import { SITEMAP_ROBOTS_PATH } from '../../lib/sitemap.types';
import type { SitemapApi } from '../../lib/sitemap-api';
import parentStyles from '../../../Marketing.module.scss';
import styles from '../../Sitemap.module.scss';

const KEYS = ['robots'] as const;
const loadPreview = (api: SitemapApi) => api.getRobotsPreview();

/** robots.txt — قوانین کرول + خط Sitemap؛ پیش‌نمایش همان متنی است که روی دامنه سایت سرو می‌شود */
export default function SitemapRobotsPage() {
    const { config } = useSitemap();
    const { draft, update, dirty, saving, save, reset } = useConfigDraft(KEYS);
    const { data: preview } = useSitemapData(loadPreview);
    if (!draft || !config) return <SectionLoading />;

    const robots = draft.robots;
    const setRobots = (patch: Partial<typeof robots>) => update({ robots: { ...robots, ...patch } });
    const invalidPath = robots.disallowPaths.some((p) => p.trim() && isValidPath(p.trim()));

    return (
        <>
            <SectionIntro topic="robots">
                robots.txt مسیرها را از «کرول» می‌بندد، نه از «ایندکس». اگر مسیری هم در سایت‌مپ باشد و هم Disallow، سیگنال
                متناقض است و ممیزی آن را گزارش می‌کند.
            </SectionIntro>

            <div className={parentStyles.formCard}>
                <h2 className={parentStyles.formSectionTitle}>تنظیمات</h2>
                <ToggleItem
                    title="مدیریت robots.txt توسط این ماژول"
                    hint="با خاموش‌کردن، سایت یک robots.txt امن ثابت (بدون تنظیمات این صفحه) سرو می‌کند."
                    checked={robots.enabled}
                    onChange={(enabled) => setRobots({ enabled })}
                />
                <ToggleItem
                    title="افزودن خط Sitemap:"
                    hint="موتورهای جستجو سایت‌مپ را از robots.txt هم کشف می‌کنند — روشن بماند."
                    checked={robots.sitemapDirective}
                    disabled={!robots.enabled}
                    onChange={(sitemapDirective) => setRobots({ sitemapDirective })}
                />
                <div className={parentStyles.field}>
                    <label>مسیرهای Disallow</label>
                    <StringListEditor
                        items={robots.disallowPaths}
                        onChange={(disallowPaths) => setRobots({ disallowPaths })}
                        placeholder="/api/"
                        addLabel="افزودن مسیر"
                        validate={isValidPath}
                    />
                    <p className={parentStyles.fieldHint}>
                        پیش‌فرض‌ها API، صفحات ورود و پنل کاربری را می‌بندند. هر مسیر پیشوند است: <span className={styles.keyBadge}>/wallet</span>{' '}
                        همه زیرمسیرهای کیف پول را هم می‌بندد.
                    </p>
                </div>
                <div className={parentStyles.field}>
                    <label htmlFor="crawl-delay">Crawl-delay (ثانیه — اختیاری)</label>
                    <input
                        id="crawl-delay"
                        type="number"
                        min={1}
                        max={60}
                        dir="ltr"
                        value={robots.crawlDelay ?? ''}
                        placeholder="بدون محدودیت"
                        onChange={(e) => setRobots({ crawlDelay: e.target.value === '' ? null : Number(e.target.value) })}
                    />
                    <p className={parentStyles.fieldHint}>گوگل این فیلد را نادیده می‌گیرد؛ خالی بگذارید مگر کرولر خاصی سرور را تحت فشار بگذارد.</p>
                </div>
            </div>

            <SaveBar
                dirty={dirty}
                saving={saving}
                onReset={reset}
                onSave={() => save('robots.txt ذخیره شد و بلافاصله روی سایت اعمال می‌شود.')}
                label="ذخیره robots.txt"
                disabled={invalidPath}
            />

            <section className={styles.block}>
                <h2 className={styles.blockTitle}>پیش‌نمایش</h2>
                <p className={parentStyles.fieldHint}>
                    متن ذخیره‌شده‌ای که در{' '}
                    <a href={siteLink(config.siteUrl, SITEMAP_ROBOTS_PATH)} target="_blank" rel="noreferrer" className={styles.keyBadge}>
                        {siteLink(config.siteUrl, SITEMAP_ROBOTS_PATH)}
                    </a>{' '}
                    سرو می‌شود{dirty ? ' — تغییرات ذخیره‌نشده هنوز در آن نیست.' : '.'}
                    {!config.robots.enabled && ' (مدیریت ماژول خاموش است؛ سایت نسخه ثابت امن را سرو می‌کند.)'}
                </p>
                {preview === null ? <SectionLoading /> : <pre className={styles.codePreview}>{preview}</pre>}
            </section>
        </>
    );
}
