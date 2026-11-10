'use client';

import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import styles from './BypassSettings.module.scss';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';

interface GatewayForm {
    enabled: boolean;
    baseUrl: string;
    apiKey: string;
    extraHosts: string;
    timeoutMs: number;
}

const emptyForm: GatewayForm = {
    enabled: false,
    baseUrl: '',
    apiKey: '',
    extraHosts: '',
    timeoutMs: 600000,
};

interface TestResult {
    ok: boolean;
    latencyMs?: number;
    version?: string;
    error?: string;
}

/** تب «عبور از تحریم و فیلتر» در تنظیمات هوش مصنوعی — رلهٔ درخواست‌های provider از سرور خارج */
export default function BypassSettings() {
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [form, setForm] = useState<GatewayForm>(emptyForm);
    const [runtimeActive, setRuntimeActive] = useState(false);
    const [testResult, setTestResult] = useState<TestResult | null>(null);

    const loadSettings = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const res = await axios.get(`${baseUrl}/api/ai-gateway/settings`, {
                headers: { authorization: `Bearer ${token}` },
            });
            if (res.data.statusCode === 200) {
                const s = res.data.data || {};
                setForm({
                    enabled: s.enabled ?? false,
                    baseUrl: s.baseUrl || '',
                    apiKey: s.apiKey || '',
                    extraHosts: Array.isArray(s.extraHosts) ? s.extraHosts.join('\n') : '',
                    timeoutMs: s.timeoutMs ?? 600000,
                });
                setRuntimeActive(!!s.runtime?.active);
            }
        } catch (err) {
            ErrorToaster(err);
        } finally {
            setLoading(false);
        }
    }, [token, baseUrl]);

    useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;
        try {
            setSaving(true);
            const payload = {
                enabled: form.enabled,
                baseUrl: form.baseUrl.trim(),
                apiKey: form.apiKey.trim(),
                extraHosts: form.extraHosts
                    .split(/[\n,]/)
                    .map((h) => h.trim())
                    .filter(Boolean),
                timeoutMs: Number(form.timeoutMs) || 600000,
            };
            const res = await axios.put(`${baseUrl}/api/ai-gateway/settings`, payload, {
                headers: { authorization: `Bearer ${token}` },
            });
            if (res.data.statusCode === 200) {
                setRuntimeActive(!!res.data.data?.runtime?.active);
                SuccessToaster({ message: res.data.message || 'تنظیمات دروازه ذخیره شد' });
            }
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
            setTestResult(null);
            const res = await axios.post(
                `${baseUrl}/api/ai-gateway/test`,
                {
                    baseUrl: form.baseUrl.trim(),
                    apiKey: form.apiKey.trim(),
                },
                { headers: { authorization: `Bearer ${token}` } },
            );
            const data = res.data?.data || {};
            setTestResult(data);
        } catch (err) {
            ErrorToaster(err);
        } finally {
            setTesting(false);
        }
    };

    return (
        <div className={styles.grid}>
            <p className={styles.intro}>
                به‌خاطر تحریم‌ها، سرور ایران نمی‌تواند مستقیم به fal.ai، اطلس‌کلود و سایر
                ارائه‌دهنده‌ها وصل شود. اگر دروازه (رلهٔ سرور خارج) را روی یک سرور خارجی راه بیندازید،
                با روشن‌کردن این سوییچ همهٔ درخواست‌ها از آن عبور می‌کنند و سرعت و پایداری کل سرویس
                بدون VPN برمی‌گردد. تا وقتی خاموش است، همه‌چیز مثل قبل مستقیم زده می‌شود.
            </p>
            {loading ? (
                <p className={styles.loading}>در حال بارگذاری...</p>
            ) : (
                <form className={styles.grid} onSubmit={handleSave}>
                    <section className={styles.switchCard}>
                        <input
                            id="gw-enabled"
                            type="checkbox"
                            checked={form.enabled}
                            onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                        />
                        <label htmlFor="gw-enabled">
                            عبور درخواست‌های هوش مصنوعی از دروازهٔ خارج
                            <span>
                                پیش‌فرض خاموش است (اتصال مستقیم). بعد از ذخیره، حداکثر تا یک دقیقه
                                بعد روی همهٔ درخواست‌های تولید اعمال می‌شود — بدون ری‌استارت سرور.
                            </span>
                            <span className={`${styles.statusChip} ${runtimeActive ? styles.statusChipActive : styles.statusChipIdle}`}>
                                {runtimeActive ? '● فعال — ترافیک از دروازه عبور می‌کند' : '○ غیرفعال — اتصال مستقیم'}
                            </span>
                        </label>
                    </section>

                    <section className={styles.card}>
                        <div className={styles.cardHeader}>
                            <h2 className={styles.cardTitle}>اتصال به دروازه</h2>
                            <p className={styles.cardDesc}>
                                آدرس دروازه و کلید مشترک را همان‌طور که روی سرور خارج در فایل
                                <code> .env </code> تنظیم کرده‌اید وارد کنید.
                            </p>
                        </div>

                        <div className={styles.field}>
                            <label htmlFor="gw-base-url">آدرس دروازه</label>
                            <input
                                id="gw-base-url"
                                type="text"
                                dir="ltr"
                                placeholder="https://gw.example.com"
                                value={form.baseUrl}
                                onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
                            />
                            <span className={styles.hint}>
                                آدرس HTTPS سرور فرانسه؛ رله روی مسیر /relay همین دامنه سوار می‌شود.
                            </span>
                        </div>

                        <div className={styles.field}>
                            <label htmlFor="gw-api-key">کلید دروازه (GATEWAY_API_KEY)</label>
                            <input
                                id="gw-api-key"
                                type="password"
                                autoComplete="off"
                                dir="ltr"
                                placeholder="••••••••••••••••"
                                value={form.apiKey}
                                onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                            />
                            <span className={styles.hint}>
                                همان مقداری که در فایل .env دروازه تنظیم شده؛ این کلید فقط بین سرور
                                خودتان و دروازه رد و بدل می‌شود.
                            </span>
                        </div>

                        <div className={styles.field}>
                            <label htmlFor="gw-timeout">حداکثر انتظار برای پاسخ (میلی‌ثانیه)</label>
                            <input
                                id="gw-timeout"
                                type="number"
                                dir="ltr"
                                min={10000}
                                max={900000}
                                value={form.timeoutMs}
                                onChange={(e) => setForm({ ...form, timeoutMs: Number(e.target.value) })}
                            />
                            <span className={styles.hint}>
                                برای تولید ویدیو و چت‌های طولانی، مقدار پیش‌فرض ۶۰۰۰۰۰ (۱۰ دقیقه) مناسب است.
                            </span>
                        </div>

                        <div className={styles.field}>
                            <label htmlFor="gw-extra-hosts">دامنه‌های اضافه (اختیاری)</label>
                            <textarea
                                id="gw-extra-hosts"
                                dir="ltr"
                                placeholder={'مثلاً:\nnew-provider.com\n*.new-provider.com'}
                                value={form.extraHosts}
                                onChange={(e) => setForm({ ...form, extraHosts: e.target.value })}
                            />
                            <span className={styles.hint}>
                                اگر ارائه‌دهندهٔ جدیدی اضافه کردید که در لیست پیش‌فرض نیست، دامنه‌اش را
                                اینجا بگذارید (هر خط یک دامنه؛ با *. همهٔ زیردامنه‌ها مجاز می‌شوند).
                            </span>
                        </div>
                    </section>

                    <section className={styles.card}>
                        <div className={styles.cardHeader}>
                            <h2 className={styles.cardTitle}>تست اتصال</h2>
                            <p className={styles.cardDesc}>
                                قبل از فعال‌کردن سوییچ، یک بار اتصال سرور به دروازه را بسنجید.
                            </p>
                        </div>
                        <div className={styles.actions}>
                            <button type="button" className={styles.secondaryBtn} onClick={handleTest} disabled={testing || !form.baseUrl.trim()}>
                                {testing ? 'در حال تست...' : 'تست اتصال به دروازه'}
                            </button>
                        </div>
                        {testResult && (
                            <p className={`${styles.testResult} ${testResult.ok ? styles.testResultOk : styles.testResultFail}`}>
                                {testResult.ok
                                    ? `✔ اتصال برقرار است (${testResult.latencyMs}ms، نسخهٔ ${testResult.version || '—'})`
                                    : `✖ اتصال برقرار نشد: ${testResult.error || 'خطای نامشخص'}`}
                            </p>
                        )}
                        <div className={styles.helpBox}>
                            <strong>چه چیزهایی از دروازه عبور می‌کند؟</strong>
                            <br />
                            درخواست‌های تولید چت، تصویر، ویدیو، صدا و آواتار به سرویس‌های
                            fal.ai، اطلس‌کلود، OpenAI، Claude، DeepSeek، Grok، Gemini، ElevenLabs،
                            HeyGen و Kling. همهٔ منطق، کاربران، کیف پول، کلیدها و تاریخچه مثل قبل
                            روی سرور ایران می‌ماند و دروازه فقط ترافیک شبکهٔ providerها را رد می‌کند.
                        </div>
                    </section>

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
