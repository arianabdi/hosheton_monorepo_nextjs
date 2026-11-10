'use client'

import styles from './comming-soon.module.scss'
import {useEffect} from "react";
import {toFarsiNumber} from "@my-workspace/utils";

export function CommingSoon({title, description, launchDate}: any) {


    useEffect(()=>{
        if(launchDate)
            updateCountdown(launchDate)
    },[launchDate])


    return (
        <div className={styles.container}>
            <div className={styles.backgroundOverlay}></div>

            <div className={styles.content}>
                {/* Logo or Brand Name */}
                <div className={styles.logo}>
                    <span className={styles.logoText}>{title}</span>
                </div>

                {/* Main Title */}
                <h1 className={styles.title}>
                    به زودی...
                </h1>

                {/* Description */}
                <p className={styles.description}>
                    {description}
                </p>

                {/* Countdown Timer */}
                <div className={styles.countdown}>
                    <div className={styles.timeUnit}>
                        <span className={styles.timeNumber} id="days">00</span>
                        <span className={styles.timeLabel}>روز</span>
                    </div>
                    <div className={styles.timeUnit}>
                        <span className={styles.timeNumber} id="hours">00</span>
                        <span className={styles.timeLabel}>ساعت</span>
                    </div>
                    <div className={styles.timeUnit}>
                        <span className={styles.timeNumber} id="minutes">00</span>
                        <span className={styles.timeLabel}>دقیقه</span>
                    </div>
                    <div className={styles.timeUnit}>
                        <span className={styles.timeNumber} id="seconds">00</span>
                        <span className={styles.timeLabel}>ثانیه</span>
                    </div>
                </div>


                {/* Social Links */}
                {/*<div className={styles.socialLinks}>
                    <a href="#" className={styles.socialLink} aria-label="اینستاگرام">
                        📷
                    </a>
                    <a href="#" className={styles.socialLink} aria-label="تلگرام">
                        ✈️
                    </a>
                    <a href="#" className={styles.socialLink} aria-label="توییتر">
                        🐦
                    </a>
                    <a href="#" className={styles.socialLink} aria-label="لینکدین">
                        🔗
                    </a>
                </div>*/}

                {/* Contact Info */}
                <div className={styles.contactInfo}>
                    <p className={styles.contactText}>
                        سوالی دارید؟ برای ما ایمیل بفرستید:
                    </p>
                    <a href="mailto:info@lingeecko.com" className={styles.contactEmail}>
                        info@lingeecko.com
                    </a>
                </div>
            </div>
        </div>
    )
}



const updateCountdown = (launchDate: any) => {
    const now = new Date().getTime()
    const distance = launchDate - now

    const days = Math.floor(distance / (1000 * 60 * 60 * 24))
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((distance % (1000 * 60)) / 1000)

    const daysElement = document.getElementById('days')
    const hoursElement = document.getElementById('hours')
    const minutesElement = document.getElementById('minutes')
    const secondsElement = document.getElementById('seconds')

    if (daysElement) daysElement.textContent = toFarsiNumber(days.toString().padStart(2, '0'))
    if (hoursElement) hoursElement.textContent = toFarsiNumber(hours.toString().padStart(2, '0'))
    if (minutesElement) minutesElement.textContent = toFarsiNumber(minutes.toString().padStart(2, '0'))
    if (secondsElement) secondsElement.textContent = toFarsiNumber(seconds.toString().padStart(2, '0'))

    if (distance < 0) {

        if (daysElement) daysElement.textContent = '00'
        if (hoursElement) hoursElement.textContent = '00'
        if (minutesElement) minutesElement.textContent = '00'
        if (secondsElement) secondsElement.textContent = '00'
    }
}

