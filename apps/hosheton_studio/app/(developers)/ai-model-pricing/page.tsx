'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './AiModelsPricingPage.module.scss';
import axios from 'axios';
import {useAuthStore} from "@/app/zustand/store/authStore";
import { notifyError } from '@/app/lib/errors';
import { getModelPriceRange } from './lib/format-model-pricing';
import { usePageLoading } from '@/app/components/PageTransition';
import { isRtlLanguage } from '@/app/lib/i18n/config';
import { formatAppNumber } from '@/app/lib/i18n/formatLocaleNumber';

// ============================================================
// حالت «به زودی» صفحه قیمت مدل‌ها
// تا وقتی true است: پیام «به زودی» نمایش داده می‌شود، فیلترها
// غیرفعال‌اند و خطاهای API به‌صورت Toast نمایش داده نمی‌شوند.
// برای برگشت به حالت عادی: این مقدار را false کنید و کامنت
// بلوک جدول (پایین‌تر در همین فایل) را بردارید.
// ============================================================
const PRICING_COMING_SOON = true;

const CLASS_KEYS: Record<string, string> = {
    text: 'catalog_text',
    image: 'catalog_image',
    audio: 'catalog_audio',
    video: 'catalog_video',
    '3d': 'catalog_3d',
};

export default function AiModelsPricingPage() {
    const { t, i18n } = useTranslation('usage');
    const { t: tc } = useTranslation('common');
    const { token } = useAuthStore();
    const rtl = isRtlLanguage(i18n.language);

    const classLabel = (classKey: string) => {
        const key = CLASS_KEYS[classKey];
        return key ? t(key) : classKey;
    };

    const [models, setModels] = useState<any[]>([]);
    const [providers, setProviders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    usePageLoading(loading);

    const [searchInput, setSearchInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedProviderId, setSelectedProviderId] = useState('all');
    const [selectedModelType, setSelectedModelType] = useState('all');
    const [hasCaching, setHasCaching] = useState('all');

    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const limit = 20;

    const fetchProvidersList = async () => {
        try {
            const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/providers`, {
                params: { page: 1, limit: 100 },
                headers: token ? { authorization: `Bearer ${token}` } : {}
            });
            if (res.data?.statusCode === 200) {
                setProviders(res.data.data.providers || []);
            }
        } catch (error) {
            console.error(t('catalog_load_error'), error);
        }
    };

    const fetchModelsWithFilters = useCallback(async () => {
        try {
            setLoading(true);

            const queryParams = {
                page: currentPage,
                limit: limit,
                ...(searchQuery && { search: searchQuery }),
                ...(selectedProviderId !== 'all' && { provider: selectedProviderId }),
                ...(selectedModelType !== 'all' && { class: selectedModelType })
            };

            const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/provider-models`, {
                params: queryParams,
                headers: token ? { authorization: `Bearer ${token}` } : {}
            });

            if (res.data?.statusCode === 200) {
                const responseData = res.data.data;
                const activeOnly = (responseData.models || []).filter((m: { isActive?: boolean }) => m.isActive === true);
                setModels(activeOnly);
                setTotalPages(Math.ceil((responseData.totalItems || activeOnly.length || 1) / limit));
            }
            setLoading(false);
        } catch (error) {
            setLoading(false);
            if (!PRICING_COMING_SOON) {
                notifyError(error);
            }
        }
    }, [currentPage, searchQuery, selectedProviderId, selectedModelType, token]);

    useEffect(() => {
        fetchProvidersList();
    }, [token]);

    useEffect(() => {
        fetchModelsWithFilters();
    }, [searchQuery, selectedProviderId, selectedModelType, hasCaching, currentPage, fetchModelsWithFilters]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            triggerSearch();
        }
    };

    const triggerSearch = () => {
        setCurrentPage(1);
        setSearchQuery(searchInput);
    };

    const handleFilterChange = (filterType: string, value: string) => {
        setCurrentPage(1);
        if (filterType === 'provider') setSelectedProviderId(value);
        if (filterType === 'type') setSelectedModelType(value);
        if (filterType === 'caching') setHasCaching(value);
    };

    const isVideoView = selectedModelType === 'video';

    return (
        <div className={`${styles.container} ${rtl ? styles.rtl : ''}`}>
            <header className={styles.header}>
                <h1 className={styles.mainTitle}>{t('catalog_title')}</h1>
                <p className={styles.subtitle}>
                    {t('catalog_subtitle')}
                </p>
            </header>

            <section className={`${styles.filterSection} ${PRICING_COMING_SOON ? styles.filterDisabled : ''}`}>
                <div className={styles.searchBarWrapper}>
                    <input
                        type="text"
                        placeholder={t('catalog_search_ph')}
                        className={styles.mainSearchInput}
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={PRICING_COMING_SOON}
                    />
                    <button
                        className={styles.searchIconBtn}
                        onClick={triggerSearch}
                        title={tc('search')}
                        type="button"
                        disabled={PRICING_COMING_SOON}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width="20" height="20">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.604 10.604z" />
                        </svg>
                    </button>
                </div>

                <div className={styles.filterGrid}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>{t('catalog_provider')}</label>
                        <select
                            className={styles.select}
                            value={selectedProviderId}
                            onChange={(e) => handleFilterChange('provider', e.target.value)}
                            disabled={PRICING_COMING_SOON}
                        >
                            <option value="all">{t('catalog_all_providers')}</option>
                            {providers?.map((p) => (
                                <option key={p.id || p._id} value={p.id || p._id}>
                                    {p.name} {p.isNative ? t('catalog_native') : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>{t('catalog_model_type')}</label>
                        <select
                            className={styles.select}
                            value={selectedModelType}
                            onChange={(e) => handleFilterChange('type', e.target.value)}
                            disabled={PRICING_COMING_SOON}
                        >
                            <option value="all">{t('catalog_all_types')}</option>
                            <option value="text">{t('catalog_text')}</option>
                            <option value="image">{t('catalog_image')}</option>
                            <option value="audio">{t('catalog_audio')}</option>
                            <option value="video">{t('catalog_video')}</option>
                            <option value="3d">{t('catalog_3d')}</option>
                        </select>
                    </div>

                    {!isVideoView && (
                        <div className={styles.formGroup}>
                            <label className={styles.label}>{t('catalog_caching')}</label>
                            <select
                                className={styles.select}
                                value={hasCaching}
                                onChange={(e) => handleFilterChange('caching', e.target.value)}
                                disabled={PRICING_COMING_SOON}
                            >
                                <option value="all">{t('catalog_all')}</option>
                                <option value="cached">{t('catalog_cached')}</option>
                            </select>
                        </div>
                    )}
                </div>
            </section>

            <div className={styles.infoMiniCard}>
                <div className={styles.infoIcon}>💡</div>
                <div className={styles.infoContent}>
                    {(selectedModelType === 'all' || selectedModelType === 'text') && (
                        <p>
                            {t('catalog_text_hint')} {t('catalog_cache_hint')}
                        </p>
                    )}
                    {(selectedModelType === 'all' || selectedModelType === 'image') && (
                        <p>
                            {t('catalog_image_hint')}
                        </p>
                    )}
                    {(selectedModelType === 'all' || selectedModelType === 'video') && (
                        <p>
                            {t('catalog_video_hint')}
                        </p>
                    )}
                    {selectedModelType === 'audio' && (
                        <p>
                            {t('catalog_audio_hint')}
                        </p>
                    )}
                    {selectedModelType === '3d' && (
                        <p>
                            {t('catalog_3d_hint')}
                        </p>
                    )}
                </div>
            </div>

            {/* ================================================================
                جدول قیمت مدل‌ها موقتاً کامنت شد — پس از اصلاح لیست قیمت‌ها
                کافی است کامنت این بخش برداشته شود تا دوباره نمایش داده شود.
                Pricing table temporarily commented out — uncomment this whole
                block to bring the table (and its pagination) back.
            =================================================================

            <section className={styles.tableSection}>
                <div className={styles.tableScroll}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th className={styles.colName}>{t('catalog_model_name')}</th>
                                <th className={styles.colProvider}>{t('catalog_provider')}</th>
                                <th className={styles.colType}>{t('col_type')}</th>
                                <th className={styles.colPrice}>{t('catalog_min')}</th>
                                <th className={styles.colPrice}>{t('catalog_max')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className={styles.emptyCell}>{tc('loading')}</td>
                                </tr>
                            ) : models?.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className={styles.emptyCell}>{t('catalog_no_models')}</td>
                                </tr>
                            ) : (
                                models.map((model) => {
                                    const range = getModelPriceRange(model);
                                    const classKey = String(model.class || '').toLowerCase();

                                    return (
                                        <tr key={model.id || model._id}>
                                            <td className={styles.colName}>
                                                <span className={styles.modelName}>{model.displayName || model.name || '—'}</span>
                                            </td>
                                            <td className={styles.colProvider}>
                                                {model.provider?.displayName || model.providerName || '—'}
                                            </td>
                                            <td className={styles.colType}>
                                                {classLabel(classKey) || model.class || tc('empty_dash')}
                                            </td>
                                            <td className={styles.colPrice}>
                                                <span className={styles.priceValue}>{range.minLabel}</span>
                                            </td>
                                            <td className={styles.colPrice}>
                                                <span className={styles.priceValue}>{range.maxLabel}</span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className={styles.pagination}>
                        <button
                            type="button"
                            disabled={currentPage === 1 || loading}
                            onClick={() => setCurrentPage((prev) => prev - 1)}
                            className={styles.pageBtn}
                        >
                            {tc('prev_page')}
                        </button>
                        <span className={styles.pageInfo}>
                            {t('catalog_page_of', {
                                page: formatAppNumber(currentPage, i18n.language),
                                total: formatAppNumber(totalPages, i18n.language),
                            })}
                        </span>
                        <button
                            type="button"
                            disabled={currentPage === totalPages || loading}
                            onClick={() => setCurrentPage((prev) => prev + 1)}
                            className={styles.pageBtn}
                        >
                            {tc('next_page')}
                        </button>
                    </div>
                )}
            </section>
            */}

            <section className={styles.comingSoonSection} aria-live="polite">
                <div className={styles.comingSoonCard}>
                    <div className={styles.comingSoonGlow} aria-hidden="true" />
                    <div className={styles.comingSoonIcon}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="28" height="28">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <span className={styles.comingSoonBadge}>{t('catalog_soon_badge')}</span>
                    <p className={styles.comingSoonText}>{t('catalog_soon_description')}</p>
                    <div className={styles.comingSoonShimmer} aria-hidden="true" />
                </div>
            </section>
        </div>
    );
}
