'use client';

import { forwardRef, useImperativeHandle, useRef } from 'react';
import styles from './Explorer.module.scss';

export interface CodeEditorHandle {
    insert: (text: string) => void;
    focus: () => void;
}

/** Monospace query box: Ctrl/⌘+Enter runs, Tab indents, insert() puts text at the cursor (field chips). */
const CodeEditor = forwardRef<CodeEditorHandle, {
    value: string;
    onChange: (v: string) => void;
    onRun?: () => void;
    rows?: number;
    placeholder?: string;
    className?: string;
    onFocus?: () => void;
    ariaLabel?: string;
    id?: string;
}>(function CodeEditor({ value, onChange, onRun, rows = 3, placeholder, className, onFocus, ariaLabel, id }, ref) {
    const el = useRef<HTMLTextAreaElement>(null);

    useImperativeHandle(ref, () => ({
        insert(text: string) {
            const t = el.current;
            if (!t) return onChange(value + text);
            const start = t.selectionStart ?? value.length;
            const end = t.selectionEnd ?? value.length;
            const next = value.slice(0, start) + text + value.slice(end);
            onChange(next);
            requestAnimationFrame(() => {
                t.focus();
                t.selectionStart = t.selectionEnd = start + text.length;
            });
        },
        focus() {
            el.current?.focus();
        },
    }));

    return (
        <textarea
            ref={el}
            id={id}
            className={`${styles.code} ${className || ''}`}
            value={value}
            rows={rows}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            placeholder={placeholder}
            aria-label={ariaLabel}
            onFocus={onFocus}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    onRun?.();
                } else if (e.key === 'Tab' && !e.shiftKey) {
                    e.preventDefault();
                    const t = e.currentTarget;
                    const s = t.selectionStart;
                    onChange(value.slice(0, s) + '  ' + value.slice(t.selectionEnd));
                    requestAnimationFrame(() => {
                        t.selectionStart = t.selectionEnd = s + 2;
                    });
                }
            }}
        />
    );
});

export default CodeEditor;
