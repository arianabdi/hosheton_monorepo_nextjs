'use client';

import { ModalHelper } from '@my-workspace/components';
import { useDatabase } from '../lib/DatabaseProvider';
import type { BackupRow } from '../lib/database-api';
import { backupAt, formatCount, formatDate, formatDuration, formatSize, PURPOSE_LABEL, relativeTime } from '../lib/format';
import styles from '../Database.module.scss';

function Content({ row, onClose }: { row: BackupRow; onClose: () => void }) {
    const { openRestore, download, jobRunning } = useDatabase();
    const stats = Object.entries(row.collectionStats || {}).sort((a, b) => b[1] - a[1]);
    return (
        <div className={styles.dialog}>
            <div className={styles.dialogHead}>
                <h2>{formatDate(backupAt(row))}</h2>
                <p>
                    بک‌آپ {PURPOSE_LABEL[row.purpose] || 'دستی'} · {row.purpose === 'uploaded' ? 'آپلود ' : ''}{relativeTime(row.createdAt)}
                </p>
            </div>
            <div className={styles.dialogBody}>
                <p className={styles.statLine}>
                    {formatCount(row.documentCount)} سند در {formatCount(row.collectionCount)} مجموعه · {formatSize(row.size)}
                    {row.durationMs ? ` · ساخته‌شده در ${formatDuration(row.durationMs)}` : ''}
                </p>
                <p className={`${styles.statLine} ${styles.mono}`} title="نام فایل روی استوریج">
                    {row.originalName || row.filename}
                </p>
                {row.partial && (
                    <p className={`${styles.lineNote} ${styles.lineNoteWarn}`}>این فایل فقط {formatCount(row.collectionCount)} مجموعه دارد؛ بقیهٔ داده‌ها در آن نیست.</p>
                )}
                {row.format === 'json' ? (
                    <p className={`${styles.lineNote} ${styles.lineNoteDanger}`}>
                        این بک‌آپ با روش قدیمی ساخته شده و در آن شناسه‌ها و تاریخ‌های داخل سندها به متن تبدیل شده‌اند؛ قابل بازگردانی دقیق نیست. یک بک‌آپ جدید بگیرید.
                    </p>
                ) : (
                    <table className={styles.miniTable}>
                        <thead>
                            <tr>
                                <th>مجموعه</th>
                                <th>سند</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.map(([name, count]) => (
                                <tr key={name}>
                                    <td>{name}</td>
                                    <td>{formatCount(count)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
            <div className={styles.dialogFoot}>
                {row.format === 'bson' && (
                    <button
                        type="button"
                        className={styles.primaryBtn}
                        disabled={jobRunning}
                        onClick={() => {
                            onClose();
                            openRestore({ row });
                        }}
                    >
                        {row.purpose === 'pre-restore' ? 'برگرداندن به این وضعیت' : 'بازگردانی به این نسخه'}
                    </button>
                )}
                <button type="button" className={styles.secondaryBtn} onClick={() => download(row)}>
                    دانلود
                </button>
            </div>
        </div>
    );
}

export default function BackupDetailsDialog({ row, onClose }: { row: BackupRow | null; onClose: () => void }) {
    return (
        <ModalHelper open={!!row} onClose={onClose} size="md" sheetTitle="جزئیات بک‌آپ" component={row ? <Content row={row} onClose={onClose} /> : null} />
    );
}
