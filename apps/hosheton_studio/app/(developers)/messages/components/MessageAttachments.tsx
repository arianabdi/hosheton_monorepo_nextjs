'use client';

import { useTranslation } from 'react-i18next';
import { LuDownload, LuFileText, LuPlay } from 'react-icons/lu';
import type { DirectAttachment } from '@/app/(marketplace)/lib/types';
import { fileExtension, formatBytes } from '../lib/dm-format';
import styles from '../Messages.module.scss';

const SINGLE_MAX_W = 320;
const SINGLE_MAX_H = 360;

type Props = {
    attachments: DirectAttachment[];
    onOpenMedia: (media: DirectAttachment[], index: number) => void;
};

/** تک عکس/ویدیو با نسبت واقعی خودش (بدون پرش بعد از بارگذاری)؛ چندتایی = شبکهٔ مربعی */
function singleSize(a: DirectAttachment): { width: number; aspectRatio: string } {
    const w = a.width || 4;
    const h = a.height || 3;
    const width = Math.round(Math.min(SINGLE_MAX_W, (SINGLE_MAX_H * w) / h));
    return { width, aspectRatio: `${w} / ${h}` };
}

export function MessageAttachments({ attachments, onOpenMedia }: Props) {
    const { t, i18n } = useTranslation('messages');
    const media = attachments.filter((a) => a.kind === 'image' || a.kind === 'video');
    const audios = attachments.filter((a) => a.kind === 'audio');
    const files = attachments.filter((a) => a.kind === 'file');

    return (
        <div className={styles.attachments}>
            {media.length > 0 && (
                <div className={media.length === 1 ? styles.mediaSingle : styles.mediaGrid}>
                    {media.map((a, index) => (
                        <button
                            key={a.fileId || a.url}
                            type="button"
                            className={styles.mediaTile}
                            style={media.length === 1 ? singleSize(a) : undefined}
                            onClick={() => onOpenMedia(media, index)}
                            aria-label={a.name || t(a.kind === 'video' ? 'attachment_video' : 'attachment_image')}
                        >
                            {a.kind === 'image' ? (
                                <img src={a.url} alt="" loading="lazy" decoding="async" />
                            ) : (
                                <>
                                    <video src={a.url} preload="metadata" muted playsInline />
                                    <span className={styles.playBadge}><LuPlay size={18} /></span>
                                </>
                            )}
                        </button>
                    ))}
                </div>
            )}

            {audios.map((a) => (
                <div key={a.fileId || a.url} className={styles.audioRow}>
                    <span className={styles.audioName} dir="auto">{a.name || t('attachment_audio')}</span>
                    <audio src={a.url} controls preload="none" />
                </div>
            ))}

            {files.map((a) => (
                <a
                    key={a.fileId || a.url}
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={a.name || undefined}
                    className={styles.fileRow}
                    title={t('download')}
                >
                    <span className={styles.fileIcon}>
                        <LuFileText size={18} />
                        {fileExtension(a.name) && <small>{fileExtension(a.name)}</small>}
                    </span>
                    <span className={styles.fileText}>
                        <span className={styles.fileName} dir="auto">{a.name || t('attachment_file')}</span>
                        <span className={styles.fileMeta}>{formatBytes(a.size, i18n.language)}</span>
                    </span>
                    <LuDownload size={16} className={styles.fileDownload} aria-hidden />
                </a>
            ))}
        </div>
    );
}
