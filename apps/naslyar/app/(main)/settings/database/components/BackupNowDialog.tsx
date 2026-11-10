'use client';

import { useState } from 'react';
import { LuChevronDown } from 'react-icons/lu';
import { ModalHelper } from '@my-workspace/components';
import { ErrorToaster, toFarsiNumber } from '@my-workspace/utils';
import { useDatabase } from '../lib/DatabaseProvider';
import { runBackup, type DbTarget } from '../lib/database-api';
import CollectionPicker from './CollectionPicker';
import styles from '../Database.module.scss';

function Content({ onClose }: { onClose: () => void }) {
    const { baseUrl, token, overview, trackJob, jobRunning } = useDatabase();
    const databases = (overview?.databases || []).filter((d) => d.available);
    const [db, setDb] = useState<DbTarget>(databases[0]?.id || 'core');
    const [more, setMore] = useState(false);
    const [collections, setCollections] = useState<string[]>([]);
    const [busy, setBusy] = useState(false);
    const current = databases.find((d) => d.id === db);

    const submit = async () => {
        try {
            setBusy(true);
            const { jobId } = await runBackup(baseUrl, token, { db, collections: collections.length ? collections : undefined });
            trackJob({ jobId, op: 'dump', db, label: 'بک‌آپ‌گیری' });
            onClose();
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className={styles.dialog}>
            <div className={styles.dialogHead}>
                <h2>بک‌آپ‌گیری الان</h2>
                <p>یک نسخهٔ کامل و دقیق از همین لحظه گرفته می‌شود تا هر وقت لازم شد دقیقاً به آن برگردید.</p>
            </div>
            <div className={styles.dialogBody}>
                <p className={styles.lead}>
                    {collections.length
                        ? `فقط ${toFarsiNumber(collections.length)} مجموعهٔ انتخاب‌شده بک‌آپ گرفته می‌شود.`
                        : `از همهٔ داده‌های ${current?.label || 'این اپ'} (${toFarsiNumber(current?.collections.length || 0)} مجموعه) بک‌آپ گرفته می‌شود.`}{' '}
                    کار در پس‌زمینه ادامه پیدا می‌کند و می‌توانید این پنجره را ببندید.
                </p>

                <button type="button" className={`${styles.disclosureBtn} ${more ? styles.disclosureOpen : ''}`} onClick={() => setMore((v) => !v)} aria-expanded={more}>
                    تنظیمات بیشتر <LuChevronDown aria-hidden />
                </button>
                {more && (
                    <div className={styles.disclosureBody}>
                        {databases.length > 1 && (
                            <div className={styles.stepBlock}>
                                <span className={styles.stepLabel}>کدام دیتابیس؟</span>
                                <div className={styles.choices}>
                                    {databases.map((d) => (
                                        <label key={d.id} className={`${styles.choice} ${db === d.id ? styles.choiceActive : ''}`}>
                                            <input type="radio" name="db" checked={db === d.id} onChange={() => { setDb(d.id); setCollections([]); }} />
                                            <span className={styles.choiceBody}>
                                                <strong>{d.label}</strong>
                                                <span>{toFarsiNumber(d.collections.length)} مجموعه</span>
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                        <span className={styles.stepLabel}>فقط چند مجموعه (اختیاری)</span>
                        <p className={styles.hint}>
                            برای قبل از یک تغییر دستی روی همان مجموعه‌ها. بک‌آپ ناقص برای برگرداندن کامل کافی نیست؛ اگر مطمئن نیستید چیزی انتخاب نکنید.
                        </p>
                        {current && <CollectionPicker options={current.collections} value={collections} onChange={setCollections} />}
                    </div>
                )}
            </div>
            <div className={styles.dialogFoot}>
                <button type="button" className={styles.primaryBtn} onClick={submit} disabled={busy || jobRunning || !current}>
                    {busy ? 'در حال شروع…' : jobRunning ? 'یک کار دیگر در حال اجراست' : 'شروع بک‌آپ‌گیری'}
                </button>
                <button type="button" className={styles.secondaryBtn} onClick={onClose}>
                    انصراف
                </button>
            </div>
        </div>
    );
}

export default function BackupNowDialog() {
    const { backupNowOpen, closeBackupNow } = useDatabase();
    return (
        <ModalHelper
            open={backupNowOpen}
            onClose={closeBackupNow}
            size="md"
            sheetTitle="بک‌آپ‌گیری الان"
            component={backupNowOpen ? <Content onClose={closeBackupNow} /> : null}
        />
    );
}
