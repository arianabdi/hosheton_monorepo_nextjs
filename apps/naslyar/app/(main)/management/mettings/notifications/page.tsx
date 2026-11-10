'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
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
    loadActionSmsRule,
    loadMeetings,
    loadSmsReminders,
    saveActionSmsRule,
    saveSmsReminders,
} from '../meetings-api';
import type { MeetingSmsReminder } from '../meetings.types';

const TABS = [
    { id: 'reminders', label: 'یادآوری پیش از جلسه' },
    { id: 'actions', label: 'SMS مصوبات' },
];

export default function NotificationsPage() {
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const [tab, setTab] = useState('reminders');
    const [loading, setLoading] = useState(true);
    const [reminders, setReminders] = useState<MeetingSmsReminder[]>([]);
    const [actionRule, setActionRule] = useState({ enabled: true, sendOnApproval: true, includeDeadline: true });
    const [meetings, setMeetings] = useState<{ id: string; title: string }[]>([]);
    const [meetingId, setMeetingId] = useState('');
    const [hoursBefore, setHoursBefore] = useState(24);

    const load = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const [r, rule, m] = await Promise.all([
                loadSmsReminders(baseUrl, token),
                loadActionSmsRule(baseUrl, token),
                loadMeetings(baseUrl, token),
            ]);
            setReminders(r.value);
            setActionRule({
                enabled: rule.value.enabled,
                sendOnApproval: rule.value.sendOnApproval,
                includeDeadline: rule.value.includeDeadline,
            });
            setMeetings(m.value.map((x) => ({ id: x.id, title: x.title })));
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, [baseUrl, token]);

    useEffect(() => {
        void load();
    }, [load]);

    const addReminder = async () => {
        if (!token || !meetingId) return;
        const meeting = meetings.find((m) => m.id === meetingId);
        const item: MeetingSmsReminder = {
            id: createMeetingId('sms'),
            meetingId,
            meetingTitle: meeting?.title || '',
            hoursBefore,
            isActive: true,
        };
        const next = [item, ...reminders];
        await saveSmsReminders(baseUrl, token, next);
        setReminders(next);
        SuccessToaster({ message: 'یادآوری ثبت شد' });
    };

    const saveActions = async () => {
        if (!token) return;
        await saveActionSmsRule(baseUrl, token, {
            id: 'default',
            ...actionRule,
        });
        SuccessToaster({ message: 'تنظیمات SMS مصوبات ذخیره شد' });
    };

    if (loading) return <LoadingState />;

    return (
        <Container>
            <Wrapper>
                <div className={`${parentStyles.container} ${parentStyles.rtl}`}>
                    <header className={parentStyles.header}>
                        <div>
                            <h1 className={parentStyles.mainTitle}>پیامک و اطلاع‌رسانی</h1>
                            <p className={parentStyles.subtitle}>یادآوری جلسه و ارسال مصوبات — از ماژول SMS پلتفرم</p>
                        </div>
                        <Link href="/settings/sms" className={parentStyles.secondaryBtn}>تنظیمات SMS</Link>
                    </header>
                    <SimpleLineTabs tabs={TABS} activeTab={tab} onChange={setTab} />
                    {tab === 'reminders' && (
                        <>
                            <div className={parentStyles.formCard} style={{ marginBottom: '1rem' }}>
                                <div className={tabStyles.inlineActions}>
                                    <select value={meetingId} onChange={(e) => setMeetingId(e.target.value)}>
                                        <option value="">جلسه</option>
                                        {meetings.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
                                    </select>
                                    <input type="number" value={hoursBefore} onChange={(e) => setHoursBefore(Number(e.target.value))} placeholder="ساعت قبل" />
                                    <button type="button" className={parentStyles.primaryBtn} onClick={() => void addReminder()}>افزودن</button>
                                </div>
                            </div>
                            <div className={tabStyles.tableWrap}>
                                <table className={tabStyles.dataTable}>
                                    <thead><tr><th>جلسه</th><th>ساعت قبل</th><th>فعال</th></tr></thead>
                                    <tbody>
                                        {reminders.map((r) => (
                                            <tr key={r.id}><td>{r.meetingTitle}</td><td>{r.hoursBefore}h</td><td>{r.isActive ? 'بله' : 'خیر'}</td></tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                    {tab === 'actions' && (
                        <div className={parentStyles.formCard}>
                            <label className={parentStyles.toggleLabel}><span>فعال</span><input type="checkbox" checked={actionRule.enabled} onChange={(e) => setActionRule({ ...actionRule, enabled: e.target.checked })} /></label>
                            <label className={parentStyles.toggleLabel}><span>ارسال پس از تأیید صورتجلسه</span><input type="checkbox" checked={actionRule.sendOnApproval} onChange={(e) => setActionRule({ ...actionRule, sendOnApproval: e.target.checked })} /></label>
                            <label className={parentStyles.toggleLabel}><span>شامل مهلت انجام</span><input type="checkbox" checked={actionRule.includeDeadline} onChange={(e) => setActionRule({ ...actionRule, includeDeadline: e.target.checked })} /></label>
                            <button type="button" className={parentStyles.primaryBtn} onClick={() => void saveActions()}>ذخیره</button>
                        </div>
                    )}
                </div>
            </Wrapper>
        </Container>
    );
}
