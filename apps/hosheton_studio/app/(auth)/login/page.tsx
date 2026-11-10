'use client';

import React, { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { OtpComponent } from '@my-workspace/components';
import { notifyError } from '@/app/lib/errors';
import { useTranslation } from 'react-i18next';
import { isRtlLanguage } from '@/app/lib/i18n/config';
import { openLegalPageInNewTab } from '@/app/lib/legal-pages';

export default function Login() {
    const router = useRouter();
    const { t } = useTranslation('auth');
    const { t: tc, i18n } = useTranslation('common');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    // Guards against double-submission: React batches state updates, so a fast
    // second click could fire another request before the button's disabled
    // attribute takes effect.
    const submittingRef = useRef(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (submittingRef.current) return;
        if (!(phone.length === 11 && phone.startsWith('09'))) {
            alert(t('invalid_phone'));
            return;
        }

        submittingRef.current = true;
        setLoading(true);
        try {
            const res = await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL}/api/auth/otp/send`,
                { mobile: phone },
            );
            if (res.data.statusCode === 200) {
                router.push(`/sms-code?number=${encodeURIComponent(phone)}`);
            }
        } catch (err) {
            notifyError(err);
        } finally {
            submittingRef.current = false;
            setLoading(false);
        }
    };

    return (
        <OtpComponent
            loading={loading}
            phone={phone}
            setPhone={setPhone}
            digitsLocale={isRtlLanguage(i18n.language) ? 'fa' : 'en'}
            onSubmit={handleSubmit}
            onLogin={() => {
                router.push('/login/email');
            }}
            onTerms={() => openLegalPageInNewTab('terms')}
            onPrivacy={() => openLegalPageInNewTab('privacy')}
            labels={{
                heading: t('login_heading'),
                title: t('otp_title'),
                subtitle: t('otp_subtitle'),
                terms: t('terms_link'),
                privacy: t('privacy_link'),
                acceptSuffix: t('platform_accept'),
                and: tc('and'),
                send: t('send_code'),
                sending: t('sending'),
                loginWithEmail: t('login_with_email'),
                loginWithPrefix: t('login_with'),
            }}
        />
    );
}
