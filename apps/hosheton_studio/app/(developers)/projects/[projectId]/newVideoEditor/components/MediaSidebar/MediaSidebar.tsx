'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    LuLoader, LuFilm, LuType, LuSparkles, LuArrowLeftRight, LuCloudUpload,
    LuLayoutGrid, LuList, LuMinus, LuPlus,
} from 'react-icons/lu';
import { mediaGalleryApi, type GalleryFileItem } from '@/app/(developers)/gallery';
import { getApiErrorMessage } from '@/app/(developers)/projects/lib/api-client';
import SearchInput from '@/app/components/common/SearchInput/SearchInput';
import { MiniAudioPlayer } from '@/app/(developers)/projects/[projectId]/components/MiniAudioPlayer';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { uploadFileInChunks } from '@/app/(developers)/projects/[projectId]/lib/chunk-uploader';
import { normalizeUploadPair } from '@/app/(developers)/templates/lib/preview-media';
import type { GalleryDragPayload, TextClipStyle, TransitionDragPayload } from '../../types/timeline';
import { TRANSITION_MIME } from '../../types/timeline';
import styles from './MediaSidebar.module.scss';

type TabType = 'media' | 'text' | 'effects' | 'transitions';
type MediaFilter = 'all' | 'image' | 'video' | 'audio';
type ViewMode = 'grid' | 'list';

const FILTER_VALUES: MediaFilter[] = ['all', 'image', 'video', 'audio'];
const VIEW_STORAGE_KEY = 'hosheton.videoEditor.mediaView.v1';
// Phones keep their own view preference (3 per row by default).
const MOBILE_VIEW_STORAGE_KEY = 'hosheton.videoEditor.mediaView.mobile.v1';

const DUMMY_TEXTS: Array<{ id: string; title: string; sub: string; style?: Partial<TextClipStyle> }> = [
    { id: 't1', title: 'Default Title', sub: 'Basic Heading' },
    {
        id: 't2', title: 'Lower Third', sub: 'Social Media',
        style: { fontSize: 38, align: 'center', backgroundColor: '#111827', backgroundOpacity: 0.7 },
    },
    {
        id: 't3', title: 'Subtitle', sub: 'Auto Caption',
        style: { fontSize: 34, strokeColor: '#000000', strokeWidth: 4, motion: 'fadeIn' },
    },
    {
        id: 't4', title: 'Kinetic Text', sub: 'Animated',
        style: { fontSize: 58, bold: true, motion: 'pop', glowColor: '#6366f1', glowBlur: 22 },
    },
    {
        id: 't5', title: 'Typewriter', sub: 'Mono Animated',
        style: { fontFamily: "'Courier New', monospace", fontSize: 36, motion: 'typewriter' },
    },
    {
        id: 't6', title: 'Glow Headline', sub: 'Neon',
        style: { fontSize: 64, bold: true, color: '#f0f9ff', glowColor: '#22d3ee', glowBlur: 26, motion: 'slideUp' },
    },
];

const DUMMY_EFFECTS = [
    { id: 'e1', title: 'Gaussian Blur', icon: '💧' },
    { id: 'e2', title: 'Color Grade', icon: '🎨' },
    { id: 'e3', title: 'Glitch FX', icon: '⚡' },
    { id: 'e4', title: 'Vignette', icon: '📷' },
];

const TEST_TRANSITIONS: Array<Omit<TransitionDragPayload, 'label'> & { id: string; icon: string }> = [
    {
        id: 'cross-dissolve-test',
        type: 'crossDissolve',
        duration: 0.5,
        icon: '✨',
    },
];

export type TextPresetPayload = {
    title: string;
    text?: string;
    style?: Partial<TextClipStyle>;
};

type MediaSidebarProps = {
    projectId: string;
    onAddToTimeline?: (payload: GalleryDragPayload) => void;
    onAddText?: (preset: TextPresetPayload) => void;
    /** Phone window: underlined text tabs and a 3-per-row grid by default. */
    mobile?: boolean;
};

export default function MediaSidebar({ projectId, onAddToTimeline, onAddText, mobile = false }: MediaSidebarProps) {
    const { t } = useTranslation('videoEditor');
    const { t: tp } = useTranslation('projects');
    const { t: tc } = useTranslation('common');
    const [activeTab, setActiveTab] = useState<TabType>('media');
    const [searchQuery, setSearchQuery] = useState('');
    const [mediaFilter, setMediaFilter] = useState<MediaFilter>('all');
    const [filterOpen, setFilterOpen] = useState(false);
    const [files, setFiles] = useState<GalleryFileItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [upload, setUpload] = useState<{ name: string; progress: number } | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [gridColumns, setGridColumns] = useState(mobile ? 3 : 2);
    const viewStorageKey = mobile ? MOBILE_VIEW_STORAGE_KEY : VIEW_STORAGE_KEY;
    const fileInputRef = useRef<HTMLInputElement>(null);
    const filterRef = useRef<HTMLDivElement>(null);
    const token = useAuthStore((state) => state.token);

    useEffect(() => {
        // SSR-safe localStorage hydration of the saved view preferences; the
        // rule reports only the first setState but every call below is equally
        // intentional (same pattern as useEditorLayout's layout hydration).
        /* eslint-disable react-hooks/set-state-in-effect */
        try {
            const raw = window.localStorage.getItem(viewStorageKey);
            if (!raw) return;
            const parsed = JSON.parse(raw) as { viewMode?: ViewMode; gridColumns?: number };
            if (parsed.viewMode === 'grid' || parsed.viewMode === 'list') setViewMode(parsed.viewMode);
            if (typeof parsed.gridColumns === 'number' && parsed.gridColumns >= 1 && parsed.gridColumns <= 5) {
                setGridColumns(Math.round(parsed.gridColumns));
            }
        } catch {
            /* ignore corrupted preferences */
        }
        /* eslint-enable react-hooks/set-state-in-effect */
    }, [viewStorageKey]);

    useEffect(() => {
        try {
            window.localStorage.setItem(viewStorageKey, JSON.stringify({ viewMode, gridColumns }));
        } catch {
            /* storage unavailable */
        }
    }, [viewMode, gridColumns, viewStorageKey]);

    useEffect(() => {
        if (activeTab !== 'media' || !projectId) return;

        setLoading(true);
        setError(null);

        mediaGalleryApi
            .getProjectFiles(projectId)
            .then((res) => setFiles(res.files ?? []))
            .catch((err) => setError(getApiErrorMessage(err, t('load_gallery_error'))))
            .finally(() => setLoading(false));
    }, [activeTab, projectId, t]);

    useEffect(() => {
        if (!filterOpen) return;

        const onPointerDown = (event: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
                setFilterOpen(false);
            }
        };

        window.addEventListener('mousedown', onPointerDown);
        return () => window.removeEventListener('mousedown', onPointerDown);
    }, [filterOpen]);

    const filteredMedia = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return files.filter((item) => {
            if (mediaFilter !== 'all' && item.type !== mediaFilter) return false;
            if (!q) return true;
            return (
                item.nodeLabel.toLowerCase().includes(q)
                || item.nodeType.toLowerCase().includes(q)
                || item.projectTitle.toLowerCase().includes(q)
            );
        });
    }, [files, mediaFilter, searchQuery]);

    const filteredTexts = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return DUMMY_TEXTS;
        return DUMMY_TEXTS.filter((item) => (
            item.title.toLowerCase().includes(q) || item.sub.toLowerCase().includes(q)
        ));
    }, [searchQuery]);

    const filteredEffects = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return DUMMY_EFFECTS;
        return DUMMY_EFFECTS.filter((item) => item.title.toLowerCase().includes(q));
    }, [searchQuery]);

    const filterLabel = (value: MediaFilter) => {
        if (value === 'all') return tc('all');
        if (value === 'image') return t('filter_photo');
        if (value === 'video') return tp('video');
        return tp('audio');
    };
    const activeFilterLabel = filterLabel(mediaFilter);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = Array.from(e.target.files || []);
        e.target.value = '';
        if (!selected.length) return;
        if (!token) {
            setError(t('upload_no_auth'));
            return;
        }

        for (const file of selected) {
            setUpload({ name: file.name, progress: 0 });
            try {
                const result = await uploadFileInChunks({
                    file,
                    token,
                    onProgress: (progress) => setUpload({ name: file.name, progress }),
                    metadata: {
                        mimetype: file.type || 'application/octet-stream',
                        size: file.size,
                        source: 'video-editor',
                    },
                });
                const media = normalizeUploadPair(result);
                if (!media) {
                    setError(t('upload_failed'));
                    continue;
                }

                const kind: GalleryFileItem['type'] = media.type;
                const item: GalleryFileItem = {
                    id: media.fileId || undefined,
                    url: media.url,
                    type: kind,
                    nodeId: '',
                    nodeLabel: media.label || file.name,
                    nodeType: 'upload',
                    projectId,
                    projectTitle: '',
                    source: 'upload',
                    fileId: media.fileId || undefined,
                    fileKey: media.fileKey || undefined,
                };
                setFiles((prev) => [item, ...prev]);
                onAddToTimeline?.({
                    url: item.url,
                    type: item.type,
                    label: item.nodeLabel,
                    fileId: item.fileId,
                });
            } catch (err) {
                setError(getApiErrorMessage(err, t('upload_failed')));
            } finally {
                setUpload(null);
            }
        }
    };

    const toPayload = (item: GalleryFileItem): GalleryDragPayload => ({
        url: item.url,
        type: item.type,
        label: item.nodeLabel || item.nodeType,
        nodeId: item.nodeId,
        nodeType: item.nodeType,
    });

    const handleDragStart = (e: React.DragEvent, item: GalleryFileItem) => {
        const payload = toPayload(item);
        e.dataTransfer.setData('application/x-hosheton-media', JSON.stringify(payload));
        e.dataTransfer.effectAllowed = 'copy';
    };

    const handleTransitionDragStart = (e: React.DragEvent, item: TransitionDragPayload) => {
        e.dataTransfer.setData(TRANSITION_MIME, JSON.stringify(item));
        e.dataTransfer.effectAllowed = 'copy';
    };

    const handleAddClick = (item: GalleryFileItem) => {
        onAddToTimeline?.(toPayload(item));
    };

    const isList = viewMode === 'list';
    const itemsGridStyle = isList
        ? undefined
        : { gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))` };

    const renderViewToggle = () => (
        <div className={styles.viewToggle} role="group" aria-label={t('view_mode')}>
            {isList ? (
                <button
                    type="button"
                    className={styles.viewBtn}
                    title={t('switch_grid')}
                    aria-label={t('switch_grid')}
                    onClick={() => setViewMode('grid')}
                >
                    <LuLayoutGrid />
                </button>
            ) : (
                <button
                    type="button"
                    className={styles.viewBtn}
                    title={t('switch_list')}
                    aria-label={t('switch_list')}
                    onClick={() => setViewMode('list')}
                >
                    <LuList />
                </button>
            )}
            {!isList && (
                <div className={styles.columnStepper} title={t('grid_columns')}>
                    <button
                        type="button"
                        aria-label={t('fewer_columns')}
                        disabled={gridColumns <= 1}
                        onClick={() => setGridColumns((c) => Math.max(1, c - 1))}
                    >
                        <LuMinus />
                    </button>
                    <span>{gridColumns}</span>
                    <button
                        type="button"
                        aria-label={t('more_columns')}
                        disabled={gridColumns >= 5}
                        onClick={() => setGridColumns((c) => Math.min(5, c + 1))}
                    >
                        <LuPlus />
                    </button>
                </div>
            )}
        </div>
    );

    return (
        <div className={`${styles.sidebarContainer} ${isList ? styles.listView : ''} ${mobile ? styles.mobile : ''}`}>
            <div className={styles.tabNav} role="tablist">
                <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'media'}
                    className={`${styles.tabBtn} ${activeTab === 'media' ? styles.active : ''}`}
                    onClick={() => setActiveTab('media')}
                >
                    {!mobile && <LuFilm aria-hidden />}
                    {t('media')}
                </button>

                <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'text'}
                    className={`${styles.tabBtn} ${activeTab === 'text' ? styles.active : ''}`}
                    onClick={() => setActiveTab('text')}
                >
                    {!mobile && <LuType aria-hidden />}
                    {t('text')}
                </button>

                <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'effects'}
                    className={`${styles.tabBtn} ${activeTab === 'effects' ? styles.active : ''}`}
                    onClick={() => setActiveTab('effects')}
                >
                    {!mobile && <LuSparkles aria-hidden />}
                    {t('effect')}
                </button>

                <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'transitions'}
                    className={`${styles.tabBtn} ${activeTab === 'transitions' ? styles.active : ''}`}
                    onClick={() => setActiveTab('transitions')}
                >
                    {!mobile && <LuArrowLeftRight aria-hidden />}
                    {t('transition_tab')}
                </button>
            </div>

            <div className={styles.searchFilterArea}>
                <SearchInput
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder={tc('search')}
                    className={styles.sidebarSearch}
                />

                {activeTab === 'media' && (
                    <div className={styles.filterWrap} ref={filterRef}>
                        <button
                            type="button"
                            className={`${styles.filterBtn} ${mediaFilter !== 'all' ? styles.filterActive : ''}`}
                            title={tc('filter')}
                            aria-expanded={filterOpen}
                            onClick={() => setFilterOpen((open) => !open)}
                        >
                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                            </svg>
                            <span>{activeFilterLabel}</span>
                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className={styles.filterChevron} aria-hidden>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        {filterOpen && (
                            <div className={styles.filterMenu} role="menu">
                                {FILTER_VALUES.map((value) => (
                                    <button
                                        key={value}
                                        type="button"
                                        role="menuitem"
                                        className={mediaFilter === value ? styles.filterMenuActive : ''}
                                        onClick={() => {
                                            setMediaFilter(value);
                                            setFilterOpen(false);
                                        }}
                                    >
                                        {filterLabel(value)}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {renderViewToggle()}
            </div>

            <div className={styles.contentArea}>
                {activeTab === 'media' && (
                    <>
                        {loading && (
                            <p className={styles.stateMessage}>
                                <LuLoader className={styles.spinIcon} aria-hidden />
                                {tc('loading')}
                            </p>
                        )}
                        {!loading && error && <p className={styles.stateMessage}>{error}</p>}
                        {!loading && !error && (
                            <div
                                className={`${isList ? styles.listContainer : styles.gridContainer}`}
                                style={itemsGridStyle}
                            >
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className={styles.hiddenInput}
                                    multiple
                                    accept="video/*,audio/*,image/*"
                                    onChange={handleFileUpload}
                                />
                                <button
                                    type="button"
                                    className={isList ? styles.importRow : styles.importCard}
                                    disabled={!!upload}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    {upload ? (
                                        <>
                                            <LuCloudUpload className={styles.uploadIcon} aria-hidden />
                                            <span className={styles.uploadName}>{upload.name}</span>
                                            <span className={styles.uploadProgressTrack}>
                                                <span
                                                    className={styles.uploadProgressFill}
                                                    style={{ width: `${upload.progress}%` }}
                                                />
                                            </span>
                                            <span className={styles.uploadProgressLabel}>{upload.progress}%</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <span>{tc('add')}</span>
                                        </>
                                    )}
                                </button>

                                {filteredMedia.length === 0 && (
                                    <p className={styles.emptyGridHint}>{t('no_files')}</p>
                                )}

                                {filteredMedia.map((item, index) => (
                                    <div
                                        key={`${item.url}-${index}`}
                                        className={isList ? styles.mediaRow : styles.mediaItem}
                                        title={t('click_or_drag', { label: item.nodeLabel })}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, item)}
                                        onClick={() => handleAddClick(item)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                handleAddClick(item);
                                            }
                                        }}
                                        role="button"
                                        tabIndex={0}
                                    >
                                        <div className={styles.thumbWrapper}>
                                            {item.type === 'image' && (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={item.url} alt={item.nodeLabel} loading="lazy" />
                                            )}
                                            {item.type === 'video' && (
                                                <video src={item.url} preload="metadata" muted playsInline />
                                            )}
                                            {item.type === 'audio' && (
                                                <div className={styles.audioThumb} onClick={(e) => e.stopPropagation()}>
                                                    <MiniAudioPlayer src={item.url} title={item.nodeLabel} compact />
                                                </div>
                                            )}
                                        </div>
                                        <span className={styles.title}>{item.nodeLabel || item.nodeType}</span>
                                        <span className={styles.subtitle}>
                                            {item.source === 'generated' ? 'AI' : t('uploaded')}
                                        </span>
                                        <span className={styles.rowAddIcon} aria-hidden>
                                            <LuPlus />
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'text' && (
                    <div
                        className={isList ? styles.listContainer : styles.gridContainer}
                        style={itemsGridStyle}
                    >
                        {filteredTexts.length === 0 && (
                            <p className={styles.emptyGridHint}>{t('no_files')}</p>
                        )}
                        {filteredTexts.map((preset) => (
                            <div
                                key={preset.id}
                                className={isList ? `${styles.presetRow} ${styles.clickableRow}` : `${styles.presetCard} ${styles.clickableRow}`}
                                onClick={() => onAddText?.({ title: preset.title, style: preset.style })}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        onAddText?.({ title: preset.title, style: preset.style });
                                    }
                                }}
                                role="button"
                                tabIndex={0}
                                title={t('click_or_drag', { label: preset.title })}
                            >
                                <span className={styles.previewBox}>T</span>
                                <span className={styles.presetTitle}>{preset.title}</span>
                                <span className={styles.presetSub}>{preset.sub}</span>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'effects' && (
                    <div
                        className={isList ? styles.listContainer : styles.gridContainer}
                        style={itemsGridStyle}
                    >
                        {filteredEffects.map((fx) => (
                            <div key={fx.id} className={isList ? styles.presetRow : styles.presetCard}>
                                <span className={styles.previewBox}>{fx.icon}</span>
                                <span className={styles.presetTitle}>{fx.title}</span>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'transitions' && (
                    <div
                        className={isList ? styles.listContainer : styles.gridContainer}
                        style={itemsGridStyle}
                    >
                        <p className={styles.transitionHint}>
                            {t('cross_dissolve_hint')}
                        </p>
                        {TEST_TRANSITIONS.map((tr) => {
                            const payload: TransitionDragPayload = {
                                type: tr.type,
                                label: t('cross_dissolve_test'),
                                duration: tr.duration,
                            };
                            return (
                            <div
                                key={tr.id}
                                className={`${isList ? styles.presetRow : styles.presetCard} ${styles.draggableCard}`}
                                draggable
                                onDragStart={(e) => handleTransitionDragStart(e, payload)}
                                title={t('drag_to_cut')}
                            >
                                <span className={styles.previewBox}>{tr.icon}</span>
                                <span className={styles.presetTitle}>{payload.label}</span>
                                <span className={styles.presetSub}>{t('seconds', { value: tr.duration })}</span>
                            </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
