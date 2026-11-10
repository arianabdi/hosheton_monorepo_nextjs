'use client'

import React, {useEffect, useState} from "react";


import axios from "axios";
import {Divider, Field} from "@my-workspace/components";
import {useRouter} from "next/navigation";
import {ErrorToaster} from "@my-workspace/utils";
import {useAuthStore} from "@/app/zustand/store/authStore";
import {useAppStore} from "@/app/zustand/store/useAppStore";
import {AuthContainer} from "@my-workspace/components/src/auth/components/authContainer/authContainer";
import {
    AuthCard,
    AuthCardHeading,
    AuthCardSubTitle,
    AuthCardTitle
} from "@my-workspace/components/src/auth/components/authCard/authCard";
import styles from "@my-workspace/components/src/auth/login/login.module.scss";
import styles2 from "./login.module.scss";
import {LinkUrl} from "@my-workspace/components/src/auth/otp";
import {StaticImageData} from "next/image";
import {AppPicker} from "./AppPicker";
import lingeecko from '@/assets/images/app-icons/lingeecko.png'
import taskvision from '@/assets/images/app-icons/taskvision.png'
import openforex from '@/assets/images/app-icons/openforex.png'

type AppOption = {
    name: string;
    /** Unique option id (e.g. hosheton_studio) */
    _id: string;
    /** Canonical app name for nav / home (e.g. hosheton) */
    appName: string;
    logo: StaticImageData | string;
    baseUrl: string;
};

const HOSHETON_BOT_API =
    process.env.NEXT_PUBLIC_HOSHETON_BOT_API_URL
    || (process.env.NODE_ENV === 'development' ? 'http://localhost:3378' : 'https://api.bot.hosheton.com');
const HOSHETON_STUDIO_API =
    process.env.NEXT_PUBLIC_HOSHETON_STUDIO_API_URL
    || (process.env.NODE_ENV === 'development' ? 'http://localhost:3379' : 'https://api.studio.hosheton.com');
const HOSHETON_BLOGGER_API =
    process.env.NEXT_PUBLIC_HOSHETON_BLOGGER_API_URL
    || (process.env.NODE_ENV === 'development' ? 'http://localhost:3027' : 'https://api.hosheton.com/blogger');

const ALL_APPS: AppOption[] = process.env.NODE_ENV === 'development'
    ? [
        {name: 'هوشتون · بات', _id: 'hosheton_bot', appName: 'hosheton', logo: '', baseUrl: HOSHETON_BOT_API},
        {name: 'هوشتون · استودیو', _id: 'hosheton_studio', appName: 'hosheton', logo: '', baseUrl: HOSHETON_STUDIO_API},
        {name: 'هوشتون · بلاگر', _id: 'hosheton_blogger', appName: 'hosheton', logo: '', baseUrl: HOSHETON_BLOGGER_API},
        {name: 'لینگیکو', _id: 'lingeeko', appName: 'lingeeko', logo: lingeecko, baseUrl: 'http://localhost:4077'},
        {name: 'تسک ویژن', _id: 'taskvision', appName: 'taskvision', logo: taskvision, baseUrl: 'http://localhost:3012'},
        {name: 'اُپن‌فارکس', _id: 'openforex', appName: 'openforex', logo: openforex, baseUrl: 'http://localhost:4877'},
        {name: 'روستِرآرکِید', _id: 'roosterarcade', appName: 'roosterarcade', logo: '', baseUrl: 'http://localhost:3003'},
        {name: 'فیلکوش', _id: 'filkosh', appName: 'filkosh', logo: '', baseUrl: process.env.NEXT_PUBLIC_FILKOSH_API_URL || 'http://localhost:3014'},
    ]
    : [
        {name: 'هوشتون · بات', _id: 'hosheton_bot', appName: 'hosheton', logo: '', baseUrl: HOSHETON_BOT_API},
        {name: 'هوشتون · استودیو', _id: 'hosheton_studio', appName: 'hosheton', logo: '', baseUrl: HOSHETON_STUDIO_API},
        {name: 'هوشتون · بلاگر', _id: 'hosheton_blogger', appName: 'hosheton', logo: '', baseUrl: HOSHETON_BLOGGER_API},
        {name: 'لینگیکو', _id: 'lingeeko', appName: 'lingeeko', logo: lingeecko, baseUrl: 'https://api.lingeeko.ir'},
        {name: 'تسک ویژن', _id: 'taskvision', appName: 'taskvision', logo: taskvision, baseUrl: 'https://api.taskvision.ir'},
        {name: 'اُپن‌فارکس', _id: 'openforex', appName: 'openforex', logo: openforex, baseUrl: 'https://api.openforex.ir'},
        {name: 'روستِرآرکِید', _id: 'roosterarcade', appName: 'roosterarcade', logo: '', baseUrl: 'https://api.roosterarcade.com'},
        {name: 'فیلکوش', _id: 'filkosh', appName: 'filkosh', logo: '', baseUrl: process.env.NEXT_PUBLIC_FILKOSH_API_URL || 'https://api.filkosh.ir'},
    ];

/** access codes → appName or option _id (`*` = all apps) */
const ACCESS_BY_CODE: Record<string, string[] | '*'> = {
    '3355': ['hosheton'],
    '4477': '*',
};

function filterAppsByAccess(access: string[] | '*'): AppOption[] {
    if (access === '*') return ALL_APPS;
    return ALL_APPS.filter(
        (app) => access.includes(app.appName) || access.includes(app._id),
    );
}

export default function Login() {
    const router = useRouter();
    const {setProfile, setApplication} = useAppStore();
    const setAuth = useAuthStore((state) => state.setAuth);
    const token = useAuthStore((state) => state.token);
    const isLoading = useAuthStore((state) => state.isLoading);
    const isVerifying = useAuthStore((state) => state.isVerifying);

    // Safety net: a user who is already logged in should never land on the
    // login form — bounce them to the app right away. (The AuthFrame layout
    // does the same, but this guarantees it even if that layout is skipped.)
    useEffect(() => {
        if (isLoading || isVerifying) return;
        if (token) {
            router.replace('/home');
        }
    }, [token, isLoading, isVerifying, router]);

    const [form, setForm] = useState({
        username: "",
        password: ""
    });

    const [accessCode, setAccessCode] = useState('');
    const [allowedApps, setAllowedApps] = useState<AppOption[]>([]);
    const [appId, setAppId] = useState('-');
    const [canonicalAppName, setCanonicalAppName] = useState('-');
    const [baseUrl, setBaseUrl] = useState<string | undefined>();
    const [appLogo, setAppLogo] = useState<StaticImageData | string | undefined>();

    const appsUnlocked = allowedApps.length > 0;
    const codeRejected = accessCode.length >= 4 && !appsUnlocked;
    const selectedApp = allowedApps.find((i) => i._id === appId);

    const applyAccessCode = (code: string) => {
        setAccessCode(code);

        const access = ACCESS_BY_CODE[code];
        const apps = access ? filterAppsByAccess(access) : [];
        setAllowedApps(apps);
        // A single allowed app needs no choice — select it right away.
        if (apps.length === 1) {
            selectApp(apps[0]);
            return;
        }
        setAppId('-');
        setCanonicalAppName('-');
        setBaseUrl(undefined);
        setAppLogo(undefined);
    };

    const selectApp = (m: AppOption) => {
        setAppId(m._id);
        setCanonicalAppName(m.appName);
        setBaseUrl(m.baseUrl === '-' ? undefined : m.baseUrl);
        setAppLogo(m.logo || undefined);
    };

    const onFormSubmit = async () => {
        if (!baseUrl || !canonicalAppName || canonicalAppName === '-') return;
        try {
            const res = await axios.post(`${baseUrl}/api/user/login`, {
                "email": form.username,
                "password": form.password
            });

            if (res.data.statusCode === 200) {
                const apiUser = res.data.data.user;
                setProfile({
                    _id: apiUser._id,
                    email: apiUser.email,
                    userNumber: apiUser.fullName,
                    username: apiUser.username,
                    avatar: apiUser.avatar,
                    roles: apiUser.roles
                })
                setApplication({
                    appName: canonicalAppName,
                    appVariant: appId,
                    name: selectedApp?.name || canonicalAppName,
                    appLogo: appLogo as string,
                    baseUrl: baseUrl,
                })
                setAuth(
                    res.data.data.accessToken,
                    {
                        id: String(apiUser._id),
                        email: apiUser.email || '',
                        name: apiUser.fullName || apiUser.username || '',
                        username: apiUser.username,
                        mobile: apiUser.mobile,
                        roles: apiUser.roles,
                        accessRoleId: apiUser.accessRoleId,
                        accessRoleName: apiUser.accessRoleName,
                    },
                    apiUser.permissions || [],
                    apiUser.isSuperAdmin || false,
                );
                router.push('/home')
            }
        } catch (e) {
            ErrorToaster(e)
        }
    };

    return (
        <AuthContainer>
            <AuthCard>
                <AuthCardHeading>ورود به پنل مدیریت</AuthCardHeading>
                <AuthCardTitle>اطلاعات ورود خود را وارد کنید</AuthCardTitle>
                <AuthCardSubTitle>
                    اول کد شناسایی تیم‌تان را وارد کنید تا اپلیکیشن‌هایی که به آن‌ها دسترسی دارید نمایش داده شوند؛
                    سپس اپ مورد نظر را انتخاب کنید و با ایمیل و رمز عبور ادمین همان اپ وارد شوید.
                </AuthCardSubTitle>

                <div className={styles.form}>
                    <div className={styles.login}>
                        <Field
                            placeholder={'کد شناسایی'}
                            type={'text'}
                            name="accessCode"
                            autoComplete="one-time-code"
                            inputMode="numeric"
                            data-lpignore="true"
                            data-1pignore="true"
                            data-form-type="other"
                            value={accessCode}
                            onChange={(e) => {
                                applyAccessCode(e);
                            }}
                        />
                    </div>
                    {codeRejected ? (
                        <div className={styles2.codeError}>
                            این کد شناسایی معتبر نیست. کد درست را از مدیر فنی تیم خود بگیرید.
                        </div>
                    ) : null}
                </div>

                {appsUnlocked && (
                    <>
                        <div style={{padding: "20px 0px"}}>
                            <Divider/>
                        </div>
                        <AppPicker apps={allowedApps} selectedId={appId} onSelect={selectApp}/>
                    </>
                )}

                <div style={{padding: "20px 0px"}}>
                    <Divider/>
                </div>

                <div className={styles.form}>
                    <div className={styles.login}>
                        <Field
                            placeholder={'Username'}
                            type={'text'}
                            name="username"
                            autoComplete="username"
                            disabled={!appsUnlocked}
                            value={form.username}
                            onChange={(e) => {
                                setForm({...form, username: e});
                            }}
                        />
                        <Field
                            placeholder={'Password'}
                            type={'password'}
                            name="password"
                            autoComplete="current-password"
                            disabled={!appsUnlocked}
                            value={form.password}
                            onChange={(e) => {
                                setForm({...form, password: e});
                            }}
                        />
                    </div>


                    <div className={styles.policy}>
                        <LinkUrl onClick={() => {
                        }}>شرایط و استفاده از خدمات</LinkUrl> و <LinkUrl>حریم خصوصی</LinkUrl> پلتفرم را میپذیرم
                    </div>
                    <button
                        disabled={!baseUrl || baseUrl === '-' || !appsUnlocked}
                        type="submit"
                        className={styles.button}
                        onClick={async () => {
                            await onFormSubmit()
                        }}
                    >
                        {selectedApp ? `ورود به ${selectedApp.name}` : 'ورود'}
                    </button>
                    <div className={styles.policy}>
                        عضو جدید هستید؟
                        <LinkUrl onClick={() => {
                            router.push('/register')
                        }}>ثبت نام </LinkUrl> |

                        <LinkUrl onClick={() => {
                            router.push('/forgot-password')
                        }}>فراموشی رمز عبور </LinkUrl> |

                        ورود با
                        <LinkUrl onClick={() => {
                            router.push('/otp')
                        }}>شماره تماس </LinkUrl>
                    </div>
                </div>

            </AuthCard>
        </AuthContainer>
    )
}
