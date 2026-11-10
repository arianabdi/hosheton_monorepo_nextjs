'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { 
    LuPlus, 
    LuPencil, 
    LuTrash2, 
    LuX, 
    LuSave, 
    LuImage, 
    LuFilm, 
    LuVolume2, 
    LuFileText, 
    LuSearch, 
    LuChevronDown, 
    LuFolder, 
    LuHardDrive,
    LuClock,
    LuLayers
} from 'react-icons/lu';
import {
    studioAssetsApi,
    STUDIO_STORAGE_LIMIT_BYTES,
    getStudioAssetMediaUrl,
    getStudioAssetPromptText,
    type StudioAssetItem,
    type StudioAssetType,
    type StudioStorageUsage,
} from '@/app/(developers)/projects/lib/studio-assets-api';
import { getApiErrorMessage } from '@/app/(developers)/projects/lib/api-client';
import { GalleryModal, type GalleryFileItem } from '@/app/(developers)/gallery';
import { MiniAudioPlayer } from '@/app/(developers)/projects/[projectId]/components/MiniAudioPlayer';
import TableEmptyState from '@/app/(developers)/components/TableEmptyState';
import pageStyles from '@/app/(developers)/projects/ProjectsPage.module.scss';
import styles from './AssetsPage.module.scss';
import { usePageLoading } from '@/app/components/PageTransition';
import { useTranslation } from 'react-i18next';
import { formatAppDate, formatAppNumber } from '@/app/lib/i18n/formatLocaleNumber';
import { isRtlLanguage } from '@/app/lib/i18n/config';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { promptGuestLogin } from '@/app/components/guest/guestAccess';

type SortOption = 'newest' | 'oldest' | 'name';

function getAssetHashtags(item: StudioAssetItem, t: (key: string) => string): string[] {
    const tags = [t('studio')];
    if (item.type === 'prompt') tags.push(t('prompt'), t('idea'));
    else if (item.type === 'image') tags.push(t('image'), t('render'));
    else if (item.type === 'video') tags.push(t('video'), t('animated'));
    else if (item.type === 'audio') tags.push(t('audio'), t('music'));
    
    const words = item.name.split(/\s+/).filter(w => w.length > 2 && w.length < 8 && !w.includes('(') && !w.includes(')'));
    if (words.length > 0 && !tags.includes(words[0])) {
        tags.push(words[0]);
    }
    return tags.map(tag => `#${tag}`);
}

function AssetPreview({ item }: { item: StudioAssetItem }) {
    const url = getStudioAssetMediaUrl(item);

    if (item.type === 'prompt') {
        const promptText = (getStudioAssetPromptText(item) || '—').replace(/\s*\n+\s*/g, ' ').trim();
        return (
            <div className={styles.previewPrompt}>
                <p className={styles.previewText}>{promptText}</p>
            </div>
        );
    }

    if (item.type === 'image' && url) {
        return (
            <div className={styles.previewThumb}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={item.name} loading="lazy" />
            </div>
        );
    }

    if (item.type === 'video' && url) {
        return (
            <div className={styles.previewThumb}>
                <video src={url} muted playsInline preload="metadata" />
            </div>
        );
    }

    if (item.type === 'audio' && url) {
        return (
            <div className={styles.previewAudio}>
                <MiniAudioPlayer src={url} title={item.name} compact />
            </div>
        );
    }

    return <span className={styles.previewEmpty}>—</span>;
}

function formatStorageSize(bytes: number, lang: string, t: (key: string, opts?: Record<string, string>) => string): string {
    const gb = bytes / (1024 ** 3);
    if (gb >= 1) {
        const n = gb < 10 ? gb.toFixed(1) : String(Math.round(gb));
        return t('gb', { n: formatAppNumber(n, lang) });
    }
    const mb = bytes / (1024 ** 2);
    if (mb >= 1) {
        return t('mb', { n: formatAppNumber(String(Math.round(mb)), lang) });
    }
    const kb = bytes / 1024;
    return t('kb', { n: formatAppNumber(String(Math.round(kb)), lang) });
}

function assetDetails(item: StudioAssetItem): string {
    if (item.type === 'prompt') {
        return getStudioAssetPromptText(item);
    }
    const payload = item.payload as { fileName?: string; url?: string };
    return payload.fileName || getStudioAssetMediaUrl(item) || '—';
}

export default function StudioAssetsPage() {
    const { t, i18n } = useTranslation('assets');
    const { t: tc } = useTranslation('common');
    const lang = i18n.language;

    const [items, setItems] = useState<StudioAssetItem[]>([]);
    const [loading, setLoading] = useState(true);
    usePageLoading(loading);
    const [error, setError] = useState<string | null>(null);
    const [storageUsage, setStorageUsage] = useState<StudioStorageUsage | null>(null);

    // فیلترها و نماها
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
    const [selectedFolder, setSelectedFolder] = useState<string>('all');
    const [showAllFolders, setShowAllFolders] = useState(true);
    const [sortBy, setSortBy] = useState<SortOption>('newest');

    // مدیریت مدال‌ها و ساخت دارایی جدید
    const [formOpen, setFormOpen] = useState(false);
    const [galleryOpen, setGalleryOpen] = useState(false);
    // منو زیر همان دکمه‌ای باز می‌شود که کلیک شده (نوار ابزار یا حالت خالی)
    const [newMenuAnchor, setNewMenuAnchor] = useState<'toolbar' | 'empty' | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [promptText, setPromptText] = useState('');
    const [saving, setSaving] = useState(false);
    
    // منوهای کارت‌ها
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

    const virtualFolders = useMemo(() => [
        { id: 'all', name: t('all_mine'), label: t('total_files') },
        { id: 'prompt', name: t('prompts_title'), label: t('prompts') },
        { id: 'image', name: t('images_title'), label: t('images') },
        { id: 'video', name: t('videos_title'), label: t('videos') },
        { id: 'audio', name: t('audio_title'), label: t('audio') },
    ], [t]);

    // مهمان: دارایی ندارد — بدون درخواست حساب، حالت خالی؛ «جدید» پنجره‌ی ورود را باز می‌کند
    const isGuest = !useAuthStore((state) => state.token);

    const load = useCallback(async () => {
        if (isGuest) {
            setItems([]);
            setStorageUsage(null);
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const [assetsData, storageData] = await Promise.all([
                studioAssetsApi.list(),
                studioAssetsApi.getStorageUsage(),
            ]);
            setItems(assetsData.assets ?? []);
            setStorageUsage(storageData);
        } catch (err) {
            setError(getApiErrorMessage(err, t('load_error')));
            setItems([]);
            setStorageUsage(null);
        } finally {
            setLoading(false);
        }
    }, [t, isGuest]);

    const refreshStorageUsage = useCallback(async () => {
        try {
            const storageData = await studioAssetsApi.getStorageUsage();
            setStorageUsage(storageData);
        } catch {
            // storage bar is non-blocking; keep previous values on refresh failure
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const resetForm = () => {
        setFormOpen(false);
        setEditingId(null);
        setName('');
        setPromptText('');
    };

    const handleNewAsset = (anchor: 'toolbar' | 'empty') => {
        if (isGuest) {
            promptGuestLogin();
            return;
        }
        setNewMenuAnchor((current) => (current === anchor ? null : anchor));
    };

    const renderNewAssetMenu = (centered = false) => (
        <div className={`${styles.newAssetDropdown} ${centered ? styles.newAssetDropdownCentered : ''}`}>
            <button type="button" onClick={() => { setNewMenuAnchor(null); setEditingId(null); setName(''); setPromptText(''); setFormOpen(true); }}>
                <LuFileText size={14} /> {t('new_manual_prompt')}
            </button>
            <button type="button" onClick={() => { setNewMenuAnchor(null); setGalleryOpen(true); }}>
                <LuImage size={14} /> {t('pick_gallery')}
            </button>
        </div>
    );

    const startEdit = (item: StudioAssetItem) => {
        setActiveMenuId(null);
        if (item.type !== 'prompt') {
            const newName = window.prompt(t('asset_name'), item.name);
            if (!newName?.trim()) return;
            studioAssetsApi.update(item._id, { name: newName.trim() })
                .then(({ asset }) => setItems((prev) => prev.map((it) => (it._id === item._id ? asset : it))))
                .catch((err) => setError(getApiErrorMessage(err, t('edit_error'))));
            return;
        }
        setEditingId(item._id);
        setName(item.name);
        setPromptText(getStudioAssetPromptText(item));
        setFormOpen(true);
    };

    const handleSubmitPrompt = async () => {
        if (!name.trim() || !promptText.trim()) return;
        setSaving(true);
        setError(null);
        try {
            if (editingId) {
                const { asset } = await studioAssetsApi.update(editingId, {
                    name: name.trim(),
                    payload: { promptText },
                });
                setItems((prev) => prev.map((it) => (it._id === editingId ? asset : it)));
            } else {
                const { asset } = await studioAssetsApi.create({
                    type: 'prompt',
                    name: name.trim(),
                    payload: { promptText },
                });
                setItems((prev) => [asset, ...prev]);
            }
            resetForm();
            await refreshStorageUsage();
        } catch (err) {
            setError(getApiErrorMessage(err, t('save_error')));
        } finally {
            setSaving(false);
        }
    };

    const handleGalleryPick = async (item: GalleryFileItem) => {
        const assetType = item.type as Exclude<StudioAssetType, 'prompt'>;
        const defaultName = item.nodeLabel || t(assetType);
        const assetName = window.prompt(t('name_prompt'), defaultName);
        if (!assetName?.trim()) return;

        setSaving(true);
        setError(null);
        try {
            const { asset } = await studioAssetsApi.create({
                type: assetType,
                name: assetName.trim(),
                payload: { url: item.url, fileName: item.nodeLabel || '' },
            });
            setItems((prev) => [asset, ...prev]);
            setGalleryOpen(false);
            await refreshStorageUsage();
        } catch (err) {
            setError(getApiErrorMessage(err, t('save_error')));
        } finally {
            setSaving(false);
        }
    };

    const handleRemove = async (id: string) => {
        setActiveMenuId(null);
        if (!window.confirm(t('delete_confirm'))) return;
        try {
            await studioAssetsApi.remove(id);
            setItems((prev) => prev.filter((it) => it._id !== id));
            await refreshStorageUsage();
        } catch (err) {
            setError(getApiErrorMessage(err, t('delete_error')));
        }
    };

    // محاسبات و فیلترینگ کلاینت
    const filteredItems = useMemo(() => {
        let list = [...items];

        // ۱. فیلتر بر اساس تب/نوع فایل
        if (selectedTypeFilter !== 'all') {
            list = list.filter((item) => item.type === selectedTypeFilter);
        }

        // ۲. فیلتر بر اساس پوشه انتخابی (اگر تیک "همه پوشه‌ها" خاموش باشد)
        if (!showAllFolders && selectedFolder !== 'all') {
            list = list.filter((item) => item.type === selectedFolder);
        }

        // ۳. فیلتر بر اساس جستجو
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            list = list.filter(
                (item) =>
                    item.name.toLowerCase().includes(query) ||
                    item.type.toLowerCase().includes(query) ||
                    assetDetails(item).toLowerCase().includes(query)
            );
        }

        // ۴. مرتب‌سازی
        if (sortBy === 'newest') {
            list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        } else if (sortBy === 'oldest') {
            list.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
        } else if (sortBy === 'name') {
            list.sort((a, b) => a.name.localeCompare(b.name, lang));
        }

        return list;
    }, [items, selectedTypeFilter, selectedFolder, showAllFolders, searchQuery, sortBy, lang]);

    // محاسبه‌ی تعداد فایل در هر پوشه
    const folderCounts = useMemo(() => {
        const counts: Record<string, number> = {
            all: items.length,
            prompt: items.filter((i) => i.type === 'prompt').length,
            image: items.filter((i) => i.type === 'image').length,
            video: items.filter((i) => i.type === 'video').length,
            audio: items.filter((i) => i.type === 'audio').length,
        };
        return counts;
    }, [items]);

    const galleryTabFilter = useMemo(() => {
        if (selectedTypeFilter === 'image' || selectedTypeFilter === 'video' || selectedTypeFilter === 'audio') {
            return selectedTypeFilter;
        }
        return undefined;
    }, [selectedTypeFilter]);

    const handleToggleShowAll = () => {
        const nextVal = !showAllFolders;
        setShowAllFolders(nextVal);
        if (!nextVal && selectedFolder === 'all') {
            // برای اینکه بلافاصله فیلتر روی دارایی‌ها تأثیر بگذارد، اولین پوشه معتبر را به عنوان پیش‌فرض انتخاب می‌کنیم
            setSelectedFolder('prompt');
        }
    };

    const handleFolderSelect = (folderId: string) => {
        setSelectedFolder(folderId);
        setShowAllFolders(folderId === 'all');
    };

    const handleClearFilters = () => {
        setSearchQuery('');
        setSelectedTypeFilter('all');
        setSelectedFolder('all');
        setShowAllFolders(true);
        setSortBy('newest');
    };

    const hasActiveFilters = Boolean(
        searchQuery.trim()
        || selectedTypeFilter !== 'all'
        || (!showAllFolders && selectedFolder !== 'all')
        || sortBy !== 'newest',
    );

    const storageUsedBytes = storageUsage?.usedBytes ?? 0;
    const storageMaxBytes = storageUsage?.maxBytes ?? STUDIO_STORAGE_LIMIT_BYTES;
    const storageUsedPercent = storageUsage?.usedPercent ?? 0;

    return (
        <div className={`${pageStyles.container}${isRtlLanguage(lang) ? ` ${pageStyles.rtl}` : ''} ${styles.pageOverride}`}>
            
            {/* ─── هدر اصلی کتابخانه دارایی‌ها ─── */}
            <div className={styles.libraryHeader}>
                <div className={styles.titleArea}>
                    <h1 className={styles.libraryTitle}>{t('title')}</h1>
                    <div className={styles.storageUsage}>
                        <div className={styles.progressBar} title={t('storage_title')}>
                            <div
                                className={styles.barFill}
                                style={{ width: `${Math.max(storageUsedPercent, storageUsedBytes > 0 ? 1 : 0)}%` }}
                            />
                        </div>
                        <span className={styles.storageText}>
                            <LuHardDrive size={13} />
                            {t('storage_used', {
                                used: formatStorageSize(storageUsedBytes, lang, t),
                                max: formatStorageSize(storageMaxBytes, lang, t),
                            })}
                        </span>
                    </div>
                </div>

                <div className={styles.toolbarArea}>
                    {/* کادر جستجو */}
                    <div className={styles.searchBox}>
                        <LuSearch className={styles.searchIcon} size={15} />
                        <input
                            type="text"
                            placeholder={t('search_ph')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* دکمه افزودن دارایی جدید */}
                    <div className={styles.newAssetContainer}>
                        <button 
                            type="button" 
                            className={styles.addBtn}
                            onClick={() => handleNewAsset('toolbar')}
                            disabled={saving}
                        >
                            <LuPlus size={16} />
                            {t('add_new')}
                        </button>
                        {newMenuAnchor === 'toolbar' && renderNewAssetMenu()}
                    </div>
                </div>
            </div>

            {/* ─── ردیف فیلترهای پیشرفته (dropdowns) ─── */}
            <div className={styles.filterRow}>
                <div className={styles.dropdownFilter}>
                    <label>{t('file_type')}</label>
                    <div className={styles.selectWrap}>
                        <select 
                            value={selectedTypeFilter} 
                            onChange={(e) => setSelectedTypeFilter(e.target.value)}
                        >
                            <option value="all">{t('all_assets')}</option>
                            <option value="prompt">{t('only_prompts')}</option>
                            <option value="image">{t('only_images')}</option>
                            <option value="video">{t('only_videos')}</option>
                            <option value="audio">{t('only_audio')}</option>
                        </select>
                        <LuChevronDown className={styles.chevron} size={14} />
                    </div>
                </div>

                <div className={styles.dropdownFilter}>
                    <label>{t('content_folders')}</label>
                    <div className={styles.selectWrap}>
                        <select 
                            value={selectedFolder} 
                            onChange={(e) => {
                                setSelectedFolder(e.target.value);
                                setShowAllFolders(false); // وقتی پوشه خاصی انتخاب می‌شود، نمایش همه غیرفعال می‌شود
                            }}
                        >
                            <option value="all">{t('all_folders')}</option>
                            <option value="prompt">{t('folder_prompts')}</option>
                            <option value="image">{t('folder_images')}</option>
                            <option value="video">{t('folder_anim')}</option>
                            <option value="audio">{t('folder_audio')}</option>
                        </select>
                        <LuChevronDown className={styles.chevron} size={14} />
                    </div>
                </div>

                <div className={styles.dropdownFilter}>
                    <label>{t('sort_by')}</label>
                    <div className={styles.selectWrap}>
                        <select 
                            value={sortBy} 
                            onChange={(e) => setSortBy(e.target.value as SortOption)}
                        >
                            <option value="newest">{t('newest')}</option>
                            <option value="oldest">{t('oldest')}</option>
                            <option value="name">{t('alpha')}</option>
                        </select>
                        <LuChevronDown className={styles.chevron} size={14} />
                    </div>
                </div>

                <button type="button" className={styles.clearAllBtn} onClick={handleClearFilters}>
                    {tc('clear_filters')}
                </button>
            </div>

            {/* ارور بالا */}
            {error && <div className={pageStyles.errorBanner}>{error}</div>}

            {/* فرم ساخت پرامپت جدید */}
            {formOpen && (
                <div className={styles.formCard}>
                    <h3 className={styles.formTitle}>
                        {editingId ? t('edit_prompt') : t('create_prompt')}
                    </h3>
                    <div className={styles.formRow}>
                        <label>{t('asset_name')}</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={t('name_ph')}
                        />
                    </div>
                    <div className={styles.formRow}>
                        <label>{t('prompt_text')}</label>
                        <textarea
                            rows={4}
                            value={promptText}
                            onChange={(e) => setPromptText(e.target.value)}
                            placeholder={t('text_ph')}
                        />
                    </div>
                    <div className={styles.formActions}>
                        <button type="button" className={styles.cancelFormBtn} onClick={resetForm}>
                            <LuX size={14} />
                            {tc('cancel')}
                        </button>
                        <button
                            type="button"
                            className={styles.submitFormBtn}
                            disabled={saving || !name.trim() || !promptText.trim()}
                            onClick={handleSubmitPrompt}
                        >
                            <LuSave size={14} />
                            {saving ? tc('saving') : t('save_prompt')}
                        </button>
                    </div>
                </div>
            )}

            {/* ─── بخش پوشه‌ها (Folders) ─── */}
            <section className={styles.foldersSection}>
                <div className={styles.sectionHeaderRow}>
                    <h2 className={styles.sectionTitle}>
                        {t('folders')} <span className={styles.countBadge}>({formatAppNumber(virtualFolders.length, lang)})</span>
                    </h2>
                    
                    <div className={styles.toggleContainer}>
                        <span className={styles.toggleLabel}>{t('show_all_assets')}</span>
                        <button 
                            type="button" 
                            className={`${styles.toggleSwitch} ${showAllFolders ? styles.toggleActive : ''}`}
                            onClick={handleToggleShowAll}
                            aria-label={t('all_folders_switch')}
                        >
                            <span className={styles.switchHandle} />
                        </button>
                    </div>
                </div>

                <div className={styles.foldersGrid}>
                    {virtualFolders.map((folder) => {
                        const isSelected = (!showAllFolders && selectedFolder === folder.id) || (showAllFolders && folder.id === 'all');
                        return (
                            <div 
                                key={folder.id}
                                className={`${styles.folderCard} ${isSelected ? styles.folderCardActive : ''}`}
                                onClick={() => handleFolderSelect(folder.id)}
                            >
                                <div className={styles.folderLeft}>
                                    <LuFolder className={styles.folderIcon} size={18} />
                                    <span className={styles.folderName} title={folder.name}>{folder.name}</span>
                                </div>
                                <span className={styles.folderCount}>
                                    {formatAppNumber(folderCounts[folder.id] ?? 0, lang)}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </section>

            <hr className={styles.sectionDivider} />

            {/* ─── بخش دارایی‌ها (Assets) ─── */}
            <section className={styles.assetsSection}>
                <h2 className={styles.sectionTitle}>
                    {t('title')} <span className={styles.countBadge}>({formatAppNumber(filteredItems.length, lang)})</span>
                </h2>

                {loading ? (
                    <div className={styles.loadingState}>
                        <div className={styles.loadingSpinner} />
                        <p>{t('loading_files')}</p>
                    </div>
                ) : items.length === 0 ? (
                    <TableEmptyState
                        icon={<LuLayers size={32} />}
                        title={t('empty')}
                        description={t('empty_hint')}
                        hint={t('empty_hint2')}
                        primaryLabel={t('add')}
                        onPrimaryClick={() => handleNewAsset('empty')}
                        primaryMenu={newMenuAnchor === 'empty' ? renderNewAssetMenu(true) : null}
                        secondaryLabel={t('pick_canvas')}
                        onSecondaryClick={() => setGalleryOpen(true)}
                    />
                ) : filteredItems.length === 0 ? (
                    <TableEmptyState
                        icon={<LuSearch size={32} />}
                        title={tc('no_results')}
                        description={t('no_match')}
                        hint={
                            searchQuery.trim()
                                ? t('search_q', { q: searchQuery.trim() })
                                : hasActiveFilters
                                    ? t('filters_on')
                                    : undefined
                        }
                        primaryLabel={tc('reset_filters')}
                        onPrimaryClick={handleClearFilters}
                    />
                ) : (
                    /* نمای شبکه‌ای (لوکس و مدرن کارت‌های اختصاصی) */
                    <div className={styles.assetsGrid}>
                        {filteredItems.map((item) => {
                            const hashtags = getAssetHashtags(item, t);
                            const isMenuOpen = activeMenuId === item._id;

                            return (
                                <article key={item._id} className={styles.assetCard}>
                                    <div className={`${styles.cardVisual} ${item.type === 'prompt' ? styles.cardVisualPrompt : ''}`}>
                                        <AssetPreview item={item} />
                                        <div className={styles.cardTypeBadge}>
                                            {t(item.type)}
                                        </div>
                                        
                                        {/* منوی سه‌نقطه عملیات */}
                                        <div className={styles.optionsWrap}>
                                            <button 
                                                type="button" 
                                                className={styles.optionsBtn}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveMenuId(isMenuOpen ? null : item._id);
                                                }}
                                                aria-label={tc('options')}
                                            >
                                                <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" height="16" width="16" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"></path>
                                                </svg>
                                            </button>
                                            {isMenuOpen && (
                                                <div className={styles.contextMenu}>
                                                    <button type="button" onClick={() => startEdit(item)}>
                                                        <LuPencil size={12} /> {t('rename')}
                                                    </button>
                                                    <button type="button" className={styles.deleteOption} onClick={() => handleRemove(item._id)}>
                                                        <LuTrash2 size={12} /> {t('delete_file')}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className={styles.cardContent}>
                                        <h3 className={styles.assetName} title={item.name}>{item.name}</h3>
                                        <div className={styles.assetTagsRow}>
                                            {hashtags.map((tag, index) => (
                                                <span key={`${tag}-${index}`} className={styles.assetHashtag}>{tag}</span>
                                            ))}
                                        </div>
                                        <div className={styles.assetMetaFooter}>
                                            <span className={styles.assetDate}>
                                                <LuClock size={11} />
                                                {formatAppDate(item.createdAt, lang)}
                                            </span>
                                            <span className={styles.assetSource}>{t('studio')}</span>
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* مدال انتخاب از گالری بوم */}
            <GalleryModal
                open={galleryOpen}
                onClose={() => setGalleryOpen(false)}
                scope="all"
                mode="select"
                onSelect={handleGalleryPick}
                initialTab={galleryTabFilter}
            />
        </div>
    );
}
