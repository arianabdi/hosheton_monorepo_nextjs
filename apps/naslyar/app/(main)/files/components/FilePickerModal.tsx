'use client';

import { useState } from 'react';
import { LuX } from 'react-icons/lu';
import FileManager from './FileManager';
import type { FileManagerFile, FilePickerAccept } from '../files.types';
import styles from '../Files.module.scss';

export interface FilePickerModalProps {
    open: boolean;
    onClose: () => void;
    /** با تایید انتخاب فراخوانی می‌شود */
    onSelect: (files: FileManagerFile[]) => void;
    multiple?: boolean;
    /** محدودسازی به یک دسته (مثلا فقط تصاویر برای بنر) */
    accept?: FilePickerAccept;
    title?: string;
    confirmLabel?: string;
}

/**
 * مودال انتخاب فایل — برای استفاده در ماژول‌های دیگر (مارکتینگ، بنرها و ...)
 *
 * مثال:
 * <FilePickerModal
 *     open={showPicker}
 *     onClose={() => setShowPicker(false)}
 *     onSelect={(files) => setForm({ ...form, imageUrl: files[0]?.path || '' })}
 *     accept="images"
 * />
 */
export default function FilePickerModal({
    open,
    onClose,
    onSelect,
    multiple = false,
    accept = 'all',
    title = 'انتخاب فایل',
    confirmLabel = 'تایید انتخاب',
}: FilePickerModalProps) {
    const [selected, setSelected] = useState<FileManagerFile[]>([]);

    if (!open) return null;

    const handleConfirm = () => {
        if (selected.length === 0) return;
        onSelect(selected);
        setSelected([]);
        onClose();
    };

    return (
        <div
            className={`${styles.modalOverlay} ${styles.rtl}`}
            onClick={() => {
                setSelected([]);
                onClose();
            }}
        >
            <div className={styles.pickerModal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.pickerHeader}>
                    <h2>
                        {title}
                        {multiple ? ' (چندان)' : ''}
                    </h2>
                    <button
                        type="button"
                        className={styles.iconBtn}
                        onClick={() => {
                            setSelected([]);
                            onClose();
                        }}
                        aria-label="بستن"
                    >
                        <LuX />
                    </button>
                </div>
                <div className={styles.pickerBody}>
                    <FileManager
                        pickerMode
                        multiple={multiple}
                        accept={accept}
                        selectedIds={selected.map((f) => f._id)}
                        onSelectionChange={setSelected}
                        height="58vh"
                    />
                </div>
                <div className={styles.pickerFooter} style={{ padding: '0 1.25rem 1.25rem', marginTop: 0 }}>
                    <span className={styles.pickerHint}>
                        {selected.length > 0 ? `${selected.length} فایل انتخاب شده` : 'هنوز فایلی انتخاب نشده'}
                    </span>
                    <div className={styles.pickerActions}>
                        <button
                            type="button"
                            className={styles.primaryBtn}
                            disabled={selected.length === 0}
                            onClick={handleConfirm}
                        >
                            {confirmLabel}
                        </button>
                        <button
                            type="button"
                            className={styles.secondaryBtn}
                            onClick={() => {
                                setSelected([]);
                                onClose();
                            }}
                        >
                            انصراف
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
