'use client';

import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import Link from 'next/link';
import styles from '../../../dictionary/word/WordsList.module.scss';
import { Container, Wrapper } from "@/app/(main)/layout";
import { ErrorToaster, SuccessToaster, toFarsiNumber } from "@my-workspace/utils";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/app/zustand/store/useAppStore";
import { useAuthStore } from "@/app/zustand/store/authStore";

interface Film {
    _id: string;
    name: string;
    slug: string;
    contentType?: string;
}

interface Stats {
    totalWords: number;
    inDictionary: number;
    notInDictionary: number;
    totalOccurrences: number;
    indexedFilms: number;
}

const VocabularyIndex: React.FC = () => {
    const { baseUrl, appName } = useAppStore();
    const { token } = useAuthStore();
    const router = useRouter();

    useEffect(() => {
        if (appName && appName !== 'lingeeko') router.push('/home');
    }, [appName, router]);

    const [stats, setStats] = useState<Stats | null>(null);
    const [films, setFilms] = useState<Film[]>([]);
    const [loading, setLoading] = useState(false);
    const [indexingFilmId, setIndexingFilmId] = useState<string | null>(null);
    const [filmSearch, setFilmSearch] = useState('');

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

    const fetchFilms = useCallback(async () => {
        if (!token) return;
        try {
            const res = await axios.get(`${baseUrl}/api/films?page=1&limit=200`, {
                headers: { authorization: `Bearer ${token}` },
            });
            if (res.data?.data) {
                setFilms(res.data.data.films || res.data.data || []);
            }
        } catch (err: any) {
            ErrorToaster(err);
        }
    }, [baseUrl, token]);

    useEffect(() => {
        fetchStats();
        fetchFilms();
    }, [fetchStats, fetchFilms]);

    const indexAll = async () => {
        if (!confirm('ایندکس‌گذاری تمام فیلم‌ها ممکن است زمان‌بر باشد. ادامه می‌دهید؟')) return;
        try {
            setLoading(true);
            const res = await axios.post(`${baseUrl}/api/vocabulary/index/all`, {}, {
                headers: { authorization: `Bearer ${token}` },
            });
            SuccessToaster({
                message: res.data?.message || `ایندکس ${res.data?.data?.filmsProcessed} فیلم انجام شد`,
            });
            await fetchStats();
            setLoading(false);
        } catch (err: any) {
            setLoading(false);
            ErrorToaster(err);
        }
    };

    const indexFilm = async (filmId: string, filmName: string) => {
        try {
            setIndexingFilmId(filmId);
            const res = await axios.post(`${baseUrl}/api/vocabulary/index/film/${filmId}`, {}, {
                headers: { authorization: `Bearer ${token}` },
            });
            SuccessToaster({
                message: res.data?.message || `فیلم «${filmName}» ایندکس شد (${res.data?.data?.totalWords} واژه)`,
            });
            await fetchStats();
            setIndexingFilmId(null);
        } catch (err: any) {
            setIndexingFilmId(null);
            ErrorToaster(err);
        }
    };

    const syncDictionary = async () => {
        try {
            setLoading(true);
            const res = await axios.post(`${baseUrl}/api/vocabulary/sync-dictionary`, {}, {
                headers: { authorization: `Bearer ${token}` },
            });
            SuccessToaster({
                message: res.data?.message || `${res.data?.data?.updated} واژه به‌روز شد`,
            });
            await fetchStats();
            setLoading(false);
        } catch (err: any) {
            setLoading(false);
            ErrorToaster(err);
        }
    };

    const filteredFilms = films.filter(f =>
        !filmSearch || f.name.toLowerCase().includes(filmSearch.toLowerCase())
    );

    return (
        <Container>
            <Wrapper>
                <div className={`${styles.header} ${styles.rtl}`}>
                    <div>
                        <h1 className={styles.mainTitle}>ایندکس‌گذاری واژگان</h1>
                        <p className={styles.subtitle}>
                            استخراج واژه‌ها از زیرنویس فیلم‌ها و ذخیره در دیتابیس vocabulary
                        </p>
                    </div>
                    <Link href="/films/vocabulary" className={styles.btnEdit}>بازگشت</Link>
                </div>

                {stats && (
                    <div className={`${styles.noticeContainer} ${styles.rtl}`} style={{ marginBottom: '1.5rem' }}>
                        <div className={styles.noticeGridThreeColumns}>
                            <div className={styles.noticeCard}>
                                <h3>فیلم‌های ایندکس‌شده</h3>
                                <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>{toFarsiNumber(stats.indexedFilms)}</p>
                            </div>
                            <div className={styles.noticeCard}>
                                <h3>کل واژگان</h3>
                                <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>{toFarsiNumber(stats.totalWords)}</p>
                            </div>
                            <div className={styles.noticeCard}>
                                <h3>کل تکرارها</h3>
                                <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>{toFarsiNumber(stats.totalOccurrences)}</p>
                            </div>
                        </div>
                    </div>
                )}

                <div className={`${styles.noticeContainer} ${styles.rtl}`} style={{ marginBottom: '1.5rem' }}>
                    <h2 className={styles.noticeTitle} style={{ marginBottom: '1rem' }}>عملیات سراسری</h2>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <button
                            onClick={indexAll}
                            disabled={loading}
                            className={styles.primaryBtn}
                        >
                            {loading ? 'در حال ایندکس...' : 'ایندکس تمام فیلم‌ها'}
                        </button>
                        <button
                            onClick={syncDictionary}
                            disabled={loading}
                            className={styles.btnEdit}
                        >
                            همگام‌سازی با دیکشنری
                        </button>
                    </div>
                    <p style={{ marginTop: '0.75rem', color: '#64748b', fontSize: '0.9rem' }}>
                        زیرنویس‌های جدید به‌صورت خودکار ایندکس می‌شوند. برای زیرنویس‌های قبلی از این بخش استفاده کنید.
                    </p>
                </div>

                <div className={`${styles.filterContainer} ${styles.rtl}`}>
                    <div className={styles.filterGrid}>
                        <div className={styles.filterItem}>
                            <label>جستجوی فیلم:</label>
                            <input
                                type="text"
                                placeholder="نام فیلم..."
                                value={filmSearch}
                                onChange={e => setFilmSearch(e.target.value)}
                                className={styles.filterInput}
                            />
                        </div>
                    </div>
                </div>

                <div className={styles.rtl}>
                    {filteredFilms.length === 0 ? (
                        <p className={styles.emptyState}>فیلمی یافت نشد.</p>
                    ) : (
                        <div style={{ display: 'grid', gap: '0.75rem' }}>
                            {filteredFilms.map(film => (
                                <div
                                    key={film._id}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '1rem 1.25rem',
                                        background: 'var(--plan-card-background-color, #fff)',
                                        border: '1px solid var(--plan-card-border-color, #dadce0)',
                                        borderRadius: '8px',
                                    }}
                                >
                                    <div>
                                        <strong>{film.name}</strong>
                                        {film.contentType && (
                                            <span style={{ marginRight: '8px', color: '#64748b', fontSize: '0.85rem' }}>
                                                ({film.contentType})
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <Link href={`/films/vocabulary/film/${film._id}`} className={styles.btnEdit}>
                                            واژگان
                                        </Link>
                                        <button
                                            onClick={() => indexFilm(film._id, film.name)}
                                            disabled={indexingFilmId === film._id}
                                            className={styles.primaryBtn}
                                            style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
                                        >
                                            {indexingFilmId === film._id ? 'در حال ایندکس...' : 'ایندکس'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Wrapper>
        </Container>
    );
};

export default VocabularyIndex;
