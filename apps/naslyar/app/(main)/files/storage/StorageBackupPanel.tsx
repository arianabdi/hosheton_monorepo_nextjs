'use client';

import { useEffect, useState } from 'react';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { ModalHelper } from '@my-workspace/components';
import parentStyles from '../../marketing/Marketing.module.scss';
import hrStyles from '../../management/hr/Hr.module.scss';
import styles from './StorageSettings.module.scss';
import {
    getBackupSettings,
    saveBackupSettings,
    startBackup,
    startRestore,
    testBackupSettings,
    type StorageBackupSettings,
    type StorageBackupView,
    type StorageSettingsView,
} from './storage-api';

const EMPTY: StorageBackupSettings = {
    endpoint: '',
    region: 'us-east-1',
    bucket: '',
    accessKey: '',
    secretKey: '',
    forcePathStyle: true,
    prefixes: [],
};

interface Props {
    view: StorageSettingsView;
    baseUrl: string;
    token: string;
    onJobStarted: () => void;
}

/**
 * بک‌آپ همهٔ فایل‌های این اپ در یک باکت جدا، و بازگردانی آن روی استوریج جدید —
 * تا پلتفرم روی استوریجی با آدرس دیگر بالا بیاید.
 */
export default function StorageBackupPanel({ view, baseUrl, token, onJobStarted }: Props) {
    const [backup, setBackup] = useState<StorageBackupView | null>(null);
    const [form, setForm] = useState<StorageBackupSettings>(EMPTY);
    const [prefixText, setPrefixText] = useState('');
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null);
    const [confirm, setConfirm] = useState<'backup' | 'restore' | null>(null);
    const [relink, setRelink] = useState(true);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!token) return;
        getBackupSettings(baseUrl, token)
            .then((next) => {
                setBackup(next);
                setForm({ ...EMPTY, ...next, secretKey: '' });
                setPrefixText((next.prefixes || []).join('\n'));
            })
            .catch((error) => ErrorToaster(error));
    }, [baseUrl, token]);

    const payload = (): StorageBackupSettings => ({
        ...form,
        prefixes: prefixText.split(/\s+/).map((item) => item.trim()).filter(Boolean),
    });
    const update = <K extends keyof StorageBackupSettings>(key: K, value: StorageBackupSettings[K]) => {
        setForm((current) => ({ ...current, [key]: value }));
        setTestResult(null);
    };

    const test = async () => {
        try {
            setTesting(true);
            setTestResult(await testBackupSettings(baseUrl, token, payload()));
        } catch (error) {
            ErrorToaster(error);
        } finally {
            setTesting(false);
        }
    };

    const save = async () => {
        try {
            setSaving(true);
            const next = await saveBackupSettings(baseUrl, token, payload());
            setBackup(next);
            setForm({ ...EMPTY, ...next, secretKey: '' });
            SuccessToaster({ message: next.configured ? 'استوریج بک‌آپ ذخیره و تست شد' : 'ذخیره شد (هنوز کامل نیست)' });
        } catch (error) {
            ErrorToaster(error);
        } finally {
            setSaving(false);
        }
    };

    const run = async () => {
        try {
            setBusy(true);
            if (confirm === 'backup') await startBackup(baseUrl, token);
            else await startRestore(baseUrl, token, { relink });
            SuccessToaster({ message: confirm === 'backup' ? 'بک‌آپ شروع شد' : 'بازگردانی شروع شد' });
            setConfirm(null);
            onJobStarted();
        } catch (error) {
            ErrorToaster(error);
        } finally {
            setBusy(false);
        }
    };

    const defaults = backup?.defaultPrefixes || [];

    return (
        <div className={parentStyles.formCard}>
            <h3 className={parentStyles.formSectionTitle}>بک‌آپ و بازگردانی فایل‌ها</h3>
            <p className={hrStyles.fieldHint}>
                <strong>به چه درد می‌خورد؟</strong> یک کپی کامل از همهٔ فایل‌های این اپ (روی استوریج فعال و بک‌آپ‌ها) در یک باکت
                جدا نگه می‌دارد. اگر استوریج اصلی از دست رفت، یک استوریج تازه (با هر آدرسی) را بالای صفحه فعال کنید و «بازگردانی»
                بزنید تا فایل‌ها با همان کلیدها روی آن برگردند و رکوردها به آدرس جدید اشاره کنند.
            </p>
            <p className={hrStyles.fieldHint}>
                <strong>چطور استفاده کنم؟</strong> باکت بک‌آپ لازم نیست عمومی باشد. بک‌آپ افزایشی است: بار دوم فقط فایل‌های جدید کپی
                می‌شوند. بک‌آپ دیتابیس جداست (تنظیمات ← دیتابیس).
            </p>

            <div className={hrStyles.formRow}>
                <div className={parentStyles.field}>
                    <label htmlFor="backup-endpoint">آدرس endpoint بک‌آپ</label>
                    <input id="backup-endpoint" dir="ltr" placeholder="s3.example.com" value={form.endpoint} onChange={(event) => update('endpoint', event.target.value)} />
                    <p className={hrStyles.fieldHint}>باید باکتی غیر از استوریج فعال و بک‌آپ‌ها باشد؛ بهتر است ارائه‌دهنده یا دیتاسنتر دیگری باشد.</p>
                </div>
                <div className={parentStyles.field}>
                    <label htmlFor="backup-bucket">نام باکت</label>
                    <input id="backup-bucket" dir="ltr" value={form.bucket} onChange={(event) => update('bucket', event.target.value)} />
                    <p className={hrStyles.fieldHint}>خصوصی بماند؛ فقط سرور از آن می‌خواند.</p>
                </div>
            </div>
            <div className={hrStyles.formRow}>
                <div className={parentStyles.field}>
                    <label htmlFor="backup-access">Access Key</label>
                    <input id="backup-access" dir="ltr" autoComplete="off" value={form.accessKey} onChange={(event) => update('accessKey', event.target.value)} />
                    <p className={hrStyles.fieldHint}>کلید با اجازهٔ خواندن، نوشتن و فهرست‌گرفتن روی باکت بک‌آپ.</p>
                </div>
                <div className={parentStyles.field}>
                    <label htmlFor="backup-secret">Secret Key</label>
                    <input
                        id="backup-secret"
                        type="password"
                        dir="ltr"
                        autoComplete="new-password"
                        placeholder={backup?.hasSecretKey ? 'ذخیره شده — برای تغییر، مقدار جدید را بنویسید' : ''}
                        value={form.secretKey}
                        onChange={(event) => update('secretKey', event.target.value)}
                    />
                    <p className={hrStyles.fieldHint}>هرگز دوباره نمایش داده نمی‌شود؛ خالی = همان قبلی.</p>
                </div>
            </div>
            <div className={hrStyles.formRow}>
                <div className={parentStyles.field}>
                    <label htmlFor="backup-region">Region</label>
                    <input id="backup-region" dir="ltr" value={form.region} onChange={(event) => update('region', event.target.value)} />
                    <p className={hrStyles.fieldHint}>اگر ارائه‌دهنده region ندارد پیش‌فرض بماند.</p>
                </div>
                <div className={parentStyles.field}>
                    <label htmlFor="backup-prefixes">پیشوند کلیدها (هر خط یکی)</label>
                    <textarea
                        id="backup-prefixes"
                        dir="ltr"
                        rows={3}
                        placeholder={defaults.join('\n')}
                        value={prefixText}
                        onChange={(event) => setPrefixText(event.target.value)}
                    />
                    <p className={hrStyles.fieldHint}>خالی = پیشوندهای همین اپ ({defaults.join('، ')}). فایل اپ‌های دیگرِ همان باکت بک‌آپ نمی‌شوند.</p>
                </div>
            </div>
            <label className={styles.checkRow}>
                <input type="checkbox" checked={form.forcePathStyle} onChange={(event) => update('forcePathStyle', event.target.checked)} />
                آدرس‌دهی path-style
            </label>

            {testResult && (
                <div className={`${styles.testBox} ${testResult.ok ? styles.testBoxOk : styles.testBoxFail}`}>
                    <strong>{testResult.ok ? '✔ اتصال بک‌آپ سالم است (نوشتن، خواندن، حذف)' : '✖ تست ناموفق بود'}</strong>
                    {testResult.error && <span className={styles.testError} dir="ltr">{testResult.error}</span>}
                </div>
            )}

            <div className={parentStyles.formActions}>
                <button type="button" className={parentStyles.primaryBtn} disabled={saving} onClick={() => void save()}>
                    {saving ? 'در حال تست و ذخیره…' : 'ذخیرهٔ استوریج بک‌آپ'}
                </button>
                <button type="button" className={parentStyles.secondaryBtn} disabled={testing} onClick={() => void test()}>
                    {testing ? 'در حال تست…' : 'تست اتصال'}
                </button>
            </div>

            <h3 className={`${parentStyles.formSectionTitle} ${styles.sectionGap}`}>اجرا</h3>
            <div className={parentStyles.formActions}>
                <button type="button" className={parentStyles.primaryBtn} disabled={!backup?.configured} onClick={() => setConfirm('backup')}>
                    گرفتن بک‌آپ
                </button>
                <button type="button" className={parentStyles.secondaryBtn} disabled={!backup?.configured} onClick={() => setConfirm('restore')}>
                    بازگردانی روی استوریج فعال
                </button>
            </div>
            {!backup?.configured && <p className={hrStyles.fieldHint}>اول استوریج بک‌آپ را وارد، تست و ذخیره کنید.</p>}

            <ModalHelper
                open={Boolean(confirm)}
                onClose={() => setConfirm(null)}
                size="md"
                sheetTitle={confirm === 'backup' ? 'گرفتن بک‌آپ' : 'بازگردانی از بک‌آپ'}
                component={confirm ? (
                    <div className={styles.confirmBody}>
                        {confirm === 'backup' ? (
                            <>
                                <h3>بک‌آپ از همهٔ فایل‌ها؟</h3>
                                <p>
                                    فایل‌های استوریج فعال و همهٔ بک‌آپ‌ها با همان کلیدها در
                                    {' '}<span dir="ltr" className={styles.ltrText}>{backup?.endpoint} / {backup?.bucket}</span>{' '}
                                    کپی می‌شوند. فایلی که از قبل با همان محتوا در بک‌آپ هست دوباره کپی نمی‌شود. از مبدأ چیزی تغییر نمی‌کند.
                                </p>
                            </>
                        ) : (
                            <>
                                <h3>بازگردانی روی استوریج فعال؟</h3>
                                <p>
                                    فایل‌های بک‌آپ روی <span dir="ltr" className={styles.ltrText}>{view.runtime.publicBase}</span> کپی می‌شوند.
                                    فایلی که با همان محتوا آنجا هست رد می‌شود و فایل متفاوت هم‌نام بازنویسی نمی‌شود.
                                </p>
                                <label className={styles.checkRow}>
                                    <input type="checkbox" checked={relink} onChange={(event) => setRelink(event.target.checked)} />
                                    بعد از کپی، آدرس رکوردهای فایل به استوریج فعال عوض شود
                                    <span className={hrStyles.fieldHint}>
                                        فقط رکوردهایی که فایلشان واقعاً روی استوریج فعال هست؛ آدرس قبلی برای بازگرداندن نگه داشته می‌شود.
                                    </span>
                                </label>
                            </>
                        )}
                        <div className={parentStyles.formActions}>
                            <button type="button" className={parentStyles.primaryBtn} disabled={busy} onClick={() => void run()}>
                                {busy ? 'در حال شروع…' : 'شروع'}
                            </button>
                            <button type="button" className={parentStyles.secondaryBtn} onClick={() => setConfirm(null)}>انصراف</button>
                        </div>
                    </div>
                ) : null}
            />
        </div>
    );
}
