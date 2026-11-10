'use client';
import type {HTMLAttributes, ReactNode} from 'react';
import styles from './modalFooter.module.scss'

type ModalFooterProps = HTMLAttributes<HTMLDivElement> & {
    children?: ReactNode;
};

export const ModalFooter = ({children, className, ...props}: ModalFooterProps) => {
    return (
        <div {...props} className={[styles.modalFooter, className].filter(Boolean).join(' ')}>
            {children}
        </div>
    )
}
