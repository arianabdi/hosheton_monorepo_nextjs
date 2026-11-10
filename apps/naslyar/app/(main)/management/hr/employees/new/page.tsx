'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import parentStyles from '../../../../marketing/Marketing.module.scss';
import tabStyles from '../../../../marketing/automation/Automation.module.scss';
import styles from '../../Hr.module.scss';
import { Container, Wrapper } from '@/app/(main)/layout';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { LoadingState } from '@my-workspace/components';
import AdminUserPickModalContent from '@/app/(main)/users/AdminUserPickModalContent';
import { getAdminUserDisplayParts, type AdminUserListItem } from '@/app/(main)/users/user-list-api';
import {
    createHrId,
    loadDepartments,
    loadEmployees,
    loadJobRoles,
    saveEmployees,
} from '../../hr-api';
import type { HrDepartment, HrEmployee, HrJobRole } from '../../hr.types';

export default function NewEmployeePage() {
    const router = useRouter();
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [employees, setEmployees] = useState<HrEmployee[]>([]);
    const [departments, setDepartments] = useState<HrDepartment[]>([]);
    const [jobRoles, setJobRoles] = useState<HrJobRole[]>([]);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [departmentId, setDepartmentId] = useState('');
    const [jobRoleId, setJobRoleId] = useState('');
    const [userId, setUserId] = useState<string | null>(null);

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

    const departmentJobRoles = useMemo(() => {
        if (!departmentId) return [];
        return jobRoles.filter((r) => r.departmentId === departmentId);
    }, [departmentId, jobRoles]);

    const onDepartmentChange = (nextDepartmentId: string) => {
        setDepartmentId(nextDepartmentId);
        setJobRoleId('');
    };

    const onUserPicked = (user: AdminUserListItem) => {
        const { name, email: userEmail, mobile: userMobile } = getAdminUserDisplayParts(user);
        setFullName(name);
        setEmail(userEmail);
        setPhone(userMobile);
        setUserId(user._id);
        setPickerOpen(false);
    };

    const clearUserLink = () => {
        setUserId(null);
        setFullName('');
        setEmail('');
        setPhone('');
    };

    const isLinkedToUser = Boolean(userId);

    const save = async () => {
        if (!token || !fullName.trim()) {
            ErrorToaster({ message: 'نام کامل الزامی است' });
            return;
        }
        try {
            setSaving(true);
            const now = new Date().toISOString();
            const item: HrEmployee = {
                id: createHrId('emp'),
                fullName: fullName.trim(),
                email: email.trim() || undefined,
                phone: phone.trim() || undefined,
                departmentId: departmentId || null,
                jobRoleId: jobRoleId || null,
                userId: userId || null,
                status: 'active',
                createdAt: now,
                updatedAt: now,
            };
            const next = [...employees, item];
            await saveEmployees(baseUrl, token, next);
            SuccessToaster({ message: 'نیروی انسانی ثبت شد' });
            router.push('/management/hr/employees');
        } catch (err) {
            ErrorToaster(err);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <LoadingState />;

    return (
        <Container>
            <Wrapper>
                <div className={`${parentStyles.container} ${parentStyles.rtl}`}>
                    <header className={parentStyles.header}>
                        <div>
                            <h1 className={parentStyles.mainTitle}>افزودن نیروی انسانی جدید</h1>
                            <p className={parentStyles.subtitle}>
                                ثبت پروفایل سازمانی به صورت دستی یا با انتخاب از کاربران سیستم
                            </p>
                        </div>
                        <Link href="/management/hr/employees" className={tabStyles.smallBtn}>
                            بازگشت به فهرست
                        </Link>
                    </header>

                    <section className={styles.formGuideCard}>
                        <h2>قبل از ثبت</h2>
                        <p>
                            اگر واحد یا سمت مورد نظر در فهرست نیست، ابتدا در
                            {' '}<Link href="/management/hr/departments">واحدهای سازمانی</Link>
                            {' '}و{' '}
                            <Link href="/management/hr/roles">سمت‌های سازمانی</Link> آن‌ها را تعریف کنید.
                            برای ارجاع دقیق در گردش کار، اتصال به حساب کاربری توصیه می‌شود.
                        </p>
                    </section>

                    <div className={parentStyles.formCard}>
                        <h3 className={parentStyles.formSectionTitle}>اتصال به حساب کاربری (اختیاری)</h3>
                        <div className={tabStyles.inlineActions} style={{ marginBottom: '0.5rem' }}>
                            {!isLinkedToUser ? (
                                <button type="button" className={tabStyles.smallBtn} onClick={() => setPickerOpen(true)}>
                                    انتخاب از کاربران
                                </button>
                            ) : null}
                            {userId ? (
                                <>
                                    <span className={styles.linkedBadge}>متصل به حساب کاربری</span>
                                    <button type="button" className={tabStyles.smallBtn} onClick={clearUserLink}>
                                        پاک کردن / قطع اتصال
                                    </button>
                                </>
                            ) : null}
                        </div>
                        <p className={styles.fieldHintBlock}>
                            اگر این شخص در بخش «کاربران» حساب دارد، با انتخاب او نام، ایمیل و شماره تماس به‌صورت
                            خودکار پر می‌شود و فیلدها قفل می‌مانند. با «پاک کردن / قطع اتصال» می‌توانید کاربر دیگری
                            انتخاب کنید یا اطلاعات را دستی وارد کنید.
                        </p>

                        <h3 className={parentStyles.formSectionTitle} style={{ marginTop: '1.25rem' }}>
                            اطلاعات هویتی و تماس
                        </h3>
                        <div className={styles.formRow}>
                            <div className={parentStyles.field}>
                                <label>نام کامل *</label>
                                <input
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="مثلاً علی رضایی"
                                    disabled={isLinkedToUser}
                                />
                                <p className={styles.fieldHint}>
                                    نام رسمی که در فهرست نیروها، گردش کار و گزارش‌ها نمایش داده می‌شود.
                                    در صورت انتخاب از کاربران، از نام همان حساب پر می‌شود.
                                </p>
                            </div>
                            <div className={parentStyles.field}>
                                <label>ایمیل</label>
                                <input
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@company.com"
                                    dir="ltr"
                                    disabled={isLinkedToUser}
                                />
                                <p className={styles.fieldHint}>
                                    آدرس ایمیل کاری برای تماس و تطبیق با حساب کاربری. اختیاری است اما برای
                                    اتصال به کاربر و پیگیری در سیستم مفید است.
                                </p>
                            </div>
                        </div>
                        <div className={parentStyles.field}>
                            <label>تلفن</label>
                            <input
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="۰۹۱۲..."
                                dir="ltr"
                                disabled={isLinkedToUser}
                            />
                            <p className={styles.fieldHint}>
                                شماره تماس کاری (موبایل یا داخلی). در صورت انتخاب از کاربران، از شماره همان حساب پر می‌شود.
                            </p>
                        </div>

                        <h3 className={parentStyles.formSectionTitle} style={{ marginTop: '1.25rem' }}>
                            جایگاه سازمانی
                        </h3>
                        <div className={styles.formRow}>
                            <div className={parentStyles.field}>
                                <label>واحد سازمانی</label>
                                <select value={departmentId} onChange={(e) => onDepartmentChange(e.target.value)}>
                                    <option value="">— انتخاب نشده —</option>
                                    {departments.map((d) => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                </select>
                                <p className={styles.fieldHint}>
                                    ابتدا واحد سازمانی را انتخاب کنید. سمت‌های مرتبط با همان واحد در فیلد بعدی
                                    نمایش داده می‌شوند.
                                </p>
                            </div>
                            <div className={parentStyles.field}>
                                <label>سمت سازمانی</label>
                                <select
                                    value={jobRoleId}
                                    onChange={(e) => setJobRoleId(e.target.value)}
                                    disabled={!departmentId}
                                >
                                    <option value="">
                                        {!departmentId
                                            ? '— ابتدا واحد را انتخاب کنید —'
                                            : departmentJobRoles.length === 0
                                              ? '— سمت ثبت‌شده‌ای برای این واحد نیست —'
                                              : '— انتخاب نشده —'}
                                    </option>
                                    {departmentJobRoles.map((r) => (
                                        <option key={r.id} value={r.id}>{r.name}</option>
                                    ))}
                                </select>
                                <p className={styles.fieldHint}>
                                    پس از انتخاب واحد، فقط سمت‌های تعریف‌شده برای همان واحد در
                                    {' '}<Link href="/management/hr/roles">سمت‌های سازمانی</Link> قابل انتخاب هستند.
                                    {!departmentId ? ' تا زمانی که واحد انتخاب نشود، این فیلد غیرفعال است.' : null}
                                </p>
                            </div>
                        </div>

                        <div className={styles.formNoteBox}>
                            <strong>وضعیت پس از ثبت:</strong> نیروی جدید با وضعیت «فعال» ثبت می‌شود.
                            بعداً از فهرست کارمندان می‌توانید وضعیت را به «غیرفعال» تغییر دهید.
                        </div>

                        <div className={tabStyles.inlineActions} style={{ marginTop: '1.25rem' }}>
                            <button
                                type="button"
                                className={parentStyles.primaryBtn}
                                disabled={saving || !fullName.trim()}
                                onClick={() => void save()}
                            >
                                {saving ? 'در حال ثبت...' : 'ثبت نیروی انسانی'}
                            </button>
                            <Link href="/management/hr/employees" className={tabStyles.smallBtn}>
                                انصراف
                            </Link>
                        </div>
                    </div>
                </div>
            </Wrapper>
            {pickerOpen ? (
                <div className={styles.modalOverlay} onClick={() => setPickerOpen(false)} role="presentation">
                    <div className={styles.modalPanel} onClick={(ev) => ev.stopPropagation()}>
                        <AdminUserPickModalContent onSelect={onUserPicked} onClose={() => setPickerOpen(false)} />
                    </div>
                </div>
            ) : null}
        </Container>
    );
}
