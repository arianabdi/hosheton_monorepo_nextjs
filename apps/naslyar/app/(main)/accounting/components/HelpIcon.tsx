'use client';

import React from 'react';
import HelpModal from './HelpModal';
import type { AccountingGuideKey } from './guides';
import styles from './Help.module.scss';

interface HelpIconProps {
    /** کلید راهنمای این بخش در رجیستری ACCOUNTING_GUIDES */
    topic: AccountingGuideKey;
    /** متن tooltip اختیاری */
    title?: string;
    /** نسخه کوچک برای استفاده داخل لیبل/سرستون */
    inline?: boolean;
}

/**
 * آیکون «؟» راهنما — با کلیک، مودال راهنمای فارسی همان بخش باز می‌شود.
 */
export default function HelpIcon({ topic, title, inline = false }: HelpIconProps) {
    const [open, setOpen] = React.useState(false);

    return (
        <>
            <button
                type="button"
                className={`${styles.helpBtn} ${inline ? styles.helpBtnInline : ''}`}
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setOpen(true);
                }}
                aria-label="راهنمای این بخش"
                title={title || 'راهنمای این بخش'}
            >
                ؟
            </button>
            <HelpModal open={open} onClose={() => setOpen(false)} topic={topic} />
        </>
    );
}
