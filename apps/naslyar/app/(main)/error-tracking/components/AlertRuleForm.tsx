'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
    ETR_LEVEL_LABELS,
    ETR_RULE_TYPE_LABELS,
    type EtrAlertRuleTypeType,
    type EtrDestinationTypeType,
    type EtrProject,
} from '../error-tracking.types';
import parentStyles from '../../marketing/Marketing.module.scss';
import hrStyles from '../../management/hr/Hr.module.scss';
import styles from '../ErrorTracking.module.scss';

const LEVEL_OPTIONS = ['fatal', 'error', 'warning'] as const;

export interface AlertRuleFormState {
    projectId: string;
    name: string;
    type: EtrAlertRuleTypeType;
    spikeThreshold: string;
    windowMinutes: string;
    levels: string[];
    destinationType: EtrDestinationTypeType;
    url: string;
    botToken: string;
    chatId: string;
    cooldownMinutes: string;
    isEnabled: boolean;
}

export const EMPTY_ALERT_FORM: AlertRuleFormState = {
    projectId: '',
    name: '',
    type: 'new_issue',
    spikeThreshold: '50',
    windowMinutes: '5',
    levels: [],
    destinationType: 'webhook',
    url: '',
    botToken: '',
    chatId: '',
    cooldownMinutes: '30',
    isEnabled: true,
};

export function alertFormToPayload(form: AlertRuleFormState) {
    return {
        projectId: form.projectId,
        name: form.name.trim(),
        type: form.type,
        config:
            form.type === 'error_spike'
                ? {
                    spikeThreshold: Number(form.spikeThreshold) || 50,
                    windowMinutes: Number(form.windowMinutes) || 5,
                    levels: form.levels,
                }
                : { levels: form.levels },
        destination:
            form.destinationType === 'webhook'
                ? { type: 'webhook' as const, url: form.url.trim() }
                : { type: 'telegram' as const, botToken: form.botToken.trim(), chatId: form.chatId.trim() },
        cooldownMinutes: Number(form.cooldownMinutes) || 30,
        isEnabled: form.isEnabled,
    };
}

interface AlertRuleFormProps {
    initial?: AlertRuleFormState;
    projects: EtrProject[];
    editMode?: boolean;
    saving?: boolean;
    onSubmit: (form: AlertRuleFormState) => void;
    onCancel: () => void;
    submitLabel?: string;
}

export default function AlertRuleForm({
    initial,
    projects,
    editMode = false,
    saving = false,
    onSubmit,
    onCancel,
    submitLabel = 'ثبت قانون',
}: AlertRuleFormProps) {
    const [form, setForm] = useState<AlertRuleFormState>(initial || EMPTY_ALERT_FORM);

    const toggleLevel = (level: string) => {
        setForm((prev) => ({
            ...prev,
            levels: prev.levels.includes(level)
                ? prev.levels.filter((l) => l !== level)
                : [...prev.levels, level],
        }));
    };

    const disabled =
        saving ||
        !form.projectId ||
        !form.name.trim() ||
        (form.destinationType === 'webhook' ? !form.url.trim() : !form.botToken.trim() || !form.chatId.trim());

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                onSubmit({ ...form, name: form.name.trim() });
            }}
        >
            <h3 className={parentStyles.formSectionTitle}>هویت قانون</h3>
            <div className={hrStyles.formRow}>
                <div className={parentStyles.field}>
                    <label>پروژه *</label>
                    <select
                        value={form.projectId}
                        onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                        disabled={editMode}
                    >
                        <option value="">— انتخاب کنید —</option>
                        {projects.map((p) => (
                            <option key={p._id} value={p._id}>{p.name}</option>
                        ))}
                    </select>
                    {projects.length === 0 ? (
                        <p className={hrStyles.fieldHint}>
                            پروژه‌ای نیست. اول از <Link href="/error-tracking/projects/new">پروژه جدید</Link> بسازید.
                        </p>
                    ) : (
                        <p className={hrStyles.fieldHint}>
                            {editMode ? 'پروژه بعد از ساخت عوض نمی‌شود.' : 'فقط رویدادهای همین پروژه این قانون را راه می‌اندازند.'}
                        </p>
                    )}
                </div>
                <div className={parentStyles.field}>
                    <label>نام قانون *</label>
                    <input
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="مثلاً مشکل جدید استودیو"
                        required
                    />
                    <p className={hrStyles.fieldHint}>نام داخلی فهرست و تاریخچه ارسال.</p>
                </div>
            </div>

            <h3 className={parentStyles.formSectionTitle} style={{ marginTop: '0.5rem' }}>
                چه زمانی خبر بدهیم
            </h3>
            <div className={hrStyles.formRow}>
                <div className={parentStyles.field}>
                    <label>نوع قانون</label>
                    <select
                        value={form.type}
                        onChange={(e) => setForm({ ...form, type: e.target.value as EtrAlertRuleTypeType })}
                    >
                        {(Object.keys(ETR_RULE_TYPE_LABELS) as EtrAlertRuleTypeType[]).map((k) => (
                            <option key={k} value={k}>{ETR_RULE_TYPE_LABELS[k]}</option>
                        ))}
                    </select>
                    <p className={hrStyles.fieldHint}>
                        مشکل جدید = باگ تازه. بازگشت = حل‌شده دوباره آمده. جهش = تعداد در چند دقیقه از آستانه بیشتر.
                    </p>
                </div>
                <div className={parentStyles.field}>
                    <label>Cooldown (دقیقه)</label>
                    <input
                        type="number"
                        min={0}
                        value={form.cooldownMinutes}
                        onChange={(e) => setForm({ ...form, cooldownMinutes: e.target.value })}
                    />
                    <p className={hrStyles.fieldHint}>حداقل فاصله بین دو پیام همین قانون. ۳۰ برای شروع مناسب است.</p>
                </div>
            </div>

            {form.type === 'error_spike' ? (
                <div className={hrStyles.formRow}>
                    <div className={parentStyles.field}>
                        <label>آستانه تعداد رویداد</label>
                        <input
                            type="number"
                            min={1}
                            value={form.spikeThreshold}
                            onChange={(e) => setForm({ ...form, spikeThreshold: e.target.value })}
                        />
                        <p className={hrStyles.fieldHint}>اگر در پنجره زمانی بیشتر از این عدد رویداد بیاید، هشدار می‌رود.</p>
                    </div>
                    <div className={parentStyles.field}>
                        <label>پنجره زمانی (دقیقه)</label>
                        <input
                            type="number"
                            min={1}
                            value={form.windowMinutes}
                            onChange={(e) => setForm({ ...form, windowMinutes: e.target.value })}
                        />
                        <p className={hrStyles.fieldHint}>مثلاً ۵۰ رویداد در ۵ دقیقه.</p>
                    </div>
                </div>
            ) : null}

            <div className={parentStyles.field}>
                <label>فقط این سطوح (خالی = همه)</label>
                <div className={styles.chipRow}>
                    {LEVEL_OPTIONS.map((level) => {
                        const selected = form.levels.includes(level);
                        return (
                            <label key={level} className={`${styles.levelChip} ${selected ? styles.selected : ''}`}>
                                <input type="checkbox" checked={selected} onChange={() => toggleLevel(level)} />
                                {ETR_LEVEL_LABELS[level]}
                            </label>
                        );
                    })}
                </div>
                <p className={hrStyles.fieldHint}>اگر هیچ‌کدام را نزنید، همه سطوح این نوع قانون را راه می‌اندازند.</p>
            </div>

            <h3 className={parentStyles.formSectionTitle} style={{ marginTop: '0.5rem' }}>
                مقصد
            </h3>
            <div className={parentStyles.field}>
                <label>نوع مقصد</label>
                <select
                    value={form.destinationType}
                    onChange={(e) => setForm({ ...form, destinationType: e.target.value as EtrDestinationTypeType })}
                >
                    <option value="webhook">Webhook</option>
                    <option value="telegram">تلگرام</option>
                </select>
                <p className={hrStyles.fieldHint}>Webhook برای Slack/اتوماسیون؛ تلگرام برای گروه فنی.</p>
            </div>
            {form.destinationType === 'webhook' ? (
                <div className={parentStyles.field}>
                    <label>آدرس Webhook *</label>
                    <input
                        value={form.url}
                        onChange={(e) => setForm({ ...form, url: e.target.value })}
                        placeholder="https://hooks.example.com/xyz"
                        dir="ltr"
                    />
                    <p className={hrStyles.fieldHint}>باید https معتبر باشد. بدنه JSON مشکل ارسال می‌شود.</p>
                </div>
            ) : (
                <div className={hrStyles.formRow}>
                    <div className={parentStyles.field}>
                        <label>Bot Token *</label>
                        <input
                            value={form.botToken}
                            onChange={(e) => setForm({ ...form, botToken: e.target.value })}
                            placeholder="123456:ABC-DEF..."
                            dir="ltr"
                        />
                        <p className={hrStyles.fieldHint}>از @BotFather. مثل رمز است؛ در لاگ عمومی نگذارید.</p>
                    </div>
                    <div className={parentStyles.field}>
                        <label>Chat ID *</label>
                        <input
                            value={form.chatId}
                            onChange={(e) => setForm({ ...form, chatId: e.target.value })}
                            placeholder="-100123456789"
                            dir="ltr"
                        />
                        <p className={hrStyles.fieldHint}>آیدی گروه یا چت. معمولاً با منفی شروع می‌شود.</p>
                    </div>
                </div>
            )}

            <label className={parentStyles.toggleLabel} style={{ marginBottom: '0.35rem' }}>
                <span>قانون فعال باشد</span>
                <input
                    type="checkbox"
                    checked={form.isEnabled}
                    onChange={(e) => setForm({ ...form, isEnabled: e.target.checked })}
                />
            </label>
            <p className={hrStyles.fieldHint} style={{ marginBottom: '1rem' }}>
                خاموش یعنی ذخیره می‌ماند ولی پیامی نمی‌رود.
            </p>

            <div className={hrStyles.formNoteBox}>
                <strong>بعد از ذخیره:</strong> با اولین مشکل مطابق قانون، یک ردیف در تاریخچه همین صفحه ساخته می‌شود.
                اگر ناموفق بود ستون خطا را ببینید و مقصد را اصلاح کنید.
            </div>

            <div className={parentStyles.formActions}>
                <button type="submit" className={parentStyles.primaryBtn} disabled={disabled}>
                    {saving ? 'در حال ذخیره...' : submitLabel}
                </button>
                <button type="button" className={parentStyles.secondaryBtn} onClick={onCancel}>
                    انصراف
                </button>
            </div>
        </form>
    );
}
