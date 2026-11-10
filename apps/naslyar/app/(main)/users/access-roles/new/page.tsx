'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from '../../users.module.scss';
import roleStyles from '../../access-roles.module.scss';
import { Container, Wrapper } from '@/app/(main)/layout';
import { LoadingState } from '@my-workspace/components';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import PermissionMatrix from '../../components/PermissionMatrix';
import AccessRolesGuide from '../../components/AccessRolesGuide';
import {
    createAccessRole,
    ensurePermissionCatalog,
    type PermissionGroup,
} from '../../access-api';

export default function NewAccessRolePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [groups, setGroups] = useState<PermissionGroup[]>([]);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [permissionKeys, setPermissionKeys] = useState<string[]>([]);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const data = await ensurePermissionCatalog();
            setGroups(data.groups ?? []);
        } catch (err) {
            ErrorToaster(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const handleSave = async () => {
        if (!name.trim()) {
            ErrorToaster({ message: 'نام نقش الزامی است' });
            return;
        }
        try {
            setSaving(true);
            await createAccessRole({
                name: name.trim(),
                description: description.trim(),
                permissionKeys,
            });
            SuccessToaster({ message: 'نقش ایجاد شد' });
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
                        <h1 className={styles.mainTitle}>ایجاد نقش جدید</h1>
                        <p className={styles.subtitle}>نام نقش و دسترسی‌های مجاز را مشخص کنید.</p>
                    </div>
                    <Link href="/users/access-roles" className={styles.primaryBtn}>
                        بازگشت
                    </Link>
                </div>

                <AccessRolesGuide />

                {loading ? (
                    <LoadingState />
                ) : (
                    <div className={`${roleStyles.formCard} ${styles.rtl}`}>
                        <div className={roleStyles.field}>
                            <label>نام نقش *</label>
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="مثلاً مدیر HR"
                            />
                            <p className={roleStyles.fieldHint}>
                                عنوانی که در لیست کاربران نمایش داده می‌شود.
                            </p>
                        </div>
                        <div className={roleStyles.field}>
                            <label>توضیحات</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={3}
                                placeholder="شرح کوتاه از مسئولیت این نقش"
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
                                {saving ? 'در حال ذخیره…' : 'ذخیره نقش'}
                            </button>
                        </div>
                    </div>
                )}
            </Wrapper>
        </Container>
    );
}
