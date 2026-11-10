'use client';

import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import Link from 'next/link';
import styles from '../../../dictionary/word/WordsList.module.scss';
import { Container, Wrapper } from "@/app/(main)/layout";
import { ErrorToaster, SuccessToaster, toFarsiNumber } from "@my-workspace/utils";
import { useRouter } from "next/navigation";
import { Pagination } from "@my-workspace/components";
import TableTheme from "@my-workspace/components/src/TableTheme/TableTheme";
import { useAppStore } from "@/app/zustand/store/useAppStore";
import { useAuthStore } from "@/app/zustand/store/authStore";

interface VocabWord {
    _id: string;
    word: string;
    totalOccurrences: number;
    sceneCount: number;
    filmCount: number;
}

const MissingVocabulary: React.FC = () => {
    const { baseUrl, appName } = useAppStore();
    const { token } = useAuthStore();
    const router = useRouter();

    useEffect(() => {
        if (appName && appName !== 'lingeeko') router.push('/home');
    }, [appName, router]);

    const [words, setWords] = useState<VocabWord[]>([]);
    const [totalMissing, setTotalMissing] = useState(0);
    const [loading, setLoading] = useState(true);
    const [collecting, setCollecting] = useState(false);
    const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set());
    const [filterWord, setFilterWord] = useState('');
    const [appliedFilter, setAppliedFilter] = useState('');
    const [pagination, setPagination] = useState({ itemPerPage: 20, currentPage: 1, totalItems: 0 });

    const fetchMissing = useCallback(async (page: number, limit: number) => {
        if (!token) return;
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                ...(appliedFilter && { word: appliedFilter }),
            });
            const res = await axios.get(`${baseUrl}/api/vocabulary/missing?${params}`, {
                headers: { authorization: `Bearer ${token}` },
            });
            if (res.data?.data) {
                setWords(res.data.data.words || []);
                setTotalMissing(res.data.data.totalMissing || 0);
                setPagination(prev => ({
                    ...prev,
                    totalItems: res.data.data.totalItems || 0,
                    currentPage: page,
                }));
            }
            setLoading(false);
        } catch (err: any) {
            setLoading(false);
            ErrorToaster(err);
        }
    }, [baseUrl, token, appliedFilter]);

    useEffect(() => {
        fetchMissing(pagination.currentPage, pagination.itemPerPage);
    }, [pagination.currentPage, pagination.itemPerPage, fetchMissing]);

    const toggleWord = (word: string) => {
        setSelectedWords(prev => {
            const next = new Set(prev);
            if (next.has(word)) next.delete(word);
            else next.add(word);
            return next;
        });
    };

    const toggleAll = () => {
        if (selectedWords.size === words.length) {
            setSelectedWords(new Set());
        } else {
            setSelectedWords(new Set(words.map(w => w.word)));
        }
    };

    const collectWords = async (wordList?: string[]) => {
        const toCollect = wordList || Array.from(selectedWords);
        if (!toCollect.length) {
            ErrorToaster({ message: 'حداقل یک واژه انتخاب کنید' });
            return;
        }
        if (!confirm(`آیا ${toCollect.length} واژه به صف جمع‌آوری Oxford/Cambridge اضافه شود؟`)) return;

        try {
            setCollecting(true);
            const res = await axios.post(
                `${baseUrl}/api/vocabulary/collect-missing`,
                { words: toCollect },
                { headers: { authorization: `Bearer ${token}` } },
            );
            SuccessToaster({ message: res.data?.message || `${toCollect.length} واژه به صف اضافه شد` });
            setSelectedWords(new Set());
            setCollecting(false);
        } catch (err: any) {
            setCollecting(false);
            ErrorToaster(err);
        }
    };

    const collectTop100 = async () => {
        if (!confirm('۱۰۰ واژه پرتکرار ناقص به صف جمع‌آوری اضافه شود؟')) return;
        try {
            setCollecting(true);
            const res = await axios.post(
                `${baseUrl}/api/vocabulary/collect-missing`,
                { limit: 100 },
                { headers: { authorization: `Bearer ${token}` } },
            );
            SuccessToaster({ message: res.data?.message || 'واژگان به صف اضافه شدند' });
            setCollecting(false);
        } catch (err: any) {
            setCollecting(false);
            ErrorToaster(err);
        }
    };

    return (
        <Container>
            <Wrapper>
                <div className={`${styles.header} ${styles.rtl}`}>
                    <div>
                        <h1 className={styles.mainTitle}>واژگان ناقص دیکشنری</h1>
                        <p className={styles.subtitle}>
                            واژه‌هایی که در زیرنویس فیلم‌ها استفاده شده‌اند اما در دیکشنری (phrases) وجود ندارند
                        </p>
                    </div>
                    <div className={styles.headerActions}>
                        <Link href="/films/vocabulary" className={styles.btnEdit}>بازگشت</Link>
                        <button
                            onClick={collectTop100}
                            disabled={collecting}
                            className={styles.primaryBtn}
                        >
                            {collecting ? 'در حال پردازش...' : 'جمع‌آوری ۱۰۰ واژه برتر'}
                        </button>
                    </div>
                </div>

                <div className={`${styles.noticeContainer} ${styles.rtl}`} style={{ marginBottom: '1.5rem' }}>
                    <p>
                        مجموع <strong>{toFarsiNumber(totalMissing)}</strong> واژه در فیلم‌ها استفاده شده که در دیکشنری نیست.
                        می‌توانید آن‌ها را انتخاب کرده و به صف جمع‌آوری Oxford/Cambridge (مشابه بخش phrases) ارسال کنید.
                    </p>
                </div>

                <div className={`${styles.filterContainer} ${styles.rtl}`}>
                    <div className={styles.filterGrid}>
                        <div className={styles.filterItem}>
                            <label>فیلتر واژه:</label>
                            <input
                                type="text"
                                placeholder="جستجو..."
                                value={filterWord}
                                onChange={e => setFilterWord(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && (setAppliedFilter(filterWord), setPagination(p => ({ ...p, currentPage: 1 })))}
                                className={styles.filterInput}
                            />
                        </div>
                        <div className={styles.filterItem}>
                            <label>&nbsp;</label>
                            <button
                                onClick={() => { setAppliedFilter(filterWord); setPagination(p => ({ ...p, currentPage: 1 })); }}
                                className={styles.primaryBtn}
                            >
                                اعمال
                            </button>
                        </div>
                        {selectedWords.size > 0 && (
                            <div className={styles.filterItem}>
                                <label>&nbsp;</label>
                                <button
                                    onClick={() => collectWords()}
                                    disabled={collecting}
                                    className={styles.primaryBtn}
                                >
                                    جمع‌آوری {toFarsiNumber(selectedWords.size)} واژه انتخاب‌شده
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className={styles.rtl}>
                    {loading ? (
                        <p className={styles.emptyState}>در حال بارگذاری...</p>
                    ) : words.length === 0 ? (
                        <p className={styles.emptyState}>واژه ناقصی یافت نشد — همه واژگان در دیکشنری موجودند!</p>
                    ) : (
                        <TableTheme>
                            <table className={styles.customTable}>
                                <thead>
                                    <tr>
                                        <th>
                                            <input
                                                type="checkbox"
                                                checked={selectedWords.size === words.length && words.length > 0}
                                                onChange={toggleAll}
                                            />
                                        </th>
                                        <th>واژه</th>
                                        <th>تکرار کل</th>
                                        <th>صحنه‌ها</th>
                                        <th>فیلم‌ها</th>
                                        <th>عملیات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {words.map(w => (
                                        <tr key={w._id}>
                                            <td>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedWords.has(w.word)}
                                                    onChange={() => toggleWord(w.word)}
                                                />
                                            </td>
                                            <td><strong>{w.word}</strong></td>
                                            <td>{toFarsiNumber(w.totalOccurrences)}</td>
                                            <td>{toFarsiNumber(w.sceneCount)}</td>
                                            <td>{toFarsiNumber(w.filmCount)}</td>
                                            <td>
                                                <Link href={`/films/vocabulary/search?q=${w.word}`} className={styles.btnEdit}>
                                                    جزئیات
                                                </Link>
                                                <button
                                                    onClick={() => collectWords([w.word])}
                                                    disabled={collecting}
                                                    className={styles.btnEdit}
                                                    style={{ marginRight: '8px' }}
                                                >
                                                    جمع‌آوری
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </TableTheme>
                    )}
                </div>

                {pagination.totalItems > 0 && (
                    <Pagination
                        currentPage={pagination.currentPage}
                        totalItems={pagination.totalItems}
                        itemPerPage={pagination.itemPerPage}
                        paginate={p => setPagination(prev => ({ ...prev, currentPage: p }))}
                        setRowsPerPage={n => setPagination(prev => ({ ...prev, itemPerPage: n, currentPage: 1 }))}
                    />
                )}
            </Wrapper>
        </Container>
    );
};

export default MissingVocabulary;
