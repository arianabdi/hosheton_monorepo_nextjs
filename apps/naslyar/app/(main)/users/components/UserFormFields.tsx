'use client';

import React, { useEffect, useState, type RefObject } from 'react';
import roleStyles from '../access-roles.module.scss';
import type { AccessRoleItem } from '../access-api';

type PasswordRefs = {
    password: RefObject<HTMLInputElement | null>;
    repeat: RefObject<HTMLInputElement | null>;
};

type Props = {
    fullName: string;
    onFullNameChange: (v: string) => void;
    email: string;
    onEmailChange: (v: string) => void;
    mobile: string;
    onMobileChange: (v: string) => void;
    username: string;
    onUsernameChange: (v: string) => void;
    accessRoleId: string;
    onAccessRoleIdChange: (v: string) => void;
    roles: AccessRoleItem[];
    showPassword?: boolean;
    password?: string;
    onPasswordChange?: (v: string) => void;
    repeatPassword?: string;
    onRepeatPasswordChange?: (v: string) => void;
    passwordRequired?: boolean;
    /** در حالت ویرایش: فیلدهای رمز uncontrolled تا autofill/readOnly state را خراب نکند */
    passwordRefs?: PasswordRefs;
};

export default function UserFormFields({
    fullName,
    onFullNameChange,
    email,
    onEmailChange,
    mobile,
    onMobileChange,
    username,
    onUsernameChange,
    accessRoleId,
    onAccessRoleIdChange,
    roles,
    showPassword,
    password = '',
    onPasswordChange,
    repeatPassword = '',
    onRepeatPasswordChange,
    passwordRequired,
    passwordRefs,
}: Props) {
    const useUncontrolledPassword = Boolean(passwordRefs && !passwordRequired);
    const [passwordFieldsReady, setPasswordFieldsReady] = useState(passwordRequired);

    useEffect(() => {
        if (passwordRequired || passwordRefs) {
            setPasswordFieldsReady(true);
            return;
        }
        setPasswordFieldsReady(false);
        const timer = window.setTimeout(() => setPasswordFieldsReady(true), 50);
        return () => window.clearTimeout(timer);
    }, [passwordRequired, passwordRefs]);

    return (
        <>
            <div className={roleStyles.field}>
                <label>نام و نام خانوادگی *</label>
                <input
                    value={fullName}
                    onChange={(e) => onFullNameChange(e.target.value)}
                    placeholder="مثلاً علی رضایی"
                />
                <p className={roleStyles.fieldHint}>
                    نام رسمی که در لیست کاربران و منوی پروفایل نمایش داده می‌شود.
                </p>
            </div>

            <div className={roleStyles.field}>
                <label>ایمیل *</label>
                <input
                    value={email}
                    onChange={(e) => onEmailChange(e.target.value)}
                    placeholder="name@company.com"
                    autoComplete="off"
                    dir="ltr"
                />
                <p className={roleStyles.fieldHint}>
                    آدرس ایمیل برای ورود به سیستم استفاده می‌شود و باید یکتا باشد.
                </p>
            </div>

            <div className={roleStyles.field}>
                <label>شماره تماس</label>
                <input
                    value={mobile}
                    onChange={(e) => onMobileChange(e.target.value)}
                    placeholder="۰۹۱۲..."
                    dir="ltr"
                />
                <p className={roleStyles.fieldHint}>
                    شماره موبایل برای تماس و جستجو در لیست کاربران. اختیاری است.
                </p>
            </div>

            <div className={roleStyles.field}>
                <label>نام کاربری</label>
                <input
                    value={username}
                    onChange={(e) => onUsernameChange(e.target.value)}
                    placeholder="username"
                    dir="ltr"
                />
                <p className={roleStyles.fieldHint}>
                    در صورت خالی بودن، سیستم از نام کامل یا ایمیل برای نمایش استفاده می‌کند.
                </p>
            </div>

            <div className={roleStyles.field}>
                <label>نقش دسترسی (سطح دسترسی naslyar)</label>
                <select value={accessRoleId} onChange={(e) => onAccessRoleIdChange(e.target.value)}>
                    <option value="">بدون نقش — فقط پیشخوان</option>
                    {roles.map((role) => (
                        <option key={role._id} value={role._id}>
                            {role.name}
                        </option>
                    ))}
                </select>
                <p className={roleStyles.fieldHint}>
                    نقش تعیین می‌کند کاربر کدام بخش‌های منو را پس از ورود ببیند. نقش‌ها را از{' '}
                    «نقش‌ها و دسترسی‌ها» مدیریت کنید.
                </p>
            </div>

            {showPassword ? (
                <div className={roleStyles.passwordSection}>
                    <h3 className={roleStyles.sectionTitle}>
                        {passwordRequired ? 'رمز عبور *' : 'تغییر رمز عبور (فقط ادمین)'}
                    </h3>
                    <div className={roleStyles.field}>
                        <label>{passwordRequired ? 'رمز عبور' : 'رمز عبور جدید'}</label>
                        {useUncontrolledPassword ? (
                            <input
                                ref={passwordRefs!.password}
                                type="password"
                                name="admin-set-password"
                                autoComplete="new-password"
                                defaultValue=""
                                placeholder="خالی بگذارید اگر نمی‌خواهید تغییر دهید"
                                dir="ltr"
                            />
                        ) : (
                            <input
                                type="password"
                                name={passwordRequired ? 'new-user-password' : 'admin-set-password'}
                                autoComplete="new-password"
                                value={password}
                                onChange={(e) => onPasswordChange?.(e.target.value)}
                                placeholder={passwordRequired ? undefined : 'خالی بگذارید اگر نمی‌خواهید تغییر دهید'}
                                readOnly={!passwordRequired && !passwordFieldsReady}
                                dir="ltr"
                            />
                        )}
                        <p className={roleStyles.fieldHint}>
                            {passwordRequired
                                ? 'رمز عبور اولیه کاربر هنگام ایجاد حساب (حداقل ۸ کاراکتر، شامل حروف بزرگ/کوچک، عدد و نماد).'
                                : 'در صورت پر کردن، رمز عبور کاربر بدون نیاز به رمز قبلی تغییر می‌کند (حداقل ۸ کاراکتر، شامل حروف بزرگ/کوچک، عدد و نماد).'}
                        </p>
                    </div>
                    <div className={roleStyles.field}>
                        <label>تکرار رمز عبور</label>
                        {useUncontrolledPassword ? (
                            <input
                                ref={passwordRefs!.repeat}
                                type="password"
                                name="admin-set-password-confirm"
                                autoComplete="new-password"
                                defaultValue=""
                                placeholder="تکرار رمز عبور جدید"
                                dir="ltr"
                            />
                        ) : (
                            <input
                                type="password"
                                name={passwordRequired ? 'new-user-password-confirm' : 'admin-set-password-confirm'}
                                autoComplete="off"
                                value={repeatPassword}
                                onChange={(e) => onRepeatPasswordChange?.(e.target.value)}
                                placeholder={passwordRequired ? undefined : 'تکرار رمز عبور جدید'}
                                readOnly={!passwordRequired && !passwordFieldsReady}
                                dir="ltr"
                            />
                        )}
                    </div>
                </div>
            ) : null}
        </>
    );
}
