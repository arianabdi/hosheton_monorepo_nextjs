'use client';

import ModuleGuide from '../components/ModuleGuide';
import { ECOMMERCE_GUIDES } from '../components/guides';

import React, { useCallback, useEffect, useState } from 'react';
import { Container, Wrapper } from '@/app/(main)/layout';
import { LoadingState } from '@my-workspace/components';
import { ErrorToaster, toFarsiNumber } from '@my-workspace/utils';
import styles from '../Ecommerce.module.scss';
import { fetchWishlists } from '../e-commerce-api';
import { EcWishlist } from '../e-commerce.types';

export default function WishlistPage() {
    const [wishlists, setWishlists] = useState<EcWishlist[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const res: any = await fetchWishlists();
            setWishlists(res?.wishlists || []);
        } catch (error) {
            ErrorToaster(error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    return (
        <Container>
            <Wrapper>
                <div className={`${styles.container} ${styles.rtl}`}>
                    <header className={styles.header}>
                        <div>
                            <h1 className={styles.mainTitle}>لیست علاقه‌مندی‌ها</h1>
                            <p className={styles.subtitle}>
                                لیست‌های علاقه‌مندی مشتریان — می‌توانید برای اطلاع‌رسانی کاهش قیمت یا موجود شدن مجدد استفاده کنید
                            </p>
                        </div>
                    </header>

                    <ModuleGuide guide={ECOMMERCE_GUIDES.wishlist} />

                    {loading ? (
                        <LoadingState />
                    ) : wishlists.length === 0 ? (
                        <div className={styles.emptyState}>لیست علاقه‌مندی‌ای ثبت نشده است.</div>
                    ) : (
                        <div className={styles.tableWrap}>
                            <table className={styles.dataTable}>
                                <thead>
                                    <tr>
                                        <th>عنوان لیست</th>
                                        <th>مشتری</th>
                                        <th>تعداد محصولات</th>
                                        <th>عمومی</th>
                                        <th>توکن اشتراک‌گذاری</th>
                                        <th>تاریخ ایجاد</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {wishlists.map((list) => (
                                        <tr key={list._id}>
                                            <td style={{ fontWeight: 600 }}>{list.title}</td>
                                            <td className={styles.cellLtr}>{list.customerId}</td>
                                            <td>{toFarsiNumber(list.productIds?.length || 0)}</td>
                                            <td>
                                                <span className={`${styles.badge} ${list.isPublic ? styles.badgeSuccess : styles.badgeMuted}`}>
                                                    {list.isPublic ? 'عمومی' : 'خصوصی'}
                                                </span>
                                            </td>
                                            <td className={styles.cellLtr}>{list.shareToken || '—'}</td>
                                            <td>{toFarsiNumber(new Date(list.createdAt || '').toLocaleDateString('fa-IR'))}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </Wrapper>
        </Container>
    );
}
