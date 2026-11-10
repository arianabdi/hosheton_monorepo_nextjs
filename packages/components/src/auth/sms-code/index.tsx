'use client'

import React, { useEffect, useRef, useState } from 'react';
import styles from './SmsCodePage.module.scss';
import {AuthCard, AuthCardHeading, AuthCardSubTitle, AuthCardTitle} from "../components/authCard/authCard";
import {AuthContainer} from "../components/authContainer/authContainer";

const RESEND_SECONDS = 120;

const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const DEFAULT_SMS_LABELS = {
    heading: 'ورود به حساب کاربری',
    title: 'تأیید شماره موبایل',
    subtitle: 'کد ۵ رقمی ارسال‌شده را وارد کنید. این کد بعد از ۲ دقیقه منقضی خواهد شد',
    enter: 'ورود به پنل',
    noCode: 'اگر کد را دریافت نکردید،',
    resend: 'ارسال مجدد',
    or: 'و یا',
    changeNumber: 'تغییر شماره',
    loginWithPrefix: 'ورود با',
    loginWithEmail: 'ایمیل و رمزعبور',
};

export function SmsCodeComponent({loading, code, setCode, phone, onOtp, onSubmit, onResend, onLogin, labels}: any) {
    const l = { ...DEFAULT_SMS_LABELS, ...labels };
    const inputRefs = useRef<any[]>([]);
    const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);

    useEffect(() => {
        const id = setInterval(() => {
            setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
        }, 1000);
        return () => clearInterval(id);
    }, []);

    const resendDisabled = loading || secondsLeft > 0;

    const handleResend = () => {
        if (resendDisabled) return;
        setSecondsLeft(RESEND_SECONDS);
        onResend?.();
    };

    useEffect(() => {
        inputRefs.current[0]?.focus();
    }, []);

    const focusAt = (index: any) => {
        const el = inputRefs.current[index];
        if (!el) return;
        el.focus();
        el.select?.();
    };

    const applyDigits = (startIndex: any, digits: any) => {
        if (!digits) return;
        const next = [...code];
        let cursor = startIndex;
        for (let i = 0; i < digits.length && cursor < next.length; i += 1, cursor += 1) {
            next[cursor] = digits[i];
        }
        setCode(next);

        const focusIndex = Math.min(startIndex + digits.length, next.length - 1);
        requestAnimationFrame(() => focusAt(focusIndex));

        if (next.every((num) => num)) {
            onSubmit?.(next.join(''));
        }
    };

    const handleChange = (value: any, index: any) => {
        const digits = String(value || '').replace(/\D/g, '');
        if (!digits) {
            const next = [...code];
            next[index] = '';
            setCode(next);
            return;
        }
        applyDigits(index, digits.length > 1 ? digits : digits.slice(-1));
    };

    const handleKeyDown = (event: any, index: any) => {
        if (event.key !== 'Backspace') return;
        if (code[index]) return;
        if (index <= 0) return;
        event.preventDefault();
        const next = [...code];
        next[index - 1] = '';
        setCode(next);
        requestAnimationFrame(() => focusAt(index - 1));
    };

    const handlePaste = (event: any, index: any) => {
        event.preventDefault();
        const digits = (event.clipboardData?.getData('text') || '').replace(/\D/g, '');
        applyDigits(index, digits);
    };

    return (
        <AuthContainer>
            <AuthCard>

                <AuthCardHeading>{l.heading}</AuthCardHeading>
                <AuthCardTitle>{l.title}</AuthCardTitle>
                <AuthCardSubTitle>{l.subtitle}</AuthCardSubTitle>

                <div className={styles.inputs} dir="ltr">
                    {code.map((c: any, index: any) => (
                        <input
                            key={index}
                            type="text"
                            inputMode="numeric"
                            autoComplete={index === 0 ? 'one-time-code' : 'off'}
                            pattern="[0-9]*"
                            value={c}
                            onChange={(e) => handleChange(e.target.value, index)}
                            onKeyDown={(e) => handleKeyDown(e, index)}
                            onPaste={(e) => handlePaste(e, index)}
                            className={c ? `${styles.input} ${styles.inputFilled}` : styles.input}
                            ref={(el: any) => { inputRefs.current[index] = el; }}
                            maxLength={index === 0 ? 5 : 1}
                            autoFocus={index === 0}
                            aria-label={`digit ${index + 1}`}
                        />
                    ))}
                </div>

                <button
                    disabled={loading}
                    type="button"
                    className={styles.button}
                    onClick={() => {
                        const otp = code.join('');
                        if (otp.length === 5) {
                            onSubmit?.(otp);
                        }
                    }}
                >
                    {l.enter}
                </button>
                <p className={styles.tip}>
                    {l.noCode}{' '}
                    <button type="button" className={styles.resend} disabled={resendDisabled} onClick={handleResend}>
                        {l.resend}
                    </button>
                    {secondsLeft > 0 && (
                        <span className={styles.countdown} dir="ltr">{formatTime(secondsLeft)}</span>
                    )}{' '}
                    {l.or}{' '}
                    <button type="button" className={styles.resend} onClick={() => onOtp?.()}>
                        {l.changeNumber}
                    </button>
                </p>
                <div className={styles.emailLogin}>
                    {l.loginWithPrefix}{' '}
                    <button type="button" className={styles.resend} onClick={() => onLogin?.()}>
                        {l.loginWithEmail}
                    </button>
                </div>
            </AuthCard>
        </AuthContainer>
    );
}
