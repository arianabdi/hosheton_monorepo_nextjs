'use client';

import { useTranslation } from 'react-i18next';
import { LuFileCode, LuFileJson, LuFileSpreadsheet, LuFileText, LuLoader, LuX } from 'react-icons/lu';
import { formatFileSize } from '@/app/(developers)/projects/lib/media-file-size';
import styles from './ChatFileChip.module.scss';

export function chatFileExtension(name?: string) {
    const clean = String(name || '').split(/[?#]/)[0];
    const dot = clean.lastIndexOf('.');
    return dot >= 0 ? clean.slice(dot + 1).toLowerCase() : '';
}

function FileIcon({ ext }: { ext: string }) {
    if (['csv', 'tsv', 'xlsx', 'xls', 'ods'].includes(ext)) return <LuFileSpreadsheet size={18} />;
    if (['json', 'jsonl', 'xml', 'yaml', 'yml'].includes(ext)) return <LuFileJson size={18} />;
    if (['pdf', 'docx', 'txt', 'md', 'rtf', 'odt', 'pptx', 'odp', 'epub', 'srt', 'vtt', 'ass'].includes(ext)) return <LuFileText size={18} />;
    return <LuFileCode size={18} />;
}

/**
 * پیوست سند/کد/جدول چت متنی: آیکون نوع، نام، پسوند و حجم — در کادر چت (با حذف و پیشرفت آپلود)
 * و در پیام ارسال‌شده (با باز کردن فایل).
 */
export function ChatFileChip({
    name,
    url,
    sizeBytes,
    progress,
    failed = false,
    invalidMessage,
    onRemove,
    onRetry,
}: {
    name: string;
    url?: string;
    sizeBytes?: number;
    /** در حال آپلود (۰ تا ۱۰۰) */
    progress?: number;
    failed?: boolean;
    /** این مدل این فایل را نمی‌پذیرد */
    invalidMessage?: string;
    onRemove?: () => void;
    onRetry?: () => void;
}) {
    const { t } = useTranslation('projects');
    const { t: tc } = useTranslation('common');
    const ext = chatFileExtension(name);
    const uploading = progress != null && !failed;
    const meta = [ext ? ext.toUpperCase() : '', sizeBytes ? formatFileSize(sizeBytes) : ''].filter(Boolean).join(' · ');
    const body = (
        <>
            <span className={styles.icon} aria-hidden>
                {uploading ? <LuLoader size={16} className={styles.spin} /> : <FileIcon ext={ext} />}
            </span>
            <span className={styles.text}>
                <span className={styles.name} dir="auto" title={name}>{name || t('chat_kind_file', { defaultValue: 'فایل' })}</span>
                <span className={styles.meta} dir="ltr">
                    {failed
                        ? t('chat_file_upload_failed', { defaultValue: 'آپلود ناموفق' })
                        : uploading
                            ? `${Math.round(progress || 0)}%`
                            : (invalidMessage || meta)}
                </span>
            </span>
        </>
    );

    return (
        <div
            className={`${styles.chip} ${invalidMessage || failed ? styles.chipInvalid : ''}`}
            title={invalidMessage || name}
        >
            {url && !uploading && !failed ? (
                <a className={styles.link} href={url} target="_blank" rel="noopener noreferrer">{body}</a>
            ) : (
                <span className={styles.link}>{body}</span>
            )}
            {failed && onRetry ? (
                <button type="button" className={styles.action} onClick={onRetry}>
                    {tc('retry')}
                </button>
            ) : null}
            {onRemove ? (
                <button
                    type="button"
                    className={styles.remove}
                    onClick={onRemove}
                    aria-label={tc('delete')}
                    title={tc('delete')}
                >
                    <LuX size={13} />
                </button>
            ) : null}
        </div>
    );
}

export default ChatFileChip;
