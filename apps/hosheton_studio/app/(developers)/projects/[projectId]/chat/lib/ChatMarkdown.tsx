'use client';

/**
 * رندر محتوای متنی مدل‌های زبانی (LLM) در چت:
 * Markdown کامل + جدول‌های GFM + بلوک کد به شکل «کارت فایل» (نام، حجم، کپی، دانلود، پیش‌نمایش).
 */

import { memo, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTranslation } from 'react-i18next';
import {
    LuCheck,
    LuChevronDown,
    LuCode,
    LuCopy,
    LuDownload,
    LuEye,
    LuFileCode,
    LuFileJson,
    LuFileSpreadsheet,
    LuFileText,
} from 'react-icons/lu';
import styles from './ChatMarkdown.module.scss';

function extractText(node: ReactNode): string {
    if (node == null || typeof node === 'boolean') return '';
    if (typeof node === 'string' || typeof node === 'number') return String(node);
    if (Array.isArray(node)) return node.map(extractText).join('');
    const element = node as { props?: { children?: ReactNode } };
    return element.props?.children ? extractText(element.props.children) : '';
}

function studioThemeSnapshot(): 'dark' | 'light' {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

function subscribeStudioTheme(onChange: () => void) {
    const observer = new MutationObserver(onChange);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
}

function useStudioTheme(): 'dark' | 'light' {
    return useSyncExternalStore(subscribeStudioTheme, studioThemeSnapshot, () => 'light');
}

/** زبان بلوک کد → پسوند فایل دانلودی */
const LANGUAGE_EXT: Record<string, string> = {
    text: 'txt', txt: 'txt', plaintext: 'txt', markdown: 'md', md: 'md',
    csv: 'csv', tsv: 'tsv', json: 'json', jsonl: 'jsonl', xml: 'xml', yaml: 'yaml', yml: 'yml', toml: 'toml', ini: 'ini',
    html: 'html', css: 'css', scss: 'scss', javascript: 'js', js: 'js', jsx: 'jsx', typescript: 'ts', ts: 'ts', tsx: 'tsx',
    python: 'py', py: 'py', java: 'java', c: 'c', cpp: 'cpp', 'c++': 'cpp', csharp: 'cs', cs: 'cs', php: 'php', go: 'go',
    rust: 'rs', ruby: 'rb', kotlin: 'kt', swift: 'swift', sql: 'sql', bash: 'sh', sh: 'sh', shell: 'sh', zsh: 'sh',
    powershell: 'ps1', ps1: 'ps1', batch: 'bat', bat: 'bat', dockerfile: 'Dockerfile', srt: 'srt', vtt: 'vtt', ass: 'ass',
    env: 'env', conf: 'conf', svg: 'svg', ics: 'ics', vcf: 'vcf', rtf: 'rtf',
};

const EXT_LANGUAGE: Record<string, string> = {
    js: 'javascript', ts: 'typescript', py: 'python', rb: 'ruby', rs: 'rust', kt: 'kotlin', cs: 'csharp', sh: 'bash',
    ps1: 'powershell', bat: 'batch', yml: 'yaml', md: 'markdown', txt: 'text',
};

const EXT_MIME: Record<string, string> = {
    csv: 'text/csv', tsv: 'text/tab-separated-values', json: 'application/json', html: 'text/html', xml: 'application/xml',
    md: 'text/markdown', svg: 'image/svg+xml', ics: 'text/calendar', vcf: 'text/vcard', rtf: 'application/rtf',
};

const FILE_NAME = /^[\w؀-ۿ][\w؀-ۿ .()-]{0,80}\.[a-z0-9]{1,10}$/i;

/** نام فایل از اطلاعات بلوک: ```report.csv یا ```csv title="report.csv" یا خط اول «// file: x» */
function resolveFile(rawLanguage: string, meta: string, code: string) {
    let language = rawLanguage || 'text';
    let name = '';
    if (FILE_NAME.test(language)) {
        name = language;
        const ext = language.split('.').pop()!.toLowerCase();
        language = EXT_LANGUAGE[ext] || ext;
    }
    if (!name && meta) {
        const match = /(?:title|file(?:name)?|name)\s*=\s*["']?([^"'\s]+)["']?/i.exec(meta)
            || /^([^\s=]+\.[a-z0-9]{1,10})$/i.exec(meta.trim());
        if (match && FILE_NAME.test(match[1])) name = match[1];
    }
    if (!name) {
        const firstLine = code.split('\n', 1)[0] || '';
        const match = /^\s*(?:\/\/|#|--|<!--|\/\*|;)\s*(?:file(?:name)?|فایل)\s*:\s*([^\s*>-]+)/i.exec(firstLine);
        if (match && FILE_NAME.test(match[1])) name = match[1];
    }
    const lower = language.toLowerCase();
    const ext = name ? name.split('.').pop()!.toLowerCase() : (LANGUAGE_EXT[lower] || 'txt');
    return { language: lower, name: name || `file.${ext}`, named: Boolean(name), ext };
}

function fileIcon(ext: string) {
    if (['csv', 'tsv', 'xlsx', 'ods'].includes(ext)) return <LuFileSpreadsheet size={16} />;
    if (['json', 'jsonl'].includes(ext)) return <LuFileJson size={16} />;
    if (['txt', 'md', 'srt', 'vtt', 'ass', 'rtf'].includes(ext)) return <LuFileText size={16} />;
    return <LuFileCode size={16} />;
}

function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** CSV/TSV ساده (با پشتیبانی از "..." و ویرگول داخل کوتیشن) — فقط برای پیش‌نمایش */
function parseDelimited(text: string, delimiter: string, maxRows: number): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let cell = '';
    let quoted = false;
    for (let i = 0; i < text.length && rows.length < maxRows; i++) {
        const char = text[i];
        if (quoted) {
            if (char === '"' && text[i + 1] === '"') { cell += '"'; i++; }
            else if (char === '"') quoted = false;
            else cell += char;
            continue;
        }
        if (char === '"') quoted = true;
        else if (char === delimiter) { row.push(cell); cell = ''; }
        else if (char === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; }
        else cell += char;
    }
    if ((cell || row.length) && rows.length < maxRows) { row.push(cell); rows.push(row); }
    return rows.filter((item) => item.some((value) => value.trim()));
}

const COLLAPSED_LINES = 18;
const PREVIEW_ROWS = 60;

function CodeBlock({ className, meta, children }: { className?: string; meta?: string; children?: ReactNode }) {
    const { t } = useTranslation('projects');
    const [copied, setCopied] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const theme = useStudioTheme();
    const raw = String(extractText(children)).replace(/\n$/, '');
    const rawLanguage = /language-(\S+)/.exec(String(className || ''))?.[1] || '';
    const file = useMemo(() => resolveFile(rawLanguage, meta || '', raw), [rawLanguage, meta, raw]);
    const lines = raw ? raw.split('\n').length : 0;
    const bytes = useMemo(() => new Blob([raw]).size, [raw]);
    const previewable = file.ext === 'csv' || file.ext === 'tsv' || file.ext === 'html';
    const [view, setView] = useState<'code' | 'preview'>(file.ext === 'csv' || file.ext === 'tsv' ? 'preview' : 'code');
    const collapsible = lines > COLLAPSED_LINES + 4;
    const shownCode = collapsible && !expanded ? raw.split('\n').slice(0, COLLAPSED_LINES).join('\n') : raw;
    const table = useMemo(
        () => (view === 'preview' && (file.ext === 'csv' || file.ext === 'tsv')
            ? parseDelimited(raw, file.ext === 'tsv' ? '\t' : ',', PREVIEW_ROWS + 1)
            : []),
        [view, file.ext, raw],
    );

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(raw);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
        } catch {
            /* clipboard unavailable */
        }
    };

    const download = () => {
        const blob = new Blob([raw], { type: `${EXT_MIME[file.ext] || 'text/plain'};charset=utf-8` });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    const syntaxLanguage = EXT_LANGUAGE[file.language] || file.language;

    return (
        <div className={styles.codeBlock}>
            <div className={styles.codeBar}>
                <span className={styles.fileIcon} aria-hidden>{fileIcon(file.ext)}</span>
                <span className={styles.fileMeta}>
                    <span className={styles.fileName} title={file.name}>{file.named ? file.name : file.language}</span>
                    <span className={styles.fileInfo}>
                        {t('chat_file_lines', { count: lines, defaultValue: '{{count}} خط' })} · {formatBytes(bytes)}
                    </span>
                </span>
                <span className={styles.codeActions}>
                    {previewable ? (
                        <button
                            type="button"
                            className={styles.codeBtn}
                            onClick={() => setView((value) => (value === 'code' ? 'preview' : 'code'))}
                            title={view === 'code' ? t('chat_file_preview', { defaultValue: 'پیش‌نمایش' }) : t('chat_file_code', { defaultValue: 'کد' })}
                            aria-label={view === 'code' ? t('chat_file_preview', { defaultValue: 'پیش‌نمایش' }) : t('chat_file_code', { defaultValue: 'کد' })}
                        >
                            {view === 'code' ? <LuEye size={13} /> : <LuCode size={13} />}
                        </button>
                    ) : null}
                    <button
                        type="button"
                        className={styles.codeBtn}
                        onClick={copy}
                        title={copied ? t('chat_copied') : t('chat_copy')}
                        aria-label={copied ? t('chat_copied') : t('chat_copy')}
                    >
                        {copied ? <LuCheck size={13} /> : <LuCopy size={13} />}
                    </button>
                    <button
                        type="button"
                        className={`${styles.codeBtn} ${styles.codeBtnLabel}`}
                        onClick={download}
                        title={t('chat_file_download', { defaultValue: 'دانلود فایل' })}
                        aria-label={t('chat_file_download', { defaultValue: 'دانلود فایل' })}
                    >
                        <LuDownload size={13} />
                        <span>.{file.ext}</span>
                    </button>
                </span>
            </div>
            {view === 'preview' && file.ext === 'html' ? (
                // بدون allow-scripts: فقط ظاهر صفحه، هیچ کدی اجرا نمی‌شود
                <iframe className={styles.htmlPreview} sandbox="" srcDoc={raw} title={file.name} />
            ) : view === 'preview' && table.length ? (
                <div className={styles.tablePreview}>
                    <table>
                        <thead>
                            <tr>{table[0].map((cell, index) => <th key={index}>{cell}</th>)}</tr>
                        </thead>
                        <tbody>
                            {table.slice(1, PREVIEW_ROWS + 1).map((row, rowIndex) => (
                                <tr key={rowIndex}>
                                    {table[0].map((_, cellIndex) => <td key={cellIndex}>{row[cellIndex] ?? ''}</td>)}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {lines - 1 > PREVIEW_ROWS ? (
                        <p className={styles.previewNote}>
                            {t('chat_file_preview_rows', { shown: PREVIEW_ROWS, total: lines - 1, defaultValue: '{{shown}} ردیف از {{total}} — فایل کامل را دانلود کنید' })}
                        </p>
                    ) : null}
                </div>
            ) : (
                <div className={`${styles.codeBody} ${collapsible && !expanded ? styles.codeBodyCollapsed : ''}`}>
                    <SyntaxHighlighter
                        language={syntaxLanguage}
                        style={theme === 'dark' ? oneDark : oneLight}
                        PreTag="div"
                        customStyle={{
                            margin: 0,
                            background: 'transparent',
                            padding: '12px 14px',
                            fontSize: '12.5px',
                            color: 'inherit',
                        }}
                        codeTagProps={{ style: { fontFamily: 'var(--font-fira, ui-monospace, monospace)', background: 'transparent' } }}
                        wrapLongLines={false}
                    >
                        {shownCode}
                    </SyntaxHighlighter>
                </div>
            )}
            {collapsible && view === 'code' ? (
                <button type="button" className={styles.expandBtn} onClick={() => setExpanded((value) => !value)}>
                    <LuChevronDown size={14} className={expanded ? styles.expandIconOpen : ''} aria-hidden />
                    {expanded
                        ? t('chat_file_collapse', { defaultValue: 'بستن' })
                        : t('chat_file_expand', { count: lines, defaultValue: 'نمایش همه‌ی {{count}} خط' })}
                </button>
            ) : null}
        </div>
    );
}

function ChatMarkdownImpl({ content }: { content: string }) {
    return (
        <div className={styles.markdown}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    // inline code keeps its inline look; fenced blocks become file cards
                    code({ className, children, node, ...props }) {
                        const isBlock = /language-/.test(String(className || ''))
                            || extractText(children).includes('\n');
                        const meta = (node?.data as { meta?: string } | undefined)?.meta;
                        if (isBlock) return <CodeBlock className={className} meta={meta}>{children}</CodeBlock>;
                        return <code className={styles.inlineCode} {...props}>{children}</code>;
                    },
                    pre({ children }) {
                        // <pre> is replaced by the CodeBlock wrapper above
                        return <>{children}</>;
                    },
                    a({ href, children }) {
                        return (
                            <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
                        );
                    },
                    table({ children }) {
                        return (
                            <div className={styles.tableScroll}>
                                <table>{children}</table>
                            </div>
                        );
                    },
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}

export const ChatMarkdown = memo(ChatMarkdownImpl);
export default ChatMarkdown;
