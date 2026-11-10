'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { LuWrench, LuSparkles, LuHouse } from 'react-icons/lu';
import { findPageMaintenanceRule, type PageMaintenanceRule } from '@my-workspace/utils';
import { useMaintenanceStore } from '@/app/zustand/store/useMaintenanceStore';
import styles from './PageMaintenanceBoundary.module.scss';

/** صحنه‌ی «در حال بروزرسانی» یک صفحه — جای محتوای همان صفحه، داخل قاب اپ (سایدبار سر جایش می‌ماند) */
export function PageMaintenanceScreen({ rule }: { rule: Pick<PageMaintenanceRule, 'title' | 'content'> }) {
    const { t } = useTranslation('common');
    const title = rule.title?.trim() || t('page_maintenance_title');
    const content = rule.content?.trim() || t('page_maintenance_content');

    return (
        <section className={styles.stage} role="status" aria-live="polite">
            <div className={styles.inner}>
                {/* پیش‌نمایش صفحه‌ای که بلوک‌به‌بلوک از نو ساخته می‌شود: اسکلت‌ها سر جایشان می‌نشینند،
                    خط اسکن رد می‌شود، آچار کار می‌کند و جرقه‌ها می‌پرند — حلقه‌ای بی‌پایان */}
                <div className={styles.scene} aria-hidden="true">
                    <span className={styles.halo} />
                    <div className={styles.frame}>
                        <div className={styles.frameBar}>
                            <span className={styles.dot} />
                            <span className={styles.dot} />
                            <span className={styles.dot} />
                            <span className={styles.address} />
                        </div>
                        <div className={styles.canvas}>
                            <span className={`${styles.block} ${styles.blockHero}`} />
                            <div className={styles.tiles}>
                                <span className={`${styles.block} ${styles.tile}`} />
                                <span className={`${styles.block} ${styles.tile}`} />
                                <span className={`${styles.block} ${styles.tile}`} />
                            </div>
                            <span className={`${styles.block} ${styles.line} ${styles.lineLong}`} />
                            <span className={`${styles.block} ${styles.line} ${styles.lineShort}`} />
                            <span className={styles.scan} />
                        </div>
                    </div>
                    <span className={styles.tool}>
                        <span className={styles.toolIcon}>
                            <LuWrench size={18} />
                        </span>
                    </span>
                    <span className={`${styles.spark} ${styles.sparkA}`}><LuSparkles size={14} /></span>
                    <span className={`${styles.spark} ${styles.sparkB}`}><LuSparkles size={11} /></span>
                    <span className={`${styles.spark} ${styles.sparkC}`}><LuSparkles size={12} /></span>
                </div>

                <span className={styles.status}>
                    <span className={styles.statusDot} />
                    {t('page_maintenance_status')}
                </span>

                <h1 className={styles.title}>{title}</h1>
                <p className={styles.lead}>{content}</p>

                <div className={styles.progress} aria-hidden="true">
                    <span className={styles.progressBar} />
                </div>

                <Link href="/" className={styles.homeBtn}>
                    <LuHouse size={15} />
                    {t('page_maintenance_home')}
                </Link>
            </div>
        </section>
    );
}

/**
 * بروزرسانی صفحه‌به‌صفحه — دور محتوای outlet هر layout سوار می‌شود.
 * قانون‌ها از پنل (تنظیمات وبسایت › بروزرسانی صفحه‌ها) می‌آیند و همراه وضعیت نگهداری کل سایت
 * در useMaintenanceStore خوانده می‌شوند (MaintenanceGate هر ۶۰ ثانیه و با focus تازه‌شان می‌کند).
 */
export default function PageMaintenanceBoundary({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const pageRules = useMaintenanceStore((s) => s.pageRules);
    const rule = findPageMaintenanceRule(pathname, pageRules);

    if (rule) return <PageMaintenanceScreen rule={rule} />;
    return <>{children}</>;
}
