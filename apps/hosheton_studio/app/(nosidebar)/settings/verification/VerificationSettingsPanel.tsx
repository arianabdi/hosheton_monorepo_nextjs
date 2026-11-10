'use client';

import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { SuccessToaster } from '@my-workspace/utils';
import { notifyError } from '@/app/lib/errors';
import styles from './verification.module.scss';
import { useAuthStore } from '@/app/zustand/store/authStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface LastAttempt {
    status?: string;
    providerName?: string;
    simulated?: boolean;
    mobile?: string;
    nationalCode?: string;
    createdAt?: string;
    errorMessage?: string;
}

interface VerificationStatus {
    verified: boolean;
    verifiedAt?: string | null;
    providerKey?: string | null;
    fullName?: string;
    mobile?: string;
    nationalCode?: string;
    lastAttempt?: LastAttempt | null;
    activeProvider?: { key: string; displayName: string; sandbox: boolean } | null;
}

const toEnglishDigits = (value: string) =>
    value.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));

export default function VerificationSettingsPanel({
    accountFullName = '',
}: {
    accountFullName?: string;
}) {
    const { t, i18n } = useTranslation('settings');
    const { t: tc } = useTranslation('common');
    const { token } = useAuthStore();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [status, setStatus] = useState<VerificationStatus | null>(null);

    const [mobile, setMobile] = useState('');
    const [nationalCode, setNationalCode] = useState('');

    const authHeaders = { authorization: `Bearer ${token}` };

    const loadStatus = useCallback(async () => {
        if (!token) {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const res = await axios.get(`${API_URL}/api/identity-verification/status`, { headers: authHeaders });
            const data: VerificationStatus = res.data?.data;
            setStatus(data);
            setMobile(data?.mobile || '');
            setNationalCode(data?.nationalCode && data?.verified ? data.nationalCode : '');
        } catch (error) {
            notifyError(error);
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    useEffect(() => {
        loadStatus();
    }, [loadStatus]);

    const formatDateTime = (value?: string | null) => {
        if (!value) return '—';
        try {
            return new Date(value).toLocaleString(i18n.language === 'fa' ? 'fa-IR' : i18n.language);
        } catch {
            return value;
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token || submitting) return;

        const resolvedFullName = accountFullName.trim();
        if (!resolvedFullName) {
            notifyError({ message: t('full_name_required') });
            return;
        }

        const normalizedCode = toEnglishDigits(nationalCode).replace(/\D/g, '');
        if (normalizedCode.length !== 10) {
            notifyError({ message: t('national_code_invalid') });
            return;
        }

        try {
            setSubmitting(true);
            const res = await axios.post(
                `${API_URL}/api/identity-verification/verify`,
                {
                    mobile: mobile?.trim() || undefined,
                    nationalCode: normalizedCode,
                    fullName: resolvedFullName,
                },
                { headers: authHeaders },
            );
            if (res.data?.statusCode === 200) {
                SuccessToaster({ message: t('verification_success') });
                await loadStatus();
            }
        } catch (error) {
            notifyError(error);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loadingState}>{tc('loading')}</div>
            </div>
        );
    }

    const verified = status?.verified === true;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.headerText}>
                    <h2>
                        {t('verification_title')}{' '}
                        <span className={`${styles.statusBadge} ${verified ? styles.verified : styles.pending}`}>
                            {verified ? t('verified_badge') : t('not_verified_badge')}
                        </span>
                    </h2>
                    <p>{t('verification_desc')}</p>
                </div>
            </div>

            {verified ? (
                <div className={styles.verifiedCard}>
                    <div className={styles.verifiedIcon}>
                        <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2" fill="none">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                            <polyline points="9 12 11.5 14.5 15.5 9.5"></polyline>
                        </svg>
                    </div>
                    <div className={styles.verifiedBody}>
                        <p className={styles.verifiedTitle}>{t('verified_card_title')}</p>
                        <div className={styles.infoGrid}>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>{t('full_name')}</span>
                                <span className={styles.infoValue}>{status?.fullName || '—'}</span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>{t('mobile')}</span>
                                <span className={styles.infoValue} style={{ direction: 'ltr' }}>
                                    {status?.mobile || '—'}
                                </span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>{t('national_code')}</span>
                                <span className={styles.infoValue} style={{ direction: 'ltr' }}>
                                    {status?.nationalCode || '—'}
                                </span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>{t('verification_provider')}</span>
                                <span className={styles.infoValue}>
                                    {status?.activeProvider?.displayName || status?.providerKey || '—'}
                                </span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>{t('verified_at')}</span>
                                <span className={styles.infoValue}>{formatDateTime(status?.verifiedAt)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className={styles.form}>
                    {status?.activeProvider?.sandbox && (
                        <div className={styles.sandboxNotice}>{t('sandbox_notice')}</div>
                    )}

                    {status?.lastAttempt?.status === 'failed' && (
                        <div className={styles.errorNote}>
                            <strong>{t('last_attempt_failed')}:</strong>{' '}
                            {status.lastAttempt.errorMessage || t('not_verified_badge')}
                        </div>
                    )}

                    <p className={styles.intro}>{t('verification_intro')}</p>

                    <div className={styles.formGroupRow}>
                        <label className={styles.label}>{t('mobile')} *</label>
                        <input
                            type="tel"
                            className={styles.input}
                            value={mobile}
                            onChange={(e) => setMobile(e.target.value)}
                            style={{ direction: 'ltr', textAlign: 'right' }}
                            disabled={submitting}
                            placeholder="09xxxxxxxxx"
                        />
                    </div>

                    <div className={styles.formGroupRow}>
                        <label className={styles.label}>{t('national_code')} *</label>
                        <input
                            type="text"
                            className={styles.input}
                            value={nationalCode}
                            onChange={(e) => setNationalCode(e.target.value)}
                            style={{ direction: 'ltr', textAlign: 'right' }}
                            disabled={submitting}
                            maxLength={10}
                            placeholder={t('national_code_placeholder')}
                        />
                    </div>

                    <p className={styles.privacyNote}>{t('verification_privacy_note')}</p>

                    <div className={styles.formActions}>
                        <button type="submit" className={styles.submitBtn} disabled={submitting}>
                            {submitting ? t('verifying') : t('submit_verification')}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}
