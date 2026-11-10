'use client';

import React from 'react';
import { LuX } from 'react-icons/lu';
import styles from '../AssetManagement.module.scss';

interface AssetModalProps {
    open: boolean;
    onClose: () => void;
    /** عنوان کوتاه مودال */
    title: string;
    /** زیرعنوان اختیاری — مثلاً کد اموال */
    subtitle?: string;
    /** آیکن مینیمال کنار عنوان */
    icon?: React.ReactNode;
    /**
     * اگر id فرم داده شود، فوتر دکمه ثبت نشان می‌دهد که به <form id={formId}> بایند است.
     * فرم‌ها خودشان فیلدها را داخل <form id> رندر می‌کنند.
     */
    formId?: string;
    submitLabel?: string;
    saving?: boolean;
    children: React.ReactNode;
    /** عرض پنل — پیش‌فرض 640px */
    width?: number;
}

/**
 * مودال اختصاصی ماژول مدیریت اموال — header مینیمال (آیکن + عنوان + زیرعنوان + بستن)،
 * body اسکرول‌شونده و فوتر ثابت با دکمه‌های عملیات.
 */
export default function AssetModal({
    open,
    onClose,
    title,
    subtitle,
    icon,
    formId,
    submitLabel = 'ذخیره',
    saving = false,
    children,
    width,
}: AssetModalProps) {
    React.useEffect(() => {
        if (!open) return;
        // بستن با Escape + قفل اسکرول پس‌زمینه
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !saving) onClose();
        };
        document.addEventListener('keydown', onKey);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = prevOverflow;
        };
    }, [open, onClose, saving]);

    if (!open) return null;

    return (
        <div className={styles.modalOverlay} onClick={saving ? undefined : onClose} dir="rtl">
            <div
                className={styles.modalPanel}
                style={width ? { maxWidth: width } : undefined}
                role="dialog"
                aria-modal="true"
                onClick={(e) => e.stopPropagation()}
            >
                <header className={styles.modalHeader}>
                    {icon ? <span className={styles.modalIcon}>{icon}</span> : null}
                    <div className={styles.modalTitleWrap}>
                        <h2 className={styles.modalTitle}>{title}</h2>
                        {subtitle ? <p className={styles.modalSubtitle}>{subtitle}</p> : null}
                    </div>
                    <button type="button" className={styles.modalCloseBtn} onClick={onClose} aria-label="بستن">
                        <LuX size={16} />
                    </button>
                </header>

                <div className={styles.modalBody}>{children}</div>

                {formId ? (
                    <footer className={styles.modalFooter}>
                        <button type="submit" form={formId} className={styles.primaryBtn} disabled={saving}>
                            {saving ? 'در حال ذخیره...' : submitLabel}
                        </button>
                        <button type="button" className={styles.secondaryBtn} onClick={onClose} disabled={saving}>
                            انصراف
                        </button>
                    </footer>
                ) : null}
            </div>
        </div>
    );
}
