'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../Marketing.module.scss';
import {
    ANALYTICS_PLATFORM_DEFINITIONS,
    PLATFORM_OPTIONS,
    isValidEmbedUrl,
    type AnalyticsPlatformDefinition,
} from '../platform.definitions';
import type { AnalyticsPlatformType, ConnectionFormValues } from '../marketing.types';

interface AnalyticsConnectionFormProps {
    initialValues: ConnectionFormValues;
    submitLabel: string;
    onSubmit: (values: ConnectionFormValues) => Promise<void>;
}

function buildInitialFields(def: AnalyticsPlatformDefinition, values: ConnectionFormValues): Record<string, string> {
    const fields: Record<string, string> = {};
    def.fields.forEach((field) => {
        const current = values[field.key as keyof ConnectionFormValues];
        fields[field.key] = typeof current === 'string' ? current : '';
    });
    return fields;
}

export default function AnalyticsConnectionForm({
    initialValues,
    submitLabel,
    onSubmit,
}: AnalyticsConnectionFormProps) {
    const router = useRouter();
    const [platform, setPlatform] = useState<AnalyticsPlatformType>(initialValues.platform);
    const [fields, setFields] = useState<Record<string, string>>(() =>
        buildInitialFields(ANALYTICS_PLATFORM_DEFINITIONS[initialValues.platform], initialValues),
    );
    const [isActive, setIsActive] = useState(initialValues.isActive);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);

    const def = ANALYTICS_PLATFORM_DEFINITIONS[platform];

    const changePlatform = (value: string) => {
        const next = value as AnalyticsPlatformType;
        const nextDef = ANALYTICS_PLATFORM_DEFINITIONS[next];
        setPlatform(next);
        setFields(buildInitialFields(nextDef, initialValues));
        setErrors({});
    };

    const setField = (key: string, value: string) => {
        setFields((prev) => ({ ...prev, [key]: value }));
        if (errors[key]) {
            setErrors((prev) => {
                const next = { ...prev };
                delete next[key];
                return next;
            });
        }
    };

    const validate = (): boolean => {
        const nextErrors: Record<string, string> = {};
        def.fields.forEach((field) => {
            const value = fields[field.key]?.trim() || '';
            if (field.required && !value) {
                nextErrors[field.key] = 'این فیلد الزامی است';
            }
            if (field.key === 'embedUrl' && value && !isValidEmbedUrl(value)) {
                nextErrors.embedUrl = 'لینک باید از نوع embed گزارش Looker Studio باشد (lookerstudio.google.com/embed/reporting/...)';
            }
        });
        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setSaving(true);
        try {
            await onSubmit({
                platform,
                title: fields.title || '',
                propertyName: fields.propertyName || '',
                propertyId: fields.propertyId || '',
                embedUrl: fields.embedUrl || '',
                notes: fields.notes || '',
                isActive,
            });
        } finally {
            setSaving(false);
        }
    };

    const embedUrl = fields.embedUrl || '';
    const embedPreviewValid = isValidEmbedUrl(embedUrl);

    return (
        <div className={styles.formCard}>
            <div className={styles.formSection}>
                <h3 className={styles.formSectionTitle}>پلتفرم آنالیتیکس</h3>
                <div className={styles.field}>
                    <label>پلتفرم</label>
                    <select value={platform} onChange={(e) => changePlatform(e.target.value)}>
                        {PLATFORM_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value} disabled={!opt.available}>
                                {opt.label} {opt.available ? '' : '(به‌زودی)'}
                            </option>
                        ))}
                    </select>
                    <span className={styles.fieldHint}>{def.description}</span>
                </div>
            </div>

            {def.setupGuide.developerSteps[0] !== 'به‌زودی' && (
                <div className={styles.formSection}>
                    <h3 className={styles.formSectionTitle}>راهنمای راه‌اندازی</h3>
                    <div className={styles.guideGrid}>
                        <div className={styles.guideCard}>
                            <h3>{def.setupGuide.developerTitle}</h3>
                            <ol>
                                {def.setupGuide.developerSteps.map((step, i) => (
                                    <li key={i}>{step}</li>
                                ))}
                            </ol>
                        </div>
                        <div className={styles.guideCard}>
                            <h3>{def.setupGuide.marketingTitle}</h3>
                            <ol>
                                {def.setupGuide.marketingSteps.map((step, i) => (
                                    <li key={i}>{step}</li>
                                ))}
                            </ol>
                        </div>
                    </div>
                </div>
            )}

            <div className={styles.formSection}>
                <h3 className={styles.formSectionTitle}>اطلاعات اتصال</h3>
                {def.fields.map((field) => (
                    <div key={field.key} className={styles.field}>
                        <label>
                            {field.label}
                            {field.required ? ' *' : ''}
                        </label>
                        {field.type === 'textarea' ? (
                            <textarea
                                value={fields[field.key] || ''}
                                placeholder={field.placeholder}
                                onChange={(e) => setField(field.key, e.target.value)}
                            />
                        ) : (
                            <input
                                type={field.key === 'embedUrl' ? 'url' : 'text'}
                                value={fields[field.key] || ''}
                                placeholder={field.placeholder}
                                onChange={(e) => setField(field.key, e.target.value)}
                                dir={field.key === 'embedUrl' || field.key === 'propertyId' ? 'ltr' : 'rtl'}
                            />
                        )}
                        {field.helpText ? <span className={styles.fieldHint}>{field.helpText}</span> : null}
                        {errors[field.key] ? <span className={styles.fieldError}>{errors[field.key]}</span> : null}
                    </div>
                ))}

                {embedUrl && (
                    <div className={styles.previewBox}>
                        <h4>پیش‌نمایش داشبورد</h4>
                        {embedPreviewValid ? (
                            <iframe
                                src={embedUrl}
                                title="پیش‌نمایش داشبورد آنالیتیکس"
                                loading="lazy"
                                allowFullScreen
                                sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-storage-access-by-user-activation"
                            />
                        ) : (
                            <p className={styles.previewError}>
                                برای پیش‌نمایش، یک لینک Embed معتبر از Looker Studio وارد کنید.
                            </p>
                        )}
                    </div>
                )}

                <div className={styles.field}>
                    <label className={styles.toggleLabel}>
                        <span>اتصال فعال</span>
                        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                    </label>
                    <span className={styles.fieldHint}>اتصال‌های غیرفعال در صفحه داشبوردها نمایش داده نمی‌شوند.</span>
                </div>
            </div>

            <div className={styles.formActions}>
                <button type="button" className={styles.primaryBtn} onClick={handleSubmit} disabled={saving}>
                    {saving ? 'در حال ذخیره...' : submitLabel}
                </button>
                <button type="button" className={styles.secondaryBtn} onClick={() => router.push('/marketing/connections')}>
                    انصراف
                </button>
            </div>
        </div>
    );
}
