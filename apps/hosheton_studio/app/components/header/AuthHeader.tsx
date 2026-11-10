// components/Header/Header.js
'use client';

import {useLayoutEffect} from 'react';
import {useRouter} from 'next/navigation';
import Image from 'next/image';
import {CgDarkMode} from 'react-icons/cg';
import styles from './header.module.scss';
// import Icon from "@/assets/images/svg/icon-blue.svg";

import {almari} from "@my-workspace/fonts/almari";
import {Logs} from "@/app/components/header/header";
import {useAppStore} from "@/app/zustand/store/useAppStore";


export default function AuthHeader({title}: any) {
    const router = useRouter();
    const {theme, setTheme} = useAppStore();

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


    return (
        <header className={styles.header}>
            <div className={`${styles.title} ${almari.className}`} onClick={() => router.push('/introduction')}>
                <div className={styles.icon}>
                    {/*<Image*/}
                    {/*    src={Icon}*/}
                    {/*    alt="Icon"*/}
                    {/*    width={40}*/}
                    {/*    height={40}*/}
                    {/*/>*/}
                </div>
                {title}
            </div>
            <div className={styles.headerIcons}>
                <CgDarkMode size={26} color={"var(--icon-color)"} onClick={toggleTheme}/>
            </div>
            {/*<Logs
                fullname={'NULL'}
                token={'NULL'}
                theme={theme}
                font={'NULL'}
            />*/}
        </header>
    );
}