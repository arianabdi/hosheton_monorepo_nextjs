'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Container, Wrapper } from '@/app/(main)/layout';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import SmsProviderForm, { SmsProviderFormValues } from '../SmsProviderForm';
import { buildDefaultSmsConfig } from '../sms-provider.definitions';

export default function AddSmsProviderPage() {
    const router = useRouter();
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (values: SmsProviderFormValues) => {
        if (!token) return;
        try {
            setSaving(true);
            await axios.post(
                `${baseUrl}/api/sms/providers`,
                {
                    slug: values.slug,
                    name: values.name,
                    description: values.description,
                    providerType: values.providerType,
                    isActive: values.isActive,
                    order: Number(values.order) || 0,
                    config: values.config,
                },
                { headers: { authorization: `Bearer ${token}` } },
            );
            SuccessToaster({ message: 'پنل پیامک ایجاد شد' });
            router.push('/settings/sms');
        } catch (err) {
            ErrorToaster(err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Container>
            <Wrapper>
                <SmsProviderForm
                    mode="create"
                    saving={saving}
                    onSubmit={handleSubmit}
                    initialValues={{
                        providerType: 'iran_payamak',
                        config: buildDefaultSmsConfig('iran_payamak'),
                    }}
                />
            </Wrapper>
        </Container>
    );
}
