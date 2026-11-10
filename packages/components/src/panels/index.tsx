'use client'


import styles from './panels.module.scss'
import {IoMdArrowForward} from "react-icons/io";
import React from "react";


export function PanelContainer({children}: any) {
    return (
        <div className={styles.panelContainer}>
            {children}
        </div>
    )
}

export function PanelLeft({disabled, width, showLeft, children, toggleLeft, ...props}: any) {

    return(
        <div>
            <div className={`${styles.blackBackground} ${showLeft ? styles.blackBackgroundHidden : ""}`} onClick={toggleLeft}></div>
            <div {...props} style={!width ? {...props.style} : {width: width || 'inherit', ...props.style}}
                 className={`
                   ${!showLeft ? styles.hidden : ""}
                   ${styles.left} ${disabled ? styles.disablePanel : ''}`}
            >

                {children}
            </div>
        </div>
    )
}

export function Header({onBack, children, ...props}: any) {
    return (
        <div className={styles.Header} {...props}>
            <IoMdArrowForward className={`${styles.backBtn}`} color={'var(--icon-color)'} size={24} onClick={onBack}/>
            {children}
        </div>
    )
}

export function PanelMiddle({title, disabled, onBack, children}: any) {
    return (
        <div className={`${styles.middle} ${disabled ? styles.disablePanel : ''}`}>
            {
                !title ? '' : <Header onBack={onBack}>{title}</Header>
            }

            {children}
        </div>
    )
}

export function PanelRight({title, disabled, width, children, toggleTitle}: any) {
    return (
        <div style={!width ? {} : {width: width || 'inherit'}} className={styles.right}>
            <Header onBack={toggleTitle}>{title}</Header>
            {children}
        </div>
    )
}

export function Row({children, ...props}: any) {
    return (
        <div {...props} className={styles.row}>
            {children}
        </div>
    )
}

export function Column({gap, children, ...props}: any) {
    return (
        <div {...props} style={{gap: gap || '0px'}} className={styles.column}>
            {children}
        </div>
    )
}



