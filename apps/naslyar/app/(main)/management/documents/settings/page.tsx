'use client';

import React, { useCallback, useEffect, useState } from 'react';
import parentStyles from '../../../marketing/Marketing.module.scss';
import tabStyles from '../../../marketing/automation/Automation.module.scss';
import { Container, Wrapper } from '@/app/(main)/layout';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { LoadingState } from '@my-workspace/components';
import { createDocumentId, loadDocumentSettings, saveDocumentSettings } from '../documents-api';
import type { CustomFieldDef, DocumentSettings } from '../documents.types';
import { DEFAULT_DOCUMENT_SETTINGS } from '../documents.types';

export default function DocumentSettingsPage() {
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState<DocumentSettings>(DEFAULT_DOCUMENT_SETTINGS);
    const [fieldKey, setFieldKey] = useState('');
    const [fieldLabel, setFieldLabel] = useState('');

    const load = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const { value } = await loadDocumentSettings(baseUrl, token);
            setSettings(value);
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, [baseUrl, token]);

    useEffect(() => {
        void load();
    }, [load]);

    const save = async () => {
        if (!token) return;
        try {
            await saveDocumentSettings(baseUrl, token, settings);
            SuccessToaster({ message: 'تنظیمات ذخیره شد' });
        } catch (e) {
            ErrorToaster(e);
        }
    };

    const addField = () => {
        if (!fieldKey.trim() || !fieldLabel.trim()) return;
        const field: CustomFieldDef = {
            id: createDocumentId('cf'),
            key: fieldKey.trim(),
            label: fieldLabel.trim(),
            required: false,
        };
        setSettings({ ...settings, customFields: [...settings.customFields, field] });
        setFieldKey('');
        setFieldLabel('');
    };

    if (loading) return <LoadingState />;

    return (
        <Container>
            <Wrapper>
                <div className={`${parentStyles.container} ${parentStyles.rtl}`}>
                    <header className={parentStyles.header}>
                        <div>
                            <h1 className={parentStyles.mainTitle}>تنظیمات اسناد</h1>
                            <p className={parentStyles.subtitle}>متاداده، نام‌گذاری، حجم و OCR</p>
                        </div>
                    </header>
                    <div className={parentStyles.formCard}>
                        <div className={parentStyles.field}>
                            <label>حداکثر حجم آپلود (MB)</label>
                            <input type="number" value={settings.maxUploadMb} onChange={(e) => setSettings({ ...settings, maxUploadMb: Number(e.target.value) })} />
                        </div>
                        <div className={parentStyles.field}>
                            <label>پسوندهای مجاز (با کاما)</label>
                            <input value={settings.allowedExtensions.join(', ')} onChange={(e) => setSettings({ ...settings, allowedExtensions: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} />
                        </div>
                        <div className={parentStyles.field}>
                            <label>الگوی شماره‌گذاری</label>
                            <input value={settings.namingRule} onChange={(e) => setSettings({ ...settings, namingRule: e.target.value })} placeholder="DOC-{year}-{seq}" />
                        </div>
                        <div className={parentStyles.field}>
                            <label>نگهداری سطل زباله (روز)</label>
                            <input type="number" value={settings.trashRetentionDays} onChange={(e) => setSettings({ ...settings, trashRetentionDays: Number(e.target.value) })} />
                        </div>
                        <label className={parentStyles.toggleLabel}>
                            <span>OCR خودکار</span>
                            <input type="checkbox" checked={settings.ocrEnabled} onChange={(e) => setSettings({ ...settings, ocrEnabled: e.target.checked })} />
                        </label>
                        <h3 className={parentStyles.formSectionTitle}>فیلدهای سفارشی</h3>
                        <div className={tabStyles.inlineActions}>
                            <input placeholder="کلید" value={fieldKey} onChange={(e) => setFieldKey(e.target.value)} />
                            <input placeholder="برچسب" value={fieldLabel} onChange={(e) => setFieldLabel(e.target.value)} />
                            <button type="button" className={tabStyles.smallBtn} onClick={addField}>افزودن</button>
                        </div>
                        {settings.customFields.map((f) => (
                            <div key={f.id} className={tabStyles.stepItem}>{f.label} ({f.key})</div>
                        ))}
                        <div className={parentStyles.formActions}>
                            <button type="button" className={parentStyles.primaryBtn} onClick={() => void save()}>ذخیره</button>
                        </div>
                    </div>
                </div>
            </Wrapper>
        </Container>
    );
}
