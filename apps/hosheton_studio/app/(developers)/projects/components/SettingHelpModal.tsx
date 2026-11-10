'use client';

import { useState, type MouseEvent } from 'react';
import { LuCircleAlert } from 'react-icons/lu';
import { ModalHelper } from '@my-workspace/components';
import styles from './SettingHelpModal.module.scss';

export interface SettingHelpInfo {
    /** عنوان تنظیم — فقط برای aria-label و عنوان BottomSheet موبایل */
    label: string;
    /** متن آموزشی که ادمین در تنظیمات مدل نوشته (helpFa) — تنها محتوای پنجره‌ی راهنما */
    helpFa?: string;
    /**
     * متن راهنمای کوتاه قدیمی (hintFa). پنل ادمین حالا hint و help را در یک helpFa ادغام می‌کند؛
     * برای مدل‌هایی که هنوز دوباره ذخیره نشده‌اند، وقتی helpFa خالی است همین در پنجره نمایش داده می‌شود.
     */
    hintFa?: string;
}

/**
 * مودال به body پورتال می‌شود ولی رویدادهایش در درخت React به همین‌جا می‌رسند؛ متوقف کردنشان
 * نمی‌گذارد listenerهای «کلیک بیرون» پاپ‌اور تنظیمات (روی document) با کلیک داخل راهنما آن را ببندند.
 */
function stopOutsideClick(event: MouseEvent) {
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
}

/**
 * آیکون کوچک علامت تعجب کنار عنوان تنظیم + پنجره‌ی راهنما (ModalHelper) که فقط متن آموزشی را نشان می‌دهد.
 * اگر ادمین متن آموزشی ننوشته باشد، آیکون اصلاً نمایش داده نمی‌شود.
 * preventDefault داخل <label> هم امن است (مثلاً چک‌باکس را تیک نمی‌زند).
 */
export default function SettingHelp({
    info,
    className,
}: {
    info: SettingHelpInfo;
    className?: string;
}) {
    const [open, setOpen] = useState(false);
    const description = (info.helpFa || '').trim() || (info.hintFa || '').trim();
    if (!description) return null;

    return (
        <>
            <button
                type="button"
                className={`${styles.helpButton} ${className || ''}`}
                aria-label={`راهنمای ${info.label}`}
                title="توضیح این تنظیم"
                onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setOpen(true);
                }}
            >
                <LuCircleAlert size={13} aria-hidden />
            </button>
            <span className={styles.modalEventScope} onMouseDown={stopOutsideClick} onClick={(event) => event.stopPropagation()}>
                <ModalHelper
                    open={open}
                    onClose={() => setOpen(false)}
                    size="md"
                    sheetTitle={info.label}
                    component={open ? <p className={styles.description} dir="auto">{description}</p> : null}
                />
            </span>
        </>
    );
}
