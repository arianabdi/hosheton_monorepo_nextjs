'use client';
import type {HTMLAttributes, ReactNode} from 'react';
import styles from './modalBody.module.scss'

type ModalBodyProps = HTMLAttributes<HTMLDivElement> & {
    children?: ReactNode;
};

export const ModalBody = ({children, className, ...props}: ModalBodyProps) => {
    return (
        <div
            {...props}
            className={[styles.modalBody, className].filter(Boolean).join(' ')}
        >
            {children}
        </div>
    )
}
