'use client'

import React, {useLayoutEffect, useState} from "react";
import {CgDarkMode} from "react-icons/cg";
import style from '../AppHeader/header.module.scss'
import {NaslyarLogo} from "@/assets/images/svg/naslyar_logo";


export const AuthHeader = () => {
    const iconSize = 19;
    // const navigate = useNavigate();
    const [theme, setTheme] = useState(() => {
        if (typeof window !== 'undefined') {
            const savedTheme = localStorage.getItem('theme');
            return savedTheme ? savedTheme : 'light';
        }
        return 'light';
    });

    // Function to toggle between light and dark themes
    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
    };
    // Set theme on page load
    useLayoutEffect(() => {
        if (theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
        }
    }, [theme]);


    // const [currentLanguage, setCurrentLanguage] = React.useState(i18next.language);
    const handleLanguageChange = (newLocale) => {
        // i18next.changeLanguage(newLocale); // 🔑 this triggers react-i18next rerender
        // setCurrentLanguage(newLocale); // update local state so switcher shows correct flag
    };

    /*    // ✅ Listen to language changes and update document direction
        useEffect(() => {
            const currentLangObj = languages.find((l) => l.code === currentLanguage);
            document.documentElement.setAttribute("dir", currentLangObj?.dir || "ltr");
        }, [currentLanguage]);*/

    return (
        <div className={style.headerContainer}>
            <div className={style.actions}>
                {/*<LanguageSwitcher
                    theme={theme}
                    currentLanguage={currentLanguage}
                    onLanguageChange={handleLanguageChange}
                    languages={languages}
                />*/}
                <CgDarkMode size={iconSize} color={"var(--body-text-color)"} onClick={toggleTheme}/>
            </div>

            <div className={style.headerDock}>
                <div className={style.logoContainer}>
                    <div className={style.icon} onClick={() => {
                        // navigate('/login')
                    }}>
                        <div
                            className={style.img}
                            dangerouslySetInnerHTML={{__html: NaslyarLogo}}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
