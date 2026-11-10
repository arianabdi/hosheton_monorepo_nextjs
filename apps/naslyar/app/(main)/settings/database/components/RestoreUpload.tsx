'use client';

import { useEffect, useRef, useState } from 'react';
import { LuUpload } from 'react-icons/lu';
import { toFarsiNumber } from '@my-workspace/utils';
import { useDatabase } from '../lib/DatabaseProvider';
import { fetchBackup, uploadBackupFiles, type BackupRow, type UploadProgress } from '../lib/database-api';
import { formatSize } from '../lib/format';
import styles from '../Database.module.scss';

type Stage = { kind: 'idle' } | { kind: 'busy'; progress: UploadProgress | null; names: string } | { kind: 'error'; message: string };

/**
 * «فایلی که دانلود کرده‌ام»: the archive (or all its Telegram/Bale parts at once) is uploaded in
 * resumable chunks; the server joins the parts, checks the file and returns it as a backup row.
 */
export default function RestoreUpload({ onReady }: { onReady: (row: BackupRow) => void }) {
    const { baseUrl, token } = useDatabase();
    const [stage, setStage] = useState<Stage>({ kind: 'idle' });
    const [drag, setDrag] = useState(false);
    const input = useRef<HTMLInputElement>(null);
    const abort = useRef<AbortController | null>(null);

    useEffect(() => () => abort.current?.abort(), []);

    const start = async (list: FileList | File[] | null) => {
        const files = Array.from(list || []);
        if (!files.length) return;
        const ctrl = new AbortController();
        abort.current = ctrl;
        setStage({ kind: 'busy', progress: null, names: files.length > 1 ? `${toFarsiNumber(files.length)} بخش` : files[0].name });
        try {
            const out = await uploadBackupFiles(baseUrl, token, files, (p) => setStage((s) => (s.kind === 'busy' ? { ...s, progress: p } : s)), ctrl.signal);
            if (!out.ok) return setStage({ kind: 'error', message: out.message });
            const row = await fetchBackup(baseUrl, token, out.fileId);
            if (!row) return setStage({ kind: 'error', message: 'فایل ذخیره شد ولی خوانده نشد؛ در فهرست بک‌آپ‌ها با برچسب «آپلودی» پیدایش کنید.' });
            setStage({ kind: 'idle' });
            onReady(row);
        } catch (e: any) {
            if (ctrl.signal.aborted) return setStage({ kind: 'idle' });
            const status = e?.response?.status;
            setStage({
                kind: 'error',
                message: e?.response?.data?.message || (status ? 'سرور فایل را نپذیرفت؛ دوباره امتحان کنید.' : 'اتصال قطع شد؛ دوباره فایل را انتخاب کنید (آپلود از جای قطع ادامه نمی‌یابد).'),
            });
        }
    };

    if (stage.kind === 'busy') {
        const p = stage.progress;
        const pct = p && p.totalBytes ? Math.round((p.sentBytes / p.totalBytes) * 100) : 0;
        return (
            <div className={styles.stepBlock}>
                <p className={styles.statLine}>
                    {!p || p.stage === 'upload'
                        ? `در حال آپلود ${stage.names}… ${toFarsiNumber(pct)}٪${p ? ` (${formatSize(p.sentBytes)} از ${formatSize(p.totalBytes)})` : ''}`
                        : 'در حال بررسی فایل (همهٔ سندها شمرده و کد کنترلی هر مجموعه چک می‌شود)…'}
                </p>
                <div className={styles.bar}>
                    <i style={{ width: `${p?.stage === 'check' ? 100 : Math.max(2, pct)}%` }} />
                </div>
                <button type="button" className={styles.linkBtn} onClick={() => abort.current?.abort()}>
                    لغو آپلود
                </button>
            </div>
        );
    }

    return (
        <div className={styles.stepBlock}>
            <div
                className={`${styles.dropZone} ${drag ? styles.dropZoneActive : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => input.current?.click()}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && input.current?.click()}
                onDragOver={(e) => {
                    e.preventDefault();
                    setDrag(true);
                }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    setDrag(false);
                    void start(e.dataTransfer.files);
                }}
            >
                <LuUpload aria-hidden />
                <strong>فایل بک‌آپ را اینجا بکشید یا انتخاب کنید</strong>
                <span>
                    همان فایل <span dir="ltr">.archive.gz</span> که از این پنل یا تلگرام/بله دانلود کرده‌اید. اگر چند بخش است، همهٔ بخش‌ها را با هم انتخاب کنید.
                </span>
            </div>
            <input
                ref={input}
                type="file"
                multiple
                hidden
                onChange={(e) => {
                    void start(e.target.files);
                    e.target.value = '';
                }}
            />
            {stage.kind === 'error' && <p className={`${styles.lineNote} ${styles.lineNoteDanger}`}>{stage.message}</p>}
        </div>
    );
}
