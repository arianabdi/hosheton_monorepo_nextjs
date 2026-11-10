'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from '../users.module.scss';
import roleStyles from '../access-roles.module.scss';
import { Container, Wrapper } from '@/app/(main)/layout';
import { LoadingState } from '@my-workspace/components';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import UsersGuide from '../components/UsersGuide';
import UserFormFields from '../components/UserFormFields';
import { createAdminUser, fetchAccessRoles, type AccessRoleItem } from '../access-api';

export default function NewAdminUserPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [roles, setRoles] = useState<AccessRoleItem[]>([]);
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [mobile, setMobile] = useState('');
    const [username, setUsername] = useState('');
    const [accessRoleId, setAccessRoleId] = useState('');
    const [password, setPassword] = useState('');
    const [repeatPassword, setRepeatPassword] = useState('');

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const rolesData = await fetchAccessRoles();
            setRoles(rolesData.items);
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
        if (!fullName.trim() || !email.trim() || !password) {
            ErrorToaster({ message: 'نام، ایمیل و رمز عبور الزامی است' });
            return;
        }
        if (password !== repeatPassword) {
            ErrorToaster({ message: 'رمز عبور و تکرار آن یکسان نیست' });
            return;
        }
        try {
            setSaving(true);
            await createAdminUser({
                fullName: fullName.trim(),
                email: email.trim(),
                mobile: mobile.trim(),
                username: username.trim(),
                accessRoleId: accessRoleId || undefined,
                password,
                repeatPassword,
            });
            SuccessToaster({ message: 'کاربر جدید ایجاد شد' });
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
                        <h1 className={styles.mainTitle}>افزودن کاربر جدید</h1>
                        <p className={styles.subtitle}>
                            ایجاد حساب ورود به پلتفرم با نقش دسترسی قابل تنظیم.
                        </p>
                    </div>
                    <Link href="/users" className={styles.primaryBtn}>
                        بازگشت
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
                            password={password}
                            onPasswordChange={setPassword}
                            repeatPassword={repeatPassword}
                            onRepeatPasswordChange={setRepeatPassword}
                            passwordRequired
                        />

                        <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                type="button"
                                className={styles.primaryBtn}
                                onClick={() => void handleSave()}
                                disabled={saving}
                            >
                                {saving ? 'در حال ایجاد…' : 'ایجاد کاربر'}
                            </button>
                        </div>
                    </div>
                )}
            </Wrapper>
        </Container>
    );
}
