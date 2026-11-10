'use client'

import React, { useEffect, useState } from "react";
import styles from "./Providers.module.scss";
import axios from "axios";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { ErrorToaster, SuccessToaster } from "@my-workspace/utils";
import { MoneySeparator, toFarsiNumber } from "@my-workspace/utils";
import { ConvertFilterObjectToUrlParam } from "hosheton_chat/app/shared/utils";
import { LoadingState, Pagination } from "@my-workspace/components";
import { useAuthStore } from "@/app/zustand/store/authStore";
import { useAppStore } from "@/app/zustand/store/useAppStore";

export default function Providers() {
    const router = useRouter();
    const { token } = useAuthStore();
    const { baseUrl } = useAppStore();
    const [isLoading, setIsLoading] = useState(false);
    const [data, setData] = useState([]);
    const [filter, setFilter] = useState({});

    // استیت‌های محاسباتی برای پر کردن بالای صفحه (کارت‌های آمار)
    const [summary, setSummary] = useState({
        totalCredit: 0,
        totalModels: 0,
        totalAccounts: 0
    });

    const [pagination, setPagination] = useState({
        itemPerPage: 7,
        currentPage: 1,
        totalItems: 0
    });

    const actions = [
        { name: 'ویرایش ارائه دهنده', slug: 'edit' },
        { name: 'حذف ارائه دهنده', slug: 'delete' }
    ];

    async function fetchProvidersData(page = pagination.currentPage, currentFilter = filter) {
        if (!token) return;

        try {
            setIsLoading(true);
            const filterParam = Object.keys(currentFilter).length === 0
                ? ''
                : ConvertFilterObjectToUrlParam(currentFilter);

            const res = await axios.get(
                `${baseUrl}/api/providers?limit=${pagination.itemPerPage}&page=${page}&${filterParam}`,
                { headers: { authorization: `Bearer ${token}` } }
            );

            if (res.data.statusCode === 200) {
                const providers = res.data.data.providers || [];
                setData(providers);
                setPagination(prev => ({
                    ...prev,
                    totalItems: res.data.data.totalItems,
                    currentPage: page
                }));

                // محاسبه پویای آمار کارت‌ها بر اساس دیتای دریافتی
                const credit = providers.reduce((sum, item) => sum + Number(item.remainingCredit || 0), 0);
                const models = providers.reduce((sum, item) => sum + (item.models?.length || 0), 0);
                const accounts = providers.reduce((sum, item) => sum + (item.accounts?.length || 0), 0);

                setSummary({
                    totalCredit: credit,
                    totalModels: models,
                    totalAccounts: accounts
                });
            }
            setIsLoading(false);
        } catch (e) {
            setIsLoading(false);
            ErrorToaster(e);
        }
    }

    useEffect(() => {
        fetchProvidersData(1, filter);
    }, [token, filter]);

    const handleEdit = (_id) => {
        router.push(`/providers/${_id}`);
    };

    const handleDelete = async (_id) => {
        const isConfirmed = window.confirm("آیا از حذف این ارائه دهنده مطمئن هستید؟");
        if (!isConfirmed) return;

        try {
            setIsLoading(true);
            const res = await axios.delete(`${baseUrl}/api/providers/${_id}`, {
                headers: { authorization: `Bearer ${token}` }
            });
            if (res.data.statusCode === 200) {
                SuccessToaster({ message: "ارائه دهنده با موفقیت حذف شد" });
                fetchProvidersData(pagination.currentPage, filter);
            }
        } catch (e) {
            setIsLoading(false);
            ErrorToaster(e);
        }
    };

    return (
        <div className={`${styles.container} ${styles.rtl}`}>
            {/* هدر صفحه */}
            <header className={styles.header}>
                <div>
                    <h1 className={styles.mainTitle}>مدیریت ارائه‌دهندگان هوش مصنوعی</h1>
                    <p className={styles.subtitle}>
                        تنظیمات مربوط به API بسترهای ابری، مدیریت موجودی حساب‌های خارجی و بررسی وضعیت مدل‌های فعال سیستم را به صورت یکپارچه انجام دهید.
                    </p>
                </div>
                <Link href="/providers/new" className={styles.primaryBtn}>
                    + ایجاد ارائه دهنده جدید
                </Link>
            </header>

            {/* بخش راهنمای کاربردی مدیریت ارائه‌دهندگان هوش مصنوعی */}
            <div className={styles.noticeContainer}>
                <div className={styles.noticeHeader}>
                    <div className={styles.noticeTitleGroup}>
                        <span className={styles.noticeIcon}>💡</span>
                        <h2 className={styles.noticeTitle}>راهنمای گام‌به‌گام و نکات کلیدی اتصال بسترهای هوش مصنوعی</h2>
                    </div>
                    <span className={styles.noticeBadge}>مهم برای مدیران</span>
                </div>

                <div className={styles.noticeGrid}>
                    <div className={styles.noticeCard}>
                        <div className={styles.noticeCardHead}>
                            <span className={styles.stepNumber}>۱</span>
                            <h3>تنظیمات لیست سفید (Whitelist IP)</h3>
                        </div>
                        <p>
                            برای ارائه‌دهندگانی مانند OpenAI یا Anthropic، حتماً مطمئن شوید که IP سرور پورتال در بخش <strong>Restricted IPs</strong> پنل توسعه‌دهندگان آن‌ها ثبت شده باشد تا درخواست‌های کاربران به دلیل مسائل امنیتی مسدود نشوند.
                        </p>
                    </div>

                    <div className={styles.noticeCard}>
                        <div className={styles.noticeCardHead}>
                            <span className={styles.stepNumber}>۲</span>
                            <h3>توزیع بار متوازن (Load Balancing)</h3>
                        </div>
                        <p>
                            شما می‌توانید برای یک ارائه‌دهنده واحد (مثلاً Gemini)، چندین اکانت یا API Key مختلف تعریف کنید. سیستم به صورت خودکار بار درخواست‌های چت کاربران را بین اکانت‌های فعال توزیع (Round-Robin) خواهد کرد.
                        </p>
                    </div>

                    <div className={styles.noticeCard}>
                        <div className={styles.noticeCardHead}>
                            <span className={styles.stepNumber}>۳</span>
                            <h3>مدیریت و همگام‌سازی مدل‌ها</h3>
                        </div>
                        <p>
                            پس از ایجاد هر ارائه‌دهنده، وارد بخش ویرایش آن شده و لیست مدل‌های مجاز (مانند <code>gpt-4o</code> یا <code>claude-3-5-sonnet</code>) را ثبت کنید تا کلاینت‌ها بتوانند در پورتال اصلی آن‌ها را انتخاب کنند.
                        </p>
                    </div>
                </div>

                <div className={styles.noticeFooter}>
                    <p>⚠️ <strong>توجه امنیتی:</strong> کلیدهای API به صورت رمزنگاری‌شده (AES-256) در پایگاه‌داده ذخیره می‌شوند و به هیچ عنوان در پاسخ‌های ارسالی به سمت کلاینت فاش نخواهند شد.</p>
                </div>
            </div>

            {/* بخش جدول */}
            <div className={styles.tableToolbar}>
                <Link href="/providers/new" className={styles.primaryBtn}>
                    + ایجاد ارائه دهنده جدید
                </Link>
            </div>
            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                    <tr>
                        <th>#</th>
                        <th>نام ارائه دهنده</th>
                        <th>موجودی حساب</th>
                        <th>تعداد مدل</th>
                        <th>تعداد اکانت</th>
                        <th>تاریخ ایجاد</th>
                        <th>عملیات</th>
                    </tr>
                    </thead>
                    <tbody>
                    {isLoading ? (
                        <tr><td colSpan={7}><LoadingState /></td></tr>
                    ) : data.length === 0 ? (
                        <tr>
                            <td colSpan={7} className={styles.emptyPlaceholder}>
                                هیچ ارائه دهنده‌ای یافت نشد.
                                <Link href="/providers/new" className={styles.primaryBtn}>
                                    + ایجاد اولین ارائه دهنده
                                </Link>
                            </td>
                        </tr>
                    ) : (
                        data.map((item, i) => (
                            <tr key={item._id || i}>
                                <td data-label="#">{toFarsiNumber(i + 1 + (pagination.currentPage - 1) * pagination.itemPerPage)}</td>
                                <td data-label="نام ارائه دهنده" className={styles.modelName}>{item.name}</td>
                                <td data-label="موجودی حساب" className={styles.boldText}>
                                    {toFarsiNumber(MoneySeparator(Number(item.remainingCredit).toFixed(2)))} <span className={styles.currencySmall}>$</span>
                                </td>
                                <td data-label="تعداد مدل">{toFarsiNumber(item.models?.length || 0)}</td>
                                <td data-label="تعداد اکانت">{toFarsiNumber(item.accounts?.length || 0)}</td>
                                <td data-label="تاریخ ایجاد" className={styles.timeText}>{item.createdAt}</td>
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

            <Pagination
                itemPerPage={pagination.itemPerPage}
                totalItems={pagination.totalItems}
                currentPage={pagination.currentPage}
                paginate={(pageNumber) => {
                    fetchProvidersData(pageNumber, filter);
                }}
                setRowsPerPage={(e) => {
                    setPagination(prev => ({ ...prev, itemPerPage: parseInt(e) }));
                    setTimeout(() => fetchProvidersData(1, filter), 0);
                }}
            />
        </div>
    );
}