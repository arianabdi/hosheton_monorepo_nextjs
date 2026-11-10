'use client';

import { LuExternalLink } from 'react-icons/lu';
import { useConfigDraft, useSitemap, useSitemapData } from '../../lib/SitemapProvider';
import { EmptyState, SaveBar, SectionIntro, SectionLoading, ToggleItem } from '../../components/fields';
import { formatBytes, formatDate, formatDuration, formatNumber } from '../../lib/format';
import { RUN_TYPE_LABELS, TRIGGER_LABELS } from '../../lib/sitemap.types';
import type { SitemapApi } from '../../lib/sitemap-api';
import parentStyles from '../../../Marketing.module.scss';
import styles from '../../Sitemap.module.scss';

const KEYS = ['generation'] as const;
const loadFilesAndRuns = (api: SitemapApi) => Promise.all([api.listFiles(), api.listRuns(30)]);

/** تولید و فایل‌ها — حالت تولید، کش، فایل‌های ساخته‌شده و تاریخچه همه اجراها */
export default function SitemapGenerationPage() {
    const { api } = useSitemap();
    const { draft, update, dirty, saving, save, reset } = useConfigDraft(KEYS);
    const { data, loading } = useSitemapData(loadFilesAndRuns);
    if (!draft) return <SectionLoading />;

    const generation = draft.generation;
    const [files, runs] = data ?? [[], []];

    return (
        <>
            <SectionIntro topic="generation">
                خروجی یک فایل ایندکس و چند فایل XML برای گروه‌هاست. هر گروه تا پایان مدت کش از حافظه سرو و بعد از آن
                دوباره ساخته می‌شود؛ ذخیره هر تنظیمی کش را فوراً باطل می‌کند.
            </SectionIntro>

            <div className={parentStyles.formCard}>
                <h2 className={parentStyles.formSectionTitle}>حالت تولید</h2>
                <ToggleItem
                    title="تولید خودکار (کرون ساعتی)"
                    hint="همه گروه‌های فعال هر ساعت بازتولید و در تاریخچه ثبت می‌شوند. در حالت دستی، فایل‌ها با اولین درخواست بعد از انقضای کش یا دکمه «تولید مجدد همه» ساخته می‌شوند."
                    checked={generation.mode === 'automatic'}
                    onChange={(automatic) => update({ generation: { ...generation, mode: automatic ? 'automatic' : 'manual' } })}
                />
                <div className={parentStyles.field}>
                    <label htmlFor="cache-ttl">مدت کش هر گروه (ثانیه)</label>
                    <input
                        id="cache-ttl"
                        type="number"
                        min={60}
                        dir="ltr"
                        value={generation.cacheTtlSeconds}
                        onChange={(e) => update({ generation: { ...generation, cacheTtlSeconds: Number(e.target.value) || 0 } })}
                    />
                    <p className={parentStyles.fieldHint}>
                        پیش‌فرض ۳۶۰۰ (یک ساعت)، حداقل ۶۰. گروهی که «کش اختصاصی» دارد از مقدار خودش استفاده می‌کند.
                    </p>
                </div>
            </div>

            <SaveBar
                dirty={dirty}
                saving={saving}
                onReset={reset}
                onSave={() => save('تنظیمات تولید ذخیره شد.')}
                label="ذخیره تنظیمات تولید"
            />

            <h2 className={styles.blockTitle}>فایل‌های ساخته‌شده</h2>
            {!data && loading ? (
                <SectionLoading />
            ) : files.length === 0 ? (
                <EmptyState>هنوز فایلی در کش نیست — «تولید مجدد همه» را بزنید یا منتظر اولین کرون بمانید.</EmptyState>
            ) : (
                <div className={styles.tableWrap}>
                    <table className={styles.dataTable}>
                        <thead>
                            <tr>
                                <th>فایل</th>
                                <th>گروه</th>
                                <th>URLها</th>
                                <th>حجم</th>
                                <th>آخرین تغییر محتوا</th>
                                <th>ساخته‌شده</th>
                            </tr>
                        </thead>
                        <tbody>
                            {files.map((file) => (
                                <tr key={file.name}>
                                    <td data-label="فایل">
                                        <a href={file.url} target="_blank" rel="noreferrer" className={styles.keyBadge} title={file.url}>
                                            {file.name}
                                        </a>
                                        {api && (
                                            <a
                                                href={api.publicPreviewUrl(file.name)}
                                                target="_blank"
                                                rel="noreferrer"
                                                className={styles.inlineIconLink}
                                                title="پیش‌نمایش از API"
                                            >
                                                <LuExternalLink />
                                            </a>
                                        )}
                                    </td>
                                    <td data-label="گروه">{file.groupTitle}</td>
                                    <td data-label="URLها" className={styles.numCell}>{formatNumber(file.urlsCount)}</td>
                                    <td data-label="حجم" className={styles.numCell}>{formatBytes(file.sizeBytes)}</td>
                                    <td data-label="آخرین تغییر محتوا" className={styles.muted}>{formatDate(file.lastmod)}</td>
                                    <td data-label="ساخته‌شده" className={styles.muted}>{formatDate(file.generatedAt)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <h2 className={styles.blockTitle}>تاریخچه اجراها</h2>
            {!data && loading ? (
                <SectionLoading />
            ) : runs.length === 0 ? (
                <EmptyState>هنوز اجرایی ثبت نشده است.</EmptyState>
            ) : (
                <div className={styles.tableWrap}>
                    <table className={styles.dataTable}>
                        <thead>
                            <tr>
                                <th>زمان</th>
                                <th>نوع</th>
                                <th>وضعیت</th>
                                <th>URLها</th>
                                <th>مدت</th>
                                <th>اجراکننده</th>
                                <th>توضیح</th>
                            </tr>
                        </thead>
                        <tbody>
                            {runs.map((run) => (
                                <tr key={run._id}>
                                    <td data-label="زمان" className={styles.muted}>{formatDate(run.createdAt)}</td>
                                    <td data-label="نوع">{RUN_TYPE_LABELS[run.type]}</td>
                                    <td data-label="وضعیت">
                                        <span className={`${styles.statusBadge} ${styles[run.status]}`}>
                                            {run.status === 'success' ? 'موفق' : 'ناموفق'}
                                        </span>
                                    </td>
                                    <td data-label="URLها" className={styles.numCell}>{formatNumber(run.urlsCount)}</td>
                                    <td data-label="مدت" className={styles.numCell}>{formatDuration(run.durationMs)}</td>
                                    <td data-label="اجراکننده">{TRIGGER_LABELS[run.triggeredBy]}</td>
                                    <td data-label="توضیح">{run.message || '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </>
    );
}
