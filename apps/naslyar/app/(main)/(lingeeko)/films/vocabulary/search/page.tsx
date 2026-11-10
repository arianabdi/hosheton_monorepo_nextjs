'use client';

import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import styles from '../../../dictionary/word/WordsList.module.scss';
import { Container, Wrapper } from "@/app/(main)/layout";
import { ErrorToaster, toFarsiNumber } from "@my-workspace/utils";
import { useRouter } from "next/navigation";
import { Pagination } from "@my-workspace/components";
import TableTheme from "@my-workspace/components/src/TableTheme/TableTheme";
import { useAppStore } from "@/app/zustand/store/useAppStore";
import { useAuthStore } from "@/app/zustand/store/authStore";

interface Occurrence {
    _id: string;
    word: string;
    count: number;
    filmTitle: string;
    filmSlug?: string;
    sceneIndex: number;
    time: string;
    context: string;
    seasonId?: string;
    episodeId?: string;
}

interface SearchResult {
    word: string;
    stats: {
        totalOccurrences: number;
        sceneCount: number;
        filmCount: number;
        inDictionary: boolean;
    };
    inDictionary: boolean;
    occurrences: Occurrence[];
    totalItems: number;
}

const VocabularySearch: React.FC = () => {
    const { baseUrl, appName } = useAppStore();
    const { token } = useAuthStore();
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        if (appName && appName !== 'lingeeko') router.push('/home');
    }, [appName, router]);

    const [query, setQuery] = useState(searchParams.get('q') || '');
    const [searchedWord, setSearchedWord] = useState('');
    const [result, setResult] = useState<SearchResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({ itemPerPage: 20, currentPage: 1, totalItems: 0 });

    const search = useCallback(async (word: string, page: number, limit: number) => {
        if (!token || !word.trim()) return;
        try {
            setLoading(true);
            const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
            const res = await axios.get(`${baseUrl}/api/vocabulary/search/${encodeURIComponent(word.trim())}?${params}`, {
                headers: { authorization: `Bearer ${token}` },
            });
            if (res.data?.data) {
                setResult(res.data.data);
                setSearchedWord(word.trim());
                setPagination(prev => ({
                    ...prev,
                    totalItems: res.data.data.totalItems || 0,
                    currentPage: page,
                }));
            }
            setLoading(false);
        } catch (err: any) {
            setLoading(false);
            ErrorToaster(err);
        }
    }, [baseUrl, token]);

    useEffect(() => {
        const q = searchParams.get('q');
        if (q) {
            setQuery(q);
            search(q, 1, pagination.itemPerPage);
        }
    }, [searchParams]);

    const handleSearch = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!query.trim()) return;
        setPagination(prev => ({ ...prev, currentPage: 1 }));
        search(query, 1, pagination.itemPerPage);
    };

    return (
        <Container>
            <Wrapper>
                <div className={`${styles.header} ${styles.rtl}`}>
                    <div>
                        <h1 className={styles.mainTitle}>جستجوی واژه در فیلم‌ها</h1>
                        <p className={styles.subtitle}>
                            یک واژه را جستجو کنید تا ببینید در چند صحنه و چند فیلم استفاده شده
                        </p>
                    </div>
                    <Link href="/films/vocabulary" className={styles.btnEdit}>بازگشت به لیست</Link>
                </div>

                <form onSubmit={handleSearch} className={`${styles.filterContainer} ${styles.rtl}`}>
                    <div className={styles.filterGrid}>
                        <div className={styles.filterItem} style={{ flex: 2 }}>
                            <label>واژه:</label>
                            <input
                                type="text"
                                placeholder="مثلاً apple"
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                className={styles.filterInput}
                                autoFocus
                            />
                        </div>
                        <div className={styles.filterItem}>
                            <label>&nbsp;</label>
                            <button type="submit" className={styles.primaryBtn} disabled={loading}>
                                {loading ? 'در حال جستجو...' : 'جستجو'}
                            </button>
                        </div>
                    </div>
                </form>

                {result && searchedWord && (
                    <>
                        <div className={`${styles.noticeContainer} ${styles.rtl}`} style={{ marginBottom: '1.5rem' }}>
                            <div className={styles.noticeHeader}>
                                <h2 className={styles.noticeTitle}>
                                    نتایج برای «<strong>{searchedWord}</strong>»
                                </h2>
                                <span className={`${styles.statusBadge} ${result.inDictionary ? styles.approved : styles.pending}`}>
                                    {result.inDictionary ? 'موجود در دیکشنری' : 'ناقص — در دیکشنری نیست'}
                                </span>
                            </div>
                            <div className={styles.noticeGridThreeColumns}>
                                <div className={styles.noticeCard}>
                                    <h3>تکرار کل</h3>
                                    <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                                        {toFarsiNumber(result.stats.totalOccurrences)}
                                    </p>
                                </div>
                                <div className={styles.noticeCard}>
                                    <h3>صحنه‌ها</h3>
                                    <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                                        {toFarsiNumber(result.stats.sceneCount)}
                                    </p>
                                </div>
                                <div className={styles.noticeCard}>
                                    <h3>فیلم‌ها</h3>
                                    <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                                        {toFarsiNumber(result.stats.filmCount)}
                                    </p>
                                </div>
                            </div>
                            {!result.inDictionary && (
                                <p style={{ marginTop: '1rem', color: '#f59e0b' }}>
                                    این واژه در دیکشنری نیست. از{' '}
                                    <Link href="/films/vocabulary/missing">بخش واژگان ناقص</Link>{' '}
                                    می‌توانید آن را به صف جمع‌آوری اضافه کنید.
                                </p>
                            )}
                        </div>

                        <div className={styles.rtl}>
                            {result.occurrences.length === 0 ? (
                                <p className={styles.emptyState}>صحنه‌ای یافت نشد.</p>
                            ) : (
                                <TableTheme>
                                    <table className={styles.customTable}>
                                        <thead>
                                            <tr>
                                                <th>فیلم</th>
                                                <th>زمان</th>
                                                <th>متن صحنه</th>
                                                <th>تکرار</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {result.occurrences.map(occ => (
                                                <tr key={occ._id}>
                                                    <td>
                                                        {occ.filmTitle}
                                                        {occ.seasonId && (
                                                            <small style={{ display: 'block', color: '#64748b' }}>
                                                                S{occ.seasonId} E{occ.episodeId}
                                                            </small>
                                                        )}
                                                    </td>
                                                    <td><code>{occ.time}</code></td>
                                                    <td>{occ.context}</td>
                                                    <td>{toFarsiNumber(occ.count)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </TableTheme>
                            )}
                        </div>

                        {pagination.totalItems > pagination.itemPerPage && (
                            <Pagination
                                currentPage={pagination.currentPage}
                                totalItems={pagination.totalItems}
                                itemPerPage={pagination.itemPerPage}
                                paginate={p => search(searchedWord, p, pagination.itemPerPage)}
                                setRowsPerPage={n => {
                                    setPagination(prev => ({ ...prev, itemPerPage: n, currentPage: 1 }));
                                    search(searchedWord, 1, n);
                                }}
                            />
                        )}
                    </>
                )}
            </Wrapper>
        </Container>
    );
};

export default VocabularySearch;
