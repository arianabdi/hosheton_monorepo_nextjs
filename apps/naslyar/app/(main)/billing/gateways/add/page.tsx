'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Container, Wrapper } from '@/app/(main)/layout';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import GatewayForm, { GatewayFormValues } from '../GatewayForm';
import { buildDefaultConfig } from '../gateway-config.definitions';

export default function AddGatewayPage() {
    const router = useRouter();
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (values: GatewayFormValues) => {
        if (!token) return;

        try {
            setSaving(true);
            await axios.post(`${baseUrl}/api/billing/gateways`, {
                slug: values.slug,
                name: values.name,
                description: values.description,
                category: values.category,
                providerType: values.providerType,
                isActive: values.isActive,
                showInCheckout: values.showInCheckout,
                order: Number(values.order) || 0,
                logoSvg: values.logoSvg,
                logoUrl: values.logoUrl,
                config: values.config,
            }, { headers: { authorization: `Bearer ${token}` } });

            SuccessToaster({ message: 'درگاه ایجاد شد' });
            router.push('/billing/gateways');
        } catch (err) {
            ErrorToaster(err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Container>
            <Wrapper>
                <GatewayForm
                    mode="create"
                    saving={saving}
                    onSubmit={handleSubmit}
                    initialValues={{
                        providerType: 'zarinpal',
                        config: buildDefaultConfig('zarinpal'),
                    }}
                />
            </Wrapper>
        </Container>
    );
}
