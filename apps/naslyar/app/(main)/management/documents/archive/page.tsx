'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import parentStyles from '../../../marketing/Marketing.module.scss';
import tabStyles from '../../../marketing/automation/Automation.module.scss';
import { Container, Wrapper } from '@/app/(main)/layout';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { LoadingState } from '@my-workspace/components';
import SimpleLineTabs from '@/app/components/SimpleLineTabs/SimpleLineTabs';
import { appendAuditLog, exploreFiles, loadFileMeta, resolveAuditActor, saveFileMeta, softDeleteFile } from '../documents-api';

const TABS = [
    { id: 'archived', label: 'آرشیو شده' },
    { id: 'trash', label: 'سطل زباله' },
];

export default function ArchivePage() {
    const { baseUrl, fullname, username, email, userId } = useAppStore();
    const { token } = useAuthStore();
    const [tab, setTab] = useState('archived');
    const [loading, setLoading] = useState(true);
    const [fileMeta, setFileMeta] = useState<Record<string, import('../documents.types').DocumentFileMeta>>({});
    const [aliveFiles, setAliveFiles] = useState<Awaited<ReturnType<typeof exploreFiles>>['files']>([]);
    const [trashFiles, setTrashFiles] = useState<Awaited<ReturnType<typeof exploreFiles>>['files']>([]);

    const load = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const [m, alive, trash] = await Promise.all([
                loadFileMeta(baseUrl, token),
                exploreFiles(baseUrl, token, { limit: 100 }),
                exploreFiles(baseUrl, token, { limit: 100, isAlive: false }).catch(() => ({ files: [], totalItems: 0 })),
            ]);
            setFileMeta(m.value);
            setAliveFiles(alive.files);
            setTrashFiles(trash.files);
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, [baseUrl, token]);

    useEffect(() => {
        void load();
    }, [load]);

    const auditActor = useMemo(
        () => resolveAuditActor({ fullname, username, email, userId }),
        [fullname, username, email, userId],
    );

    const archived = useMemo(() => {
        const ids = Object.entries(fileMeta).filter(([, m]) => m.isArchived).map(([id]) => id);
        return aliveFiles.filter((f) => ids.includes(f._id));
    }, [fileMeta, aliveFiles]);

    const archiveFile = async (fileId: string) => {
        if (!token) return;
        const file = aliveFiles.find((f) => f._id === fileId);
        const fileName = file?.originalname || file?.name || fileMeta[fileId]?.title || 'فایل';
        const existing = fileMeta[fileId] || {
            fileId,
            folderId: null,
            title: '',
            tags: [],
            isArchived: false,
            isStarred: false,
            allowedAccessRoleIds: [],
            customFields: {},
            updatedAt: new Date().toISOString(),
        };
        const next = { ...fileMeta, [fileId]: { ...existing, isArchived: true, updatedAt: new Date().toISOString() } };
        await saveFileMeta(baseUrl, token, next);
        setFileMeta(next);
        void appendAuditLog(baseUrl, token, {
            ...auditActor,
            action: 'archive',
            fileId,
            fileName,
        }).catch(() => {});
        SuccessToaster({ message: 'به آرشیو منتقل شد' });
    };

    const moveToTrash = async (fileId: string) => {
        if (!token) return;
        const file = tab === 'archived'
            ? archived.find((f) => f._id === fileId)
            : trashFiles.find((f) => f._id === fileId);
        const fileName = file?.originalname || file?.name || fileMeta[fileId]?.title || 'فایل';
        try {
            await softDeleteFile(baseUrl, token, fileId);
            void appendAuditLog(baseUrl, token, {
                ...auditActor,
                action: 'delete',
                fileId,
                fileName,
                detail: tab === 'archived' ? 'حذف از آرشیو' : 'حذف از سطل زباله',
            }).catch(() => {});
            SuccessToaster({ message: 'به سطل زباله منتقل شد' });
            await load();
        } catch (e) {
            ErrorToaster(e);
        }
    };

    if (loading) return <LoadingState />;

    const list = tab === 'archived' ? archived : trashFiles;

    return (
        <Container>
            <Wrapper>
                <div className={`${parentStyles.container} ${parentStyles.rtl}`}>
                    <header className={parentStyles.header}>
                        <div>
                            <h1 className={parentStyles.mainTitle}>آرشیو و سطل زباله</h1>
                            <p className={parentStyles.subtitle}>اسناد راکد و حذف نرم با امکان بازیابی</p>
                        </div>
                    </header>
                    <SimpleLineTabs tabs={TABS} activeTab={tab} onChange={setTab} />
                    <div className={tabStyles.tableWrap}>
                        <table className={tabStyles.dataTable}>
                            <thead><tr><th>نام</th><th>نوع</th><th>عملیات</th></tr></thead>
                            <tbody>
                                {list.length === 0 ? (
                                    <tr><td colSpan={3} className={tabStyles.emptyCell} data-label="">موردی نیست</td></tr>
                                ) : list.map((f) => (
                                    <tr key={f._id}>
                                        <td data-label="نام" className={tabStyles.cellPrimary}>{f.originalname || f.name}</td>
                                        <td data-label="نوع">{f.ext || f.mimetype}</td>
                                        <td data-label="عملیات">
                                            <div className={tabStyles.rowActions}>
                                                {tab === 'archived' && (
                                                    <button type="button" className={parentStyles.deleteBtn} onClick={() => void moveToTrash(f._id)}>حذف</button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {tab === 'archived' && aliveFiles.length > 0 && (
                        <div style={{ marginTop: '1rem' }}>
                            <p className={parentStyles.fieldHint}>برای آرشیو کردن فایل از مخزن، از explorer استفاده کنید یا:</p>
                            <div className={tabStyles.inlineActions}>
                                {aliveFiles.slice(0, 5).map((f) => (
                                    <button key={f._id} type="button" className={tabStyles.smallBtn} onClick={() => void archiveFile(f._id)}>
                                        آرشیو {f.originalname?.slice(0, 12)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </Wrapper>
        </Container>
    );
}
