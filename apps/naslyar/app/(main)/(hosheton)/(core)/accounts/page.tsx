'use client'

import React, { useEffect, useState } from "react";
import styles from "../providers/Providers.module.scss"; // استفاده از استایل کانتینر مشترک و هم‌سایز
import axios from "axios";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { ErrorToaster, SuccessToaster } from "@my-workspace/utils";
import { toFarsiNumber } from "@my-workspace/utils";
import { ConvertFilterObjectToUrlParam } from "hosheton_chat/app/shared/utils";
import { LoadingState, Pagination } from "@my-workspace/components";
import { useAuthStore } from "@/app/zustand/store/authStore";
import { useAppStore } from "@/app/zustand/store/useAppStore";


export default function ProvidersAccounts() {
    const router = useRouter();
    const { token } = useAuthStore();
    const { baseUrl } = useAppStore();

    const [isLoading, setIsLoading] = useState(false);
    const [data, setData] = useState([]);
    const [filter, setFilter] = useState({});

    const [pagination, setPagination] = useState({
        itemPerPage: 7,
        currentPage: 1,
        totalItems: 0,
        lastUpdateBy: ''
    });

    const actions = [
        { name: 'ویرایش اکانت', slug: 'edit' },
        { name: 'حذف اکانت', slug: 'delete' }
    ];

    // تابع فرمت‌دهی تاریخ شمسی
    const formatPersianDate = (dateString: string) => {
        try {
            return new Intl.DateTimeFormat('fa-IR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            }).format(new Date(dateString));
        } catch {
            return '---';
        }
    };

    async function initializeData() {
        if (!token) return;
        try {
            setIsLoading(true);
            const filterParam = Object.keys(filter).length === 0 ? '' : ConvertFilterObjectToUrlParam(filter);
            const res = await axios.get(
                `${baseUrl}/api/provider-accounts?limit=${pagination.itemPerPage}&page=${pagination.currentPage}&${filterParam}`,
                { headers: { authorization: `Bearer ${token}` } }
            );

            if (res.data.statusCode === 200) {
                setData(res.data.data.accounts || []);
                setPagination(prev => ({
                    ...prev,
                    totalItems: res.data.data.totalItems,
                    lastUpdateBy: 'initializer'
                }));
            }
            setIsLoading(false);
        } catch (e) {
            ErrorToaster(e);
            setIsLoading(false);
        }
    }

    async function fetchData(updater: string) {
        if (!token) return;
        try {
            setIsLoading(true);
            const filterParam = Object.keys(filter).length === 0 ? '' : ConvertFilterObjectToUrlParam(filter);
            const res = await axios.get(
                `${baseUrl}/api/provider-accounts?limit=${pagination.itemPerPage}&page=${pagination.currentPage}&${filterParam}`,
                { headers: { authorization: `Bearer ${token}` } }
            );

            if (res.data.statusCode === 200) {
                setData(res.data.data.accounts || []);
                if (updater === 'filter') {
                    setPagination(prev => ({
                        ...prev,
                        totalItems: res.data.data.totalItems,
                        currentPage: 1,
                        lastUpdateBy: updater
                    }));
                }
            }
            setIsLoading(false);
        } catch (e) {
            ErrorToaster(e);
            setIsLoading(false);
        }
    }

    useEffect(() => {
        initializeData();
    }, [token]);

    useEffect(() => {
        if (pagination.lastUpdateBy === "pagination") {
            fetchData('pagination');
        }
    }, [pagination.currentPage, pagination.itemPerPage]);

    useEffect(() => {
        fetchData('filter');
    }, [filter]);

    const handleEdit = (_id: string) => {
        router.push(`/accounts/${_id}`);
    };

    const handleDelete = async (_id: string) => {
        const isConfirmed = window.confirm("آیا از حذف این اکانت مطمئن هستید؟");
        if (!isConfirmed) return;

        try {
            setIsLoading(true);
            const res = await axios.delete(`${baseUrl}/api/provider-accounts/${_id}`, {
                headers: { authorization: `Bearer ${token}` }
            });

            if (res.data.statusCode === 200) {
                SuccessToaster({ message: "اکانت با موفقیت حذف شد" });
                fetchData('pagination');
            }
            setIsLoading(false);
        } catch (e) {
            ErrorToaster(e);
            setIsLoading(false);
        }
    };

    return (
        /* تضمین هم‌سایز بودن دقیق پهنای کل لایوت با استفاده از ساختار کانتینر مشترک */
        <div className={`${styles.container} ${styles.rtl}`}>
            {/* هدر ماژول */}
            <header className={styles.header}>
                <div>
                    <h1 className={styles.mainTitle}>مدیریت حساب‌ها و کلیدهای API</h1>
                    <p className={styles.subtitle}>
                        اتصال، کنترل محدودیت‌ها و مانیتورینگ وضعیت سلامت حساب‌های کاربری متصل به پلتفرم‌های هوش مصنوعی
                    </p>
                </div>
                <Link href="/accounts/new" className={styles.primaryBtn}>
                    + اتصال حساب جدید
                </Link>
            </header>

            {/* بخش راهنمای فنی و تخصصی مفاهیم سهمیه و مدیریت اکانت‌ها */}
            <div className={styles.noticeContainer}>
                <div className={styles.noticeHeader}>
                    <div className={styles.noticeTitleGroup}>
                        <span className={styles.noticeIcon}>🔑</span>
                        <h2 className={styles.noticeTitle}>مفاهیم کلیدی زیرساخت توزیع بار و پایداری حساب‌ها</h2>
                    </div>
                    <span className={styles.noticeBadge}>مخصوص مدیران ارشد</span>
                </div>

                <div className={styles.noticeGrid}>
                    <div className={styles.noticeCard}>
                        <div className={styles.noticeCardHead}>
                            <span className={styles.stepNumber}>Q</span>
                            <h3>مفهوم سهمیه مصرف (Quota)</h3>
                        </div>
                        <p>
                            نشان‌دهنده سقف سرمایه شارژ شده یا سهمیه دلاری مجاز این کلید اختصاصی در پنل مبدا است. فیلد <code>quotaUsed</code> حجم مصرف شده و فیلد <code>quotaLimit</code> کل سهمیه اختصاص‌یافته را پایش می‌کند تا پیش از اتمام موجودی، اقدام به شارژ یا تعویض کلید کنید.
                        </p>
                    </div>

                    <div className={styles.noticeCard}>
                        <div className={styles.noticeCardHead}>
                            <span className={styles.stepNumber}>RL</span>
                            <h3>محدودیت نرخ درخواست (Rate Limit)</h3>
                        </div>
                        <p>
                            ارائه‌دهندگان هوش مصنوعی محدودیت‌هایی بر اساس تعداد درخواست در دقیقه (RPM) یا توکن در دقیقه (TPM) اعمال می‌کنند. برای جلوگیری از خطای ۴۲۹، چند اکانت برای یک ارائه‌دهنده ثبت کنید تا سیستم بار درخواست‌ها را به صورت خودکار توزیع کند.
                        </p>
                    </div>

                    <div className={styles.noticeCard}>
                        <div className={styles.noticeCardHead}>
                            <span className={styles.stepNumber}>H</span>
                            <h3>وضعیت سلامت (Health Status)</h3>
                        </div>
                        <p>
                            سیستم به صورت خودکار پایداری کلیدها را رصد می‌کند. اگر کلیدی منقضی شود، شارژ آن تمام شود یا توسط ارائه‌دهنده مسدود (Ban) گردد، وضعیت آن به غیرفعال تغییر کرده و موقتاً از چرخه توزیع درخواست کاربران خارج می‌شود.
                        </p>
                    </div>
                </div>

                <div className={styles.noticeFooter}>
                    <p>🔒 <strong>نکته امنیتی:</strong> کلیه توکن‌ها و کلیدهای ارتباطی (API Keys) ثبت شده در این صفحه، در دیتابیس مرکزی پورتال انکریپت شده و به لایه‌های فرانت‌اند و کلاینت انتقال داده نمی‌شوند.</p>
                </div>
            </div>

            {/* بخش جدول داده‌ها */}
            <div className={styles.tableToolbar}>
                <Link href="/accounts/new" className={styles.primaryBtn}>
                    + اتصال حساب جدید
                </Link>
            </div>
            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                    <tr>
                        <th>#</th>
                        <th>نام اکانت</th>
                        <th>سهمیه مصرف شده (Quota)</th>
                        <th>ارائه دهنده</th>
                        <th>وضعیت سلامت</th>
                        <th>تاریخ ایجاد</th>
                        <th>عملیات</th>
                    </tr>
                    </thead>
                    <tbody>
                    {isLoading ? (
                        <tr><td colSpan={7}><LoadingState /></td></tr>
                    ) : data?.length === 0 ? (
                        <tr>
                            <td colSpan={7} className={styles.emptyPlaceholder}>
                                هیچ حساب متصلی یافت نشد.
                                <Link href="/accounts/new" className={styles.primaryBtn}>
                                    + اتصال اولین حساب
                                </Link>
                            </td>
                        </tr>
                    ) : (
                        data?.map((item: any, i: number) => (
                            <tr key={item._id || i}>
                                <td data-label="#">{toFarsiNumber(((pagination.currentPage - 1) * pagination.itemPerPage) + (i + 1))}</td>
                                <td data-label="نام اکانت" className={styles.modelName}>{item.name}</td>
                                <td data-label="کوت مصرف شده" className={styles.boldText} style={{ direction: 'ltr', textAlign: 'right' }}>
                                    {toFarsiNumber(item.quotaUsed || 0)} / {toFarsiNumber(item.quotaLimit || 0)}
                                </td>
                                <td data-label="ارائه دهنده"><span className={styles.badgeActive}>{item.providerName}</span></td>
                                <td data-label="وضعیت">
                                    <span className={item.healthStatus === 'active' || item.healthStatus === 'healthy' ? styles.trendUp : styles.noticeBadge} style={{ margin: 0, padding: '2px 10px' }}>
                                        {item.healthStatus === 'active' || item.healthStatus === 'healthy' ? 'فعال و پایدار' : item.healthStatus}
                                    </span>
                                </td>
                                <td data-label="تاریخ ایجاد" className={styles.timeText}>{formatPersianDate(item.createdAt)}</td>
                                <td data-label="عملیات">
                                    <div className={styles.actionButtonsGap}>
                                        <button className={styles.editBtn} onClick={() => handleEdit(item._id)}>ویرایش</button>
                                        <button className={styles.deleteBtn} onClick={() => handleDelete(item._id)}>حذف</button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                    </tbody>
                </table>
            </div>

            {/* کامپوننت پجینیشن */}
            <Pagination
                itemPerPage={pagination.itemPerPage}
                totalItems={pagination.totalItems}
                currentPage={pagination.currentPage}
                paginate={(pageNumber) => {
                    setPagination(prev => ({
                        ...prev,
                        currentPage: pageNumber,
                        lastUpdateBy: "pagination"
                    }));
                }}
                setRowsPerPage={(e) => {
                    setPagination(prev => ({
                        ...prev,
                        lastUpdateBy: "pagination",
                        currentPage: 1,
                        itemPerPage: parseInt(e)
                    }));
                }}
            />
        </div>
    );
}