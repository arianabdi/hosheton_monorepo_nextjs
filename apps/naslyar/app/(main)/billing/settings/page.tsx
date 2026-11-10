'use client';

import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import hubStyles from '../Billing.module.scss';
import localStyles from './BillingSettings.module.scss';
import ExpandableSection from './ExpandableSection';
import { Container, Wrapper } from '@/app/(main)/layout';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { ErrorToaster, SuccessToaster, toFarsiNumber } from '@my-workspace/utils';

type WalletCurrencyCode = 'USD' | 'EUR' | 'CNY' | 'GBP' | 'AED' | 'IRT' | 'IRR';

interface WalletRechargePackageForm {
    label: string;
    amount: number;
    bonusPercent: number;
    order: number;
    isActive: boolean;
}

interface FxRate {
    code: string;
    labelFa: string;
    profileUrl: string;
    priceRial: number;
    priceRialFormatted: string;
    priceToman: number;
    updatedAt: string;
    updatedAtFa?: string;
}

interface FxSnapshot {
    source: string;
    fetchedAt: string;
    rates: FxRate[];
}

const WALLET_CURRENCY_OPTIONS: { value: WalletCurrencyCode; label: string }[] = [
    { value: 'USD', label: 'دلار (USD)' },
    { value: 'EUR', label: 'یورو (EUR)' },
    { value: 'CNY', label: 'یوان (CNY)' },
    { value: 'GBP', label: 'پوند (GBP)' },
    { value: 'AED', label: 'درهم (AED)' },
    { value: 'IRT', label: 'تومان (IRT)' },
    { value: 'IRR', label: 'ریال (IRR)' },
];

function formatFaDateTime(iso: string) {
    try {
        return new Intl.DateTimeFormat('fa-IR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        }).format(new Date(iso));
    } catch {
        return iso;
    }
}

function emptyPackage(order: number): WalletRechargePackageForm {
    return { label: '', amount: 0, bonusPercent: 0, order, isActive: true };
}

export default function BillingSettingsPage() {
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [fxLoading, setFxLoading] = useState(false);
    const [fx, setFx] = useState<FxSnapshot | null>(null);

    const [form, setForm] = useState({
        vatEnabled: true,
        vatPercent: 9,
        currency: 'IRT',
        walletCurrency: 'USD' as WalletCurrencyCode,
        walletRechargePackages: [] as WalletRechargePackageForm[],
        signupBonusAmount: 0,
        aiUsageMarkupPercent: 20,
        aiGenerationSafeMarginPercent: 20,
        frontendUrl: '',
        paymentSuccessPath: '/payment/success',
        paymentFailedPath: '/payment/failed',
        apiPublicUrl: '',
    });

    const loadFx = useCallback(async (refresh = false) => {
        try {
            setFxLoading(true);
            const url = refresh
                ? `${baseUrl}/api/billing/exchange-rates?refresh=1`
                : `${baseUrl}/api/billing/exchange-rates`;
            const res = await axios.get(url);
            if (res.data?.statusCode === 200) {
                setFx(res.data.data as FxSnapshot);
            }
        } catch (err) {
            ErrorToaster(err);
        } finally {
            setFxLoading(false);
        }
    }, [baseUrl]);

    useEffect(() => {
        if (!token) return;
        Promise.all([
            axios.get(`${baseUrl}/api/billing/settings`, {
                headers: { authorization: `Bearer ${token}` },
            }),
            loadFx(false),
        ]).then(([settingsRes]) => {
            if (settingsRes.data.statusCode === 200) {
                const s = settingsRes.data.data;
                const packages = (s.walletRechargePackages || []).map((p: WalletRechargePackageForm, i: number) => ({
                    label: p.label || '',
                    amount: Number(p.amount) || 0,
                    bonusPercent: Number(p.bonusPercent) || 0,
                    order: p.order ?? i,
                    isActive: p.isActive !== false,
                }));
                setForm({
                    vatEnabled: s.vatEnabled ?? true,
                    vatPercent: s.vatPercent ?? 9,
                    currency: s.currency || 'IRT',
                    walletCurrency: (s.walletCurrency || s.walletSuggestedCurrency || 'USD') as WalletCurrencyCode,
                    walletRechargePackages: packages,
                    signupBonusAmount: Number(s.signupBonusAmount) || 0,
                    aiUsageMarkupPercent: s.aiUsageMarkupPercent ?? 20,
                    aiGenerationSafeMarginPercent: s.aiGenerationSafeMarginPercent ?? 20,
                    frontendUrl: s.frontendUrl || '',
                    paymentSuccessPath: s.paymentSuccessPath || '/payment/success',
                    paymentFailedPath: s.paymentFailedPath || '/payment/failed',
                    apiPublicUrl: s.apiPublicUrl || '',
                });
            }
        }).catch(ErrorToaster).finally(() => setLoading(false));
    }, [token, baseUrl, loadFx]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;
        try {
            setSaving(true);
            await axios.put(`${baseUrl}/api/billing/settings`, {
                ...form,
                walletSuggestedCurrency: form.walletCurrency,
            }, {
                headers: { authorization: `Bearer ${token}` },
            });
            SuccessToaster({ message: 'تنظیمات ذخیره شد' });
        } catch (err) {
            ErrorToaster(err);
        } finally {
            setSaving(false);
        }
    };

    const updatePackage = (index: number, patch: Partial<WalletRechargePackageForm>) => {
        setForm(prev => {
            const next = [...prev.walletRechargePackages];
            next[index] = { ...next[index], ...patch };
            return { ...prev, walletRechargePackages: next };
        });
    };

    const addPackage = () => {
        setForm(prev => ({
            ...prev,
            walletRechargePackages: [
                ...prev.walletRechargePackages,
                emptyPackage(prev.walletRechargePackages.length),
            ],
        }));
    };

    const removePackage = (index: number) => {
        setForm(prev => ({
            ...prev,
            walletRechargePackages: prev.walletRechargePackages.filter((_, i) => i !== index),
        }));
    };

    const previewReturnUrl = (path: string) => {
        const base = form.frontendUrl.trim().replace(/\/+$/, '');
        const raw = path.trim() || '/';
        if (/^https?:\/\//i.test(raw)) return raw;
        const normalized = raw.startsWith('/') ? raw : `/${raw}`;
        return base ? `${base}${normalized}` : normalized;
    };

    const previewSubtotal = 1000000;
    const previewTax = form.vatEnabled ? Math.floor(previewSubtotal * form.vatPercent / 100) : 0;
    const previewGross = previewSubtotal + previewTax;
    const previewVendorUsd = 100;
    const previewChargedUsd = previewVendorUsd * (1 + (form.aiUsageMarkupPercent || 0) / 100);
    const previewRequiredUsd = previewChargedUsd
        * (1 + (form.aiGenerationSafeMarginPercent || 0) / 100);

    return (
        <Container>
            <Wrapper>
                <div className={`${localStyles.page} ${hubStyles.rtl}`}>
                    <header className={localStyles.header}>
                        <div>
                            <h1 className={localStyles.mainTitle}>تنظیمات مالی و کیف پول</h1>
                            <p className={localStyles.subtitle}>
                                بخش‌ها پیش‌فرض باز هستند؛ در صورت نیاز جمع کنید. نرخ ارز از{' '}
                                <a href="https://www.tgju.org" target="_blank" rel="noreferrer">tgju.org</a>.
                            </p>
                        </div>
                    </header>

                    {loading ? (
                        <p className={localStyles.loadingText}>در حال بارگذاری...</p>
                    ) : (
                        <form className={localStyles.form} onSubmit={handleSave}>
                            <div className={localStyles.itemList}>
                            <ExpandableSection
                                title="آدرس‌های بازگشت درگاه پرداخت"
                                subtitle="برای هر کسب‌وکار جدا ذخیره می‌شود. بعد از پرداخت، کاربر به UI همین کسب‌وکار برمی‌گردد."
                            >
                                <p className={localStyles.hint}>
                                    اگر خالی بماند، API از متغیر محیطی <code>FRONTEND_URL</code> / <code>API_PUBLIC_URL</code> استفاده می‌کند.
                                    برای تست لوکال هوشتون استودیو معمولاً UI روی <code>http://localhost:3001</code> و API روی <code>http://localhost:3379</code> است.
                                </p>
                                <div className={hubStyles.field}>
                                    <label>آدرس فرانت‌اند (FRONTEND_URL)</label>
                                    <input
                                        dir="ltr"
                                        value={form.frontendUrl}
                                        onChange={e => setForm({ ...form, frontendUrl: e.target.value })}
                                        placeholder="http://localhost:3001"
                                    />
                                    <span className={localStyles.hint}>
                                        مبدأ اپ مشتری؛ مثلاً <code>https://studio.hosheton.com</code>
                                    </span>
                                </div>
                                <div className={hubStyles.row}>
                                    <div className={hubStyles.field}>
                                        <label>مسیر پرداخت موفق</label>
                                        <input
                                            dir="ltr"
                                            value={form.paymentSuccessPath}
                                            onChange={e => setForm({ ...form, paymentSuccessPath: e.target.value })}
                                            placeholder="/payment/success"
                                        />
                                    </div>
                                    <div className={hubStyles.field}>
                                        <label>مسیر پرداخت ناموفق</label>
                                        <input
                                            dir="ltr"
                                            value={form.paymentFailedPath}
                                            onChange={e => setForm({ ...form, paymentFailedPath: e.target.value })}
                                            placeholder="/payment/failed"
                                        />
                                    </div>
                                </div>
                                <div className={hubStyles.field}>
                                    <label>آدرس عمومی API برای callback درگاه</label>
                                    <input
                                        dir="ltr"
                                        value={form.apiPublicUrl}
                                        onChange={e => setForm({ ...form, apiPublicUrl: e.target.value })}
                                        placeholder="http://localhost:3379"
                                    />
                                    <span className={localStyles.hint}>
                                        بانکی که کاربر را برمی‌گرداند باید به همین origin برسد؛ مثلاً
                                        {' '}<code>{(form.apiPublicUrl || 'http://localhost:3379').replace(/\/+$/, '')}/api/billing/recharge/callback</code>
                                    </span>
                                </div>
                                <div className={localStyles.inlineHelp}>
                                    <strong>پیش‌نمایش بازگشت:</strong>
                                    <div className={localStyles.urlPreview} dir="ltr">
                                        موفق: {previewReturnUrl(form.paymentSuccessPath)}?invoiceId=…
                                    </div>
                                    <div className={localStyles.urlPreview} dir="ltr">
                                        ناموفق: {previewReturnUrl(form.paymentFailedPath)}?reason=…
                                    </div>
                                </div>
                            </ExpandableSection>
                            <ExpandableSection
                                title="ارزش افزوده و ارز پایه فاکتور"
                                subtitle="مالیات روی مبلغ پایه؛ کد تخفیف روی جمع قبل از پرداخت."
                            >
                                <div className={hubStyles.checkboxRow}>
                                    <input
                                        type="checkbox"
                                        id="vatEnabled"
                                        checked={form.vatEnabled}
                                        onChange={e => setForm({ ...form, vatEnabled: e.target.checked })}
                                    />
                                    <label htmlFor="vatEnabled">فعال بودن ارزش افزوده</label>
                                </div>
                                <div className={hubStyles.field}>
                                    <label>درصد ارزش افزوده</label>
                                    <input
                                        type="number"
                                        min={0}
                                        max={100}
                                        disabled={!form.vatEnabled}
                                        value={form.vatPercent}
                                        onChange={e => setForm({ ...form, vatPercent: Number(e.target.value) })}
                                    />
                                </div>
                                <div className={hubStyles.field}>
                                    <label>واحد پول پیش‌فرض صورتحساب</label>
                                    <input
                                        value={form.currency}
                                        onChange={e => setForm({ ...form, currency: e.target.value })}
                                        placeholder="IRT"
                                    />
                                </div>
                                <div className={localStyles.inlineHelp}>
                                    <strong>پیش‌نمایش (پایه {toFarsiNumber('1,000,000')} تومان):</strong>
                                    <div style={{ marginTop: 8 }}>
                                        مالیات: {toFarsiNumber(previewTax.toLocaleString())} — جمع: {toFarsiNumber(previewGross.toLocaleString())}
                                    </div>
                                </div>
                            </ExpandableSection>

                            <ExpandableSection
                                title="کیف پول اپلیکیشن"
                                subtitle="ارز موجودی و بسته‌های پیشنهادی شارژ (با درصد هدیه روی اعتبار، نه روی مبلغ درگاه)."
                            >
                                <p className={localStyles.hint}>
                                    موجودی کاربر به همین ارز نگه‌داری می‌شود. پرداخت از درگاه ریالی/تومانی است؛
                                    مبلغ واریزی به کیف = مقدار بسته + درصد هدیه.
                                </p>
                                <div className={localStyles.currencyGrid}>
                                    {WALLET_CURRENCY_OPTIONS.map(opt => (
                                        <label key={opt.value} className={localStyles.currencyOption}>
                                            <input
                                                type="radio"
                                                name="walletCurrency"
                                                checked={form.walletCurrency === opt.value}
                                                onChange={() => setForm({ ...form, walletCurrency: opt.value })}
                                            />
                                            <span>{opt.label}</span>
                                        </label>
                                    ))}
                                </div>

                                <div className={hubStyles.field}>
                                    <label>هدیه ثبت‌نام ({form.walletCurrency})</label>
                                    <input
                                        type="number"
                                        min={0}
                                        step="any"
                                        value={form.signupBonusAmount || 0}
                                        onChange={e => setForm({
                                            ...form,
                                            signupBonusAmount: Number(e.target.value) || 0,
                                        })}
                                    />
                                    <span className={localStyles.hint}>
                                        اگر کسی برای اولین بار ثبت‌نام کند (ایمیل یا تأیید OTP)، این مبلغ یک‌بار به کیف پولش اضافه می‌شود.
                                        صفر یعنی هدیه غیرفعال است.
                                    </span>
                                </div>

                                <div className={localStyles.pkgEditor}>
                                    <div className={localStyles.pkgEditorHead}>
                                        <strong>بسته‌های پیشنهادی شارژ</strong>
                                        <button type="button" className={hubStyles.secondaryBtn} onClick={addPackage}>
                                            + بسته
                                        </button>
                                    </div>
                                    {form.walletRechargePackages.length === 0 ? (
                                        <p className={localStyles.hint}>هنوز بسته‌ای تعریف نشده؛ «+ بسته» را بزنید.</p>
                                    ) : (
                                        form.walletRechargePackages.map((pkg, index) => (
                                            <div key={index} className={localStyles.pkgRow}>
                                                <input
                                                    placeholder="عنوان"
                                                    value={pkg.label}
                                                    onChange={e => updatePackage(index, { label: e.target.value })}
                                                />
                                                <input
                                                    type="number"
                                                    min={0}
                                                    step="any"
                                                    placeholder="مبلغ"
                                                    value={pkg.amount || ''}
                                                    onChange={e => updatePackage(index, { amount: Number(e.target.value) })}
                                                />
                                                <input
                                                    type="number"
                                                    min={0}
                                                    max={1000}
                                                    placeholder="٪ هدیه"
                                                    value={pkg.bonusPercent || ''}
                                                    onChange={e => updatePackage(index, { bonusPercent: Number(e.target.value) })}
                                                />
                                                <input
                                                    type="number"
                                                    placeholder="ترتیب"
                                                    value={pkg.order ?? index}
                                                    onChange={e => updatePackage(index, { order: Number(e.target.value) })}
                                                />
                                                <label className={localStyles.pkgActive}>
                                                    <input
                                                        type="checkbox"
                                                        checked={pkg.isActive}
                                                        onChange={e => updatePackage(index, { isActive: e.target.checked })}
                                                    />
                                                    فعال
                                                </label>
                                                <button type="button" className={localStyles.pkgRemove} onClick={() => removePackage(index)}>
                                                    حذف
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </ExpandableSection>

                            <ExpandableSection
                                title="قیمت لحظه‌ای ارز"
                                subtitle="tgju.org — فقط نمایش"
                                badge={
                                    fx?.fetchedAt ? (
                                        <span className={localStyles.fxBadge}>
                                            {formatFaDateTime(fx.fetchedAt)}
                                        </span>
                                    ) : null
                                }
                            >
                                <div className={localStyles.fxToolbar}>
                                    <button
                                        type="button"
                                        className={hubStyles.secondaryBtn}
                                        disabled={fxLoading}
                                        onClick={() => loadFx(true)}
                                    >
                                        {fxLoading ? '…' : 'بروزرسانی'}
                                    </button>
                                </div>
                                {fxLoading && !fx ? (
                                    <p className={localStyles.hint}>در حال دریافت…</p>
                                ) : (
                                    <table className={localStyles.fxTable}>
                                        <thead>
                                            <tr>
                                                <th>ارز</th>
                                                <th>ریال</th>
                                                <th>TGJU</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(fx?.rates || []).map(rate => (
                                                <tr key={rate.code}>
                                                    <td>
                                                        <a href={rate.profileUrl} target="_blank" rel="noreferrer">
                                                            {rate.labelFa}
                                                        </a>
                                                    </td>
                                                    <td>{toFarsiNumber(rate.priceRialFormatted)}</td>
                                                    <td className={localStyles.fxTime}>{rate.updatedAtFa || '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </ExpandableSection>

                            <ExpandableSection
                                title="مارکاپ مصرف هوش مصنوعی"
                                subtitle="فقط روی مصرف مدل‌ها و قیمت provider — روی شارژ کیف پول اثر ندارد."
                            >
                                <div className={hubStyles.field}>
                                    <label>درصد مارکاپ مصرف AI</label>
                                    <input
                                        type="number"
                                        min={0}
                                        max={1000}
                                        step={1}
                                        value={form.aiUsageMarkupPercent}
                                        onChange={e => setForm({ ...form, aiUsageMarkupPercent: Number(e.target.value) })}
                                    />
                                    <span className={localStyles.hint}>
                                        روی هزینه vendor هنگام مصرف اعمال می‌شود، نه هنگام شارژ کیف پول.
                                        مثال مصرف: vendor $100 → کسر ${previewChargedUsd.toFixed(0)} از کیف ({toFarsiNumber(String(form.aiUsageMarkupPercent))}٪).
                                    </span>
                                </div>
                                <div className={hubStyles.field}>
                                    <label>Safe Margin رزرو موجودی تولید AI</label>
                                    <input
                                        type="number"
                                        min={0}
                                        max={1000}
                                        step={1}
                                        value={form.aiGenerationSafeMarginPercent}
                                        onChange={e => setForm({
                                            ...form,
                                            aiGenerationSafeMarginPercent: Number(e.target.value),
                                        })}
                                    />
                                    <span className={localStyles.hint}>
                                        این درصد فقط موجودی لازم قبل از تولید را افزایش می‌دهد و از کیف پول کسر نمی‌شود.
                                        {' '}برای هزینه ${previewChargedUsd.toFixed(0)}، حداقل موجودی لازم ${previewRequiredUsd.toFixed(0)} است.
                                    </span>
                                </div>
                            </ExpandableSection>
                            </div>

                            <div className={localStyles.saveRow}>
                                <button type="submit" className={hubStyles.primaryBtn} disabled={saving}>
                                    {saving ? 'ذخیره...' : 'ذخیره تنظیمات'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </Wrapper>
        </Container>
    );
}
