'use client';

import Link from 'next/link';
import { LuCircleCheck } from 'react-icons/lu';
import { useSitemap, useSitemapData } from '../lib/SitemapProvider';
import { EmptyState, SectionIntro, SectionLoading, UrlRow } from '../components/fields';
import { sitemapHref } from '../lib/sections';
import { formatNumber, relativeTime, siteLink } from '../lib/format';
import { HEALTH_LABELS, SITEMAP_INDEX_PATH, SITEMAP_ROBOTS_PATH } from '../lib/sitemap.types';
import type { GroupHealth, OverviewResponse } from '../lib/sitemap.types';
import type { SitemapApi } from '../lib/sitemap-api';
import parentStyles from '../../Marketing.module.scss';
import styles from '../Sitemap.module.scss';

const loadOverview = (api: SitemapApi) => api.getOverview();

/** موارد نیازمند رسیدگی — فقط چیزهایی که ادمین باید کاری برایشان بکند */
function attentionItems(data: OverviewResponse) {
    const items: Array<{ key: string; health: GroupHealth; title: string; detail: string; href: string; action: string }> = [];
    const lastRun = data.lastRuns[0];
    if (lastRun?.status === 'failed') {
        items.push({ key: 'run', health: 'error', title: 'آخرین اجرا ناموفق بود', detail: lastRun.message, href: sitemapHref.generation, action: 'تاریخچه' });
    }
    for (const group of data.groups) {
        if (group.health !== 'warning' && group.health !== 'error') continue;
        const detail = group.issueCount > 0
            ? `${formatNumber(group.issueCount)} یافته باز در آخرین ممیزی`
            : group.urlsCount === 0
              ? 'فعال است ولی هیچ URL واجد شرایطی ندارد'
              : 'تولید این گروه شکست خورد';
        items.push({
            key: group._id,
            health: group.health,
            title: group.title,
            detail,
            href: group.issueCount > 0 ? sitemapHref.validation : sitemapHref.editGroup(group._id),
            action: group.issueCount > 0 ? 'یافته‌ها' : 'ویرایش گروه',
        });
    }
    return items;
}

/** نمای کلی — داشبورد سلامت: وضعیت، آدرس‌های عمومی و موارد نیازمند رسیدگی */
export default function SitemapOverviewPage() {
    const { api } = useSitemap();
    const { data, loading } = useSitemapData(loadOverview);

    if (!data) {
        return loading ? <SectionLoading /> : <EmptyState>اطلاعاتی دریافت نشد — اتصال پنل به API استودیو را بررسی کنید.</EmptyState>;
    }

    const { config, groups, totals, lastGeneration } = data;
    const enabledGroups = groups.filter((g) => g.enabled).length;
    const status: GroupHealth = !config.enabled ? 'disabled' : totals.errors > 0 ? 'error' : totals.warnings > 0 ? 'warning' : 'healthy';
    const attention = attentionItems(data);

    const stats = [
        { label: 'کل URLهای منتشرشده', value: formatNumber(totals.urls) },
        { label: 'فایل‌های سایت‌مپ', value: formatNumber(totals.files) },
        { label: 'گروه‌های فعال', value: `${formatNumber(enabledGroups)} از ${formatNumber(groups.length)}` },
        { label: 'آخرین تولید موفق', value: relativeTime(lastGeneration?.createdAt) },
        { label: 'محتوای جدید / ویرایش امروز', value: `${formatNumber(totals.addedToday)} / ${formatNumber(totals.updatedToday)}` },
        { label: 'خطا / هشدار باز', value: `${formatNumber(totals.errors)} / ${formatNumber(totals.warnings)}` },
    ];

    return (
        <>
            <SectionIntro topic="basics">
                سلامت لحظه‌ای سایت‌مپ: چند URL منتشر شده، آخرین تولید کی بوده و چه چیزی رسیدگی می‌خواهد. آدرس ایندکس
                همان آدرسی است که یک‌بار در Google Search Console ثبت می‌کنید.
            </SectionIntro>

            <div className={parentStyles.statsBar}>
                <div className={parentStyles.statCard}>
                    <span className={`${styles.healthBadge} ${styles[status]}`}>{HEALTH_LABELS[status]}</span>
                    <div className={parentStyles.statLabel}>وضعیت کلی</div>
                </div>
                {stats.map((s) => (
                    <div key={s.label} className={parentStyles.statCard}>
                        <div className={parentStyles.statValue}>{s.value}</div>
                        <div className={parentStyles.statLabel}>{s.label}</div>
                    </div>
                ))}
            </div>

            <section className={styles.block}>
                <h2 className={styles.blockTitle}>آدرس‌های عمومی سایت</h2>
                <UrlRow
                    label="ایندکس سایت‌مپ — برای ثبت در Search Console و Bing"
                    url={siteLink(config.siteUrl, SITEMAP_INDEX_PATH)}
                    hint="فهرست همه فایل‌های گروه‌ها؛ هر فایل لینک صفحات همان گروه را دارد."
                />
                <UrlRow
                    label="robots.txt"
                    url={siteLink(config.siteUrl, SITEMAP_ROBOTS_PATH)}
                    hint={config.robots.sitemapDirective ? 'خط Sitemap: به این فایل اضافه شده است.' : 'خط Sitemap: خاموش است — از تب Robots.txt روشن کنید.'}
                />
                {api && (
                    <UrlRow
                        label="پیش‌نمایش مستقیم از API"
                        url={api.publicPreviewUrl('index')}
                        hint="همان محتوای ایندکس، بدون نیاز به دامنه سایت — برای بررسی قبل از انتشار یا روی محیط توسعه."
                    />
                )}
            </section>

            <section className={styles.block}>
                <h2 className={styles.blockTitle}>نیازمند رسیدگی</h2>
                {attention.length === 0 ? (
                    <p className={styles.allGood}>
                        <LuCircleCheck /> موردی برای رسیدگی نیست؛ همه گروه‌های فعال URL دارند و یافته بازی ثبت نشده است.
                    </p>
                ) : (
                    <ul className={styles.attentionList}>
                        {attention.map((item) => (
                            <li key={item.key}>
                                <span className={`${styles.healthBadge} ${styles[item.health]}`}>{HEALTH_LABELS[item.health]}</span>
                                <div className={styles.attentionText}>
                                    <strong>{item.title}</strong>
                                    <span>{item.detail}</span>
                                </div>
                                <Link href={item.href} className={styles.smallBtn}>
                                    {item.action}
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </>
    );
}
