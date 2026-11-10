'use client';

import { useEffect, useRef } from 'react';
import { LuSearch, LuX } from 'react-icons/lu';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useExploreSearch } from '@/app/(marketplace)/lib/explore-search-context';
import styles from './HeaderSearch.module.scss';

type HeaderSearchProps = {
    variant?: 'header' | 'inline';
};

export default function HeaderSearch({ variant = 'header' }: HeaderSearchProps) {
    const { t } = useTranslation('common');
    const pathname = usePathname();
    const ctx = useExploreSearch();
    const inputRef = useRef<HTMLInputElement>(null);
    const isExplore = pathname?.startsWith('/explore');
    const isInline = variant === 'inline';

    useEffect(() => {
        if (ctx?.mobileSearchOpen) {
            inputRef.current?.focus();
        }
    }, [ctx?.mobileSearchOpen]);

    if (!isExplore || !ctx) return null;

    const { search, setSearch, mobileSearchOpen, setMobileSearchOpen } = ctx;

    if (isInline) {
        return (
            <div className={`${styles.searchWrap} ${styles.searchWrapInline}`}>
                <LuSearch size={18} className={styles.searchIcon} />
                <input
                    ref={inputRef}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t('search_placeholder')}
                    className={styles.searchInput}
                    aria-label={t('search')}
                />
            </div>
        );
    }

    return (
        <>
            <button
                type="button"
                className={styles.mobileSearchBtn}
                onClick={() => setMobileSearchOpen(true)}
                aria-label={t('search')}
            >
                <LuSearch size={22} color="var(--icon-color)" />
            </button>

            <div className={`${styles.searchWrap} ${mobileSearchOpen ? styles.searchWrapMobileOpen : ''}`}>
                <LuSearch size={18} className={styles.searchIcon} />
                <input
                    ref={inputRef}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t('search_placeholder')}
                    className={styles.searchInput}
                    aria-label={t('search')}
                />
                <button
                    type="button"
                    className={styles.mobileCloseBtn}
                    onClick={() => setMobileSearchOpen(false)}
                    aria-label={t('close_search')}
                >
                    <LuX size={18} />
                </button>
            </div>

            {mobileSearchOpen && (
                <button
                    type="button"
                    className={styles.mobileBackdrop}
                    onClick={() => setMobileSearchOpen(false)}
                    aria-label={t('close_search')}
                />
            )}
        </>
    );
}
