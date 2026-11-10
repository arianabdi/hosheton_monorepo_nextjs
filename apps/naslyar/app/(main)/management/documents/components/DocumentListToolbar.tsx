'use client';

import React, { useRef } from 'react';
import parentStyles from '../../../marketing/Marketing.module.scss';
import styles from '../Documents.module.scss';

type Props = {
    search: string;
    onSearchChange: (value: string) => void;
    uploadProgress?: string;
    onUpload: (file: File) => void;
};

export default function DocumentListToolbar({ search, onSearchChange, uploadProgress, onUpload }: Props) {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) onUpload(file);
        event.target.value = '';
    };

    return (
        <div className={styles.listToolbar}>
            <div className={styles.listToolbarStart}>
                <input
                    className={styles.searchInput}
                    type="search"
                    placeholder="جستجو در اسناد..."
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                />
            </div>
            <div className={styles.listToolbarEnd}>
                {uploadProgress ? <span className={styles.uploadProgress}>{uploadProgress}</span> : null}
                <input ref={inputRef} type="file" hidden onChange={handleFileChange} />
                <button type="button" className={parentStyles.primaryBtn} onClick={() => inputRef.current?.click()}>
                    + آپلود سند
                </button>
            </div>
        </div>
    );
}
