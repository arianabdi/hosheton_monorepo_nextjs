'use client'

import React from "react";
import {AuthCard, AuthCardHeading, AuthCardSubTitle, AuthCardTitle} from "../components/authCard/authCard";
import {AuthContainer} from "../components/authContainer/authContainer";
import {LinkUrl} from "../otp";
import styles from "./forgot-password.module.scss";
import {Field} from "../../field/field";

const DEFAULT_FORGOT_LABELS = {
    heading: 'فراموشی رمز عبور',
    title: 'ایمیل خود را وارد کنید',
    subtitle: 'جهت ورود مجدد به پنل، یک لینک موقت حاوی تغییر پسورد برای شما ارسال خواهد شد. پس از آن مجدد از طریق صفحه لاگین وارد شوید',
    email: 'Email',
    submit: 'ارسال لینک',
    haveAccount: 'حساب دارید؟',
    login: 'ورود',
};

export function ForgotPasswordComponent({loading, form, setForm, onSubmit, onLogin, labels}: any) {
    const l = {...DEFAULT_FORGOT_LABELS, ...labels};

    return (
        <AuthContainer style={{paddingTop: '0px'}}>
            <AuthCard style={{
                marginTop: "0px",
                paddingTop: "0px"
            }}>
                <AuthCardHeading>{l.heading}</AuthCardHeading>
                <AuthCardTitle>{l.title}</AuthCardTitle>
                <AuthCardSubTitle>{l.subtitle}</AuthCardSubTitle>

                <form onSubmit={onSubmit} className={styles.form}>
                    <div className={styles.login}>
                        <Field
                            placeholder={l.email}
                            type={'text'}
                            value={form?.email}
                            onChange={(e: any) => {
                                setForm({...form, email: e.toLowerCase()});
                            }}
                        />
                    </div>

                    <button type="submit" disabled={loading} className={styles.button}>{l.submit}</button>
                    <div className={styles.policy}>
                        {l.haveAccount}{' '}
                        <LinkUrl onClick={() => {
                            onLogin()
                        }}>{l.login} </LinkUrl>
                    </div>
                </form>
            </AuthCard>
        </AuthContainer>
    )
}
