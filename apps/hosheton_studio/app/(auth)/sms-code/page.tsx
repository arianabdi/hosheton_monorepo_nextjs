'use client'

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import { SmsCodeComponent } from '@my-workspace/components';
import { notifyError } from '@/app/lib/errors';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { mapApiUserToProfile } from '@/app/lib/user-roles';
import { needsProfileCompletion } from '../lib/needs-profile-completion';
import { useTranslation } from 'react-i18next';

export default function SmsCodePage() {
    const [code, setCode] = useState(Array(5).fill(''));
    const [loading, setLoading] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const router = useRouter();
    const { t } = useTranslation('auth');
    const { t: tc } = useTranslation('common');
    const searchParams = useSearchParams();
    const phone = searchParams.get('number') || '';
    const setAuth = useAuthStore((state) => state.setAuth);
    const { setProfile } = useAppStore();

    useEffect(() => {
        if (!searchParams.get('number')) {
            router.replace('/otp');
        }
    }, [router, searchParams]);

    const verifyOtp = useCallback(
        async (otp: string) => {
            if (!phone || otp.length !== 5) {
                return;
            }
            setLoading(true);
            try {
                const res = await axios.post(
                    `${process.env.NEXT_PUBLIC_API_URL}/api/auth/otp/verify`,
                    { mobile: phone, code: otp },
                );
                if (res.data.statusCode === 200) {
                    const apiUser = res.data.data.user;
                    setProfile(mapApiUserToProfile(apiUser));
                    setAuth(res.data.data.accessToken, {
                        id: apiUser._id,
                        email: apiUser.email || '',
                        name: apiUser.fullName || apiUser.username || phone,
                    });

                    if (needsProfileCompletion(apiUser)) {
                        router.push('/complete-profile');
                    } else {
                        router.push('/explore');
                    }
                }
            } catch (err) {
                notifyError(err);
            } finally {
                setLoading(false);
            }
        },
        [phone, router, setAuth, setProfile],
    );

    const resendCode = async () => {
        if (!phone) {
            router.push('/otp');
            return;
        }
        setResendLoading(true);
        try {
            await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/otp/send`, {
                mobile: phone,
            });
        } catch (err) {
            notifyError(err);
        } finally {
            setResendLoading(false);
        }
    };

    if (!phone) {
        return null;
    }

    return (
        <SmsCodeComponent
            loading={loading || resendLoading}
            code={code}
            setCode={setCode}
            phone={phone}
            onSubmit={(otp: any) => verifyOtp(otp)}
            onResend={resendCode}
            onOtp={() => {
                router.push('/otp');
            }}
            onLogin={() => {
                router.push('/login/email');
            }}
            labels={{
                heading: t('login_heading'),
                title: t('sms_title'),
                subtitle: t('sms_subtitle', { phone }),
                enter: t('enter_panel'),
                noCode: t('no_code'),
                resend: t('resend'),
                or: tc('or'),
                changeNumber: t('change_number'),
                loginWithPrefix: t('login_with'),
                loginWithEmail: t('login_with_email'),
            }}
        />
    );
}
