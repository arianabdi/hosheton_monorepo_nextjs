import { createId, loadSetting, saveSetting } from '@/app/utils/system-setting-api';
import type { HrDepartment, HrEmployee, HrJobRole, HrStore } from './hr.types';

const KEYS = {
    departments: 'hr.departments',
    jobRoles: 'hr.jobRoles',
    employees: 'hr.employees',
} as const;

const META = {
    group: 'hr',
    label: 'منابع انسانی',
    description: 'واحدها، سمت‌ها و کارمندان سازمان.',
};

function normalizeArray<T>(payload: unknown): T[] {
    return Array.isArray(payload) ? (payload as T[]) : [];
}

export async function loadDepartments(baseUrl: string, token: string) {
    return loadSetting<HrDepartment[]>(baseUrl, token, KEYS.departments, META, [], normalizeArray);
}

export async function saveDepartments(baseUrl: string, token: string, items: HrDepartment[]) {
    await saveSetting(baseUrl, token, KEYS.departments, items);
}

export async function loadJobRoles(baseUrl: string, token: string) {
    return loadSetting<HrJobRole[]>(baseUrl, token, KEYS.jobRoles, META, [], normalizeArray);
}

export async function saveJobRoles(baseUrl: string, token: string, items: HrJobRole[]) {
    await saveSetting(baseUrl, token, KEYS.jobRoles, items);
}

export async function loadEmployees(baseUrl: string, token: string) {
    return loadSetting<HrEmployee[]>(baseUrl, token, KEYS.employees, META, [], normalizeArray);
}

export async function saveEmployees(baseUrl: string, token: string, items: HrEmployee[]) {
    await saveSetting(baseUrl, token, KEYS.employees, items);
}

export async function loadHrStore(baseUrl: string, token: string): Promise<HrStore> {
    const [departments, jobRoles, employees] = await Promise.all([
        loadDepartments(baseUrl, token),
        loadJobRoles(baseUrl, token),
        loadEmployees(baseUrl, token),
    ]);
    return {
        departments: departments.value,
        jobRoles: jobRoles.value,
        employees: employees.value,
    };
}

export interface HrCatalog {
    departments: HrDepartment[];
    jobRoles: HrJobRole[];
    employees: HrEmployee[];
}

export async function loadHrCatalog(baseUrl: string, token: string): Promise<HrCatalog> {
    const store = await loadHrStore(baseUrl, token);
    return {
        departments: store.departments,
        jobRoles: store.jobRoles,
        employees: store.employees.filter((e) => e.status === 'active'),
    };
}

export function findEmployeeByUserId(employees: HrEmployee[], userId?: string | null): HrEmployee | undefined {
    if (!userId?.trim()) return undefined;
    return employees.find((e) => e.userId === userId && e.status === 'active');
}

export function resolveDepartmentName(departments: HrDepartment[], id?: string | null): string {
    if (!id) return '—';
    return departments.find((d) => d.id === id)?.name || '—';
}

export function resolveJobRoleName(jobRoles: HrJobRole[], id?: string | null): string {
    if (!id) return '—';
    return jobRoles.find((r) => r.id === id)?.name || '—';
}

export function formatAssigneeLabel(
    type: 'job_role' | 'department' | 'employee',
    name: string,
): string {
    const prefix = type === 'job_role' ? 'سمت' : type === 'department' ? 'واحد' : 'شخص';
    return `${prefix}: ${name}`;
}

export { createId as createHrId };
