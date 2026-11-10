'use client';

import { useState, type ReactNode } from 'react';
import { ModalBody, ModalFooter, ModalHeader, ModalHelper } from '@my-workspace/components';
import styles from './ConfirmDialog.module.scss';

interface ConfirmDialogProps {
    open: boolean;
    title: string;
    children: ReactNode;
    confirmLabel: string;
    /** حذف/رد = قرمز؛ تأیید/پرداخت = رنگ برند */
    tone?: 'danger' | 'primary';
    busy?: boolean;
    /** اگر داده شود، فیلد «دلیل» الزامی نمایش داده و به onConfirm پاس می‌شود */
    reasonLabel?: string;
    onConfirm: (reason: string) => void;
    onClose: () => void;
}

function DialogContent({ title, children, confirmLabel, tone = 'primary', busy, reasonLabel, onConfirm, onClose }: Omit<ConfirmDialogProps, 'open'>) {
    const [reason, setReason] = useState('');
    const needsReason = !!reasonLabel;
    return (
        <div dir="rtl">
            <ModalHeader className={styles.header}>{title}</ModalHeader>
            <ModalBody className={styles.body}>
                <div>{children}</div>
                {needsReason && (
                    <label className={styles.reason}>
                        <span>{reasonLabel}</span>
                        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} autoFocus />
                    </label>
                )}
            </ModalBody>
            <ModalFooter>
                <button
                    type="button"
                    className={tone === 'danger' ? styles.danger : styles.primary}
                    onClick={() => onConfirm(reason.trim())}
                    disabled={busy || (needsReason && !reason.trim())}
                >
                    {busy ? 'در حال انجام…' : confirmLabel}
                </button>
                <button type="button" className={styles.secondary} onClick={onClose} disabled={busy}>
                    انصراف
                </button>
            </ModalFooter>
        </div>
    );
}

/** تایید عملیات حساس (حذف، رد، پرداخت…) با ModalHelper مشترک — جایگزین window.confirm/prompt */
export default function ConfirmDialog({ open, onClose, title, ...rest }: ConfirmDialogProps) {
    return (
        <ModalHelper
            open={open}
            onClose={onClose}
            size="sm"
            sheetTitle={title}
            closeOnOverlayClick={!rest.busy}
            component={open ? <DialogContent title={title} onClose={onClose} {...rest} /> : null}
        />
    );
}
