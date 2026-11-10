'use client'


import React from 'react';
import styles from './phoneNumberPage.module.scss';
import {AuthCard, AuthCardHeading, AuthCardSubTitle, AuthCardTitle} from "../components/authCard/authCard";
import {AuthContainer} from "../components/authContainer/authContainer";

export function LinkUrl({...props}: any){
    return(
        <span {...props} className={styles.LinkUrl}>
            {props.children}
        </span>
    )
}

const DEFAULT_OTP_LABELS = {
    heading: 'ورود به حساب کاربری',
    title: 'شماره موبایل خود را وارد کنید',
    subtitle: 'برای استفاده از امکانات پلتفرم، لطفا شماره موبایل خود را وارد کنید. کد تایید به این شماره پیامک خواهد شد',
    terms: 'شرایط و استفاده از خدمات',
    privacy: 'حریم خصوصی',
    acceptSuffix: 'پلتفرم را میپذیرم',
    and: 'و',
    send: 'ارسال کد',
    sending: 'در حال ارسال...',
    loginWithEmail: 'ایمیل و رمزعبور',
    loginWithPrefix: 'ورود با',
};

const EASTERN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

/** نمایشی: ارقام لاتین ذخیره‌شده را برای زبان‌های RTL فارسی می‌کند. */
function toEasternDigits(value: string): string {
    return value.replace(/\d/g, (d) => EASTERN_DIGITS[Number(d)]);
}

/** ورودی کاربر (فارسی/عربی/لاتین) را به ارقام لاتین برای ذخیره برمی‌گرداند. */
function normalizeToLatinDigits(value: string): string {
    return value
        .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
        .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

export function OtpComponent({loading, phone, setPhone, onSubmit, onLogin, onTerms, onPrivacy, labels, digitsLocale}: any) {
    const l = { ...DEFAULT_OTP_LABELS, ...labels };
    const persianDigits = digitsLocale === 'fa';

    return (
        <AuthContainer>
            <AuthCard>
                <AuthCardHeading>{l.heading}</AuthCardHeading>
                <AuthCardTitle>{l.title}</AuthCardTitle>
                <AuthCardSubTitle>{l.subtitle}</AuthCardSubTitle>

                <form onSubmit={onSubmit} className={styles.form}>
                    <div className={styles.phoneNumberInput}>
                        <span className={styles.prefix} aria-hidden="true">+98</span>
                        <input
                            type="tel"
                            inputMode="numeric"
                            autoComplete="tel-national"
                            className={styles.phoneInput}
                            style={persianDigits ? undefined : {fontFamily: 'inherit'}}
                            value={persianDigits ? toEasternDigits(phone) : phone}
                            placeholder={persianDigits ? '۹۱۲۳۴۵۶۷۸۹' : '9123456789'}
                            dir="ltr"
                            onChange={(e) => {
                                const digits = normalizeToLatinDigits(e.target.value).replace(/\D/g, '').slice(0, 11);
                                setPhone(digits.startsWith('0') ? digits : (digits ? `0${digits}` : ''));
                            }}
                        />
                    </div>


                    <div className={styles.policy} >
                        <LinkUrl onClick={onTerms}>{l.terms}</LinkUrl> {l.and} <LinkUrl onClick={onPrivacy}>{l.privacy}</LinkUrl> {l.acceptSuffix}
                    </div>
                    <button disabled={loading} type="submit" className={styles.button}>
                        {loading ? l.sending : l.send}
                    </button>
                    <div className={styles.policy}>
                        {l.loginWithPrefix}  <LinkUrl onClick={()=>{
                                onLogin()
                        }}>{l.loginWithEmail} </LinkUrl>
                    </div>
                </form>
            </AuthCard>
        </AuthContainer>
    );
}
