'use client';

import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from '../../films/FilmsList.module.scss';
import { Container, Wrapper } from '@/app/(main)/layout';
import { ConvertDateToCalendarString, ErrorToaster, SuccessToaster, toFarsiNumber } from '@my-workspace/utils';
import { Pagination } from '@my-workspace/components';
import TableTheme from '@my-workspace/components/src/TableTheme/TableTheme';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';

interface CastPerson {
    _id: string;
    name: string;
    birthYear?: string;
    bio?: string;
    avatarUrl?: string;
    avatar?: {
        original?: { path?: string; key?: string };
        thumbnail?: { path?: string; key?: string };
    };
    createdAt?: string;
}

const getAvatarSrc = (person: CastPerson) => {
    const thumb = person.avatar?.thumbnail;
    // path = storage the file was uploaded to (right after a storage switch); key+env only as fallback
    if (thumb?.path) return thumb.path;
    if (thumb?.key && process.env.NEXT_PUBLIC_S3_ENDPOINT) {
        return `${process.env.NEXT_PUBLIC_S3_ENDPOINT}/${thumb.key}`;
    }
    return person.avatarUrl || null;
};

interface Props {
    type: 'actors' | 'directors';
}

export default function CastListPage({ type }: Props) {
    const { baseUrl, appName } = useAppStore();
    const { token } = useAuthStore();
    const router = useRouter();

    const isActors = type === 'actors';
    const title = isActors ? 'بازیگران' : 'کارگردانان';
    const singular = isActors ? 'بازیگر' : 'کارگردان';
    const endpoint = isActors ? 'actors' : 'directors';
    const listKey = isActors ? 'actors' : 'directors';

    const [items, setItems] = useState<CastPerson[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [appliedSearch, setAppliedSearch] = useState('');
    const [pagination, setPagination] = useState({
        itemPerPage: 10,
        currentPage: 1,
        totalItems: 0,
    });

    useEffect(() => {
        if (appName && appName !== 'lingeeko') {
            router.push('/home');
        }
    }, [appName, router]);

    const fetchData = useCallback(async (page: number, limit: number, search: string) => {
        if (!token) return;

        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
            });
            if (search.trim()) params.set('search', search.trim());

            const res = await axios.get(`${baseUrl}/api/cast/${endpoint}?${params.toString()}`, {
                headers: { authorization: `Bearer ${token}` },
            });

            if (res.data?.statusCode === 200) {
                setItems(res.data.data?.[listKey] || []);
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
    }, [baseUrl, token, endpoint, listKey]);

    useEffect(() => {
        fetchData(pagination.currentPage, pagination.itemPerPage, appliedSearch);
    }, [pagination.currentPage, pagination.itemPerPage, appliedSearch, fetchData]);

    const handleSearch = () => {
        setAppliedSearch(searchTerm);
        setPagination((prev) => ({ ...prev, currentPage: 1 }));
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`آیا از حذف ${singular} "${name}" مطمئن هستید؟`)) return;

        try {
            setLoading(true);
            const res = await axios.delete(`${baseUrl}/api/cast/${endpoint}/${id}`, {
                headers: { authorization: `Bearer ${token}` },
            });

            if (res.data?.statusCode === 200) {
                SuccessToaster({ message: `${singular} با موفقیت حذف شد` });
                const nextPage =
                    items.length === 1 && pagination.currentPage > 1
                        ? pagination.currentPage - 1
                        : pagination.currentPage;
                await fetchData(nextPage, pagination.itemPerPage, appliedSearch);
            }
        } catch (err) {
            ErrorToaster(err);
            setLoading(false);
        }
    };

    return (
        <Container>
            <Wrapper>
                <div className={`${styles.header} ${styles.rtl}`}>
                    <div>
                        <h1 className={styles.mainTitle}>مدیریت {title}</h1>
                        <p className={styles.subtitle}>
                            {isActors
                                ? 'بانک مرکزی بازیگران پلتفرم. بازیگران اینجا ذخیره می‌شوند و در فیلم‌ها از همین لیست استفاده می‌شود.'
                                : 'بانک مرکزی کارگردانان. کارگردان‌ها را اینجا مدیریت کنید و به فیلم‌ها اضافه کنید.'}
                        </p>
                    </div>
                    <div className={styles.headerActions}>
                        <Link href={`/${endpoint}/new`} className={styles.primaryBtn}>
                            + افزودن {singular} جدید
                        </Link>
                        {isActors ? (
                            <Link href="/directors" className={styles.btnEdit}>
                                مدیریت کارگردانان
                            </Link>
                        ) : (
                            <Link href="/actors" className={styles.btnEdit}>
                                مدیریت بازیگران
                            </Link>
                        )}
                    </div>
                </div>

                <div className={`${styles.searchBarWrapper} ${styles.rtl}`}>
                    <input
                        type="text"
                        placeholder={`جستجو در نام ${title}...`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        className={styles.searchInput}
                    />
                    <button type="button" className={styles.primaryBtn} onClick={handleSearch}>
                        جستجو
                    </button>
                </div>

                <div className={styles.rtl}>
                    {loading ? (
                        <p className={styles.emptyState}>در حال دریافت لیست...</p>
                    ) : items.length === 0 ? (
                        <div className={styles.noDataWrapper}>
                            <p>{singular}‌ای یافت نشد.</p>
                            <Link href={`/${endpoint}/new`} className={styles.primaryBtn}>
                                اولین {singular} را ایجاد کنید
                            </Link>
                        </div>
                    ) : (
                        <TableTheme>
                            <table className={styles.customTable}>
                                <thead>
                                    <tr>
                                        <th>تصویر</th>
                                        <th>نام</th>
                                        <th>سال تولد</th>
                                        <th>بیوگرافی</th>
                                        <th>تاریخ ثبت</th>
                                        <th>عملیات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item) => (
                                        <tr key={item._id}>
                                            <td>
                                                {getAvatarSrc(item) ? (
                                                    <img
                                                        src={getAvatarSrc(item)!}
                                                        alt={item.name}
                                                        className={styles.cardThumb}
                                                    />
                                                ) : (
                                                    <span className={styles.slugCode}>—</span>
                                                )}
                                            </td>
                                            <td className={styles.filmNameMain}>{item.name}</td>
                                            <td>{item.birthYear ? toFarsiNumber(item.birthYear) : '—'}</td>
                                            <td className={styles.dateCell}>
                                                {item.bio
                                                    ? item.bio.length > 60
                                                        ? `${item.bio.slice(0, 60)}...`
                                                        : item.bio
                                                    : '—'}
                                            </td>
                                            <td className={styles.dateCell}>
                                                {item.createdAt
                                                    ? toFarsiNumber(ConvertDateToCalendarString(item.createdAt))
                                                    : '—'}
                                            </td>
                                            <td>
                                                <div className={styles.actionGridButtons}>
                                                    <Link href={`/${endpoint}/${item._id}`} className={styles.btnEdit}>
                                                        ویرایش
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDelete(item._id, item.name)}
                                                        className={styles.btnDelete}
                                                    >
                                                        حذف
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </TableTheme>
                    )}

                    {items.length > 0 && (
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
                    )}
                </div>
            </Wrapper>
        </Container>
    );
}
