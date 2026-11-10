'use client';

import React, { useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { SuccessToaster } from '@my-workspace/utils';
import { notifyError } from '@/app/lib/errors';
import styles from './security.module.scss';
import { useAuthStore } from '@/app/zustand/store/authStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function SecuritySettingsPanel() {
    const { t } = useTranslation('settings');
    const { t: tc } = useTranslation('common');
    const { token } = useAuthStore();

    const [isTwoFactorEnabled, setIsTwoFactorEnabled] = useState(false);
    const [showQRSection, setShowQRSection] = useState(false);
    const [backupCodes, setBackupCodes] = useState<string[]>([]);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [repeatPassword, setRepeatPassword] = useState('');
    const [saving, setSaving] = useState(false);
    const handleConfirm2FA = () => {
        setIsTwoFactorEnabled(true);
        setShowQRSection(false);
    };
    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!token) {
            notifyError(t('login_required'));
            return;
        }

        if (!currentPassword.trim()) {
            notifyError(t('current_required'));
            return;
        }

        if (!newPassword.trim()) {
            notifyError(t('new_required'));
            return;
        }

        if (newPassword !== repeatPassword) {
            notifyError(t('mismatch'));
            return;
        }

        try {
            setSaving(true);
            const res = await axios.patch(
                `${API_URL}/api/user/change-password`,
                {
                    currentPassword,
                    password: newPassword,
                    repeatPassword,
                },
                { headers: { authorization: `Bearer ${token}` } },
            );

            if(res.data.statusCode === 200){
                setCurrentPassword('');
                setNewPassword('');
                setRepeatPassword('');
                SuccessToaster({message: t('password_updated')});
            }
        } catch (error) {
            const code = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
            const translated = code && t(`err_${code}`, { defaultValue: '' });
            if (translated) {
                notifyError({ message: translated });
            } else {
                notifyError(error);
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        // عنوان و توضیح در هدر تب‌های صفحه creator است
        <div className={styles.container}>
            <form onSubmit={handleChangePassword} className={styles.form}>
                <h3 className={styles.sectionTitle}>{t('change_password')}</h3>
                <div className={styles.formGroupRow}>
                    <label className={styles.label}>{t('current_password_star')}</label>
                    <input
                        type="password"
                        className={styles.input}
                        placeholder="••••••••"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        disabled={saving}
                        autoComplete="current-password"
                    />
                </div>

                <div className={styles.formGroupRow}>
                    <label className={styles.label}>{t('new_password_star')}</label>
                    <input
                        type="password"
                        className={styles.input}
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        disabled={saving}
                        autoComplete="new-password"
                    />
                    <span className={styles.inputHint}>
                        {t('password_hint')}
                    </span>
                </div>

                <div className={styles.formGroupRow}>
                    <label className={styles.label}>{t('confirm_new_star')}</label>
                    <input
                        type="password"
                        className={styles.input}
                        placeholder="••••••••"
                        value={repeatPassword}
                        onChange={(e) => setRepeatPassword(e.target.value)}
                        disabled={saving}
                        autoComplete="new-password"
                    />
                </div>

                <div className={styles.formActions}>
                    <button type="submit" className={styles.saveBtn} disabled={saving}>
                        {saving ? tc('updating') : t('update_password')}
                    </button>
                </div>
            </form>

            {/* احراز دو مرحله‌ای — بخش جدا زیر فرم رمز، نه داخل آن */}
            <section className={styles.twoFactorWrapper}>
                <div className={styles.twoFactorHeader}>
                    <div>
                        <h3 className={styles.sectionTitle}>{t('twofa_title')}</h3>
                        <div className={styles.statusIndicator}>
                            <span className={`${styles.dot} ${isTwoFactorEnabled ? styles.active : ''}`} />
                            <span className={styles.statusText}>
                                {t('status', { state: isTwoFactorEnabled ? t('enabled') : t('disabled') })}
                            </span>
                        </div>
                    </div>
                    {!isTwoFactorEnabled && !showQRSection && (
                        <button
                            type="button"
                            className={styles.enableBtn}
                            disabled
                            aria-disabled="true"
                            title={t('twofa_coming_soon')}
                        >
                            {t('enable_2fa')}
                        </button>
                    )}
                </div>

                <p className={styles.twoFactorDescription}>
                    {t('twofa_desc')}
                </p>
                <p className={styles.comingSoonNote}>{t('twofa_coming_soon')}</p>

                {showQRSection && (
                    <div className={styles.qrSection}>
                        <div className={styles.qrInstructions}>
                            <h4>{t('twofa_steps')}</h4>
                            <ol>
                                <li>{t('twofa_step1')}</li>
                                <li>{t('twofa_step2', { key: 'MZRWY3LTMVRXEZLU' })}</li>
                                <li>{t('twofa_step3')}</li>
                            </ol>
                        </div>

                        <div className={styles.qrVisualBox}>
                            <div className={styles.mockQR}>
                                <svg viewBox="0 0 24 24" width="80" height="80" stroke="#000" strokeWidth="1" fill="none"><rect x="2" y="2" width="6" height="6"></rect><rect x="16" y="2" width="6" height="6"></rect><rect x="2" y="16" width="6" height="6"></rect><path d="M9 9h6v6H9z"></path></svg>
                            </div>
                        </div>

                        <div className={styles.confirmationBox}>
                            <input type="text" maxLength={6} placeholder="000000" className={styles.verifyCodeInput} />
                            <button type="button" className={styles.saveBtn} onClick={handleConfirm2FA}>{t('confirm_enable')}</button>
                        </div>
                    </div>
                )}

                {isTwoFactorEnabled && (
                    <div className={styles.backupCodesSection}>
                        <div className={styles.backupHeader}>
                            <h5>{t('backup_codes')}</h5>
                            <button type="button" className={styles.downloadBtn}>{t('download_codes')}</button>
                        </div>
                        <p>{t('backup_hint')}</p>
                        <div className={styles.codesGrid}>
                            {backupCodes.map((code, idx) => (
                                <div key={idx} className={styles.codeItem}>{code}</div>
                            ))}
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}
