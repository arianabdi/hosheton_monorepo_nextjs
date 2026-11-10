'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    LuCheck,
    LuChevronLeft,
    LuChevronRight,
    LuCopy,
    LuDownload,
    LuEye,
    LuFile,
    LuFolderOpen,
    LuGrid2X2,
    LuImages,
    LuList,
    LuLoader,
    LuRefreshCw,
    LuSearch,
    LuTrash2,
    LuUpload,
    LuX,
} from 'react-icons/lu';
import { CopyToClipboard, ErrorToaster, SuccessToaster, formatFileSize } from '@my-workspace/utils';
import { LoadingState } from '@my-workspace/components';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { isoToJalaliString } from '@/app/(main)/accounting/jalali.client';
import { handleUpload } from '@/app/utils/uploadFile';
import { uploadFileInChunks } from '@/app/utils/chunkUploader/chunkUploader';
import { AdminFilesUnavailableError, detectFileCategory, deleteFile, getFileStats, listAdminFiles, listFiles, searchFileOwners } from '../files-api';
import type { FileBrowseStats, FileCategory, FileManagerFile, FileManagerView, FilePickerAccept } from '../files.types';
import { fileBadgeColor, fileDisplayName, fileExtLabel, filePreviewUrl, isGeneratedFile, ownerLabel, relatedFileLabel } from '../file-utils';
import CategoryStrip from './CategoryStrip';
import FileFilterBar, { EMPTY_FILE_FILTERS, countActiveFilters, filtersToQuery, type FileFilters } from './FileFilterBar';
import FileRelatedStrip from './FileRelatedStrip';
import FileTypeIcon from './FileTypeIcon';
import styles from '../Files.module.scss';

const PAGE_SIZE = 24;

/** خروجی تولیدی حجم ثبت‌شده ندارد */
const sizeLabel = (file: FileManagerFile) => (typeof file.size === 'number' ? formatFileSize(file.size) : '—');
const ownerTitle = (file: FileManagerFile) =>
    [file.owner?.name, file.owner?.email, file.userId].filter(Boolean).join(' · ') || undefined;
/** فایل‌های بزرگ‌تر از این حجم با آپلود تکه‌تکه (S3 multipart) ارسال می‌شوند */
const CHUNK_UPLOAD_THRESHOLD = 10 * 1024 * 1024;

const CATEGORIES: Array<{ id: FileCategory; label: string; color: string }> = [
    { id: 'all', label: 'همه فایل‌ها', color: '#2673ee' },
    { id: 'images', label: 'تصاویر', color: '#6366f1' },
    { id: 'documents', label: 'اسناد', color: '#f59e0b' },
    { id: 'videos', label: 'ویدیوها', color: '#ef4444' },
    { id: 'audios', label: 'صداها', color: '#22c55e' },
    { id: 'other', label: 'سایر', color: '#a78bfa' },
];

/** دسته‌های مجاز در حالت picker (accept) */
const ACCEPT_CATEGORY_MAP: Record<FilePickerAccept, FileCategory[]> = {
    all: ['all', 'images', 'documents', 'videos', 'audios', 'other'],
    images: ['all', 'images'],
    videos: ['all', 'videos'],
    audios: ['all', 'audios'],
    documents: ['all', 'documents'],
};

export interface FileManagerProps {
    /** حالت انتخاب فایل برای ماژول‌های دیگر */
    pickerMode?: boolean;
    multiple?: boolean;
    /** محدودسازی دسته‌ها در حالت picker */
    accept?: FilePickerAccept;
    selectedIds?: string[];
    onSelectionChange?: (files: FileManagerFile[]) => void;
    /** ارتفاع ناحیه اسکرول (پیش‌فرض: آزاد) */
    height?: number | string;
}

export default function FileManager({
    pickerMode = false,
    multiple = false,
    accept = 'all',
    selectedIds = [],
    onSelectionChange,
    height,
}: FileManagerProps) {
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();

    const [files, setFiles] = useState<FileManagerFile[]>([]);
    const [serverTotal, setServerTotal] = useState(0);
    const [serverStats, setServerStats] = useState<FileBrowseStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<FileManagerView>('list');
    const [category, setCategory] = useState<FileCategory>('all');
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    /** فیلترهای پیشرفته (کاربر، منبع، نسخه، حجم، تاریخ) — همه بدون محدودیت به کاربر واردشده */
    const [filters, setFilters] = useState<FileFilters>(EMPTY_FILE_FILTERS);
    /** فهرست یکپارچهٔ استودیو (آپلود + خروجی تولیدی)؛ در اپ‌های دیگر /api/file/explore */
    const [unifiedAvailable, setUnifiedAvailable] = useState(true);
    const [page, setPage] = useState(1);
    const [menuFor, setMenuFor] = useState<string | null>(null);
    /** اگر آیتم در سطرهای آخر باشد منو به سمت بالا باز می‌شود تا بریده نشود */
    const [menuUp, setMenuUp] = useState(false);
    const [previewFile, setPreviewFile] = useState<FileManagerFile | null>(null);
    const [previewFocusRelated, setPreviewFocusRelated] = useState(false);
    const [uploadState, setUploadState] = useState<{ name: string; progress: number } | null>(null);
    const uploadInputRef = useRef<HTMLInputElement>(null);
    const viewInitRef = useRef(false);
    const relatedRef = useRef<HTMLElement>(null);

    // بازیابی نمای آخر کاربر
    useEffect(() => {
        if (viewInitRef.current) return;
        viewInitRef.current = true;
        const saved = typeof window !== 'undefined' ? window.localStorage.getItem('files.view') : null;
        if (saved === 'grid' || saved === 'list') setView(saved);
    }, []);

    useEffect(() => {
        if (!previewFile || !previewFocusRelated) return;
        relatedRef.current?.scrollIntoView({ block: 'nearest' });
    }, [previewFile, previewFocusRelated]);

    const changeView = (next: FileManagerView) => {
        setView(next);
        window.localStorage.setItem('files.view', next);
    };

    const adminBrowse = !pickerMode;

    const loadPicker = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const { files: list } = await listFiles(baseUrl, token);
            setFiles(list);
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, [baseUrl, token]);

    const loadAdmin = useCallback(async () => {
        if (!token) return;
        const query = {
            page,
            limit: PAGE_SIZE,
            q: debouncedSearch || undefined,
            bucket: category === 'all' ? undefined : category,
            includeRelated: true,
            ...filtersToQuery(filters),
        };
        try {
            setLoading(true);
            const statsPromise = getFileStats(baseUrl, token).catch(() => null);
            let list: { files: FileManagerFile[]; totalItems: number };
            try {
                if (!unifiedAvailable) throw new AdminFilesUnavailableError();
                list = await listAdminFiles(baseUrl, token, query);
            } catch (error) {
                if (!(error instanceof AdminFilesUnavailableError)) throw error;
                // اپ غیر استودیو: فقط آپلودها (منبع معنی ندارد)
                setUnifiedAvailable(false);
                list = await listFiles(baseUrl, token, query);
            }
            const statsRes = await statsPromise;
            setFiles(list.files);
            setServerTotal(list.totalItems);
            if (statsRes) setServerStats(statsRes);
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, [baseUrl, token, unifiedAvailable, page, debouncedSearch, category, filters]);

    const loadOwners = useCallback((q: string) => (token ? searchFileOwners(baseUrl, token, q) : Promise.resolve([])), [baseUrl, token]);

    const reload = useCallback(() => {
        if (pickerMode) void loadPicker();
        else void loadAdmin();
    }, [pickerMode, loadPicker, loadAdmin]);

    useEffect(() => {
        const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 350);
        return () => window.clearTimeout(timer);
    }, [search]);

    const changeFilters = (next: FileFilters) => {
        setFilters(next);
        // اسناد/سایر در خروجی‌های تولیدی وجود ندارند
        if (next.source === 'generated' && (category === 'documents' || category === 'other')) setCategory('all');
    };

    useEffect(() => {
        if (pickerMode) void loadPicker();
    }, [pickerMode, loadPicker]);

    const adminFilterKey = `${category}|${debouncedSearch}|${JSON.stringify(filters)}`;
    const adminFilterRef = useRef(adminFilterKey);
    useEffect(() => {
        if (pickerMode) return;
        if (adminFilterRef.current !== adminFilterKey) {
            adminFilterRef.current = adminFilterKey;
            if (page !== 1) {
                setPage(1);
                return;
            }
        }
        void loadAdmin();
    }, [pickerMode, adminFilterKey, page, loadAdmin]);

    const clientStats = useMemo(() => {
        const map = new Map<FileCategory, { count: number; totalSize: number }>();
        for (const file of files) {
            const cat = detectFileCategory(file);
            const entry = map.get(cat) || { count: 0, totalSize: 0 };
            entry.count += 1;
            entry.totalSize += file.size || 0;
            map.set(cat, entry);
        }
        const all = { count: 0, totalSize: 0 };
        map.forEach((v) => {
            all.count += v.count;
            all.totalSize += v.totalSize;
        });
        return { map, all };
    }, [files]);

    const categoryStat = (id: FileCategory) => {
        if (adminBrowse && serverStats) {
            if (id === 'all') return serverStats.all;
            return serverStats.buckets[id] || { count: 0, totalSize: 0 };
        }
        if (id === 'all') return clientStats.all;
        return clientStats.map.get(id) || { count: 0, totalSize: 0 };
    };

    const visibleCategories = useMemo(() => {
        const allowed = ACCEPT_CATEGORY_MAP[accept] || ACCEPT_CATEGORY_MAP.all;
        return CATEGORIES.filter((c) => allowed.includes(c.id));
    }, [accept]);

    const visibleFiles = useMemo(() => {
        if (adminBrowse) return files;
        const q = search.trim().toLowerCase();
        return files
            .filter((f) => (category === 'all' ? true : detectFileCategory(f) === category))
            .filter((f) =>
                q ? (f.originalname || f.name || f.userId || '').toLowerCase().includes(q) : true,
            )
            .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    }, [adminBrowse, files, category, search]);

    const resultCount = adminBrowse ? serverTotal : visibleFiles.length;
    const totalPages = Math.max(1, Math.ceil(resultCount / PAGE_SIZE));
    const currentPage = adminBrowse ? page : Math.min(page, totalPages);
    const pageFiles = useMemo(
        () => (adminBrowse ? files : visibleFiles.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)),
        [adminBrowse, files, visibleFiles, currentPage],
    );

    useEffect(() => {
        if (!pickerMode) return;
        setPage(1);
    }, [pickerMode, category, search]);

    // ─── انتخاب فایل (picker) ───
    const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

    const toggleSelect = (file: FileManagerFile) => {
        if (!pickerMode || !onSelectionChange) return;
        if (multiple) {
            const next = selectedIds.includes(file._id)
                ? selectedIds.filter((id) => id !== file._id)
                : [...selectedIds, file._id];
            onSelectionChange(files.filter((f) => next.includes(f._id)));
        } else {
            onSelectionChange(selectedIds.length === 1 && selectedIds[0] === file._id ? [] : [file]);
        }
    };

    const handleRowActivate = (file: FileManagerFile) => {
        if (pickerMode) {
            toggleSelect(file);
        } else {
            setPreviewFocusRelated(false);
            setPreviewFile(file);
        }
    };

    // ─── آپلود ───
    const isPausedRef = useRef({ current: false });

    const handleFilesChosen = async (list: FileList | null) => {
        if (!list || list.length === 0 || !token) return;
        const selected = Array.from(list);
        for (let i = 0; i < selected.length; i++) {
            const file = selected[i];
            setUploadState({ name: file.name, progress: 0 });
            try {
                if (file.size > CHUNK_UPLOAD_THRESHOLD) {
                    await uploadFileInChunks({
                        file,
                        token,
                        baseUrl,
                        isPausedRef: isPausedRef.current,
                        onProgress: (progress) => setUploadState({ name: file.name, progress }),
                    });
                } else {
                    await handleUpload(
                        file,
                        token,
                        (p: { progress: number }) => setUploadState({ name: file.name, progress: p.progress }),
                        () => undefined,
                        () => undefined,
                    );
                }
            } catch (e) {
                ErrorToaster(e);
            }
        }
        setUploadState(null);
        if (uploadInputRef.current) uploadInputRef.current.value = '';
        SuccessToaster({ message: 'آپلود کامل شد' });
        reload();
    };

    // ─── حذف ───
    const handleDelete = async (file: FileManagerFile) => {
        const relatedCount = file.related?.length || 0;
        const message = relatedCount
            ? `فایل «${fileDisplayName(file)}» و ${relatedCount} فایل مرتبط حذف شوند؟`
            : `فایل «${fileDisplayName(file)}» حذف شود؟`;
        if (!confirm(message)) return;
        try {
            await deleteFile(baseUrl, token!, file._id);
            SuccessToaster({ message: 'فایل حذف شد' });
            setMenuFor(null);
            setPreviewFile((current) => {
                if (!current) return current;
                if (current._id === file._id) return null;
                return {
                    ...current,
                    related: current.related?.filter((item) => item._id !== file._id),
                };
            });
            reload();
        } catch (e) {
            ErrorToaster(e);
        }
    };

    const handleDownload = (file: FileManagerFile) => {
        if (!file.path) return;
        const a = document.createElement('a');
        a.href = file.path;
        a.download = fileDisplayName(file);
        a.target = '_blank';
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setMenuFor(null);
    };

    const toggleMenu = (file: FileManagerFile) => {
        if (menuFor === file._id) {
            setMenuFor(null);
            return;
        }
        const idx = pageFiles.findIndex((f) => f._id === file._id);
        setMenuUp(idx >= pageFiles.length - 2);
        setMenuFor(file._id);
    };

    const closeMenu = () => setMenuFor(null);

    const openDetails = (file: FileManagerFile, focusRelated = false) => {
        setPreviewFocusRelated(focusRelated);
        setPreviewFile(file);
        setMenuFor(null);
    };

    const renderActionMenu = (file: FileManagerFile) => (
        <>
            <button type="button" className={styles.menuItem} onClick={() => openDetails(file)}>
                <LuEye /> پیش‌نمایش
            </button>
            <button type="button" className={styles.menuItem} onClick={() => openDetails(file, true)}>
                <LuImages /> فایل‌های مرتبط{file.related?.length ? ` (${file.related.length})` : ''}
            </button>
            <button type="button" className={styles.menuItem} onClick={() => handleDownload(file)}>
                <LuDownload /> دانلود
            </button>
            <button
                type="button"
                className={styles.menuItem}
                onClick={() => {
                    if (file.path) CopyToClipboard(file.path);
                    setMenuFor(null);
                }}
            >
                <LuCopy /> کپی لینک
            </button>
            {/* خروجی تولیدی در پروژهٔ کاربر استفاده می‌شود — از این صفحه فقط‌خواندنی است */}
            {!isGeneratedFile(file) && (
                <button type="button" className={`${styles.menuItem} ${styles.danger}`} onClick={() => handleDelete(file)}>
                    <LuTrash2 /> حذف
                </button>
            )}
        </>
    );

    // ─── رندر ───
    const renderBadge = (file: FileManagerFile, large = false) => (
        <div className={`${styles.fileBadge} ${large ? styles.lg : ''}`} style={{ background: fileBadgeColor(file) }}>
            {fileExtLabel(file)}
        </div>
    );

    const renderKebab = (file: FileManagerFile) => (
        <div className={styles.rowActions}>
            <button
                type="button"
                className={styles.kebabBtn}
                aria-label="عملیات"
                onClick={(e) => {
                    e.stopPropagation();
                    toggleMenu(file);
                }}
            >
                ⋮
            </button>
            {menuFor === file._id && (
                <div className={`${styles.menu} ${menuUp ? styles.menuUp : ''}`} onClick={(e) => e.stopPropagation()}>
                    {renderActionMenu(file)}
                </div>
            )}
        </div>
    );

    if (pickerMode && loading && files.length === 0) {
        return (
            <div className={styles.manager} style={height ? { height } : undefined}>
                <LoadingState />
            </div>
        );
    }

    const contentStyle = height ? { height, overflowY: 'auto' as const } : undefined;

    return (
        <div
            className={`${styles.manager} ${styles.rtl}`}
            onClick={() => {
                if (menuFor) closeMenu();
            }}
        >
            {/* نوار جستجو */}
            <div className={styles.searchBar}>
                <span className={styles.searchIcon}>
                    <LuSearch />
                </span>
                <input
                    type="text"
                    placeholder="جستجو در نام فایل‌ها..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {adminBrowse && (
                <FileFilterBar
                    value={filters}
                    onChange={changeFilters}
                    showSource={unifiedAvailable}
                    resultCount={serverTotal}
                    loadOwners={loadOwners}
                />
            )}

            <CategoryStrip
                active={category}
                onSelect={setCategory}
                items={visibleCategories.map((item) => {
                    const stat = categoryStat(item.id);
                    return { ...item, count: stat.count, totalSize: stat.totalSize };
                })}
            />

            {/* تولبار */}
            <div className={styles.toolbar}>
                <div className={styles.breadcrumb}>
                    <span className={styles.crumbIcon}>
                        <LuFolderOpen />
                    </span>
                    <button type="button" className={styles.crumbLink} onClick={() => setCategory('all')}>
                        root
                    </button>
                    {category !== 'all' && (
                        <>
                            <span className={styles.crumbSep}>/</span>
                            <span className={styles.crumbCurrent}>
                                {CATEGORIES.find((c) => c.id === category)?.label}
                            </span>
                        </>
                    )}
                </div>
                <div className={styles.toolbarActions}>
                    {uploadState ? (
                        <button type="button" className={styles.primaryBtn} disabled>
                            <LuLoader /> در حال آپلود...
                        </button>
                    ) : (
                        <button type="button" className={styles.primaryBtn} onClick={() => uploadInputRef.current?.click()}>
                            <LuUpload /> آپلود فایل
                        </button>
                    )}
                    <button
                        type="button"
                        className={styles.iconBtn}
                        aria-label="به‌روزرسانی"
                        title="به‌روزرسانی"
                        onClick={() => reload()}
                    >
                        <LuRefreshCw />
                    </button>
                    <button
                        type="button"
                        className={`${styles.iconBtn} ${view === 'list' ? styles.active : ''}`}
                        aria-label="نمای لیست"
                        title="نمای لیست"
                        onClick={() => changeView('list')}
                    >
                        <LuList />
                    </button>
                    <button
                        type="button"
                        className={`${styles.iconBtn} ${view === 'grid' ? styles.active : ''}`}
                        aria-label="نمای گرید"
                        title="نمای گرید"
                        onClick={() => changeView('grid')}
                    >
                        <LuGrid2X2 />
                    </button>
                </div>
            </div>

            <input
                ref={uploadInputRef}
                type="file"
                multiple
                hidden
                onChange={(e) => void handleFilesChosen(e.target.files)}
            />

            {uploadState && (
                <div className={styles.uploadBar}>
                    <span style={{ direction: 'ltr' }}>{uploadState.name}</span>
                    <div className={styles.uploadTrack}>
                        <div className={styles.uploadFill} style={{ width: `${uploadState.progress}%` }} />
                    </div>
                    <span className={styles.uploadPct}>{uploadState.progress}%</span>
                </div>
            )}

            <div className={styles.layout}>
                <div className={styles.content} style={contentStyle}>
                    {loading && pageFiles.length === 0 ? (
                        <LoadingState />
                    ) : pageFiles.length === 0 ? (
                        <div className={styles.empty}>
                            <div className={styles.emptyIcon}>
                                <LuFile />
                            </div>
                            {search || countActiveFilters(filters)
                                ? 'فایلی با این جستجو/فیلتر پیدا نشد'
                                : filters.source === 'generated'
                                    ? 'هنوز هیچ کاربری خروجی تولید نکرده است'
                                    : 'هنوز فایلی اینجا نیست — اولین فایل را آپلود کنید'}
                        </div>
                    ) : view === 'list' ? (
                        <div className={styles.tableWrap}>
                            <table className={`${styles.dataTable} ${styles.fileTable}`}>
                                <colgroup>
                                    <col />
                                    <col className={styles.colRelated} />
                                    <col className={styles.colSize} />
                                    <col className={styles.colOwner} />
                                    <col className={styles.colDate} />
                                    <col className={styles.colActions} />
                                </colgroup>
                                <thead>
                                    <tr>
                                        <th>نام</th>
                                        <th title="بندانگشتی و نسخه‌های ساخته‌شده از همین فایل">فایل‌های مرتبط</th>
                                        <th>حجم</th>
                                        <th>مالک</th>
                                        <th>تاریخ</th>
                                        <th aria-label="عملیات" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {pageFiles.map((file) => (
                                        <tr
                                            key={file._id}
                                            onClick={() => handleRowActivate(file)}
                                            style={pickerMode ? { cursor: 'pointer' } : undefined}
                                        >
                                            <td data-label="نام">
                                                <div className={styles.nameCell}>
                                                    {pickerMode && selectedSet.has(file._id) && (
                                                        <span className={styles.checkBadge}>
                                                            <LuCheck />
                                                        </span>
                                                    )}
                                                    <FileTypeIcon file={file} />
                                                    <span className={styles.nameText} title={fileDisplayName(file)}>
                                                        {fileDisplayName(file)}
                                                    </span>
                                                    {isGeneratedFile(file) && <span className={styles.aiBadge} title="ساخته‌شده با هوش مصنوعی در استودیو">AI</span>}
                                                </div>
                                            </td>
                                            <td data-label="فایل‌های مرتبط" onClick={(e) => e.stopPropagation()}>
                                                {file.related?.length
                                                    ? <FileRelatedStrip files={file.related} onOpen={(item) => openDetails(item)} max={3} />
                                                    : <span className={styles.muted}>—</span>}
                                            </td>
                                            <td data-label="حجم" className={styles.muted}>{sizeLabel(file)}</td>
                                            <td data-label="مالک" className={`${styles.muted} ${styles.ownerCell}`} title={ownerTitle(file)}>{ownerLabel(file)}</td>
                                            <td data-label="تاریخ" className={styles.muted}>{isoToJalaliString(file.createdAt)}</td>
                                            <td onClick={(e) => e.stopPropagation()}>{renderKebab(file)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className={styles.grid}>
                            {pageFiles.map((file) => {
                                const preview = filePreviewUrl(file);
                                const isSelected = selectedSet.has(file._id);
                                return (
                                    <div
                                        key={file._id}
                                        className={`${styles.card} ${isSelected ? styles.selected : ''}`}
                                        onClick={() => handleRowActivate(file)}
                                    >
                                        <div className={styles.cardPreview}>
                                            {preview ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={preview} alt={fileDisplayName(file)} loading="lazy" />
                                            ) : (
                                                <FileTypeIcon file={file} />
                                            )}
                                            <button
                                                type="button"
                                                className={`${styles.kebabBtn} ${styles.cardKebab}`}
                                                aria-label="عملیات"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleMenu(file);
                                                }}
                                            >
                                                ⋮
                                            </button>
                                            {menuFor === file._id && (
                                                <div className={styles.menu} style={{ top: '40px' }} onClick={(e) => e.stopPropagation()}>
                                                    {renderActionMenu(file)}
                                                </div>
                                            )}
                                            {pickerMode && isSelected && (
                                                <span className={styles.checkBadge}>
                                                    <LuCheck />
                                                </span>
                                            )}
                                        </div>
                                        <div className={styles.cardBody}>
                                            <p className={styles.cardName} title={fileDisplayName(file)}>
                                                {fileDisplayName(file)}
                                            </p>
                                            <span className={styles.cardMeta}>
                                                {isoToJalaliString(file.createdAt)} | {sizeLabel(file)}
                                            </span>
                                            <FileRelatedStrip files={file.related} onOpen={(item) => openDetails(item)} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* صفحه‌بندی */}
                    {totalPages > 1 && (
                        <div className={styles.pagination}>
                            <span>
                                {resultCount.toLocaleString('fa-IR')} فایل — صفحه {currentPage} از {totalPages}
                            </span>
                            <div className={styles.pageBtns}>
                                <button
                                    type="button"
                                    className={styles.pageBtn}
                                    disabled={currentPage === 1}
                                    onClick={() => setPage(currentPage - 1)}
                                    aria-label="قبلی"
                                >
                                    <LuChevronRight />
                                </button>
                                {Array.from({ length: totalPages })
                                    .slice(Math.max(0, currentPage - 3), Math.max(0, currentPage - 3) + 5)
                                    .map((_, idx) => {
                                        const p = Math.max(0, currentPage - 3) + idx + 1;
                                        return (
                                            <button
                                                key={p}
                                                type="button"
                                                className={`${styles.pageBtn} ${p === currentPage ? styles.active : ''}`}
                                                onClick={() => setPage(p)}
                                            >
                                                {p}
                                            </button>
                                        );
                                    })}
                                <button
                                    type="button"
                                    className={styles.pageBtn}
                                    disabled={currentPage === totalPages}
                                    onClick={() => setPage(currentPage + 1)}
                                    aria-label="بعدی"
                                >
                                    <LuChevronLeft />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* فوتر انتخاب در حالت picker */}
                    {pickerMode && (
                        <div className={styles.pickerFooter}>
                            <span className={styles.pickerHint}>
                                {multiple
                                    ? `${selectedIds.length} فایل انتخاب شده`
                                    : selectedIds.length > 0
                                        ? 'یک فایل انتخاب شده'
                                        : 'روی یک فایل کلیک کنید تا انتخاب شود'}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* پیش‌نمایش فایل */}
            {previewFile && (
                <div className={styles.modalOverlay} onClick={() => setPreviewFile(null)}>
                    <div className={styles.detailDialog} onClick={(e) => e.stopPropagation()}>
                        <header className={styles.detailHead}>
                            <FileTypeIcon file={previewFile} />
                            <div className={styles.detailTitle}>
                                <h2 title={fileDisplayName(previewFile)}>{fileDisplayName(previewFile)}</h2>
                                <p>{relatedFileLabel(previewFile)} · {sizeLabel(previewFile)}</p>
                            </div>
                            <button type="button" className={styles.iconBtn} onClick={() => setPreviewFile(null)} aria-label="بستن">
                                <LuX />
                            </button>
                        </header>
                        <div className={styles.detailBody}>
                            <div className={styles.detailLayout}>
                                <div className={styles.detailStage}>
                                    {(() => {
                                        const ext = (previewFile.ext || previewFile.name?.split('.').pop() || '').toLowerCase();
                                        if (['mp4', 'webm', 'mov'].includes(ext) || previewFile.mimetype?.startsWith('video/')) {
                                            return <video src={previewFile.path || ''} controls />;
                                        }
                                        if (previewFile.mimetype?.startsWith('audio/')) {
                                            return <audio src={previewFile.path || ''} controls />;
                                        }
                                        const url = filePreviewUrl(previewFile);
                                        if (url) {
                                            // eslint-disable-next-line @next/next/no-img-element
                                            return <img src={url} alt={fileDisplayName(previewFile)} />;
                                        }
                                        return renderBadge(previewFile, true);
                                    })()}
                                </div>
                                <dl className={styles.detailMeta}>
                                    <div className={styles.detailMetaRow}>
                                        <dt>حجم</dt>
                                        <dd>{sizeLabel(previewFile)}</dd>
                                    </div>
                                    <div className={styles.detailMetaRow}>
                                        <dt>تاریخ</dt>
                                        <dd>{isoToJalaliString(previewFile.createdAt)}</dd>
                                    </div>
                                    <div className={styles.detailMetaRow}>
                                        <dt>نوع</dt>
                                        <dd title={previewFile.mimetype || ''}>{previewFile.mimetype || '—'}</dd>
                                    </div>
                                    <div className={styles.detailMetaRow}>
                                        <dt>نسخه</dt>
                                        <dd>{relatedFileLabel(previewFile)}</dd>
                                    </div>
                                    <div className={styles.detailMetaRow}>
                                        <dt>مالک</dt>
                                        <dd title={ownerTitle(previewFile)}>{ownerLabel(previewFile)}</dd>
                                    </div>
                                    {isGeneratedFile(previewFile) && previewFile.metadata?.nodeLabel ? (
                                        <div className={styles.detailMetaRow}>
                                            <dt>نود</dt>
                                            <dd title={String(previewFile.metadata?.nodeType || '')}>{String(previewFile.metadata.nodeLabel)}</dd>
                                        </div>
                                    ) : null}
                                </dl>
                            </div>
                            <section
                                ref={relatedRef}
                                className={`${styles.detailRelated} ${previewFocusRelated ? styles.detailRelatedFocus : ''}`}
                            >
                                <h3>فایل‌های مرتبط{previewFile.related?.length ? ` (${previewFile.related.length})` : ''}</h3>
                                {previewFile.related?.length ? (
                                    <div className={styles.detailRelatedGrid}>
                                        {previewFile.related.map((related) => {
                                            const thumb = filePreviewUrl(related);
                                            return (
                                                <article key={related._id} className={styles.detailRelatedCard}>
                                                    {thumb ? (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img src={thumb} alt={relatedFileLabel(related)} />
                                                    ) : (
                                                        <span className={styles.detailRelatedFallback}>
                                                            <FileTypeIcon file={related} />
                                                        </span>
                                                    )}
                                                    <strong>{relatedFileLabel(related)}</strong>
                                                    <span>{sizeLabel(related)}</span>
                                                    <div className={styles.detailRelatedActions}>
                                                        <button type="button" onClick={() => openDetails(related)}>مشاهده</button>
                                                        {!isGeneratedFile(related) && (
                                                            <button type="button" className={styles.dangerText} onClick={() => void handleDelete(related)}>حذف</button>
                                                        )}
                                                    </div>
                                                </article>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className={styles.detailRelatedEmpty}>فایل مرتبطی برای این مورد نیست.</p>
                                )}
                            </section>
                        </div>
                        <footer className={styles.detailFoot}>
                            <button type="button" className={styles.primaryBtn} onClick={() => handleDownload(previewFile)}>
                                <LuDownload /> دانلود
                            </button>
                            <button
                                type="button"
                                className={styles.secondaryBtn}
                                onClick={() => previewFile.path && CopyToClipboard(previewFile.path)}
                            >
                                <LuCopy /> کپی لینک
                            </button>
                            {!isGeneratedFile(previewFile) && (
                                <button type="button" className={`${styles.secondaryBtn} ${styles.detailDelete}`} onClick={() => void handleDelete(previewFile)}>
                                    <LuTrash2 /> حذف
                                </button>
                            )}
                        </footer>
                    </div>
                </div>
            )}
        </div>
    );
}
