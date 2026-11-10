'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { TbArrowRight, TbBug, TbCircleCheck, TbCode, TbEyeOff, TbFileCode, TbNotes, TbReload, TbServer, TbTag, TbUser } from 'react-icons/tb';
import { ErrorToaster, SuccessToaster, ConvertDateToCalendarString } from '@my-workspace/utils';
import { LoadingState, Pagination } from '@my-workspace/components';
import SimpleLineTabs from '@/app/components/SimpleLineTabs/SimpleLineTabs';
import { formatCount, fullDate, relativeTime } from '../../lib/format';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { fetchEvent, fetchIssue, fetchIssueEvents, setIssueNote, setIssueStatus } from '../../error-tracking-api';
import {
    EtrEvent,
    EtrIssue,
    EtrIssueDetail,
    EtrIssueStatusType,
    ETR_LEVEL_LABELS,
    ETR_STATUS_LABELS,
} from '../../error-tracking.types';
import hrStyles from '@/app/(main)/management/hr/Hr.module.scss';
import styles from '../../ErrorTracking.module.scss';

type DetailTab = 'latest' | 'context' | 'breadcrumbs' | 'provider';

const BASE_TABS: { id: DetailTab; label: string }[] = [
    { id: 'latest', label: 'Stack Trace' },
    { id: 'breadcrumbs', label: 'Breadcrumbs' },
    { id: 'context', label: 'کانتکست‌ها' },
];

/** ورودی‌ای که سرور قبل از ثبت رویداد چک کرده (captureExternalRequestFailure در libs/core) */
interface ProviderInputProbe {
    path: string;
    url: string;
    ok: boolean;
    status?: number;
    contentType?: string;
    contentLength?: number;
    error?: string;
    ms?: number;
}

/** رویدادی با قرارداد «درخواست به سرویس بیرونی» (extra.provider / extra.request / extra.inputs) — از هر اپ */
function hasProviderDetails(event: EtrEvent | null): boolean {
    const extra = event?.extra || {};
    return Boolean(extra.provider || extra.request || Array.isArray(extra.inputs));
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export default function IssueDetailPage() {
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const params = useParams();
    const issueId = String(params?.issueId || '');

    const [detail, setDetail] = useState<EtrIssueDetail | null>(null);
    const [events, setEvents] = useState<EtrEvent[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<EtrEvent | null>(null);
    const [activeTab, setActiveTab] = useState<DetailTab>('latest');
    const [loading, setLoading] = useState(true);
    const [eventsLoading, setEventsLoading] = useState(false);
    const [pagination, setPagination] = useState({ itemPerPage: 10, currentPage: 1, totalItems: 0 });

    const loadDetail = useCallback(async () => {
        if (!token || !issueId) return;
        try {
            setLoading(true);
            const data = await fetchIssue(baseUrl, token, issueId);
            setDetail(data);
            if (data.latestEventId) {
                const { event } = await fetchEvent(baseUrl, token, data.latestEventId);
                setSelectedEvent(event);
            }
        } catch (err) {
            ErrorToaster(err);
        } finally {
            setLoading(false);
        }
    }, [baseUrl, token, issueId]);

    const loadEvents = useCallback(async (page: number, limit: number) => {
        if (!token || !issueId) return;
        try {
            setEventsLoading(true);
            const data = await fetchIssueEvents(baseUrl, token, issueId, page, limit);
            setEvents(data.events || []);
            setPagination((prev) => ({ ...prev, totalItems: data.totalItems || 0, currentPage: page }));
        } catch (err) {
            ErrorToaster(err);
        } finally {
            setEventsLoading(false);
        }
    }, [baseUrl, token, issueId]);

    useEffect(() => {
        loadDetail();
        loadEvents(1, 10);
    }, [loadDetail, loadEvents]);

    const changeStatus = async (status: EtrIssueStatusType) => {
        if (!token) return;
        try {
            await setIssueStatus(baseUrl, token, issueId, status);
            SuccessToaster({ message: `وضعیت به «${ETR_STATUS_LABELS[status]}» تغییر کرد` });
            await loadDetail();
        } catch (err) {
            ErrorToaster(err);
        }
    };

    const saveNote = async (note: string) => {
        if (!token) return false;
        try {
            const { issue: updated } = await setIssueNote(baseUrl, token, issueId, note);
            setDetail((prev) => (prev ? { ...prev, issue: { ...prev.issue, ...updated } } : prev));
            SuccessToaster({ message: note.trim() ? 'یادداشت رفع ذخیره شد' : 'یادداشت رفع پاک شد' });
            return true;
        } catch (err) {
            ErrorToaster(err);
            return false;
        }
    };

    if (loading || !detail) {
        return (
            <div className={`${styles.container} ${styles.rtl}`}>
                <Link href="/error-tracking/issues" className={styles.issueBackLink}>
                    <TbArrowRight size={14} aria-hidden />بازگشت به فهرست مشکلات
                </Link>
                <header className={styles.issueHeader}>
                    <div className={styles.issueHeaderMain}>
                        <h1 className={styles.issueHeading}>جزئیات مشکل</h1>
                        <p className={styles.subtitle}>در حال بارگذاری Stack Trace و رویدادها</p>
                    </div>
                </header>
                <LoadingState />
            </div>
        );
    }

    const issue = detail.issue;
    const showProvider = hasProviderDetails(selectedEvent);
    const tabs = showProvider ? [...BASE_TABS, { id: 'provider' as DetailTab, label: 'درخواست به سرویس بیرونی' }] : BASE_TABS;
    const diagnosis = typeof selectedEvent?.extra?.diagnosis === 'string' ? selectedEvent.extra.diagnosis : '';

    return (
        <div className={`${styles.container} ${styles.rtl}`}>
            <Link href="/error-tracking/issues" className={styles.issueBackLink}>
                <TbArrowRight size={14} aria-hidden />بازگشت به فهرست مشکلات
            </Link>

            <header className={styles.issueHeader}>
                <div className={styles.issueHeaderMain}>
                    <div className={styles.issueBadges}>
                        <span className={`${styles.statusBadge} ${styles[`level${capitalize(issue.level)}`]}`}>
                            {ETR_LEVEL_LABELS[issue.level]}
                        </span>
                        <span className={`${styles.statusBadge} ${styles[`status${capitalize(issue.status)}`]}`}>
                            {ETR_STATUS_LABELS[issue.status]}
                        </span>
                    </div>
                    <h1 className={styles.issueHeading} dir="ltr">{issue.title}</h1>
                    <div className={styles.issueCulpritLine} title={issue.culprit || undefined}>
                        <TbFileCode size={14} aria-hidden />
                        <code dir="ltr">{issue.culprit || 'محل وقوع نامشخص'}</code>
                    </div>
                </div>
                <div className={styles.issueHeaderActions}>
                    {issue.status !== 'resolved' && (
                        <button type="button" className={styles.primaryBtn} onClick={() => changeStatus('resolved')}>
                            <TbCircleCheck size={15} />علامت‌زدن به‌عنوان حل‌شده
                        </button>
                    )}
                    {issue.status !== 'ignored' && (
                        <button type="button" className={styles.secondaryBtn} onClick={() => changeStatus('ignored')}>
                            <TbEyeOff size={15} />نادیده‌گرفتن
                        </button>
                    )}
                    {(issue.status === 'resolved' || issue.status === 'ignored') && (
                        <button type="button" className={styles.secondaryBtn} onClick={() => changeStatus('open')}>
                            <TbReload size={15} />بازگشایی
                        </button>
                    )}
                </div>
            </header>

            <section className={hrStyles.formGuideCard}>
                <h2>چطور این صفحه را بخوانید</h2>
                <p>
                    این یک باگ گروه‌بندی‌شده است نه یک لاگ تکی. اول Stack Trace را ببینید (کجا ترکید)، بعد Breadcrumbs
                    (چه کاری درست قبل از خطا انجام شد)، بعد کانتکست کاربر و درخواست. از جدول پایین می‌توانید نمونهٔ
                    دیگری از همین خطا را انتخاب کنید. بعد از فیکس «حل‌شده» بزنید؛ نویز بی‌اهمیت را «نادیده» کنید.
                </p>
            </section>

            <div className={styles.issueStats}>
                <div className={styles.issueStat}>
                    <span className={styles.issueStatLabel}>کل رویدادها</span>
                    <strong className={styles.issueStatValue}>{formatCount(issue.eventCount)}</strong>
                </div>
                <div className={styles.issueStat}>
                    <span className={styles.issueStatLabel}>کاربران متأثر</span>
                    <strong className={styles.issueStatValue}>{formatCount(issue.userCount)}</strong>
                </div>
                <div className={styles.issueStat}>
                    <span className={styles.issueStatLabel}>اولین مشاهده</span>
                    <strong className={styles.issueStatValue} title={fullDate(issue.firstSeenAt)}>{relativeTime(issue.firstSeenAt)}</strong>
                </div>
                <div className={styles.issueStat}>
                    <span className={styles.issueStatLabel}>آخرین مشاهده</span>
                    <strong className={styles.issueStatValue} title={fullDate(issue.lastSeenAt)}>{relativeTime(issue.lastSeenAt)}</strong>
                </div>
                <div className={styles.issueStat}>
                    <span className={styles.issueStatLabel}>نسخه اولین وقوع</span>
                    <strong className={styles.issueStatValue} dir="ltr" title={issue.release || undefined}>{issue.release || '—'}</strong>
                </div>
            </div>

            {detail.trend?.length > 0 && (
                <div className={styles.panel}>
                    <h3 className={styles.panelTitle}>روند ۱۴ روزه</h3>
                    <div className={styles.chartRow} dir="rtl">
                        {detail.trend.map((point) => {
                            const max = Math.max(1, ...detail.trend.map((p) => p.count));
                            return (
                                <div key={point.day} className={styles.chartCol} title={`${point.day}: ${point.count}`}>
                                    <div className={styles.chartBars}>
                                        {point.count > 0 && (
                                            <div
                                                className={styles.chartBar}
                                                style={{ height: `${Math.max(4, (point.count / max) * 110)}px`, background: 'var(--brand-color)' }}
                                            />
                                        )}
                                        {point.count === 0 && <div className={styles.chartEmptyBar} />}
                                    </div>
                                    <div className={styles.chartDay}>{point.day.slice(5)}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <ResolutionNote issue={issue} onSave={saveNote} />

            {diagnosis && (
                <div className={styles.diagnosisBox} role="note">
                    <strong>تشخیص خودکار این رویداد</strong>
                    <span dir="auto">{diagnosis}</span>
                    {showProvider && (
                        <button type="button" className={styles.linkBtn} onClick={() => setActiveTab('provider')}>
                            جزئیات درخواست و ورودی‌ها
                        </button>
                    )}
                </div>
            )}

            <SimpleLineTabs
                className={styles.issueTabs}
                tabs={tabs}
                activeTab={activeTab === 'provider' && !showProvider ? 'latest' : activeTab}
                onChange={(id) => setActiveTab(id as DetailTab)}
            />
            <p className={hrStyles.fieldHint} style={{ marginBottom: '0.85rem' }}>
                Stack Trace محل خطا در کد است. Breadcrumbs تایم‌لاین قبل از کرش است. کانتکست‌ها کاربر، درخواست HTTP و نسخه را نشان می‌دهند.
                {showProvider && ' «درخواست به سرویس بیرونی» بدنهٔ ارسال‌شده، پاسخ سرویس و وضعیت هر URL ورودی را نشان می‌دهد.'}
            </p>

            {activeTab === 'provider' && showProvider && selectedEvent && (
                <ProviderRequestView event={selectedEvent} />
            )}

            {activeTab === 'latest' && selectedEvent && (
                <StackTraceView event={selectedEvent} />
            )}

            {activeTab === 'breadcrumbs' && (
                <div className={styles.panel}>
                    <h3 className={styles.panelTitle}>رخدادهای قبل از خطا</h3>
                    <p className={hrStyles.fieldHint} style={{ marginBottom: '0.75rem' }}>
                        معمولاً «چرا»ی خطا اینجاست: مثلاً دو ثانیه قبل یک API خارجی timeout شده است.
                    </p>
                    {selectedEvent?.breadcrumbs?.length ? (
                        <div className={styles.timeline}>
                            {[...selectedEvent.breadcrumbs].reverse().map((crumb, index) => (
                                <div key={index} className={styles.timelineItem}>
                                    <div className={styles.timelineMeta}>
                                        <span className={styles.category}>{crumb.category}</span>
                                        <span className={styles.time}>{new Date(crumb.timestamp).toLocaleTimeString('fa-IR')}</span>
                                    </div>
                                    <div className={styles.timelineMessage} dir="auto">{crumb.message}</div>
                                    {crumb.data && Object.keys(crumb.data).length > 0 && (
                                        <pre className={styles.preBlock} style={{ marginTop: '0.4rem' }}>
                                            {JSON.stringify(crumb.data, null, 2)}
                                        </pre>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className={styles.hint}>برای این رویداد Breadcrumb ثبت نشده است.</p>
                    )}
                </div>
            )}

            {activeTab === 'context' && selectedEvent && (
                <div className={styles.detailGrid}>
                    <ContextCard icon={<TbUser size={14} />} title="کاربر">
                        <MetaRow label="شناسه" value={selectedEvent.user?.id} ltr />
                        <MetaRow label="ایمیل" value={selectedEvent.user?.email} ltr />
                        <MetaRow label="نام کاربری" value={selectedEvent.user?.username} ltr />
                    </ContextCard>

                    <ContextCard icon={<TbServer size={14} />} title="درخواست">
                        <MetaRow label="متد" value={selectedEvent.request?.method} ltr />
                        <MetaRow label="آدرس" value={selectedEvent.request?.url} ltr />
                        <MetaRow label="IP" value={selectedEvent.request?.ip} ltr />
                        {selectedEvent.request?.body && Object.keys(selectedEvent.request.body).length > 0 && (
                            <pre className={styles.preBlock} style={{ marginTop: '0.4rem' }}>
                                {JSON.stringify(selectedEvent.request.body, null, 2)}
                            </pre>
                        )}
                    </ContextCard>

                    <ContextCard icon={<TbTag size={14} />} title="محیط و نسخه">
                        <MetaRow label="محیط" value={selectedEvent.environment} ltr />
                        <MetaRow label="نسخه" value={selectedEvent.release} ltr />
                        <MetaRow label="سرور" value={selectedEvent.serverName} ltr />
                        <MetaRow label="زمان رویداد" value={ConvertDateToCalendarString(selectedEvent.timestamp)} />
                    </ContextCard>

                    <ContextCard icon={<TbTag size={14} />} title="Tagها و Context سفارشی">
                        {Object.entries(selectedEvent.tags || {}).map(([key, value]) => (
                            <MetaRow key={key} label={key} value={String(value)} ltr />
                        ))}
                        {selectedEvent.extra && Object.keys(selectedEvent.extra).length > 0 && (
                            <pre className={styles.preBlock} style={{ marginTop: '0.4rem' }}>
                                {JSON.stringify(selectedEvent.extra, null, 2)}
                            </pre>
                        )}
                    </ContextCard>
                </div>
            )}

            <div className={styles.panel}>
                <div className={styles.sectionHead}>
                    <h3 className={styles.panelTitle}><TbBug size={16} />رویدادهای اخیر</h3>
                </div>
                <p className={hrStyles.fieldHint} style={{ marginBottom: '0.75rem' }}>
                    هر ردیف یک وقوع جداست. «مشاهده» همان رویداد را در تب‌های بالا باز می‌کند — مثلاً نسخه یا کاربر دیگر.
                </p>
                {eventsLoading ? (
                    <LoadingState />
                ) : events.length === 0 ? (
                    <p className={styles.hint}>رویدادی یافت نشد.</p>
                ) : (
                    <div className={styles.tableWrap}>
                        <table className={styles.dataTable}>
                            <thead>
                                <tr>
                                    <th>شناسه رویداد</th>
                                    <th>سطح</th>
                                    <th>کاربر</th>
                                    <th>محیط</th>
                                    <th>نسخه</th>
                                    <th>زمان</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {events.map((event) => (
                                    <tr key={event._id} style={selectedEvent?._id === event._id ? { background: 'color-mix(in srgb, var(--brand-color) 6%, transparent)' } : undefined}>
                                        <td data-label="شناسه رویداد" className={styles.cellMuted} dir="ltr">{event.eventId.slice(0, 13)}…</td>
                                        <td data-label="سطح">
                                            <span className={`${styles.statusBadge} ${styles[`level${event.level.charAt(0).toUpperCase() + event.level.slice(1)}`]}`}>
                                                {ETR_LEVEL_LABELS[event.level]}
                                            </span>
                                        </td>
                                        <td data-label="کاربر" className={styles.cellMuted} dir="ltr">{event.user?.email || event.user?.id || '—'}</td>
                                        <td data-label="محیط" className={styles.cellMuted} dir="ltr">{event.environment || '—'}</td>
                                        <td data-label="نسخه" className={styles.cellMuted} dir="ltr">{event.release || '—'}</td>
                                        <td data-label="زمان" className={styles.cellMuted} title={fullDate(event.timestamp)}>{relativeTime(event.timestamp)}</td>
                                        <td data-label="اقدامات">
                                            <button
                                                type="button"
                                                className={styles.smallBtn}
                                                onClick={() => {
                                                    setSelectedEvent(event);
                                                    setActiveTab('latest');
                                                }}
                                            >
                                                مشاهده
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {!eventsLoading && events.length > 0 && (
                    <div className={styles.paginationSpace}>
                        <Pagination
                            itemPerPage={pagination.itemPerPage}
                            currentPage={pagination.currentPage}
                            totalItems={pagination.totalItems}
                            setRowsPerPage={(num) => loadEvents(1, num)}
                            paginate={(page) => loadEvents(page, pagination.itemPerPage)}
                            rtl
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

/** علت ریشه‌ای و راه‌حل؛ با «حل‌شده» یا «بازگشایی» پاک نمی‌شود تا اگر برگشت، تاریخچهٔ رفع دیده شود */
function ResolutionNote({ issue, onSave }: { issue: EtrIssue; onSave: (note: string) => Promise<boolean> }) {
    const saved = issue.resolutionNote || '';
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(saved);
    const [saving, setSaving] = useState(false);

    const startEdit = () => {
        setDraft(saved);
        setEditing(true);
    };

    const submit = async () => {
        setSaving(true);
        const ok = await onSave(draft);
        setSaving(false);
        if (ok) setEditing(false);
    };

    return (
        <div className={styles.panel}>
            <div className={styles.sectionHead}>
                <h3 className={styles.panelTitle}><TbNotes size={16} />یادداشت رفع</h3>
                {!editing && (
                    <button type="button" className={`${styles.linkBtn} ${styles.noteEditBtn}`} onClick={startEdit}>
                        {saved ? 'ویرایش' : 'نوشتن یادداشت'}
                    </button>
                )}
            </div>
            {editing ? (
                <div className={styles.formField}>
                    <textarea
                        className={styles.noteTextarea}
                        dir="auto"
                        rows={8}
                        value={draft}
                        maxLength={20000}
                        onChange={(e) => setDraft(e.target.value)}
                        placeholder="مشکل چه بود، چرا رخ داد و چطور حل شد…"
                        autoFocus
                    />
                    <p className={hrStyles.fieldHint}>
                        علت ریشه‌ای، فایل/تابعی که تغییر کرد و اینکه بعد از Deploy چه چیزی باید دوباره کار کند. خالی ذخیره کنید تا پاک شود.
                    </p>
                    <div className={styles.formActions}>
                        <button type="button" className={styles.secondaryBtn} onClick={() => setEditing(false)} disabled={saving}>
                            انصراف
                        </button>
                        <button type="button" className={styles.primaryBtn} onClick={submit} disabled={saving}>
                            {saving ? 'در حال ذخیره…' : 'ذخیره یادداشت'}
                        </button>
                    </div>
                </div>
            ) : saved ? (
                <>
                    <div className={styles.noteText} dir="auto">{saved}</div>
                    {issue.resolutionNoteUpdatedAt && (
                        <p className={styles.hint} style={{ marginTop: '0.6rem' }} title={fullDate(issue.resolutionNoteUpdatedAt)}>
                            {issue.resolutionNoteBy ? <span dir="ltr">{issue.resolutionNoteBy}</span> : 'ادمین'}
                            {' · '}
                            {relativeTime(issue.resolutionNoteUpdatedAt)}
                        </p>
                    )}
                </>
            ) : (
                <p className={styles.hint}>
                    هنوز یادداشتی ثبت نشده. بعد از رفع، بنویسید مشکل چه بود و چطور حل شد تا اگر «برگشته» شد، نفر بعدی از همین‌جا شروع کند.
                </p>
            )}
        </div>
    );
}

function StackTraceView({ event }: { event: EtrEvent }) {
    const frames = event.exception?.stacktrace || [];
    return (
        <div className={styles.panel}>
            <div className={styles.sectionHead}>
                <h3 className={styles.panelTitle}><TbCode size={16} />Stack Trace</h3>
            </div>
            <p className={styles.hint} dir="ltr" style={{ marginBottom: '0.75rem' }}>
                {event.exception?.type}: {event.message || event.exception?.value}
            </p>
            {frames.length === 0 ? (
                <p className={styles.hint}>Stack Trace برای این رویداد ثبت نشده است.</p>
            ) : (
                frames.map((frame, index) => (
                    <div key={index} className={`${styles.stackFrame} ${index === 0 ? styles.first : ''}`}>
                        <div className={styles.stackFrameHead}>
                            <span className={styles.fn}>{frame.function || 'anonymous'}</span>
                            <span className={styles.loc}>
                                {frame.filename || 'unknown'}
                                {frame.lineno ? `:${frame.lineno}${frame.colno ? `:${frame.colno}` : ''}` : ''}
                            </span>
                        </div>
                        {(frame.pre_context?.length || frame.context_line || frame.post_context?.length) && (
                            <div className={styles.stackContext}>
                                {(frame.pre_context || []).map((line, i) => (
                                    <div key={`pre-${i}`} className={styles.line}>
                                        <span className={styles.lineno}>{(frame.lineno || 0) - ((frame.pre_context || []).length - i)}</span>
                                        <span className={styles.code}>{line}</span>
                                    </div>
                                ))}
                                {frame.context_line && (
                                    <div className={`${styles.line} ${styles.highlight}`}>
                                        <span className={styles.lineno}>{frame.lineno || 0}</span>
                                        <span className={styles.code}>{frame.context_line}</span>
                                    </div>
                                )}
                                {(frame.post_context || []).map((line, i) => (
                                    <div key={`post-${i}`} className={styles.line}>
                                        <span className={styles.lineno}>{(frame.lineno || 0) + i + 1}</span>
                                        <span className={styles.code}>{line}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))
            )}
        </div>
    );
}

function formatBytes(bytes?: number): string {
    if (bytes == null || !Number.isFinite(bytes)) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** فیلدهای استاندارد قرارداد «درخواست به سرویس بیرونی» — بقیهٔ extra کانتکست خود اپ است */
const STANDARD_REQUEST_KEYS = new Set(['diagnosis', 'provider', 'request', 'inputs']);

/** کانتکست اختصاصی اپ (هر شکلی) به ردیف‌های کلید/مقدار؛ اشیای تودرتو یک سطح باز می‌شوند */
function flattenAppContext(extra: Record<string, any>): Array<[string, string]> {
    const rows: Array<[string, string]> = [];
    const push = (label: string, value: unknown) => {
        if (value === undefined || value === null || value === '') return;
        rows.push([label, typeof value === 'object' ? JSON.stringify(value) : String(value)]);
    };
    for (const [key, value] of Object.entries(extra)) {
        if (STANDARD_REQUEST_KEYS.has(key)) continue;
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            for (const [sub, subValue] of Object.entries(value as Record<string, unknown>)) push(`${key}.${sub}`, subValue);
        } else {
            push(key, value);
        }
    }
    return rows.slice(0, 40);
}

function ProviderRequestView({ event }: { event: EtrEvent }) {
    const extra = event.extra || {};
    const provider = (extra.provider || {}) as Record<string, any>;
    const request = (extra.request || {}) as Record<string, any>;
    const inputs: ProviderInputProbe[] = Array.isArray(extra.inputs) ? extra.inputs : [];
    const appContext = flattenAppContext(extra);

    return (
        <>
            <div className={styles.panel}>
                <h3 className={styles.panelTitle}>فایل‌های ورودی درخواست</h3>
                <p className={hrStyles.fieldHint} style={{ marginBottom: '0.75rem' }}>
                    هر URL داخل بدنهٔ درخواست، همان لحظهٔ خطا از سرور خودمان چک شده است. ردیف قرمز یعنی سرویس بیرونی هم
                    احتمالاً نتوانسته فایل را بگیرد (۴۰۴ = فایل در آن آدرس نیست؛ ۴۰۳ = دسترسی عمومی ندارد).
                </p>
                {inputs.length === 0 ? (
                    <p className={styles.hint}>این درخواست URL ورودی نداشت (یا رویداد پیش از افزوده‌شدن این چک ثبت شده).</p>
                ) : (
                    <div className={styles.tableWrap}>
                        <table className={styles.dataTable}>
                            <thead>
                                <tr>
                                    <th>فیلد</th>
                                    <th>آدرس</th>
                                    <th>نتیجه</th>
                                    <th>نوع</th>
                                    <th>حجم</th>
                                </tr>
                            </thead>
                            <tbody>
                                {inputs.map((input) => (
                                    <tr key={`${input.path}:${input.url}`}>
                                        <td data-label="فیلد" dir="ltr"><code>{input.path}</code></td>
                                        <td data-label="آدرس" className={styles.inputUrlCell} dir="ltr" title={input.url}>
                                            <a href={input.url} target="_blank" rel="noreferrer">{input.url}</a>
                                        </td>
                                        <td data-label="نتیجه">
                                            <span className={input.ok ? styles.kpiOk : styles.kpiBad} dir="ltr">
                                                {input.status ? `HTTP ${input.status}` : input.error || '—'}
                                                {input.ok && input.error ? ` (${input.error})` : ''}
                                            </span>
                                        </td>
                                        <td data-label="نوع" className={styles.cellMuted} dir="ltr">{input.contentType || '—'}</td>
                                        <td data-label="حجم" className={styles.cellMuted} dir="ltr">{formatBytes(input.contentLength)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className={styles.detailGrid}>
                <ContextCard icon={<TbServer size={14} />} title="پاسخ سرویس بیرونی">
                    <MetaRow label="سرویس" value={provider.name} ltr />
                    <MetaRow label="Endpoint" value={provider.endpoint} ltr />
                    <MetaRow label="متد" value={provider.method} ltr />
                    <MetaRow label="HTTP" value={provider.status} ltr />
                    <MetaRow label="زمان پاسخ" value={provider.responseTimeMs != null ? `${provider.responseTimeMs} ms` : undefined} ltr />
                    <MetaRow label="لاگ درخواست" value={extra.requestLogId || provider.providerLogId} ltr />
                    {provider.message && <pre className={styles.preBlock} style={{ marginTop: '0.4rem' }}>{String(provider.message)}</pre>}
                    {provider.body !== undefined && (
                        <pre className={styles.preBlock} style={{ marginTop: '0.4rem' }}>
                            {typeof provider.body === 'string' ? provider.body : JSON.stringify(provider.body, null, 2)}
                        </pre>
                    )}
                </ContextCard>

                <ContextCard icon={<TbTag size={14} />} title="کانتکست اپ">
                    {appContext.length === 0 && <p className={styles.hint}>اپ کانتکست اختصاصی نفرستاده است.</p>}
                    {appContext.map(([label, value]) => (
                        <MetaRow key={label} label={label} value={value} ltr />
                    ))}
                </ContextCard>
            </div>

            {request.body !== undefined && (
                <div className={styles.panel}>
                    <h3 className={styles.panelTitle}>بدنهٔ ارسال‌شده</h3>
                    <p className={hrStyles.fieldHint} style={{ marginBottom: '0.6rem' }}>
                        همان payload نهایی (base64 حذف شده). عملیات: <span dir="ltr">{request.operation || request.model || '—'}</span>
                    </p>
                    <pre className={styles.preBlock}>
                        {typeof request.body === 'string' ? request.body : JSON.stringify(request.body, null, 2)}
                    </pre>
                </div>
            )}
        </>
    );
}

function ContextCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
    return (
        <div className={styles.detailCard}>
            <h4 className={styles.detailCardTitle}>{icon}{title}</h4>
            {children}
        </div>
    );
}

function MetaRow({ label, value, ltr }: { label: string; value?: string | number; ltr?: boolean }) {
    if (value === undefined || value === null || value === '') return null;
    return (
        <div className={styles.detailMetaRow}>
            <span className={styles.key}>{label}</span>
            <span className={`${styles.value} ${ltr ? styles.ltr : ''}`}>{value}</span>
        </div>
    );
}
