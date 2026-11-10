export interface DocumentFolder {
    id: string;
    name: string;
    parentId: string | null;
    fileIds: string[];
    createdAt: string;
}

export interface DocumentFileMeta {
    fileId: string;
    folderId: string | null;
    title: string;
    thumbnailId?: string;
    contractNo?: string;
    tags: string[];
    expiresAt?: string;
    isArchived: boolean;
    isStarred: boolean;
    allowedAccessRoleIds: string[];
    customFields: Record<string, string>;
    updatedAt: string;
}

export type DocumentWorkflowStatus = WorkflowStatus | 'draft';

export type WorkflowStatus = 'pending' | 'in_progress' | 'completed' | 'rejected';

export type WorkflowAssigneeType = 'job_role' | 'department' | 'employee';

export interface DocumentWorkflowStep {
    id: string;
    label: string;
    instruction?: string;
    assigneeType?: WorkflowAssigneeType;
    assigneeId?: string;
    assigneeName?: string;
    order: number;
    /** @deprecated legacy — use assigneeType/assigneeId */
    role?: string;
    /** @deprecated legacy — use assigneeName */
    roleLabel?: string;
}

export interface DocumentWorkflowTemplate {
    id: string;
    name: string;
    description?: string;
    steps: DocumentWorkflowStep[];
    createdAt: string;
}

export type WorkflowPriority = 'normal' | 'urgent';

export type WorkflowHistoryAction = 'start' | 'advance' | 'complete' | 'reject';

export interface WorkflowHistoryEntry {
    stepIndex: number;
    stepLabel: string;
    action: WorkflowHistoryAction;
    userName: string;
    at: string;
    comment?: string;
}

export interface DocumentWorkflowInstance {
    id: string;
    fileId: string;
    fileName: string;
    templateId: string;
    templateName: string;
    currentStepIndex: number;
    status: WorkflowStatus;
    submittedBy: string;
    submittedById?: string;
    /** @deprecated — use assigneeName */
    assignee?: string;
    assigneeType?: WorkflowAssigneeType;
    assigneeId?: string;
    assigneeName?: string;
    note?: string;
    priority?: WorkflowPriority;
    history?: WorkflowHistoryEntry[];
    createdAt: string;
    updatedAt: string;
}

export type SharePermission = 'view' | 'download';

export interface SharedLink {
    id: string;
    fileId: string;
    fileName: string;
    token: string;
    password?: string;
    expiresAt?: string;
    permission: SharePermission;
    isActive: boolean;
    createdAt: string;
}

export type AclRole = 'viewer' | 'editor' | 'owner';

export interface AccessRule {
    id: string;
    targetType: 'folder' | 'file';
    targetId: string;
    targetName: string;
    subjectType: 'user' | 'role';
    subjectId: string;
    subjectName: string;
    role: AclRole;
}

export type AuditAction =
    | 'view'
    | 'download'
    | 'edit'
    | 'delete'
    | 'share'
    | 'upload'
    | 'archive'
    | 'folder_create'
    | 'folder_rename'
    | 'folder_delete'
    | 'workflow_advance'
    | 'workflow_complete'
    | 'workflow_start'
    | 'workflow_template'
    | 'share_create'
    | 'share_deactivate'
    | 'acl_add';

export interface AuditLogEntry {
    id: string;
    fileId?: string;
    fileName?: string;
    userId?: string;
    userName: string;
    action: AuditAction;
    detail?: string;
    ip?: string;
    createdAt: string;
}

export interface RecentActivity {
    fileId: string;
    fileName: string;
    action: string;
    at: string;
}

export interface CustomFieldDef {
    id: string;
    key: string;
    label: string;
    required: boolean;
}

export interface DocumentSettings {
    maxUploadMb: number;
    allowedExtensions: string[];
    ocrEnabled: boolean;
    namingRule: string;
    customFields: CustomFieldDef[];
    trashRetentionDays: number;
}

export interface DocumentsStore {
    folderTree: DocumentFolder[];
    fileMeta: Record<string, DocumentFileMeta>;
    workflowTemplates: DocumentWorkflowTemplate[];
    workflowInstances: DocumentWorkflowInstance[];
    sharedLinks: SharedLink[];
    accessRules: AccessRule[];
    auditLogs: AuditLogEntry[];
    recentActivity: RecentActivity[];
    settings: DocumentSettings;
}

export const DEFAULT_DOCUMENT_SETTINGS: DocumentSettings = {
    maxUploadMb: 100,
    allowedExtensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'png', 'jpg', 'jpeg'],
    ocrEnabled: false,
    namingRule: 'DOC-{year}-{seq}',
    customFields: [],
    trashRetentionDays: 30,
};

export const ROOT_FOLDER_ID = 'root';

export const ACL_ROLE_LABELS: Record<AclRole, string> = {
    viewer: 'مشاهده',
    editor: 'ویرایش',
    owner: 'مالک',
};

export const WORKFLOW_STATUS_LABELS: Record<WorkflowStatus, string> = {
    pending: 'در انتظار',
    in_progress: 'در جریان',
    completed: 'تکمیل‌شده',
    rejected: 'رد شده',
};

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
    view: 'مشاهده',
    download: 'دانلود',
    edit: 'ویرایش',
    delete: 'حذف',
    share: 'اشتراک',
    upload: 'آپلود',
    archive: 'آرشیو',
    folder_create: 'ایجاد پوشه',
    folder_rename: 'تغییر نام پوشه',
    folder_delete: 'حذف پوشه',
    workflow_advance: 'پیش‌روی گردش کار',
    workflow_complete: 'تکمیل گردش کار',
    workflow_start: 'شروع گردش کار',
    workflow_template: 'ایجاد قالب گردش کار',
    share_create: 'ایجاد لینک اشتراک',
    share_deactivate: 'غیرفعال‌سازی لینک',
    acl_add: 'افزودن دسترسی',
};
