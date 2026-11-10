'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { LoadingState } from '@my-workspace/components';
import { toFarsiNumber, ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import listStyles from '../../billing/gateways/GatewaysList.module.scss';
import localStyles from './SmsSettings.module.scss';
import type { SmsProviderRow } from './SmsProvidersPanel';
import {
    SMS_PATTERN_CONFIG_KEYS,
    SmsPatternRow,
    SmsProviderType,
    getSmsProviderDefinition,
} from './sms-provider.definitions';

interface SmsPatternsPanelProps {
    loading: boolean;
    providers: SmsProviderRow[];
    /** بعد از تغییر پترن فعال، لیست پنل‌ها دوباره لود شود (hint کارت‌ها به‌روز شود) */
    onProvidersChanged: () => void | Promise<void>;
}

const emptyForm = { title: '', code: '', varName: '' };

export default function SmsPatternsPanel({ loading, providers, onProvidersChanged }: SmsPatternsPanelProps) {
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const [selectedProviderId, setSelectedProviderId] = useState('');
    const [patterns, setPatterns] = useState<SmsPatternRow[]>([]);
    const [patternsLoading, setPatternsLoading] = useState(false);
    const [busyPatternId, setBusyPatternId] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);

    const selectedProvider = useMemo(() => {
        if (!providers.length) return null;
        return providers.find(p => p._id === selectedProviderId) || providers[0];
    }, [providers, selectedProviderId]);

    const effectiveProviderId = selectedProvider?._id || '';

    const loadPatterns = useCallback(async (providerId: string) => {
        if (!token || !providerId) {
            setPatterns([]);
            return;
        }
        try {
            setPatternsLoading(true);
            const res = await axios.get(`${baseUrl}/api/sms/providers/${providerId}/patterns`, {
                headers: { authorization: `Bearer ${token}` },
            });
            setPatterns(res.data?.data || []);
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setPatternsLoading(false);
        }
    }, [baseUrl, token]);

    useEffect(() => {
        void loadPatterns(effectiveProviderId);
    }, [loadPatterns, effectiveProviderId]);

    const patternKeys = selectedProvider
        ? SMS_PATTERN_CONFIG_KEYS[selectedProvider.providerType as SmsProviderType] || { code: 'patternCode' }
        : { code: 'patternCode' };

    const activePatternId = useMemo(() => {
        if (!selectedProvider) return '';
        const activeCode = String(selectedProvider.config?.[patternKeys.code] ?? '').trim();
        if (!activeCode) return '';
        return patterns.find(p => p.code.trim() === activeCode)?._id || '';
    }, [selectedProvider, patterns, patternKeys.code]);

    const handleSelectPattern = async (pattern: SmsPatternRow) => {
        if (!token || !selectedProvider) return;
        try {
            setBusyPatternId(pattern._id);
            await axios.post(
                `${baseUrl}/api/sms/providers/${selectedProvider._id}/patterns/${pattern._id}/select`,
                {},
                { headers: { authorization: `Bearer ${token}` } },
            );
            SuccessToaster({ message: `پترن «${pattern.title || pattern.code}» برای پنل فعال شد` });
            await onProvidersChanged();
            await loadPatterns(selectedProvider._id);
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setBusyPatternId('');
        }
    };

    const handleDeletePattern = async (pattern: SmsPatternRow) => {
        if (!token || !selectedProvider) return;
        if (!confirm(`حذف پترن «${pattern.title || pattern.code}»؟`)) return;
        try {
            setBusyPatternId(pattern._id);
            await axios.delete(`${baseUrl}/api/sms/patterns/${pattern._id}`, {
                headers: { authorization: `Bearer ${token}` },
            });
            SuccessToaster({ message: 'پترن حذف شد' });
            await loadPatterns(selectedProvider._id);
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setBusyPatternId('');
        }
    };

    const handleAddPattern = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token || !selectedProvider) return;
        if (!form.code.trim()) return;
        try {
            setSaving(true);
            await axios.post(
                `${baseUrl}/api/sms/providers/${selectedProvider._id}/patterns`,
                {
                    code: form.code.trim(),
                    title: form.title.trim(),
                    varName: patternKeys.varName ? form.varName.trim() : '',
                },
                { headers: { authorization: `Bearer ${token}` } },
            );
            SuccessToaster({ message: 'پترن ثبت شد' });
            setForm(emptyForm);
            setShowAddForm(false);
            await loadPatterns(selectedProvider._id);
        } catch (err) {
            ErrorToaster(err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <section className={localStyles.section} aria-labelledby="sms-patterns">
            <h2 id="sms-patterns" className={localStyles.sectionTitle}>
                پترن‌های پنل
            </h2>
            <p className={localStyles.sectionDesc}>
                پنل را انتخاب کنید تا پترن‌های ثبت‌شده‌اش را ببینید؛ پترن انتخابی به‌عنوان قالب ارسال همان
                پنل ذخیره می‌شود. کد پترن را از پنل سرویس‌دهنده بردارید.
            </p>

            {loading ? (
                <div className={listStyles.loadingState}>
                    <LoadingState />
                </div>
            ) : providers.length === 0 ? (
                <p className={localStyles.footerHint}>
                    هنوز پنلی ندارید — ابتدا در تب «پنل‌های پیامک» یک پنل بسازید.
                </p>
            ) : (
                <>
                    <div className={localStyles.patternsToolbar}>
                        <div className={localStyles.patternsSelectWrap}>
                            <label htmlFor="sms-pattern-provider" className={localStyles.fieldName}>
                                پنل پیامک
                            </label>
                            <select
                                id="sms-pattern-provider"
                                className={localStyles.select}
                                value={effectiveProviderId}
                                onChange={e => {
                                    setSelectedProviderId(e.target.value);
                                    setShowAddForm(false);
                                    setForm(emptyForm);
                                }}
                            >
                                {providers.map(p => (
                                    <option key={p._id} value={p._id}>
                                        {p.name} ({p.slug})
                                    </option>
                                ))}
                            </select>
                        </div>
                        {selectedProvider ? (
                            <span className={localStyles.patternProviderType}>
                                {getSmsProviderDefinition(selectedProvider.providerType).label}
                            </span>
                        ) : null}
                        <button
                            type="button"
                            className={localStyles.patternAddBtn}
                            onClick={() => {
                                setShowAddForm(v => !v);
                                setForm(emptyForm);
                            }}
                        >
                            {showAddForm ? 'بستن فرم' : '+ پترن جدید'}
                        </button>
                    </div>

                    {showAddForm && selectedProvider ? (
                        <form className={localStyles.patternAddForm} onSubmit={handleAddPattern}>
                            <div className={localStyles.patternAddGrid}>
                                <div className={localStyles.patternField}>
                                    <label htmlFor="pattern-title">عنوان پترن</label>
                                    <input
                                        id="pattern-title"
                                        value={form.title}
                                        placeholder="مثلاً کد ورود"
                                        onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                                    />
                                </div>
                                <div className={localStyles.patternField}>
                                    <label htmlFor="pattern-code">
                                        کد پترن / قالب
                                        <span className={localStyles.patternRequired}>*</span>
                                    </label>
                                    <input
                                        id="pattern-code"
                                        dir="ltr"
                                        required
                                        value={form.code}
                                        placeholder="مثلاً jaQX1XD8Zy"
                                        onChange={e => setForm(p => ({ ...p, code: e.target.value }))}
                                    />
                                </div>
                                {patternKeys.varName ? (
                                    <div className={localStyles.patternField}>
                                        <label htmlFor="pattern-var">نام متغیر در پترن</label>
                                        <input
                                            id="pattern-var"
                                            dir="ltr"
                                            value={form.varName}
                                            placeholder="مثلاً otp"
                                            onChange={e => setForm(p => ({ ...p, varName: e.target.value }))}
                                        />
                                    </div>
                                ) : null}
                            </div>
                            <button type="submit" className={localStyles.saveBtn} disabled={saving || !form.code.trim()}>
                                {saving ? 'در حال ثبت…' : 'ثبت پترن'}
                            </button>
                        </form>
                    ) : null}

                    {patternsLoading ? (
                        <div className={listStyles.loadingState}>
                            <LoadingState />
                        </div>
                    ) : patterns.length === 0 ? (
                        <p className={localStyles.footerHint}>
                            برای این پنل هنوز پترنی ثبت نشده — با «پترن جدید» کد قالب را اضافه کنید.
                        </p>
                    ) : (
                        <div className={localStyles.patternList}>
                            {patterns.map(pattern => {
                                const isActive = pattern._id === activePatternId;
                                return (
                                    <div
                                        key={pattern._id}
                                        className={`${localStyles.patternRow} ${isActive ? localStyles.patternRowActive : ''}`}
                                    >
                                        <div className={localStyles.patternInfo}>
                                            <span className={localStyles.patternTitle}>
                                                {pattern.title || 'بدون عنوان'}
                                                {isActive ? (
                                                    <span className={localStyles.patternActiveBadge}>
                                                        پترن فعال پنل
                                                    </span>
                                                ) : null}
                                            </span>
                                            <span className={localStyles.patternCode} dir="ltr">
                                                {pattern.code}
                                            </span>
                                            {patternKeys.varName && pattern.varName ? (
                                                <span className={localStyles.patternVar} dir="ltr">
                                                    var: {pattern.varName}
                                                </span>
                                            ) : null}
                                        </div>
                                        <div className={localStyles.patternActions}>
                                            <button
                                                type="button"
                                                className={localStyles.patternSelectBtn}
                                                disabled={isActive || busyPatternId === pattern._id}
                                                onClick={() => void handleSelectPattern(pattern)}
                                            >
                                                {busyPatternId === pattern._id
                                                    ? '…'
                                                    : isActive
                                                        ? 'فعال'
                                                        : 'انتخاب'}
                                            </button>
                                            <button
                                                type="button"
                                                className={localStyles.patternDeleteBtn}
                                                disabled={busyPatternId === pattern._id}
                                                onClick={() => void handleDeletePattern(pattern)}
                                            >
                                                حذف
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {selectedProvider ? (
                        <p className={localStyles.footerHint}>
                            {toFarsiNumber(String(patterns.length))} پترن ثبت‌شده برای این پنل.
                            {' '}
                            {patternKeys.varName
                                ? 'با انتخاب هر پترن، کد آن در تنظیمات همین پنل جای‌گذاری می‌شود.'
                                : 'این نوع پنل متغیر آزاد ندارد و فقط کد قالب ذخیره می‌شود.'}
                        </p>
                    ) : null}
                </>
            )}
        </section>
    );
}
