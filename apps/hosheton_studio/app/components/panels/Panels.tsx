'use client'

import React, {useEffect, useRef, useState} from "react";
import styles from "./Panels.module.scss";
import {IoMdClose} from "react-icons/io";


export function PanelContainer({children}: any) {
    return (
        <div className={styles.panelContainer}>
            {children}
        </div>
    )
}

export function Header({ ...props}: any) {
    return (
        <div {...props} className={styles.Header} {...props}>
            {props.children}
        </div>
    )
}

export function PanelLeft({toggle, ...props}: any) {
    return (
        <div {...props} className={`${props.className}  ${styles.left} ${props.disabled ? styles.disablePanel : ''}`}>

            <Header  className={styles.sideHeader}>
                <IoMdClose
                    size={24}
                    color={"var(--icon-color)"}
                    className={styles.closeSide}
                    onClick={toggle}
                />
            </Header>

            {props.children}
        </div>
    )
}

export function PanelMiddle({title, disabled, onBack, children, toggleLeftElement, toggleRightElement, ...props}: any) {
    return (
        <div {...props} className={`${styles.middle} ${props.disabled ? styles.disablePanel : ''}`}>
            <Header>
                {toggleLeftElement}
                {title}
                {toggleRightElement}
            </Header>
            {children}
        </div>
    )
}

export function PanelRight({ toggle, ...props}: any) {
    return (
        <div {...props}  className={`${props.className}  ${styles.right}`}>
            <Header className={styles.sideHeader}>
                <IoMdClose
                    size={24}
                    color={"var(--icon-color)"}
                    className={styles.closeSide}
                    onClick={toggle}
                />

            </Header>
            {props.children}
        </div>
    )
}


