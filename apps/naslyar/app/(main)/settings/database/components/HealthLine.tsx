'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LuChevronDown } from 'react-icons/lu';
import { SuccessToaster, toFarsiNumber } from '@my-workspace/utils';
import { useDatabase } from '../lib/DatabaseProvider';
import { explainFailure, formatUpcoming, relativeTime } from '../lib/format';
import styles from '../Database.module.scss';

const DELIVERY_FA: Record<string, string> = { telegram: 'تلگرام', bale: 'بله' };

/**
 * «آیا امن هستم؟» در یک خط: آخرین بک‌آپ، بک‌آپ خودکار بعدی، ارسال به پیام‌رسان.
 * هر حالت بد یک لینک به راه‌حلش است؛ نسخهٔ ابزار و نام دیتابیس پشت «جزئیات فنی».
 */
export default function HealthLine() {
    const { overview, overviewFailed, summary, reloadOverview, openBackupNow } = useDatabase();
    const [tech, setTech] = useState(false);
    const tools = overview?.tools;
    const toolsOk = !!tools?.mongodump.ok && !!tools?.mongorestore.ok;

    if (!overview && !summary) {
        return (
            <div className={styles.healthLine}>
                {overviewFailed ? (
                    <span className={styles.healthItem}>
                        <span className={`${styles.dot} ${styles.dotBad}`} /> وضعیت دیتابیس خوانده نشد.{' '}
                        <button type="button" className={styles.linkBtn} onClick={reloadOverview}>
                            تلاش دوباره
                        </button>
                    </span>
                ) : (
                    <span className={styles.healthItem}>در حال بررسی…</span>
                )}
            </div>
        );
    }

    const copyTech = async () => {
        const text = [
            'Database backup tools are missing on the API server.',
            'Docker image: RUN apk add --no-cache mongodb-tools (then redeploy the API).',
            'Local: install MongoDB Database Tools or set MONGO_TOOLS_PATH to its bin folder.',
            tools?.mongodump.error ? `mongodump: ${tools.mongodump.error}` : '',
        ]
            .filter(Boolean)
            .join('\n');
        await navigator.clipboard?.writeText(text).catch(() => undefined);
        SuccessToaster({ message: 'جزئیات فنی کپی شد' });
    };

    const last = summary?.lastBackup;
    const schedules = summary?.schedules || [];
    const autoOn = schedules.filter((s) => s.enabled);
    const next = autoOn.map((s) => s.nextRunAt).filter(Boolean).sort()[0] || null;
    const lastFailure = summary?.lastFailure;
    const delivery = summary?.delivery || [];

    return (
        <>
            <div className={styles.healthLine}>
                {overview && !toolsOk ? (
                    <span className={styles.healthItem}>
                        <span className={`${styles.dot} ${styles.dotBad}`} />
                        بک‌آپ‌گیری و بازگردانی روی این سرور فعلاً کار نمی‌کند؛ این را برای برنامه‌نویس بفرستید:
                        <button type="button" className={styles.linkBtn} onClick={copyTech}>
                            کپی جزئیات فنی
                        </button>
                    </span>
                ) : lastFailure ? (
                    <span className={styles.healthItem}>
                        <span className={`${styles.dot} ${styles.dotBad}`} />
                        <span title={lastFailure.reason}>
                            {lastFailure.label} {relativeTime(lastFailure.at)} ناموفق بود ({explainFailure(lastFailure.reason)})
                        </span>
                        <Link className={styles.linkBtn} href="/settings/database/jobs?status=failed">
                            دیدن دلیل
                        </Link>
                    </span>
                ) : !last ? (
                    <span className={styles.healthItem}>
                        <span className={`${styles.dot} ${styles.dotWarn}`} />
                        هنوز هیچ بک‌آپی ندارید —
                        <button type="button" className={styles.linkBtn} onClick={openBackupNow} disabled={!toolsOk}>
                            همین الان بگیرید
                        </button>
                    </span>
                ) : (
                    <span className={styles.healthItem}>
                        <span className={`${styles.dot} ${styles.dotOk}`} />
                        آخرین بک‌آپ: <b>{relativeTime(last.at)}</b>
                    </span>
                )}

                {summary && (
                    <span className={styles.healthItem}>
                        {autoOn.length ? (
                            <>
                                بک‌آپ خودکار: <b>{next ? `بعدی ${formatUpcoming(next)}` : 'روشن'}</b>
                            </>
                        ) : (
                            <>
                                <span className={`${styles.dot} ${styles.dotWarn}`} />
                                بک‌آپ خودکار خاموش است —
                                <Link className={styles.linkBtn} href="/settings/database/backups?auto=1">
                                    روشن کنید
                                </Link>
                            </>
                        )}
                    </span>
                )}

                {summary && (
                    <span className={styles.healthItem}>
                        {delivery.length ? (
                            <>
                                ارسال: <b>{delivery.map((d) => DELIVERY_FA[d] || d).join(' و ')}</b>
                            </>
                        ) : (
                            <Link className={styles.linkBtn} href="/settings/database/backups?auto=1#delivery">
                                ارسال به تلگرام/بله وصل نیست
                            </Link>
                        )}
                    </span>
                )}

                <span className={styles.healthEnd}>
                    <button
                        type="button"
                        className={`${styles.disclosureBtn} ${tech ? styles.disclosureOpen : ''}`}
                        onClick={() => setTech((v) => !v)}
                        aria-expanded={tech}
                    >
                        جزئیات فنی <LuChevronDown aria-hidden />
                    </button>
                    <Link className={styles.disclosureBtn} href="/settings/database/docs">
                        راهنما
                    </Link>
                </span>
            </div>

            {tech && overview && (
                <div className={styles.techDetails}>
                    {overview.databases.map((d) => (
                        <span key={d.id}>
                            <code>{d.database}</code> ·{toFarsiNumber(d.collections.length)} مجموعه ·{' '}
                        </span>
                    ))}
                    ابزار: <code>{tools?.mongodump.ok ? `mongodump ${tools.mongodump.version}` : 'missing'}</code>
                    {tools?.serverVersion && (
                        <>
                            {' '}
                            · MongoDB <code>{tools.serverVersion}</code>
                        </>
                    )}
                    {summary && (
                        <>
                            {' '}
                            · {toFarsiNumber(summary.count)} بک‌آپ روی استوریج
                        </>
                    )}
                </div>
            )}
        </>
    );
}
