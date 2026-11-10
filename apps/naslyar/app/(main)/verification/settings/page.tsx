'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../../users/users.module.scss';
import vStyles from '../verification.module.scss';
import { Container, Wrapper } from '@/app/(main)/layout';
import { LoadingState } from '@my-workspace/components';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { useAuthStore } from '@/app/zustand/store/authStore';
import {
    fetchVerificationProviders,
    testVerificationProvider,
    updateVerificationProvider,
    type VerificationProviderItem,
} from '../verification-api';

/** برچسب فیلدهای اعتبارنامه به تفکیک پلتفرم */
const CREDENTIAL_LABELS: Record<string, { token: string; tokenHint?: string; showKeySecret?: boolean }> = {
    zohal: { token: 'توکن API', tokenHint: 'توکن Bearer از پنل zohal.io' },
    novin: {
        token: 'توکن دسترسی (Bearer)',
        tokenHint: 'توکن دسترسی از پنل hub.novin.one — برای فراخوانی API شاهکار',
        showKeySecret: true,
    },
};

/**
 * تنظیمات پلتفرم‌های احراز هویت.
 * هر پلتفرم یک سند در verification_providers است؛ فقط پلتفرم فعال استفاده می‌شود.
 * اعتبارنامه‌ها فقط در دیتابیس ذخیره می‌شوند و در پاسخ API ماسک می‌شوند.
 */
const VerificationSettingsPage: React.FC = () => {
    const router = useRouter();
    const { token } = useAuthStore();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [providers, setProviders] = useState<VerificationProviderItem[]>([]);
    const [supported, setSupported] = useState<Array<{ key: string; name: string }>>([]);

    // فرم ویرایش (به ازای هر پلتفرم یک کلید)
    const [forms, setForms] = useState<
        Record<string, { displayName: string; baseUrl: string; apiToken: string; apiKey: string; apiSecret: string; sandbox: boolean; timeoutMs: number; isActive: boolean }>
    >({});
    const [testProviderKey, setTestProviderKey] = useState('');
    const [testForm, setTestForm] = useState({ mobile: '', nationalCode: '' });
    const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null);

    const load = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const data = await fetchVerificationProviders();
            setProviders(data.providers);
            setSupported(data.supported);
            const nextForms: typeof forms = {};
            for (const p of data.providers) {
                nextForms[p.providerKey] = {
                    displayName: p.displayName || '',
                    baseUrl: p.baseUrl || '',
                    apiToken: '',
                    apiKey: '',
                    apiSecret: '',
                    sandbox: p.sandbox,
                    timeoutMs: p.timeoutMs || 20000,
                    isActive: p.isActive,
                };
                if (p.isActive) setTestProviderKey(p.providerKey);
            }
            setForms(nextForms);
        } catch (err) {
            ErrorToaster(err);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        void load();
    }, [load]);

    const updateForm = (key: string, patch: Partial<Record<string, unknown>>) => {
        setForms((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
    };

    const handleSave = async (provider: VerificationProviderItem) => {
        const form = forms[provider.providerKey];
        if (!form) return;
        try {
            setSaving(true);
            await updateVerificationProvider(provider._id, {
                displayName: form.displayName,
                baseUrl: form.baseUrl,
                // مقادیر خالی یعنی مقدار قبلی حفظ شود
                apiToken: form.apiToken,
                apiKey: form.apiKey,
                apiSecret: form.apiSecret,
                sandbox: form.sandbox,
                timeoutMs: form.timeoutMs,
                isActive: form.isActive,
            });
            SuccessToaster({ message: 'تنظیمات ذخیره شد' });
            await load();
        } catch (err) {
            ErrorToaster(err);
        } finally {
            setSaving(false);
        }
    };

    const handleTest = async () => {
        if (!testForm.mobile.trim() || !testForm.nationalCode.trim()) {
            ErrorToaster({ message: 'موبایل و کد ملی را وارد کنید' });
            return;
        }
        try {
            setTesting(true);
            setTestResult(null);
            const result = await testVerificationProvider({
                providerKey: testProviderKey || undefined,
                mobile: testForm.mobile.trim(),
                nationalCode: testForm.nationalCode.trim(),
            });
            if (result.success && result.matched) {
                setTestResult({ ok: true, text: `تطبیق موفق بود${result.simulated ? ' (حالت آزمایشی)' : ''}` });
            } else if (result.success && result.matched === false) {
                setTestResult({ ok: false, text: 'تطبیق تایید نشد: موبایل به این کد ملی تعلق ندارد.' });
            } else {
                setTestResult({ ok: false, text: result.errorMessage || 'فراخوانی پلتفرم ناموفق بود.' });
            }
        } catch (err) {
            ErrorToaster(err);
        } finally {
            setTesting(false);
        }
    };

    return (
        <Container>
            <Wrapper>
                <div className={`${styles.header} ${styles.rtl}`}>
                    <div>
                        <h1 className={styles.mainTitle}>تنظیمات پلتفرم احراز هویت</h1>
                        <p className={styles.subtitle}>
                            پلتفرم فعال برای احراز هویت کاربران سایت. پلتفرم‌های جدید به مرور در API اضافه می‌شوند
                            {supported.length ? ` (فعلاً: ${supported.map((s) => s.key).join('، ')})` : ''}. اعتبارنامه‌ها
                            فقط در دیتابیس ذخیره می‌شوند.
                        </p>
                    </div>
                    <div className={styles.headerActions}>
                        <button type="button" className={styles.primaryBtn} style={{ background: 'transparent', color: 'var(--brand-color)', border: '1px solid var(--brand-color)' }} onClick={() => router.push('/verification')}>
                            لیست احراز هویت‌ها
                        </button>
                    </div>
                </div>

                {loading ? (
                    <LoadingState />
                ) : (
                    <div className={vStyles.rtlBlock}>
                        {providers.map((provider) => {
                            const form = forms[provider.providerKey];
                            if (!form) return null;
                            const labels = CREDENTIAL_LABELS[provider.providerKey] || { token: 'توکن API', showKeySecret: true };
                            return (
                                <div key={provider._id} className={vStyles.providerCard}>
                                    <div className={vStyles.providerHeader}>
                                        <h2>
                                            <span className={vStyles.providerTag}>{provider.providerKey}</span>
                                            {form.displayName}
                                        </h2>
                                        <span className={`${styles.statusBadge} ${provider.isActive ? styles.approved : styles.pending}`}>
                                            {provider.isActive ? 'فعال' : 'غیرفعال'}
                                        </span>
                                    </div>

                                    <div className={vStyles.formGrid}>
                                        <div className={vStyles.formField}>
                                            <label>نام نمایشی</label>
                                            <input
                                                type="text"
                                                value={form.displayName}
                                                onChange={(e) => updateForm(provider.providerKey, { displayName: e.target.value })}
                                            />
                                        </div>
                                        <div className={vStyles.formField}>
                                            <label>Base URL</label>
                                            <input
                                                type="text"
                                                dir="ltr"
                                                value={form.baseUrl}
                                                placeholder={provider.providerKey === 'novin' ? 'https://api.novin.one' : 'https://service.zohal.io/api/v0'}
                                                onChange={(e) => updateForm(provider.providerKey, { baseUrl: e.target.value })}
                                            />
                                        </div>
                                        <div className={vStyles.formField}>
                                            <label>
                                                {labels.token}
                                                {provider.hasToken ? ` (فعلی: ${provider.tokenPreview})` : ' (تنظیم نشده)'}
                                            </label>
                                            <input
                                                type="password"
                                                dir="ltr"
                                                value={form.apiToken}
                                                placeholder={provider.hasToken ? 'برای تغییر، مقدار جدید را وارد کنید' : 'توکن/توکن دسترسی پلتفرم'}
                                                onChange={(e) => updateForm(provider.providerKey, { apiToken: e.target.value })}
                                            />
                                            {labels.tokenHint && <p className={vStyles.hint}>{labels.tokenHint}. خالی بگذارید تا مقدار فعلی حفظ شود.</p>}
                                        </div>

                                        {labels.showKeySecret && (
                                            <>
                                                <div className={vStyles.formField}>
                                                    <label>
                                                        کلید API
                                                        {provider.hasKey ? ` (فعلی: ${provider.keyPreview})` : ' (تنظیم نشده)'}
                                                    </label>
                                                    <input
                                                        type="password"
                                                        dir="ltr"
                                                        value={form.apiKey}
                                                        placeholder={provider.hasKey ? 'برای تغییر، مقدار جدید را وارد کنید' : 'Key'}
                                                        onChange={(e) => updateForm(provider.providerKey, { apiKey: e.target.value })}
                                                    />
                                                </div>
                                                <div className={vStyles.formField}>
                                                    <label>
                                                        رمز (Secret)
                                                        {provider.hasSecret ? ` (فعلی: ${provider.secretPreview})` : ' (تنظیم نشده)'}
                                                    </label>
                                                    <input
                                                        type="password"
                                                        dir="ltr"
                                                        value={form.apiSecret}
                                                        placeholder={provider.hasSecret ? 'برای تغییر، مقدار جدید را وارد کنید' : 'Pass / Secret'}
                                                        onChange={(e) => updateForm(provider.providerKey, { apiSecret: e.target.value })}
                                                    />
                                                </div>
                                            </>
                                        )}

                                        <div className={vStyles.formField}>
                                            <label>Timeout (میلی‌ثانیه)</label>
                                            <input
                                                type="number"
                                                dir="ltr"
                                                value={form.timeoutMs}
                                                onChange={(e) => updateForm(provider.providerKey, { timeoutMs: Number(e.target.value) || 20000 })}
                                            />
                                        </div>
                                    </div>

                                    <div className={vStyles.switchRow}>
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={form.sandbox}
                                                onChange={(e) => updateForm(provider.providerKey, { sandbox: e.target.checked })}
                                            />
                                            حالت آزمایشی (سندباکس — بدون استعلام واقعی)
                                        </label>
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={form.isActive}
                                                onChange={(e) => updateForm(provider.providerKey, { isActive: e.target.checked })}
                                            />
                                            پلتفرم فعال (فقط یک پلتفرم می‌تواند فعال باشد)
                                        </label>
                                    </div>

                                    <button
                                        type="button"
                                        className={styles.primaryBtn}
                                        onClick={() => void handleSave(provider)}
                                        disabled={saving}
                                        style={{ cursor: saving ? 'wait' : 'pointer' }}
                                    >
                                        {saving ? 'در حال ذخیره...' : 'ذخیره تنظیمات'}
                                    </button>
                                </div>
                            );
                        })}

                        <div className={vStyles.providerCard}>
                            <div className={vStyles.providerHeader}>
                                <h2>تست پلتفرم</h2>
                            </div>
                            <p className={vStyles.hint} style={{ marginBottom: '1rem' }}>
                                این تست فقط خروجی پلتفرم را نشان می‌دهد و در سابقه کاربران ثبت نمی‌شود. می‌توانید هر
                                پلتفرم پیکربندی‌شده را جداگانه آزمایش کنید.
                            </p>
                            <div className={vStyles.formGrid}>
                                <div className={vStyles.formField}>
                                    <label>پلتفرم</label>
                                    <select
                                        value={testProviderKey}
                                        onChange={(e) => setTestProviderKey(e.target.value)}
                                        className={styles.filterSelect}
                                    >
                                        <option value="">پلتفرم فعال</option>
                                        {providers.map((p) => (
                                            <option key={p._id} value={p.providerKey}>
                                                {p.providerKey} {p.isActive ? '(فعال)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className={vStyles.formField}>
                                    <label>شماره موبایل</label>
                                    <input
                                        type="tel"
                                        dir="ltr"
                                        placeholder="09xxxxxxxxx"
                                        value={testForm.mobile}
                                        onChange={(e) => setTestForm((prev) => ({ ...prev, mobile: e.target.value }))}
                                    />
                                </div>
                                <div className={vStyles.formField}>
                                    <label>کد ملی</label>
                                    <input
                                        type="text"
                                        dir="ltr"
                                        placeholder="0012345678"
                                        value={testForm.nationalCode}
                                        onChange={(e) => setTestForm((prev) => ({ ...prev, nationalCode: e.target.value }))}
                                    />
                                </div>
                            </div>
                            <button
                                type="button"
                                className={styles.primaryBtn}
                                onClick={() => void handleTest()}
                                disabled={testing}
                                style={{ cursor: testing ? 'wait' : 'pointer' }}
                            >
                                {testing ? 'در حال تست...' : 'اجرای تست'}
                            </button>

                            {testResult && (
                                <div className={`${vStyles.testResult} ${testResult.ok ? vStyles.ok : vStyles.fail}`}>
                                    {testResult.text}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </Wrapper>
        </Container>
    );
};

export default VerificationSettingsPage;
