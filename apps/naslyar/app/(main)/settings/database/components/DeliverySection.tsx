'use client';

import { useState } from 'react';
import { LuChevronDown } from 'react-icons/lu';
import { ErrorToaster } from '@my-workspace/utils';
import { useDatabase } from '../lib/DatabaseProvider';
import { fetchLatestFullBackup, notifyBackup, testNotify, type NotifyChannelId, type NotifyResult, type NotifySetting } from '../lib/database-api';
import styles from '../Database.module.scss';
import s from './Schedule.module.scss';

const CHANNELS: Array<{ id: NotifyChannelId; title: string; steps: string[]; chatPlaceholder: string; apiHint: string }> = [
    {
        id: 'telegram',
        title: 'تلگرام',
        steps: ['در تلگرام از @BotFather یک ربات بسازید و توکنش را کپی کنید.', 'ربات را ادمین کانال یا گروه بک‌آپ‌ها کنید.', 'توکن و آدرس کانال را اینجا بچسبانید و «امتحان اتصال» را بزنید.'],
        chatPlaceholder: '@my_backups  ·  -1001234567890',
        apiHint: 'سرور داخل ایران معمولاً به تلگرام دسترسی ندارد؛ آدرس یک واسط روی سرور خارج یا پروکسی بدهید.',
    },
    {
        id: 'bale',
        title: 'بله',
        steps: ['در بله از @botfather یک ربات بسازید و توکنش را کپی کنید.', 'ربات را عضو/ادمین گروه یا کانال کنید.', 'توکن و شناسهٔ گفتگو را اینجا بچسبانید و «امتحان اتصال» را بزنید.'],
        chatPlaceholder: 'شناسهٔ عددی گفتگو',
        apiHint: 'بله از داخل ایران در دسترس است؛ معمولاً تغییری لازم نیست.',
    },
];

const SEND_ON: Array<{ id: keyof NotifySetting['sendOn']; label: string }> = [
    { id: 'cron', label: 'بک‌آپ‌های خودکار' },
    { id: 'manual', label: 'بک‌آپ‌های دستی' },
    { id: 'pre-restore', label: 'بک‌آپ ایمنی قبل از بازگردانی' },
];

/**
 * ارسال خود فایل بک‌آپ به تلگرام/بله (نسخهٔ بیرون از سرور). کنترل‌شده: ذخیره با نوار ذخیرهٔ صفحه؛
 * فقط «امتحان اتصال» قبلش خودکار ذخیره می‌کند تا روی تنظیمات واقعی امتحان شود.
 */
export default function DeliverySection({
    value,
    saved,
    chatText,
    onChange,
    onChatText,
    onSaveNow,
}: {
    value: NotifySetting;
    saved: NotifySetting;
    chatText: Record<NotifyChannelId, string>;
    onChange: (next: NotifySetting) => void;
    onChatText: (next: Record<NotifyChannelId, string>) => void;
    /** saves the current draft (used right before a test) */
    onSaveNow: () => Promise<boolean>;
}) {
    const { baseUrl, token } = useDatabase();
    const [open, setOpen] = useState<Record<NotifyChannelId, boolean>>({ telegram: false, bale: false });
    const [advanced, setAdvanced] = useState<Record<NotifyChannelId, boolean>>({ telegram: false, bale: false });
    const [testing, setTesting] = useState<NotifyChannelId | null>(null);
    const [results, setResults] = useState<Record<string, NotifyResult[] | string>>({});
    const [sendingLatest, setSendingLatest] = useState(false);

    const setCh = (id: NotifyChannelId, patch: Partial<NotifySetting['channels'][NotifyChannelId]>) =>
        onChange({ ...value, channels: { ...value.channels, [id]: { ...value.channels[id], ...patch } } });

    const connected = (id: NotifyChannelId) => {
        const c = saved.channels[id];
        return c.enabled && !!c.hasToken && c.chatIds.length > 0;
    };
    const anyConnected = CHANNELS.some((c) => connected(c.id));

    const test = async (id: NotifyChannelId) => {
        const c = value.channels[id];
        const chats = chatText[id].split(/[\s,،]+/).filter(Boolean);
        if (!c.botToken && !c.hasToken) return setResults({ ...results, [id]: 'توکن ربات را وارد کنید.' });
        if (!chats.length) return setResults({ ...results, [id]: 'آدرس کانال یا گروه را وارد کنید.' });
        if (c.proxyUrl && c.proxyUrl !== '••••' && !/^https?:\/\//.test(c.proxyUrl)) return setResults({ ...results, [id]: 'پروکسی باید با http:// یا https:// شروع شود.' });
        try {
            setTesting(id);
            setResults({ ...results, [id]: [] });
            if (!(await onSaveNow())) return;
            const res = await testNotify(baseUrl, token, id);
            setResults((r) => ({ ...r, [id]: res }));
            if (res.some((x) => x.network)) setAdvanced((a) => ({ ...a, [id]: true }));
        } catch (e: any) {
            setResults((r) => ({ ...r, [id]: e?.response?.data?.message || 'امتحان انجام نشد؛ دوباره تلاش کنید.' }));
        } finally {
            setTesting(null);
        }
    };

    const sendLatest = async () => {
        try {
            setSendingLatest(true);
            const latest = await fetchLatestFullBackup(baseUrl, token);
            if (!latest) return ErrorToaster({ message: 'هنوز بک‌آپی نیست؛ اول یک بک‌آپ بگیرید.' });
            const res = await notifyBackup(baseUrl, token, latest._id);
            setResults((r) => ({ ...r, latest: res.message }));
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setSendingLatest(false);
        }
    };

    return (
        <section id="delivery" className={s.block}>
            <h3 className={styles.sectionTitle}>نسخهٔ بیرون از سرور</h3>
            <p className={styles.sectionLead}>
                هر بک‌آپ به تلگرام یا بله فرستاده می‌شود. اگر سرور از دست رفت، همان فایل را در «بازگردانی» ← «فایلی که دانلود کرده‌ام» بدهید (فایل بزرگ چندبخشی
                می‌رسد؛ همهٔ بخش‌ها را با هم انتخاب کنید).
            </p>

            <div className={s.rows}>
                {CHANNELS.map((c) => {
                    const ch = value.channels[c.id];
                    const isOn = connected(c.id);
                    const res = results[c.id];
                    const expanded = open[c.id];
                    return (
                        <div key={c.id} className={s.channel}>
                            <div className={s.row}>
                                <span className={s.rowLabel}>{c.title}</span>
                                <span className={s.rowValue}>
                                    <span className={`${styles.dot} ${isOn ? styles.dotOk : ''}`} />
                                    {isOn ? `وصل · ${saved.channels[c.id].chatIds.join('، ')}` : saved.channels[c.id].hasToken ? 'خاموش' : 'وصل نیست'}
                                </span>
                                <span className={s.rowAction}>
                                    <button type="button" className={styles.linkBtn} onClick={() => setOpen({ ...open, [c.id]: !expanded })}>
                                        {expanded ? 'بستن' : isOn ? 'ویرایش' : 'وصل کردن'}
                                    </button>
                                </span>
                            </div>

                            {expanded && (
                                <div className={s.channelBody}>
                                    <ol className={s.howto}>
                                        {c.steps.map((step) => (
                                            <li key={step}>{step}</li>
                                        ))}
                                    </ol>
                                    <div className={styles.row}>
                                        <label className={styles.field}>
                                            <span>توکن ربات</span>
                                            <input
                                                type="password"
                                                className={styles.ltr}
                                                autoComplete="off"
                                                value={ch.botToken}
                                                placeholder={ch.hasToken ? 'ذخیره شده — برای تغییر توکن جدید بچسبانید' : '123456:ABC…'}
                                                onChange={(e) => setCh(c.id, { botToken: e.target.value, enabled: true })}
                                            />
                                        </label>
                                        <label className={styles.field}>
                                            <span>کانال یا گروه</span>
                                            <input
                                                className={styles.ltr}
                                                value={chatText[c.id]}
                                                placeholder={c.chatPlaceholder}
                                                onChange={(e) => {
                                                    onChatText({ ...chatText, [c.id]: e.target.value });
                                                    if (!ch.enabled) setCh(c.id, { enabled: true });
                                                }}
                                            />
                                            <span className={styles.hint}>چند مقصد را با فاصله جدا کنید.</span>
                                        </label>
                                    </div>

                                    <div className={s.channelActions}>
                                        <button type="button" className={styles.secondaryBtn} onClick={() => test(c.id)} disabled={testing !== null}>
                                            {testing === c.id ? 'در حال امتحان…' : 'ذخیره و امتحان اتصال'}
                                        </button>
                                        {ch.enabled && saved.channels[c.id].hasToken && (
                                            <button type="button" className={styles.dangerLink} onClick={() => setCh(c.id, { enabled: false })}>
                                                خاموش کردن {c.title}
                                            </button>
                                        )}
                                        {!ch.enabled && saved.channels[c.id].hasToken && (
                                            <button type="button" className={styles.linkBtn} onClick={() => setCh(c.id, { enabled: true })}>
                                                روشن کردن {c.title}
                                            </button>
                                        )}
                                    </div>

                                    {typeof res === 'string' && <p className={`${styles.lineNote} ${styles.lineNoteDanger}`}>{res}</p>}
                                    {Array.isArray(res) &&
                                        res.map((r) => (
                                            <p key={r.chatId} className={`${styles.lineNote} ${r.ok ? styles.lineNoteOk : styles.lineNoteDanger}`}>
                                                <span className={styles.mono}>{r.chatId}</span> — {r.ok ? 'پیام آزمایشی رسید.' : r.error}
                                            </p>
                                        ))}

                                    <button
                                        type="button"
                                        className={`${styles.disclosureBtn} ${advanced[c.id] ? styles.disclosureOpen : ''}`}
                                        onClick={() => setAdvanced({ ...advanced, [c.id]: !advanced[c.id] })}
                                    >
                                        تنظیمات اتصال <LuChevronDown aria-hidden />
                                    </button>
                                    {advanced[c.id] && (
                                        <div className={styles.disclosureBody}>
                                            <p className={styles.hint}>{c.apiHint}</p>
                                            <div className={styles.row}>
                                                <label className={styles.field}>
                                                    <span>آدرس واسط</span>
                                                    <input className={styles.ltr} value={ch.apiBase} onChange={(e) => setCh(c.id, { apiBase: e.target.value })} />
                                                </label>
                                                <label className={styles.field}>
                                                    <span>پروکسی (اختیاری)</span>
                                                    <input
                                                        className={styles.ltr}
                                                        value={ch.proxyUrl || ''}
                                                        placeholder="http://user:pass@1.2.3.4:3128"
                                                        onChange={(e) => setCh(c.id, { proxyUrl: e.target.value })}
                                                    />
                                                </label>
                                                <label className={styles.field}>
                                                    <span>اندازهٔ هر تکهٔ فایل (مگابایت)</span>
                                                    <select value={ch.partSizeMB} onChange={(e) => setCh(c.id, { partSizeMB: Number(e.target.value) })}>
                                                        {[10, 19, 30, 45].map((n) => (
                                                            <option key={n} value={n}>
                                                                {n.toLocaleString('fa-IR')} مگابایت{n === (c.id === 'bale' ? 19 : 45) ? ' (پیشنهادی)' : ''}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </label>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {anyConnected && (
                <>
                    <span className={styles.stepLabel}>چه چیزهایی فرستاده شود</span>
                    <div className={styles.chips}>
                        {SEND_ON.map((o) => (
                            <button
                                key={o.id}
                                type="button"
                                className={`${styles.chip} ${s.textChip} ${value.sendOn[o.id] ? styles.chipOn : ''}`}
                                aria-pressed={value.sendOn[o.id]}
                                onClick={() => onChange({ ...value, sendOn: { ...value.sendOn, [o.id]: !value.sendOn[o.id] } })}
                            >
                                {value.sendOn[o.id] ? '✓ ' : ''}
                                {o.label}
                            </button>
                        ))}
                    </div>
                    <label className={`${styles.checkRow} ${s.gapTop}`}>
                        <input type="checkbox" checked={value.onFailure} onChange={(e) => onChange({ ...value, onFailure: e.target.checked })} />
                        <span>اگر بک‌آپ یا بازگردانی ناموفق شد، خبر بده</span>
                    </label>
                    <div className={s.gapTop}>
                        <button type="button" className={styles.linkBtn} onClick={sendLatest} disabled={sendingLatest}>
                            {sendingLatest ? 'در حال ارسال…' : 'فرستادن آخرین بک‌آپ برای امتحان'}
                        </button>
                        {typeof results.latest === 'string' && <span className={styles.hint}> — {results.latest}</span>}
                    </div>
                </>
            )}
        </section>
    );
}
