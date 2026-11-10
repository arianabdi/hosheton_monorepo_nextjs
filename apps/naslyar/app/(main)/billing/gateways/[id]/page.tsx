'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import axios from 'axios';
import { Container, Wrapper } from '@/app/(main)/layout';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import GatewayForm, { GatewayFormValues } from '../GatewayForm';
import { GatewayProviderType } from '../gateway-config.definitions';

export default function EditGatewayPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [initialValues, setInitialValues] = useState<Partial<GatewayFormValues>>();

    useEffect(() => {
        if (!token || !id) return;
        axios.get(`${baseUrl}/api/billing/gateways/${id}`, {
            headers: { authorization: `Bearer ${token}` },
        }).then(res => {
            if (res.data.statusCode === 200) {
                const g = res.data.data;
                setInitialValues({
                    slug: g.slug || '',
                    name: g.name || '',
                    description: g.description || '',
                    category: g.category || 'direct',
                    providerType: (g.providerType || 'zarinpal') as GatewayProviderType,
                    isActive: g.isActive ?? true,
                    showInCheckout: g.showInCheckout ?? true,
                    order: g.order ?? 0,
                    logoSvg: g.logoSvg || '',
                    logoUrl: g.logoUrl || '',
                    config: g.config || {},
                });
            }
        }).catch(ErrorToaster).finally(() => setLoading(false));
    }, [token, id, baseUrl]);

    const handleSubmit = async (values: GatewayFormValues) => {
        if (!token) return;

        try {
            setSaving(true);
            await axios.put(`${baseUrl}/api/billing/gateways/${id}`, {
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

            SuccessToaster({ message: 'درگاه به‌روزرسانی شد' });
            router.push('/billing/gateways');
        } catch (err) {
            ErrorToaster(err);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <Container><Wrapper><p style={{ textAlign: 'center', padding: '40px' }}>در حال بارگذاری...</p></Wrapper></Container>
        );
    }

    return (
        <Container>
            <Wrapper>
                <GatewayForm mode="edit" initialValues={initialValues} saving={saving} onSubmit={handleSubmit} />
            </Wrapper>
        </Container>
    );
}
