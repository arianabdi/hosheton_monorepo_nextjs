
'use client'

import React from "react";
import styles from "./messageVersionChanger.module.scss";
import {MdKeyboardArrowLeft, MdKeyboardArrowRight} from "react-icons/md";



export const MessageVersionSwitcher= ({
     current,
     total,
     onPrevious,
     onNext,
     className = "",
 }: any) => {
    const isFirst = current <= 1;
    const isLast = current >= total;

    const size=22;
    const color='var(--body-text-color)'
    return (
        <div className={`${styles.wrapper} ${className}`}>
            <button
                type="button"
                className={styles.arrowButton}
                onClick={onPrevious}
                disabled={isFirst}
                aria-label="Previous version"
            >
                <MdKeyboardArrowRight size={size} color={color}/>
            </button>

            <span className={styles.counter}>
        {current}/{total}
      </span>

            <button
                type="button"
                className={styles.arrowButton}
                onClick={onNext}
                disabled={isLast}
                aria-label="Next version"
            >

                <MdKeyboardArrowLeft size={size} color={color}/>
            </button>
        </div>
    );
};

export default MessageVersionSwitcher;