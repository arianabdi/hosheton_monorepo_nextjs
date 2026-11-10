'use client';

import { useState } from 'react';
import { LuKeyRound, LuSend } from 'react-icons/lu';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { useConfigDraft, useSitemap, useSitemapData } from '../../lib/SitemapProvider';
import { EmptyState, SaveBar, SectionIntro, SectionLoading, ToggleItem, UrlRow } from '../../components/fields';
import { formatDate, formatNumber } from '../../lib/format';
import type { SitemapApi } from '../../lib/sitemap-api';
import parentStyles from '../../../Marketing.module.scss';
import hrStyles from '@/app/(main)/management/hr/Hr.module.scss';
import styles from '../../Sitemap.module.scss';

const KEYS = ['indexnow'] as const;
const loadIndexNow = (api: SitemapApi) =>
    Promise.all([api.getIndexNowStatus(), api.listGroups(), api.listRuns(50)]).then(([status, groups, runs]) => ({
        status,
        groups: groups.filter((g) => g.enabled),
        runs: runs.filter((r) => r.type === 'indexnow'),
    }));

/** IndexNow — اطلاع‌رسانی فوری URLهای جدید/تغییرکرده به Bing، Yandex و … */
export default function SitemapIndexNowPage() {
    const { api, config, invalidate } = useSitemap();
    const { draft, update, dirty, saving, save, reset } = useConfigDraft(KEYS);
    const { data } = useSitemapData(loadIndexNow);
    const [urlsInput, setUrlsInput] = useState('');
    const [groupName, setGroupName] = useState('');
    const [submitting, setSubmitting] = useState(false);
    if (!draft) return <SectionLoading />;

    const indexnow = draft.indexnow;
    /** ارسال بر اساس وضعیت ذخیره‌شده است، نه پیش‌نویس فرم */
    const savedEnabled = !!config?.indexnow.enabled;

    const submit = async (payload: { urls?: string[]; group?: string }) => {
        if (!api) return;
        try {
            setSubmitting(true);
            const result = await api.submitIndexNow(payload);
            const skipped = result.skipped ? ` — ${formatNumber(result.skipped)} ورودی مسدود یا خارج از دامنه کنار گذاشته شد.` : '';
            if (result.ok) SuccessToaster({ message: `${result.detail}${skipped}` });
            else ErrorToaster(new Error(result.detail));
            invalidate();
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setSubmitting(false);
        }
    };

    const urls = urlsInput.split('\n').map((u) => u.trim()).filter(Boolean);

    return (
        <>
            <SectionIntro topic="indexnow">
                IndexNow مکمل سایت‌مپ است، نه جایگزین آن: تغییرات را همان لحظه به Bing، Yandex و موتورهای همکار اعلام
                می‌کند. گوگل از IndexNow پشتیبانی نمی‌کند و فقط از سایت‌مپ استفاده می‌کند.
            </SectionIntro>

            <div className={parentStyles.formCard}>
                <h2 className={parentStyles.formSectionTitle}>تنظیمات</h2>
                <ToggleItem
                    title="IndexNow فعال باشد"
                    hint="با فعال‌سازی، فایل کلید روی دامنه سایت سرو می‌شود و ارسال‌ها انجام می‌گیرد."
                    checked={indexnow.enabled}
                    onChange={(enabled) => update({ indexnow: { ...indexnow, enabled } })}
                />
                <ToggleItem
                    title="ارسال خودکار تغییرات (هر ۶ ساعت)"
                    hint="URLهایی که lastmodشان بعد از آخرین ارسال است، دسته‌ای اعلام می‌شوند."
                    checked={indexnow.automatic}
                    onChange={(automatic) => update({ indexnow: { ...indexnow, automatic } })}
                />
                <div className={parentStyles.field}>
                    <label htmlFor="in-batch">سقف URL هر گروه در ارسال خودکار</label>
                    <input
                        id="in-batch"
                        type="number"
                        min={1}
                        max={10000}
                        dir="ltr"
                        value={indexnow.batchSize}
                        onChange={(e) => update({ indexnow: { ...indexnow, batchSize: Number(e.target.value) || 1 } })}
                    />
                    <p className={parentStyles.fieldHint}>حداکثر پروتکل IndexNow در هر درخواست ۱۰٬۰۰۰ URL است.</p>
                </div>
            </div>

            <SaveBar dirty={dirty} saving={saving} onReset={reset} onSave={() => save('تنظیمات IndexNow ذخیره شد.')} label="ذخیره تنظیمات" />

            <section className={styles.block}>
                <h2 className={styles.blockTitle}>
                    <LuKeyRound /> کلید و فایل تایید
                </h2>
                {!data ? (
                    <SectionLoading />
                ) : (
                    <>
                        <UrlRow
                            label="فایل کلید روی دامنه سایت"
                            url={data.status.keyFileUrl}
                            hint="موتورهای جستجو با خواندن این فایل مالکیت دامنه را تایید می‌کنند؛ فقط وقتی IndexNow فعال است سرو می‌شود."
                        />
                        <p className={parentStyles.fieldHint}>
                            کلید: <span className={styles.keyBadge}>{data.status.key}</span> — آخرین ارسال:{' '}
                            {formatDate(data.status.lastSubmittedAt, 'هنوز ارسالی ثبت نشده')}
                            {data.status.lastResult ? ` — ${data.status.lastResult}` : ''}
                        </p>
                    </>
                )}
            </section>

            <div className={parentStyles.formCard}>
                <h2 className={parentStyles.formSectionTitle}>
                    <LuSend /> ارسال دستی
                </h2>
                <div className={parentStyles.field}>
                    <label htmlFor="in-urls">هر خط یک URL یا مسیر</label>
                    <textarea
                        id="in-urls"
                        dir="ltr"
                        value={urlsInput}
                        onChange={(e) => setUrlsInput(e.target.value)}
                        placeholder={'/explore/new-template\nhttps://studio.hosheton.com/creators/665f…'}
                    />
                    <p className={parentStyles.fieldHint}>
                        با همان قوانین سایت‌مپ نرمال می‌شوند؛ آدرس دامنه دیگر یا مسیر مسدود (ورود، پنل) ارسال نمی‌شود.
                    </p>
                </div>
                <div className={parentStyles.formActions}>
                    <button
                        type="button"
                        className={parentStyles.primaryBtn}
                        onClick={() => submit({ urls })}
                        disabled={submitting || !savedEnabled || urls.length === 0}
                    >
                        {submitting ? 'در حال ارسال…' : `ارسال ${urls.length ? formatNumber(urls.length) : ''} URL`}
                    </button>
                </div>

                <div className={`${parentStyles.field} ${styles.cardGap}`}>
                    <label htmlFor="in-group">یا همه URLهای یک گروه</label>
                    <select id="in-group" value={groupName} onChange={(e) => setGroupName(e.target.value)}>
                        <option value="">انتخاب گروه…</option>
                        {data?.groups.map((g) => (
                            <option key={g._id} value={g.name}>
                                {g.title}
                            </option>
                        ))}
                    </select>
                    <p className={parentStyles.fieldHint}>مناسب اولین معرفی یا بعد از تغییر الگوی URL یک گروه.</p>
                </div>
                <div className={parentStyles.formActions}>
                    <button
                        type="button"
                        className={parentStyles.secondaryBtn}
                        onClick={() => submit({ group: groupName })}
                        disabled={submitting || !savedEnabled || !groupName}
                    >
                        ارسال گروه
                    </button>
                </div>
                {!savedEnabled && <p className={parentStyles.fieldHint}>برای ارسال، ابتدا IndexNow را فعال و ذخیره کنید.</p>}
            </div>

            <h2 className={styles.blockTitle}>تاریخچه ارسال‌ها</h2>
            {!data ? (
                <SectionLoading />
            ) : data.runs.length === 0 ? (
                <EmptyState>هنوز ارسالی ثبت نشده است.</EmptyState>
            ) : (
                <div className={styles.tableWrap}>
                    <table className={styles.dataTable}>
                        <thead>
                            <tr>
                                <th>زمان</th>
                                <th>وضعیت</th>
                                <th>تعداد URL</th>
                                <th>نتیجه</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.runs.map((run) => (
                                <tr key={run._id}>
                                    <td data-label="زمان" className={styles.muted}>{formatDate(run.createdAt)}</td>
                                    <td data-label="وضعیت">
                                        <span className={`${styles.statusBadge} ${styles[run.status]}`}>{run.status === 'success' ? 'موفق' : 'ناموفق'}</span>
                                    </td>
                                    <td data-label="تعداد URL" className={styles.numCell}>{formatNumber(run.urlsCount)}</td>
                                    <td data-label="نتیجه">{run.message || '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div className={hrStyles.formNoteBox}>
                <strong>برای گوگل:</strong> آدرس ایندکس سایت‌مپ را در Google Search Console (بخش Sitemaps) ثبت کنید و برای
                صفحه‌های مهم از ابزار URL Inspection همان‌جا استفاده کنید.
            </div>
        </>
    );
}
