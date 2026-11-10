'use client'

import React from "react";
import {AuthContainer} from "../components/authContainer/authContainer";
import styles from "./login.module.scss";
import {LinkUrl} from "../otp";
import {AuthCard, AuthCardHeading, AuthCardSubTitle, AuthCardTitle} from "../components/authCard/authCard";
import {Field} from "../../field/field";

const DEFAULT_LOGIN_LABELS = {
    heading: 'ورود به حساب کاربری',
    title: 'اطلاعات ورود خود را وارد کنید',
    subtitle: 'برای استفاده از امکانات پلتفرم، لطفا نام کاربری یا ایمیل خود را وارد کرده سپس رمز عبور را وارد کنید',
    username: 'Username',
    password: 'Password',
    terms: 'شرایط و استفاده از خدمات',
    privacy: 'حریم خصوصی',
    acceptSuffix: 'پلتفرم را میپذیرم',
    and: 'و',
    submit: 'ورود',
    newMember: 'عضو جدید هستید؟',
    register: 'ثبت نام',
    forgot: 'فراموشی رمز عبور',
    loginWithPrefix: 'ورود با',
    loginWithPhone: 'شماره تماس',
};

export function LoginComponent({loading, form, setForm, onForgotPassword, onRegister, onOtp, onSubmit, onTerms, onPrivacy, labels}: any) {
    const l = { ...DEFAULT_LOGIN_LABELS, ...labels };

    return (
        <AuthContainer>
            <AuthCard>
                <AuthCardHeading>{l.heading}</AuthCardHeading>
                <AuthCardTitle>{l.title}</AuthCardTitle>
                <AuthCardSubTitle>{l.subtitle}</AuthCardSubTitle>


                <div className={styles.form}>
                    <div className={styles.login}>
                        <Field
                            placeholder={l.username}
                            type={'text'}
                            value={form.username}
                            onChange={(e: any) => {
                                setForm({...form, username: e});
                            }}
                        />
                        <Field
                            placeholder={l.password}
                            type={'password'}
                            value={form.password}
                            onChange={(e: any) => {
                                setForm({...form, password: e});
                            }}
                        />
                    </div>


                    <div className={styles.policy}>
                        <LinkUrl onClick={onTerms}>{l.terms}</LinkUrl> {l.and} <LinkUrl onClick={onPrivacy}>{l.privacy}</LinkUrl> {l.acceptSuffix}
                    </div>
                    <button disabled={loading} type="submit" className={styles.button} onClick={async () => {
                        onSubmit()
                    }}>{l.submit}</button>
                    <div className={styles.policy}>
                        {onRegister ? (
                            <>
                                {l.newMember}
                                <LinkUrl onClick={() => {
                                    onRegister()
                                }}>{l.register} </LinkUrl>
                                {' '}|{' '}
                            </>
                        ) : null}
                        {onForgotPassword ? (
                            <>
                                <LinkUrl onClick={() => {
                                    onForgotPassword()
                                }}>{l.forgot} </LinkUrl>
                                {' '}|{' '}
                            </>
                        ) : null}
                        {l.loginWithPrefix}
                        <LinkUrl onClick={() => {
                            onOtp()
                        }}>{l.loginWithPhone} </LinkUrl>
                    </div>
                </div>

            </AuthCard>
        </AuthContainer>
    )
}
