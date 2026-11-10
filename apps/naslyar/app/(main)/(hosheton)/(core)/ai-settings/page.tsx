'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import axios from 'axios';
import styles from './OpsSettings.module.scss';
import { Container, Wrapper } from '@/app/(main)/layout';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { FaTelegram } from 'react-icons/fa';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import SimpleLineTabs from '@/app/components/SimpleLineTabs/SimpleLineTabs';
import ModelChecklistManager from './ModelChecklistManager';
import PlatformIconsManager from './PlatformIconsManager';
import ChatSettings from './ChatSettings';
import BypassSettings from './BypassSettings';
import { resolveAppVariant } from '@/app/config/navigation-utils';

const OPS_TABS = [
    { id: 'ops', label: 'عملیات' },
    { id: 'checklists', label: 'چک‌لیست مدل‌ها' },
    { id: 'platformIcons', label: 'آیکون‌های عمومی' },
    { id: 'chat', label: 'چت' },
    { id: 'bypass', label: 'عبور از تحریم و فیلتر' },
] as const;

function BaleLogo() {
    return (
        <svg viewBox="0 0 1000 999.72" aria-hidden="true" focusable="false">
            <defs>
                <linearGradient id="baleLogoGradient" x1="800.4" y1="93.39" x2="93.57" y2="800.23" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="#4cebb4" />
                    <stop offset="1" stopColor="#2e2e74" />
                </linearGradient>
            </defs>
            <path
                d="M1010.36,547.36c-.73,17.77-2.6,36-6.85,53.41-1.54,16.48-6.36,32.54-10.76,48.52-5.14,19.5-12.48,38.33-19.9,57.17-6.77,15.66-14.35,30.91-22.26,46.08C942.92,766,934.93,779.2,926.29,792q-14.32,21-30.5,40.45c-11.18,13.13-22.68,26.09-35.15,37.92a503.68,503.68,0,0,1-51.3,43.55,453.44,453.44,0,0,1-48.44,31.56C742.06,956.74,722.16,966,702,974.6a548,548,0,0,1-65.89,21.86c-19.49,4.32-39,9.21-58.88,10.76-37,5.71-74.86,5.79-112.13,2.2-33.6-2.61-66.87-9.78-99.25-19.32l-.08-.58C210.19,944.18,82.32,816.07,34.94,661.2c-10.36-33.35-17.62-67.93-20.31-102.83-3.83-33.85-2-68-2.2-102q-.37-40.74-.08-81.64-.26-41.83,0-83.83c-.17-24-.08-47.95-.08-71.93s-.17-48.19.16-72.25c-.33-23.82-.08-47.63-.16-71.44-1.64-17.94,4.24-36.7,17.86-48.85C44.48,13.44,65.68,8.55,84,14.91c11.09,3.75,20.71,10.6,30.58,16.72,36,23.4,70.54,48.85,104.71,74.78a86.74,86.74,0,0,0,10.68-6.77A426.86,426.86,0,0,1,272.58,73.3a483.59,483.59,0,0,1,45.75-22.1c16.39-6.85,33.19-12.8,50.15-18.1,18.1-5,36.29-10.11,55-12.72a392.65,392.65,0,0,1,61.82-7.26,451.46,451.46,0,0,1,76.41,1.71A413.36,413.36,0,0,1,619,24c128.53,27,244.08,108.3,314.46,219a493,493,0,0,1,66.47,159.76c4.73,20.95,8.48,42.32,9.7,63.77A411.89,411.89,0,0,1,1010.36,547.36Z"
                transform="translate(-12 -12.14)"
                fill="url(#baleLogoGradient)"
            />
            <path
                d="M705.69,273.2a107.59,107.59,0,0,1,62.37,1.3c25.62,9.82,46.29,29.94,57.5,54.9,8.34,22.86,9.31,48.42.91,71.44-6.06,16.2-16.76,30.09-29.4,41.74q-16.7,16.49-33.21,33.14c-11.79,11.79-23.64,23.5-35.33,35.35-11.3,11.28-22.62,22.49-33.85,33.81-12.32,12.34-24.68,24.61-36.95,37-14,14-28.06,27.94-42,42-13.24,13.29-26.55,26.49-39.8,39.78s-26.77,26.71-40.1,40.11c-12.27,11.85-23.51,24.94-37.35,35.06a106.69,106.69,0,0,1-57.95,16C417,753.28,393.79,744,376.87,727.33q-78.53-78.44-157-156.94c-12.82-12.66-21.38-29.07-26-46.38-4.75-23.86-1.94-49.51,10.31-70.75,9.37-16.54,23.79-29.65,40.19-39a107.52,107.52,0,0,1,57.86-9.73c21.38,3.21,42,13,56.91,28.76Q401.7,476,444.37,518.5c8.63-8.18,16.9-16.73,25.19-25.27q18-17.31,35.24-35.35c11.36-10.68,22.33-21.82,33.07-33.12,7.74-6.88,14.75-14.51,22.07-21.8,12-11.68,23.75-23.59,35.49-35.51,11.21-10.83,22.11-21.95,33.07-33,11.79-11.5,23.28-23.28,35-34.87a105.75,105.75,0,0,1,42.21-26.37Z"
                transform="translate(-12 -12.14)"
                fill="#fff"
            />
        </svg>
    );
}

function SecretTokenField({
    id,
    value,
    onChange,
}: {
    id: string;
    value: string;
    onChange: (value: string) => void;
}) {
    const [visible, setVisible] = useState(false);

    return (
        <div className={styles.secretField}>
            <input
                id={id}
                type={visible ? 'text' : 'password'}
                autoComplete="off"
                dir="ltr"
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
            <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setVisible((current) => !current)}
                aria-label={visible ? 'مخفی کردن توکن' : 'نمایش توکن'}
                aria-pressed={visible}
            >
                {visible ? <FiEyeOff size={16} /> : <FiEye size={16} />}
            </button>
        </div>
    );
}

type OpsTabId = (typeof OPS_TABS)[number]['id'];

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
};

function ensureList(values?: string[] | null, fallback?: string) {
    const cleaned = (values || []).map((v) => String(v || '').trim()).filter(Boolean);
    if (cleaned.length) return cleaned;
    if (fallback?.trim()) return [fallback.trim()];
    return [''];
}

/** تب‌هایی که فقط در استودیو معنی دارند (API همان استودیو) */
const STUDIO_ONLY_TABS: OpsTabId[] = ['chat', 'bypass'];

function HoshetonOpsSettingsInner() {
    const { baseUrl, appName, appVariant } = useAppStore();
    // «چت»: گربه روی چت‌باکس استودیو است؛ «عبور از تحریم و فیلتر»: دروازهٔ AI همان سرور استودیو
    const isStudio = resolveAppVariant(appVariant, baseUrl, appName) === 'hosheton_studio';
    const tabs = OPS_TABS.filter((tab) => !STUDIO_ONLY_TABS.includes(tab.id) || isStudio);
    // ‎?tab=bypass — لینک قدیمی /ai-gateway به همین تب می‌آید
    const requestedTab = useSearchParams().get('tab');
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [checking, setChecking] = useState(false);
    const [form, setForm] = useState<OpsForm>(emptyForm);
    const [activeTab, setActiveTab] = useState<OpsTabId>(
        () => tabs.find((tab) => tab.id === requestedTab)?.id ?? 'ops',
    );

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
                    });
                }
            })
            .catch(ErrorToaster)
            .finally(() => setLoading(false));
    }, [token, baseUrl]);

    const updateChatId = (channel: 'telegramChatIds' | 'baleChatIds', index: number, value: string) => {
        setForm((prev) => ({
            ...prev,
            [channel]: prev[channel].map((item, i) => (i === index ? value : item)),
        }));
    };

    const addChatId = (channel: 'telegramChatIds' | 'baleChatIds') => {
        setForm((prev) => ({ ...prev, [channel]: [...prev[channel], ''] }));
    };

    const removeChatId = (channel: 'telegramChatIds' | 'baleChatIds', index: number) => {
        setForm((prev) => {
            const next = prev[channel].filter((_, i) => i !== index);
            return { ...prev, [channel]: next.length ? next : [''] };
        });
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;
        try {
            setSaving(true);
            const payload = {
                ...form,
                telegramChatIds: form.telegramChatIds.map((v) => v.trim()).filter(Boolean),
                baleChatIds: form.baleChatIds.map((v) => v.trim()).filter(Boolean),
            };
            await axios.put(`${baseUrl}/api/hosheton-ops/settings`, payload, {
                headers: { authorization: `Bearer ${token}` },
            });
            SuccessToaster({ message: 'تنظیمات عملیات ذخیره شد' });
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
        <Container>
            <Wrapper>
                <div className={`${styles.page} ${styles.rtl}`}>
                    <header className={styles.hero}>
                        <h1 className={styles.title}>تنظیمات</h1>
                        <p className={styles.lead}>
                            کانال اطلاع‌رسانی تیم: بات تلگرام و بله، هشدار کمبود شارژ و لاگ مصرف. پیام‌ها فقط به
                            chatهای ops می‌روند، نه کاربران نهایی.
                        </p>
                    </header>

                    {loading ? (
                        <p className={styles.loading}>در حال بارگذاری...</p>
                    ) : (
                        <div className={styles.stack}>
                            <SimpleLineTabs
                                tabs={tabs}
                                activeTab={activeTab}
                                onChange={(id) => setActiveTab(id as OpsTabId)}
                            />

                            {activeTab === 'ops' && (
                        <form className={styles.grid} onSubmit={handleSave}>
                            <section className={styles.card}>
                                <div className={styles.cardHeader}>
                                    <div className={styles.cardTitleRow}>
                                        <span className={`${styles.brandLogo} ${styles.telegramLogo}`} aria-hidden="true">
                                            <FaTelegram />
                                        </span>
                                        <h2 className={styles.cardTitle}>تلگرام</h2>
                                    </div>
                                    <p className={styles.cardDesc}>
                                        یک Bot Token و چند Chat ID. هر پیام ops به همهٔ chatهای تعریف‌شده ارسال می‌شود
                                        (مثلاً کانال اصلی + گروه بک‌آپ).
                                    </p>
                                </div>
                                <div className={styles.field}>
                                    <label htmlFor="telegramBotToken">Bot Token</label>
                                    <SecretTokenField
                                        id="telegramBotToken"
                                        value={form.telegramBotToken}
                                        onChange={(value) => setForm({ ...form, telegramBotToken: value })}
                                    />
                                    <span className={styles.hint}>از BotFather بگیرید؛ در UI و لاگ عمومی نمایش داده نمی‌شود.</span>
                                </div>
                                <div className={styles.listBlock}>
                                    <div className={styles.listLabel}>Chat IDها</div>
                                    <p className={styles.listHint}>
                                        شناسه عددی کانال/گروه یا @username. برای کانال خصوصی معمولاً با -100 شروع می‌شود.
                                    </p>
                                    {form.telegramChatIds.map((chatId, index) => (
                                        <div key={`tg-${index}`} className={styles.chatRow}>
                                            <input
                                                value={chatId}
                                                placeholder="مثلاً -1001234567890"
                                                onChange={(e) => updateChatId('telegramChatIds', index, e.target.value)}
                                            />
                                            <button
                                                type="button"
                                                className={styles.iconBtn}
                                                onClick={() => removeChatId('telegramChatIds', index)}
                                                aria-label="حذف"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                    <button type="button" className={styles.addBtn} onClick={() => addChatId('telegramChatIds')}>
                                        + افزودن Chat ID
                                    </button>
                                </div>
                            </section>

                            <section className={styles.card}>
                                <div className={styles.cardHeader}>
                                    <div className={styles.cardTitleRow}>
                                        <span className={styles.brandLogo} aria-hidden="true">
                                            <BaleLogo />
                                        </span>
                                        <h2 className={styles.cardTitle}>بله</h2>
                                    </div>
                                    <p className={styles.cardDesc}>
                                        مثل تلگرام: یک توکن بات و چند مقصد. از Bot API سازگار بله
                                        (<code>tapi.bale.ai</code>) استفاده می‌شود.
                                    </p>
                                </div>
                                <div className={styles.field}>
                                    <label htmlFor="baleBotToken">Bot Token</label>
                                    <SecretTokenField
                                        id="baleBotToken"
                                        value={form.baleBotToken}
                                        onChange={(value) => setForm({ ...form, baleBotToken: value })}
                                    />
                                </div>
                                <div className={styles.listBlock}>
                                    <div className={styles.listLabel}>Chat IDها</div>
                                    <p className={styles.listHint}>می‌توانید چند گروه/کانال ops را هم‌زمان پوشش دهید.</p>
                                    {form.baleChatIds.map((chatId, index) => (
                                        <div key={`bale-${index}`} className={styles.chatRow}>
                                            <input
                                                value={chatId}
                                                placeholder="Chat ID بله"
                                                onChange={(e) => updateChatId('baleChatIds', index, e.target.value)}
                                            />
                                            <button
                                                type="button"
                                                className={styles.iconBtn}
                                                onClick={() => removeChatId('baleChatIds', index)}
                                                aria-label="حذف"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                    <button type="button" className={styles.addBtn} onClick={() => addChatId('baleChatIds')}>
                                        + افزودن Chat ID
                                    </button>
                                </div>
                            </section>

                            <section className={styles.card}>
                                <div className={styles.cardHeader}>
                                    <h2 className={styles.cardTitle}>هشدار و لاگ</h2>
                                    <p className={styles.cardDesc}>
                                        هشدار کمبود شارژ روزانه debounce می‌شود تا اسپم نشود. لاگ مصرف فقط وقتی تیک آن روشن باشد،
                                        بعد از تولید واقعی ارسال می‌شود و با سقف پیام در دقیقه محدود می‌ماند.
                                    </p>
                                </div>

                                <div className={styles.toggles}>
                                    <div className={styles.toggleCard}>
                                        <input
                                            type="checkbox"
                                            id="lowCreditEnabled"
                                            checked={form.lowCreditEnabled}
                                            onChange={(e) => setForm({ ...form, lowCreditEnabled: e.target.checked })}
                                        />
                                        <label htmlFor="lowCreditEnabled">
                                            هشدار کمبود شارژ / quota
                                            <span>وقتی remainingCredit یا سهمیه حساب به آستانه برسد به ops پیام می‌رود.</span>
                                        </label>
                                    </div>
                                    <div className={styles.toggleCard}>
                                        <input
                                            type="checkbox"
                                            id="usageDetailLogEnabled"
                                            checked={form.usageDetailLogEnabled}
                                            onChange={(e) => setForm({ ...form, usageDetailLogEnabled: e.target.checked })}
                                        />
                                        <label htmlFor="usageDetailLogEnabled">
                                            لاگ جزئیات مصرف / سود
                                            <span>فقط بعد از تولید واقعی (نه تخمین تنظیمات)، vendor / charged / profit به کانال ops فرستاده می‌شود.</span>
                                        </label>
                                    </div>
                                    <div className={styles.toggleCard}>
                                        <input
                                            type="checkbox"
                                            id="ticketNotifyEnabled"
                                            checked={form.ticketNotifyEnabled}
                                            onChange={(e) => setForm({ ...form, ticketNotifyEnabled: e.target.checked })}
                                        />
                                        <label htmlFor="ticketNotifyEnabled">
                                            لاگ تیکت جدید / پیام کاربر
                                            <span>وقتی تیکت جدید ساخته شود یا کاربر در تیکت باز پیام بگذارد به ops پیام می‌رود.</span>
                                        </label>
                                    </div>
                                    <div className={styles.toggleCard}>
                                        <input
                                            type="checkbox"
                                            id="walletNotifyEnabled"
                                            checked={form.walletNotifyEnabled}
                                            onChange={(e) => setForm({ ...form, walletNotifyEnabled: e.target.checked })}
                                        />
                                        <label htmlFor="walletNotifyEnabled">
                                            لاگ شارژ کیف پول
                                            <span>بعد از شارژ موفق از درگاه یا تأیید کارت‌به‌کارت به ops پیام می‌رود.</span>
                                        </label>
                                    </div>
                                </div>

                                <div className={styles.row} style={{ marginTop: '1rem' }}>
                                    <div className={styles.field}>
                                        <label htmlFor="defaultLowCreditThreshold">آستانه پیش‌فرض remainingCredit</label>
                                        <input
                                            id="defaultLowCreditThreshold"
                                            type="number"
                                            value={form.defaultLowCreditThreshold}
                                            onChange={(e) =>
                                                setForm({ ...form, defaultLowCreditThreshold: Number(e.target.value) })
                                            }
                                        />
                                        <span className={styles.hint}>اگر provider خودش آستانه نداشته باشد از این مقدار استفاده می‌شود.</span>
                                    </div>
                                    <div className={styles.field}>
                                        <label htmlFor="quotaWarnPercent">درصد هشدار quota باقیمانده</label>
                                        <input
                                            id="quotaWarnPercent"
                                            type="number"
                                            min={0}
                                            max={100}
                                            value={form.quotaWarnPercent}
                                            onChange={(e) =>
                                                setForm({ ...form, quotaWarnPercent: Number(e.target.value) })
                                            }
                                        />
                                        <span className={styles.hint}>مثلاً ۱۰ یعنی وقتی کمتر از ۱۰٪ سهمیه مانده هشدار بده.</span>
                                    </div>
                                </div>

                                <div className={styles.row}>
                                    <div className={styles.field}>
                                        <label htmlFor="usageLogMinChargedUsd">حداقل charged برای لاگ (USD)</label>
                                        <input
                                            id="usageLogMinChargedUsd"
                                            type="number"
                                            step="0.000001"
                                            value={form.usageLogMinChargedUsd}
                                            onChange={(e) =>
                                                setForm({ ...form, usageLogMinChargedUsd: Number(e.target.value) })
                                            }
                                        />
                                    </div>
                                    <div className={styles.field}>
                                        <label htmlFor="usageLogMaxPerMinute">سقف پیام لاگ در دقیقه</label>
                                        <input
                                            id="usageLogMaxPerMinute"
                                            type="number"
                                            value={form.usageLogMaxPerMinute}
                                            onChange={(e) =>
                                                setForm({ ...form, usageLogMaxPerMinute: Number(e.target.value) })
                                            }
                                        />
                                    </div>
                                </div>

                                <div className={styles.helpBox}>
                                    اگر فیلد توکن/چت خالی باشد، از envهای
                                    {' '}<code>HOSHETON_OPS_TELEGRAM_*</code> و <code>HOSHETON_OPS_BALE_*</code> خوانده می‌شود.
                                    برای چند chat در env فقط یک مقدار پشتیبانی می‌شود؛ چند مقصد را از همین فرم ذخیره کنید.
                                </div>
                            </section>

                            <div className={styles.actions}>
                                <button type="submit" className={styles.primaryBtn} disabled={saving}>
                                    {saving ? 'ذخیره...' : 'ذخیره تنظیمات'}
                                </button>
                                <button
                                    type="button"
                                    className={styles.secondaryBtn}
                                    disabled={testing}
                                    onClick={handleTest}
                                >
                                    {testing ? 'ارسال...' : 'تست نوتیف'}
                                </button>
                                <button
                                    type="button"
                                    className={styles.secondaryBtn}
                                    disabled={checking}
                                    onClick={handleCheckCredits}
                                >
                                    {checking ? 'بررسی...' : 'بررسی شارژ الان'}
                                </button>
                            </div>
                        </form>
                            )}

                        {activeTab === 'checklists' && <ModelChecklistManager />}
                        {activeTab === 'platformIcons' && <PlatformIconsManager />}
                        {activeTab === 'chat' && isStudio && <ChatSettings />}
                        {activeTab === 'bypass' && isStudio && <BypassSettings />}
                        </div>
                    )}
                </div>
            </Wrapper>
        </Container>
    );
}

export default function HoshetonOpsSettingsPage() {
    return (
        <Suspense fallback={null}>
            <HoshetonOpsSettingsInner />
        </Suspense>
    );
}
