'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { ErrorToaster } from '@my-workspace/utils';
import styles from '../../billing/gateways/GatewayForm.module.scss';
import hubStyles from '../../billing/Billing.module.scss';
import ExpandableSection from '../../billing/settings/ExpandableSection';
import {
    buildDefaultSmsConfig,
    getSmsProviderDefinition,
    getSmsSectionLabel,
    SMS_PATTERN_CONFIG_KEYS,
    SMS_PROVIDER_OPTIONS,
    SmsConfigField,
    SmsPatternRow,
    SmsProviderType,
} from './sms-provider.definitions';

export interface SmsProviderFormValues {
    slug: string;
    name: string;
    description: string;
    providerType: SmsProviderType;
    isActive: boolean;
    order: number;
    config: Record<string, string>;
}

interface SmsProviderFormProps {
    mode: 'create' | 'edit';
    /** فقط در حالت ویرایش — برای لود پترن‌های ذخیره‌شدهٔ همین پنل */
    providerId?: string;
    initialValues?: Partial<SmsProviderFormValues>;
    saving?: boolean;
    onSubmit: (values: SmsProviderFormValues) => void | Promise<void>;
}

const defaultValues: SmsProviderFormValues = {
    slug: '',
    name: '',
    description: '',
    providerType: 'iran_payamak',
    isActive: true,
    order: 0,
    config: buildDefaultSmsConfig('iran_payamak'),
};

function fieldsBySection(fields: SmsConfigField[]) {
    const order: SmsConfigField['section'][] = ['credentials', 'template', 'line'];
    return order
        .map(section => ({
            section,
            fields: fields.filter(f => f.section === section),
        }))
        .filter(g => g.fields.length > 0);
}

export default function SmsProviderForm({ mode, providerId, initialValues, saving, onSubmit }: SmsProviderFormProps) {
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const [form, setForm] = useState<SmsProviderFormValues>({ ...defaultValues, ...initialValues });
    const [patterns, setPatterns] = useState<SmsPatternRow[]>([]);

    const providerDef = useMemo(() => getSmsProviderDefinition(form.providerType), [form.providerType]);
    const sectionGroups = useMemo(() => fieldsBySection(providerDef.fields), [providerDef]);
    const patternKeys = SMS_PATTERN_CONFIG_KEYS[form.providerType];

    useEffect(() => {
        if (initialValues) {
            setForm(prev => ({
                ...prev,
                ...initialValues,
                config: {
                    ...buildDefaultSmsConfig((initialValues.providerType || prev.providerType) as SmsProviderType),
                    ...(initialValues.config || {}),
                },
            }));
        }
    }, [initialValues]);

    const handleProviderChange = (providerType: SmsProviderType) => {
        setForm(prev => ({
            ...prev,
            providerType,
            config: buildDefaultSmsConfig(providerType),
        }));
    };

    useEffect(() => {
        if (!providerId || !token) return;
        axios
            .get(`${baseUrl}/api/sms/providers/${providerId}/patterns`, {
                headers: { authorization: `Bearer ${token}` },
            })
            .then(res => setPatterns(res.data?.data || []))
            .catch(ErrorToaster);
    }, [providerId, token, baseUrl]);

    const savedPatternId = useMemo(() => {
        const code = String(form.config[patternKeys.code] ?? '').trim();
        if (!code) return '';
        return patterns.find(p => p.code.trim() === code)?._id || '';
    }, [form.config, patternKeys.code, patterns]);

    const applyPattern = (patternId: string) => {
        const pattern = patterns.find(p => p._id === patternId);
        if (!pattern) return;
        setForm(prev => ({
            ...prev,
            config: {
                ...prev.config,
                [patternKeys.code]: pattern.code,
                ...(patternKeys.varName && pattern.varName
                    ? { [patternKeys.varName]: pattern.varName }
                    : {}),
            },
        }));
    };

    const updateConfig = (key: string, value: string) => {
        setForm(prev => ({
            ...prev,
            config: { ...prev.config, [key]: value },
        }));
    };

    const renderField = (field: SmsConfigField) => {
        const value = form.config[field.key] ?? field.defaultValue ?? '';
        return (
            <div key={field.key} className={styles.formGroup}>
                <label htmlFor={field.key}>{field.label}</label>
                {field.type === 'select' ? (
                    <select
                        id={field.key}
                        value={value}
                        onChange={e => updateConfig(field.key, e.target.value)}
                    >
                        {(field.options || []).map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                ) : (
                    <input
                        id={field.key}
                        type={field.type === 'url' ? 'url' : 'text'}
                        placeholder={field.placeholder}
                        autoComplete="off"
                        value={value}
                        onChange={e => updateConfig(field.key, e.target.value)}
                    />
                )}
                {field.helpText ? <span className={styles.helperText}>{field.helpText}</span> : null}
            </div>
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(form);
    };

    return (
        <div className={styles.formPage}>
            <header className={styles.pageHeader}>
                <Link href="/settings/sms" className={styles.backLink}>← بازگشت به پنل‌های پیامک</Link>
                <h1 className={hubStyles.mainTitle}>
                    {mode === 'create' ? 'افزودن پنل پیامک' : `ویرایش پنل: ${form.name}`}
                </h1>
                <p className={hubStyles.subtitle}>{providerDef.description}</p>
            </header>

            <form onSubmit={handleSubmit}>
                <div className={styles.formLayout}>
                    <div className={styles.formMain}>
                        <ExpandableSection
                            title="اطلاعات پنل"
                            subtitle="شناسه، نام، نوع سرویس‌دهنده و وضعیت"
                            defaultOpen
                        >
                            <div className={styles.sectionInner}>
                                <div className={styles.formGroup}>
                                    <label>شناسه یکتا (slug لاتین)</label>
                                    <input
                                        value={form.slug}
                                        disabled={mode === 'edit'}
                                        onChange={e => setForm(p => ({ ...p, slug: e.target.value.toLowerCase().trim() }))}
                                        placeholder="iran-payamak-main"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>نام نمایشی</label>
                                    <input
                                        value={form.name}
                                        onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>توضیح</label>
                                    <textarea
                                        rows={2}
                                        value={form.description}
                                        onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>نوع پنل</label>
                                    <select
                                        value={form.providerType}
                                        onChange={e => handleProviderChange(e.target.value as SmsProviderType)}
                                    >
                                        {SMS_PROVIDER_OPTIONS.map(o => (
                                            <option key={o.value} value={o.value}>{o.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className={styles.rowGroup}>
                                    <div className={styles.formGroup}>
                                        <label>ترتیب (order)</label>
                                        <input
                                            type="number"
                                            value={form.order}
                                            onChange={e => setForm(p => ({ ...p, order: Number(e.target.value) || 0 }))}
                                        />
                                    </div>
                                    <label className={styles.checkboxLabel}>
                                        <input
                                            type="checkbox"
                                            checked={form.isActive}
                                            onChange={e => setForm(p => ({ ...p, isActive: e.target.checked }))}
                                        />
                                        فعال
                                    </label>
                                </div>
                            </div>
                        </ExpandableSection>

                        {sectionGroups.map(({ section, fields }) => (
                            <ExpandableSection
                                key={section}
                                title={getSmsSectionLabel(section, form.providerType)}
                                subtitle={
                                    section === 'template'
                                        ? 'شناسه یا کد قالب OTP و نام متغیر کد — مطابق پنل سرویس‌دهنده'
                                        : undefined
                                }
                                defaultOpen
                            >
                                <div className={styles.sectionInner}>
                                    {section === 'template' && patterns.length > 0 ? (
                                        <div className={styles.formGroup}>
                                            <label htmlFor="saved-pattern-select">
                                                انتخاب از پترن‌های ذخیره‌شده
                                            </label>
                                            <select
                                                id="saved-pattern-select"
                                                value={savedPatternId}
                                                onChange={e => applyPattern(e.target.value)}
                                            >
                                                <option value="">— انتخاب نکنید (ورود دستی)</option>
                                                {patterns.map(p => (
                                                    <option key={p._id} value={p._id}>
                                                        {p.title ? `${p.title} — ` : ''}{p.code}
                                                    </option>
                                                ))}
                                            </select>
                                            <span className={styles.helperText}>
                                                پترن انتخابی، کد قالب و نام متغیر را در فیلدهای زیر
                                                جای‌گذاری می‌کند. پترن‌های جدید را در تب «پترن‌ها» اضافه کنید.
                                            </span>
                                        </div>
                                    ) : null}
                                    {fields.map(renderField)}
                                </div>
                            </ExpandableSection>
                        ))}
                    </div>

                    <aside className={styles.formSidebar}>
                        <div className={styles.sectionCard}>
                            <h3>راهنما</h3>
                            <p style={{ fontSize: '0.85rem', lineHeight: 1.7, margin: 0, color: 'var(--body-text-color)' }}>
                                پس از ذخیره، در لیست پنل‌ها «پنل فعال OTP» را انتخاب کنید. فیلدهای خالی در
                                صورت پیکربندی سرور از متغیرهای محیطی پر می‌شوند.
                            </p>
                        </div>
                        <button type="submit" className={hubStyles.primaryBtn} disabled={saving}>
                            {saving ? 'در حال ذخیره…' : mode === 'create' ? 'ایجاد پنل' : 'ذخیره تغییرات'}
                        </button>
                    </aside>
                </div>
            </form>
        </div>
    );
}
