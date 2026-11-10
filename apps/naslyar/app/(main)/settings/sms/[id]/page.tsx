'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import axios from 'axios';
import { Container, Wrapper } from '@/app/(main)/layout';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { LoadingState } from '@my-workspace/components';
import SmsProviderForm, { SmsProviderFormValues } from '../SmsProviderForm';
import { buildDefaultSmsConfig, SmsProviderType } from '../sms-provider.definitions';

export default function EditSmsProviderPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [initialValues, setInitialValues] = useState<Partial<SmsProviderFormValues>>();

    useEffect(() => {
        if (!token || !id) return;
        axios
            .get(`${baseUrl}/api/sms/providers/${id}`, { headers: { authorization: `Bearer ${token}` } })
            .then(res => {
                const p = res.data?.data;
                if (!p) {
                    ErrorToaster({ message: 'پنل یافت نشد' });
                    return;
                }
                const providerType = (p.providerType || 'iran_payamak') as SmsProviderType;
                const config = {
                    ...buildDefaultSmsConfig(providerType),
                    ...Object.fromEntries(
                        Object.entries(p.config || {}).map(([k, v]) => [k, String(v ?? '')]),
                    ),
                };
                setInitialValues({
                    slug: p.slug,
                    name: p.name,
                    description: p.description || '',
                    providerType,
                    isActive: p.isActive ?? true,
                    order: p.order ?? 0,
                    config,
                });
            })
            .catch(ErrorToaster)
            .finally(() => setLoading(false));
    }, [token, id, baseUrl]);

    const handleSubmit = async (values: SmsProviderFormValues) => {
        if (!token) return;
        try {
            setSaving(true);
            await axios.put(
                `${baseUrl}/api/sms/providers/${id}`,
                {
                    name: values.name,
                    description: values.description,
                    providerType: values.providerType,
                    isActive: values.isActive,
                    order: Number(values.order) || 0,
                    config: values.config,
                },
                { headers: { authorization: `Bearer ${token}` } },
            );
            SuccessToaster({ message: 'پنل به‌روزرسانی شد' });
            router.push('/settings/sms');
        } catch (err) {
            ErrorToaster(err);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <Container>
                <Wrapper>
                    <LoadingState />
                </Wrapper>
            </Container>
        );
    }

    return (
        <Container>
            <Wrapper>
                <SmsProviderForm
                    mode="edit"
                    providerId={id}
                    initialValues={initialValues}
                    saving={saving}
                    onSubmit={handleSubmit}
                />
            </Wrapper>
        </Container>
    );
}
