'use client'


import {Geist, Geist_Mono} from "next/font/google";
import "./globals.css";

import {iransans} from "@my-workspace/fonts/iransans";
import ToastProvider from "@/app/toastProvider";
import {AuthProvider} from "@/app/zustand/providers/AuthProvider";


import {useAuthStore} from "@/app/zustand/store/authStore";
import {useAppStore} from "@/app/zustand/store/useAppStore";
import {Logs} from "@/app/components/logs";

import styles from './layout.module.scss'

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});



export default function RootLayout({children,}: Readonly<{ children: React.ReactNode; }>) {

    const { theme, setTheme, fullname, font } = useAppStore();
    const { token } = useAuthStore();

    return (
        <html
            lang="en"
            className={`${geistSans.variable} ${geistMono.variable} ${iransans.className} h-full antialiased`}
        >
            <body className={styles.body}>
                <AuthProvider>
                    <ToastProvider/>
                    {children}
                </AuthProvider>

                {/*<Logs*/}
                {/*    fullname={fullname}*/}
                {/*    token={token}*/}
                {/*    theme={theme}*/}
                {/*    font={font}*/}
                {/*/>*/}
            </body>
        </html>
    );
}
