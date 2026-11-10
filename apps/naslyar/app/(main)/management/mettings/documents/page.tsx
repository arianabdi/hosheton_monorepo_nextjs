'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import tabStyles from '../../../marketing/automation/Automation.module.scss';
import parentStyles from '../../../marketing/Marketing.module.scss';
import { Container, Wrapper } from '@/app/(main)/layout';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { LoadingState } from '@my-workspace/components';
import SimpleLineTabs from '@/app/components/SimpleLineTabs/SimpleLineTabs';
import { exploreFiles } from '../../documents/documents-api';
import { createMeetingId, loadAttachments, loadMeetings, loadMinutes, saveAttachments } from '../meetings-api';

const TABS = [
    { id: 'attachments', label: 'پیوست‌ها' },
    { id: 'archive', label: 'آرشیو DMS' },
];

export default function MeetingDocumentsPage() {
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const [tab, setTab] = useState('attachments');
    const [loading, setLoading] = useState(true);
    const [attachments, setAttachments] = useState<Awaited<ReturnType<typeof loadAttachments>>['value']>([]);
    const [minutes, setMinutes] = useState<Awaited<ReturnType<typeof loadMinutes>>['value']>([]);
    const [meetings, setMeetings] = useState<Awaited<ReturnType<typeof loadMeetings>>['value']>([]);
    const [files, setFiles] = useState<Awaited<ReturnType<typeof exploreFiles>>['files']>([]);
    const [meetingId, setMeetingId] = useState('');
    const [fileId, setFileId] = useState('');

    const load = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const [a, m, mtg, explore] = await Promise.all([
                loadAttachments(baseUrl, token),
                loadMinutes(baseUrl, token),
                loadMeetings(baseUrl, token),
                exploreFiles(baseUrl, token, { limit: 100 }),
            ]);
            setAttachments(a.value);
            setMinutes(m.value);
            setMeetings(mtg.value);
            setFiles(explore.files);
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, [baseUrl, token]);

    useEffect(() => {
        void load();
    }, [load]);

    const archiveItems = useMemo(() => {
        const fromMinutes = minutes
            .filter((m) => m.dmsDocumentId)
            .map((m) => ({
                id: m.dmsDocumentId!,
                name: `صورتجلسه — ${m.meetingTitle}`,
                meetingId: m.meetingId,
            }));
        const fromAttachments = attachments.map((a) => ({
            id: a.dmsDocumentId,
            name: a.fileName,
            meetingId: a.meetingId,
        }));
        return [...fromMinutes, ...fromAttachments];
    }, [minutes, attachments]);

    const linkAttachment = async () => {
        if (!token || !meetingId || !fileId) return;
        const file = files.find((f) => f._id === fileId);
        const meeting = meetings.find((m) => m.id === meetingId);
        const item = {
            id: createMeetingId('att'),
            meetingId,
            dmsDocumentId: fileId,
            dmsFolderId: meeting?.dmsFolderId,
            fileName: file?.originalname || file?.name || fileId,
            linkedAt: new Date().toISOString(),
        };
        const next = [item, ...attachments];
        await saveAttachments(baseUrl, token, next);
        setAttachments(next);
        SuccessToaster({ message: 'پیوست به جلسه لینک شد (فقط ID در DB)' });
    };

    if (loading) return <LoadingState />;

    return (
        <Container>
            <Wrapper>
                <div className={`${parentStyles.container} ${parentStyles.rtl}`}>
                    <header className={parentStyles.header}>
                        <div>
                            <h1 className={parentStyles.mainTitle}>اسناد و فایل‌های جلسه</h1>
                            <p className={parentStyles.subtitle}>Client برای DMS — بدون storage مستقل</p>
                        </div>
                        <Link href="/management/documents/explorer" className={parentStyles.secondaryBtn}>باز کردن DMS</Link>
                    </header>
                    <SimpleLineTabs tabs={TABS} activeTab={tab} onChange={setTab} />
                    {tab === 'attachments' && (
                        <>
                            <div className={parentStyles.formCard} style={{ marginBottom: '1rem' }}>
                                <p className={parentStyles.fieldHint}>انتخاب فایل از DMS یا ثبت dms_document_id پس از آپلود</p>
                                <div className={tabStyles.inlineActions}>
                                    <select value={meetingId} onChange={(e) => setMeetingId(e.target.value)}>
                                        <option value="">جلسه</option>
                                        {meetings.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
                                    </select>
                                    <select value={fileId} onChange={(e) => setFileId(e.target.value)}>
                                        <option value="">فایل DMS</option>
                                        {files.map((f) => <option key={f._id} value={f._id}>{f.originalname || f.name}</option>)}
                                    </select>
                                    <button type="button" className={parentStyles.primaryBtn} onClick={() => void linkAttachment()}>لینک پیوست</button>
                                </div>
                            </div>
                            <div className={tabStyles.tableWrap}>
                                <table className={tabStyles.dataTable}>
                                    <thead><tr><th>جلسه</th><th>فایل</th><th>dms_document_id</th><th>پوشه</th></tr></thead>
                                    <tbody>
                                        {attachments.map((a) => (
                                            <tr key={a.id}>
                                                <td>{meetings.find((m) => m.id === a.meetingId)?.title || a.meetingId}</td>
                                                <td>{a.fileName}</td>
                                                <td dir="ltr">{a.dmsDocumentId}</td>
                                                <td dir="ltr">{a.dmsFolderId || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                    {tab === 'archive' && (
                        <div className={tabStyles.tableWrap}>
                            <table className={tabStyles.dataTable}>
                                <thead><tr><th>نام</th><th>document_id</th><th>عملیات</th></tr></thead>
                                <tbody>
                                    {archiveItems.length === 0 ? <tr><td colSpan={3} style={{ textAlign: 'center' }}>—</td></tr> : archiveItems.map((a) => (
                                        <tr key={`${a.meetingId}-${a.id}`}>
                                            <td>{a.name}</td>
                                            <td dir="ltr">{a.id}</td>
                                            <td><Link href="/management/documents/explorer" className={tabStyles.smallBtn}>مشاهده در DMS</Link></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </Wrapper>
        </Container>
    );
}
