'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { LoadingState } from '@my-workspace/components';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import parentStyles from '../../marketing/Marketing.module.scss';
import hrStyles from '../../management/hr/Hr.module.scss';
import styles from './StorageSettings.module.scss';
import StorageFallbacksPanel from './StorageFallbacksPanel';
import StorageMaintenance from './StorageMaintenance';
import {
    getStorageSettings,
    saveStorageSettings,
    testStorageSettings,
    type StorageSettings,
    type StorageSettingsView,
    type StorageTestResult,
} from './storage-api';

const EMPTY: StorageSettings = {
    enabled: false,
    endpoint: '',
    region: 'us-east-1',
    bucket: '',
    accessKey: '',
    secretKey: '',
    forcePathStyle: true,
    publicBaseUrl: '',
    requestTimeoutMs: 60000,
};

const STEP_LABELS: Record<StorageTestResult['steps'][number]['step'], string> = {
    upload: 'آپلود فایل آزمایشی',
    'public-read': 'خواندن از آدرس عمومی (همان کاری که مرورگر کاربر می‌کند)',
    delete: 'حذف فایل آزمایشی',
};

/** ParsPack hands out a per-bucket host: `c780242.parspack.net` is bucket `c780242`. */
function bucketFromBucketHost(endpoint: string): string {
    const host = endpoint.trim().replace(/^https?:\/\//i, '').split(/[/:]/)[0].toLowerCase();
    const match = /^([a-z0-9][a-z0-9-]*)\.parspack\.net$/.exec(host);
    return match ? match[1] : '';
}

function normalizedEndpoint(endpoint: string): string {
    const value = endpoint.trim().replace(/\/+$/, '');
    if (!value) return '';
    return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function toForm(view: StorageSettingsView): StorageSettings {
    return {
        enabled: view.enabled,
        endpoint: view.endpoint || '',
        region: view.region || EMPTY.region,
        bucket: view.bucket || '',
        accessKey: view.accessKey || '',
        secretKey: '',
        forcePathStyle: view.forcePathStyle !== false,
        publicBaseUrl: view.publicBaseUrl || '',
        requestTimeoutMs: view.requestTimeoutMs || EMPTY.requestTimeoutMs,
    };
}

export default function StorageSettingsPanel() {
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const [form, setForm] = useState<StorageSettings>(EMPTY);
    const [view, setView] = useState<StorageSettingsView | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<StorageTestResult | null>(null);

    useEffect(() => {
        if (!token) return;
        let cancelled = false;
        setLoading(true);
        getStorageSettings(baseUrl, token)
            .then((next) => {
                if (cancelled) return;
                setView(next);
                setForm(toForm(next));
            })
            .catch((error) => ErrorToaster(error))
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [baseUrl, token]);

    const update = <K extends keyof StorageSettings>(key: K, value: StorageSettings[K]) => {
        setForm((current) => {
            const next = { ...current, [key]: value };
            // Endpoint of a bucket-host provider → bucket name is known; fill it if still empty.
            if (key === 'endpoint' && !current.bucket.trim()) {
                const bucket = bucketFromBucketHost(String(value));
                if (bucket) next.bucket = bucket;
            }
            return next;
        });
        setTestResult(null);
    };

    const runTest = async () => {
        if (!token) return;
        try {
            setTesting(true);
            setTestResult(await testStorageSettings(baseUrl, token, form));
        } catch (error) {
            ErrorToaster(error);
        } finally {
            setTesting(false);
        }
    };

    const save = async () => {
        if (!token) return;
        try {
            setSaving(true);
            const saved = await saveStorageSettings(baseUrl, token, form);
            setView(saved);
            setForm(toForm(saved));
            SuccessToaster({
                message: saved.runtime.source === 'database'
                    ? 'استوریج جدید فعال شد'
                    : 'تنظیمات ذخیره شد — استوریج قبلی (env) همچنان فعال است',
            });
        } catch (error) {
            ErrorToaster(error);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <LoadingState />;

    const hostBucket = bucketFromBucketHost(form.endpoint);
    const bucketMismatch = Boolean(hostBucket && form.bucket.trim() && form.bucket.trim().toLowerCase() !== hostBucket);
    const derivedPublicBase = form.endpoint && form.bucket
        ? (hostBucket && !bucketMismatch
            ? normalizedEndpoint(form.endpoint)
            : `${normalizedEndpoint(form.endpoint)}/${form.bucket.trim()}`)
        : '';
    const activeFromDb = view?.runtime.source === 'database';

    return (
        <div className={styles.panel}>
            <section className={hrStyles.formGuideCard}>
                <h2>قبل از ثبت</h2>
                <p>
                    همهٔ فایل‌های این اپ (آپلودها و خروجی‌ها) روی این استوریج ذخیره می‌شوند و کاربران مستقیم از همین آدرس
                    آن‌ها را می‌بینند. برای اینکه با قطعی اینترنت بین‌الملل یا تحریم هم تصویرها نمایش داده شوند، استوریج
                    داخل ایران (مثل پارس‌پک) را وارد کنید. اول «تست اتصال» را بزنید؛ فعال‌سازی فقط وقتی انجام می‌شود که هر
                    سه مرحلهٔ تست موفق باشد، پس با اطلاعات اشتباه آپلودهای سایت قطع نمی‌شود.
                    {' '}<Link href="/files/storage-docs">راهنمای کامل استوریج</Link>
                </p>
            </section>

            <div className={parentStyles.formCard}>
                <div className={styles.statusRow}>
                    <span className={`${styles.statusChip} ${activeFromDb ? styles.statusChipActive : styles.statusChipIdle}`}>
                        {activeFromDb ? '● استوریج این صفحه فعال است' : '○ استوریج قدیمی (فایل env سرور) فعال است'}
                    </span>
                    {view?.runtime.publicBase && (
                        <span className={styles.statusDetail} dir="ltr">{view.runtime.publicBase}</span>
                    )}
                </div>

                <h3 className={parentStyles.formSectionTitle}>اتصال S3</h3>
                <div className={hrStyles.formRow}>
                    <div className={parentStyles.field}>
                        <label htmlFor="storage-endpoint">آدرس endpoint</label>
                        <input
                            id="storage-endpoint"
                            dir="ltr"
                            placeholder="c780242.parspack.net"
                            value={form.endpoint}
                            onChange={(event) => update('endpoint', event.target.value)}
                        />
                        <p className={hrStyles.fieldHint}>
                            همان آدرسی که پنل استوریج به‌عنوان Endpoint نشان می‌دهد؛ بدون https هم قابل قبول است.
                        </p>
                    </div>
                    <div className={parentStyles.field}>
                        <label htmlFor="storage-bucket">نام باکت</label>
                        <input
                            id="storage-bucket"
                            dir="ltr"
                            placeholder={hostBucket || 'my-bucket'}
                            value={form.bucket}
                            onChange={(event) => update('bucket', event.target.value)}
                        />
                        {bucketMismatch ? (
                            <p className={styles.fieldWarn}>
                                در پارس‌پک نام باکت همان بخش اول آدرس است؛ اینجا باید «{hostBucket}» باشد.
                            </p>
                        ) : (
                            <p className={hrStyles.fieldHint}>
                                در پارس‌پک نام باکت همان بخش اول آدرس endpoint است (مثلاً c780242) و با وارد کردن آدرس خودکار پر
                                می‌شود. دسترسی باکت باید عمومی (Public) باشد.
                            </p>
                        )}
                    </div>
                </div>

                <div className={hrStyles.formRow}>
                    <div className={parentStyles.field}>
                        <label htmlFor="storage-access-key">Access Key</label>
                        <input
                            id="storage-access-key"
                            dir="ltr"
                            autoComplete="off"
                            value={form.accessKey}
                            onChange={(event) => update('accessKey', event.target.value)}
                        />
                        <p className={hrStyles.fieldHint}>شناسهٔ کلید دسترسی از پنل استوریج.</p>
                    </div>
                    <div className={parentStyles.field}>
                        <label htmlFor="storage-secret-key">Secret Key</label>
                        <input
                            id="storage-secret-key"
                            type="password"
                            dir="ltr"
                            autoComplete="new-password"
                            placeholder={view?.hasSecretKey ? 'ذخیره شده — برای تغییر، مقدار جدید را بنویسید' : ''}
                            value={form.secretKey}
                            onChange={(event) => update('secretKey', event.target.value)}
                        />
                        <p className={hrStyles.fieldHint}>
                            این کلید فقط ذخیره می‌شود و هرگز دوباره نمایش داده نمی‌شود. خالی گذاشتن یعنی کلید قبلی بماند.
                        </p>
                    </div>
                </div>

                <h3 className={`${parentStyles.formSectionTitle} ${styles.sectionGap}`}>نمایش به کاربران</h3>
                <div className={parentStyles.field}>
                    <label htmlFor="storage-public-base">آدرس عمومی فایل‌ها (اختیاری)</label>
                    <input
                        id="storage-public-base"
                        dir="ltr"
                        placeholder={derivedPublicBase || 'https://cdn.example.com'}
                        value={form.publicBaseUrl}
                        onChange={(event) => update('publicBaseUrl', event.target.value)}
                    />
                    <p className={hrStyles.fieldHint}>
                        اگر جلوی استوریج CDN گذاشته‌اید آدرس CDN را بنویسید؛ خالی بماند، آدرس به‌شکل
                        {' '}<span dir="ltr">endpoint/bucket</span>{' '}ساخته می‌شود. لینک همهٔ فایل‌های جدید با این آدرس شروع می‌شود.
                    </p>
                </div>

                <h3 className={`${parentStyles.formSectionTitle} ${styles.sectionGap}`}>پیشرفته</h3>
                <div className={hrStyles.formRow}>
                    <div className={parentStyles.field}>
                        <label htmlFor="storage-region">Region</label>
                        <input
                            id="storage-region"
                            dir="ltr"
                            value={form.region}
                            onChange={(event) => update('region', event.target.value)}
                        />
                        <p className={hrStyles.fieldHint}>اکثر استوریج‌های داخلی region ندارند؛ مقدار پیش‌فرض را نگه دارید.</p>
                    </div>
                    <div className={parentStyles.field}>
                        <label htmlFor="storage-timeout">حداکثر زمان هر درخواست (میلی‌ثانیه)</label>
                        <input
                            id="storage-timeout"
                            type="number"
                            dir="ltr"
                            min={5000}
                            max={600000}
                            value={form.requestTimeoutMs}
                            onChange={(event) => update('requestTimeoutMs', Number(event.target.value))}
                        />
                        <p className={hrStyles.fieldHint}>
                            اگر استوریج جواب ندهد، بعد از این زمان درخواست قطع و دوباره تلاش می‌شود (پیش‌فرض ۶۰۰۰۰).
                        </p>
                    </div>
                </div>
                <label className={styles.checkRow}>
                    <input
                        type="checkbox"
                        checked={form.forcePathStyle}
                        onChange={(event) => update('forcePathStyle', event.target.checked)}
                    />
                    آدرس‌دهی path-style
                    <span className={hrStyles.fieldHint}>برای پارس‌پک، آروان و MinIO روشن بماند.</span>
                </label>

                <h3 className={`${parentStyles.formSectionTitle} ${styles.sectionGap}`}>فعال‌سازی</h3>
                <label className={styles.checkRow}>
                    <input
                        type="checkbox"
                        checked={form.enabled}
                        onChange={(event) => update('enabled', event.target.checked)}
                    />
                    استفاده از این استوریج برای همهٔ فایل‌های جدید
                    <span className={hrStyles.fieldHint}>
                        خاموش باشد، سرور مثل قبل از تنظیمات فایل env استفاده می‌کند (فایل‌هایی که روی این استوریج آپلود شده‌اند
                        همچنان از آن خوانده می‌شوند).
                    </span>
                </label>

                {testResult && (
                    <div className={`${styles.testBox} ${testResult.ok ? styles.testBoxOk : styles.testBoxFail}`}>
                        <strong>{testResult.ok ? '✔ اتصال سالم است' : '✖ تست ناموفق بود'}</strong>
                        <ul>
                            {testResult.steps.map((step) => (
                                <li key={step.step}>
                                    {step.ok ? '✔' : '✖'} {STEP_LABELS[step.step]}
                                    {step.ok ? ` — ${step.latencyMs}ms` : ''}
                                    {step.error && <span className={styles.testError} dir="ltr">{step.error}</span>}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className={hrStyles.formNoteBox}>
                    بعد از ذخیره، تغییر روی همین سرور فوراً و روی بقیهٔ نمونه‌های سرور حداکثر تا یک دقیقه بعد اعمال می‌شود —
                    بدون ری‌استارت. فایل‌های قدیمی منتقل نمی‌شوند ولی خراب هم نمی‌شوند: استوریج قبلی به‌صورت بک‌آپ
                    فقط‌خواندنی وصل می‌ماند و هر فایلی که روی استوریج جدید نباشد از آن خوانده می‌شود (بخش پایین).
                </div>

                <div className={parentStyles.formActions}>
                    <button type="button" className={parentStyles.primaryBtn} disabled={saving} onClick={() => void save()}>
                        {saving ? (form.enabled ? 'در حال تست و ذخیره...' : 'در حال ذخیره...') : 'ذخیره تنظیمات'}
                    </button>
                    <button type="button" className={parentStyles.secondaryBtn} disabled={testing} onClick={() => void runTest()}>
                        {testing ? 'در حال تست...' : 'تست اتصال'}
                    </button>
                </div>
            </div>

            {view && (
                <StorageFallbacksPanel
                    view={view}
                    onViewChange={(next) => {
                        setView(next);
                        setForm(toForm(next));
                    }}
                />
            )}
            {view && <StorageMaintenance view={view} />}
        </div>
    );
}
