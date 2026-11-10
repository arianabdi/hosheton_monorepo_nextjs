'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import styles from '../../users.module.scss';
import roleStyles from '../../access-roles.module.scss';
import { Container, Wrapper } from '@/app/(main)/layout';
import { LoadingState } from '@my-workspace/components';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import PermissionMatrix from '../../components/PermissionMatrix';
import {
    fetchAccessRoleById,
    ensurePermissionCatalog,
    updateAccessRole,
    type PermissionGroup,
} from '../../access-api';

export default function EditAccessRolePage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const roleId = params.id;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [groups, setGroups] = useState<PermissionGroup[]>([]);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [permissionKeys, setPermissionKeys] = useState<string[]>([]);

    const load = useCallback(async () => {
        if (!roleId) return;
        try {
            setLoading(true);
            const [catalog, role] = await Promise.all([
                ensurePermissionCatalog(),
                fetchAccessRoleById(roleId),
            ]);
            setGroups(catalog.groups ?? []);
            if (!role) {
                ErrorToaster({ message: 'نقش یافت نشد' });
                router.push('/users/access-roles');
                return;
            }
            setName(role.name || '');
            setDescription(role.description || '');
            setPermissionKeys(role.permissionKeys || []);
        } catch (err) {
            ErrorToaster(err);
        } finally {
            setLoading(false);
        }
    }, [roleId, router]);

    useEffect(() => {
        void load();
    }, [load]);

    const handleSave = async () => {
        if (!roleId || !name.trim()) {
            ErrorToaster({ message: 'نام نقش الزامی است' });
            return;
        }
        try {
            setSaving(true);
            await updateAccessRole(roleId, {
                name: name.trim(),
                description: description.trim(),
                permissionKeys,
            });
            SuccessToaster({ message: 'نقش به‌روزرسانی شد' });
            router.push('/users/access-roles');
        } catch (err) {
            ErrorToaster(err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Container>
            <Wrapper>
                <div className={`${styles.header} ${styles.rtl}`}>
                    <div>
                        <h1 className={styles.mainTitle}>ویرایش نقش</h1>
                        <p className={styles.subtitle}>دسترسی‌های این نقش را تنظیم کنید.</p>
                    </div>
                    <Link href="/users/access-roles" className={styles.primaryBtn}>
                        بازگشت
                    </Link>
                </div>

                {loading ? (
                    <LoadingState />
                ) : (
                    <div className={`${roleStyles.formCard} ${styles.rtl}`}>
                        <div className={roleStyles.field}>
                            <label>نام نقش *</label>
                            <input value={name} onChange={(e) => setName(e.target.value)} />
                        </div>
                        <div className={roleStyles.field}>
                            <label>توضیحات</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={3}
                            />
                        </div>

                        <h3 className={roleStyles.sectionTitle}>دسترسی‌های مجاز</h3>
                        <PermissionMatrix
                            groups={groups}
                            selectedKeys={permissionKeys}
                            onChange={setPermissionKeys}
                        />

                        <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                type="button"
                                className={styles.primaryBtn}
                                onClick={() => void handleSave()}
                                disabled={saving}
                            >
                                {saving ? 'در حال ذخیره…' : 'ذخیره تغییرات'}
                            </button>
                        </div>
                    </div>
                )}
            </Wrapper>
        </Container>
    );
}
