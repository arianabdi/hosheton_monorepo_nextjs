'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import styles from '../../users.module.scss';
import roleStyles from '../../access-roles.module.scss';
import { Container, Wrapper } from '@/app/(main)/layout';
import { LoadingState } from '@my-workspace/components';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import UsersGuide from '../../components/UsersGuide';
import UserFormFields from '../../components/UserFormFields';
import {
    adminSetUserPassword,
    fetchAccessRoles,
    fetchUserProfile,
    updateUserProfile,
    type AccessRoleItem,
} from '../../access-api';

export default function UserProfilePage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const userId = params.id;

    const passwordRef = useRef<HTMLInputElement>(null);
    const repeatPasswordRef = useRef<HTMLInputElement>(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [roles, setRoles] = useState<AccessRoleItem[]>([]);
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [mobile, setMobile] = useState('');
    const [username, setUsername] = useState('');
    const [accessRoleId, setAccessRoleId] = useState('');

    const load = useCallback(async () => {
        if (!userId) return;
        try {
            setLoading(true);
            const [profile, rolesData] = await Promise.all([
                fetchUserProfile(userId),
                fetchAccessRoles(),
            ]);
            setRoles(rolesData.items);
            if (!profile) {
                ErrorToaster({ message: 'کاربر یافت نشد' });
                router.push('/users');
                return;
            }
            setFullName(profile.fullName || '');
            setEmail(profile.email || '');
            setMobile(profile.mobile || '');
            setUsername(profile.username || '');
            setAccessRoleId(profile.accessRoleId ? String(profile.accessRoleId) : '');
        } catch (err) {
            ErrorToaster(err);
        } finally {
            setLoading(false);
        }
    }, [userId, router]);

    useEffect(() => {
        void load();
    }, [load]);

    const handleSave = async () => {
        if (!userId || !fullName.trim() || !email.trim()) {
            ErrorToaster({ message: 'نام و ایمیل الزامی است' });
            return;
        }

        const newPassword = passwordRef.current?.value.trim() ?? '';
        const newRepeat = repeatPasswordRef.current?.value.trim() ?? '';

        if (newPassword || newRepeat) {
            if (!newPassword) {
                ErrorToaster({ message: 'رمز عبور جدید را وارد کنید' });
                return;
            }
            if (newPassword !== newRepeat) {
                ErrorToaster({ message: 'رمز عبور و تکرار آن یکسان نیست' });
                return;
            }
        }

        try {
            setSaving(true);

            if (newPassword) {
                await adminSetUserPassword(userId, newPassword, newRepeat);
            }

            await updateUserProfile(userId, {
                fullName: fullName.trim(),
                email: email.trim(),
                mobile: mobile.trim(),
                username: username.trim(),
                accessRoleId: accessRoleId || null,
            });

            SuccessToaster({
                message: newPassword ? 'اطلاعات کاربر و رمز عبور ذخیره شد' : 'اطلاعات کاربر ذخیره شد',
            });
            router.push('/users');
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
                        <h1 className={styles.mainTitle}>ویرایش پروفایل کاربر</h1>
                        <p className={styles.subtitle}>اطلاعات حساب، نقش دسترسی و رمز عبور را مدیریت کنید.</p>
                    </div>
                    <Link href="/users" className={styles.primaryBtn}>
                        بازگشت به لیست
                    </Link>
                </div>

                <UsersGuide />

                {loading ? (
                    <LoadingState />
                ) : (
                    <div className={`${roleStyles.formCard} ${styles.rtl}`}>
                        <UserFormFields
                            fullName={fullName}
                            onFullNameChange={setFullName}
                            email={email}
                            onEmailChange={setEmail}
                            mobile={mobile}
                            onMobileChange={setMobile}
                            username={username}
                            onUsernameChange={setUsername}
                            accessRoleId={accessRoleId}
                            onAccessRoleIdChange={setAccessRoleId}
                            roles={roles}
                            showPassword
                            passwordRefs={{ password: passwordRef, repeat: repeatPasswordRef }}
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
