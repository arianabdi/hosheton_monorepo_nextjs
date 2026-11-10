'use client';

import { useState, type FormEvent } from 'react';
import { LuCircleCheck, LuCircleX, LuShieldAlert } from 'react-icons/lu';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import SimpleLineTabs from '@/app/components/SimpleLineTabs/SimpleLineTabs';
import { useSitemap, useSitemapData } from '../../lib/SitemapProvider';
import { EmptyState, SectionIntro, SectionLoading } from '../../components/fields';
import { formatDate, formatNumber } from '../../lib/format';
import { SEVERITY_LABELS } from '../../lib/sitemap.types';
import type { InspectResult, IssueSeverity, SitemapIssue } from '../../lib/sitemap.types';
import type { SitemapApi } from '../../lib/sitemap-api';
import parentStyles from '../../../Marketing.module.scss';
import styles from '../../Sitemap.module.scss';

const loadIssues = (api: SitemapApi) => api.listOpenIssues();
const SEVERITIES = Object.keys(SEVERITY_LABELS) as IssueSeverity[];

function InspectSummary({ result }: { result: InspectResult }) {
    const verdict = result.excluded
        ? { icon: <LuShieldAlert />, tone: styles.warning, text: 'با قوانین امنیتی (الگوهای مسدود) کنار گذاشته می‌شود.' }
        : result.inSitemap
          ? { icon: <LuCircleCheck />, tone: styles.healthy, text: 'در سایت‌مپ منتشر شده است.' }
          : { icon: <LuCircleX />, tone: styles.error, text: 'در سایت‌مپ نیست — هیچ گروه فعالی این آدرس را تولید نمی‌کند.' };
    return (
        <div className={styles.inspectResult}>
            <p className={`${styles.inspectVerdict} ${verdict.tone}`}>
                {verdict.icon} {verdict.text}
            </p>
            <dl className={styles.kvList}>
                <div className={styles.kvRow}>
                    <dt>مسیر نرمال‌شده</dt>
                    <dd dir="ltr">{result.normalizedPath}</dd>
                </div>
                <div className={styles.kvRow}>
                    <dt>آدرس نهایی</dt>
                    <dd dir="ltr">{result.absoluteUrl}</dd>
                </div>
                {result.groups.map((g) => (
                    <div key={g.groupName} className={styles.kvRow}>
                        <dt>گروه / فایل</dt>
                        <dd>
                            {g.groupTitle} —{' '}
                            <a href={g.fileUrl} target="_blank" rel="noreferrer" dir="ltr">
                                {g.file}
                            </a>
                            <span className={styles.muted}> (تولید {formatDate(g.generatedAt)})</span>
                        </dd>
                    </div>
                ))}
            </dl>
        </div>
    );
}

/** اعتبارسنجی — ممیزی ساختار سایت‌مپ، یافته‌های باز و بازرسی یک URL */
export default function SitemapValidationPage() {
    const { api, invalidate } = useSitemap();
    const { data: issues, setData: setIssues, loading } = useSitemapData(loadIssues);
    const [auditing, setAuditing] = useState(false);
    const [severity, setSeverity] = useState<'all' | IssueSeverity>('all');
    const [inspectInput, setInspectInput] = useState('');
    const [inspecting, setInspecting] = useState(false);
    const [inspectResult, setInspectResult] = useState<InspectResult | null>(null);

    const onAudit = async () => {
        if (!api) return;
        try {
            setAuditing(true);
            const { summary } = await api.runAudit();
            SuccessToaster({
                message: `ممیزی کامل شد — ${formatNumber(summary.critical)} بحرانی، ${formatNumber(summary.error)} خطا، ${formatNumber(summary.warning)} هشدار، ${formatNumber(summary.info)} اطلاع.`,
            });
            invalidate();
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setAuditing(false);
        }
    };

    const onResolve = async (issue: SitemapIssue) => {
        if (!api) return;
        try {
            await api.resolveIssue(issue._id);
            setIssues((current) => current?.filter((i) => i._id !== issue._id) ?? null);
        } catch (e) {
            ErrorToaster(e);
        }
    };

    const onInspect = async (event: FormEvent) => {
        event.preventDefault();
        if (!api || !inspectInput.trim()) return;
        try {
            setInspecting(true);
            setInspectResult(await api.inspectUrl(inspectInput.trim()));
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setInspecting(false);
        }
    };

    const all = issues ?? [];
    const visible = severity === 'all' ? all : all.filter((i) => i.severity === severity);
    const tabs = [
        { id: 'all', label: `همه (${formatNumber(all.length)})` },
        ...SEVERITIES.map((s) => ({ id: s, label: `${SEVERITY_LABELS[s]} (${formatNumber(all.filter((i) => i.severity === s).length)})` })),
    ];

    return (
        <>
            <SectionIntro topic="validation">
                بعد از هر تغییر ساختاری (گروه جدید، تغییر الگو، robots) ممیزی بگیرید. یافته‌های «بحرانی» و «خطا» یعنی
                گوگل URLها را درست دریافت نمی‌کند و باید زودتر رفع شوند.
            </SectionIntro>

            <form className={parentStyles.formCard} onSubmit={onInspect}>
                <h2 className={parentStyles.formSectionTitle}>بازرسی URL</h2>
                <div className={parentStyles.field}>
                    <label htmlFor="inspect-url">آدرس یا مسیر</label>
                    <input
                        id="inspect-url"
                        dir="ltr"
                        value={inspectInput}
                        onChange={(e) => setInspectInput(e.target.value)}
                        placeholder="/explore/cinematic-portrait"
                    />
                    <p className={parentStyles.fieldHint}>
                        می‌گوید این آدرس در سایت‌مپ هست یا نه، کدام گروه و فایل آن را منتشر کرده یا کدام قاعده حذفش کرده —
                        بر اساس آخرین تولید هر گروه.
                    </p>
                </div>
                <div className={parentStyles.formActions}>
                    <button type="submit" className={parentStyles.primaryBtn} disabled={inspecting || !inspectInput.trim()}>
                        {inspecting ? 'در حال بررسی…' : 'بررسی URL'}
                    </button>
                </div>
                {inspectResult && <InspectSummary result={inspectResult} />}
            </form>

            <div className={styles.blockHeader}>
                <h2 className={styles.blockTitle}>یافته‌های باز</h2>
                <button type="button" className={parentStyles.primaryBtn} onClick={onAudit} disabled={auditing}>
                    {auditing ? 'در حال ممیزی…' : 'اجرای ممیزی'}
                </button>
            </div>

            <SimpleLineTabs tabs={tabs} activeTab={severity} onChange={(id) => setSeverity(id as 'all' | IssueSeverity)} />

            {!issues && loading ? (
                <SectionLoading />
            ) : visible.length === 0 ? (
                <EmptyState>یافته بازی وجود ندارد — برای ثبت وضعیت فعلی، ممیزی جدید اجرا کنید.</EmptyState>
            ) : (
                <div className={styles.tableWrap}>
                    <table className={styles.dataTable}>
                        <thead>
                            <tr>
                                <th>شدت</th>
                                <th>کد</th>
                                <th>گروه</th>
                                <th>توضیح</th>
                                <th>زمان</th>
                                <th>عملیات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visible.map((issue) => (
                                <tr key={issue._id}>
                                    <td data-label="شدت">
                                        <span className={`${styles.severityBadge} ${styles[issue.severity]}`}>{SEVERITY_LABELS[issue.severity]}</span>
                                    </td>
                                    <td data-label="کد"><span className={styles.keyBadge}>{issue.code}</span></td>
                                    <td data-label="گروه">{issue.groupName || '—'}</td>
                                    <td data-label="توضیح">{issue.message}</td>
                                    <td data-label="زمان" className={styles.muted}>{formatDate(issue.createdAt)}</td>
                                    <td data-label="عملیات">
                                        <button type="button" className={styles.smallBtn} onClick={() => onResolve(issue)}>
                                            بستن
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </>
    );
}
