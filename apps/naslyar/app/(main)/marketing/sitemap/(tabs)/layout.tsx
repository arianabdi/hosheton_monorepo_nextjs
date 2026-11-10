'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LuExternalLink, LuRefreshCw, LuTriangleAlert } from 'react-icons/lu';
import { Container, Wrapper } from '@/app/(main)/layout';
import SimpleLineNav from '@/app/components/SimpleLineNav/SimpleLineNav';
import { useSitemap } from '../lib/SitemapProvider';
import { SITEMAP_TABS, sitemapHref } from '../lib/sections';
import { SITEMAP_INDEX_PATH } from '../lib/sitemap.types';
import { siteLink } from '../lib/format';
import parentStyles from '../../Marketing.module.scss';
import styles from '../Sitemap.module.scss';

/**
 * شل تب‌های سایت‌مپ: هدر و ناوبری ثابت می‌مانند و فقط محتوای تب (outlet) عوض می‌شود؛
 * آدرس‌بار با هر تب تغییر می‌کند. (PageTransition کل این زیرشاخه را یک کلید می‌داند.)
 */
export default function SitemapTabsLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const { config, configFailed, reloadConfig, regenerating, regenerateAll } = useSitemap();

    return (
        <Container>
            <Wrapper>
                <div className={`${parentStyles.container} ${parentStyles.rtl}`}>
                    <header className={parentStyles.header}>
                        <div>
                            <h1 className={parentStyles.mainTitle}>سایت‌مپ و SEO</h1>
                            <p className={parentStyles.subtitle}>
                                صفحات عمومی سایت را به‌صورت خودکار در sitemap.xml منتشر می‌کند و robots.txt، ممیزی و
                                IndexNow را از همین‌جا کنترل می‌کنید.
                            </p>
                        </div>
                        <div className={styles.toolbarActions}>
                            {config && (
                                <a
                                    href={siteLink(config.siteUrl, SITEMAP_INDEX_PATH)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={parentStyles.secondaryBtn}
                                >
                                    <LuExternalLink /> مشاهده sitemap.xml
                                </a>
                            )}
                            <button
                                type="button"
                                className={parentStyles.primaryBtn}
                                onClick={regenerateAll}
                                disabled={regenerating || !config?.enabled}
                            >
                                <LuRefreshCw className={regenerating ? styles.spinIcon : undefined} />
                                {regenerating ? 'در حال تولید…' : 'تولید مجدد همه'}
                            </button>
                        </div>
                    </header>

                    <SimpleLineNav items={SITEMAP_TABS} activeHref={pathname} />

                    {config && !config.enabled && (
                        <div className={styles.moduleOffBanner}>
                            <LuTriangleAlert />
                            <span>
                                ماژول سایت‌مپ خاموش است؛ sitemap.xml روی سایت ۴۰۴ می‌دهد.{' '}
                                <Link href={sitemapHref.settings}>روشن‌کردن در تنظیمات</Link>
                            </span>
                        </div>
                    )}

                    {configFailed && !config ? (
                        <div className={styles.emptyState}>
                            تنظیمات سایت‌مپ از API دریافت نشد — اتصال پنل به API استودیو را بررسی کنید.{' '}
                            <button type="button" className={styles.linkBtn} onClick={reloadConfig}>
                                تلاش دوباره
                            </button>
                        </div>
                    ) : (
                        <div className={styles.outlet}>{children}</div>
                    )}
                </div>
            </Wrapper>
        </Container>
    );
}
