'use client';

import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import Link from 'next/link';
import styles from './GrammarList.module.scss'; // یا می‌توانید از همان فایل استایل قبلی استفاده کنید
import { Container, Wrapper } from "@/app/(main)/layout";
import { ConvertDateToCalendarString, ErrorToaster, SuccessToaster, toFarsiNumber } from "@my-workspace/utils";
import { useRouter } from "next/navigation";
import { Pagination } from "@my-workspace/components";
import TableTheme from "@my-workspace/components/src/TableTheme/TableTheme";
import { useAppStore } from "@/app/zustand/store/useAppStore";
import { useAuthStore } from "@/app/zustand/store/authStore";

interface GrammarItem {
    _id: string;
    slug: string;
    title: string;
    pattern: string;
    adminApproved: boolean;
    updatedAt: string;
    createdAt: string;
}

const GrammarList: React.FC = () => {
    const { baseUrl, appName } = useAppStore();
    const { token } = useAuthStore();
    const router = useRouter();

    useEffect(() => {
        if (appName && appName !== 'lingeeko') {
            router.push('/home');
        }
    }, [appName, router]);

    const [grammars, setGrammars] = useState<GrammarItem[]>([]);
    const [loading, setLoading] = useState(true);

    // ۱. استیت موقت برای فیلترهای گرامر
    const [localFilters, setLocalFilters] = useState({
        title: '',
        slug: '',
        sortBy: 'updatedAt',
        sortOrder: 'desc'
    });

    // ۲. استیت نهایی فیلترها برای برقراری ارتباط با API گرامر
    const [appliedFilters, setAppliedFilters] = useState({
        title: '',
        slug: '',
        sortBy: 'updatedAt',
        sortOrder: 'desc'
    });

    const [pagination, setPagination] = useState({
        itemPerPage: 10,
        currentPage: 1,
        totalItems: 0
    });

    // متد دریافت اطلاعات گرامرها از سرور - کاملاً منطبق با ساختار ماژول NestJS که بالاتر نوشتیم
    const fetchGrammarData = useCallback(async (page: number, limit: number) => {
        if (!token) return;
        try {
            setLoading(true);

            const queryParams = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                ...(appliedFilters.title && { title: appliedFilters.title }),
                ...(appliedFilters.slug && { slug: appliedFilters.slug }),
                sortBy: appliedFilters.sortBy,
                sortOrder: appliedFilters.sortOrder
            });

            // آدرس ریسورس گرامر که در ماژول NestJS ست کردیم
            const res = await axios.get(`${baseUrl}/api/grammar?${queryParams.toString()}`, {
                headers: { "authorization": `Bearer ${token}` },
            });

            if (res.data?.data) {
                setGrammars(res.data.data.grammars || []);
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
        fetchGrammarData(pagination.currentPage, pagination.itemPerPage);
    }, [pagination.currentPage, pagination.itemPerPage, fetchGrammarData]);

    const handleLocalFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setLocalFilters(prev => ({ ...prev, [name]: value }));
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

    const deleteGrammar = async (id: string, grammarTitle: string) => {
        if (!confirm(`آیا از حذف دائمی گرامر "${grammarTitle}" از دیتابیس اطمینان دارید؟`)) return;
        try {
            setLoading(true);
            await axios.delete(`${baseUrl}/api/grammar/${id}`, {
                headers: { "authorization": `Bearer ${token}` },
            });

            SuccessToaster({ message: "ساختار گرامری با موفقیت از سیستم حذف شد" });
            const nextPage = grammars.length === 1 && pagination.currentPage > 1 ? pagination.currentPage - 1 : pagination.currentPage;
            await fetchGrammarData(nextPage, pagination.itemPerPage);
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
                        <h1 className={styles.mainTitle}>مدیریت بانک قواعد و گرامرها</h1>
                        <p className={styles.subtitle}>
                            قواعد گرامری پلتفرم، ساختارهای کلیدی (Trigger Forms) و سیستم تحلیل خودکار زیرنویس هوشمند را مدیریت کنید.
                        </p>
                    </div>
                    <div className={styles.headerActions}>
                        <Link href="/dictionary/grammar/new" className={styles.primaryBtn}>
                            + افزودن یا تولید گرامر جدید
                        </Link>
                    </div>
                </div>

                {/* باکس راهنمای متدولوژی گرامر */}
                <div className={`${styles.noticeContainer} ${styles.rtl}`}>
                    <div className={styles.noticeHeader}>
                        <div className={styles.noticeTitleGroup}>
                            <span className={styles.noticeIcon}>⚙️</span>
                            <h2 className={styles.noticeTitle}>موتور هوشمند تشخیص گرامر زیرنویس</h2>
                        </div>
                        <span className={styles.noticeBadge}>پایگاه داده قواعد</span>
                    </div>

                    <div className={styles.noticeGridThreeColumns}>
                        <div className={styles.noticeCard}>
                            <div className={styles.noticeCardHead}>
                                <span className={styles.stepNumber}>۱</span>
                                <h3>سیستم یکتا شناسه (Slug)</h3>
                            </div>
                            <p>
                                هر گرامر یک Slug اختصاصی دارد که موتور هوش مصنوعی در زمان پردازش زیرنویس فیلم، بخش گرامری را به این شناسه مپ می‌کند.
                            </p>
                        </div>

                        <div className={styles.noticeCard}>
                            <div className={styles.noticeCardHead}>
                                <span className={styles.stepNumber}>۲</span>
                                <h3>کاهش هزینه با ساختار آرایه</h3>
                            </div>
                            <p>
                                جهت بهینه‌سازی توکن‌ها، سیستم فقط لیست آیدی قواعد فعال را به مدل ابری ارسال کرده و از بازتولید متن‌های تکراری جلوگیری می‌کند.
                            </p>
                        </div>

                        <div className={styles.noticeCard}>
                            <div className={styles.noticeCardHead}>
                                <span className={styles.stepNumber}>۳</span>
                                <h3>تایید گارد ادیتوریال</h3>
                            </div>
                            <p>
                                قواعد تولید شده توسط هوش مصنوعی تا زمان تایید نهایی وضعیت ادمین، در بخش کلاینت و سیستم لایو ویدیوها اعمال نخواهند شد.
                            </p>
                        </div>
                    </div>
                </div>

                {/* نوار ابزار فیلترها */}
                <div className={`${styles.filterContainer} ${styles.rtl}`}>
                    <div className={styles.filterGrid}>
                        <div className={styles.filterItem}>
                            <label>جستجوی عنوان گرامر:</label>
                            <input
                                type="text"
                                name="title"
                                placeholder="مثلاً: حال کامل..."
                                value={localFilters.title}
                                onChange={handleLocalFilterChange}
                                onKeyDown={handleKeyDown}
                                className={styles.filterInput}
                            />
                        </div>

                        <div className={styles.filterItem}>
                            <label>جستجوی شناسه گرامر (Slug):</label>
                            <input
                                type="text"
                                name="slug"
                                placeholder="مثلاً: present-perfect..."
                                value={localFilters.slug}
                                onChange={handleLocalFilterChange}
                                onKeyDown={handleKeyDown}
                                className={styles.filterInput}
                            />
                        </div>

                        <div className={styles.filterItem}>
                            <label>مرتب‌سازی بر اساس:</label>
                            <select name="sortBy" value={localFilters.sortBy} onChange={handleLocalFilterChange} className={styles.filterSelect}>
                                <option value="updatedAt">آخرین تغییرات</option>
                                <option value="title">عنوان گرامر</option>
                                <option value="slug">شناسه انگلیسی</option>
                            </select>
                        </div>

                        <div className={styles.filterItem}>
                            <label>جهت مرتب‌سازی:</label>
                            <select name="sortOrder" value={localFilters.sortOrder} onChange={handleLocalFilterChange} className={styles.filterSelect}>
                                <option value="desc">نزولی</option>
                                <option value="asc">صعودی</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                        <button type="button" onClick={handleApplyFiltersSubmit} className={styles.primaryBtn} style={{ padding: '0 24px', height: '42px', fontSize: '15px' }}>
                            🔍 اعمال فیلترها و جستجو
                        </button>
                    </div>
                </div>

                {/* جدول داده‌ها */}
                <div className={styles.rtl}>
                    {loading ? (
                        <p className={styles.emptyState}>در حال دریافت اطلاعات بانک قواعد گرامری...</p>
                    ) : grammars.length === 0 ? (
                        <div className={styles.noDataWrapper}>
                            <p>هیچ قاعده گرامری منطبق با فیلترهای تنظیمی یافت نشد.</p>
                            <Link href="/dictionary/grammar/new" className={styles.primaryBtn}>
                                ایجاد اولین ساختار گرامری
                            </Link>
                        </div>
                    ) : <TableTheme>
                        <table className={styles.customTable}>
                            <thead>
                            <tr>
                                <th>عنوان گرامر (فارسی)</th>
                                <th>شناسه سیستمی (Slug)</th>
                                <th>ساختار فرمول (Pattern)</th>
                                <th>وضعیت ادمین</th>
                                <th>آخرین به‌روزرسانی</th>
                                <th>عملیات</th>
                            </tr>
                            </thead>
                            <tbody>
                            {grammars.map(item => (
                                <tr key={item._id} className={styles.tableRow}>
                                    <td className={styles.wordTextMain}>{item.title}</td>
                                    <td><span className={styles.slugCode}>{item.slug}</span></td>
                                    <td>{item.pattern}</td>
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
                                            <Link href={`/dictionary/grammar/edit/${item.slug}`} className={styles.btnEdit}>
                                                ویرایش
                                            </Link>
                                            <button onClick={() => deleteGrammar(item._id, item.title)} className={styles.btnDelete}>
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

                    {grammars.length > 0 && (
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

export default GrammarList;