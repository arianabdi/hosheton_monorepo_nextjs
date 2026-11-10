'use client'

import React from "react";
import {AuthCard, AuthCardHeading, AuthCardSubTitle, AuthCardTitle} from "../components/authCard/authCard";
import {AuthContainer} from "../components/authContainer/authContainer";
import {LinkUrl} from "../otp";
import {Field} from "../../field/field";
import styles from "./register.module.scss";

const DEFAULT_REGISTER_LABELS = {
    heading: 'ثبت نام',
    title: 'اطلاعات خود را وارد کنید',
    subtitle: 'جهت ورود به پلتفرم و ثبت نام، اطلاعات مورد نیاز را پر کرده و سپس روی ثبت نام بزنید',
    fullName: 'نام و نام خانوادگی',
    email: 'ایمیل',
    password: 'رمز عبور',
    repeatPassword: 'تکرار رمز عبور',
    submit: 'ثبت نام',
    haveAccount: 'حساب دارید؟',
    login: 'ورود',
};

export function RegisterComponent({form, setForm, loading, onSubmit, onLogin, labels}: any) {
    const l = {...DEFAULT_REGISTER_LABELS, ...labels};

    return (
        <AuthContainer>
            <AuthCard>
                <AuthCardHeading>{l.heading}</AuthCardHeading>
                <AuthCardTitle>{l.title}</AuthCardTitle>
                <AuthCardSubTitle>{l.subtitle}</AuthCardSubTitle>

                <div className={styles.form}>
                    <div className={styles.login}>
                        <Field
                            placeholder={l.fullName}
                            type={'text'}
                            value={form.fullName}
                            onChange={(e: any) => {
                                setForm({...form, fullName: e});
                            }}
                        />
                        <Field
                            placeholder={l.email}
                            type={'text'}
                            value={form.email}
                            onChange={(e: any) => {
                                setForm({...form, email: e});
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
                        <Field
                            placeholder={l.repeatPassword}
                            type={'password'}
                            value={form.repeatPassword}
                            onChange={(e: any) => {
                                setForm({...form, repeatPassword: e});
                            }}
                        />
                    </div>

                    <button disabled={loading} onClick={onSubmit} className={styles.button}>{l.submit}</button>
                    <div className={styles.policy}>
                        {l.haveAccount}{' '}
                        <LinkUrl onClick={() => {
                            onLogin()
                        }}>{l.login} </LinkUrl>
                    </div>
                </div>
            </AuthCard>
        </AuthContainer>
    )
}
