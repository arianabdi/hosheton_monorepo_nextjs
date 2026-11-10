'use client';

import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import Link from 'next/link';
import styles from './FilmsList.module.scss';
import { Container, Wrapper } from "@/app/(main)/layout";
import { ConvertDateToCalendarString, ErrorToaster, SuccessToaster, toFarsiNumber } from "@my-workspace/utils";
import { useRouter } from "next/navigation";
import { Pagination } from "@my-workspace/components";
import TableTheme from "@my-workspace/components/src/TableTheme/TableTheme";
import { useAppStore } from "@/app/zustand/store/useAppStore";
import { useAuthStore } from "@/app/zustand/store/authStore";

interface FilmMediaStats {
    totalEpisodes: number;
    episodesUploaded: number;
    episodesNotUploaded: number;
    episodesWithSubtitle: number;
    hasCover: boolean;
    hasBanner: boolean;
}

interface Film {
    _id: string;
    name: string;
    contentType?: 'MOVIE' | 'SERIES';
    duration: number;
    banner?: string;
    createdAt: string;
    mediaStats?: FilmMediaStats;
}

const FilmsList: React.FC = () => {
    const { baseUrl, appName } = useAppStore();
    const { token } = useAuthStore();
    const router = useRouter();

    // گارد ریدایرکت اپلیکیشن
    useEffect(() => {
        if (appName && appName !== 'lingeeko') {
            router.push('/home');
        }
    }, [appName, router]);

    const [films, setFilms] = useState<Film[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
    const [pagination, setPagination] = useState({
        itemPerPage: 7,
        currentPage: 1,
        totalItems: 0
    });

    // ادغام متدهای واکشی در یک متد جامع جهت جلوگیری از هدر رفت ترافیک و رندرهای موازی
    const fetchFilmsData = useCallback(async (page: number, limit: number) => {
        if (!token) return;
        try {
            setLoading(true);
            const res = await axios.get(`${baseUrl}/api/films?page=${page}&limit=${limit}`, {
                headers: { "authorization": `Bearer ${token}` },
            });

            if (res.data.statusCode === 200) {
                setFilms(res.data.data.films || []);
                setPagination(prev => ({
                    ...prev,
                    totalItems: res.data.data.totalItems || 0,
                    currentPage: page,
                    itemPerPage: limit
                }));
            }
            setLoading(false);
        } catch (err: any) {
            setLoading(false);
            ErrorToaster(err);
        }
    }, [baseUrl, token]);

    // لود اولیه و تحریک زمان تغییر صفحه یا لیمیت
    useEffect(() => {
        fetchFilmsData(pagination.currentPage, pagination.itemPerPage);
    }, [pagination.currentPage, pagination.itemPerPage, fetchFilmsData]);

    const handleSetRowsPerPage = (newItemPerPage: number) => {
        setPagination(prev => ({
            ...prev,
            itemPerPage: newItemPerPage,
            currentPage: 1
        }));
    };

    const handlePaginate = (newPage: number) => {
        setPagination(prev => ({
            ...prev,
            currentPage: newPage
        }));
    };

    const deleteFilm = async (id: string, name: string) => {
        if (!confirm(`آیا از حذف دائمی فیلم "${name}" و زیرنویس‌های متصل به آن اطمینان دارید؟`)) return;
        try {
            setLoading(true);
            const res = await axios.delete(`${baseUrl}/api/films/${id}`, {
                headers: { "authorization": `Bearer ${token}` },
            });

            if (res.data.statusCode === 200) {
                SuccessToaster({ message: "رسانه مورد نظر با موفقیت از پلتفرم حذف شد" });
                // اگر صفحه آخر بودیم و تنها آیتم حذف شد، یک صفحه به عقب برگردد
                const nextPage = films.length === 1 && pagination.currentPage > 1 ? pagination.currentPage - 1 : pagination.currentPage;
                await fetchFilmsData(nextPage, pagination.itemPerPage);
            }
            setLoading(false);
        } catch (err: any) {
            setLoading(false);
            ErrorToaster(err);
        }
    };

    const filteredFilms = films.filter(film =>
        film.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Container>
            <Wrapper>
                {/* هدر کامپوننت */}
                <div className={`${styles.header} ${styles.rtl}`}>
                    <div>
                        <h1 className={styles.mainTitle}>مدیریت فیلم‌ها و ویدیوهای آموزشی</h1>
                        <p className={styles.subtitle}>
                            ویدیوهای مرجع پلتفرم را بارگذاری کرده و آن‌ها را جهت پردازش پردازنده‌های و استخراج کلمات آماده‌سازی کنید.
                        </p>
                    </div>
                    <div className={styles.headerActions}>
                        <div className={styles.viewToggle}>
                            <button
                                className={`${styles.viewBtn} ${viewMode === 'table' ? styles.active : ''}`}
                                onClick={() => setViewMode('table')}
                            >
                                نمای جدولی
                            </button>
                            <button
                                className={`${styles.viewBtn} ${viewMode === 'cards' ? styles.active : ''}`}
                                onClick={() => setViewMode('cards')}
                            >
                                نمای کارتی
                            </button>
                        </div>
                        <Link href="/films/new" className={styles.primaryBtn}>
                            + ایجاد فیلم جدید
                        </Link>
                    </div>
                </div>

                {/* باکس راهنمای متدولوژی رسانه‌های زیرنویس‌دار */}
                <div className={`${styles.noticeContainer} ${styles.rtl}`}>
                    <div className={styles.noticeHeader}>
                        <div className={styles.noticeTitleGroup}>
                            <span className={styles.noticeIcon}>🎬</span>
                            <h2 className={styles.noticeTitle}>استانداردسازی ویدیوها و پایپ‌لاین سنکرون‌سازی زیرنویس</h2>
                        </div>
                        <span className={styles.noticeBadge}>آموزش زبان</span>
                    </div>

                    <div className={styles.noticeGridTwoColumns}>
                        <div className={styles.noticeCard}>
                            <div className={styles.noticeCardHead}>
                                <span className={styles.stepNumber}>۱</span>
                                <h3>فرمت زمان‌بندی و انکودینگ SRT/VTT</h3>
                            </div>
                            <p>
                                هنگام آپلود سورس تکست‌ها، حتماً از فرمت استانداردهای <code>UTF-8</code> استفاده کنید تا حروف ویژه، فونتیک‌ها و کاراکترهای نشانه‌گذاری بدون شکستگی رندر شوند. زمان‌بندی باید میلی‌ثانیه‌ای دقیق باشد تا تاچ-باکس کلمات روی مدیا پلیر کلاینت به‌درستی قفل شود.
                            </p>
                        </div>

                        <div className={styles.noticeCard}>
                            <div className={styles.noticeCardHead}>
                                <span className={styles.stepNumber}>۲</span>
                                <h3>تکه‌تکه کردن ویدیوها (Byte-Sized Content)</h3>
                            </div>
                            <p>
                                بر اساس اصول روانشناسی یادگیری در، ترجیحاً فیلم‌های طولانی را به پارت‌های مستقل کوتاه‌تر تبدیل کنید. فیلم‌های طولانی حجم دیتابیس کالکشن کلمات در ثانیه را به شدت سنگین کرده و تجربه کاربران لِنگی‌کو را در مرور سناریوها کند می‌کند.
                            </p>
                        </div>
                    </div>

                    <div className={styles.noticeFooter}>
                        <p>💡 <strong>نکته پردازشی:</strong> پس از حذف یک فیلم، تمامی توکن‌های واژگان استخراج‌شده تعاملی و مپینگ‌های دیکشنری متصل به آن فیلم به صورت آبشاری (Cascade) از دیتابیس پاکسازی می‌شوند.</p>
                    </div>
                </div>

                {/* نوار سرچ */}
                <div className={`${styles.searchBarWrapper} ${styles.rtl}`}>
                    <input
                        type="text"
                        placeholder="جستجو در نام فیلم یا سریال..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={styles.searchInput}
                    />
                </div>

                {/* بخش نمایش اصلی مدیا */}
                <div className={styles.rtl}>
                    {loading ? (
                        <p className={styles.emptyState}>در حال دریافت لیست فیلم‌ها...</p>
                    ) : filteredFilms.length === 0 ? (
                        <div className={styles.noDataWrapper}>
                            <p>هیچ فیلم یا ویدیویی منطبق با فیلتر شما یافت نشد.</p>
                            <Link href="/films/new" className={styles.primaryBtn}>
                                اولین فیلم خود را ایجاد کنید
                            </Link>
                        </div>
                    ) : viewMode === 'table' ? (
                        <TableTheme>
                            <table className={styles.customTable}>
                                <thead>
                                <tr>
                                    <th>نام اثر</th>
                                    <th>نوع</th>
                                    <th>ویدیو آپلود شده</th>
                                    <th>بدون ویدیو</th>
                                    <th>دارای زیرنویس</th>
                                    <th>کاور</th>
                                    <th>بنر</th>
                                    <th>مدت زمان</th>
                                    <th>تاریخ بارگذاری</th>
                                    <th>عملیات ادمین</th>
                                </tr>
                                </thead>
                                <tbody>
                                {filteredFilms.map(film => (
                                    <tr key={film._id}>
                                        <td className={styles.filmNameMain}>{film.name}</td>
                                        <td>
                                            <span className={styles.categoryTag}>
                                                {film.contentType === 'SERIES' ? 'سریال' : 'فیلم'}
                                            </span>
                                        </td>
                                        <td>{toFarsiNumber(film.mediaStats?.episodesUploaded ?? 0)}</td>
                                        <td>{toFarsiNumber(film.mediaStats?.episodesNotUploaded ?? 0)}</td>
                                        <td>{toFarsiNumber(film.mediaStats?.episodesWithSubtitle ?? 0)}</td>
                                        <td>{film.mediaStats?.hasCover ? '✓' : '—'}</td>
                                        <td>{film.mediaStats?.hasBanner ? '✓' : '—'}</td>
                                        <td>{toFarsiNumber(film.duration)} دقیقه</td>
                                        <td className={styles.dateCell}>{toFarsiNumber(ConvertDateToCalendarString(film.createdAt))}</td>
                                        <td>
                                            <div className={styles.actionGridButtons}>
                                                <Link href={`/films/${film._id}`} className={styles.btnEdit}>
                                                    ویرایش
                                                </Link>
                                                <button
                                                    onClick={() => deleteFilm(film._id, film.name)}
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
                    ) : (
                        <div className={styles.cardsGrid}>
                            {filteredFilms.map(film => (
                                <div key={film._id} className={styles.filmCard}>
                                    <div className={styles.cardHeader}>
                                        <h3 className={styles.cardTitle}>{film.name}</h3>
                                        <span className={styles.cardId}>
                                            {film.contentType === 'SERIES' ? 'سریال' : 'فیلم'}
                                        </span>
                                    </div>
                                    <div className={styles.cardBody}>
                                        <div className={styles.cardRow}>
                                            <span className={styles.label}>ویدیو آپلود شده:</span>
                                            <span className={styles.value}>{toFarsiNumber(film.mediaStats?.episodesUploaded ?? 0)}</span>
                                        </div>
                                        <div className={styles.cardRow}>
                                            <span className={styles.label}>بدون ویدیو:</span>
                                            <span className={styles.value}>{toFarsiNumber(film.mediaStats?.episodesNotUploaded ?? 0)}</span>
                                        </div>
                                        <div className={styles.cardRow}>
                                            <span className={styles.label}>دارای زیرنویس:</span>
                                            <span className={styles.value}>{toFarsiNumber(film.mediaStats?.episodesWithSubtitle ?? 0)}</span>
                                        </div>
                                        <div className={styles.cardRow}>
                                            <span className={styles.label}>کاور / بنر:</span>
                                            <span className={styles.value}>
                                                {film.mediaStats?.hasCover ? 'کاور ✓' : 'کاور —'}
                                                {' · '}
                                                {film.mediaStats?.hasBanner ? 'بنر ✓' : 'بنر —'}
                                            </span>
                                        </div>
                                        <div className={styles.cardRow}>
                                            <span className={styles.label}>طول ویدیو:</span>
                                            <span className={styles.value}>{toFarsiNumber(film.duration)} دقیقه</span>
                                        </div>
                                        <div className={styles.cardRow}>
                                            <span className={styles.label}>تاریخ ثبت:</span>
                                            <span className={styles.value}>{toFarsiNumber(ConvertDateToCalendarString(film.createdAt))}</span>
                                        </div>
                                    </div>
                                    <div className={styles.cardActions}>
                                        <Link href={`/films/${film._id}`} className={styles.btnEdit}>
                                            ویرایش اثر
                                        </Link>
                                        <button
                                            onClick={() => deleteFilm(film._id, film.name)}
                                            className={styles.btnDelete}
                                        >
                                            حذف دائم
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {filteredFilms.length > 0 && (
                        <div className={styles.paginationSpace}>
                            <Pagination
                                itemPerPage={pagination.itemPerPage}
                                currentPage={pagination.currentPage}
                                totalItems={pagination.totalItems}
                                setRowsPerPage={handleSetRowsPerPage}
                                paginate={handlePaginate}
                                rtl={true}
                            />
                        </div>
                    )}
                </div>
            </Wrapper>
        </Container>
    );
};

export default FilmsList;