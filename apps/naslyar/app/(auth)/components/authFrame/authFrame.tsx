'use client';

import React, {useEffect, useLayoutEffect, useState} from 'react';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import styles from './authFrame.module.scss';

import {PiPaintBrushBold} from "react-icons/pi";
import {usePathname, useRouter} from "next/navigation";
import {useAppStore} from "@/app/zustand/store/useAppStore";
import {useAuthStore} from "@/app/zustand/store/authStore";
import {AuthLoadingScreen} from "@/app/components/AuthLoadingScreen";

// Pages that only make sense for logged-out users: once a session exists the
// user should be sent to the home page instead of seeing the auth layout.
const AUTH_ENTRY_PREFIXES = ['/login', '/register', '/sms-code', '/otp', '/forgot-password'];
// Where a logged-in user should be sent when they land on an auth entry page.
const HOME_PATH = '/home';

export default function  AuthFrame({...props}) {


    const router = useRouter();
    const pathname = usePathname();
    const {theme, setTheme} = useAppStore();
    const token = useAuthStore((s) => s.token);
    const isLoading = useAuthStore((s) => s.isLoading);
    const isVerifying = useAuthStore((s) => s.isVerifying);

    const isAuthEntry = AUTH_ENTRY_PREFIXES.some((path) => pathname?.startsWith(path));
    const authBusy = isLoading || isVerifying;

    const toggleTheme = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark')
    };

    // Set theme on page load
    useLayoutEffect(() => {
        if (theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
        }
    }, [theme]);

    // A logged-in user landing on an auth entry page is bounced to home.
    useEffect(() => {
        if (!isAuthEntry || authBusy) return;
        if (token) {
            router.replace(HOME_PATH);
        }
    }, [isAuthEntry, authBusy, token, router]);

    // While the session check runs — or a session already exists on an auth
    // entry page — paint a centered loading screen instead of the auth layout,
    // so the login page never flashes for users who are already logged in.
    if (authBusy || (isAuthEntry && token)) {
        return <AuthLoadingScreen/>;
    }


    function ThemeSwitcher(){
        return (
            <span onClick={toggleTheme}>
                <PiPaintBrushBold size={20} color={"var(--icon-color)"} /> تغییر رنگ
            </span>
        )
    }

    function Logo({size}:{ size: number }){
        return (
            <div className={styles.logoContainer}>
                {/* You can use an image logo or text logo */}
               {/* <Image
                    src={theme === 'dark' ?  logoLight : logoDark} // Use the imported logo
                    alt="Logo"
                    className={styles.logo}
                    onClick={() => {
                        router.push('/chat')
                    }}
                    style={{ cursor: 'pointer', maxWidth: `${size}px` }}
                />*/}
            </div>
        )
    }




    return (
        <div className={styles.pageContainer}>

            {/* سمت چپ: فرم ورود */}
            <section className={styles.loginSection}>
                <div className={styles.mobileHeader}>
                    <ThemeSwitcher/>
                </div>
                {props.children}
            </section>

            {/* سمت راست: باکس کارت تخفیف و تبلیغات (Social Proof) */}
            <section className={styles.promoSection}>
                <div className={styles.header}>
                    <ThemeSwitcher/>
                </div>
                <div className={styles.promoCard}>
                    <h1>یک پنل برای مدیریت همهٔ اپلیکیشن‌ها</h1>

                    <p className={styles.promoIntro}>
                        از اینجا کاربران، محتوا، اشتراک‌ها، کمپین‌ها و پایش خطای اپلیکیشن‌هایی مثل هوشتون، لینگیکو، تسک‌ویژن و اُپن‌فارکس را مدیریت می‌کنید. هر بار ورود به یکی از این اپ‌ها وصل می‌شود و منوها و دسترسی‌های پنل بر اساس همان اپ و نقش شما تنظیم می‌شوند.
                    </p>

                    <ul className={styles.testimonialsList}>
                        <li>
                            <strong>کد شناسایی را وارد کنید.</strong> این کد را مدیر فنی به تیم شما داده و مشخص می‌کند کدام اپ‌ها برایتان باز باشد.
                        </li>
                        <li>
                            <strong>اپلیکیشن را انتخاب کنید.</strong> اپ‌های یک محصول (مثلاً بات، استودیو و بلاگر هوشتون) جدا فهرست شده‌اند؛ همان بخشی را بزنید که می‌خواهید مدیریت کنید.
                        </li>
                        <li>
                            <strong>با حساب ادمین همان اپ وارد شوید.</strong> ایمیل و رمز عبور، همان اطلاعات حساب شما در اپ انتخاب‌شده است.
                        </li>
                    </ul>

                    <p className={styles.promoOutro}>
                        اپ مورد نظرتان در فهرست نیست یا به بخشی از پنل دسترسی ندارید؟ از <strong>مدیر فنی تیم</strong> بخواهید کد شناسایی یا نقش دسترسی شما را به‌روز کند.
                    </p>
                </div>
            </section>

        </div>
    );
}