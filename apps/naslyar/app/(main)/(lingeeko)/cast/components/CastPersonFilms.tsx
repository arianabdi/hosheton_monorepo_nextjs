'use client';

import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { Pagination } from '@my-workspace/components';
import TableTheme from '@my-workspace/components/src/TableTheme/TableTheme';
import { ConvertDateToCalendarString, ErrorToaster, toFarsiNumber } from '@my-workspace/utils';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import styles from '../../films/FilmsList.module.scss';
import sectionStyles from './CastForm.module.scss';

interface FilmItem {
    _id: string;
    name: string;
    slug?: string;
    category?: string;
    contentType?: string;
    imdbGrade?: number;
    createdAt?: string;
    characterName?: string | null;
    cover?: { thumbnail?: { path?: string; key?: string } };
}

interface Props {
    type: 'actors' | 'directors';
    personId: string;
}

export default function CastPersonFilms({ type, personId }: Props) {
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const isActors = type === 'actors';
    const endpoint = isActors ? 'actors' : 'directors';

    const [films, setFilms] = useState<FilmItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({
        itemPerPage: 10,
        currentPage: 1,
        totalItems: 0,
    });

    const fetchFilms = useCallback(
        async (page: number, limit: number) => {
            if (!token || !personId) return;

            try {
                setLoading(true);
                const res = await axios.get(
                    `${baseUrl}/api/cast/${endpoint}/${personId}/films?page=${page}&limit=${limit}`,
                    { headers: { authorization: `Bearer ${token}` } },
                );

                if (res.data?.statusCode === 200) {
                    setFilms(res.data.data?.films || []);
                    setPagination((prev) => ({
                        ...prev,
                        totalItems: res.data.data?.totalItems || 0,
                        currentPage: page,
                        itemPerPage: limit,
                    }));
                }
            } catch (err) {
                ErrorToaster(err);
            } finally {
                setLoading(false);
            }
        },
        [baseUrl, token, personId, endpoint],
    );

    useEffect(() => {
        fetchFilms(pagination.currentPage, pagination.itemPerPage);
    }, [pagination.currentPage, pagination.itemPerPage, fetchFilms]);

    const getCoverSrc = (film: FilmItem) => {
        const thumb = film.cover?.thumbnail;
        if (thumb?.path) return thumb.path;
        if (thumb?.key && process.env.NEXT_PUBLIC_S3_ENDPOINT) {
            return `${process.env.NEXT_PUBLIC_S3_ENDPOINT}/${thumb.key}`;
        }
        return null;
    };

    return (
        <div className={sectionStyles.filmsSection} dir="rtl">
            <h2 className={sectionStyles.sectionTitle}>
                فیلم‌هایی که این {isActors ? 'بازیگر' : 'کارگردان'} در آن‌ها حضور دارد
            </h2>

            {loading ? (
                <p className={sectionStyles.loading}>در حال بارگذاری فیلم‌ها...</p>
            ) : films.length === 0 ? (
                <p className={sectionStyles.emptyFilms}>هنوز فیلمی با این {isActors ? 'بازیگر' : 'کارگردان'} ثبت نشده است.</p>
            ) : (
                <>
                    <TableTheme>
                        <table className={styles.customTable}>
                            <thead>
                                <tr>
                                    <th>کاور</th>
                                    <th>نام فیلم</th>
                                    {isActors && <th>نقش</th>}
                                    <th>دسته‌بندی</th>
                                    <th>نوع</th>
                                    <th>IMDB</th>
                                    <th>تاریخ ثبت</th>
                                    <th>عملیات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {films.map((film) => {
                                    const coverSrc = getCoverSrc(film);
                                    return (
                                        <tr key={film._id}>
                                            <td>
                                                {coverSrc ? (
                                                    <img src={coverSrc} alt={film.name} className={styles.cardThumb} />
                                                ) : (
                                                    '—'
                                                )}
                                            </td>
                                            <td className={styles.filmNameMain}>{film.name}</td>
                                            {isActors && <td>{film.characterName || '—'}</td>}
                                            <td>
                                                <span className={styles.categoryTag}>{film.category || '—'}</span>
                                            </td>
                                            <td>{film.contentType === 'SERIES' ? 'سریال' : 'فیلم'}</td>
                                            <td>{film.imdbGrade != null ? toFarsiNumber(film.imdbGrade) : '—'}</td>
                                            <td className={styles.dateCell}>
                                                {film.createdAt
                                                    ? toFarsiNumber(ConvertDateToCalendarString(film.createdAt))
                                                    : '—'}
                                            </td>
                                            <td>
                                                <Link href={`/films/${film._id}`} className={styles.btnEdit}>
                                                    ویرایش فیلم
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </TableTheme>

                    <div className={styles.paginationSpace}>
                        <Pagination
                            itemPerPage={pagination.itemPerPage}
                            currentPage={pagination.currentPage}
                            totalItems={pagination.totalItems}
                            setRowsPerPage={(limit) =>
                                setPagination((prev) => ({ ...prev, itemPerPage: limit, currentPage: 1 }))
                            }
                            paginate={(page) => setPagination((prev) => ({ ...prev, currentPage: page }))}
                            rtl
                        />
                    </div>
                </>
            )}
        </div>
    );
}
