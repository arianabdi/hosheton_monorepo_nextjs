'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LuChevronDown, LuCircleCheck, LuCircleX, LuLoaderCircle } from 'react-icons/lu';
import { ModalCloseButton } from '@my-workspace/components';
import { ErrorToaster, toFarsiNumber } from '@my-workspace/utils';
import { jobProgress, useDatabase } from '../lib/DatabaseProvider';
import { fetchBackup } from '../lib/database-api';
import { explainFailure, PHASE_LABEL } from '../lib/format';
import styles from '../Database.module.scss';

/** کار در حال اجرا (بک‌آپ‌گیری/بازگردانی) زیر هدر همهٔ صفحه‌های دیتابیس — با قدم بعدی وقتی تمام شد */
export default function JobLine() {
    const { job, dismissJob, baseUrl, token, download, openRestore, requestUndo } = useDatabase();
    const [tech, setTech] = useState(false);
    if (!job) return null;

    const state = job.state?.state;
    const done = state === 'completed';
    const failed = state === 'failed';
    const log = job.state?.log;
    const result = log?.result;
    const p = jobProgress(job);
    const pct = p && p.total > 0 ? Math.min(100, Math.round((p.done / p.total) * 100)) : null;
    const restoreInfo = result?.restoreInfo || (done && job.op === 'restore' ? { safetyBackupFileId: result?.safetyBackupFileId, liveTouched: true } : null);

    const openReal = async () => {
        if (!job.fileId) return;
        const row = await fetchBackup(baseUrl, token, job.fileId);
        if (!row) return ErrorToaster({ message: 'این بک‌آپ دیگر وجود ندارد.' });
        openRestore({ row, mode: 'replace' });
    };

    let detail: string;
    if (done) {
        detail =
            job.op === 'dump'
                ? `${toFarsiNumber(Number(result?.documentCount || 0).toLocaleString('en-US'))} سند ذخیره شد`
                : toFarsiNumber(result?.summary || 'تمام شد');
    } else if (failed) {
        detail = explainFailure(log?.failedReason);
    } else if (!p || state === 'waiting') {
        detail = 'در صف…';
    } else {
        detail = `${PHASE_LABEL[p.phase] || ''}${p.total ? ` — ${toFarsiNumber(p.done)} از ${toFarsiNumber(p.total)} مجموعه` : '…'}`;
    }

    return (
        <>
            <div className={styles.jobLine} role="status" aria-live="polite">
                <span className={styles.jobTitle}>
                    {done ? (
                        <LuCircleCheck className={styles.okText} />
                    ) : failed ? (
                        <LuCircleX className={styles.dangerText} />
                    ) : (
                        <LuLoaderCircle className={styles.spin} />
                    )}
                    {job.label}
                    {failed ? ' ناموفق بود' : done ? ' تمام شد' : ''}
                </span>
                <span className={styles.jobMeta} title={failed ? log?.failedReason : undefined}>
                    {detail}
                </span>

                <span className={styles.jobActions}>
                    {done && job.op === 'dump' && result?.fileId && (
                        <button type="button" className={styles.linkBtn} onClick={() => download({ _id: result.fileId })}>
                            دانلود
                        </button>
                    )}
                    {done && job.op === 'restore' && job.mode === 'test' && (
                        <>
                            <Link className={styles.linkBtn} href={`/settings/database?test=1${job.db && job.db !== 'core' ? `&db=${job.db}` : ''}`}>
                                دیدن داده‌های تست
                            </Link>
                            <button type="button" className={styles.linkBtn} onClick={openReal}>
                                بازگردانی واقعی
                            </button>
                        </>
                    )}
                    {restoreInfo?.safetyBackupFileId && restoreInfo.liveTouched && job.mode !== 'test' && (
                        <button
                            type="button"
                            className={styles.linkBtn}
                            onClick={() => requestUndo({ safetyBackupFileId: restoreInfo.safetyBackupFileId, db: job.db || 'core', at: log?.updatedAt })}
                        >
                            برگرداندن به قبل
                        </button>
                    )}
                    {(p?.lines?.length || failed) && (
                        <button
                            type="button"
                            className={`${styles.disclosureBtn} ${tech ? styles.disclosureOpen : ''}`}
                            onClick={() => setTech((v) => !v)}
                        >
                            جزئیات فنی <LuChevronDown aria-hidden />
                        </button>
                    )}
                    {(done || failed) && <ModalCloseButton placement="inline" size="sm" onClick={dismissJob} aria-label="بستن" />}
                </span>

                {!done && !failed && (
                    <span className={styles.progressTrack} aria-hidden>
                        <span
                            className={`${styles.progressFill} ${pct === null ? styles.progressIndeterminate : ''}`}
                            style={pct === null ? undefined : { width: `${Math.max(3, pct)}%` }}
                        />
                    </span>
                )}
            </div>
            {tech && (
                <pre className={styles.techLog}>{[failed ? log?.failedReason : '', ...(p?.lines || [])].filter(Boolean).join('\n')}</pre>
            )}
        </>
    );
}
