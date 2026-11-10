'use client';

import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import Link from 'next/link';
import styles from './WordsList.module.scss';
import { Container, Wrapper } from "@/app/(main)/layout";
import { ConvertDateToCalendarString, ErrorToaster, SuccessToaster, toFarsiNumber } from "@my-workspace/utils";
import { useRouter } from "next/navigation";
import { Pagination } from "@my-workspace/components";
import TableTheme from "@my-workspace/components/src/TableTheme/TableTheme";
import { useAppStore } from "@/app/zustand/store/useAppStore";
import { useAuthStore } from "@/app/zustand/store/authStore";

interface Phrase {
    _id: string;
    word: string;
    language: string;
    adminApproved: boolean;
    version: number;
    updatedAt: string;
    createdAt: string;
}

const WordsList: React.FC = () => {
    const { baseUrl, appName } = useAppStore();
    const { token } = useAuthStore();
    const router = useRouter();

    useEffect(() => {
        if (appName && appName !== 'lingeeko') {
            router.push('/home');
        }
    }, [appName, router]);

    const [words, setWords] = useState<Phrase[]>([]);
    const [loading, setLoading] = useState(true);

    // ۱. استیت موقت و محلی برای ذخیره مقادیر فرم فیلترها (قبل از زدن دکمه جستجو)
    const [localFilters, setLocalFilters] = useState({
        word: '',
        adminApproved: '',
        version: '',
        endDate: '',
        sortBy: 'updatedAt',
        sortOrder: 'desc'
    });

    // ۲. استیت نهایی فیلترها که درخواست‌های API منحصراً به این وابسته هستند
    const [appliedFilters, setAppliedFilters] = useState({
        word: '',
        adminApproved: '',
        version: '',
        endDate: '',
        sortBy: 'updatedAt',
        sortOrder: 'desc'
    });

    const [pagination, setPagination] = useState({
        itemPerPage: 10,
        currentPage: 1,
        totalItems: 0
    });

// متد دریافت واژگان از سرور - وابسته به appliedFilters
    const fetchWordsData = useCallback(async (page: number, limit: number) => {
        if (!token) return;
        try {
            setLoading(true);

            const queryParams = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                ...(appliedFilters.word && { word: appliedFilters.word }),
                ...(appliedFilters.adminApproved && { adminApproved: appliedFilters.adminApproved }),
                // مطمئن می‌شویم که ورژن صفر یا خالی فرستاده نشود و به صورت رشته معتبر ارسال شود
                ...(appliedFilters.version !== '' && { version: appliedFilters.version }),
                ...(appliedFilters.endDate && { endDate: appliedFilters.endDate }),
                sortBy: appliedFilters.sortBy,
                sortOrder: appliedFilters.sortOrder
            });

            const res = await axios.get(`${baseUrl}/api/word?${queryParams.toString()}`, {
                headers: { "authorization": `Bearer ${token}` },
            });

            if (res.data?.data) {
                setWords(res.data.data.words || []);
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
    }, [baseUrl, token, appliedFilters]);

    // لود دیتا هنگام تغییر صفحه یا فیلترهای نهایی شده
    useEffect(() => {
        fetchWordsData(pagination.currentPage, pagination.itemPerPage);
    }, [pagination.currentPage, pagination.itemPerPage, fetchWordsData]);

    // به‌روزرسانی استیت موقت فیلترها هنگام تغییر فیلدها توسط کاربر
    const handleLocalFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        setLocalFilters(prev => ({
            ...prev,
            // اگر فیلد ورژن بود و مقدار داشت، آن را به عدد تبدیل کند، در غیر این صورت رشته خالی
            [name]: name === 'version' ? (value !== '' ? Number(value) : '') : value
        }));
    };

    // ۳. متد نهایی‌سازی و اعمال هم‌زمان تمام فیلترها با زدن دکمه جستجو
    const handleApplyFiltersSubmit = () => {
        setAppliedFilters(localFilters);
        setPagination(prev => ({ ...prev, currentPage: 1 })); // ریست به صفحه اول
    };

    // هندل کردن اینتر روی تمام اینپوت‌های فرم برای اجرای سرچ
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleApplyFiltersSubmit();
        }
    };

    const handleSetRowsPerPage = (newItemPerPage: number) => {
        setPagination(prev => ({ ...prev, itemPerPage: newItemPerPage, currentPage: 1 }));
    };

    const handlePaginate = (newPage: number) => {
        setPagination(prev => ({ ...prev, currentPage: newPage }));
    };

    const deleteWord = async (id: string, wordText: string) => {
        if (!confirm(`آیا از حذف دائمی واژه "${wordText}" از دیتابیس اطمینان دارید؟`)) return;
        try {
            setLoading(true);
            const res = await axios.delete(`${baseUrl}/api/word/${id}`, {
                headers: { "authorization": `Bearer ${token}` },
            });

            if (res.status === 200 || res.data.statusCode === 200) {
                SuccessToaster({ message: "واژه مورد نظر با موفقیت از پلتفرم حذف شد" });
                const nextPage = words.length === 1 && pagination.currentPage > 1 ? pagination.currentPage - 1 : pagination.currentPage;
                await fetchWordsData(nextPage, pagination.itemPerPage);
            }
            setLoading(false);
        } catch (err: any) {
            setLoading(false);
            ErrorToaster(err);
        }
    };

    return (
        <Container>
            <Wrapper>
                {/* هدر کامپوننت */}
                <div className={`${styles.header} ${styles.rtl}`}>
                    <div>
                        <h1 className={styles.mainTitle}>مدیریت بانک واژگان و اصطلاحات</h1>
                        <p className={styles.subtitle}>
                            کلمات استخراج شده، وضعیت تایید ادمین و ویژگی‌های گرامری توکن‌های تعاملی پلتفرم لنگی‌کو را در این بخش مدیریت کنید.
                        </p>
                    </div>
                    <div className={styles.headerActions}>
                        <Link href="/dictionary/word/new" className={styles.primaryBtn}>
                            + افزودن واژه جدید
                        </Link>
                    </div>
                </div>

                {/* باکس راهنمای متدولوژی واژگان */}
                <div className={`${styles.noticeContainer} ${styles.rtl}`}>
                    <div className={styles.noticeHeader}>
                        <div className={styles.noticeTitleGroup}>
                            <span className={styles.noticeIcon}>📖</span>
                            <h2 className={styles.noticeTitle}>معماری دیکشنری‌ و چرخه‌ حیات واژه‌ها</h2>
                        </div>
                        <span className={styles.noticeBadge}>پایگاه داده واژگان</span>
                    </div>

                    <div className={styles.noticeGridThreeColumns}>
                        <div className={styles.noticeCard}>
                            <div className={styles.noticeCardHead}>
                                <span className={styles.stepNumber}>۱</span>
                                <h3>ماهیت کلمات پایه (Core Words)</h3>
                            </div>
                            <p>
                                این واژه‌ها به عنوان ساختار اصلی و پایه سیستم عمل می‌کنند. از این داده‌های واحد برای هر زبان، یک دیکشنری مستقل ایجاد می‌شود.
                            </p>
                        </div>

                        <div className={styles.noticeCard}>
                            <div className={styles.noticeCardHead}>
                                <span className={styles.stepNumber}>۲</span>
                                <h3>سیستم نسخه‌گذاری (Versioning)</h3>
                            </div>
                            <p>
                                هر بار که واژه‌ای توسط هوش مصنوعی یا اپراتور انسانی ویرایش و به روز رسانی می‌شود، یک واحد به فیلد <code>version</code> اضافه می‌گردد.
                            </p>
                        </div>

                        <div className={styles.noticeCard}>
                            <div className={styles.noticeCardHead}>
                                <span className={styles.stepNumber}>۳</span>
                                <h3>تایید نهایی و گارد ادیتوریال</h3>
                            </div>
                            <p>
                                واژگان بلافاصله پس از ثبت اولیه یا اعمال آپدیت‌های سیستمی، ملزم به بررسی و تایید توسط لایه مدیریت ارشد هستند.
                            </p>
                        </div>
                    </div>
                </div>

                {/* نوار ابزار فیلترهای پیشرفته و سورتینگ */}
                <div className={`${styles.filterContainer} ${styles.rtl}`}>
                    <div className={styles.filterGrid}>

                        {/* فیلد کاملاً ایزوله جستجوی واژه */}
                        <div className={styles.filterItem}>
                            <label>جستجوی واژه:</label>
                            <input
                                type="text"
                                name="word"
                                placeholder="کلمه مورد نظر..."
                                value={localFilters.word}
                                onChange={handleLocalFilterChange}
                                onKeyDown={handleKeyDown}
                                className={styles.filterInput}
                            />
                        </div>

                        <div className={styles.filterItem}>
                            <label>وضعیت واژه:</label>
                            <select
                                name="adminApproved"
                                value={localFilters.adminApproved}
                                onChange={handleLocalFilterChange}
                                className={styles.filterSelect}
                            >
                                <option value="">همه وضعیت‌ها</option>
                                <option value="true">تایید شده</option>
                                <option value="false">در انتظار تایید</option>
                            </select>
                        </div>

                        <div className={styles.filterItem}>
                            <label>نسخه واژه (Version):</label>
                            <input
                                type="number"
                                name="version"
                                placeholder="مثلاً 1"
                                value={localFilters.version}
                                onChange={handleLocalFilterChange}
                                onKeyDown={handleKeyDown}
                                className={styles.filterInput}
                            />
                        </div>

                        <div className={styles.filterItem}>
                            <label>آخرین آپدیت تا تاریخ:</label>
                            <input
                                type="date"
                                name="endDate"
                                value={localFilters.endDate}
                                onChange={handleLocalFilterChange}
                                className={styles.filterInput}
                            />
                        </div>

                        <div className={styles.filterItem}>
                            <label>مرتب‌سازی بر اساس:</label>
                            <select
                                name="sortBy"
                                value={localFilters.sortBy}
                                onChange={handleLocalFilterChange}
                                className={styles.filterSelect}
                            >
                                <option value="updatedAt">تاریخ آخرین آپدیت</option>
                                <option value="word">حروف الفبا (کلمه)</option>
                                <option value="version">ورژن واژه</option>
                            </select>
                        </div>

                        <div className={styles.filterItem}>
                            <label>جهت مرتب‌سازی:</label>
                            <select
                                name="sortOrder"
                                value={localFilters.sortOrder}
                                onChange={handleLocalFilterChange}
                                className={styles.filterSelect}
                            >
                                <option value="desc">نزولی (جدیدترین / بیشترین)</option>
                                <option value="asc">صعودی (قدیمی‌ترین / کمترین)</option>
                            </select>
                        </div>
                    </div>

                    {/* دکمه اکشن نهایی برای اجرای فیلترینگ و سرچ هم‌زمان */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                        <button
                            type="button"
                            onClick={handleApplyFiltersSubmit}
                            className={styles.primaryBtn}
                            style={{ padding: '0 24px', height: '42px', fontSize: '15px' }}
                        >
                            🔍 اعمال فیلترها و جستجو
                        </button>
                    </div>
                </div>

                {/* بخش نمایش اصلی دیتای واژگان */}
                <div className={styles.rtl}>
                    {loading ? (
                        <p className={styles.emptyState}>در حال دریافت لیست واژگان...</p>
                    ) : words.length === 0 ? (
                        <div className={styles.noDataWrapper}>
                            <p>هیچ واژه‌ای منطبق با فیلترهای تنظیمی یافت نشد.</p>
                            <Link href="/words/new" className={styles.primaryBtn}>
                                اولین واژه خود را اضافه کنید
                            </Link>
                        </div>
                    ) : <TableTheme>
                        <table className={styles.customTable}>
                            <thead>
                            <tr>
                                <th>شناسه</th>
                                <th>واژه (Word)</th>
                                <th>نسخه (Version)</th>
                                <th>وضعیت تایید ادمین</th>
                                <th>آخرین به‌روزرسانی</th>
                                <th>عملیات ادمین</th>
                            </tr>
                            </thead>
                            <tbody>
                            {words.map(item => (
                                <tr key={item._id}>
                                    <td>
                                        <span className={styles.slugCode}>{toFarsiNumber(item._id.substring(0, 8))}</span>
                                    </td>
                                    <td className={styles.wordTextMain}>{item.word}</td>
                                    <td>
                                        <span className={styles.versionBadge}>v {toFarsiNumber(item.version || 1)}</span>
                                    </td>
                                    <td>
                                        {item.adminApproved ? (
                                            <span className={`${styles.statusBadge} ${styles.approved}`}>تایید شده</span>
                                        ) : (
                                            <span className={`${styles.statusBadge} ${styles.pending}`}>در انتظار تایید</span>
                                        )}
                                    </td>
                                    <td className={styles.dateCell}>
                                        {toFarsiNumber(ConvertDateToCalendarString(item.updatedAt || item.createdAt))}
                                    </td>
                                    <td>
                                        <div className={styles.actionGridButtons}>
                                            <Link href={`/dictionary/word/${item.word}`} className={styles.btnEdit}>
                                                ویرایش
                                            </Link>
                                            <button
                                                onClick={() => deleteWord(item._id, item.word)}
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
                    }

                    {words.length > 0 && (
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

export default WordsList;