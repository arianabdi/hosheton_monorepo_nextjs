'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import {
    AuthCard,
    AuthCardHeading,
    AuthCardSubTitle,
    AuthCardTitle,
} from '../components/authCard/authCard';
import { AuthContainer } from '../components/authContainer/authContainer';
import { Field } from '@my-workspace/components';
import { SuccessToaster } from '@my-workspace/utils';
import { notifyError } from '@/app/lib/errors';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useTranslation } from 'react-i18next';
import { mapApiUserToProfile } from '@/app/lib/user-roles';
import {
    buildFullName,
    needsProfileCompletion,
    splitFullName,
} from '../lib/needs-profile-completion';
import {
    clearStoredReferralCode,
    getStoredReferralCode,
    saveReferralCode,
    wasAttributionAttempted,
} from '@/app/lib/referral/capture';
import { attemptReferralAttribution } from '@/app/lib/referral/attribute';
import styles from './complete-profile.module.scss';

export default function CompleteProfilePage() {
    const router = useRouter();
    const { t } = useTranslation('auth');
    const { t: tm } = useTranslation('marketplace');
    const token = useAuthStore((state) => state.token);
    const { fullname, email, setProfile } = useAppStore();

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [emailInput, setEmailInput] = useState('');
    const [referralCode, setReferralCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [checkingSession, setCheckingSession] = useState(true);

    useEffect(() => {
        if (!token) {
            router.replace('/login');
            return;
        }

        if (!needsProfileCompletion({ fullname, email })) {
            router.replace('/explore');
            return;
        }

        const parsedName = splitFullName(fullname);
        setFirstName(parsedName.firstName);
        setLastName(parsedName.lastName);
        setEmailInput(email || '');
        // کد دعوت captured از لینک دعوت (?ref=) — کاربر می‌تواند ویرایش یا پاک کند
        setReferralCode((current) => current || getStoredReferralCode() || '');
        setCheckingSession(false);
    }, [token, fullname, email, router]);

    const handleSubmit = async () => {
        const trimmedFirstName = firstName.trim();
        const trimmedLastName = lastName.trim();
        const trimmedEmail = emailInput.trim();
        const fullName = buildFullName(trimmedFirstName, trimmedLastName);

        if (!trimmedFirstName || !trimmedLastName) {
            notifyError({ message: t('name_required') });
            return;
        }

        if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
            notifyError({ message: t('email_invalid') });
            return;
        }

        if (!token) {
            router.replace('/login');
            return;
        }

        setLoading(true);
        try {
            const res = await axios.patch(
                `${process.env.NEXT_PUBLIC_API_URL}/api/user`,
                {
                    fullName,
                    email: trimmedEmail,
                },
                {
                    headers: { authorization: `Bearer ${token}` },
                },
            );

            if (res.data?.statusCode === 200) {
                const user = res.data?.data?.user;
                if (user) {
                    setProfile(mapApiUserToProfile(user));
                } else {
                    setProfile({
                        fullname: fullName,
                        email: trimmedEmail,
                    });
                }

                // اتصال کد دعوت (تنها مسیر اتصال برای کاربر جدید — ReferralAttributor اینجا کاری نمی‌کند).
                // خطای موقت کد را برای تلاش بعدی حفظ می‌کند؛ رد قطعی با پیام سرور نمایش داده می‌شود.
                const code = referralCode.trim().toUpperCase();
                // کاربر کد پیش‌پرشده را پاک کرد = نمی‌خواهد اعمال شود
                if (!code) clearStoredReferralCode();
                if (code && !wasAttributionAttempted(code)) {
                    if (code !== getStoredReferralCode()) saveReferralCode(code);
                    const result = await attemptReferralAttribution(code);
                    if (result.outcome === 'applied') {
                        SuccessToaster({ message: tm('referral_applied_toast') });
                    } else if (result.outcome === 'invalid') {
                        notifyError({ message: result.message || tm('referral_invalid_toast') });
                    }
                }

                SuccessToaster({ message: t('profile_saved') });
                router.push('/explore');
            }
        } catch (error) {
            notifyError(error);
        } finally {
            setLoading(false);
        }
    };

    if (checkingSession) {
        return null;
    }

    return (
        <AuthContainer>
            <AuthCard>
                <AuthCardHeading>{t('complete_heading')}</AuthCardHeading>
                <AuthCardTitle>{t('complete_title')}</AuthCardTitle>
                <AuthCardSubTitle>
                    {t('complete_subtitle')}
                </AuthCardSubTitle>

                <div className={styles.form}>
                    <div className={styles.fields}>
                        <Field
                            placeholder={t('first_name')}
                            type="text"
                            value={firstName}
                            onChange={setFirstName}
                        />
                        <Field
                            placeholder={t('last_name')}
                            type="text"
                            value={lastName}
                            onChange={setLastName}
                        />
                        <Field
                            placeholder={t('email')}
                            type="text"
                            value={emailInput}
                            onChange={setEmailInput}
                        />
                        <Field
                            placeholder={t('referral_code_optional')}
                            type="text"
                            value={referralCode}
                            onChange={(value: string) => setReferralCode(value.toUpperCase())}
                        />
                        <small className={styles.hint}>{t('referral_code_hint')}</small>
                    </div>

                    <button
                        type="button"
                        className={styles.button}
                        disabled={loading}
                        onClick={handleSubmit}
                    >
                        {loading ? t('saving') : t('continue')}
                    </button>
                </div>
            </AuthCard>
        </AuthContainer>
    );
}
