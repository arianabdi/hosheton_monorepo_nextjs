'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { Container, Wrapper } from '@/app/(main)/layout';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import listStyles from '../../billing/gateways/GatewaysList.module.scss';
import tabStyles from './SmsSettings.module.scss';
import SmsProvidersPanel, { SmsProviderRow } from './SmsProvidersPanel';
import SmsGeneralSettingsPanel from './SmsGeneralSettingsPanel';
import SmsPatternsPanel from './SmsPatternsPanel';
import {
    DEFAULT_SMS_GENERAL_SETTINGS,
    mapSmsSettingsFromApi,
    type SmsGeneralSettingsForm,
} from './sms-general-settings.definitions';

type SmsTab = 'providers' | 'patterns' | 'general';

const TABS: { id: SmsTab; label: string }[] = [
    { id: 'providers', label: 'پنل‌های پیامک' },
    { id: 'patterns', label: 'پترن‌ها' },
    { id: 'general', label: 'تنظیمات عمومی' },
];

function mapSettingsFromApi(raw: Record<string, unknown>) {
    return mapSmsSettingsFromApi(raw);
}

export default function SmsSettingsPage() {
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const [tab, setTab] = useState<SmsTab>('providers');
    const [loading, setLoading] = useState(true);
    const [savingGeneral, setSavingGeneral] = useState(false);
    const [providers, setProviders] = useState<SmsProviderRow[]>([]);
    const [generalSettings, setGeneralSettings] = useState(DEFAULT_SMS_GENERAL_SETTINGS);

    const load = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const [provRes, settingsRes] = await Promise.all([
                axios.get(`${baseUrl}/api/sms/providers`, {
                    headers: { authorization: `Bearer ${token}` },
                }),
                axios.get(`${baseUrl}/api/sms/settings`, {
                    headers: { authorization: `Bearer ${token}` },
                }),
            ]);
            setProviders(provRes.data?.data || []);
            setGeneralSettings(mapSettingsFromApi(settingsRes.data?.data || {}));
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, [baseUrl, token]);

    useEffect(() => {
        void load();
    }, [load]);

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`حذف پنل «${name}»؟`)) return;
        try {
            await axios.delete(`${baseUrl}/api/sms/providers/${id}`, {
                headers: { authorization: `Bearer ${token}` },
            });
            SuccessToaster({ message: 'پنل حذف شد' });
            await load();
        } catch (e) {
            ErrorToaster(e);
        }
    };

    const saveGeneralSettings = async (values: SmsGeneralSettingsForm) => {
        if (!token) return;
        try {
            setSavingGeneral(true);
            const res = await axios.put(
                `${baseUrl}/api/sms/settings`,
                values,
                { headers: { authorization: `Bearer ${token}` } },
            );
            setGeneralSettings(mapSettingsFromApi(res.data?.data || values));
            SuccessToaster({ message: 'تنظیمات ذخیره شد' });
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setSavingGeneral(false);
        }
    };

    return (
        <Container>
            <Wrapper>
                <div className={`${listStyles.container} ${listStyles.rtl} ${tabStyles.rtl} ${tabStyles.pageFullWidth}`}>
                    <header className={listStyles.header}>
                        <div>
                            <h1 className={listStyles.mainTitle}>تنظیمات پیامک</h1>
                            <p className={listStyles.subtitle}>
                                پنل‌های ارسال را مدیریت کنید و برای OTP و رویدادها پنل پیش‌فرض تعیین کنید.
                            </p>
                        </div>
                        {tab === 'providers' ? (
                            <Link href="/settings/sms/add" className={listStyles.primaryBtn}>
                                + پنل پیامک جدید
                            </Link>
                        ) : null}
                    </header>

                    <nav className={tabStyles.tabBar} aria-label="بخش‌های تنظیمات پیامک">
                        {TABS.map(t => (
                            <button
                                key={t.id}
                                type="button"
                                className={`${tabStyles.tab} ${tab === t.id ? tabStyles.tabActive : ''}`}
                                onClick={() => setTab(t.id)}
                            >
                                {t.label}
                            </button>
                        ))}
                    </nav>

                    {tab === 'providers' ? (
                        <SmsProvidersPanel
                            loading={loading}
                            providers={providers}
                            settings={generalSettings}
                            onDelete={handleDelete}
                            onOpenGeneralTab={() => setTab('general')}
                        />
                    ) : tab === 'patterns' ? (
                        <SmsPatternsPanel
                            loading={loading}
                            providers={providers}
                            onProvidersChanged={load}
                        />
                    ) : (
                        <SmsGeneralSettingsPanel
                            providers={providers}
                            initial={generalSettings}
                            saving={savingGeneral}
                            onSave={saveGeneralSettings}
                        />
                    )}
                </div>
            </Wrapper>
        </Container>
    );
}
