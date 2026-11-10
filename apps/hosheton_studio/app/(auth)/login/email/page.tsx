'use client';

import React, { useRef, useState } from 'react';
import axios from 'axios';
import { LoginComponent } from '@my-workspace/components';
import { useRouter } from 'next/navigation';
import { notifyError } from '@/app/lib/errors';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { mapApiUserToProfile } from '@/app/lib/user-roles';
import { openLegalPageInNewTab } from '@/app/lib/legal-pages';
import { useTranslation } from 'react-i18next';

export default function EmailLogin() {
    const router = useRouter();
    const { t } = useTranslation('auth');
    const { t: tc } = useTranslation('common');
    const { setProfile } = useAppStore();
    const setAuth = useAuthStore((state) => state.setAuth);
    const [form, setForm] = useState({
        username: '',
        password: '',
    });
    const [loading, setLoading] = useState(false);
    const submittingRef = useRef(false);

    const onFormSubmit = async () => {
        if (submittingRef.current) return;
        submittingRef.current = true;
        setLoading(true);
        try {
            const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/user/login`, {
                email: form.username,
                password: form.password,
            });

            if (res.data.statusCode === 200) {
                const apiUser = res.data.data.user;
                setProfile(mapApiUserToProfile(apiUser));
                setAuth(res.data.data.accessToken, {
                    id: apiUser._id,
                    email: apiUser.email,
                    name: apiUser.fullName || apiUser.username || apiUser.email,
                });
                router.push('/explore');
            }
        } catch (e) {
            notifyError(e);
        } finally {
            submittingRef.current = false;
            setLoading(false);
        }
    };

    return (
        <LoginComponent
            loading={loading}
            form={form}
            setForm={(e: any) => { setForm(e); }}
            onSubmit={async () => { await onFormSubmit(); }}
            onOtp={() => { router.push('/login'); }}
            onTerms={() => openLegalPageInNewTab('terms')}
            onPrivacy={() => openLegalPageInNewTab('privacy')}
            labels={{
                heading: t('login_heading'),
                title: t('login_title'),
                subtitle: t('login_subtitle'),
                username: t('username'),
                password: t('password'),
                terms: t('terms_link'),
                privacy: t('privacy_link'),
                acceptSuffix: t('platform_accept'),
                and: tc('and'),
                submit: t('login_btn'),
                newMember: t('new_member'),
                register: t('register'),
                forgot: t('forgot_password'),
                loginWithPrefix: t('login_with'),
                loginWithPhone: t('login_with_phone'),
            }}
        />
    );
}
