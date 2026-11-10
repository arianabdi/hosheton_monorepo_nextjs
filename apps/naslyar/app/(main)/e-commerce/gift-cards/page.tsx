'use client';

import ModuleGuide from '../components/ModuleGuide';
import { ECOMMERCE_GUIDES } from '../components/guides';

import React, { useCallback, useEffect, useState } from 'react';
import { Container, Wrapper } from '@/app/(main)/layout';
import { LoadingState } from '@my-workspace/components';
import { ErrorToaster, SuccessToaster, toFarsiNumber } from '@my-workspace/utils';
import styles from '../Ecommerce.module.scss';
import { createGiftCard, deleteGiftCard, fetchGiftCards } from '../e-commerce-api';
import { EcGiftCard, GIFT_CARD_STATUS_LABELS, formatDate, formatToman } from '../e-commerce.types';

const statusBadge: Record<EcGiftCard['status'], string> = {
    active: styles.badgeSuccess,
    used: styles.badgeInfo,
    expired: styles.badgeMuted,
    disabled: styles.badgeDanger,
};

export default function GiftCardsPage() {
    const [giftCards, setGiftCards] = useState<EcGiftCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ amount: '', expiresAt: '' });

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const res: any = await fetchGiftCards();
            setGiftCards(res?.giftCards || []);
        } catch (error) {
            ErrorToaster(error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createGiftCard({
                amount: parseInt(form.amount.replace(/\D/g, ''), 10) || 0,
                expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
            });
            SuccessToaster({ message: 'گیفت کارت صادر شد' });
            setShowForm(false);
            setForm({ amount: '', expiresAt: '' });
            load();
        } catch (error) {
            ErrorToaster(error);
        }
    };

    const handleDelete = async (card: EcGiftCard) => {
        if (!window.confirm(`گیفت کارت «${card.code}» حذف شود؟`)) return;
        try {
            await deleteGiftCard(card._id);
            SuccessToaster({ message: 'حذف شد' });
            load();
        } catch (error) {
            ErrorToaster(error);
        }
    };

    return (
        <Container>
            <Wrapper>
                <div className={`${styles.container} ${styles.rtl}`}>
                    <header className={styles.header}>
                        <div>
                            <h1 className={styles.mainTitle}>گیفت کارت‌ها</h1>
                            <p className={styles.subtitle}>صدور کارت هدیه با کد یکتا — قابل استفاده در سفارشات</p>
                        </div>
                        <button className={styles.primaryBtn} onClick={() => setShowForm(true)}>+ صدور گیفت کارت</button>
                    </header>

                    <ModuleGuide guide={ECOMMERCE_GUIDES.giftCards} />

                    {loading ? (
                        <LoadingState />
                    ) : giftCards.length === 0 ? (
                        <div className={styles.emptyState}>گیفت کارتی صادر نشده است.</div>
                    ) : (
                        <div className={styles.tableWrap}>
                            <table className={styles.dataTable}>
                                <thead>
                                    <tr>
                                        <th>کد</th>
                                        <th>مبلغ</th>
                                        <th>مانده</th>
                                        <th>وضعیت</th>
                                        <th>انقضا</th>
                                        <th>تاریخ صدور</th>
                                        <th>عملیات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {giftCards.map((card) => (
                                        <tr key={card._id}>
                                            <td className={styles.cellLtr} style={{ fontWeight: 700 }}>{card.code}</td>
                                            <td>{formatToman(card.amount)}</td>
                                            <td>{formatToman(card.balance)}</td>
                                            <td>
                                                <span className={`${styles.badge} ${statusBadge[card.status]}`}>
                                                    {GIFT_CARD_STATUS_LABELS[card.status]}
                                                </span>
                                            </td>
                                            <td>{formatDate(card.expiresAt)}</td>
                                            <td>{formatDate(card.createdAt)}</td>
                                            <td>
                                                <button className={styles.deleteBtn} onClick={() => handleDelete(card)}>حذف</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {showForm && (
                        <div className={styles.modalOverlay} onClick={() => setShowForm(false)}>
                            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                                <h3 className={styles.modalTitle}>صدور گیفت کارت</h3>
                                <form onSubmit={handleSubmit}>
                                    <div className={styles.formGrid}>
                                        <div className={styles.field}>
                                            <label>مبلغ (تومان) *</label>
                                            <input dir="ltr" inputMode="numeric" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
                                        </div>
                                        <div className={styles.field}>
                                            <label>تاریخ انقضا</label>
                                            <input dir="ltr" type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
                                        </div>
                                    </div>
                                    <p className={styles.fieldHint}>کد کارت به صورت خودکار تولید می‌شود.</p>
                                    <div className={styles.formActions}>
                                        <button type="submit" className={styles.primaryBtn}>صدور</button>
                                        <button type="button" className={styles.secondaryBtn} onClick={() => setShowForm(false)}>انصراف</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </Wrapper>
        </Container>
    );
}
