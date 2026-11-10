'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import parentStyles from '../../../marketing/Marketing.module.scss';
import tabStyles from '../../../marketing/automation/Automation.module.scss';
import styles from '../Hr.module.scss';
import { Container, Wrapper } from '@/app/(main)/layout';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { ErrorToaster } from '@my-workspace/utils';
import { LoadingState } from '@my-workspace/components';
import {
    loadDepartments,
    loadEmployees,
    loadJobRoles,
    resolveDepartmentName,
    resolveJobRoleName,
    saveEmployees,
} from '../hr-api';
import type { HrDepartment, HrEmployee, HrJobRole } from '../hr.types';
import { HR_EMPLOYEE_STATUS_LABELS } from '../hr.types';
import EmployeesGuide from '../components/EmployeesGuide';

export default function HrEmployeesPage() {
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [employees, setEmployees] = useState<HrEmployee[]>([]);
    const [departments, setDepartments] = useState<HrDepartment[]>([]);
    const [jobRoles, setJobRoles] = useState<HrJobRole[]>([]);

    const load = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const [e, d, r] = await Promise.all([
                loadEmployees(baseUrl, token),
                loadDepartments(baseUrl, token),
                loadJobRoles(baseUrl, token),
            ]);
            setEmployees(e.value);
            setDepartments(d.value);
            setJobRoles(r.value);
        } catch (err) {
            ErrorToaster(err);
        } finally {
            setLoading(false);
        }
    }, [baseUrl, token]);

    useEffect(() => {
        void load();
    }, [load]);

    const toggleStatus = async (id: string) => {
        if (!token) return;
        const next = employees.map((e) =>
            e.id === id
                ? { ...e, status: e.status === 'active' ? ('inactive' as const) : ('active' as const), updatedAt: new Date().toISOString() }
                : e,
        );
        await saveEmployees(baseUrl, token, next);
        setEmployees(next);
    };

    if (loading) return <LoadingState />;

    const activeCount = employees.filter((e) => e.status === 'active').length;

    return (
        <Container>
            <Wrapper>
                <div className={`${parentStyles.container} ${parentStyles.rtl}`}>
                    <header className={parentStyles.header}>
                        <div>
                            <h1 className={parentStyles.mainTitle}>کارمندان</h1>
                            <p className={parentStyles.subtitle}>
                                فهرست نیروی انسانی سازمان — {activeCount.toLocaleString('fa-IR')} نفر فعال
                            </p>
                        </div>
                        <Link href="/management/hr/employees/new" className={parentStyles.primaryBtn}>
                            افزودن نیروی انسانی جدید
                        </Link>
                    </header>

                    <EmployeesGuide />

                    <div className={tabStyles.tableWrap}>
                        <table className={tabStyles.dataTable}>
                            <thead><tr><th>نام</th><th>واحد</th><th>سمت</th><th>ایمیل</th><th>حساب</th><th>وضعیت</th><th>عملیات</th></tr></thead>
                            <tbody>
                                {employees.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className={tabStyles.emptyCell} data-label="">
                                            هنوز نیروی انسانی ثبت نشده —
                                            {' '}<Link href="/management/hr/employees/new">اولین مورد را اضافه کنید</Link>
                                        </td>
                                    </tr>
                                ) : employees.map((e) => (
                                    <tr key={e.id}>
                                        <td data-label="نام" className={tabStyles.cellPrimary}>{e.fullName}</td>
                                        <td data-label="واحد">{resolveDepartmentName(departments, e.departmentId)}</td>
                                        <td data-label="سمت">{resolveJobRoleName(jobRoles, e.jobRoleId)}</td>
                                        <td data-label="ایمیل" dir="ltr">{e.email || '—'}</td>
                                        <td data-label="حساب">{e.userId ? 'متصل' : '—'}</td>
                                        <td data-label="وضعیت">{HR_EMPLOYEE_STATUS_LABELS[e.status]}</td>
                                        <td data-label="عملیات">
                                            <button type="button" className={tabStyles.smallBtn} onClick={() => void toggleStatus(e.id)}>
                                                {e.status === 'active' ? 'غیرفعال' : 'فعال'}
                                            </button>
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
