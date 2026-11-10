'use client';

import React, { useCallback, useEffect, useState } from 'react';
import tabStyles from '../../../marketing/automation/Automation.module.scss';
import parentStyles from '../../../marketing/Marketing.module.scss';
import { Container, Wrapper } from '@/app/(main)/layout';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { LoadingState } from '@my-workspace/components';
import { createMeetingId, loadActionItems, loadMeetings, saveActionItems } from '../meetings-api';
import type { ActionItemStatus, MeetingActionItem } from '../meetings.types';
import { ACTION_STATUS_LABELS } from '../meetings.types';

export default function ActionItemsPage() {
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<MeetingActionItem[]>([]);
    const [meetings, setMeetings] = useState<{ id: string; title: string }[]>([]);
    const [meetingId, setMeetingId] = useState('');
    const [title, setTitle] = useState('');
    const [assignee, setAssignee] = useState('');
    const [dueDate, setDueDate] = useState('');

    const load = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const [a, m] = await Promise.all([loadActionItems(baseUrl, token), loadMeetings(baseUrl, token)]);
            setItems(a.value);
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

    const addItem = async () => {
        if (!token || !meetingId || !title.trim()) return;
        const meeting = meetings.find((m) => m.id === meetingId);
        const now = new Date().toISOString();
        const item: MeetingActionItem = {
            id: createMeetingId('act'),
            meetingId,
            meetingTitle: meeting?.title || '',
            title: title.trim(),
            assignee,
            dueDate: dueDate || undefined,
            status: 'in_progress',
            smsSent: false,
            createdAt: now,
            updatedAt: now,
        };
        const next = [item, ...items];
        await saveActionItems(baseUrl, token, next);
        setItems(next);
        setTitle('');
        setAssignee('');
        setDueDate('');
        SuccessToaster({ message: 'مصوبه ثبت شد' });
    };

    const setStatus = async (id: string, status: ActionItemStatus) => {
        if (!token) return;
        const now = new Date().toISOString();
        const next = items.map((i) => (i.id === id ? { ...i, status, updatedAt: now } : i));
        await saveActionItems(baseUrl, token, next);
        setItems(next);
    };

    if (loading) return <LoadingState />;

    return (
        <Container>
            <Wrapper>
                <div className={`${parentStyles.container} ${parentStyles.rtl}`}>
                    <header className={parentStyles.header}>
                        <div>
                            <h1 className={parentStyles.mainTitle}>پیگیری مصوبات</h1>
                            <p className={parentStyles.subtitle}>بورد وظایف خروجی جلسات</p>
                        </div>
                    </header>
                    <div className={parentStyles.formCard} style={{ marginBottom: '1rem' }}>
                        <div className={tabStyles.inlineActions}>
                            <select value={meetingId} onChange={(e) => setMeetingId(e.target.value)}>
                                <option value="">جلسه</option>
                                {meetings.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
                            </select>
                            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان مصوبه" />
                            <input value={assignee} onChange={(e) => setAssignee(e.target.value)} placeholder="مسئول" />
                            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                            <button type="button" className={parentStyles.primaryBtn} onClick={() => void addItem()}>افزودن</button>
                        </div>
                    </div>
                    <div className={tabStyles.tableWrap}>
                        <table className={tabStyles.dataTable}>
                            <thead><tr><th>جلسه</th><th>مصوبه</th><th>مسئول</th><th>مهلت</th><th>وضعیت</th><th>عملیات</th></tr></thead>
                            <tbody>
                                {items.length === 0 ? <tr><td colSpan={6} style={{ textAlign: 'center' }}>مصوبه‌ای نیست</td></tr> : items.map((i) => (
                                    <tr key={i.id}>
                                        <td>{i.meetingTitle}</td>
                                        <td>{i.title}</td>
                                        <td>{i.assignee || '—'}</td>
                                        <td>{i.dueDate ? new Date(i.dueDate).toLocaleDateString('fa-IR') : '—'}</td>
                                        <td>{ACTION_STATUS_LABELS[i.status]}</td>
                                        <td>
                                            <div className={tabStyles.inlineActions}>
                                                {i.status !== 'done' && (
                                                    <button type="button" className={tabStyles.smallBtn} onClick={() => void setStatus(i.id, 'done')}>انجام شد</button>
                                                )}
                                                <button type="button" className={tabStyles.smallBtn} onClick={() => void setStatus(i.id, 'overdue')}>معوق</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </Wrapper>
        </Container>
    );
}
