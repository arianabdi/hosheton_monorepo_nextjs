'use client';



import React, { useEffect, useState, useCallback } from 'react';

import axios from 'axios';

import Link from 'next/link';

import { useRouter } from 'next/navigation';

import styles from './users.module.scss';

import { Container, Wrapper } from '@/app/(main)/layout';

import { ConvertDateToCalendarString, ErrorToaster, SuccessToaster, toFarsiNumber } from '@my-workspace/utils';

import { Pagination, LoadingState } from '@my-workspace/components';

import TableEmptyState from '@/app/(main)/components/TableEmptyState';

import { TbUsers } from 'react-icons/tb';

import TableTheme from '@my-workspace/components/src/TableTheme/TableTheme';

import { useAppStore } from '@/app/zustand/store/useAppStore';

import { useAuthStore } from '@/app/zustand/store/authStore';

import HrRowActionMenu from '@/app/(main)/management/hr/components/HrRowActionMenu';

import { fetchAccessRoles, type AccessRoleItem } from './access-api';

import { getAdminUserDisplayParts } from './user-list-api';



interface UserItem {

    _id: string;

    username: string;

    email?: string;

    fullName?: string;

    mobile?: string;

    identity_verified?: boolean;

    accessRoleId?: string;

    accessRoleName?: string;

    createdAt: string;

}



const UsersList: React.FC = () => {

    const router = useRouter();

    const { baseUrl } = useAppStore();

    const { token } = useAuthStore();



    const [users, setUsers] = useState<UserItem[]>([]);

    const [accessRoles, setAccessRoles] = useState<AccessRoleItem[]>([]);

    const [loading, setLoading] = useState(true);



    const [localFilters, setLocalFilters] = useState({

        username: '',

        accessRoleId: '',

        email: '',

        sortBy: 'createdAt',

        sortOrder: 'desc',

    });



    const [appliedFilters, setAppliedFilters] = useState({

        username: '',

        accessRoleId: '',

        email: '',

        sortBy: 'createdAt',

        sortOrder: 'desc',

    });



    const [pagination, setPagination] = useState({

        itemPerPage: 10,

        currentPage: 1,

        totalItems: 0,

    });



    const loadAccessRoles = useCallback(async () => {

        try {

            const { items } = await fetchAccessRoles();

            setAccessRoles(items);

        } catch {

            /* optional */

        }

    }, []);



    const fetchUsersData = useCallback(async (page: number, limit: number) => {

        if (!token) return;

        try {

            setLoading(true);



            const queryParams = new URLSearchParams({

                page: page.toString(),

                limit: limit.toString(),

                ...(appliedFilters.username && { username: appliedFilters.username }),

                ...(appliedFilters.accessRoleId && { accessRoleId: appliedFilters.accessRoleId }),

                ...(appliedFilters.email && { email: appliedFilters.email }),

                sortBy: appliedFilters.sortBy,

                sortOrder: appliedFilters.sortOrder,

            });



            const res = await axios.get(`${baseUrl}/api/user/list?${queryParams.toString()}`, {

                headers: { authorization: `Bearer ${token}` },

            });



            if (res.data?.data) {

                setUsers(res.data.data.users || res.data.data || []);

                setPagination((prev) => ({

                    ...prev,

                    totalItems: res.data.data.totalItems || res.data.data.length || 0,

                    currentPage: page,

                    itemPerPage: limit,

                }));

            }

            setLoading(false);

        } catch (err: unknown) {

            setLoading(false);

            ErrorToaster(err);

        }

    }, [baseUrl, token, appliedFilters]);



    useEffect(() => {

        void loadAccessRoles();

    }, [loadAccessRoles]);



    useEffect(() => {

        fetchUsersData(pagination.currentPage, pagination.itemPerPage);

    }, [pagination.currentPage, pagination.itemPerPage, fetchUsersData]);



    const handleLocalFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {

        const { name, value } = e.target;

        setLocalFilters((prev) => ({ ...prev, [name]: value }));

    };



    const handleApplyFiltersSubmit = () => {

        setAppliedFilters(localFilters);

        setPagination((prev) => ({ ...prev, currentPage: 1 }));

    };



    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {

        if (e.key === 'Enter') handleApplyFiltersSubmit();

    };



    const handleSetRowsPerPage = (newItemPerPage: number) => {

        setPagination((prev) => ({ ...prev, itemPerPage: newItemPerPage, currentPage: 1 }));

    };



    const handlePaginate = (newPage: number) => {

        setPagination((prev) => ({ ...prev, currentPage: newPage }));

    };



    const deleteUser = async (id: string, displayName: string) => {

        if (!confirm(`آیا از حذف دائمی کاربر «${displayName}» اطمینان دارید؟`)) return;

        try {

            setLoading(true);

            const res = await axios.delete(`${baseUrl}/api/user/${id}`, {

                headers: { authorization: `Bearer ${token}` },

            });



            if (res.status === 200 || res.data.statusCode === 200) {

                SuccessToaster({ message: 'کاربر با موفقیت حذف شد' });

                const nextPage =

                    users.length === 1 && pagination.currentPage > 1

                        ? pagination.currentPage - 1

                        : pagination.currentPage;

                await fetchUsersData(nextPage, pagination.itemPerPage);

            }

            setLoading(false);

        } catch (err: unknown) {

            setLoading(false);

            ErrorToaster(err);

        }

    };



    const hasActiveFilters =

        appliedFilters.username || appliedFilters.email || appliedFilters.accessRoleId;



    return (

        <Container>

            <Wrapper>

                <div className={`${styles.header} ${styles.rtl}`}>

                    <div>

                        <h1 className={styles.mainTitle}>مدیریت کاربران</h1>

                        <p className={styles.subtitle}>

                            لیست حساب‌های ورود پلتفرم، سطح دسترسی naslyar و اطلاعات تماس.

                        </p>

                    </div>

                    <div className={styles.headerActions}>

                        <Link href="/users/access-roles" className={styles.primaryBtn} style={{ background: 'transparent', color: 'var(--brand-color)', border: '1px solid var(--brand-color)' }}>

                            نقش‌ها و دسترسی‌ها

                        </Link>

                        <Link href="/users/new-admin" className={styles.primaryBtn}>

                            + افزودن کاربر

                        </Link>

                    </div>

                </div>



                <div className={`${styles.noticeContainer} ${styles.rtl}`} style={{ marginBottom: '1rem', background: 'color-mix(in srgb, var(--brand-color) 8%, transparent)' }}>

                    <p style={{ margin: 0, fontSize: '0.82rem', lineHeight: 1.75 }}>

                        برای پروفایل سازمانی کارکنان (واحد، سمت، گردش کار اسناد) به{' '}

                        <Link href="/management/hr" style={{ color: 'var(--brand-color)', fontWeight: 600 }}>منابع انسانی</Link>

                        {' '}مراجعه کنید. سطح دسترسی naslyar از{' '}

                        <Link href="/users/access-roles" style={{ color: 'var(--brand-color)', fontWeight: 600 }}>نقش‌ها و دسترسی‌ها</Link>

                        {' '}تعیین می‌شود.

                    </p>

                </div>



                <div className={`${styles.filterContainer} ${styles.rtl}`}>

                    <div className={styles.filterGrid}>

                        <div className={styles.filterItem}>

                            <label>نام / شماره تماس:</label>

                            <input

                                type="text"

                                name="username"

                                placeholder="جستجو..."

                                value={localFilters.username}

                                onChange={handleLocalFilterChange}

                                onKeyDown={handleKeyDown}

                                className={styles.filterInput}

                            />

                        </div>



                        <div className={styles.filterItem}>

                            <label>ایمیل:</label>

                            <input

                                type="text"

                                name="email"

                                placeholder="example@mail.com"

                                value={localFilters.email}

                                onChange={handleLocalFilterChange}

                                onKeyDown={handleKeyDown}

                                className={styles.filterInput}

                            />

                        </div>



                        <div className={styles.filterItem}>

                            <label>سطح دسترسی:</label>

                            <select

                                name="accessRoleId"

                                value={localFilters.accessRoleId}

                                onChange={handleLocalFilterChange}

                                className={styles.filterSelect}

                            >

                                <option value="">همه</option>

                                <option value="none">بدون نقش</option>

                                {accessRoles.map((role) => (

                                    <option key={role._id} value={role._id}>

                                        {role.name}

                                    </option>

                                ))}

                            </select>

                        </div>



                        <div className={styles.filterItem}>

                            <label>مرتب‌سازی:</label>

                            <select

                                name="sortBy"

                                value={localFilters.sortBy}

                                onChange={handleLocalFilterChange}

                                className={styles.filterSelect}

                            >

                                <option value="createdAt">تاریخ عضویت</option>

                                <option value="username">نام کاربری</option>

                                <option value="updatedAt">آخرین فعالیت</option>

                            </select>

                        </div>



                        <div className={styles.filterItem}>

                            <label>جهت:</label>

                            <select

                                name="sortOrder"

                                value={localFilters.sortOrder}

                                onChange={handleLocalFilterChange}

                                className={styles.filterSelect}

                            >

                                <option value="desc">جدیدترین</option>

                                <option value="asc">قدیمی‌ترین</option>

                            </select>

                        </div>

                    </div>



                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>

                        <button type="button" onClick={handleApplyFiltersSubmit} className={styles.primaryBtn} style={{ padding: '0 24px', height: '42px' }}>

                            اعمال فیلتر

                        </button>

                    </div>

                </div>



                <div className={styles.rtl}>

                    {loading ? (

                        <LoadingState />

                    ) : users.length === 0 ? (

                        <TableEmptyState

                            icon={<TbUsers size={32} />}

                            title={hasActiveFilters ? 'کاربری یافت نشد' : 'کاربری ثبت نشده'}

                            description={hasActiveFilters ? 'فیلترها را تغییر دهید.' : 'هنوز کاربری ثبت نشده است.'}

                            secondaryLabel={hasActiveFilters ? 'پاک کردن فیلترها' : undefined}

                            onSecondaryClick={

                                hasActiveFilters

                                    ? () => {

                                          const reset = { username: '', accessRoleId: '', email: '', sortBy: 'createdAt', sortOrder: 'desc' };

                                          setLocalFilters(reset);

                                          setAppliedFilters(reset);

                                          setPagination((prev) => ({ ...prev, currentPage: 1 }));

                                      }

                                    : undefined

                            }

                        />

                    ) : (

                        <TableTheme>

                            <table className={styles.customTable}>

                                <thead>

                                    <tr>

                                        <th>نام و نام خانوادگی</th>

                                        <th>شماره تماس</th>

                                        <th>ایمیل</th>

                                        <th>احراز هویت</th>

                                        <th>سطح دسترسی</th>

                                        <th>تاریخ عضویت</th>

                                        <th>عملیات</th>

                                    </tr>

                                </thead>

                                <tbody>

                                    {users.map((user) => {

                                        const { name } = getAdminUserDisplayParts(user);

                                        return (

                                            <tr key={user._id}>

                                                <td>{name}</td>

                                                <td style={{ direction: 'ltr', textAlign: 'right' }}>

                                                    {user.mobile ? toFarsiNumber(user.mobile) : '—'}

                                                </td>

                                                <td style={{ direction: 'ltr', textAlign: 'right' }}>{user.email || '—'}</td>

                                                <td>

                                                    <span className={`${styles.statusBadge} ${user.identity_verified ? styles.approved : styles.pending}`}>

                                                        {user.identity_verified ? 'احراز شده' : 'احراز نشده'}

                                                    </span>

                                                </td>

                                                <td>

                                                    {user.accessRoleName ? (

                                                        <span className={`${styles.statusBadge} ${styles.pending}`}>

                                                            {user.accessRoleName}

                                                        </span>

                                                    ) : (

                                                        '—'

                                                    )}

                                                </td>

                                                <td className={styles.dateCell}>

                                                    {user.createdAt

                                                        ? toFarsiNumber(ConvertDateToCalendarString(user.createdAt))

                                                        : '—'}

                                                </td>

                                                <td>

                                                    <HrRowActionMenu

                                                        rowId={user._id}

                                                        items={[

                                                            {

                                                                label: 'ویرایش',

                                                                onClick: () => router.push(`/users/profile/${user._id}`),

                                                            },

                                                            {

                                                                label: 'حذف',

                                                                danger: true,

                                                                onClick: () => void deleteUser(user._id, name),

                                                            },

                                                        ]}

                                                    />

                                                </td>

                                            </tr>

                                        );

                                    })}

                                </tbody>

                            </table>

                        </TableTheme>

                    )}



                    {users.length > 0 && (

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



export default UsersList;

