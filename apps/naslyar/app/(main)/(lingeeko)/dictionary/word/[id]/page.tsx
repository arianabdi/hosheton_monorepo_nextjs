'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import axios from 'axios';
import { useParams, useRouter } from 'next/navigation';
import { ErrorToaster, SuccessToaster } from "@my-workspace/utils";
import { useAppStore } from "@/app/zustand/store/useAppStore";
import { useAuthStore } from "@/app/zustand/store/authStore";
import JsonEditor from "@/app/components/jsonEditor/JsonEditor";
import styles from './NewWord.module.scss'; // از همان استایل ماژولار پنل ادمین شما استفاده می‌کنیم
import { Container, Wrapper } from "@/app/(main)/layout";

const WordEdit: React.FC = () => {
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const router = useRouter();
    const { id } = useParams();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [data, setData] = useState();

    // مدیریت تب‌ها (ویرایش کلمه فعلی یا کراولر گروهی کلمات جدید)
    const [activeTab, setActiveTab] = useState<'edit' | 'bulk'>('edit');

    // استیت‌های مربوط به بخش کراولر انبوه واژگان
    const [bulkWords, setBulkWords] = useState<string>('');
    const [selectedLetter, setSelectedLetter] = useState<string>('a');

    const systemFields = useMemo(() =>
            ['_id', 'id', 'wordId', 'createdAt', 'updatedAt', '__v', 'isAlive', '$oid', '$date'],
        []);

    const fetchTranslationDetails = useCallback(async () => {
        if (!token || !id) {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const res = await axios.get(`${baseUrl}/api/word/${id}`, {
                headers: { "authorization": `Bearer ${token}` },
            });
            if (res.data?.data) {
                setData(res.data?.data);
            }
            setLoading(false);
        } catch (err: any) {
            setLoading(false);
            ErrorToaster(err);
        }
    }, [baseUrl, token, id]);

    useEffect(() => {
        fetchTranslationDetails();
    }, [fetchTranslationDetails]);

    const handleSubmit = async (newData) => {
        try {
            setSubmitting(true);
            const res = await axios.put(`${baseUrl}/api/word/${id}`, newData, { // اصلاح روت بر اساس متد پوت کنترلر بک‌اند شما
                headers: { "authorization": `Bearer ${token}` },
            });
            if (res.status === 200 || res.data?.statusCode === 200) {
                SuccessToaster({ message: "تغییرات با موفقیت ذخیره شد" });
                setSubmitting(false);
                router.refresh();
            }
        } catch (err: any) {
            ErrorToaster(err);
            setSubmitting(false);
        }
    };

    // متد ارسال کلمات دلخواه متنی به صف بک‌اند
    const handleBulkWordsSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!bulkWords.trim()) return ErrorToaster({ message: "لطفاً ابتدا چند واژه وارد کنید." });

        // تبدیل متن ادمین به آرایه‌ای از کلمات تمیز شده
        const wordsArray = bulkWords
            .split('\n')
            .map(w => w.trim())
            .filter(w => w.length > 0);

        try {
            setSubmitting(true);
            const res = await axios.post(`${baseUrl}/api/word/collect/bulk-custom`,
                { words: wordsArray },
                { headers: { "authorization": `Bearer ${token}` } }
            );

            if (res.status === 201 || res.status === 200) {
                SuccessToaster({ message: `تعداد ${wordsArray.length} واژه جهت اسکرپ و تحلیل به صف جاب‌ها اضافه شد.` });
                setBulkWords('');
            }
            setSubmitting(false);
        } catch (err: any) {
            setSubmitting(false);
            ErrorToaster(err);
        }
    };

    // متد کراول بر اساس حروف الفبای انتخابی
    const handleLetterCrawlSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            const res = await axios.post(`${baseUrl}/api/word/collect/all/${selectedLetter}`, {}, {
                headers: { "authorization": `Bearer ${token}` }
            });

            if (res.status === 201 || res.status === 200) {
                SuccessToaster({ message: `درخواست استخراج کلمات کلید واژه حرف [${selectedLetter.toUpperCase()}] به صف ارسال شد.` });
            }
            setSubmitting(false);
        } catch (err: any) {
            setSubmitting(false);
            ErrorToaster(err);
        }
    };

    const alphabet = "abcdefghijklmnopqrstuvwxyz".split("");

    return (
        <Container>
            <Wrapper>
                <div className={`${styles.newGrammarContainer} ${styles.rtl}`}>
                    {/* ساختار تب سوئیچر ادمین پلتفرم  */}
                    <div className={styles.tabWrapper}>
                        <button
                            type="button"
                            className={`${styles.tabBtn} ${activeTab === 'edit' ? styles.active : ''}`}
                            onClick={() => setActiveTab('edit')}
                        >
                            📝 ویرایشگر پیشرفته JSON واژه
                        </button>
                        <button
                            type="button"
                            className={`${styles.tabBtn} ${activeTab === 'bulk' ? styles.active : ''}`}
                            onClick={() => setActiveTab('bulk')}
                        >
                            🚀 تزریق گروهی و کراول واژگان جدید (Bulk Job)
                        </button>
                    </div>

                    {/* تب اول: نمایش کامپوننت ادیتور پیشین شما */}
                    {activeTab === 'edit' && (
                        <div>
                            {id ? (
                                <JsonEditor
                                    data={data}
                                    title={'ویرایشگر پیشرفته اطلاعات ترجمه'}
                                    description={'بهینه‌سازی شده برای مجموعه داده‌های بزرگ و پیچیده دیتابیس '}
                                    loading={loading}
                                    handleSubmit={async (newData) => {
                                        await handleSubmit(newData);
                                    }}
                                />
                            ) : (
                                <p className={styles.subtitle} style={{textAlign: 'center', padding: '40px'}}>
                                    شناسه واژه‌ای جهت ویرایش مستقیم یافت نشد. برای شروع می‌توانید از تب تزریق گروهی استفاده کنید.
                                </p>
                            )}
                        </div>
                    )}

                    {/* تب دوم: افزودن واژه و ساخت اتوماتیک جاب کراولر */}
                    {activeTab === 'bulk' && (
                        <div className={styles.formBox} style={{ marginTop: '20px' }}>
                            <div className={styles.formGridTwoColumn}>

                                {/* بخش الف: وارد کردن متن کلمات دلخواه */}
                                <form onSubmit={handleBulkWordsSubmit} className={styles.formGroup} style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '20px' }}>
                                    <h3 className={styles.formLabel} style={{ fontSize: '16px', marginBottom: '12px' }}>
                                        📥 متد اول: تزریق مستقیم کلمات سفارشی
                                    </h3>
                                    <label className={styles.inputHelp} style={{ marginBottom: '8px', display: 'block' }}>
                                        کلمات مورد نظر خود را وارد کنید (هر واژه را در یک خط جدید بنویسید):
                                    </label>
                                    <textarea
                                        className={styles.formTextarea}
                                        rows={10}
                                        placeholder="ubiquitous&#10;serendipity&#10;ephemeral"
                                        value={bulkWords}
                                        onChange={(e) => setBulkWords(e.target.value)}
                                        disabled={submitting}
                                    />
                                    <span className={styles.inputHelp} style={{ marginTop: '6px' }}>
                                        سیستم به ازای هر کلمه یک جاب مجزا در صف پردازش ساخته و اقدام به استخراج دیتای ساختاریافته از آکسفورد/کمبریج می‌کند.
                                    </span>
                                    <div className={styles.btnArea} style={{ marginTop: '16px' }}>
                                        <button type="submit" className={styles.submitBtn} disabled={submitting}>
                                            {submitting ? 'در حال ایجاد جاب‌ها...' : '🔥 پردازش و شروع عملیات واژگان'}
                                        </button>
                                    </div>
                                </form>

                                {/* بخش ب: کراول کل الفبا بر اساس وب‌سایت مرجع */}
                                <form onSubmit={handleLetterCrawlSubmit} className={styles.formGroup} style={{ paddingRight: '10px' }}>
                                    <h3 className={styles.formLabel} style={{ fontSize: '16px', marginBottom: '12px' }}>
                                        🌐 متد دوم: کراولر خودکار بر اساس حروف الفبا
                                    </h3>
                                    <label className={styles.inputHelp} style={{ marginBottom: '8px', display: 'block' }}>
                                        یک حرف انگلیسی را جهت واکشی جامع کل کلمات زیرمجموعه آن از لیست مرجع انتخاب کنید:
                                    </label>

                                    <select
                                        value={selectedLetter}
                                        onChange={(e) => setSelectedLetter(e.target.value)}
                                        className={styles.formInput}
                                        style={{ width: '100%', direction: 'ltr' }}
                                        disabled={submitting}
                                    >
                                        {alphabet.map(letter => (
                                            <option key={letter} value={letter}>
                                                Letter [ {letter.toUpperCase()} ]
                                            </option>
                                        ))}
                                    </select>

                                    <span className={styles.inputHelp} style={{ marginTop: '14px', display: 'block' }}>
                                        این عملیات تمام کلمات نمایه شده ذیل این کاراکتر را اسکرپ کرده و به صورت صف‌بندی‌شده ذخیره می‌نماید.
                                    </span>

                                    <div className={styles.btnArea} style={{ marginTop: '62px' }}>
                                        <button type="submit" className={styles.submitBtn} style={{ backgroundColor: '#10b981' }} disabled={submitting}>
                                            {submitting ? 'در حال هماهنگی...' : `🔍 استخراج کلمات کلید کاراکتر ${selectedLetter.toUpperCase()}`}
                                        </button>
                                    </div>
                                </form>

                            </div>
                        </div>
                    )}
                </div>
            </Wrapper>
        </Container>
    );
};

export default WordEdit;