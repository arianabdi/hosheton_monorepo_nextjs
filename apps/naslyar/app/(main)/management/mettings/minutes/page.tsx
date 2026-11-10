'use client';

import React, { useCallback, useEffect, useState } from 'react';
import tabStyles from '../../../marketing/automation/Automation.module.scss';
import parentStyles from '../../../marketing/Marketing.module.scss';
import { Container, Wrapper } from '@/app/(main)/layout';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { LoadingState } from '@my-workspace/components';
import SimpleLineTabs from '@/app/components/SimpleLineTabs/SimpleLineTabs';
import {
    createMeetingId,
    loadMeetings,
    loadMinuteTemplates,
    loadMinutes,
    saveMinuteTemplates,
    saveMinutes,
} from '../meetings-api';
import type { MeetingMinute, MeetingMinuteTemplate } from '../meetings.types';
import { MINUTE_STATUS_LABELS } from '../meetings.types';

const TABS = [
    { id: 'minutes', label: 'صورتجلسات' },
    { id: 'templates', label: 'فرم‌ساز' },
];

export default function MinutesPage() {
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const [tab, setTab] = useState('minutes');
    const [loading, setLoading] = useState(true);
    const [minutes, setMinutes] = useState<MeetingMinute[]>([]);
    const [templates, setTemplates] = useState<MeetingMinuteTemplate[]>([]);
    const [meetings, setMeetings] = useState<{ id: string; title: string }[]>([]);
    const [meetingId, setMeetingId] = useState('');
    const [body, setBody] = useState('');
    const [templateName, setTemplateName] = useState('');

    const load = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const [m, t, mtg] = await Promise.all([
                loadMinutes(baseUrl, token),
                loadMinuteTemplates(baseUrl, token),
                loadMeetings(baseUrl, token),
            ]);
            setMinutes(m.value);
            setTemplates(t.value);
            setMeetings(mtg.value.map((x) => ({ id: x.id, title: x.title })));
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, [baseUrl, token]);

    useEffect(() => {
        void load();
    }, [load]);

    const saveMinute = async () => {
        if (!token || !meetingId || !body.trim()) return;
        const meeting = meetings.find((m) => m.id === meetingId);
        const now = new Date().toISOString();
        const item: MeetingMinute = {
            id: createMeetingId('min'),
            meetingId,
            meetingTitle: meeting?.title || '',
            body,
            formValues: {},
            status: 'draft',
            createdAt: now,
            updatedAt: now,
        };
        const next = [item, ...minutes];
        await saveMinutes(baseUrl, token, next);
        setMinutes(next);
        setBody('');
        SuccessToaster({ message: 'صورتجلسه ذخیره شد' });
    };

    const approveAndSendDms = async (id: string) => {
        if (!token) return;
        const now = new Date().toISOString();
        const next = minutes.map((m) =>
            m.id === id
                ? {
                      ...m,
                      status: 'sent_to_dms' as const,
                      dmsDocumentId: `pdf_${m.id}`,
                      approvedAt: now,
                      updatedAt: now,
                  }
                : m,
        );
        await saveMinutes(baseUrl, token, next);
        setMinutes(next);
        SuccessToaster({ message: 'PDF به DMS ارسال شد (MVP: شناسه mock)' });
    };

    const addTemplate = async () => {
        if (!token || !templateName.trim()) return;
        const tpl: MeetingMinuteTemplate = {
            id: createMeetingId('tpl'),
            name: templateName,
            fields: [
                { id: createMeetingId('f'), label: 'حاضرین', type: 'textarea', required: true },
                { id: createMeetingId('f'), label: 'مصوبات', type: 'textarea', required: true },
            ],
            createdAt: new Date().toISOString(),
        };
        const next = [...templates, tpl];
        await saveMinuteTemplates(baseUrl, token, next);
        setTemplates(next);
        setTemplateName('');
        SuccessToaster({ message: 'قالب فرم اضافه شد' });
    };

    if (loading) return <LoadingState />;

    return (
        <Container>
            <Wrapper>
                <div className={`${parentStyles.container} ${parentStyles.rtl}`}>
                    <header className={parentStyles.header}>
                        <div>
                            <h1 className={parentStyles.mainTitle}>صورتجلسات و فرم‌ها</h1>
                            <p className={parentStyles.subtitle}>ثبت آنلاین و خروجی PDF به DMS پس از تأیید</p>
                        </div>
                    </header>
                    <SimpleLineTabs tabs={TABS} activeTab={tab} onChange={setTab} />
                    {tab === 'minutes' && (
                        <>
                            <div className={parentStyles.formCard} style={{ marginBottom: '1rem' }}>
                                <div className={parentStyles.field}>
                                    <label>جلسه</label>
                                    <select value={meetingId} onChange={(e) => setMeetingId(e.target.value)}>
                                        <option value="">انتخاب</option>
                                        {meetings.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
                                    </select>
                                </div>
                                <div className={parentStyles.field}>
                                    <label>متن صورتجلسه</label>
                                    <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} />
                                </div>
                                <button type="button" className={parentStyles.primaryBtn} onClick={() => void saveMinute()}>ذخیره پیش‌نویس</button>
                            </div>
                            <div className={tabStyles.tableWrap}>
                                <table className={tabStyles.dataTable}>
                                    <thead><tr><th>جلسه</th><th>وضعیت</th><th>DMS ID</th><th>عملیات</th></tr></thead>
                                    <tbody>
                                        {minutes.map((m) => (
                                            <tr key={m.id}>
                                                <td>{m.meetingTitle}</td>
                                                <td>{MINUTE_STATUS_LABELS[m.status]}</td>
                                                <td dir="ltr">{m.dmsDocumentId || '—'}</td>
                                                <td>
                                                    {m.status === 'draft' && (
                                                        <button type="button" className={tabStyles.smallBtn} onClick={() => void approveAndSendDms(m.id)}>تأیید + PDF به DMS</button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                    {tab === 'templates' && (
                        <div className={parentStyles.formCard}>
                            <div className={tabStyles.inlineActions}>
                                <input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="نام قالب" />
                                <button type="button" className={parentStyles.primaryBtn} onClick={() => void addTemplate()}>افزودن قالب</button>
                            </div>
                            {templates.map((t) => (
                                <div key={t.id} className={tabStyles.stepItem}>{t.name}: {t.fields.map((f) => f.label).join('، ')}</div>
                            ))}
                        </div>
                    )}
                </div>
            </Wrapper>
        </Container>
    );
}
