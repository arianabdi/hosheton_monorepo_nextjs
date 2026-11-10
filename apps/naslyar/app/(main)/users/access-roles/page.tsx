'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from '../users.module.scss';
import { Container, Wrapper } from '@/app/(main)/layout';
import { LoadingState } from '@my-workspace/components';
import TableEmptyState from '@/app/(main)/components/TableEmptyState';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { TbShield } from 'react-icons/tb';
import TableTheme from '@my-workspace/components/src/TableTheme/TableTheme';
import HrRowActionMenu from '@/app/(main)/management/hr/components/HrRowActionMenu';
import AccessRolesGuide from '../components/AccessRolesGuide';
import {
    currentAppPermissionCatalog,
    deleteAccessRole,
    ensurePermissionCatalog,
    fetchAccessRoles,
    fetchPermissionCatalog,
    syncPermissionCatalog,
    type AccessRoleItem,
} from '../access-api';

export default function AccessRolesPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [roles, setRoles] = useState<AccessRoleItem[]>([]);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const [{ items }] = await Promise.all([
                fetchAccessRoles(),
                // first visit on an app with an empty catalog (e.g. blogger) fills it from the menu
                ensurePermissionCatalog().catch(() => null),
            ]);
            setRoles(items);
        } catch (err) {
            ErrorToaster(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const handleSync = async () => {
        try {
            setSyncing(true);
            const catalogItems = currentAppPermissionCatalog();
            const result = await syncPermissionCatalog(catalogItems);
            await fetchPermissionCatalog();
            SuccessToaster({
                message: `همگام‌سازی انجام شد (${result?.created ?? 0} جدید، ${result?.updated ?? 0} به‌روز)`,
            });
        } catch (err) {
            ErrorToaster(err);
        } finally {
            setSyncing(false);
        }
    };

    const handleDelete = async (role: AccessRoleItem) => {
        if (!confirm(`نقش «${role.name}» حذف شود؟`)) return;
        try {
            await deleteAccessRole(role._id);
            SuccessToaster({ message: 'نقش حذف شد' });
            await load();
        } catch (err) {
            ErrorToaster(err);
        }
    };

    return (
        <Container>
            <Wrapper>
                <div className={`${styles.header} ${styles.rtl}`}>
                    <div>
                        <h1 className={styles.mainTitle}>نقش‌ها و دسترسی‌ها</h1>
                        <p className={styles.subtitle}>
                            تعریف نقش‌های سفارشی و تعیین بخش‌های مجاز هر نقش در پنل naslyar.
                        </p>
                    </div>
                    <div className={styles.headerActions}>
                        <button
                            type="button"
                            className={styles.primaryBtn}
                            onClick={() => void handleSync()}
                            disabled={syncing}
                        >
                            {syncing ? 'در حال همگام‌سازی…' : 'همگام‌سازی با منو'}
                        </button>
                        <Link href="/users/access-roles/new" className={styles.primaryBtn}>
                            + نقش جدید
                        </Link>
                    </div>
                </div>

                <AccessRolesGuide />

                <div className={styles.rtl}>
                    {loading ? (
                        <LoadingState />
                    ) : roles.length === 0 ? (
                        <TableEmptyState
                            icon={<TbShield size={32} />}
                            title="نقشی تعریف نشده"
                            description="برای شروع، همگام‌سازی با منو را بزنید و سپس یک نقش جدید بسازید."
                            secondaryLabel="ایجاد نقش"
                            onSecondaryClick={() => router.push('/users/access-roles/new')}
                        />
                    ) : (
                        <TableTheme>
                            <table className={styles.customTable}>
                                <thead>
                                    <tr>
                                        <th>نام نقش</th>
                                        <th>توضیحات</th>
                                        <th>تعداد دسترسی</th>
                                        <th>عملیات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {roles.map((role) => (
                                        <tr key={role._id}>
                                            <td>{role.name}</td>
                                            <td>{role.description || '—'}</td>
                                            <td>{role.permissionKeys?.length ?? 0}</td>
                                            <td>
                                                <HrRowActionMenu
                                                    rowId={role._id}
                                                    items={[
                                                        {
                                                            label: 'ویرایش',
                                                            onClick: () =>
                                                                router.push(`/users/access-roles/${role._id}`),
                                                        },
                                                        {
                                                            label: 'حذف',
                                                            danger: true,
                                                            onClick: () => void handleDelete(role),
                                                        },
                                                    ]}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </TableTheme>
                    )}
                </div>
            </Wrapper>
        </Container>
    );
}
