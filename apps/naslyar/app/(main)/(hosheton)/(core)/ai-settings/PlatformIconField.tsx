'use client';

import React from 'react';
import styles from './PlatformIcons.module.scss';
import { sanitizeSvg, SvgMarkup } from '../ai-modes/modeIcons';
import { PlatformIconItem } from './usePlatformIcons';

interface PlatformIconFieldProps {
    iconSvg: string;
    /** شناسه آیکون عمومی؛ وقتی پر است فیلد قفل است و فقط پیش‌نمایش نشان داده می‌شود */
    platformIconId?: string;
    /** کتابخانه آیکون‌ها برای نمایش نام آیکون متصل */
    icons: PlatformIconItem[];
    onPick: () => void;
    onChange: (iconSvg: string) => void;
    /** × روی آیکون متصل: SVG و اتصال پاک می‌شوند تا SVG دستی وارد شود */
    onClear: () => void;
    rows?: number;
}

/**
 * فیلد آیکون SVG در تنظیمات مدل (آیکون مدل و گزینه‌های select).
 * انتخاب از آیکون‌های عمومی → فقط پیش‌نمایش (بدون input) تا کسی SVG را ناقص نکند و ویرایش کتابخانه
 * به همین‌جا برسد؛ با × دوباره textarea برای paste دستی برمی‌گردد.
 */
export default function PlatformIconField({
    iconSvg,
    platformIconId,
    icons,
    onPick,
    onChange,
    onClear,
    rows = 3,
}: PlatformIconFieldProps) {
    if (platformIconId) {
        const icon = icons.find((item) => item._id === platformIconId);
        return (
            <div className={styles.linkedIcon}>
                <div className={styles.iconThumb}>
                    <SvgMarkup svg={iconSvg || icon?.iconSvg} />
                </div>
                <div className={styles.linkedMeta}>
                    <span className={styles.iconName}>{icon?.name || 'آیکون عمومی'}</span>
                    <span className={styles.hint}>از آیکون‌های عمومی — با ویرایش آن‌جا، این‌جا هم عوض می‌شود</span>
                </div>
                <div className={styles.rowActions}>
                    <button type="button" className={styles.btn} onClick={onPick}>
                        تغییر
                    </button>
                    <button
                        type="button"
                        className={`${styles.btn} ${styles.dangerBtn}`}
                        onClick={onClear}
                        title="حذف آیکون و وارد کردن SVG دستی"
                        aria-label="حذف آیکون و وارد کردن SVG دستی"
                    >
                        ×
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.manualIcon}>
            <div>
                <button type="button" className={styles.btn} onClick={onPick}>
                    انتخاب از آیکون‌های عمومی
                </button>
            </div>
            <div className={styles.addRow}>
                <textarea
                    className={styles.svgInput}
                    rows={rows}
                    dir="ltr"
                    placeholder="<svg>...</svg>"
                    value={iconSvg}
                    onChange={(e) => onChange(e.target.value)}
                    aria-label="SVG آیکون"
                />
                <div className={styles.previewBox}>
                    {sanitizeSvg(iconSvg) ? <SvgMarkup svg={iconSvg} /> : <span className={styles.hint}>پیش‌نمایش</span>}
                </div>
            </div>
        </div>
    );
}
