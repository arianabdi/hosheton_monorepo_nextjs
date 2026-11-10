'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { LuCalendarClock, LuChevronDown } from 'react-icons/lu';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { useCachedState, useDatabase } from '../lib/DatabaseProvider';
import {
    fetchNotify,
    fetchSchedule,
    RECOMMENDED_SCHEDULE,
    saveNotify,
    saveSchedule,
    type BackupSetting,
    type DbTarget,
    type NotifyChannelId,
    type NotifySetting,
    type ScheduleInfo,
} from '../lib/database-api';
import { explainFailure, formatCount, formatDate, formatSize, formatUpcoming, fullDate, relativeTime } from '../lib/format';
import CollectionPicker from './CollectionPicker';
import DeliverySection from './DeliverySection';
import styles from '../Database.module.scss';
import s from './Schedule.module.scss';

type Repeat = BackupSetting['schedule'];

const REPEATS: Array<{ value: Exclude<Repeat, 'custom'>; label: string }> = [
    { value: 'daily', label: 'هر روز' },
    { value: 'weekly', label: 'هر هفته' },
    { value: 'every6hours', label: 'هر ۶ ساعت' },
    { value: 'hourly', label: 'هر ساعت' },
];

// JS getDay order — the API's weekday is the cron day-of-week (0 = Sunday)
const WEEKDAYS = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'];
const WEEK_ORDER = [6, 0, 1, 2, 3, 4, 5];
const RETENTION = [7, 14, 30, 90];

const fa = (n: number) => n.toLocaleString('fa-IR');
const pad = (n: number) => String(n).padStart(2, '0');
const clock = (minutes: number) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`.replace(/\d/g, (d) => fa(Number(d)));

/** 30-minute steps; an exact saved time that isn't on the grid stays selectable */
function timeOptions(current: number): number[] {
    const list = Array.from({ length: 48 }, (_, i) => i * 30);
    if (!list.includes(current)) list.push(current);
    return list.sort((a, b) => a - b);
}

/** «آخرین ۱۴ نسخه — حدود دو هفته» */
function retentionLabel(n: number, repeat: Repeat): string {
    const span =
        repeat === 'daily'
            ? n === 7
                ? 'یک هفته'
                : n === 14
                  ? 'دو هفته'
                  : n === 30
                    ? 'یک ماه'
                    : n === 90
                      ? 'سه ماه'
                      : `${fa(n)} روز`
            : repeat === 'weekly'
              ? `${fa(n)} هفته`
              : repeat === 'every6hours'
                ? `${fa(Math.round((n / 4) * 10) / 10)} روز`
                : repeat === 'hourly'
                  ? `${fa(n)} ساعت`
                  : '';
    return span ? `آخرین ${fa(n)} نسخه — حدود ${span}` : `آخرین ${fa(n)} نسخه`;
}

const CRON_FIELD = /^[\d*/,-]+$/;
const looksLikeCron = (v: string) => {
    const parts = v.trim().split(/\s+/);
    return parts.length === 5 && parts.every((p) => CRON_FIELD.test(p));
};

/** only the fields the owner can change here (lastRunAt etc. stay on the server) */
const editable = (x: BackupSetting): BackupSetting => ({
    enabled: x.enabled,
    schedule: x.schedule,
    cron: x.cron || '',
    hour: x.hour ?? 3,
    minute: x.minute ?? 0,
    weekday: x.weekday ?? 0,
    collections: x.collections || [],
    retentionCount: x.retentionCount || 14,
});

const chatTextOf = (n: NotifySetting): Record<NotifyChannelId, string> => ({
    telegram: n.channels.telegram.chatIds.join(' '),
    bale: n.channels.bale.chatIds.join(' '),
});

const notifyPayload = (n: NotifySetting, chats: Record<NotifyChannelId, string>): NotifySetting => ({
    ...n,
    channels: {
        telegram: { ...n.channels.telegram, chatIds: chats.telegram.split(/[\s,،]+/).filter(Boolean) },
        bale: { ...n.channels.bale, chatIds: chats.bale.split(/[\s,،]+/).filter(Boolean) },
    },
});

/**
 * «بک‌آپ خودکار» card at the top of the backups tab: a one-line status that is always visible,
 * the full schedule + Telegram/Bale settings when opened (?auto=1 or #delivery open it directly).
 */
export default function AutoBackupSettings() {
    const { baseUrl, token, overview, reloadSummary } = useDatabase();
    const params = useSearchParams();
    const [open, setOpen] = useState(() => params.get('auto') === '1' || (typeof window !== 'undefined' && window.location.hash === '#delivery'));
    const [list, setList] = useCachedState<ScheduleInfo[] | null>('schedule:list', null);
    const [notify, setNotify] = useCachedState<NotifySetting | null>('schedule:notify', null);
    const [drafts, setDrafts] = useState<Partial<Record<DbTarget, BackupSetting>>>({});
    const [notifyDraft, setNotifyDraft] = useState<NotifySetting | null>(notify);
    const [chatText, setChatText] = useState<Record<NotifyChannelId, string>>(notify ? chatTextOf(notify) : { telegram: '', bale: '' });
    const [db, setDb] = useState<DbTarget>('core');
    const [advanced, setAdvanced] = useState(false);
    const [saving, setSaving] = useState(false);

    const available = useMemo(() => {
        const ok = new Set((overview?.databases || []).filter((d) => d.available).map((d) => d.id));
        return (list || []).filter((x) => !overview || ok.has(x.db));
    }, [list, overview]);

    useEffect(() => {
        if (!token || !baseUrl) return;
        let alive = true;
        Promise.all([fetchSchedule(baseUrl, token), fetchNotify(baseUrl, token)])
            .then(([schedules, n]) => {
                if (!alive) return;
                setList(schedules);
                setNotify(n);
                setNotifyDraft(n);
                setChatText(chatTextOf(n));
            })
            .catch(ErrorToaster);
        return () => {
            alive = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [baseUrl, token]);

    // links from the health line (`?auto=1`, `#delivery`) land after the data arrives
    useEffect(() => {
        if (!notifyDraft || typeof window === 'undefined') return;
        if (window.location.hash === '#delivery') {
            setOpen(true);
            requestAnimationFrame(() => document.getElementById('delivery')?.scrollIntoView({ block: 'start' }));
        } else if (params.get('auto') === '1') {
            requestAnimationFrame(() => document.getElementById('auto')?.scrollIntoView({ block: 'start' }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [!!notifyDraft]);

    useEffect(() => {
        if (available.length && !available.some((x) => x.db === db)) setDb(available[0].db);
    }, [available, db]);

    // the card appears once the schedule is known; the backups table below never waits for it
    if (!list || !notifyDraft || !notify) return null;
    if (!available.length) return null;

    const info = available.find((x) => x.db === db) || available[0];
    const saved = editable(info.setting);
    const draft = drafts[info.db] || saved;
    const set = (patch: Partial<BackupSetting>) => setDrafts({ ...drafts, [info.db]: { ...draft, ...patch } });

    const scheduleDirtyDbs = available.filter((x) => drafts[x.db] && JSON.stringify(drafts[x.db]) !== JSON.stringify(editable(x.setting))).map((x) => x.db);
    const notifyNext = notifyPayload(notifyDraft, chatText);
    const notifyDirty = JSON.stringify(notifyNext) !== JSON.stringify(notify);
    const dirty = scheduleDirtyDbs.length > 0 || notifyDirty;

    const applySaved = (row: ScheduleInfo) => {
        setList(list.map((x) => (x.db === row.db ? row : x)));
        setDrafts((d) => {
            const next = { ...d };
            delete next[row.db];
            return next;
        });
    };

    const applyNotify = (n: NotifySetting) => {
        setNotify(n);
        setNotifyDraft(n);
        setChatText(chatTextOf(n));
    };

    /** the on/off switch and «روشن کردن با تنظیمات پیشنهادی» save at once — no save bar */
    const saveNow = async (patch: Partial<BackupSetting>, message: string) => {
        try {
            setSaving(true);
            const row = await saveSchedule(baseUrl, token, info.db, patch);
            applySaved(row);
            void reloadSummary();
            SuccessToaster({ message });
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setSaving(false);
        }
    };

    const validate = (): string | null => {
        for (const id of scheduleDirtyDbs) {
            const d = drafts[id]!;
            if (d.schedule === 'custom' && !looksLikeCron(d.cron || '')) return 'زمان‌بندی دلخواه درست نیست؛ پنج بخش با فاصله، مثل \u20660 3 * * *\u2069';
        }
        for (const id of ['telegram', 'bale'] as NotifyChannelId[]) {
            const c = notifyNext.channels[id];
            if (c.proxyUrl && c.proxyUrl !== '••••' && !/^https?:\/\//.test(c.proxyUrl)) return 'پروکسی باید با http:// یا https:// شروع شود.';
            if (c.apiBase && !/^https?:\/\//.test(c.apiBase)) return 'آدرس واسط باید با http:// یا https:// شروع شود.';
        }
        return null;
    };

    const saveNotifyOnly = async (): Promise<boolean> => {
        const problem = validate();
        if (problem) {
            ErrorToaster({ message: problem });
            return false;
        }
        try {
            if (notifyDirty) applyNotify(await saveNotify(baseUrl, token, notifyNext));
            void reloadSummary();
            return true;
        } catch (e) {
            ErrorToaster(e);
            return false;
        }
    };

    const saveAll = async () => {
        const problem = validate();
        if (problem) return ErrorToaster({ message: problem });
        try {
            setSaving(true);
            for (const id of scheduleDirtyDbs) applySaved(await saveSchedule(baseUrl, token, id, drafts[id]!));
            if (notifyDirty) applyNotify(await saveNotify(baseUrl, token, notifyNext));
            void reloadSummary();
            SuccessToaster({ message: 'ذخیره شد' });
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setSaving(false);
        }
    };

    const discard = () => {
        setDrafts({});
        setNotifyDraft(notify);
        setChatText(chatTextOf(notify));
    };

    const minutes = (draft.hour ?? 3) * 60 + (draft.minute ?? 0);
    const changedTime = JSON.stringify(draft) !== JSON.stringify(saved);
    const last = info.lastAutoBackup;
    const lastSent = last?.notified?.results || [];
    const sentOk = lastSent.filter((r) => r.ok).length;
    const recommendedDiffers = saved.schedule !== 'daily' || saved.hour !== 3 || saved.retentionCount !== 14 || saved.collections.length > 0;

    const savedMinutes = (saved.hour ?? 3) * 60 + (saved.minute ?? 0);
    const whenText =
        saved.schedule === 'custom'
            ? 'زمان‌بندی دلخواه'
            : saved.schedule === 'daily'
              ? `هر روز ساعت ${clock(savedMinutes)}`
              : saved.schedule === 'weekly'
                ? `هر ${WEEKDAYS[saved.weekday ?? 0]} ساعت ${clock(savedMinutes)}`
                : REPEATS.find((r) => r.value === saved.schedule)?.label || '';

    return (
        <section className={styles.autoCard} id="auto" aria-label="بک‌آپ خودکار">
            <div className={styles.autoHead}>
                <span className={styles.cardIcon} aria-hidden>
                    <LuCalendarClock />
                </span>
                <div className={styles.autoHeadText}>
                    <h3 className={styles.cardTitle}>بک‌آپ خودکار</h3>
                    <p className={styles.autoSummary}>
                        <span className={`${styles.dot} ${saved.enabled ? styles.dotOk : styles.dotWarn}`} />
                        {saved.enabled ? (
                            <>
                                روشن · {whenText} · نگه‌داری {fa(saved.retentionCount)} نسخه
                                {info.nextRunAt && <> · بعدی: {formatUpcoming(info.nextRunAt)}</>}
                            </>
                        ) : (
                            'خاموش — اگر سرور خراب شود فقط بک‌آپ‌هایی را دارید که دستی گرفته‌اید.'
                        )}
                    </p>
                </div>
                <div className={styles.autoHeadActions}>
                    {!saved.enabled && (
                        <button type="button" className={styles.primaryBtn} disabled={saving} onClick={() => saveNow(RECOMMENDED_SCHEDULE, 'بک‌آپ خودکار روشن شد')}>
                            {saving ? 'در حال روشن کردن…' : 'روشن کردن — هر شب ساعت ۳'}
                        </button>
                    )}
                    <button type="button" className={styles.secondaryBtn} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
                        تنظیمات و ارسال به تلگرام/بله <LuChevronDown className={open ? styles.chevronUp : ''} aria-hidden />
                    </button>
                </div>
            </div>

            {open && (
            <div className={styles.autoBody}>
            <section className={s.block}>
                <div className={s.blockHead}>
                    <h3 className={styles.sectionTitle}>زمان‌بندی</h3>
                    {available.length > 1 && (
                        <select className={s.inlineSelect} value={info.db} onChange={(e) => setDb(e.target.value as DbTarget)} aria-label="دیتابیس">
                            {available.map((x) => (
                                <option key={x.db} value={x.db}>
                                    {x.label}
                                    {scheduleDirtyDbs.includes(x.db) ? ' •' : ''}
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                <div className={s.rows}>
                    <div className={s.row}>
                        <span className={s.rowLabel}>وضعیت</span>
                        <span className={s.rowValue}>
                            <span className={`${styles.dot} ${saved.enabled ? styles.dotOk : styles.dotWarn}`} />
                            {saved.enabled ? 'روشن' : 'خاموش'}
                            {saved.enabled && info.nextRunAt && !changedTime && <span className={s.muted}>· بعدی: {formatUpcoming(info.nextRunAt)}</span>}
                        </span>
                        <span className={s.rowAction}>
                            {saved.enabled ? (
                                <button type="button" className={styles.dangerLink} disabled={saving} onClick={() => saveNow({ enabled: false }, 'بک‌آپ خودکار خاموش شد')}>
                                    خاموش کردن
                                </button>
                            ) : (
                                recommendedDiffers && (
                                    <button type="button" className={styles.linkBtn} disabled={saving} onClick={() => saveNow({ enabled: true }, 'بک‌آپ خودکار روشن شد')}>
                                        روشن با تنظیمات قبلی
                                    </button>
                                )
                            )}
                        </span>
                    </div>

                    {saved.enabled && (
                        <>
                            <div className={s.row}>
                                <span className={s.rowLabel}>زمان</span>
                                <span className={s.rowValue}>
                                    {draft.schedule === 'custom' ? (
                                        <>
                                            <span>زمان‌بندی دلخواه</span>
                                            <code className={styles.mono} dir="ltr">
                                                {draft.cron || '—'}
                                            </code>
                                        </>
                                    ) : (
                                        <>
                                            <select
                                                className={s.inlineSelect}
                                                value={draft.schedule}
                                                aria-label="تکرار"
                                                onChange={(e) => set({ schedule: e.target.value as Repeat })}
                                            >
                                                {REPEATS.map((r) => (
                                                    <option key={r.value} value={r.value}>
                                                        {r.label}
                                                    </option>
                                                ))}
                                            </select>
                                            {draft.schedule === 'weekly' && (
                                                <select
                                                    className={s.inlineSelect}
                                                    value={draft.weekday ?? 0}
                                                    aria-label="روز هفته"
                                                    onChange={(e) => set({ weekday: Number(e.target.value) })}
                                                >
                                                    {WEEK_ORDER.map((i) => (
                                                        <option key={i} value={i}>
                                                            {WEEKDAYS[i]}
                                                        </option>
                                                    ))}
                                                </select>
                                            )}
                                            {(draft.schedule === 'daily' || draft.schedule === 'weekly') && (
                                                <>
                                                    <span>ساعت</span>
                                                    <select
                                                        className={s.inlineSelect}
                                                        value={minutes}
                                                        aria-label="ساعت"
                                                        onChange={(e) => {
                                                            const v = Number(e.target.value);
                                                            set({ hour: Math.floor(v / 60), minute: v % 60 });
                                                        }}
                                                    >
                                                        {timeOptions(minutes).map((m) => (
                                                            <option key={m} value={m}>
                                                                {clock(m)}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </>
                                            )}
                                            {(draft.schedule === 'hourly' || draft.schedule === 'every6hours') && (
                                                <span className={s.muted}>
                                                    {draft.schedule === 'every6hours' ? 'ساعت‌های ۰، ۶، ۱۲ و ۱۸' : 'سر هر ساعت'}
                                                    {draft.minute ? `، دقیقهٔ ${fa(draft.minute)}` : ''}
                                                </span>
                                            )}
                                            <span className={s.muted}>به وقت تهران</span>
                                        </>
                                    )}
                                </span>
                                <span className={s.rowAction} />
                            </div>

                            <div className={s.row}>
                                <span className={s.rowLabel}>نگه‌داری</span>
                                <span className={s.rowValue}>
                                    <select
                                        className={s.inlineSelect}
                                        value={draft.retentionCount}
                                        aria-label="تعداد نگه‌داری"
                                        onChange={(e) => set({ retentionCount: Number(e.target.value) })}
                                    >
                                        {Array.from(new Set([...RETENTION, draft.retentionCount]))
                                            .sort((a, b) => a - b)
                                            .map((n) => (
                                                <option key={n} value={n}>
                                                    {retentionLabel(n, draft.schedule)}
                                                </option>
                                            ))}
                                    </select>
                                    <span className={s.muted}>قدیمی‌ترها خودکار پاک می‌شوند؛ بک‌آپ‌های دستی، آپلودی و ایمنی نه.</span>
                                </span>
                                <span className={s.rowAction} />
                            </div>

                            <div className={s.row}>
                                <span className={s.rowLabel}>محدوده</span>
                                <span className={s.rowValue}>
                                    {draft.collections.length ? (
                                        <span className={styles.warnText}>فقط {fa(draft.collections.length)} مجموعه — بقیهٔ داده‌ها بک‌آپ نمی‌شوند</span>
                                    ) : (
                                        'کل دیتابیس'
                                    )}
                                </span>
                                <span className={s.rowAction}>
                                    <button type="button" className={styles.linkBtn} onClick={() => setAdvanced(true)}>
                                        تغییر
                                    </button>
                                </span>
                            </div>
                        </>
                    )}

                    <div className={s.row}>
                        <span className={s.rowLabel}>آخرین بک‌آپ خودکار</span>
                        <span className={s.rowValue}>
                            {info.lastAutoFailure ? (
                                <span className={styles.dangerText} title={info.lastAutoFailure.reason}>
                                    ناموفق، {relativeTime(info.lastAutoFailure.at)} — {explainFailure(info.lastAutoFailure.reason)}
                                </span>
                            ) : last ? (
                                <>
                                    <span title={fullDate(last.at)}>{formatDate(last.at)}</span>
                                    <span className={s.muted}>
                                        · {formatCount(last.documents)} سند · {formatSize(last.size)}
                                    </span>
                                    {lastSent.length > 0 &&
                                        (sentOk === lastSent.length ? (
                                            <span className={styles.okText}>· به {lastSent.map((r) => (r.channel === 'bale' ? 'بله' : 'تلگرام')).filter((v, i, a) => a.indexOf(v) === i).join(' و ')} رفت</span>
                                        ) : (
                                            <span className={styles.dangerText} title={lastSent.find((r) => !r.ok)?.error}>
                                                · ارسال به پیام‌رسان نشد
                                            </span>
                                        ))}
                                </>
                            ) : (
                                <span className={s.muted}>{saved.enabled ? 'هنوز اجرا نشده؛ اولین بار در زمان بالا گرفته می‌شود.' : 'هنوز نیست.'}</span>
                            )}
                        </span>
                        <span className={s.rowAction}>
                            {info.lastAutoFailure && (
                                <Link className={styles.linkBtn} href="/settings/database/jobs?status=failed">
                                    لاگ‌ها
                                </Link>
                            )}
                        </span>
                    </div>
                </div>

                {saved.enabled && (
                    <>
                        <button
                            type="button"
                            className={`${styles.disclosureBtn} ${advanced ? styles.disclosureOpen : ''} ${s.gapTop}`}
                            onClick={() => setAdvanced(!advanced)}
                            aria-expanded={advanced}
                        >
                            تنظیمات پیشرفته <LuChevronDown aria-hidden />
                        </button>
                        {advanced && (
                            <div className={`${styles.disclosureBody} ${s.advanced}`}>
                                <div>
                                    <span className={styles.stepLabel}>چه چیزی بک‌آپ شود</span>
                                    <p className={styles.hint}>
                                        برای بازگردانی کامل «کل دیتابیس» را نگه دارید. فقط اگر مجموعه‌های خیلی حجیم و کم‌اهمیت (مثل لاگ) دارید، مجموعه‌های مهم
                                        را انتخاب کنید.
                                    </p>
                                    <CollectionPicker
                                        options={info.collections}
                                        value={draft.collections}
                                        onChange={(collections) => set({ collections })}
                                        emptyText="هیچ‌کدام انتخاب نشده = کل دیتابیس"
                                    />
                                </div>

                                <div>
                                    <label className={styles.checkRow}>
                                        <input
                                            type="checkbox"
                                            checked={draft.schedule === 'custom'}
                                            onChange={(e) =>
                                                set(
                                                    e.target.checked
                                                        ? { schedule: 'custom', cron: draft.cron || info.cron || '0 3 * * *' }
                                                        : { schedule: 'daily' },
                                                )
                                            }
                                        />
                                        <span>زمان‌بندی دلخواه (cron)</span>
                                    </label>
                                    {draft.schedule === 'custom' && (
                                        <div className={s.gapTop}>
                                            <input
                                                className={s.cronInput}
                                                value={draft.cron || ''}
                                                placeholder="0 3 * * *"
                                                onChange={(e) => set({ cron: e.target.value })}
                                                aria-label="عبارت cron"
                                            />
                                            <p className={styles.hint}>
                                                پنج بخش: دقیقه، ساعت، روز ماه، ماه، روز هفته — به وقت تهران. مثال: <code dir="ltr">30 2 * * *</code> یعنی هر شب ۲:۳۰.
                                                {draft.cron && !looksLikeCron(draft.cron) && <span className={styles.dangerText}> این عبارت درست نیست.</span>}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {(draft.schedule === 'hourly' || draft.schedule === 'every6hours') && (
                                    <label className={styles.field}>
                                        <span>دقیقهٔ اجرا</span>
                                        <select value={draft.minute ?? 0} onChange={(e) => set({ minute: Number(e.target.value) })}>
                                            {Array.from(new Set([0, 15, 30, 45, draft.minute ?? 0]))
                                                .sort((a, b) => a - b)
                                                .map((m) => (
                                                    <option key={m} value={m}>
                                                        دقیقهٔ {fa(m)}
                                                    </option>
                                                ))}
                                        </select>
                                    </label>
                                )}
                            </div>
                        )}
                    </>
                )}
            </section>

            <DeliverySection
                value={notifyDraft}
                saved={notify}
                chatText={chatText}
                onChange={setNotifyDraft}
                onChatText={setChatText}
                onSaveNow={saveNotifyOnly}
            />
            </div>
            )}

            {dirty && (
                <div className={styles.saveBar}>
                    <span>تغییرات ذخیره نشده</span>
                    <button type="button" className={styles.secondaryBtn} onClick={discard} disabled={saving}>
                        انصراف
                    </button>
                    <button type="button" className={styles.primaryBtn} onClick={saveAll} disabled={saving}>
                        {saving ? 'در حال ذخیره…' : 'ذخیره'}
                    </button>
                </div>
            )}
        </section>
    );
}
