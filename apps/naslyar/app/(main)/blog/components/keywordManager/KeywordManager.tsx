'use client';

import React, { useState } from 'react';
import styles from '../keywordManager/keywordManager.module.scss';
import { Field } from '@my-workspace/components';
import { MdOutlineInfo } from 'react-icons/md';
import { IoAddOutline } from 'react-icons/io5';

interface KeywordManagerProps {
    keywords: string[];
    setKeywords: (keywords: string[]) => void;
}

export default function KeywordManager({ keywords, setKeywords }: KeywordManagerProps) {
    const [input, setInput] = useState('');

    const addKeyword = () => {
        const trimmed = input.trim();
        if (trimmed && !keywords.includes(trimmed)) {
            setKeywords([...keywords, trimmed]);
            setInput('');
        }
    };

    const removeKeyword = (keyword: string) => {
        setKeywords(keywords.filter((k) => k !== keyword));
    };

    return (
        <>
            <div className={styles.customInput}>
                <div className={styles.keywordManagerContainer}>
                    <Field
                        className="w-100"
                        label="کلمات کلیدی (Keywords)"
                        id="keywords"
                        name="keywords"
                        type="text"
                        value={input}
                        onChange={setInput}
                        onKeyPress={(e: React.KeyboardEvent) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                addKeyword();
                            }
                        }}
                        placeholder="کلمه کلیدی جدید..."
                    />
                    <button className={styles.keywordAddButton} type="button" onClick={addKeyword}>
                        <IoAddOutline size={17} color="#fff" />
                    </button>
                </div>
                <div className="d-flex flex-row" style={{ gap: '10px' }}>
                    <MdOutlineInfo size={20} color="var(--body-text-color)" />
                    <span>
                        کلمات کلیدی که در Meta Description و متن باید موجود باشند.
                    </span>
                </div>
            </div>
            <div className={styles.keywordManager}>
                <p className={styles.keywordsTitle}>کلمات کلیدی وارد شده:</p>
                <div className={styles.keywordItemContainer} style={{ gap: '10px' }}>
                    {keywords.map((keyword, index) => (
                        <div key={index} className={styles.keywordItem}>
                            <span>{keyword}</span>
                            <button
                                type="button"
                                className={styles.keywordItemRemoveButton}
                                onClick={() => removeKeyword(keyword)}
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}
