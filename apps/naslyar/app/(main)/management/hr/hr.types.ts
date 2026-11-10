export interface HrDepartment {
    id: string;
    name: string;
    code?: string;
    description?: string;
    /** لیست متنی اعضا و نقش‌ها — راهنمای سازمانی */
    membersNote?: string;
    parentId?: string | null;
    createdAt: string;
    updatedAt?: string;
}

export interface HrJobRole {
    id: string;
    name: string;
    description?: string;
    departmentId?: string | null;
    createdAt: string;
    updatedAt?: string;
}

export type HrEmployeeStatus = 'active' | 'inactive';

export interface HrEmployee {
    id: string;
    fullName: string;
    email?: string;
    phone?: string;
    departmentId?: string | null;
    jobRoleId?: string | null;
    userId?: string | null;
    status: HrEmployeeStatus;
    hireDate?: string;
    createdAt: string;
    updatedAt: string;
}

export interface HrStore {
    departments: HrDepartment[];
    jobRoles: HrJobRole[];
    employees: HrEmployee[];
}

export const HR_EMPLOYEE_STATUS_LABELS: Record<HrEmployeeStatus, string> = {
    active: 'فعال',
    inactive: 'غیرفعال',
};

export const WORKFLOW_ASSIGNEE_TYPE_LABELS = {
    job_role: 'سمت',
    department: 'واحد',
    employee: 'شخص',
} as const;
