'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { ModalHelper } from '@my-workspace/components';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import parentStyles from '../../marketing/Marketing.module.scss';
import hrStyles from '../../management/hr/Hr.module.scss';
import styles from './StorageSettings.module.scss';
import {
    getStorageStatus,
    locateStorageObject,
    removeRetiredStorage,
    type RetiredStorageView,
    type StorageDistributionRow,
    type StorageLocateResult,
    type StorageSettingsView,
} from './storage-api';

function formatBytes(bytes: number): string {
    if (!bytes) return '۰';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let value = bytes;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
        value /= 1024;
        unit += 1;
    }
    return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function roleOf(row: StorageDistributionRow): string {
    if (row.active) return 'فعال — آپلودهای جدید';
    if (row.id === 'env') return 'بک‌آپ فقط‌خواندنی (env سرور)';
    if (row.id.startsWith('retired:')) return 'بک‌آپ فقط‌خواندنی (استوریج قبلی پنل)';
    return 'آدرس ناشناخته';
}

interface Props {
    view: StorageSettingsView;
    onViewChange: (view: StorageSettingsView) => void;
}

/**
 * فایل‌های قدیمی بعد از عوض‌شدن استوریج: کدام استوریج‌ها بک‌آپ فقط‌خواندنی هستند، چند فایل هنوز
 * روی هر کدام است، و ابزار «این فایل کجاست؟» برای عیب‌یابی «فایل پیدا نشد».
 */
export default function StorageFallbacksPanel({ view, onViewChange }: Props) {
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const [rows, setRows] = useState<StorageDistributionRow[] | null>(null);
    const [loadingRows, setLoadingRows] = useState(false);
    const [lookup, setLookup] = useState('');
    const [locating, setLocating] = useState(false);
    const [located, setLocated] = useState<StorageLocateResult | null>(null);
    const [removing, setRemoving] = useState<RetiredStorageView | null>(null);
    const [removeBusy, setRemoveBusy] = useState(false);

    const loadRows = useCallback(async () => {
        if (!token) return;
        try {
            setLoadingRows(true);
            setRows(await getStorageStatus(baseUrl, token));
        } catch (error) {
            ErrorToaster(error);
        } finally {
            setLoadingRows(false);
        }
    }, [baseUrl, token]);

    useEffect(() => {
        void loadRows();
        // فهرست استوریج‌ها بعد از ذخیره/حذف عوض می‌شود
    }, [loadRows, view.runtime.publicBase, view.runtime.fallbacks.length]);

    const locate = async () => {
        if (!token || !lookup.trim()) return;
        try {
            setLocating(true);
            setLocated(await locateStorageObject(baseUrl, token, lookup.trim()));
        } catch (error) {
            ErrorToaster(error);
        } finally {
            setLocating(false);
        }
    };

    const confirmRemove = async () => {
        if (!token || !removing) return;
        try {
            setRemoveBusy(true);
            const next = await removeRetiredStorage(baseUrl, token, { endpoint: removing.endpoint, bucket: removing.bucket });
            onViewChange(next);
            SuccessToaster({ message: 'این استوریج دیگر برای فایل‌های قدیمی خوانده نمی‌شود' });
            setRemoving(null);
        } catch (error) {
            ErrorToaster(error);
        } finally {
            setRemoveBusy(false);
        }
    };

    const removingRow = removing ? rows?.find((row) => row.id === `retired:${removing.endpoint}/${removing.bucket}`) : undefined;

    return (
        <div className={parentStyles.formCard}>
            <h3 className={parentStyles.formSectionTitle}>فایل‌های قدیمی و استوریج‌های قبلی</h3>
            <p className={hrStyles.fieldHint}>
                <strong>به چه درد می‌خورد؟</strong> با عوض‌کردن استوریج، فایل‌های قبلی منتقل نمی‌شوند؛ استوریج قبلی به‌صورت
                «بک‌آپ فقط‌خواندنی» وصل می‌ماند و هر فایلی که روی استوریج فعال نباشد از آن خوانده می‌شود.
            </p>
            <p className={hrStyles.fieldHint}>
                <strong>چطور استفاده کنم؟</strong> عدد «فایل‌ها» می‌گوید چند فایل هنوز به هر استوریج وابسته است. تا این عدد
                صفر نشده، آن استوریج را خاموش یا از فهرست حذف نکنید. برای «فایل پیدا نشد» کلید یا آدرس را در ابزار پایین بزنید.
                {' '}<Link href="/files/storage-docs">راهنمای کامل استوریج</Link>
            </p>

            <div className={`${styles.fallbackTable} ${loadingRows && rows ? styles.tableLoading : ''}`}>
                <table>
                    <thead>
                        <tr>
                            <th>استوریج</th>
                            <th>نقش</th>
                            <th title="رکوردهای فایل که آدرسشان روی همین استوریج است">فایل‌ها</th>
                            <th>حجم</th>
                        </tr>
                    </thead>
                    <tbody>
                        {!rows && (
                            <tr>
                                <td colSpan={4} className={styles.mutedCell}>{loadingRows ? 'در حال شمارش…' : '—'}</td>
                            </tr>
                        )}
                        {rows?.map((row) => (
                            <tr key={row.id}>
                                <td data-label="استوریج">
                                    <span dir="ltr" className={styles.ltrText}>{row.publicBase || row.label}</span>
                                </td>
                                <td data-label="نقش">
                                    <span className={row.active ? styles.roleActive : styles.roleFallback}>{roleOf(row)}</span>
                                </td>
                                <td data-label="فایل‌ها">{row.files.toLocaleString('fa-IR')}</td>
                                <td data-label="حجم" dir="ltr">{formatBytes(row.bytes)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className={styles.inlineActions}>
                <button type="button" className={parentStyles.secondaryBtn} disabled={loadingRows} onClick={() => void loadRows()}>
                    {loadingRows ? 'در حال شمارش…' : 'شمارش دوباره'}
                </button>
            </div>

            {view.retired.length > 0 && (
                <>
                    <h3 className={`${parentStyles.formSectionTitle} ${styles.sectionGap}`}>استوریج‌های قبلی همین پنل</h3>
                    <p className={hrStyles.fieldHint}>
                        هر بار استوریج فعال را عوض کنید (یا خاموشش کنید)، قبلی با کلیدهایش اینجا نگه داشته می‌شود تا فایل‌هایش خوانده
                        شوند. استوریج env سرور همیشه بک‌آپ است و اینجا نمی‌آید.
                    </p>
                    <ul className={styles.retiredList}>
                        {view.retired.map((entry) => (
                            <li key={`${entry.endpoint}/${entry.bucket}`}>
                                <div>
                                    <span dir="ltr" className={styles.ltrText}>{entry.publicBase}</span>
                                    <span className={hrStyles.fieldHint}>
                                        {entry.retiredAt ? `کنار گذاشته در ${new Date(entry.retiredAt).toLocaleDateString('fa-IR')}` : ''}
                                        {!entry.hasCredentials && ' — کلید ندارد؛ خوانده نمی‌شود'}
                                    </span>
                                </div>
                                <button type="button" className={parentStyles.secondaryBtn} onClick={() => setRemoving(entry)}>
                                    حذف از بک‌آپ‌ها
                                </button>
                            </li>
                        ))}
                    </ul>
                </>
            )}

            <h3 className={`${parentStyles.formSectionTitle} ${styles.sectionGap}`}>این فایل کجاست؟</h3>
            <div className={parentStyles.field}>
                <label htmlFor="storage-locate">کلید یا آدرس فایل</label>
                <input
                    id="storage-locate"
                    dir="ltr"
                    placeholder="hosheton/videos/….mp4 یا آدرس کامل"
                    value={lookup}
                    onChange={(event) => {
                        setLookup(event.target.value);
                        setLocated(null);
                    }}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') void locate();
                    }}
                />
                <p className={hrStyles.fieldHint}>
                    همهٔ استوریج‌ها (اول فعال، بعد بک‌آپ‌ها) بررسی می‌شوند؛ جواب همان آدرسی است که سرور به ارائه‌دهندهٔ AI می‌دهد.
                </p>
            </div>
            <div className={styles.inlineActions}>
                <button type="button" className={parentStyles.secondaryBtn} disabled={locating || !lookup.trim()} onClick={() => void locate()}>
                    {locating ? 'در حال جستجو…' : 'جستجو'}
                </button>
            </div>
            {located && (
                <div className={`${styles.testBox} ${located.found ? styles.testBoxOk : styles.testBoxFail}`}>
                    {located.found && located.storage ? (
                        <>
                            <strong>✔ پیدا شد — {located.storage.active ? 'روی استوریج فعال' : 'روی استوریج بک‌آپ'}</strong>
                            <span className={styles.testError} dir="ltr">{located.storage.label}</span>
                            {located.publicUrl && (
                                <a className={styles.testError} dir="ltr" href={located.publicUrl} target="_blank" rel="noreferrer">
                                    {located.publicUrl}
                                </a>
                            )}
                        </>
                    ) : (
                        <>
                            <strong>✖ روی هیچ استوریجی نیست</strong>
                            <span className={styles.testError} dir="ltr">{located.key}</span>
                            <span className={styles.testError}>
                                فایل پاک شده یا روی استوریجی بوده که از بک‌آپ‌ها حذف شده است. کاربر باید دوباره آپلودش کند.
                            </span>
                        </>
                    )}
                </div>
            )}

            <ModalHelper
                open={Boolean(removing)}
                onClose={() => setRemoving(null)}
                size="sm"
                sheetTitle="حذف استوریج قبلی"
                component={removing ? (
                    <div className={styles.confirmBody}>
                        <h3>حذف از استوریج‌های بک‌آپ؟</h3>
                        <p dir="ltr" className={styles.ltrText}>{removing.publicBase}</p>
                        <p>
                            {removingRow?.files
                                ? `${removingRow.files.toLocaleString('fa-IR')} فایل هنوز روی این استوریج است و بعد از حذف دیگر خوانده نمی‌شوند (در چت و تولید «فایل پیدا نشد» می‌شوند). فقط وقتی حذف کنید که آن‌ها را منتقل کرده‌اید یا دیگر لازم نیستند.`
                                : 'فایلی به این استوریج وابسته نیست؛ حذفش امن است.'}
                        </p>
                        <div className={parentStyles.formActions}>
                            <button type="button" className={parentStyles.primaryBtn} disabled={removeBusy} onClick={() => void confirmRemove()}>
                                {removeBusy ? 'در حال حذف…' : 'حذف کن'}
                            </button>
                            <button type="button" className={parentStyles.secondaryBtn} onClick={() => setRemoving(null)}>
                                انصراف
                            </button>
                        </div>
                    </div>
                ) : null}
            />
        </div>
    );
}
