'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import tabStyles from '../../../marketing/automation/Automation.module.scss';
import parentStyles from '../../../marketing/Marketing.module.scss';
import { Container, Wrapper } from '@/app/(main)/layout';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { LoadingState } from '@my-workspace/components';
import SimpleLineTabs from '@/app/components/SimpleLineTabs/SimpleLineTabs';
import { createMeetingId, ensureMeetingDmsFolder, loadMeetings, saveMeetings } from '../meetings-api';
import type { Meeting, MeetingInvitee, MeetingRecurrence } from '../meetings.types';
import { RECURRENCE_LABELS, MEETING_STATUS_LABELS } from '../meetings.types';

const TABS = [
    { id: 'list', label: 'لیست جلسات' },
    { id: 'recurrence', label: 'جلسات دوره‌ای' },
    { id: 'calendar', label: 'تقویم و مدعوین' },
];

export default function SchedulingPage() {
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const [tab, setTab] = useState('list');
    const [loading, setLoading] = useState(true);
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [title, setTitle] = useState('');
    const [startsAt, setStartsAt] = useState('');
    const [durationMinutes, setDurationMinutes] = useState(60);
    const [recurrence, setRecurrence] = useState<MeetingRecurrence>('once');
    const [recurrenceRule, setRecurrenceRule] = useState('');
    const [inviteeName, setInviteeName] = useState('');
    const [invitees, setInvitees] = useState<MeetingInvitee[]>([]);

    const load = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const { value } = await loadMeetings(baseUrl, token);
            setMeetings(value);
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, [baseUrl, token]);

    useEffect(() => {
        void load();
    }, [load]);

    const recurring = useMemo(() => meetings.filter((m) => m.recurrence !== 'once'), [meetings]);

    const addInvitee = () => {
        if (!inviteeName.trim()) return;
        setInvitees([
            ...invitees,
            { id: createMeetingId('inv'), name: inviteeName.trim() },
        ]);
        setInviteeName('');
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token || !title.trim() || !startsAt) return;
        try {
            const now = new Date().toISOString();
            let meeting: Meeting = {
                id: createMeetingId('mtg'),
                title: title.trim(),
                startsAt: new Date(startsAt).toISOString(),
                durationMinutes,
                recurrence,
                recurrenceRule: recurrence !== 'once' ? recurrenceRule : undefined,
                invitees,
                status: 'scheduled',
                createdAt: now,
                updatedAt: now,
            };
            const folder = await ensureMeetingDmsFolder(baseUrl, token, meeting);
            meeting = { ...meeting, dmsFolderId: folder.folderId, dmsFolderPath: folder.folderPath };
            const next = [meeting, ...meetings];
            await saveMeetings(baseUrl, token, next);
            setMeetings(next);
            setShowForm(false);
            setTitle('');
            setStartsAt('');
            setInvitees([]);
            SuccessToaster({ message: 'جلسه ایجاد شد و پوشه DMS ساخته شد' });
        } catch (err) {
            ErrorToaster(err);
        }
    };

    if (loading) return <LoadingState />;

    return (
        <Container>
            <Wrapper>
                <div className={`${parentStyles.container} ${parentStyles.rtl}`}>
                    <header className={parentStyles.header}>
                        <div>
                            <h1 className={parentStyles.mainTitle}>تعریف و زمان‌بندی جلسات</h1>
                            <p className={parentStyles.subtitle}>جلسات تک‌مرتبه، هفتگی و ماهانه</p>
                        </div>
                        <button type="button" className={parentStyles.primaryBtn} onClick={() => setShowForm(true)}>+ جلسه</button>
                    </header>
                    <SimpleLineTabs tabs={TABS} activeTab={tab} onChange={setTab} />
                    {tab === 'list' && (
                        <div className={tabStyles.tableWrap}>
                            <table className={tabStyles.dataTable}>
                                <thead><tr><th>عنوان</th><th>شروع</th><th>مدت</th><th>وضعیت</th><th>مدعوین</th></tr></thead>
                                <tbody>
                                    {meetings.length === 0 ? <tr><td colSpan={5} style={{ textAlign: 'center' }}>جلسه‌ای ثبت نشده</td></tr> : meetings.map((m) => (
                                        <tr key={m.id}>
                                            <td>{m.title}</td>
                                            <td>{new Date(m.startsAt).toLocaleString('fa-IR')}</td>
                                            <td>{m.durationMinutes} دقیقه</td>
                                            <td>{MEETING_STATUS_LABELS[m.status]}</td>
                                            <td>{m.invitees.length}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {tab === 'recurrence' && (
                        <div className={tabStyles.tableWrap}>
                            <table className={tabStyles.dataTable}>
                                <thead><tr><th>عنوان</th><th>تکرار</th><th>قاعده</th></tr></thead>
                                <tbody>
                                    {recurring.length === 0 ? <tr><td colSpan={3} style={{ textAlign: 'center' }}>—</td></tr> : recurring.map((m) => (
                                        <tr key={m.id}><td>{m.title}</td><td>{RECURRENCE_LABELS[m.recurrence]}</td><td>{m.recurrenceRule || '—'}</td></tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {tab === 'calendar' && (
                        <div className={parentStyles.formCard}>
                            <p className={parentStyles.fieldHint}>گروه‌های کاری و مدعوین جلسات برنامه‌ریزی‌شده</p>
                            {meetings.flatMap((m) => m.invitees.map((i) => ({ ...i, meetingTitle: m.title }))).map((i) => (
                                <div key={i.id} className={tabStyles.stepItem}>{i.meetingTitle}: {i.name}</div>
                            ))}
                            {meetings.every((m) => m.invitees.length === 0) && <p>مدعویی ثبت نشده</p>}
                        </div>
                    )}
                    {showForm && (
                        <div className={tabStyles.modalOverlay} onClick={() => setShowForm(false)}>
                            <div className={tabStyles.modal} onClick={(e) => e.stopPropagation()}>
                                <h2 className={tabStyles.modalTitle}>جلسه جدید</h2>
                                <form onSubmit={handleCreate}>
                                    <div className={parentStyles.field}><label>عنوان</label><input value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
                                    <div className={parentStyles.field}><label>شروع</label><input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required /></div>
                                    <div className={parentStyles.field}><label>مدت (دقیقه)</label><input type="number" value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value))} /></div>
                                    <div className={parentStyles.field}>
                                        <label>تکرار</label>
                                        <select value={recurrence} onChange={(e) => setRecurrence(e.target.value as MeetingRecurrence)}>
                                            {Object.entries(RECURRENCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                        </select>
                                    </div>
                                    {recurrence !== 'once' && (
                                        <div className={parentStyles.field}><label>قاعده (مثلاً شنبه ۱۰:۰۰)</label><input value={recurrenceRule} onChange={(e) => setRecurrenceRule(e.target.value)} /></div>
                                    )}
                                    <div className={parentStyles.field}>
                                        <label>مدعو</label>
                                        <div className={tabStyles.inlineActions}>
                                            <input value={inviteeName} onChange={(e) => setInviteeName(e.target.value)} placeholder="نام" />
                                            <button type="button" className={tabStyles.smallBtn} onClick={addInvitee}>افزودن</button>
                                        </div>
                                        {invitees.map((i) => <div key={i.id} className={tabStyles.stepItem}>{i.name}</div>)}
                                    </div>
                                    <div className={parentStyles.formActions}>
                                        <button type="submit" className={parentStyles.primaryBtn}>ایجاد + پوشه DMS</button>
                                        <button type="button" className={parentStyles.secondaryBtn} onClick={() => setShowForm(false)}>انصراف</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </Wrapper>
        </Container>
    );
}
