import axios from 'axios';
import { createId, loadSetting, saveSetting } from '@/app/utils/system-setting-api';
import type {
    AccessRule,
    AuditAction,
    AuditLogEntry,
    DocumentFileMeta,
    DocumentFolder,
    DocumentSettings,
    DocumentWorkflowInstance,
    DocumentWorkflowStep,
    DocumentWorkflowTemplate,
    DocumentsStore,
    RecentActivity,
    SharedLink,
    WorkflowAssigneeType,
    WorkflowPriority,
} from './documents.types';
import type { HrEmployee, HrJobRole } from '../hr/hr.types';
import { formatAssigneeLabel } from '../hr/hr-api';
import { DEFAULT_DOCUMENT_SETTINGS, ROOT_FOLDER_ID } from './documents.types';

const KEYS = {
    folderTree: 'documents.folderTree',
    fileMeta: 'documents.fileMeta',
    workflowTemplates: 'documents.workflowTemplates',
    workflowInstances: 'documents.workflows',
    sharedLinks: 'documents.sharedLinks',
    accessRules: 'documents.accessRules',
    auditLogs: 'documents.auditLogs',
    recentActivity: 'documents.recentActivity',
    settings: 'documents.settings',
} as const;

const META = {
    group: 'documents',
    label: 'مدیریت اسناد',
    description: 'ساختار پوشه‌ها، متاداده و گردش کار اسناد.',
};

function normalizeArray<T>(payload: unknown): T[] {
    return Array.isArray(payload) ? (payload as T[]) : [];
}

function normalizeFileMeta(payload: unknown): Record<string, DocumentFileMeta> {
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
        return payload as Record<string, DocumentFileMeta>;
    }
    return {};
}

function normalizeSettings(payload: unknown): DocumentSettings {
    if (payload && typeof payload === 'object') {
        return { ...DEFAULT_DOCUMENT_SETTINGS, ...(payload as DocumentSettings) };
    }
    return { ...DEFAULT_DOCUMENT_SETTINGS };
}

function defaultFolderTree(): DocumentFolder[] {
    return [
        {
            id: ROOT_FOLDER_ID,
            name: 'ریشه',
            parentId: null,
            fileIds: [],
            createdAt: new Date().toISOString(),
        },
    ];
}

export async function loadFolderTree(baseUrl: string, token: string) {
    return loadSetting<DocumentFolder[]>(
        baseUrl,
        token,
        KEYS.folderTree,
        META,
        defaultFolderTree(),
        (p) => (Array.isArray(p) && p.length > 0 ? (p as DocumentFolder[]) : defaultFolderTree()),
    );
}

export async function saveFolderTree(baseUrl: string, token: string, tree: DocumentFolder[]) {
    await saveSetting(baseUrl, token, KEYS.folderTree, tree);
}

export async function loadFileMeta(baseUrl: string, token: string) {
    return loadSetting<Record<string, DocumentFileMeta>>(
        baseUrl,
        token,
        KEYS.fileMeta,
        META,
        {},
        normalizeFileMeta,
    );
}

export async function saveFileMeta(baseUrl: string, token: string, meta: Record<string, DocumentFileMeta>) {
    await saveSetting(baseUrl, token, KEYS.fileMeta, meta);
}

export async function loadWorkflowTemplates(baseUrl: string, token: string) {
    return loadSetting<DocumentWorkflowTemplate[]>(
        baseUrl,
        token,
        KEYS.workflowTemplates,
        META,
        [],
        normalizeArray,
    );
}

export async function saveWorkflowTemplates(baseUrl: string, token: string, templates: DocumentWorkflowTemplate[]) {
    await saveSetting(baseUrl, token, KEYS.workflowTemplates, templates);
}

export async function loadWorkflowInstances(baseUrl: string, token: string) {
    return loadSetting<DocumentWorkflowInstance[]>(
        baseUrl,
        token,
        KEYS.workflowInstances,
        META,
        [],
        normalizeArray,
    );
}

export async function saveWorkflowInstances(baseUrl: string, token: string, instances: DocumentWorkflowInstance[]) {
    await saveSetting(baseUrl, token, KEYS.workflowInstances, instances);
}

export function getWorkflowStepLabel(
    template: DocumentWorkflowTemplate | undefined,
    stepIndex: number,
): string {
    return template?.steps[stepIndex]?.label || `مرحله ${stepIndex + 1}`;
}

export function normalizeWorkflowStep(step: DocumentWorkflowStep, jobRoles: HrJobRole[] = []): DocumentWorkflowStep {
    if (step.assigneeType && step.assigneeId && step.assigneeName) {
        return step;
    }
    const legacyLabel = step.roleLabel?.trim();
    if (legacyLabel) {
        const match = jobRoles.find((r) => r.name === legacyLabel);
        if (match) {
            return {
                ...step,
                assigneeType: 'job_role',
                assigneeId: match.id,
                assigneeName: match.name,
            };
        }
        return {
            ...step,
            assigneeType: 'job_role',
            assigneeId: `legacy_${step.id}`,
            assigneeName: legacyLabel,
        };
    }
    return {
        ...step,
        assigneeType: 'job_role',
        assigneeId: `legacy_${step.id}`,
        assigneeName: step.label,
    };
}

export function normalizeWorkflowTemplate(
    template: DocumentWorkflowTemplate,
    jobRoles: HrJobRole[] = [],
): DocumentWorkflowTemplate {
    return {
        ...template,
        steps: template.steps.map((step, order) => ({
            ...normalizeWorkflowStep(step, jobRoles),
            order,
        })),
    };
}

export function resolveStepAssigneeDisplay(step: DocumentWorkflowStep): string {
    if (step.assigneeType && step.assigneeName) {
        return formatAssigneeLabel(step.assigneeType, step.assigneeName);
    }
    return step.roleLabel?.trim() || step.label;
}

export function getStepAssigneeFields(step: DocumentWorkflowStep): {
    assigneeType?: WorkflowAssigneeType;
    assigneeId?: string;
    assigneeName?: string;
    assignee?: string;
} {
    const normalized = normalizeWorkflowStep(step);
    if (normalized.assigneeType && normalized.assigneeId && normalized.assigneeName) {
        return {
            assigneeType: normalized.assigneeType,
            assigneeId: normalized.assigneeId,
            assigneeName: normalized.assigneeName,
            assignee: normalized.assigneeName,
        };
    }
    const name = step.roleLabel?.trim() || step.label;
    return { assignee: name, assigneeName: name };
}

export function instanceMatchesEmployee(
    instance: DocumentWorkflowInstance,
    employee: HrEmployee | undefined,
): boolean {
    if (!employee) return false;
    const type = instance.assigneeType;
    const id = instance.assigneeId;
    if (!type || !id || id.startsWith('legacy_')) return false;
    if (type === 'employee') return employee.id === id;
    if (type === 'job_role') return employee.jobRoleId === id;
    if (type === 'department') return employee.departmentId === id;
    return false;
}

export function isPendingForEmployee(
    instance: DocumentWorkflowInstance,
    employee: HrEmployee | undefined,
): boolean {
    if (instance.status !== 'pending' && instance.status !== 'in_progress') return false;
    if (!employee) return true;
    if (!instance.assigneeType || !instance.assigneeId || instance.assigneeId.startsWith('legacy_')) {
        return true;
    }
    return instanceMatchesEmployee(instance, employee);
}

export function getActiveWorkflowForFile(
    instances: DocumentWorkflowInstance[],
    fileId: string,
): DocumentWorkflowInstance | undefined {
    return instances.find(
        (instance) =>
            instance.fileId === fileId &&
            instance.status !== 'completed' &&
            instance.status !== 'rejected',
    );
}

export async function startWorkflowInstance(
    baseUrl: string,
    token: string,
    input: {
        fileId: string;
        fileName: string;
        template: DocumentWorkflowTemplate;
        submittedBy: string;
        submittedById?: string;
        note?: string;
        priority?: WorkflowPriority;
    },
): Promise<DocumentWorkflowInstance> {
    const { value: instances } = await loadWorkflowInstances(baseUrl, token);
    if (getActiveWorkflowForFile(instances, input.fileId)) {
        throw new Error('این فایل قبلاً در یک گردش کار فعال است.');
    }

    const now = new Date().toISOString();
    const firstStep = normalizeWorkflowStep(input.template.steps[0] || {
        id: 'step_0',
        label: 'شروع',
        order: 0,
    });
    const assigneeFields = getStepAssigneeFields(firstStep);
    const instance: DocumentWorkflowInstance = {
        id: createId('wfi'),
        fileId: input.fileId,
        fileName: input.fileName,
        templateId: input.template.id,
        templateName: input.template.name,
        currentStepIndex: 0,
        status: 'pending',
        submittedBy: input.submittedBy,
        submittedById: input.submittedById,
        ...assigneeFields,
        note: input.note?.trim() || undefined,
        priority: input.priority || 'normal',
        history: [
            {
                stepIndex: 0,
                stepLabel: firstStep.label || 'شروع',
                action: 'start',
                userName: input.submittedBy,
                at: now,
            },
        ],
        createdAt: now,
        updatedAt: now,
    };
    await saveWorkflowInstances(baseUrl, token, [instance, ...instances]);
    return instance;
}

export async function loadSharedLinks(baseUrl: string, token: string) {
    return loadSetting<SharedLink[]>(baseUrl, token, KEYS.sharedLinks, META, [], normalizeArray);
}

export async function saveSharedLinks(baseUrl: string, token: string, links: SharedLink[]) {
    await saveSetting(baseUrl, token, KEYS.sharedLinks, links);
}

export async function loadAccessRules(baseUrl: string, token: string) {
    return loadSetting<AccessRule[]>(baseUrl, token, KEYS.accessRules, META, [], normalizeArray);
}

export async function saveAccessRules(baseUrl: string, token: string, rules: AccessRule[]) {
    await saveSetting(baseUrl, token, KEYS.accessRules, rules);
}

export async function loadAuditLogs(baseUrl: string, token: string) {
    return loadSetting<AuditLogEntry[]>(baseUrl, token, KEYS.auditLogs, META, [], normalizeArray);
}

export async function saveAuditLogs(baseUrl: string, token: string, logs: AuditLogEntry[]) {
    await saveSetting(baseUrl, token, KEYS.auditLogs, logs);
}

const MAX_AUDIT_LOGS = 500;

export interface AuditActor {
    userId?: string;
    userName: string;
}

export function resolveAuditActor(profile: {
    fullname?: string;
    username?: string;
    email?: string;
    userId?: string;
}): AuditActor {
    const userName =
        profile.fullname?.trim() ||
        profile.username?.trim() ||
        profile.email?.trim() ||
        'ادمین';
    return {
        userId: profile.userId?.trim() || undefined,
        userName,
    };
}

export async function appendAuditLog(
    baseUrl: string,
    token: string,
    entry: AuditActor & {
        action: AuditAction;
        fileId?: string;
        fileName?: string;
        detail?: string;
    },
): Promise<void> {
    const { value } = await loadAuditLogs(baseUrl, token);
    const log: AuditLogEntry = {
        id: createId('aud'),
        fileId: entry.fileId,
        fileName: entry.fileName,
        userId: entry.userId,
        userName: entry.userName,
        action: entry.action,
        detail: entry.detail,
        createdAt: new Date().toISOString(),
    };
    await saveAuditLogs(baseUrl, token, [log, ...value].slice(0, MAX_AUDIT_LOGS));
}

export async function loadRecentActivity(baseUrl: string, token: string) {
    return loadSetting<RecentActivity[]>(baseUrl, token, KEYS.recentActivity, META, [], normalizeArray);
}

export async function saveRecentActivity(baseUrl: string, token: string, activity: RecentActivity[]) {
    await saveSetting(baseUrl, token, KEYS.recentActivity, activity);
}

export async function loadDocumentSettings(baseUrl: string, token: string) {
    return loadSetting<DocumentSettings>(
        baseUrl,
        token,
        KEYS.settings,
        META,
        DEFAULT_DOCUMENT_SETTINGS,
        normalizeSettings,
    );
}

export async function saveDocumentSettings(baseUrl: string, token: string, settings: DocumentSettings) {
    await saveSetting(baseUrl, token, KEYS.settings, settings);
}

export async function loadDocumentsStore(baseUrl: string, token: string): Promise<DocumentsStore> {
    const [
        folderTree,
        fileMeta,
        workflowTemplates,
        workflowInstances,
        sharedLinks,
        accessRules,
        auditLogs,
        recentActivity,
        settings,
    ] = await Promise.all([
        loadFolderTree(baseUrl, token),
        loadFileMeta(baseUrl, token),
        loadWorkflowTemplates(baseUrl, token),
        loadWorkflowInstances(baseUrl, token),
        loadSharedLinks(baseUrl, token),
        loadAccessRules(baseUrl, token),
        loadAuditLogs(baseUrl, token),
        loadRecentActivity(baseUrl, token),
        loadDocumentSettings(baseUrl, token),
    ]);
    return {
        folderTree: folderTree.value,
        fileMeta: fileMeta.value,
        workflowTemplates: workflowTemplates.value,
        workflowInstances: workflowInstances.value,
        sharedLinks: sharedLinks.value,
        accessRules: accessRules.value,
        auditLogs: auditLogs.value,
        recentActivity: recentActivity.value,
        settings: settings.value,
    };
}

export interface ExploreFile {
    _id: string;
    originalname?: string;
    name?: string;
    mimetype?: string;
    ext?: string;
    size?: number;
    key?: string;
    path?: string;
    parentId?: string;
    metadata?: Record<string, unknown>;
    isAlive?: boolean;
    isThumbnail?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

const S3_BASE = process.env.NEXT_PUBLIC_S3_ENDPOINT || '';

export function buildPublicFileUrl(key?: string, path?: string): string | null {
    if (key && S3_BASE) return `${S3_BASE}/${key}`;
    if (path) return path;
    return null;
}

export function buildThumbnailLookup(files: ExploreFile[]): Map<string, ExploreFile> {
    const lookup = new Map<string, ExploreFile>();
    const thumbnails = files.filter((file) => file.isThumbnail);
    const originals = files.filter((file) => !file.isThumbnail);

    for (const thumb of thumbnails) {
        const parentId = normalizeFileId(thumb.parentId);
        if (parentId) {
            lookup.set(parentId, thumb);
            continue;
        }
        const prefix = thumb.name?.split('-')[0];
        if (!prefix) continue;
        const original = originals.find((item) => item.name?.startsWith(`${prefix}-`));
        const originalId = normalizeFileId(original);
        if (originalId) lookup.set(originalId, thumb);
    }

    return lookup;
}

export function resolveFileThumbnail(
    file: ExploreFile,
    lookup: Map<string, ExploreFile>,
    fileMeta: Record<string, DocumentFileMeta>,
    allFiles: ExploreFile[],
): ExploreFile | null {
    const fileId = normalizeFileId(file);
    if (!fileId) return null;

    const metaThumbId = fileMeta[fileId]?.thumbnailId;
    if (metaThumbId) {
        const fromMeta = allFiles.find((item) => normalizeFileId(item) === metaThumbId);
        if (fromMeta) return fromMeta;
    }

    const fromLookup = lookup.get(fileId);
    if (fromLookup) return fromLookup;

    if (file.mimetype?.startsWith('image/')) return file;
    return null;
}

export function getFileThumbnailUrl(
    file: ExploreFile,
    lookup: Map<string, ExploreFile>,
    fileMeta: Record<string, DocumentFileMeta>,
    allFiles: ExploreFile[],
): string | null {
    const thumb = resolveFileThumbnail(file, lookup, fileMeta, allFiles);
    if (!thumb) return null;
    return buildPublicFileUrl(thumb.key, thumb.path);
}

export function collectDescendantFolderIds(folderId: string, folders: DocumentFolder[]): string[] {
    const children = folders.filter((folder) => folder.parentId === folderId && folder.id !== ROOT_FOLDER_ID);
    return [folderId, ...children.flatMap((child) => collectDescendantFolderIds(child.id, folders))];
}

export function normalizeFileId(value: unknown): string | undefined {
    if (value == null) return undefined;
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed || undefined;
    }
    if (typeof value === 'object') {
        const obj = value as Record<string, unknown>;
        if (obj.$oid) return normalizeFileId(obj.$oid);
        if (obj._id) return normalizeFileId(obj._id);
        if (typeof obj.toString === 'function') {
            const asString = obj.toString();
            if (asString && asString !== '[object Object]') return asString;
        }
    }
    const asString = String(value);
    return asString && asString !== '[object Object]' ? asString : undefined;
}

export function normalizeExploreFileRecord(file: ExploreFile): ExploreFile {
    const id = normalizeFileId(file);
    return id ? { ...file, _id: id } : file;
}

export function resolveFileFolderId(
    file: ExploreFile,
    fileMeta: Record<string, DocumentFileMeta>,
): string | null {
    const id = normalizeFileId(file);
    if (!id) return null;
    const metaFolderId = fileMeta[id]?.folderId;
    if (metaFolderId) return metaFolderId;
    const metadataFolderId = file.metadata?.folderId;
    if (typeof metadataFolderId === 'string' && metadataFolderId.trim()) {
        return metadataFolderId;
    }
    return null;
}

export function isDocumentExploreFile(
    file: ExploreFile,
    fileMeta: Record<string, DocumentFileMeta>,
): boolean {
    if (file.isThumbnail) return false;
    const id = normalizeFileId(file);
    if (!id) return false;
    if (fileMeta[id]) return true;
    return file.metadata?.source === 'documents';
}

export function fileBelongsToFolder(
    file: ExploreFile,
    folderId: string,
    fileMeta: Record<string, DocumentFileMeta>,
    folderFileIds: Set<string>,
): boolean {
    const id = normalizeFileId(file);
    if (!id) return false;
    const resolvedFolderId = resolveFileFolderId(file, fileMeta);
    if (folderId === ROOT_FOLDER_ID) {
        return !resolvedFolderId || resolvedFolderId === ROOT_FOLDER_ID || folderFileIds.has(id);
    }
    return resolvedFolderId === folderId || folderFileIds.has(id);
}

export function coerceExploreFile(value: unknown): ExploreFile | undefined {
    if (!value || typeof value !== 'object') return undefined;
    const record = value as ExploreFile;
    const id = normalizeFileId(record);
    if (!id) return undefined;
    return normalizeExploreFileRecord({ ...record, _id: id });
}

export async function exploreFiles(
    baseUrl: string,
    token: string,
    params?: { page?: number; limit?: number; isAlive?: boolean },
): Promise<{ files: ExploreFile[]; totalItems: number }> {
    const res = await axios.get(`${baseUrl}/api/file/explore`, {
        headers: { authorization: `Bearer ${token}` },
        params: {
            page: params?.page ?? 1,
            limit: params?.limit ?? 50,
            ...(params?.isAlive === false ? { isAlive: false } : {}),
        },
    });
    const data = res.data?.data ?? res.data;
    return {
        files: (data?.files ?? []).map(normalizeExploreFileRecord),
        totalItems: data?.totalItems ?? 0,
    };
}

export async function softDeleteFile(baseUrl: string, token: string, fileId: string) {
    await axios.get(`${baseUrl}/api/file/explore/delete/${fileId}`, {
        headers: { authorization: `Bearer ${token}` },
    });
}

export function extractUploadedFileId(data: unknown): string | undefined {
    if (!data || typeof data !== 'object') return undefined;
    const payload = data as Record<string, unknown>;
    const original = payload.original;
    const fileInfo = payload.fileInfo;
    return (
        normalizeFileId(coerceExploreFile(original)) ??
        normalizeFileId(fileInfo) ??
        normalizeFileId(original) ??
        normalizeFileId(payload)
    );
}

export { createId as createDocumentId };

// ── REST API (documents module) ──

function documentsHeaders(token: string) {
    return { authorization: `Bearer ${token}` };
}

function mapRestFileMeta(doc: Record<string, unknown>): DocumentFileMeta {
    return {
        fileId: String(doc.fileId),
        folderId: (doc.folderId as string | null) ?? null,
        title: String(doc.title || ''),
        thumbnailId: doc.thumbnailId ? String(doc.thumbnailId) : undefined,
        contractNo: doc.contractNo ? String(doc.contractNo) : undefined,
        tags: Array.isArray(doc.tags) ? (doc.tags as string[]) : [],
        expiresAt: doc.expiresAt ? new Date(doc.expiresAt as string).toISOString() : undefined,
        isArchived: Boolean(doc.isArchived),
        isStarred: Boolean(doc.isStarred),
        allowedAccessRoleIds: Array.isArray(doc.allowedAccessRoleIds)
            ? (doc.allowedAccessRoleIds as string[])
            : [],
        customFields: (doc.customFields as Record<string, string>) ?? {},
        updatedAt: doc.updatedAt
            ? new Date(doc.updatedAt as string).toISOString()
            : new Date().toISOString(),
    };
}

function mapRestWorkflowTemplate(doc: Record<string, unknown>): DocumentWorkflowTemplate {
    return {
        id: String(doc._id ?? doc.id),
        name: String(doc.name),
        description: doc.description ? String(doc.description) : undefined,
        steps: Array.isArray(doc.steps) ? (doc.steps as DocumentWorkflowStep[]) : [],
        createdAt: doc.createdAt
            ? new Date(doc.createdAt as string).toISOString()
            : new Date().toISOString(),
    };
}

let fileMetaMigrationDone = false;
let templateMigrationDone = false;

export async function fetchFileMetaPage(
    baseUrl: string,
    token: string,
    params?: { page?: number; limit?: number },
): Promise<{ items: DocumentFileMeta[]; totalItems: number; page: number; limit: number }> {
    const res = await axios.get(`${baseUrl}/api/documents/file-meta`, {
        headers: documentsHeaders(token),
        params: { page: params?.page ?? 1, limit: params?.limit ?? 200 },
    });
    const data = res.data?.data ?? res.data;
    return {
        items: (data?.items ?? []).map((item: Record<string, unknown>) => mapRestFileMeta(item)),
        totalItems: data?.totalItems ?? 0,
        page: data?.page ?? 1,
        limit: data?.limit ?? 200,
    };
}

async function migrateFileMetaFromSettings(baseUrl: string, token: string): Promise<void> {
    if (fileMetaMigrationDone) return;
    const legacy = await loadFileMeta(baseUrl, token);
    const entries = Object.values(legacy.value);
    if (entries.length === 0) {
        fileMetaMigrationDone = true;
        return;
    }
    await Promise.all(
        entries.map((meta) =>
            upsertFileMeta(baseUrl, token, meta.fileId, {
                ...meta,
                allowedAccessRoleIds: meta.allowedAccessRoleIds ?? [],
            }),
        ),
    );
    fileMetaMigrationDone = true;
}

export async function loadFileMetaMap(
    baseUrl: string,
    token: string,
): Promise<Record<string, DocumentFileMeta>> {
    try {
        let page = 1;
        const map: Record<string, DocumentFileMeta> = {};
        let totalItems = 0;
        do {
            const result = await fetchFileMetaPage(baseUrl, token, { page, limit: 200 });
            totalItems = result.totalItems;
            for (const item of result.items) {
                map[item.fileId] = item;
            }
            page += 1;
        } while (Object.keys(map).length < totalItems);

        if (totalItems === 0 && !fileMetaMigrationDone) {
            await migrateFileMetaFromSettings(baseUrl, token);
            return loadFileMetaMap(baseUrl, token);
        }
        return map;
    } catch {
        const legacy = await loadFileMeta(baseUrl, token);
        const normalized: Record<string, DocumentFileMeta> = {};
        for (const [key, meta] of Object.entries(legacy.value)) {
            normalized[key] = {
                ...meta,
                allowedAccessRoleIds: meta.allowedAccessRoleIds ?? [],
            };
        }
        return normalized;
    }
}

export async function upsertFileMeta(
    baseUrl: string,
    token: string,
    fileId: string,
    payload: Partial<DocumentFileMeta> & Pick<DocumentFileMeta, 'title'>,
): Promise<DocumentFileMeta> {
    const body = {
        fileId,
        folderId: payload.folderId ?? null,
        title: payload.title,
        thumbnailId: payload.thumbnailId,
        contractNo: payload.contractNo,
        tags: payload.tags ?? [],
        expiresAt: payload.expiresAt,
        isArchived: payload.isArchived ?? false,
        isStarred: payload.isStarred ?? false,
        allowedAccessRoleIds: payload.allowedAccessRoleIds ?? [],
        customFields: payload.customFields ?? {},
    };
    try {
        const res = await axios.put(`${baseUrl}/api/documents/file-meta/${fileId}`, body, {
            headers: documentsHeaders(token),
        });
        const data = res.data?.data ?? res.data;
        return mapRestFileMeta(data as Record<string, unknown>);
    } catch {
        const legacy = await loadFileMeta(baseUrl, token);
        const next: DocumentFileMeta = {
            fileId,
            folderId: body.folderId,
            title: body.title,
            thumbnailId: body.thumbnailId,
            contractNo: body.contractNo,
            tags: body.tags,
            expiresAt: body.expiresAt,
            isArchived: body.isArchived,
            isStarred: body.isStarred,
            allowedAccessRoleIds: body.allowedAccessRoleIds,
            customFields: body.customFields,
            updatedAt: new Date().toISOString(),
        };
        await saveFileMeta(baseUrl, token, { ...legacy.value, [fileId]: next });
        return next;
    }
}

export type DocumentListRow = {
    fileId: string;
    title: string;
    originalName: string;
    createdAt?: string;
    owner?: string;
    allowedAccessRoleIds: string[];
    expiresAt?: string;
    isStarred: boolean;
    folderId: string | null;
    workflowStatus: import('./documents.types').DocumentWorkflowStatus;
    file: ExploreFile;
};

export async function fetchAllExploreFiles(
    baseUrl: string,
    token: string,
): Promise<{ files: ExploreFile[]; totalItems: number }> {
    let page = 1;
    const files: ExploreFile[] = [];
    let totalItems = 0;
    do {
        const batch = await exploreFiles(baseUrl, token, { page, limit: 200 });
        totalItems = batch.totalItems;
        files.push(...batch.files);
        page += 1;
    } while (files.length < totalItems);
    return { files, totalItems };
}

export async function fetchDocumentListPage(
    baseUrl: string,
    token: string,
    params: {
        page: number;
        limit: number;
        search?: string;
        folderId?: string;
        folders: DocumentFolder[];
        starredOnly?: boolean;
        workflowStatus?: import('./documents.types').DocumentWorkflowStatus;
        instances?: DocumentWorkflowInstance[];
    },
): Promise<{ items: DocumentListRow[]; totalItems: number }> {
    const [metaMap, explore, instances] = await Promise.all([
        loadFileMetaMap(baseUrl, token),
        fetchAllExploreFiles(baseUrl, token),
        params.instances
            ? Promise.resolve(params.instances)
            : loadWorkflowInstances(baseUrl, token).then((r) => r.value),
    ]);

    const folderFileIds = new Set(
        params.folderId
            ? params.folders.find((f) => f.id === params.folderId)?.fileIds ?? []
            : [],
    );

    const search = params.search?.trim().toLowerCase();

    const rows: DocumentListRow[] = explore.files
        .filter((file) => isDocumentExploreFile(file, metaMap))
        .filter((file) => {
            if (!params.folderId || params.folderId === ROOT_FOLDER_ID) return true;
            return fileBelongsToFolder(file, params.folderId, metaMap, folderFileIds);
        })
        .map((file) => {
            const fileId = normalizeFileId(file)!;
            const meta = metaMap[fileId];
            const activeWorkflow = getActiveWorkflowForFile(instances, fileId);
            const owner =
                (file.metadata?.uploadedBy as string | undefined) ||
                (file.metadata?.owner as string | undefined) ||
                undefined;
            return {
                fileId,
                title: meta?.title?.trim() || file.originalname || file.name || 'بدون نام',
                originalName: file.originalname || file.name || '—',
                createdAt: file.createdAt,
                owner,
                allowedAccessRoleIds: meta?.allowedAccessRoleIds ?? [],
                expiresAt: meta?.expiresAt,
                isStarred: meta?.isStarred ?? false,
                folderId: resolveFileFolderId(file, metaMap),
                workflowStatus: activeWorkflow?.status ?? 'draft',
                file,
            };
        })
        .filter((row) => {
            if (params.starredOnly && !row.isStarred) return false;
            if (params.workflowStatus && row.workflowStatus !== params.workflowStatus) return false;
            if (!search) return true;
            return (
                row.title.toLowerCase().includes(search) ||
                row.originalName.toLowerCase().includes(search) ||
                row.owner?.toLowerCase().includes(search)
            );
        })
        .sort((a, b) => {
            const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return tb - ta;
        });

    const start = (params.page - 1) * params.limit;
    return {
        items: rows.slice(start, start + params.limit),
        totalItems: rows.length,
    };
}

export async function fetchWorkflowTemplatesPage(
    baseUrl: string,
    token: string,
    params?: { page?: number; limit?: number; search?: string },
): Promise<{ items: DocumentWorkflowTemplate[]; totalItems: number; page: number; limit: number }> {
    const res = await axios.get(`${baseUrl}/api/documents/workflow-templates`, {
        headers: documentsHeaders(token),
        params: { page: params?.page ?? 1, limit: params?.limit ?? 10 },
    });
    const data = res.data?.data ?? res.data;
    let items = (data?.items ?? []).map((item: Record<string, unknown>) => mapRestWorkflowTemplate(item));
    const search = params?.search?.trim().toLowerCase();
    if (search) {
        items = items.filter(
            (t) =>
                t.name.toLowerCase().includes(search) ||
                (t.description?.toLowerCase().includes(search) ?? false),
        );
    }
    return {
        items,
        totalItems: search ? items.length : (data?.totalItems ?? items.length),
        page: data?.page ?? 1,
        limit: data?.limit ?? 10,
    };
}

async function migrateWorkflowTemplatesFromSettings(baseUrl: string, token: string): Promise<void> {
    if (templateMigrationDone) return;
    const legacy = await loadWorkflowTemplates(baseUrl, token);
    if (legacy.value.length === 0) {
        templateMigrationDone = true;
        return;
    }
    for (const tpl of legacy.value) {
        await createWorkflowTemplate(baseUrl, token, {
            name: tpl.name,
            description: tpl.description,
            steps: tpl.steps,
        });
    }
    templateMigrationDone = true;
}

export async function ensureWorkflowTemplatesRest(
    baseUrl: string,
    token: string,
): Promise<void> {
    try {
        const first = await fetchWorkflowTemplatesPage(baseUrl, token, { page: 1, limit: 1 });
        if (first.totalItems === 0 && !templateMigrationDone) {
            await migrateWorkflowTemplatesFromSettings(baseUrl, token);
        }
    } catch {
        // fallback to system-setting handled by callers
    }
}

export async function createWorkflowTemplate(
    baseUrl: string,
    token: string,
    body: { name: string; description?: string; steps: DocumentWorkflowStep[] },
): Promise<DocumentWorkflowTemplate> {
    const res = await axios.post(`${baseUrl}/api/documents/workflow-templates`, body, {
        headers: documentsHeaders(token),
    });
    const data = res.data?.data ?? res.data;
    return mapRestWorkflowTemplate(data as Record<string, unknown>);
}

export async function updateWorkflowTemplateRest(
    baseUrl: string,
    token: string,
    id: string,
    body: { name: string; description?: string; steps: DocumentWorkflowStep[] },
): Promise<DocumentWorkflowTemplate> {
    const res = await axios.put(`${baseUrl}/api/documents/workflow-templates/${id}`, body, {
        headers: documentsHeaders(token),
    });
    const data = res.data?.data ?? res.data;
    return mapRestWorkflowTemplate(data as Record<string, unknown>);
}

export async function deleteWorkflowTemplateRest(baseUrl: string, token: string, id: string): Promise<void> {
    await axios.delete(`${baseUrl}/api/documents/workflow-templates/${id}`, {
        headers: documentsHeaders(token),
    });
}

export async function loadWorkflowTemplatesRest(
    baseUrl: string,
    token: string,
    jobRoles: HrJobRole[] = [],
): Promise<DocumentWorkflowTemplate[]> {
    try {
        await ensureWorkflowTemplatesRest(baseUrl, token);
        let page = 1;
        const items: DocumentWorkflowTemplate[] = [];
        let totalItems = 0;
        do {
            const batch = await fetchWorkflowTemplatesPage(baseUrl, token, { page, limit: 200 });
            totalItems = batch.totalItems;
            items.push(...batch.items.map((t) => normalizeWorkflowTemplate(t, jobRoles)));
            page += 1;
        } while (items.length < totalItems);
        return items;
    } catch {
        const legacy = await loadWorkflowTemplates(baseUrl, token);
        return legacy.value.map((t) => normalizeWorkflowTemplate(t, jobRoles));
    }
}
