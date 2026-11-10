'use client';

import React from 'react';
import styles from './PlatformIcons.module.scss';
import { SvgMarkup } from '../ai-modes/modeIcons';
import { PlatformIconItem, usePlatformIcons } from './usePlatformIcons';

interface PlatformIconPickerModalProps {
    token: string;
    baseUrl: string;
    onClose: () => void;
    /** آیکون انتخاب‌شده — مقصد SVG و شناسه آن را نگه می‌دارد تا با ویرایش کتابخانه به‌روز شود */
    onSelect: (icon: PlatformIconItem) => void;
}

/** انتخاب یک آیکون از کتابخانه عمومی پلتفرم */
export default function PlatformIconPickerModal({ token, baseUrl, onClose, onSelect }: PlatformIconPickerModalProps) {
    const { items, loading } = usePlatformIcons(token, baseUrl);

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div
                className={styles.modal}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="انتخاب آیکون از کتابخانه عمومی"
            >
                <header className={styles.modalHeader}>
                    <h3>انتخاب از آیکون‌های عمومی</h3>
                    <button type="button" className={styles.closeBtn} onClick={onClose}>×</button>
                </header>

                {loading ? (
                    <p className={styles.stateText}>در حال بارگذاری...</p>
                ) : items.length === 0 ? (
                    <p className={styles.stateText}>
                        هنوز آیکونی در کتابخانه عمومی نیست. از تب «آیکون‌های عمومی» اضافه کنید.
                    </p>
                ) : (
                    <div className={styles.grid}>
                        {items.map((item) => (
                            <button
                                key={item._id}
                                type="button"
                                className={styles.gridItem}
                                title={item.name || 'انتخاب این آیکون'}
                                onClick={() => onSelect(item)}
                            >
                                <SvgMarkup svg={item.iconSvg} />
                                {item.name ? <span className={styles.gridItemName}>{item.name}</span> : null}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
