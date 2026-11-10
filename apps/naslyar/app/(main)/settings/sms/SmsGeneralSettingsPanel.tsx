'use client';

import React, { useEffect, useMemo, useState } from 'react';
import localStyles from './SmsSettings.module.scss';
import type { SmsProviderRow } from './SmsProvidersPanel';
import {
    SMS_EVENT_GROUPS,
    SMS_PROVIDER_PURPOSE_ROWS,
    SmsGeneralSettingsForm,
} from './sms-general-settings.definitions';

interface SmsGeneralSettingsPanelProps {
    providers: SmsProviderRow[];
    initial: SmsGeneralSettingsForm;
    saving?: boolean;
    onSave: (values: SmsGeneralSettingsForm) => void | Promise<void>;
}

export type { SmsGeneralSettingsForm };

export default function SmsGeneralSettingsPanel({
    providers,
    initial,
    saving,
    onSave,
}: SmsGeneralSettingsPanelProps) {
    const [form, setForm] = useState<SmsGeneralSettingsForm>(initial);

    useEffect(() => {
        setForm(initial);
    }, [initial]);

    const activeProviders = useMemo(
        () => providers.filter(p => p.isActive),
        [providers],
    );

    const update = <K extends keyof SmsGeneralSettingsForm>(key: K, value: SmsGeneralSettingsForm[K]) => {
        setForm(prev => ({ ...prev, [key]: value }));
    };

    return (
        <div className={localStyles.generalStack}>
            <section className={localStyles.section} aria-labelledby="sms-default-panels">
                <h2 id="sms-default-panels" className={localStyles.sectionTitle}>
                    پنل پیش‌فرض برای هر نوع ارسال
                </h2>
                <p className={localStyles.sectionDesc}>
                    مانند پنل‌های حرفه‌ای، برای OTP، مالی، پشتیبانی و امنیت می‌توانید پنل یا قالب جدا
                    تعریف کنید. فیلد مربوطه وقتی هیچ رویدادی در آن دسته فعال نباشد غیرفعال می‌شود.
                </p>
                <div className={localStyles.fieldList}>
                    {SMS_PROVIDER_PURPOSE_ROWS.map(item => {
                        const rowDisabled = !item.isEnabled(form);

                        return (
                            <div
                                key={item.slugKey}
                                className={`${localStyles.fieldRow} ${rowDisabled ? localStyles.fieldRowDisabled : ''}`}
                            >
                                <div className={localStyles.fieldLabel}>
                                    <span className={localStyles.fieldName}>{item.title}</span>
                                    <span className={localStyles.fieldHint}>{item.hint}</span>
                                </div>
                                <select
                                    className={localStyles.select}
                                    value={form[item.slugKey]}
                                    disabled={rowDisabled || activeProviders.length === 0}
                                    onChange={e => update(item.slugKey, e.target.value)}
                                >
                                    {item.slugKey !== 'activeProviderSlug' ? (
                                        <option value="">— پیش‌فرض (OTP / اولین پنل فعال)</option>
                                    ) : (
                                        <option value="">— اولین پنل فعال</option>
                                    )}
                                    {activeProviders.map(p => (
                                        <option key={p._id} value={p.slug}>
                                            {p.name} ({p.slug})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        );
                    })}
                </div>
                {activeProviders.length === 0 ? (
                    <p className={localStyles.footerHint} style={{ marginTop: '0.75rem' }}>
                        هنوز پنل فعالی وجود ندارد — ابتدا در تب پنل‌ها یک پنل بسازید.
                    </p>
                ) : null}
            </section>

            <section className={localStyles.section} aria-labelledby="sms-auto-events">
                <h2 id="sms-auto-events" className={localStyles.sectionTitle}>
                    رویدادهای خودکار
                </h2>
                <p className={localStyles.sectionDesc}>
                    هر رویداد را جدا فعال کنید. برای هر دسته، پنل و قالب متناظر را در پنل‌های پیامک
                    تنظیم کنید.
                </p>
                {SMS_EVENT_GROUPS.map(group => (
                    <div key={group.title} className={localStyles.eventGroup}>
                        <h3 className={localStyles.eventGroupTitle}>{group.title}</h3>
                        {group.items.map(item => (
                            <label
                                key={item.key}
                                className={localStyles.toggleField}
                                htmlFor={`sms-event-${item.key}`}
                            >
                                <span className={localStyles.fieldLabel}>
                                    <span className={localStyles.fieldName}>{item.label}</span>
                                    <span className={localStyles.fieldHint}>{item.hint}</span>
                                </span>
                                <input
                                    id={`sms-event-${item.key}`}
                                    type="checkbox"
                                    className={localStyles.toggleInput}
                                    checked={form[item.key]}
                                    onChange={e => update(item.key, e.target.checked)}
                                />
                            </label>
                        ))}
                    </div>
                ))}
            </section>

            <section className={localStyles.section} aria-labelledby="sms-delivery-policy">
                <h2 id="sms-delivery-policy" className={localStyles.sectionTitle}>
                    سیاست ارسال
                </h2>
                <p className={localStyles.sectionDesc}>
                    محدودیت‌های رایج در سرویس‌های پیامک سازمانی — از ارسال شبانه و اسپم جلوگیری می‌کند.
                </p>
                <label className={localStyles.toggleField} htmlFor="sms-respect-quiet">
                    <span className={localStyles.fieldLabel}>
                        <span className={localStyles.fieldName}>رعایت ساعات سکوت</span>
                        <span className={localStyles.fieldHint}>
                            پیامک‌های خودکار (غیر OTP فوری) در این بازه ارسال نشوند.
                        </span>
                    </span>
                    <input
                        id="sms-respect-quiet"
                        type="checkbox"
                        className={localStyles.toggleInput}
                        checked={form.respectQuietHours}
                        onChange={e => update('respectQuietHours', e.target.checked)}
                    />
                </label>
                <div
                    className={`${localStyles.policyGrid} ${!form.respectQuietHours ? localStyles.fieldRowDisabled : ''}`}
                >
                    <div className={localStyles.fieldRow} style={{ borderTop: 'none', paddingTop: 0 }}>
                        <div className={localStyles.fieldLabel}>
                            <span className={localStyles.fieldName}>شروع سکوت</span>
                        </div>
                        <input
                            type="time"
                            className={localStyles.select}
                            value={form.quietHoursStart}
                            disabled={!form.respectQuietHours}
                            onChange={e => update('quietHoursStart', e.target.value)}
                        />
                    </div>
                    <div className={localStyles.fieldRow}>
                        <div className={localStyles.fieldLabel}>
                            <span className={localStyles.fieldName}>پایان سکوت</span>
                        </div>
                        <input
                            type="time"
                            className={localStyles.select}
                            value={form.quietHoursEnd}
                            disabled={!form.respectQuietHours}
                            onChange={e => update('quietHoursEnd', e.target.value)}
                        />
                    </div>
                </div>
                <div className={localStyles.policyGrid}>
                    <div className={localStyles.fieldRow} style={{ borderTop: 'none' }}>
                        <div className={localStyles.fieldLabel}>
                            <span className={localStyles.fieldName}>سقف پیامک خودکار در روز (هر کاربر)</span>
                            <span className={localStyles.fieldHint}>۰ = بدون محدودیت</span>
                        </div>
                        <input
                            type="number"
                            min={0}
                            className={localStyles.select}
                            value={form.maxAutomatedSmsPerUserPerDay}
                            onChange={e => update('maxAutomatedSmsPerUserPerDay', Number(e.target.value) || 0)}
                        />
                    </div>
                    <div className={localStyles.fieldRow}>
                        <div className={localStyles.fieldLabel}>
                            <span className={localStyles.fieldName}>بازه ضد تکرار (دقیقه)</span>
                            <span className={localStyles.fieldHint}>همان متن برای یک کاربر در این فاصله دوباره ارسال نشود.</span>
                        </div>
                        <input
                            type="number"
                            min={0}
                            className={localStyles.select}
                            value={form.dedupeIdenticalMessageMinutes}
                            onChange={e => update('dedupeIdenticalMessageMinutes', Number(e.target.value) || 0)}
                        />
                    </div>
                </div>
            </section>

            <div className={localStyles.formFooter}>
                <button
                    type="button"
                    className={localStyles.saveBtn}
                    disabled={saving}
                    onClick={() => void onSave(form)}
                >
                    {saving ? 'در حال ذخیره…' : 'ذخیره تنظیمات'}
                </button>
                <p className={localStyles.footerHint}>تغییرات تا زمان ذخیره اعمال نمی‌شوند.</p>
            </div>
        </div>
    );
}
