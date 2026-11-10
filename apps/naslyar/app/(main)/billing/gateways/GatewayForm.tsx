'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import styles from './GatewayForm.module.scss';
import hubStyles from '../Billing.module.scss';
import ExpandableSection from '../settings/ExpandableSection';
import {
    buildDefaultConfig,
    getProviderDefinition,
    PROVIDER_OPTIONS,
    SLUG_PROVIDER_MAP,
    GatewayProviderType,
    GatewayConfigField,
    normalizeGatewayConfig,
} from './gateway-config.definitions';

export interface GatewayFormValues {
    slug: string;
    name: string;
    description: string;
    category: 'direct' | 'installment';
    providerType: GatewayProviderType;
    isActive: boolean;
    showInCheckout: boolean;
    order: number;
    logoSvg: string;
    logoUrl: string;
    config: Record<string, unknown>;
}

interface GatewayFormProps {
    mode: 'create' | 'edit';
    initialValues?: Partial<GatewayFormValues>;
    saving?: boolean;
    onSubmit: (values: GatewayFormValues) => void | Promise<void>;
}

const defaultValues: GatewayFormValues = {
    slug: '',
    name: '',
    description: '',
    category: 'direct',
    providerType: 'zarinpal',
    isActive: true,
    showInCheckout: true,
    order: 0,
    logoSvg: '',
    logoUrl: '',
    config: buildDefaultConfig('zarinpal'),
};

export default function GatewayForm({ mode, initialValues, saving, onSubmit }: GatewayFormProps) {
    const [form, setForm] = useState<GatewayFormValues>({ ...defaultValues, ...initialValues });
    const [showAdvancedJson, setShowAdvancedJson] = useState(false);
    const [configJson, setConfigJson] = useState('');

    const providerDef = useMemo(() => getProviderDefinition(form.providerType), [form.providerType]);

    useEffect(() => {
        if (initialValues) {
            const providerType = (initialValues.providerType || 'zarinpal') as GatewayProviderType;
            setForm(prev => ({
                ...prev,
                ...initialValues,
                providerType,
                config: normalizeGatewayConfig(providerType, initialValues.config || prev.config),
            }));
        }
    }, [initialValues]);

    useEffect(() => {
        setConfigJson(JSON.stringify(form.config, null, 2));
    }, [form.config]);

    const handleProviderChange = (providerType: GatewayProviderType) => {
        setForm(prev => ({
            ...prev,
            providerType,
            config: buildDefaultConfig(providerType),
        }));
    };

    const handleSlugChange = (slug: string) => {
        const normalized = slug.toLowerCase().trim();
        const mappedProvider = SLUG_PROVIDER_MAP[normalized];
        setForm(prev => ({
            ...prev,
            slug: normalized,
            ...(mode === 'create' && mappedProvider && prev.providerType === 'zarinpal'
                ? { providerType: mappedProvider, config: buildDefaultConfig(mappedProvider) }
                : {}),
        }));
    };

    const updateConfigField = (key: string, value: unknown) => {
        setForm(prev => ({
            ...prev,
            config: { ...prev.config, [key]: value },
        }));
    };

    const fieldGroups = useMemo(() => {
        const groups: { key: string; title?: string; hint?: string; fields: GatewayConfigField[] }[] = [];
        for (const field of providerDef.fields) {
            const key = field.section || 'default';
            const last = groups[groups.length - 1];
            if (last?.key === key) {
                last.fields.push(field);
                continue;
            }
            const meta = providerDef.fieldSections?.[key];
            groups.push({
                key,
                title: meta?.title,
                hint: meta?.hint,
                fields: [field],
            });
        }
        return groups;
    }, [providerDef]);

    const sandboxEnabled = Boolean(form.config.sandbox);

    const renderConfigField = (field: GatewayConfigField) => (
        <div key={field.key} className={styles.formGroup}>
            <label>{field.label}{field.required ? ' *' : ''}</label>
            {field.type === 'boolean' ? (
                <label className={styles.checkboxLabel}>
                    <input
                        type="checkbox"
                        checked={Boolean(form.config[field.key] ?? field.defaultValue)}
                        onChange={e => updateConfigField(field.key, e.target.checked)}
                    />
                    {field.helpText || 'فعال'}
                </label>
            ) : field.type === 'select' ? (
                <select
                    value={String(form.config[field.key] ?? field.defaultValue ?? '')}
                    onChange={e => updateConfigField(field.key, e.target.value)}
                >
                    {field.options?.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            ) : field.type === 'textarea' ? (
                <textarea
                    rows={4}
                    required={field.required}
                    placeholder={field.placeholder}
                    value={String(form.config[field.key] ?? '')}
                    onChange={e => updateConfigField(field.key, e.target.value)}
                />
            ) : (
                <input
                    type={field.type === 'password' ? 'password' : 'text'}
                    required={field.required}
                    placeholder={field.placeholder}
                    value={String(form.config[field.key] ?? '')}
                    onChange={e => updateConfigField(field.key, e.target.value)}
                />
            )}
            {field.helpText && field.type !== 'boolean' && (
                <span className={styles.helperText}>{field.helpText}</span>
            )}
        </div>
    );

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            ...form,
            config: normalizeGatewayConfig(form.providerType, form.config),
        });
    };

    const applyJsonConfig = () => {
        try {
            const parsed = JSON.parse(configJson || '{}');
            setForm(prev => ({
                ...prev,
                config: normalizeGatewayConfig(prev.providerType, parsed),
            }));
        } catch {
            alert('JSON تنظیمات نامعتبر است');
        }
    };

    return (
        <div className={styles.formPage}>
            <header className={styles.pageHeader}>
                <Link href="/billing/gateways" className={styles.backLink}>← بازگشت به لیست درگاه‌ها</Link>
                <h1 className={hubStyles.mainTitle}>
                    {mode === 'create' ? 'افزودن درگاه پرداخت' : `ویرایش درگاه: ${form.name}`}
                </h1>
                <p className={hubStyles.subtitle}>
                    پارامترهای API هر درگاه را مطابق مستندات رسمی وارد کنید. برای تست، حالت Sandbox زرین‌پال را فعال کنید.
                </p>
            </header>

            <div className={styles.guideGrid} style={{ marginBottom: '24px' }}>
                <div className={styles.guideCard}>
                    <strong>راهنمای لوگو</strong>
                    <ul style={{ margin: '6px 0 0', paddingRight: '18px' }}>
                        <li><strong>logoSvg:</strong> محتوای SVG را paste کنید</li>
                        <li><strong>logoUrl:</strong> URL عمومی پس از آپلود روی CDN</li>
                    </ul>
                </div>
                <div className={styles.guideCard}>
                    <strong>تست پرداخت</strong>
                    برای زرین‌پال، سوییچ Sandbox را خاموش کنید تا آدرس‌های واقعی استفاده شوند. Merchant ID محیط واقعی با sandbox فرق دارد.
                    {providerDef.docUrl && (
                        <> <a href={providerDef.docUrl} target="_blank" rel="noreferrer">مستندات رسمی</a></>
                    )}
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <div className={styles.formLayout}>
                    <div className={styles.formMain}>
                        <ExpandableSection
                            title="اطلاعات پایه درگاه"
                            subtitle="شناسه، نام، دسته و وضعیت نمایش در checkout"
                            defaultOpen
                        >
                            <div className={styles.sectionInner}>
                            <div className={styles.rowGroup}>
                                <div className={styles.formGroup}>
                                    <label>شناسه (slug) *</label>
                                    <input
                                        required
                                        value={form.slug}
                                        onChange={e => handleSlugChange(e.target.value)}
                                        placeholder="zarinpal"
                                        disabled={mode === 'edit'}
                                    />
                                    <span className={styles.helperText}>یکتا — در callback استفاده می‌شود</span>
                                </div>
                                <div className={styles.formGroup}>
                                    <label>نام نمایشی *</label>
                                    <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="زرین‌پال" />
                                </div>
                            </div>
                            <div className={styles.formGroup}>
                                <label>توضیح کوتاه</label>
                                <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                            </div>
                            <div className={styles.rowGroup}>
                                <div className={styles.formGroup}>
                                    <label>دسته</label>
                                    <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value as 'direct' | 'installment' })}>
                                        <option value="direct">پرداخت مستقیم</option>
                                        <option value="installment">اقساطی</option>
                                    </select>
                                </div>
                                <div className={styles.formGroup}>
                                    <label>نوع Provider *</label>
                                    <select value={form.providerType} onChange={e => handleProviderChange(e.target.value as GatewayProviderType)}>
                                        {PROVIDER_OPTIONS.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className={styles.rowGroup}>
                                <div className={styles.formGroup}>
                                    <label>ترتیب نمایش</label>
                                    <input type="number" value={form.order} onChange={e => setForm({ ...form, order: Number(e.target.value) })} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>وضعیت</label>
                                    <div className={styles.checkboxGroup}>
                                        <label className={styles.checkboxLabel}>
                                            <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} />
                                            فعال
                                        </label>
                                        <label className={styles.checkboxLabel}>
                                            <input type="checkbox" checked={form.showInCheckout} onChange={e => setForm({ ...form, showInCheckout: e.target.checked })} />
                                            نمایش در checkout
                                        </label>
                                    </div>
                                </div>
                            </div>
                            </div>
                        </ExpandableSection>

                        <ExpandableSection
                            title="تنظیمات API درگاه"
                            subtitle={providerDef.description}
                            defaultOpen
                            badge={<span className={styles.providerBadge}>{providerDef.label}</span>}
                        >
                            <div className={styles.sectionInner}>
                            {form.providerType === 'zarinpal' && (
                                <div className={`${styles.envBanner} ${sandboxEnabled ? styles.envSandbox : styles.envLive}`}>
                                    {sandboxEnabled
                                        ? 'Sandbox روشن است — پرداخت‌ها به محیط تست زرین‌پال می‌روند.'
                                        : 'Sandbox خاموش است — پرداخت‌ها به محیط واقعی زرین‌پال می‌روند.'}
                                </div>
                            )}
                            <div className={styles.configFields}>
                                {fieldGroups.map(group => {
                                    if (!group.title) {
                                        return (
                                            <div key={group.key}>
                                                {group.fields.map(renderConfigField)}
                                            </div>
                                        );
                                    }
                                    const isLiveGroup = group.key === 'live';
                                    const isSandboxGroup = group.key === 'sandbox';
                                    const isActive = isLiveGroup
                                        ? !sandboxEnabled
                                        : isSandboxGroup
                                            ? sandboxEnabled
                                            : undefined;
                                    return (
                                        <div
                                            key={group.key}
                                            className={`${styles.fieldGroup} ${
                                                isActive === true
                                                    ? styles.fieldGroupActive
                                                    : isActive === false
                                                        ? styles.fieldGroupInactive
                                                        : ''
                                            }`}
                                        >
                                            <div className={styles.fieldGroupHeader}>
                                                <strong>{group.title}</strong>
                                                {isActive === true && <span className={styles.activeChip}>در حال استفاده</span>}
                                                {group.hint && <p>{group.hint}</p>}
                                            </div>
                                            {group.fields.map(renderConfigField)}
                                        </div>
                                    );
                                })}
                            </div>

                            <button type="button" className={styles.advancedToggle} onClick={() => setShowAdvancedJson(v => !v)}>
                                {showAdvancedJson ? '▲ بستن JSON پیشرفته' : '▼ ویرایش JSON پیشرفته'}
                            </button>
                            {showAdvancedJson && (
                                <div className={styles.jsonFallback}>
                                    <div className={styles.formGroup}>
                                        <textarea rows={8} value={configJson} onChange={e => setConfigJson(e.target.value)} />
                                        <button type="button" className={hubStyles.secondaryBtn} onClick={applyJsonConfig}>اعمال JSON</button>
                                    </div>
                                </div>
                            )}
                            </div>
                        </ExpandableSection>

                        <ExpandableSection title="لوگو و برند درگاه" subtitle="SVG یا URL عمومی">
                            <div className={styles.sectionInner}>
                            <div className={styles.formGroup}>
                                <label>لوگو SVG (paste)</label>
                                <textarea rows={5} value={form.logoSvg} onChange={e => setForm({ ...form, logoSvg: e.target.value })} placeholder="<svg>...</svg>" />
                            </div>
                            <div className={styles.formGroup}>
                                <label>آدرس لوگو (URL)</label>
                                <input value={form.logoUrl} onChange={e => setForm({ ...form, logoUrl: e.target.value })} placeholder="https://cdn.example.com/gateways/zarinpal.svg" />
                            </div>
                            </div>
                        </ExpandableSection>

                        <div className={styles.formActions}>
                            <button type="submit" className={hubStyles.primaryBtn} disabled={saving}>
                                {saving ? 'در حال ذخیره...' : mode === 'create' ? 'ذخیره درگاه' : 'ذخیره تغییرات'}
                            </button>
                            <Link href="/billing/gateways" className={styles.cancelBtn}>انصراف</Link>
                        </div>
                    </div>

                    <aside className={styles.formSidebar}>
                        {(form.logoSvg || form.logoUrl) && (
                            <div className={styles.sectionCard}>
                                <h3>پیش‌نمایش لوگو</h3>
                                <div className={styles.logoPreviewBox}>
                                    {form.logoUrl ? (
                                        <img src={form.logoUrl} alt="preview" width={72} height={72} />
                                    ) : (
                                        <div dangerouslySetInnerHTML={{ __html: form.logoSvg }} />
                                    )}
                                </div>
                            </div>
                        )}
                        <div className={styles.sectionCard}>
                            <h3>جاب‌های پرداخت</h3>
                            <p className={styles.helperText}>
                                {form.providerType === 'card2card' ? (
                                    <>
                                        برای کارت‌به‌کارت جاب IPG اجرا نمی‌شود؛ پس از آپلود رسید، درخواست در
                                        {' '}<Link href="/billing/manual-payments">واریزهای دستی</Link>
                                        {' '}می‌ماند تا ادمین تأیید یا رد کند و سپس کیف پول شارژ شود.
                                    </>
                                ) : (
                                    <>
                                        پس از هر initiate، جاب <code>check_pending_payment</code> (۱۵ دقیقه) و در صورت خطای شبکه،
                                        <code> retry_verification</code> ثبت می‌شود.
                                    </>
                                )}
                            </p>
                            <Link
                                href={form.providerType === 'card2card' ? '/billing/manual-payments' : '/billing/payment-jobs'}
                                className={hubStyles.secondaryBtn}
                                style={{ display: 'inline-block', marginTop: '8px' }}
                            >
                                {form.providerType === 'card2card' ? 'صف واریز دستی' : 'مانیتور جاب‌ها'}
                            </Link>
                        </div>
                    </aside>
                </div>
            </form>
        </div>
    );
}
