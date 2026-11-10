'use client';

import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import styles from '../../../../dictionary/word/WordsList.module.scss';
import { Container, Wrapper } from "@/app/(main)/layout";
import { ErrorToaster, toFarsiNumber } from "@my-workspace/utils";
import { Pagination } from "@my-workspace/components";
import TableTheme from "@my-workspace/components/src/TableTheme/TableTheme";
import { useAppStore } from "@/app/zustand/store/useAppStore";
import { useAuthStore } from "@/app/zustand/store/authStore";

interface FilmWord {
    word: string;
    totalOccurrences: number;
    sceneCount: number;
    inDictionary?: boolean;
}

const FilmVocabulary: React.FC = () => {
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const params = useParams();
    const filmId = params.filmId as string;

    const [words, setWords] = useState<FilmWord[]>([]);
    const [filmName, setFilmName] = useState('');
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ itemPerPage: 30, currentPage: 1, totalItems: 0 });

    const fetchFilm = useCallback(async () => {
        if (!token || !filmId) return;
        try {
            const res = await axios.get(`${baseUrl}/api/films/${filmId}`, {
                headers: { authorization: `Bearer ${token}` },
            });
            if (res.data?.data) setFilmName(res.data.data.name || '');
        } catch (_) {}
    }, [baseUrl, token, filmId]);

    const fetchWords = useCallback(async (page: number, limit: number) => {
        if (!token || !filmId) return;
        try {
            setLoading(true);
            const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
            const res = await axios.get(`${baseUrl}/api/vocabulary/film/${filmId}?${params}`, {
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
    }, [baseUrl, token, filmId]);

    useEffect(() => { fetchFilm(); }, [fetchFilm]);
    useEffect(() => {
        fetchWords(pagination.currentPage, pagination.itemPerPage);
    }, [pagination.currentPage, pagination.itemPerPage, fetchWords]);

    return (
        <Container>
            <Wrapper>
                <div className={`${styles.header} ${styles.rtl}`}>
                    <div>
                        <h1 className={styles.mainTitle}>واژگان فیلم{filmName ? `: ${filmName}` : ''}</h1>
                        <p className={styles.subtitle}>واژه‌های استخراج‌شده از زیرنویس این فیلم</p>
                    </div>
                    <div className={styles.headerActions}>
                        <Link href="/films/vocabulary/index" className={styles.btnEdit}>ایندکس‌گذاری</Link>
                        <Link href={`/films/${filmId}`} className={styles.btnEdit}>ویرایش فیلم</Link>
                    </div>
                </div>

                <div className={styles.rtl}>
                    {loading ? (
                        <p className={styles.emptyState}>در حال بارگذاری...</p>
                    ) : words.length === 0 ? (
                        <p className={styles.emptyState}>
                            واژه‌ای ایندکس نشده.{' '}
                            <Link href="/films/vocabulary/index">ایندکس‌گذاری</Link> را اجرا کنید.
                        </p>
                    ) : (
                        <TableTheme>
                            <table className={styles.customTable}>
                                <thead>
                                    <tr>
                                        <th>واژه</th>
                                        <th>تکرار</th>
                                        <th>صحنه‌ها</th>
                                        <th>دیکشنری</th>
                                        <th>عملیات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {words.map(w => (
                                        <tr key={w.word}>
                                            <td><strong>{w.word}</strong></td>
                                            <td>{toFarsiNumber(w.totalOccurrences)}</td>
                                            <td>{toFarsiNumber(w.sceneCount)}</td>
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

export default FilmVocabulary;
