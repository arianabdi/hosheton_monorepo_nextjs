'use client';

import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import Link from 'next/link';
import styles from './Translation.module.scss'; // بازآفرینی استایل‌های هماهنگ با جدول قبلی
import { Container, Wrapper } from "@/app/(main)/layout";
import { ConvertDateToCalendarString, ErrorToaster, SuccessToaster, toFarsiNumber } from "@my-workspace/utils";
import { useRouter } from "next/navigation";
import { Pagination } from "@my-workspace/components";
import TableTheme from "@my-workspace/components/src/TableTheme/TableTheme";
import { useAppStore } from "@/app/zustand/store/useAppStore";
import { useAuthStore } from "@/app/zustand/store/authStore";

interface Translation {
    _id: string;
    word: string;             // واژه اصلی انگلیسی یا مبدا
    translationText: string;  // متن ترجمه شده
    targetLanguage: string;   // زبان مقصد مثلا fa, ar
    adminApproved: boolean;
    version: number;
    updatedAt: string;
    createdAt: string;
}

const TranslationsList: React.FC = () => {
    const { baseUrl, appName } = useAppStore();
    const { token } = useAuthStore();
    const router = useRouter();

    useEffect(() => {
        if (appName && appName !== 'lingeeko') {
            router.push('/home');
        }
    }, [appName, router]);

    const [translations, setTranslations] = useState<Translation[]>([]);
    const [loading, setLoading] = useState(true);

    // ۱. استیت موقت برای فیلترهای ترجمه
    const [localFilters, setLocalFilters] = useState({
        word: '',
        translationText: '',
        targetLanguage: '',
        adminApproved: '',
        version: '',
        endDate: '',
        sortBy: 'updatedAt',
        sortOrder: 'desc'
    });

    // ۲. استیت نهایی اعمال شده برای ریکوئست‌ها
    const [appliedFilters, setAppliedFilters] = useState({
        word: '',
        translationText: '',
        targetLanguage: '',
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

    // متد دریافت دیتای ترجمه‌ها از سرور
    const fetchTranslationsData = useCallback(async (page: number, limit: number) => {
        if (!token) return;
        try {
            setLoading(true);

            const queryParams = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                ...(appliedFilters.word && { word: appliedFilters.word }),
                ...(appliedFilters.translationText && { translationText: appliedFilters.translationText }),
                ...(appliedFilters.targetLanguage && { targetLanguage: appliedFilters.targetLanguage }),
                ...(appliedFilters.adminApproved && { adminApproved: appliedFilters.adminApproved }),
                ...(appliedFilters.version !== '' && { version: appliedFilters.version.toString() }),
                ...(appliedFilters.endDate && { endDate: appliedFilters.endDate }),
                sortBy: appliedFilters.sortBy,
                sortOrder: appliedFilters.sortOrder
            });

            // فراخوانی اندپوینت اختصاصی ترجمه‌ها
            const res = await axios.get(`${baseUrl}/api/translation?${queryParams.toString()}`, {
                headers: { "authorization": `Bearer ${token}` },
            });

            if (res.data?.data) {
                setTranslations(res.data.data.translations || []);
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

    useEffect(() => {
        fetchTranslationsData(pagination.currentPage, pagination.itemPerPage);
    }, [pagination.currentPage, pagination.itemPerPage, fetchTranslationsData]);

    const handleLocalFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setLocalFilters(prev => ({
            ...prev,
            [name]: name === 'version' ? (value !== '' ? Number(value) : '') : value
        }));
    };

    const handleApplyFiltersSubmit = () => {
        setAppliedFilters(localFilters);
        setPagination(prev => ({ ...prev, currentPage: 1 }));
    };

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

    const deleteTranslation = async (id: string, translationText: string) => {
        if (!confirm(`آیا از حذف دائمی ترجمه "${translationText}" اطمینان دارید؟`)) return;
        try {
            setLoading(true);
            const res = await axios.delete(`${baseUrl}/api/translation/${id}`, {
                headers: { "authorization": `Bearer ${token}` },
            });

            if (res.status === 200 || res.data.statusCode === 200) {
                SuccessToaster({ message: "ترجمه مورد نظر با موفقیت حذف شد" });
                const nextPage = translations.length === 1 && pagination.currentPage > 1 ? pagination.currentPage - 1 : pagination.currentPage;
                await fetchTranslationsData(nextPage, pagination.itemPerPage);
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
                        <h1 className={styles.mainTitle}>مدیریت بانک ترجمه‌ها</h1>
                        <p className={styles.subtitle}>
                            عبارات ترجمه‌شده، زبان‌های مقصد و وضعیت تایید لایه‌های معنایی پلتفرم را در این بخش مدیریت کنید.
                        </p>
                    </div>
                    <div className={styles.headerActions}>
                        <Link href="/translations/new" className={styles.primaryBtn}>
                            + افزودن ترجمه جدید
                        </Link>
                    </div>
                </div>

                {/* باکس راهنمای متدولوژی ترجمه‌ها و ساختار چندزبانه */}
                <div className={`${styles.noticeContainer} ${styles.rtl}`}>
                    <div className={styles.noticeHeader}>
                        <div className={styles.noticeTitleGroup}>
                            <span className={styles.noticeIcon}>🌐</span>
                            <h2 className={styles.noticeTitle}>معماری چندزبانه ترجمه ها و همگام‌سازی با هسته واژگان (Core Words)</h2>
                        </div>
                        <span className={styles.noticeBadge} style={{ backgroundColor: '#e0f2fe', color: '#0369a1' }}>ساختار چندزبانه ترجمه ها</span>
                    </div>

                    <div className={styles.noticeGridThreeColumns}>
                        <div className={styles.noticeCard}>
                            <div className={styles.noticeCardHead}>
                                <span className={styles.stepNumber} style={{ backgroundColor: '#0284c7' }}>۱</span>
                                <h3>اتصال به هسته اصلی (Core Words)</h3>
                            </div>
                            <p>
                                تمامی رکوردهای این جدول، مشتق‌شده از بانک واژگان اصلی پلتفرم هستند. کلمه کلیدی مبدا، مرجع واحدی است که اصالت داده را در تمام زبان‌ها تضمین می‌کند.
                            </p>
                        </div>

                        <div className={styles.noticeCard}>
                            <div className={styles.noticeCardHead}>
                                <span className={styles.stepNumber} style={{ backgroundColor: '#0284c7' }}>۲</span>
                                <h3>توسعه‌پذیری نامحدود زبان‌ها (Target Language)</h3>
                            </div>
                            <p>
                                معماری دیتابیس لنگیکو کاملاً داینامیک است. سیستم بر اساس فیلد <code>targetLanguage</code> مهندسی شده و به شما اجازه می‌دهد برای هر واژه مبدا، به صورت هم‌زمان ترجمه‌های مستقل فارسی، عربی، ترکی و... ثبت کنید.
                            </p>
                        </div>
                    </div>
                </div>

                {/* نوار ابزار فیلترهای پیشرفته ترجمه */}
                <div className={`${styles.filterContainer} ${styles.rtl}`}>
                    <div className={styles.filterGrid}>

                        <div className={styles.filterItem}>
                            <label>جستجوی واژه اصلی (مبدا):</label>
                            <input
                                type="text"
                                name="word"
                                placeholder="کلمه مبدا..."
                                value={localFilters.word}
                                onChange={handleLocalFilterChange}
                                onKeyDown={handleKeyDown}
                                className={styles.filterInput}
                            />
                        </div>

                        <div className={styles.filterItem}>
                            <label>جستجوی متن ترجمه:</label>
                            <input
                                type="text"
                                name="translationText"
                                placeholder="متن ترجمه شده..."
                                value={localFilters.translationText}
                                onChange={handleLocalFilterChange}
                                onKeyDown={handleKeyDown}
                                className={styles.filterInput}
                            />
                        </div>

                        <div className={styles.filterItem}>
                            <label>زبان مقصد (Target):</label>
                            <select
                                name="targetLanguage"
                                value={localFilters.targetLanguage}
                                onChange={handleLocalFilterChange}
                                className={styles.filterSelect}
                            >
                                <option value="">همه زبان‌ها</option>
                                <option value="fa">فارسی (fa)</option>
                                <option value="ar">عربی (ar)</option>
                                <option value="tr">ترکی (tr)</option>
                            </select>
                        </div>

                        <div className={styles.filterItem}>
                            <label>وضعیت تایید:</label>
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
                            <label>مرتب‌سازی بر اساس:</label>
                            <select
                                name="sortBy"
                                value={localFilters.sortBy}
                                onChange={handleLocalFilterChange}
                                className={styles.filterSelect}
                            >
                                <option value="updatedAt">تاریخ آخرین آپدیت</option>
                                <option value="word">واژه اصلی</option>
                                <option value="version">ورژن ترجمه</option>
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
                                <option value="desc">نزولی</option>
                                <option value="asc">صعودی</option>
                            </select>
                        </div>
                    </div>

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

                {/* جدول نمایش دیتا */}
                <div className={styles.rtl}>
                    {loading ? (
                        <p className={styles.emptyState}>در حال دریافت لیست ترجمه‌ها...</p>
                    ) : translations.length === 0 ? (
                        <div className={styles.noDataWrapper}>
                            <p>هیچ ترجمه‌ای منطبق با فیلترهای تنظیمی یافت نشد.</p>
                        </div>
                    ) : <TableTheme>
                        <table className={styles.customTable}>
                            <thead>
                            <tr>
                                <th>شناسه</th>
                                <th>واژه اصلی</th>
                                <th>زبان مقصد</th>
                                <th>نسخه</th>
                                <th>وضعیت تایید</th>
                                <th>آخرین به‌روزرسانی</th>
                                <th>عملیات ادمین</th>
                            </tr>
                            </thead>
                            <tbody>
                            {translations.map(item => (
                                <tr key={item._id}>
                                    <td>
                                        <span className={styles.slugCode}>{toFarsiNumber(item._id.substring(0, 8))}</span>
                                    </td>
                                    <td className={styles.wordTextMain}>{item.word}</td>
                                    <td>
                                        <span className={styles.versionBadge}>
                                            {item.targetLanguage}
                                        </span>
                                    </td>
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
                                            <Link href={`/dictionary/translation/${item.word}`} className={styles.btnEdit}>
                                                ویرایش
                                            </Link>
                                            <button
                                                onClick={() => deleteTranslation(item._id, item.translationText)}
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

                    {translations.length > 0 && (
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

export default TranslationsList;