'use client';
import type {HTMLAttributes, ReactNode} from 'react';
import styles from './modalHeader.module.scss'

type ModalHeaderProps = HTMLAttributes<HTMLDivElement> & {
    children?: ReactNode;
};

export const ModalHeader = ({children, className, ...props}: ModalHeaderProps) => {
    return (
        <div {...props} className={[styles.modalHeader, className].filter(Boolean).join(' ')}>
            {children}
        </div>
    )
}
