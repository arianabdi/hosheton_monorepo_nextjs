'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import styles from './Notifications.module.scss';

// ── Types ─────────────────────────────────────────────────────────────────────

interface OpsForm {
    telegramBotToken: string;
    telegramChatIds: string[];
    baleBotToken: string;
    baleChatIds: string[];
    lowCreditEnabled: boolean;
    usageDetailLogEnabled: boolean;
    defaultLowCreditThreshold: number;
    quotaWarnPercent: number;
    usageLogMinChargedUsd: number;
    usageLogMaxPerMinute: number;
    ticketNotifyEnabled: boolean;
    walletNotifyEnabled: boolean;
    // Backup notifications
    backupNotifyOnSuccess: boolean;
    backupNotifyOnFailure: boolean;
    backupNotifyOnCron: boolean;
}

const emptyForm: OpsForm = {
    telegramBotToken: '',
    telegramChatIds: [''],
    baleBotToken: '',
    baleChatIds: [''],
    lowCreditEnabled: true,
    usageDetailLogEnabled: false,
    defaultLowCreditThreshold: 10,
    quotaWarnPercent: 10,
    usageLogMinChargedUsd: 0,
    usageLogMaxPerMinute: 20,
    ticketNotifyEnabled: true,
    walletNotifyEnabled: true,
    backupNotifyOnSuccess: true,
    backupNotifyOnFailure: true,
    backupNotifyOnCron: false,
};

function ensureList(values?: string[] | null, fallback?: string) {
    const cleaned = (values || []).map((v) => String(v || '').trim()).filter(Boolean);
    if (cleaned.length) return cleaned;
    if (fallback?.trim()) return [fallback.trim()];
    return [''];
}

// ── Reusable sub-components ───────────────────────────────────────────────────

function SectionHeader({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
    return (
        <div className={styles.sectionHeader}>
            <div className={styles.sectionIcon}>{icon}</div>
            <div>
                <h2 className={styles.sectionTitle}>{title}</h2>
                <p className={styles.sectionDesc}>{desc}</p>
            </div>
        </div>
    );
}

function Toggle({
    id,
    label,
    hint,
    checked,
    onChange,
}: {
    id: string;
    label: string;
    hint: string;
    checked: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <label htmlFor={id} className={styles.toggleRow}>
            <span className={styles.toggleMeta}>
                <span className={styles.toggleLabel}>{label}</span>
                <span className={styles.toggleHint}>{hint}</span>
            </span>
            <button
                type="button"
                role="switch"
                id={id}
                aria-checked={checked}
                onClick={() => onChange(!checked)}
                className={`${styles.switch} ${checked ? styles.switchOn : ''}`}
            >
                <span className={styles.switchThumb} />
            </button>
        </label>
    );
}

function ChatIdList({
    channel,
    ids,
    placeholder,
    onUpdate,
    onAdd,
    onRemove,
}: {
    channel: string;
    ids: string[];
    placeholder: string;
    onUpdate: (i: number, v: string) => void;
    onAdd: () => void;
    onRemove: (i: number) => void;
}) {
    return (
        <div className={styles.chatList}>
            <span className={styles.fieldLabel}>Chat ID‌ها</span>
            {ids.map((id, i) => (
                <div key={`${channel}-${i}`} className={styles.chatRow}>
                    <input
                        value={id}
                        placeholder={placeholder}
                        className={styles.input}
                        onChange={(e) => onUpdate(i, e.target.value)}
                        dir="ltr"
                    />
                    <button
                        type="button"
                        className={styles.removeBtn}
                        onClick={() => onRemove(i)}
                        aria-label="حذف"
                    >
                        ×
                    </button>
                </div>
            ))}
            <button type="button" className={styles.addBtn} onClick={onAdd}>
                + افزودن Chat ID
            </button>
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function NotificationsSettingsPage() {
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [checking, setChecking] = useState(false);
    const [form, setForm] = useState<OpsForm>(emptyForm);

    useEffect(() => {
        if (!token) return;
        axios
            .get(`${baseUrl}/api/hosheton-ops/settings`, {
                headers: { authorization: `Bearer ${token}` },
            })
            .then((res) => {
                if (res.data.statusCode === 200) {
                    const s = res.data.data || {};
                    setForm({
                        telegramBotToken: s.telegramBotToken || '',
                        telegramChatIds: ensureList(s.telegramChatIds, s.telegramChatId),
                        baleBotToken: s.baleBotToken || '',
                        baleChatIds: ensureList(s.baleChatIds, s.baleChatId),
                        lowCreditEnabled: s.lowCreditEnabled ?? true,
                        usageDetailLogEnabled: s.usageDetailLogEnabled ?? false,
                        defaultLowCreditThreshold: s.defaultLowCreditThreshold ?? 10,
                        quotaWarnPercent: s.quotaWarnPercent ?? 10,
                        usageLogMinChargedUsd: s.usageLogMinChargedUsd ?? 0,
                        usageLogMaxPerMinute: s.usageLogMaxPerMinute ?? 20,
                        ticketNotifyEnabled: s.ticketNotifyEnabled ?? true,
                        walletNotifyEnabled: s.walletNotifyEnabled ?? true,
                        backupNotifyOnSuccess: s.backupNotifyOnSuccess ?? true,
                        backupNotifyOnFailure: s.backupNotifyOnFailure ?? true,
                        backupNotifyOnCron: s.backupNotifyOnCron ?? false,
                    });
                }
            })
            .catch(ErrorToaster)
            .finally(() => setLoading(false));
    }, [token, baseUrl]);

    const updateChatId = (channel: 'telegramChatIds' | 'baleChatIds', index: number, value: string) =>
        setForm((prev) => ({
            ...prev,
            [channel]: prev[channel].map((item, i) => (i === index ? value : item)),
        }));

    const addChatId = (channel: 'telegramChatIds' | 'baleChatIds') =>
        setForm((prev) => ({ ...prev, [channel]: [...prev[channel], ''] }));

    const removeChatId = (channel: 'telegramChatIds' | 'baleChatIds', index: number) =>
        setForm((prev) => {
            const next = prev[channel].filter((_, i) => i !== index);
            return { ...prev, [channel]: next.length ? next : [''] };
        });

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;
        try {
            setSaving(true);
            await axios.put(
                `${baseUrl}/api/hosheton-ops/settings`,
                {
                    ...form,
                    telegramChatIds: form.telegramChatIds.map((v) => v.trim()).filter(Boolean),
                    baleChatIds: form.baleChatIds.map((v) => v.trim()).filter(Boolean),
                },
                { headers: { authorization: `Bearer ${token}` } },
            );
            SuccessToaster({ message: 'تنظیمات اطلاع‌رسانی ذخیره شد' });
        } catch (err) {
            ErrorToaster(err);
        } finally {
            setSaving(false);
        }
    };

    const handleTest = async () => {
        if (!token) return;
        try {
            setTesting(true);
            const res = await axios.post(
                `${baseUrl}/api/hosheton-ops/test-notify`,
                {},
                { headers: { authorization: `Bearer ${token}` } },
            );
            const data = res.data?.data || {};
            SuccessToaster({
                message: `تست ارسال شد — تلگرام: ${data.telegramSent ?? (data.telegram ? 1 : 0)} / بله: ${data.baleSent ?? (data.bale ? 1 : 0)}`,
            });
        } catch (err) {
            ErrorToaster(err);
        } finally {
            setTesting(false);
        }
    };

    const handleCheckCredits = async () => {
        if (!token) return;
        try {
            setChecking(true);
            const res = await axios.post(
                `${baseUrl}/api/hosheton-ops/check-credits`,
                {},
                { headers: { authorization: `Bearer ${token}` } },
            );
            SuccessToaster({
                message: `بررسی شد: ${res.data?.data?.checked ?? 0} مورد، ${res.data?.data?.alerts ?? 0} هشدار`,
            });
        } catch (err) {
            ErrorToaster(err);
        } finally {
            setChecking(false);
        }
    };

    return (
        <div className={`${styles.page} ${styles.rtl}`}>
            {/* ── Page Header ────────────────────────────────────── */}
            <header className={styles.header}>
                <div>
                    <span className={styles.eyebrow}>Ops</span>
                    <h1 className={styles.title}>اطلاع‌رسانی و هشدارها</h1>
                    <p className={styles.subtitle}>
                        کانال‌های ارسال پیام به تیم (تلگرام / بله)، هشدارهای سیستمی و اعلان‌های دیتابیس را اینجا تنظیم کنید.
                    </p>
                </div>
                <div className={styles.headerActions}>
                    <button
                        type="button"
                        className={styles.ghostBtn}
                        disabled={testing}
                        onClick={handleTest}
                    >
                        {testing ? 'ارسال...' : 'ارسال پیام تست'}
                    </button>
                    <button
                        type="button"
                        className={styles.ghostBtn}
                        disabled={checking}
                        onClick={handleCheckCredits}
                    >
                        {checking ? 'بررسی...' : 'بررسی شارژ الان'}
                    </button>
                </div>
            </header>

            {loading ? (
                <div className={styles.skeleton}>
                    <div className={styles.skeletonCard} />
                    <div className={styles.skeletonCard} />
                    <div className={styles.skeletonCard} />
                </div>
            ) : (
                <form className={styles.grid} onSubmit={handleSave}>

                    {/* ── Telegram ───────────────────────────────────── */}
                    <section className={styles.card}>
                        <SectionHeader
                            icon={
                                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                                </svg>
                            }
                            title="تلگرام"
                            desc="Bot Token و Chat IDهای مقصد ops. هر پیام به همه chatهای تعریف‌شده می‌رود."
                        />

                        <div className={styles.fieldGroup}>
                            <label htmlFor="telegramBotToken" className={styles.fieldLabel}>
                                Bot Token
                            </label>
                            <input
                                id="telegramBotToken"
                                type="password"
                                autoComplete="off"
                                value={form.telegramBotToken}
                                className={styles.input}
                                dir="ltr"
                                onChange={(e) => setForm({ ...form, telegramBotToken: e.target.value })}
                            />
                            <span className={styles.hint}>
                                از @BotFather بگیرید. در UI و لاگ عمومی نمایش داده نمی‌شود.
                            </span>
                        </div>

                        <ChatIdList
                            channel="telegram"
                            ids={form.telegramChatIds}
                            placeholder="-1001234567890"
                            onUpdate={(i, v) => updateChatId('telegramChatIds', i, v)}
                            onAdd={() => addChatId('telegramChatIds')}
                            onRemove={(i) => removeChatId('telegramChatIds', i)}
                        />
                    </section>

                    {/* ── Bale ───────────────────────────────────────── */}
                    <section className={styles.card}>
                        <SectionHeader
                            icon={
                                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15H9V8h2v9zm4 0h-2V8h2v9z" />
                                </svg>
                            }
                            title="بله"
                            desc="مثل تلگرام اما از Bot API سازگار بله (tapi.bale.ai) استفاده می‌شود."
                        />

                        <div className={styles.fieldGroup}>
                            <label htmlFor="baleBotToken" className={styles.fieldLabel}>
                                Bot Token
                            </label>
                            <input
                                id="baleBotToken"
                                type="password"
                                autoComplete="off"
                                value={form.baleBotToken}
                                className={styles.input}
                                dir="ltr"
                                onChange={(e) => setForm({ ...form, baleBotToken: e.target.value })}
                            />
                        </div>

                        <ChatIdList
                            channel="bale"
                            ids={form.baleChatIds}
                            placeholder="Chat ID بله"
                            onUpdate={(i, v) => updateChatId('baleChatIds', i, v)}
                            onAdd={() => addChatId('baleChatIds')}
                            onRemove={(i) => removeChatId('baleChatIds', i)}
                        />
                    </section>

                    {/* ── Alert Rules ─────────────────────────────────── */}
                    <section className={styles.card}>
                        <SectionHeader
                            icon={
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                                </svg>
                            }
                            title="هشدارهای سیستمی"
                            desc="هشدار کمبود شارژ و لاگ مصرف. لاگ مصرف فقط بعد از تولید واقعی ارسال می‌شود."
                        />

                        <div className={styles.toggleGroup}>
                            <Toggle
                                id="lowCreditEnabled"
                                label="هشدار کمبود شارژ / quota"
                                hint="وقتی remainingCredit یا سهمیه حساب به آستانه برسد پیام می‌رود."
                                checked={form.lowCreditEnabled}
                                onChange={(v) => setForm({ ...form, lowCreditEnabled: v })}
                            />
                            <Toggle
                                id="usageDetailLogEnabled"
                                label="لاگ جزئیات مصرف / سود"
                                hint="فقط بعد از تولید واقعی (نه تخمین تنظیمات)، vendor / charged / profit به کانال فرستاده می‌شود."
                                checked={form.usageDetailLogEnabled}
                                onChange={(v) => setForm({ ...form, usageDetailLogEnabled: v })}
                            />
                            <Toggle
                                id="ticketNotifyEnabled"
                                label="لاگ تیکت جدید / پیام کاربر"
                                hint="وقتی تیکت جدید ساخته شود یا کاربر در تیکت باز پیام بگذارد به ops پیام می‌رود."
                                checked={form.ticketNotifyEnabled}
                                onChange={(v) => setForm({ ...form, ticketNotifyEnabled: v })}
                            />
                            <Toggle
                                id="walletNotifyEnabled"
                                label="لاگ شارژ کیف پول"
                                hint="بعد از شارژ موفق از درگاه یا تأیید کارت‌به‌کارت به ops پیام می‌رود."
                                checked={form.walletNotifyEnabled}
                                onChange={(v) => setForm({ ...form, walletNotifyEnabled: v })}
                            />
                        </div>

                        <div className={styles.row}>
                            <div className={styles.fieldGroup}>
                                <label htmlFor="defaultLowCreditThreshold" className={styles.fieldLabel}>
                                    آستانه پیش‌فرض remainingCredit
                                </label>
                                <input
                                    id="defaultLowCreditThreshold"
                                    type="number"
                                    value={form.defaultLowCreditThreshold}
                                    className={styles.input}
                                    onChange={(e) =>
                                        setForm({ ...form, defaultLowCreditThreshold: Number(e.target.value) })
                                    }
                                />
                                <span className={styles.hint}>
                                    اگر provider خودش آستانه نداشته باشد از این استفاده می‌شود.
                                </span>
                            </div>
                            <div className={styles.fieldGroup}>
                                <label htmlFor="quotaWarnPercent" className={styles.fieldLabel}>
                                    درصد هشدار quota باقیمانده
                                </label>
                                <input
                                    id="quotaWarnPercent"
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={form.quotaWarnPercent}
                                    className={styles.input}
                                    onChange={(e) =>
                                        setForm({ ...form, quotaWarnPercent: Number(e.target.value) })
                                    }
                                />
                                <span className={styles.hint}>
                                    مثلاً ۱۰ یعنی وقتی کمتر از ۱۰٪ سهمیه مانده هشدار بده.
                                </span>
                            </div>
                        </div>

                        <div className={styles.row}>
                            <div className={styles.fieldGroup}>
                                <label htmlFor="usageLogMinChargedUsd" className={styles.fieldLabel}>
                                    حداقل charged برای لاگ (USD)
                                </label>
                                <input
                                    id="usageLogMinChargedUsd"
                                    type="number"
                                    step="0.000001"
                                    value={form.usageLogMinChargedUsd}
                                    className={styles.input}
                                    onChange={(e) =>
                                        setForm({ ...form, usageLogMinChargedUsd: Number(e.target.value) })
                                    }
                                />
                            </div>
                            <div className={styles.fieldGroup}>
                                <label htmlFor="usageLogMaxPerMinute" className={styles.fieldLabel}>
                                    سقف پیام لاگ در دقیقه
                                </label>
                                <input
                                    id="usageLogMaxPerMinute"
                                    type="number"
                                    value={form.usageLogMaxPerMinute}
                                    className={styles.input}
                                    onChange={(e) =>
                                        setForm({ ...form, usageLogMaxPerMinute: Number(e.target.value) })
                                    }
                                />
                            </div>
                        </div>
                    </section>

                    {/* ── Database Backup Notifications ───────────────── */}
                    <section className={styles.card}>
                        <SectionHeader
                            icon={
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                                    <ellipse cx="12" cy="5" rx="9" ry="3" />
                                    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                                    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                                </svg>
                            }
                            title="اعلان‌های بک‌آپ‌گیری دیتابیس"
                            desc="مشخص کنید بعد از هر backup کدام رویدادها به کانال تلگرام/بله ارسال شوند."
                        />

                        <div className={styles.toggleGroup}>
                            <Toggle
                                id="backupNotifyOnSuccess"
                                label="اعلان موفقیت backup"
                                hint="بعد از هر backup موفق، پیامی با اطلاعات فایل، حجم و تعداد سند ارسال می‌شود."
                                checked={form.backupNotifyOnSuccess}
                                onChange={(v) => setForm({ ...form, backupNotifyOnSuccess: v })}
                            />
                            <Toggle
                                id="backupNotifyOnFailure"
                                label="اعلان خطای backup"
                                hint="اگر backup با خطا متوقف شود، پیام خطا به کانال می‌رود. توصیه می‌شود همیشه روشن باشد."
                                checked={form.backupNotifyOnFailure}
                                onChange={(v) => setForm({ ...form, backupNotifyOnFailure: v })}
                            />
                            <Toggle
                                id="backupNotifyOnCron"
                                label="اعلان برای backup‌های زمان‌بندی‌شده (cron)"
                                hint="اگر غیرفعال باشد، فقط backup‌های دستی اعلان می‌فرستند."
                                checked={form.backupNotifyOnCron}
                                onChange={(v) => setForm({ ...form, backupNotifyOnCron: v })}
                            />
                        </div>

                        <div className={styles.linkBox}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                                <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                                <polyline points="13 2 13 9 20 9" />
                            </svg>
                            <span>برای مدیریت backup‌ها، زمان‌بندی cron و restore</span>
                            <Link href="/settings/database/backups" className={styles.linkBtn}>
                                رفتن به تنظیمات دیتابیس ←
                            </Link>
                        </div>
                    </section>

                    {/* ── Env hint ────────────────────────────────────── */}
                    <div className={styles.envHint}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        اگر فیلد توکن/چت خالی باشد، از env‌های{' '}
                        <code>HOSHETON_OPS_TELEGRAM_*</code> و <code>HOSHETON_OPS_BALE_*</code> خوانده می‌شود.
                        برای چند chat در env فقط یک مقدار پشتیبانی می‌شود؛ چند مقصد را از همین فرم ذخیره کنید.
                    </div>

                    {/* ── Actions ─────────────────────────────────────── */}
                    <div className={styles.actions}>
                        <button type="submit" className={styles.primaryBtn} disabled={saving}>
                            {saving ? 'در حال ذخیره...' : 'ذخیره تنظیمات'}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}
