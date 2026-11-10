'use client';

import { useEffect, useState, type ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { LuCheck, LuCloudOff, LuLoaderCircle, LuRotateCw, LuServerCrash, LuWifiOff } from 'react-icons/lu';
import { formatAppNumber } from '@/app/lib/i18n/formatLocaleNumber';
import { STATUS_ISSUES, type StatusIssueId } from './issues';
import { retryStatusNow, useStatusStore } from './statusStore';
import styles from './StatusBanner.module.scss';

/** آیکون هر مشکل — مشکل جدید بدون آیکون، آیکون network را می‌گیرد */
const ISSUE_ICONS: Partial<Record<StatusIssueId, ComponentType<{ className?: string }>>> = {
    offline: LuWifiOff,
    network: LuCloudOff,
    service: LuServerCrash,
};

/** ثانیه‌های باقی‌مانده تا چک بعدی — هر ثانیه به‌روز می‌شود */
function useSecondsUntil(target: number | null): number | null {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        if (!target) return;
        const tick = () => setNow(Date.now());
        const first = setTimeout(tick, 0);
        const id = setInterval(tick, 1000);
        return () => {
            clearTimeout(first);
            clearInterval(id);
        };
    }, [target]);
    if (!target) return null;
    return Math.max(0, Math.ceil((target - now) / 1000));
}

/**
 * بنر وضعیت اتصال — یک‌بار در layout ریشه نصب شده است.
 * محتوا از statusStore می‌آید؛ برای نمایش مشکل از `reportStatusIssue` یا `notifyError` استفاده کن.
 */
export default function StatusBanner() {
    const { t, i18n } = useTranslation('errors');
    const { phase, issue, checking, nextCheckAt } = useStatusStore();
    const seconds = useSecondsUntil(phase === 'active' ? nextCheckAt : null);

    const visible = phase !== 'hidden' && issue !== null;
    const recovered = phase === 'recovered';
    const tone = recovered ? 'success' : issue ? STATUS_ISSUES[issue].tone : 'danger';
    const Icon = recovered ? LuCheck : (issue && ISSUE_ICONS[issue]) || LuCloudOff;

    let detail = '';
    if (!recovered && issue) {
        if (checking) detail = t('status_banner.checking');
        else if (seconds !== null) detail = t('status_banner.next_check', { seconds: formatAppNumber(seconds, i18n.language) });
        else detail = t('status_banner.waiting_online');
    }

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    key="status-banner"
                    className={styles.banner}
                    data-tone={tone}
                    role={recovered ? 'status' : 'alert'}
                    aria-live={recovered ? 'polite' : 'assertive'}
                    initial={{ opacity: 0, y: -14, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -14, scale: 0.98 }}
                    transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
                >
                    <span className={styles.icon} aria-hidden>
                        <Icon />
                    </span>
                    <span className={styles.text}>
                        <strong className={styles.title}>
                            {recovered ? t('status_banner.recovered.title') : t(`status_banner.${issue}.title`)}
                        </strong>
                        <span className={styles.message}>
                            {recovered ? t('status_banner.recovered.message') : t(`status_banner.${issue}.message`)}
                        </span>
                        {detail && (
                            <span className={styles.detail}>
                                {checking && <LuLoaderCircle className={styles.spin} aria-hidden />}
                                {detail}
                            </span>
                        )}
                    </span>
                    {!recovered && (
                        <button
                            type="button"
                            className={styles.retry}
                            onClick={retryStatusNow}
                            disabled={checking}
                        >
                            <LuRotateCw className={checking ? styles.spin : undefined} aria-hidden />
                            <span>{t('status_banner.retry')}</span>
                        </button>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
