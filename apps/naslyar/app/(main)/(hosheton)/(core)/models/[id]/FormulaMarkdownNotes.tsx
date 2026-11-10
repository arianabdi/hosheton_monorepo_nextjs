'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import styles from './FormulaMarkdownNotes.module.scss';

export default function FormulaMarkdownNotes({
    value,
    onChange,
    linkedName,
    onUnlink,
}: {
    value: string;
    onChange: (next: string) => void;
    /** اگر مدل به آموزش مشترک متصل باشد، نام آن — ویرایش محتوا روی همه مدل‌های متصل اعمال می‌شود */
    linkedName?: string;
    onUnlink?: () => void;
}) {
    const [mode, setMode] = useState<'preview' | 'edit'>('preview');
    const text = value || '';
    const isLinked = Boolean(linkedName);

    return (
        <div className={styles.wrap}>
            <div className={styles.header}>
                <div>
                    <h6 className={styles.title}>توضیح فرمول (Markdown)</h6>
                    <p className={styles.hint}>
                        توضیح و فرمول ریاضی با <code>$...$</code> و <code>$$...$$</code>. جدول و لیست هم
                        پشتیبانی می‌شود. پیش‌فرض پیش‌نمایش است.
                    </p>
                </div>
                <div className={styles.tabs}>
                    <button
                        type="button"
                        className={mode === 'preview' ? styles.active : ''}
                        onClick={() => setMode('preview')}
                    >
                        پیش‌نمایش
                    </button>
                    <button
                        type="button"
                        className={mode === 'edit' ? styles.active : ''}
                        onClick={() => setMode('edit')}
                    >
                        ویرایش
                    </button>
                </div>
            </div>

            {isLinked && (
                <div className={styles.linkedBanner}>
                    <span>
                        🔗 آموزش مشترک: <strong>{linkedName}</strong> — ویرایش این محتوا روی همه
                        مدل‌های متصل به همین آموزش اعمال می‌شود.
                    </span>
                    {onUnlink && (
                        <button type="button" onClick={onUnlink} title="جدا کردن از آموزش مشترک">
                            جدا کردن
                        </button>
                    )}
                </div>
            )}

            {mode === 'edit' ? (
                <textarea
                    className={styles.editor}
                    value={text}
                    rows={10}
                    dir="auto"
                    placeholder={'مثال:\nهزینه خروجی برابر است با:\n$$C = \\frac{tokens}{10^6} \\times rate$$'}
                    onChange={(event) => onChange(event.target.value)}
                />
            ) : (
                <div className={styles.preview} dir="auto">
                    {text.trim() ? (
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm, remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                        >
                            {text}
                        </ReactMarkdown>
                    ) : (
                        <p className={styles.empty}>هنوز توضیحی ثبت نشده. روی ویرایش بزنید.</p>
                    )}
                </div>
            )}
        </div>
    );
}
