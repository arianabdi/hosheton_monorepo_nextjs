'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LuUpload, LuLink, LuLoader, LuVolume2, LuX, LuImages, LuPlus, LuRotateCw, LuPlay, LuFile } from 'react-icons/lu';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { buildPublicFileUrl } from '../lib/file-url';
import { useResolvedAssetUrl } from '../hooks/useResolvedAssetUrl';
import { MiniAudioPlayer } from './MiniAudioPlayer';
import LightweightMediaPreview from './LightweightMediaPreview/LightweightMediaPreview';
import type { MediaThumbMeta } from '../../lib/lightweight-media';
import { ClickableImagePreview } from './CustomNodes/ClickableImagePreview';
import { uploadAssetRefFile } from '../lib/upload-asset-ref';
import {
    beginAssetUpload,
    endAssetUpload,
    takePendingAssetFiles,
    updateAssetUploadProgress,
    useAssetUploadSession,
} from '../lib/asset-upload-session';
import styles from './AssetRefUpload.module.scss';
import {
    createStudioMediaId,
    galleryItemToStudioMedia,
    inferStudioMediaType,
    normalizeAssetRefData,
    type StudioMediaRef,
    type StudioMediaType,
} from '../../lib/studio-media';
import { GalleryModal, type GalleryTab } from '@/app/(developers)/gallery';
import { getHoshetonErrorMessage } from '@/app/lib/errors';

/* Local object URLs are intentionally rendered directly during upload. */
/* eslint-disable @next/next/no-img-element */

export interface AssetRefChange {
    assets?: StudioMediaRef[];
    fileId?: string;
    fileKey?: string;
    externalUrl?: string;
    fileName?: string;
    assetType?: string;
    assetUrl?: undefined;
    mediaMetadata?: {
        durationSeconds?: number;
        width?: number;
        height?: number;
    };
    mediaThumbs?: Record<string, MediaThumbMeta>;
}

type UploadJob = {
    id: string;
    file: File;
    progress: number;
    status: 'queued' | 'uploading' | 'failed';
    previewUrl: string;
    error?: string;
};

interface AssetRefUploadProps {
    nodeId?: string;
    assetType?: string;
    fileId?: string;
    fileKey?: string;
    externalUrl?: string;
    /** @deprecated legacy field */
    assetUrl?: string;
    fileName?: string;
    mediaMetadata?: AssetRefChange['mediaMetadata'];
    mediaThumbs?: Record<string, MediaThumbMeta>;
    assets?: StudioMediaRef[];
    compact?: boolean;
    readOnly?: boolean;
    onChange: (patch: AssetRefChange) => void;
}

/** نوع رسانه لینک از پسوندش؛ بدون پسوند شناخته‌شده همان نوع فعلی نود */
function inferUrlMediaType(url: string, fallback: string): StudioMediaType {
    const path = url.split(/[?#]/)[0].toLowerCase();
    if (/\.(mp4|webm|mov|m4v|mkv|avi)$/.test(path)) return 'video';
    if (/\.(mp3|wav|m4a|aac|ogg|oga|flac|opus)$/.test(path)) return 'audio';
    if (/\.(png|jpe?g|webp|gif|avif|bmp|svg)$/.test(path)) return 'image';
    return fallback === 'video' || fallback === 'audio' ? fallback : 'image';
}

/**
 * ویدیو در کاشی شبکه: پوستر + دکمه پخش وسط، کلیک پخش/توقف. کنترل‌های بومی مرورگر
 * در کاشی کوچک فشرده و به‌هم‌ریخته نمایش داده می‌شدند.
 */
function VideoTile({ src, poster, label }: { src: string; poster?: string; label: string }) {
    const { t } = useTranslation('projects');
    const videoRef = useRef<HTMLVideoElement>(null);
    const [playing, setPlaying] = useState(false);

    return (
        <button
            type="button"
            className={`${styles.videoTile} nodrag`}
            title={label}
            aria-label={playing ? t('pause') : t('play')}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
                event.stopPropagation();
                const video = videoRef.current;
                if (!video) return;
                if (video.paused) video.play().catch(() => setPlaying(false));
                else video.pause();
            }}
        >
            <video
                ref={videoRef}
                src={src}
                poster={poster}
                playsInline
                preload="metadata"
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => setPlaying(false)}
            />
            {playing ? null : (
                <span className={styles.videoTilePlay} aria-hidden>
                    <LuPlay />
                </span>
            )}
        </button>
    );
}

function AssetMediaPreview({
    item,
    thumbs,
    compact = false,
    tile = false,
}: {
    item: StudioMediaRef;
    thumbs?: Record<string, MediaThumbMeta>;
    compact?: boolean;
    /** کاشی مربعی شبکه چندفایلی (نود و سایدبار) — صوت و ویدیو هم کاشی می‌شوند */
    tile?: boolean;
}) {
    // فایل‌هایی که فقط fileKey دارند (مثلاً از گالری) هم پیش‌نمایش بگیرند
    const src = item.url || item.externalUrl || (item.fileKey ? buildPublicFileUrl(item.fileKey) : '');
    if (!src) {
        return (
            <div className={`${styles.missingPreview} ${tile ? styles.missingTile : ''}`} title={item.label}>
                {tile ? <LuFile aria-hidden /> : null}
                <span>{item.label}</span>
            </div>
        );
    }
    if (tile && item.type === 'audio') {
        return <MiniAudioPlayer src={src} title={item.label} variant="tile" />;
    }
    if (tile && item.type === 'video') {
        return (
            <VideoTile
                src={src}
                poster={item.thumbnailUrlLarge || item.thumbnailUrl || thumbs?.[src]?.thumbnailUrlLarge}
                label={item.label}
            />
        );
    }
    if (item.type === 'image') {
        // نمایش thumbnail سبک — عکس اصلی فقط در لایت‌باکس لود می‌شود
        return (
            <ClickableImagePreview
                src={src}
                alt={item.label}
                thumbs={thumbs}
                thumbnailUrl={item.thumbnailUrlLarge || item.thumbnailUrl}
            />
        );
    }
    if (item.type === 'video') {
        return (
            <LightweightMediaPreview
                media={{
                    url: src,
                    thumbnailUrlLarge: item.thumbnailUrlLarge,
                    type: 'video',
                    width: item.width,
                    height: item.height,
                    aspectRatio: item.aspectRatio,
                }}
                controls
            />
        );
    }
    return <MiniAudioPlayer src={src} title={item.label} compact={compact} variant="waveform" />;
}

export function AssetRefUpload({
    nodeId,
    assetType = 'image',
    fileId = '',
    fileKey = '',
    externalUrl = '',
    assetUrl = '',
    fileName = '',
    mediaMetadata,
    mediaThumbs,
    assets,
    compact = false,
    readOnly = false,
    onChange,
}: AssetRefUploadProps) {
    const { t } = useTranslation('projects');
    const { t: tc } = useTranslation('common');
    const token = useAuthStore((s) => s.token);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const isPausedRef = useRef(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploading, setUploading] = useState(false);
    const [urlDraft, setUrlDraft] = useState(externalUrl || assetUrl);
    const [error, setError] = useState<string | null>(null);
    const [galleryOpen, setGalleryOpen] = useState(false);
    const [uploadJobs, setUploadJobs] = useState<UploadJob[]>([]);
    const session = useAssetUploadSession(nodeId);
    const isUploading = uploading || Boolean(session?.uploading);
    const displayProgress = uploading ? uploadProgress : (session?.progress ?? uploadProgress);
    const normalizedAssets = useMemo(() => assets ?? normalizeAssetRefData({
        assetType,
        fileId,
        fileKey,
        externalUrl,
        assetUrl,
        fileName,
        mediaMetadata,
        mediaThumbs,
    }), [assets, assetType, fileId, fileKey, externalUrl, assetUrl, fileName, mediaMetadata, mediaThumbs]);
    const assetsRef = useRef(normalizedAssets);
    useEffect(() => {
        assetsRef.current = normalizedAssets;
    }, [normalizedAssets]);

    const commitAssets = useCallback((next: StudioMediaRef[]) => {
        assetsRef.current = next;
        // assetType همراه فایل‌ها: آپلود ویدیو در نود پیش‌فرض «تصویر» قبلاً تصویر می‌ماند
        // (تخمین هزینه/ورودی ویدیو با assetType کار می‌کنند)
        onChange({ assets: next, ...(next[0] ? { assetType: next[0].type } : {}) });
    }, [onChange]);

    const previewUrl = useResolvedAssetUrl({
        fileId,
        fileKey,
        externalUrl,
        legacyAssetUrl: assetUrl,
    });

    // Guard against an endless probe → onChange → re-render → probe cycle: if a
    // cross-origin/video can't report full metadata (e.g. width/height stay 0),
    // we still only probe each URL once so the editor isn't flooded with node
    // updates + autosave requests.
    const probedUrlsRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        if (!fileId && !fileKey) {
            const frame = window.requestAnimationFrame(() => setUrlDraft(externalUrl || assetUrl));
            return () => window.cancelAnimationFrame(frame);
        }
    }, [externalUrl, assetUrl, fileId, fileKey]);

    useEffect(() => {
        if (!previewUrl || readOnly) return;
        const hasDuration = Number(mediaMetadata?.durationSeconds) > 0;
        const hasDimensions = Number(mediaMetadata?.width) > 0 && Number(mediaMetadata?.height) > 0;
        const complete = assetType === 'image'
            ? hasDimensions
            : assetType === 'video'
                ? hasDuration && hasDimensions
                : hasDuration;
        if (complete) return;
        if (probedUrlsRef.current.has(previewUrl)) return;

        probedUrlsRef.current.add(previewUrl);
        let cancelled = false;
        if (assetType === 'image') {
            const image = new Image();
            image.onload = () => {
                if (!cancelled) onChange({
                    mediaMetadata: { width: image.naturalWidth, height: image.naturalHeight },
                });
            };
            image.src = previewUrl;
            return () => { cancelled = true; };
        }
        const media = document.createElement(assetType === 'video' ? 'video' : 'audio');
        media.preload = 'metadata';
        media.onloadedmetadata = () => {
            if (cancelled) return;
            onChange({
                mediaMetadata: {
                    durationSeconds: Number.isFinite(media.duration) ? media.duration : undefined,
                    ...(media instanceof HTMLVideoElement
                        ? { width: media.videoWidth, height: media.videoHeight }
                        : {}),
                },
            });
        };
        media.src = previewUrl;
        return () => {
            cancelled = true;
            media.removeAttribute('src');
            media.load();
        };
    }, [assetType, mediaMetadata, onChange, previewUrl, readOnly]);

    const typeLabel = t(assetType === 'video' ? 'video' : assetType === 'audio' ? 'audio' : 'image');

    const handleUpload = useCallback(async (file: File, jobId?: string) => {
        if (readOnly) return;
        const detectedType = inferStudioMediaType(file);
        if (!detectedType) {
            setError(t('unsupported_file_type'));
            return;
        }
        if (!token) {
            setError(t('login_first'));
            if (nodeId) endAssetUpload(nodeId);
            return;
        }
        if (nodeId && !beginAssetUpload(nodeId)) return;
        setError(null);
        setUploading(true);
        setUploadProgress(0);
        if (jobId) {
            setUploadJobs((current) => current.map((job) => (
                job.id === jobId ? { ...job, status: 'uploading', progress: 0, error: undefined } : job
            )));
        }
        try {
            const patch = await uploadAssetRefFile({
                file,
                token,
                assetType: detectedType,
                isPausedRef,
                onProgress: (progress) => {
                    setUploadProgress(progress);
                    if (jobId) {
                        setUploadJobs((current) => current.map((job) => (
                            job.id === jobId ? { ...job, progress } : job
                        )));
                    }
                    if (nodeId) updateAssetUploadProgress(nodeId, progress);
                },
                noFileIdMessage: t('no_file_id'),
            });
            setUrlDraft('');
            const publicUrl = patch.fileKey ? buildPublicFileUrl(patch.fileKey) : '';
            const metadata = patch.mediaMetadata || {};
            const item: StudioMediaRef = {
                id: createStudioMediaId(patch.fileId || patch.fileKey),
                type: detectedType,
                label: patch.fileName || file.name,
                fileId: patch.fileId,
                fileKey: patch.fileKey,
                url: publicUrl || undefined,
                width: metadata.width,
                height: metadata.height,
                aspectRatio: metadata.width && metadata.height
                    ? Number((metadata.width / metadata.height).toFixed(4))
                    : undefined,
                durationSeconds: metadata.durationSeconds,
            };
            if (!assetsRef.current.some((asset) => (
                (item.fileId && asset.fileId === item.fileId)
                || (item.fileKey && asset.fileKey === item.fileKey)
            ))) {
                commitAssets([...assetsRef.current, item]);
            }
            if (jobId) {
                setUploadJobs((current) => {
                    const job = current.find((entry) => entry.id === jobId);
                    if (job) URL.revokeObjectURL(job.previewUrl);
                    return current.filter((entry) => entry.id !== jobId);
                });
            }
        } catch (err) {
            const message = getHoshetonErrorMessage(err, { fallback: t('upload_error') });
            setError(message);
            if (jobId) {
                setUploadJobs((current) => current.map((job) => (
                    job.id === jobId ? { ...job, status: 'failed', error: message } : job
                )));
            }
        } finally {
            setUploading(false);
            if (nodeId) endAssetUpload(nodeId);
        }
    }, [readOnly, token, commitAssets, t, nodeId]);

    const handleFiles = useCallback(async (files: File[]) => {
        const signatures = new Set(uploadJobs.map((job) => (
            `${job.file.name}:${job.file.size}:${job.file.lastModified}`
        )));
        const supported = files.filter((file) => {
            if (!inferStudioMediaType(file)) return false;
            const signature = `${file.name}:${file.size}:${file.lastModified}`;
            if (signatures.has(signature)) return false;
            signatures.add(signature);
            return true;
        });
        const jobs = supported.map((file) => ({
            id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
            file,
            progress: 0,
            status: 'queued' as const,
            previewUrl: URL.createObjectURL(file),
        }));
        setUploadJobs((current) => [...current, ...jobs]);
        for (const job of jobs) {
            await handleUpload(job.file, job.id);
        }
    }, [handleUpload, uploadJobs]);

    const handleFilesRef = useRef(handleFiles);
    useEffect(() => {
        handleFilesRef.current = handleFiles;
    }, [handleFiles]);

    useEffect(() => {
        if (!nodeId || readOnly) return;
        const pending = takePendingAssetFiles(nodeId);
        if (pending.length) void handleFilesRef.current(pending);
    }, [nodeId, readOnly]);

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (readOnly || isUploading) return;
        const files = Array.from(e.target.files || []);
        if (files.length) void handleFiles(files);
        e.target.value = '';
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (readOnly || isUploading) return;
        const files = Array.from(e.dataTransfer.files || []);
        if (files.length) void handleFiles(files);
    };

    useEffect(() => {
        if (readOnly) return;
        const onPaste = (event: ClipboardEvent) => {
            if (!wrapperRef.current?.contains(document.activeElement)) return;
            const target = event.target as HTMLElement | null;
            if (target?.matches('input, textarea, [contenteditable="true"]')) return;
            const files = Array.from(event.clipboardData?.files || []);
            if (!files.length) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            void handleFiles(files);
        };
        window.addEventListener('paste', onPaste, true);
        return () => window.removeEventListener('paste', onPaste, true);
    }, [handleFiles, readOnly]);

    const applyUrl = () => {
        if (readOnly || isUploading) return;
        const trimmed = urlDraft.trim();
        if (!trimmed) return;
        const item: StudioMediaRef = {
            id: createStudioMediaId(trimmed),
            type: inferUrlMediaType(trimmed, assetType),
            label: fileName || trimmed.split('/').pop() || typeLabel,
            externalUrl: trimmed,
            url: trimmed,
        };
        if (!assetsRef.current.some((asset) => (asset.url || asset.externalUrl) === trimmed)) {
            commitAssets([...assetsRef.current, item]);
        }
        setUrlDraft('');
    };

    const wrapperClass = `${styles.wrapper} ${compact ? styles.compact : ''} ${readOnly ? styles.readOnlyLocked : ''} ${isUploading ? styles.uploadingLocked : ''}`;
    const focusWrapper = () => wrapperRef.current?.focus({ preventScroll: true });
    const openFilePicker = () => {
        if (readOnly || isUploading) return;
        fileInputRef.current?.click();
    };
    const removeAsset = (id: string) => commitAssets(normalizedAssets.filter((asset) => asset.id !== id));

    const fileInput = (
        <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,audio/*"
            multiple
            className={styles.hiddenInput}
            disabled={readOnly || isUploading}
            onChange={onFileChange}
        />
    );

    const dropzone = (
        <div
            className={styles.dropzone}
            onClick={openFilePicker}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={onDrop}
            onPointerDown={(e) => e.stopPropagation()}
            aria-disabled={readOnly || isUploading}
        >
            {isUploading ? <LuLoader className={styles.spin} /> : <LuUpload />}
            <span>{isUploading ? tc('upload_progress', { progress: displayProgress }) : t('upload_multiple_media')}</span>
        </div>
    );

    const galleryModal = (
        <GalleryModal
            open={galleryOpen}
            onClose={() => setGalleryOpen(false)}
            scope="all"
            mode="multi-select"
            initialTab={(assetType === 'video' || assetType === 'audio' ? assetType : 'image') as GalleryTab}
            selectedIds={normalizedAssets.flatMap((item) => (
                [item.id, item.fileId, item.fileKey, item.url, item.externalUrl].filter(Boolean) as string[]
            ))}
            onSelectMany={(items) => {
                const additions = items.map(galleryItemToStudioMedia);
                const existing = new Set(assetsRef.current.map((item) => item.id));
                commitAssets([...assetsRef.current, ...additions.filter((item) => !existing.has(item.id))]);
            }}
        />
    );

    // ───── نمایش فایل‌ها — یکسان در نود روی بوم و سایدبار: یک فایل بزرگ، چند فایل کاشی‌های مربعی ─────
    const hasAssets = normalizedAssets.length > 0;
    const hasJobs = uploadJobs.length > 0;
    const single = normalizedAssets.length === 1 && !hasJobs;
    const tileCount = normalizedAssets.length + uploadJobs.length;
    const removeButton = (id: string) => (readOnly ? null : (
        <button
            type="button"
            className={`${styles.nodeRemove} nodrag`}
            aria-label={tc('remove')}
            title={tc('remove')}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
                event.stopPropagation();
                removeAsset(id);
            }}
        >
            <LuX />
        </button>
    ));

    return (
        <div
            ref={wrapperRef}
            tabIndex={0}
            data-asset-ref-upload="true"
            className={wrapperClass}
            onPointerDown={focusWrapper}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={onDrop}
        >
            {fileInput}

            {!hasAssets && !hasJobs ? dropzone : single ? (
                <div className={`${styles.nodeSingle} ${normalizedAssets[0].type === 'audio' ? styles.nodeSingleAudio : ''}`}>
                    <AssetMediaPreview
                        item={{
                            ...normalizedAssets[0],
                            url: normalizedAssets[0].url || normalizedAssets[0].externalUrl || previewUrl,
                        }}
                        thumbs={mediaThumbs}
                        compact
                    />
                    {removeButton(normalizedAssets[0].id)}
                </div>
            ) : (
                <div className={`${styles.nodeGrid} ${tileCount >= 5 ? styles.nodeGridDense : ''}`}>
                    {/* همه فایل‌ها (تصویر، ویدیو، صوت) کاشی مربعی کنار هم */}
                    {normalizedAssets.map((item) => (
                        <div key={item.id} className={styles.nodeTile}>
                            <AssetMediaPreview item={item} thumbs={mediaThumbs} compact tile />
                            {removeButton(item.id)}
                        </div>
                    ))}
                    {uploadJobs.map((job) => {
                        const type = inferStudioMediaType(job.file);
                        const failed = job.status === 'failed';
                        return (
                            <div key={job.id} className={`${styles.nodeTile} ${styles.nodeJob}`}>
                                {type === 'image'
                                    ? <img src={job.previewUrl} alt="" />
                                    : type === 'video'
                                        ? <video src={job.previewUrl} muted />
                                        : <span className={styles.nodeJobAudio}><LuVolume2 /></span>}
                                <span className={`${styles.nodeJobOverlay} ${failed ? styles.nodeJobFailed : ''}`}>
                                    {failed ? (
                                        <>
                                            <button
                                                type="button"
                                                className="nodrag"
                                                aria-label={tc('retry')}
                                                title={job.error || tc('retry')}
                                                onPointerDown={(event) => event.stopPropagation()}
                                                onClick={() => void handleUpload(job.file, job.id)}
                                            >
                                                <LuRotateCw />
                                            </button>
                                            <button
                                                type="button"
                                                className="nodrag"
                                                aria-label={tc('remove')}
                                                onPointerDown={(event) => event.stopPropagation()}
                                                onClick={() => {
                                                    URL.revokeObjectURL(job.previewUrl);
                                                    setUploadJobs((current) => current.filter((entry) => entry.id !== job.id));
                                                }}
                                            >
                                                <LuX />
                                            </button>
                                        </>
                                    ) : `${Math.round(job.progress)}%`}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* آپلودی که از نمونه دیگر (مثلاً سایدبار) شروع شده و کاشی‌اش اینجا نیست */}
            {isUploading && !hasJobs && hasAssets && (
                <div className={styles.progressTrack}>
                    <div className={styles.progressBar} style={{ width: `${displayProgress}%` }} />
                </div>
            )}

            {!readOnly && (
                <div className={styles.nodeActions}>
                    {hasAssets || hasJobs ? (
                        <button
                            type="button"
                            className={`${styles.nodeAction} nodrag`}
                            disabled={isUploading}
                            onPointerDown={(event) => event.stopPropagation()}
                            onClick={(event) => {
                                event.stopPropagation();
                                openFilePicker();
                            }}
                        >
                            <LuPlus /> {tc('upload')}
                        </button>
                    ) : null}
                    <button
                        type="button"
                        className={`${styles.nodeAction} nodrag`}
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={(event) => {
                            event.stopPropagation();
                            setGalleryOpen(true);
                        }}
                    >
                        <LuImages /> {t('gallery_short')}
                    </button>
                </div>
            )}

            {/* فقط سایدبار: افزودن با لینک */}
            {compact ? null : (
                <div className={styles.urlRow}>
                    <LuLink />
                    <input
                        type="url"
                        className={styles.urlInput}
                        placeholder={t('external_url', { type: typeLabel })}
                        value={urlDraft}
                        readOnly={readOnly || isUploading}
                        disabled={isUploading}
                        onChange={(e) => {
                            if (readOnly || isUploading) return;
                            setUrlDraft(e.target.value);
                        }}
                        onBlur={applyUrl}
                        onKeyDown={(e) => e.key === 'Enter' && applyUrl()}
                        onPointerDown={(e) => e.stopPropagation()}
                    />
                </div>
            )}

            {galleryModal}

            {error && <p className={styles.error}>{error}</p>}
        </div>
    );
}
