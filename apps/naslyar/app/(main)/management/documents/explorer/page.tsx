'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import parentStyles from '../../../marketing/Marketing.module.scss';
import styles from '../Documents.module.scss';
import { Container, Wrapper } from '@/app/(main)/layout';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { LoadingState, Pagination } from '@my-workspace/components';
import { handleUpload } from '@/app/utils/uploadFile';
import { fetchAccessRoles, type AccessRoleItem } from '../../../users/access-api';
import DocumentFilterSidebar from '../components/DocumentFilterSidebar';
import DocumentListToolbar from '../components/DocumentListToolbar';
import DocumentListTable from '../components/DocumentListTable';
import DocumentMetadataModal from '../components/DocumentMetadataModal';
import StartWorkflowWizard from '../components/StartWorkflowWizard';
import {
    appendAuditLog,
    coerceExploreFile,
    extractUploadedFileId,
    fetchDocumentListPage,
    loadFileMetaMap,
    loadFolderTree,
    loadWorkflowInstances,
    normalizeFileId,
    resolveAuditActor,
    softDeleteFile,
    upsertFileMeta,
    type DocumentListRow,
} from '../documents-api';
import type { AuditAction, DocumentFileMeta, DocumentFolder, DocumentWorkflowStatus } from '../documents.types';
import { ROOT_FOLDER_ID } from '../documents.types';

export default function ExplorerPage() {
    const { baseUrl, fullname, username, email, userId } = useAppStore();
    const { token } = useAuthStore();

    const [loading, setLoading] = useState(true);
    const [folders, setFolders] = useState<DocumentFolder[]>([]);
    const [metaMap, setMetaMap] = useState<Record<string, DocumentFileMeta>>({});
    const [rows, setRows] = useState<DocumentListRow[]>([]);
    const [accessRoles, setAccessRoles] = useState<AccessRoleItem[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [selectedFolderId, setSelectedFolderId] = useState(ROOT_FOLDER_ID);
    const [starredOnly, setStarredOnly] = useState(false);
    const [workflowStatus, setWorkflowStatus] = useState<DocumentWorkflowStatus | ''>('');
    const [pagination, setPagination] = useState({ currentPage: 1, itemPerPage: 10, totalItems: 0 });
    const [uploadProgress, setUploadProgress] = useState('');

    const [editRow, setEditRow] = useState<DocumentListRow | null>(null);
    const [workflowRow, setWorkflowRow] = useState<DocumentListRow | null>(null);

    const auditActor = useMemo(
        () => resolveAuditActor({ fullname, username, email, userId }),
        [fullname, username, email, userId],
    );

    const roleNameById = useMemo(
        () => new Map(accessRoles.map((role) => [role._id, role.name])),
        [accessRoles],
    );

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 300);
        return () => clearTimeout(timer);
    }, [search]);

    const loadList = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const [tree, meta, roles, instances] = await Promise.all([
                loadFolderTree(baseUrl, token),
                loadFileMetaMap(baseUrl, token),
                fetchAccessRoles(),
                loadWorkflowInstances(baseUrl, token),
            ]);
            setFolders(tree.value);
            setMetaMap(meta);
            setAccessRoles(roles.items);

            const result = await fetchDocumentListPage(baseUrl, token, {
                page: pagination.currentPage,
                limit: pagination.itemPerPage,
                search: debouncedSearch,
                folderId: selectedFolderId,
                folders: tree.value,
                starredOnly,
                workflowStatus: workflowStatus || undefined,
                instances: instances.value,
            });
            setRows(result.items);
            setPagination((prev) => ({ ...prev, totalItems: result.totalItems }));
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, [
        baseUrl,
        token,
        pagination.currentPage,
        pagination.itemPerPage,
        debouncedSearch,
        selectedFolderId,
        starredOnly,
        workflowStatus,
    ]);

    useEffect(() => {
        void loadList();
    }, [loadList]);

    useEffect(() => {
        setPagination((prev) => ({ ...prev, currentPage: 1 }));
    }, [debouncedSearch, selectedFolderId, starredOnly, workflowStatus]);

    const logAudit = async (action: AuditAction, detail?: { fileId?: string; fileName?: string }) => {
        if (!token) return;
        await appendAuditLog(baseUrl, token, {
            ...auditActor,
            action,
            fileId: detail?.fileId,
            fileName: detail?.fileName,
        });
    };

    const attachUploadedFile = async (fileId: string, fileName: string, thumbnailId?: string) => {
        const meta = await upsertFileMeta(baseUrl, token!, fileId, {
            fileId,
            folderId: selectedFolderId === ROOT_FOLDER_ID ? null : selectedFolderId,
            title: fileName,
            thumbnailId,
            tags: [],
            isArchived: false,
            isStarred: false,
            allowedAccessRoleIds: [],
            customFields: {},
            updatedAt: new Date().toISOString(),
        });
        setMetaMap((prev) => ({ ...prev, [fileId]: meta }));
        await logAudit('upload', { fileId, fileName });
    };

    const handleFileUpload = async (file: File) => {
        if (!token) return;
        setUploadProgress('در حال آپلود...');
        await handleUpload(
            file,
            token,
            () => {},
            async (data) => {
                setUploadProgress('');
                const uploaded = coerceExploreFile(data?.original);
                const uploadedThumb = coerceExploreFile(data?.thumbnail);
                const id = normalizeFileId(uploaded) || extractUploadedFileId(data);
                const thumbnailId = normalizeFileId(uploadedThumb) || undefined;
                if (id) {
                    await attachUploadedFile(id, file.name, thumbnailId);
                }
                await loadList();
                SuccessToaster({ message: 'فایل آپلود شد' });
            },
            () => {
                setUploadProgress('');
                ErrorToaster(new Error('آپلود ناموفق بود'));
            },
            { source: 'documents', folderId: selectedFolderId },
        );
    };

    const handleSaveMeta = async (payload: {
        title: string;
        allowedAccessRoleIds: string[];
        expiresAt?: string;
    }) => {
        if (!token || !editRow) return;
        const existing = metaMap[editRow.fileId];
        const saved = await upsertFileMeta(baseUrl, token, editRow.fileId, {
            fileId: editRow.fileId,
            folderId: existing?.folderId ?? editRow.folderId,
            title: payload.title,
            thumbnailId: existing?.thumbnailId,
            contractNo: existing?.contractNo,
            tags: existing?.tags ?? [],
            expiresAt: payload.expiresAt,
            isArchived: existing?.isArchived ?? false,
            isStarred: existing?.isStarred ?? editRow.isStarred,
            allowedAccessRoleIds: payload.allowedAccessRoleIds,
            customFields: existing?.customFields ?? {},
            updatedAt: new Date().toISOString(),
        });
        setMetaMap((prev) => ({ ...prev, [editRow.fileId]: saved }));
        await logAudit('edit_meta', { fileId: editRow.fileId, fileName: payload.title });
        SuccessToaster({ message: 'اطلاعات سند ذخیره شد' });
        await loadList();
    };

    const handleToggleStar = async (row: DocumentListRow) => {
        if (!token) return;
        const existing = metaMap[row.fileId];
        const isStarred = !row.isStarred;
        const saved = await upsertFileMeta(baseUrl, token, row.fileId, {
            fileId: row.fileId,
            folderId: existing?.folderId ?? row.folderId,
            title: existing?.title ?? row.title,
            thumbnailId: existing?.thumbnailId,
            contractNo: existing?.contractNo,
            tags: existing?.tags ?? [],
            expiresAt: existing?.expiresAt,
            isArchived: existing?.isArchived ?? false,
            isStarred,
            allowedAccessRoleIds: existing?.allowedAccessRoleIds ?? row.allowedAccessRoleIds,
            customFields: existing?.customFields ?? {},
            updatedAt: new Date().toISOString(),
        });
        setMetaMap((prev) => ({ ...prev, [row.fileId]: saved }));
        await loadList();
    };

    const handleDelete = async (row: DocumentListRow) => {
        if (!token) return;
        if (!window.confirm(`فایل «${row.title}» حذف شود؟`)) return;
        await softDeleteFile(baseUrl, token, row.fileId);
        await logAudit('delete', { fileId: row.fileId, fileName: row.title });
        SuccessToaster({ message: 'فایل به سطل زباله منتقل شد' });
        await loadList();
    };

    const handleToggleSelect = (fileId: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(fileId)) next.delete(fileId);
            else next.add(fileId);
            return next;
        });
    };

    const handleToggleSelectAll = () => {
        if (rows.every((row) => selectedIds.has(row.fileId))) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(rows.map((row) => row.fileId)));
        }
    };

    const handlePaginate = (page: number) => {
        setPagination((prev) => ({ ...prev, currentPage: page }));
    };

    const handleSetRowsPerPage = (limit: number) => {
        setPagination((prev) => ({ ...prev, itemPerPage: limit, currentPage: 1 }));
    };

    return (
        <Container>
            <Wrapper>
                <header className={parentStyles.pageHeader}>
                    <div>
                        <h1 className={parentStyles.mainTitle}>مخزن اسناد</h1>
                        <p className={parentStyles.subtitle}>مدیریت، نام‌گذاری و دسترسی اسناد</p>
                    </div>
                </header>

                {loading && rows.length === 0 ? (
                    <LoadingState />
                ) : (
                    <div className={styles.manageLayout}>
                        <DocumentFilterSidebar
                            folders={folders}
                            selectedFolderId={selectedFolderId}
                            onFolderChange={setSelectedFolderId}
                            starredOnly={starredOnly}
                            onStarredChange={setStarredOnly}
                            workflowStatus={workflowStatus}
                            onWorkflowStatusChange={setWorkflowStatus}
                        />

                        <div className={styles.mainPanel}>
                            <DocumentListToolbar
                                search={search}
                                onSearchChange={setSearch}
                                uploadProgress={uploadProgress}
                                onUpload={(file) => void handleFileUpload(file)}
                            />

                            <DocumentListTable
                                rows={rows}
                                roleNameById={roleNameById}
                                selectedIds={selectedIds}
                                onToggleSelect={handleToggleSelect}
                                onToggleSelectAll={handleToggleSelectAll}
                                onEdit={setEditRow}
                                onStartWorkflow={setWorkflowRow}
                                onToggleStar={(row) => void handleToggleStar(row)}
                                onDelete={(row) => void handleDelete(row)}
                            />

                            {pagination.totalItems > 0 && (
                                <div className={styles.paginationSpace}>
                                    <Pagination
                                        itemPerPage={pagination.itemPerPage}
                                        currentPage={pagination.currentPage}
                                        totalItems={pagination.totalItems}
                                        setRowsPerPage={handleSetRowsPerPage}
                                        paginate={handlePaginate}
                                        rtl
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <DocumentMetadataModal
                    open={Boolean(editRow)}
                    fileName={editRow?.originalName || ''}
                    initialMeta={{
                        title: editRow?.title,
                        allowedAccessRoleIds: editRow?.allowedAccessRoleIds,
                        expiresAt: editRow?.expiresAt,
                    }}
                    accessRoles={accessRoles}
                    onClose={() => setEditRow(null)}
                    onSave={handleSaveMeta}
                />

                {workflowRow && token ? (
                    <StartWorkflowWizard
                        open
                        onClose={() => setWorkflowRow(null)}
                        baseUrl={baseUrl}
                        token={token}
                        actor={auditActor}
                        preselectedFile={{ id: workflowRow.fileId, name: workflowRow.title }}
                        onStarted={() => {
                            setWorkflowRow(null);
                            void loadList();
                        }}
                    />
                ) : null}
            </Wrapper>
        </Container>
    );
}
