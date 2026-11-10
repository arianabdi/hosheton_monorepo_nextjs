'use client';

import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import Link from 'next/link';
import styles from '../../dictionary/word/WordsList.module.scss';
import { Container, Wrapper } from "@/app/(main)/layout";
import { ErrorToaster, toFarsiNumber } from "@my-workspace/utils";
import { useRouter } from "next/navigation";
import { Pagination } from "@my-workspace/components";
import TableTheme from "@my-workspace/components/src/TableTheme/TableTheme";
import { useAppStore } from "@/app/zustand/store/useAppStore";
import { useAuthStore } from "@/app/zustand/store/authStore";

interface VocabWord {
    _id: string;
    word: string;
    totalOccurrences: number;
    sceneCount: number;
    filmCount: number;
    inDictionary: boolean;
    lastIndexedAt?: string;
}

interface Stats {
    totalWords: number;
    inDictionary: number;
    notInDictionary: number;
    totalOccurrences: number;
    indexedFilms: number;
}

const VocabularyList: React.FC = () => {
    const { baseUrl, appName } = useAppStore();
    const { token } = useAuthStore();
    const router = useRouter();

    useEffect(() => {
        if (appName && appName !== 'lingeeko') router.push('/home');
    }, [appName, router]);

    const [words, setWords] = useState<VocabWord[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);

    const [localFilters, setLocalFilters] = useState({
        word: '',
        inDictionary: '',
        sortBy: 'totalOccurrences',
        sortOrder: 'desc',
    });
    const [appliedFilters, setAppliedFilters] = useState(localFilters);
    const [pagination, setPagination] = useState({ itemPerPage: 20, currentPage: 1, totalItems: 0 });

    const fetchStats = useCallback(async () => {
        if (!token) return;
        try {
            const res = await axios.get(`${baseUrl}/api/vocabulary/stats`, {
                headers: { authorization: `Bearer ${token}` },
            });
            if (res.data?.data) setStats(res.data.data);
        } catch (err: any) {
            ErrorToaster(err);
        }
    }, [baseUrl, token]);

    const fetchWords = useCallback(async (page: number, limit: number) => {
        if (!token) return;
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                sortBy: appliedFilters.sortBy,
                sortOrder: appliedFilters.sortOrder,
                ...(appliedFilters.word && { word: appliedFilters.word }),
                ...(appliedFilters.inDictionary && { inDictionary: appliedFilters.inDictionary }),
            });
            const res = await axios.get(`${baseUrl}/api/vocabulary?${params}`, {
                headers: { authorization: `Bearer ${token}` },
            });
            if (res.data?.data) {
                setWords(res.data.data.words || []);
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
    }, [baseUrl, token, appliedFilters]);

    useEffect(() => { fetchStats(); }, [fetchStats]);
    useEffect(() => {
        fetchWords(pagination.currentPage, pagination.itemPerPage);
    }, [pagination.currentPage, pagination.itemPerPage, fetchWords]);

    const handleApplyFilters = () => {
        setAppliedFilters(localFilters);
        setPagination(prev => ({ ...prev, currentPage: 1 }));
    };

    return (
        <Container>
            <Wrapper>
                <div className={`${styles.header} ${styles.rtl}`}>
                    <div>
                        <h1 className={styles.mainTitle}>واژگان فیلم‌ها</h1>
                        <p className={styles.subtitle}>
                            واژه‌های استخراج‌شده از زیرنویس فیلم‌ها — تعداد تکرار، صحنه‌ها و فیلم‌های مرتبط
                        </p>
                    </div>
                    <div className={styles.headerActions}>
                        <Link href="/films/vocabulary/search" className={styles.primaryBtn}>جستجوی واژه</Link>
                        <Link href="/films/vocabulary/missing" className={styles.btnEdit}>واژگان ناقص</Link>
                        <Link href="/films/vocabulary/index" className={styles.btnEdit}>ایندکس‌گذاری</Link>
                    </div>
                </div>

                {stats && (
                    <div className={`${styles.noticeContainer} ${styles.rtl}`} style={{ marginBottom: '1.5rem' }}>
                        <div className={styles.noticeGridThreeColumns}>
                            <div className={styles.noticeCard}>
                                <h3>کل واژگان</h3>
                                <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>{toFarsiNumber(stats.totalWords)}</p>
                            </div>
                            <div className={styles.noticeCard}>
                                <h3>در دیکشنری</h3>
                                <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981' }}>{toFarsiNumber(stats.inDictionary)}</p>
                            </div>
                            <div className={styles.noticeCard}>
                                <h3>ناقص (بدون تعریف)</h3>
                                <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b' }}>{toFarsiNumber(stats.notInDictionary)}</p>
                            </div>
                        </div>
                    </div>
                )}

                <div className={`${styles.filterContainer} ${styles.rtl}`}>
                    <div className={styles.filterGrid}>
                        <div className={styles.filterItem}>
                            <label>جستجوی واژه:</label>
                            <input
                                type="text"
                                placeholder="کلمه..."
                                value={localFilters.word}
                                onChange={e => setLocalFilters(p => ({ ...p, word: e.target.value }))}
                                onKeyDown={e => e.key === 'Enter' && handleApplyFilters()}
                                className={styles.filterInput}
                            />
                        </div>
                        <div className={styles.filterItem}>
                            <label>وضعیت دیکشنری:</label>
                            <select
                                value={localFilters.inDictionary}
                                onChange={e => setLocalFilters(p => ({ ...p, inDictionary: e.target.value }))}
                                className={styles.filterSelect}
                            >
                                <option value="">همه</option>
                                <option value="true">موجود در دیکشنری</option>
                                <option value="false">ناقص</option>
                            </select>
                        </div>
                        <div className={styles.filterItem}>
                            <label>مرتب‌سازی:</label>
                            <select
                                value={localFilters.sortBy}
                                onChange={e => setLocalFilters(p => ({ ...p, sortBy: e.target.value }))}
                                className={styles.filterSelect}
                            >
                                <option value="totalOccurrences">تعداد تکرار</option>
                                <option value="sceneCount">تعداد صحنه</option>
                                <option value="filmCount">تعداد فیلم</option>
                                <option value="word">حروف الفبا</option>
                            </select>
                        </div>
                        <div className={styles.filterItem}>
                            <label>&nbsp;</label>
                            <button onClick={handleApplyFilters} className={styles.primaryBtn}>اعمال فیلتر</button>
                        </div>
                    </div>
                </div>

                <div className={styles.rtl}>
                    {loading ? (
                        <p className={styles.emptyState}>در حال بارگذاری...</p>
                    ) : words.length === 0 ? (
                        <p className={styles.emptyState}>
                            هنوز واژه‌ای ایندکس نشده. از بخش{' '}
                            <Link href="/films/vocabulary/index">ایندکس‌گذاری</Link> شروع کنید.
                        </p>
                    ) : (
                        <TableTheme>
                            <table className={styles.customTable}>
                                <thead>
                                    <tr>
                                        <th>واژه</th>
                                        <th>تکرار کل</th>
                                        <th>صحنه‌ها</th>
                                        <th>فیلم‌ها</th>
                                        <th>دیکشنری</th>
                                        <th>عملیات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {words.map(w => (
                                        <tr key={w._id}>
                                            <td><strong>{w.word}</strong></td>
                                            <td>{toFarsiNumber(w.totalOccurrences)}</td>
                                            <td>{toFarsiNumber(w.sceneCount)}</td>
                                            <td>{toFarsiNumber(w.filmCount)}</td>
                                            <td>
                                                <span className={`${styles.statusBadge} ${w.inDictionary ? styles.approved : styles.pending}`}>
                                                    {w.inDictionary ? 'موجود' : 'ناقص'}
                                                </span>
                                            </td>
                                            <td>
                                                <Link href={`/films/vocabulary/search?q=${w.word}`} className={styles.btnEdit}>
                                                    جزئیات
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </TableTheme>
                    )}
                </div>

                {pagination.totalItems > 0 && (
                    <Pagination
                        currentPage={pagination.currentPage}
                        totalItems={pagination.totalItems}
                        itemPerPage={pagination.itemPerPage}
                        paginate={p => setPagination(prev => ({ ...prev, currentPage: p }))}
                        setRowsPerPage={n => setPagination(prev => ({ ...prev, itemPerPage: n, currentPage: 1 }))}
                    />
                )}
            </Wrapper>
        </Container>
    );
};

export default VocabularyList;
