'use client';

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useRouter, useParams } from 'next/navigation';
import styles from './NewGrammar.module.scss';
import { Container, Wrapper } from "@/app/(main)/layout";
import { SuccessToaster, ErrorToaster } from "@my-workspace/utils";
import { useAppStore } from "@/app/zustand/store/useAppStore";
import { useAuthStore } from "@/app/zustand/store/authStore";

const GrammarForm: React.FC = () => {
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const router = useRouter();
    const params = useParams();

    // استخراج slug از فولدر [slug] در سیستم داینامیک روتینگ Next.js
    const slugParam = params?.slug as string | undefined;
    const isEditMode = !!slugParam;

    const [loading, setLoading] = useState(false);
    // اگر در حالت ادیت بودیم، تب پیش‌فرض به صورت خودکار روی manual (فرم اصلی) قفل می‌شود
    const [activeTab, setActiveTab] = useState<'ai' | 'manual'>(isEditMode ? 'manual' : 'ai');

    // استیت‌های بخش هوش مصنوعی صفی (AI Bulk)
    const [aiTopics, setAiTopics] = useState<string>('');

    // استیت‌های بخش فرم دستی کامپوننت
    const [manualForm, setManualForm] = useState({
        slug: '',
        title: '',
        pattern: '',
        explanation: '',
        examples: '',
        searchableForms: ''
    });

    // ۱. دریافت اطلاعات گرامر در حالت ویرایش (Edit Mode)
    const fetchGrammarDetail = useCallback(async () => {
        if (!token || !slugParam) return;
        try {
            setLoading(true);
            const res = await axios.get(`${baseUrl}/api/grammar/${slugParam}`, {
                headers: { "authorization": `Bearer ${token}` }
            });

            if (res.data?.data) {
                const item = res.data.data;
                setManualForm({
                    slug: item.slug || '',
                    title: item.title || '',
                    pattern: item.pattern || '',
                    explanation: item.explanation || '',
                    // تبدیل آرایه دیتابیس به رشته متنی برای نمایش در Textarea
                    examples: Array.isArray(item.examples) ? item.examples.join('\n') : '',
                    searchableForms: Array.isArray(item.searchableForms) ? item.searchableForms.join(', ') : ''
                });
            }
            setLoading(false);
        } catch (err: any) {
            setLoading(false);
            ErrorToaster(err);
        }
    }, [baseUrl, token, slugParam]);

    useEffect(() => {
        if (isEditMode) {
            fetchGrammarDetail();
        }
    }, [isEditMode, fetchGrammarDetail]);

    const handleManualChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setManualForm(prev => ({ ...prev, [name]: value }));
    };

    // ۲. ارسال تسک‌ها به موتور صفی هوش مصنوعی (فقط در حالت Create)
    const handleAISubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!aiTopics.trim()) return ErrorToaster({ message: "لطفاً حداقل یک عنوان گرامر وارد کنید." });

        const topicsArray = aiTopics.split('\n').map(t => t.trim()).filter(t => t.length > 0);

        try {
            setLoading(true);
            const res = await axios.post(`${baseUrl}/api/grammar/bulk-import-ai`,
                { topics: topicsArray },
                { headers: { "authorization": `Bearer ${token}` } }
            );

            if (res.status === 201 || res.status === 200) {
                SuccessToaster({ message: `تعداد ${topicsArray.length} درخواست به صف پردازش هوش مصنوعی اضافه شد.` });
                router.push('/grammar');
            }
            setLoading(false);
        } catch (err: any) {
            setLoading(false);
            ErrorToaster(err);
        }
    };

    // ۳. متد ثبت نهایی فرم (پشتیبانی هوشمند از ثبت جدید و ویرایش)
    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const { slug, title, pattern, explanation } = manualForm;
        if (!slug || !title || !pattern || !explanation) {
            return ErrorToaster({ message: "لطفاً فیلدهای الزامی ستاره‌دار را تکمیل فرمایید." });
        }

        const formattedExamples = manualForm.examples.split('\n').map(i => i.trim()).filter(i => i.length > 0);
        const formattedSearchable = manualForm.searchableForms.split(',').map(i => i.trim()).filter(i => i.length > 0);

        try {
            setLoading(true);

            if (isEditMode) {
                // سناریوی ویرایش (به جای کل آرایه، شیء اصلاح شده با متد PUT یا PATCH فرستاده می‌شود)
                const updatePayload = {
                    slug: slug.trim().toLowerCase(),
                    title: title.trim(),
                    pattern: pattern.trim(),
                    explanation: explanation.trim(),
                    examples: formattedExamples,
                    searchableForms: formattedSearchable
                };

                // آدرس دهی بر اساس روت بک‌اند شما برای متد آپدیت گرامر
                const res = await axios.put(`${baseUrl}/api/grammar/${slugParam}`, updatePayload, {
                    headers: { "authorization": `Bearer ${token}` }
                });

                if(res.data.statusCode === 200){
                    router.push('/dictionary/grammar');
                    setLoading(false);
                    SuccessToaster({ message: "تغییرات گرامر با موفقیت به‌روزرسانی شد." });
                }
            } else {
                // سناریوی ثبت جدید کامپوننت شما
                const createPayload = [{
                    slug: slug.trim().toLowerCase(),
                    title: title.trim(),
                    pattern: pattern.trim(),
                    explanation: explanation.trim(),
                    examples: formattedExamples,
                    searchableForms: formattedSearchable
                }];

                const res = await axios.post(`${baseUrl}/api/grammar/bulk-import-manual`,
                    { grammars: createPayload },
                    { headers: { "authorization": `Bearer ${token}` } }
                );

                if(res.data.statusCode === 200){

                    router.push('/dictionary/grammar');
                    SuccessToaster({ message: "قاعده گرامری جدید با موفقیت اضافه شد." });
                    setLoading(false);
                }
            }


        } catch (err: any) {
            setLoading(false);
            ErrorToaster(err);
        }
    };

    return (
        <Container>
            <Wrapper>
                <div className={`${styles.newGrammarContainer} ${styles.rtl}`}>
                    <h1 className={styles.mainTitle}>
                        {isEditMode ? `ویرایش قاعده گرامری: ${manualForm.title}` : 'افزودن قاعده گرامری جدید'}
                    </h1>
                    <p className={styles.subtitle}>
                        {isEditMode
                            ? 'جزئیات ساختاری، فرمول‌ها و ترجمه‌های این قاعده گرامری را بازبینی و اصلاح کنید.'
                            : 'ساختار جدید گرامری را جهت استفاده در سیستم تطبیق خودکار ویدیوها به پلتفرم تزریق کنید.'}
                    </p>

                    {/* تب سوئیچر ادمین - فقط در حالت ایجاد جدید نمایش داده می‌شود */}
                    {!isEditMode && (
                        <div className={styles.tabWrapper}>
                            <button
                                type="button"
                                className={`${styles.tabBtn} ${activeTab === 'ai' ? styles.active : ''}`}
                                onClick={() => setActiveTab('ai')}
                            >
                                🤖 تولید انبوه هوشمند با هوش مصنوعی (Bulk)
                            </button>
                            <button
                                type="button"
                                className={`${styles.tabBtn} ${activeTab === 'manual' ? styles.active : ''}`}
                                onClick={() => setActiveTab('manual')}
                            >
                                ✍️ ثبت دستی فرم گرامر (Manual)
                            </button>
                        </div>
                    )}

                    {/* بخش اول: هوش مصنوعی انبوه (فقط در حالت Create فعال است) */}
                    {!isEditMode && activeTab === 'ai' && (
                        <div className={styles.formBox}>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>
                                    عناوین یا قواعد گرامری مورد نظر (هر کدام در یک خط):
                                </label>
                                <textarea
                                    className={styles.formTextarea}
                                    rows={8}
                                    placeholder="Present Perfect&#10;Would rather&#10;Future Continuous"
                                    value={aiTopics}
                                    onChange={(e) => setAiTopics(e.target.value)}
                                    disabled={loading}
                                />
                                <span className={styles.inputHelp}>
                                    هوش مصنوعی (DeepSeek V3) به صورت ناهمگام ساختار، فرمول، توضیحات فارسی روان و نمونه جملات تستی را تولید کرده و در صف تایید قرار می‌دهد.
                                </span>
                            </div>

                            <div className={styles.btnArea}>
                                <button onClick={(e)=>{handleAISubmit(e)}} className={styles.submitBtn} disabled={loading}>
                                    {loading ? 'در حال ارسال به صف پردازش...' : '🚀 شروع تولید انبوه گرامر با AI'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* بخش دوم: ورود دستی / فُرم ویرایش داده‌ها */}
                    {activeTab === 'manual' && (
                        <form onSubmit={handleManualSubmit} className={styles.formBox}>
                            <div className={styles.formGridTwoColumn}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>عنوان گرامر (فارسی) *</label>
                                    <input
                                        type="text"
                                        name="title"
                                        placeholder="مثال: گذشته کامل"
                                        value={manualForm.title}
                                        onChange={handleManualChange}
                                        className={styles.formInput}
                                        disabled={loading}
                                    />
                                </div>

                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>شناسه سیستمی (Slug انگلیسی) *</label>
                                    <input
                                        type="text"
                                        name="slug"
                                        placeholder="مثال: past-perfect"
                                        value={manualForm.slug}
                                        onChange={handleManualChange}
                                        className={styles.formInput}
                                        disabled={loading || isEditMode} // برای حفظ یکپارچگی روت‌های VOD، تغییر Slug در حالت ادیت قفل می‌شود
                                    />
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>ساختار فرمول کلماتی (Pattern) *</label>
                                <input
                                    type="text"
                                    name="pattern"
                                    placeholder="مثال: subject + had + past participle"
                                    value={manualForm.pattern}
                                    onChange={handleManualChange}
                                    className={styles.formInput}
                                    style={{ direction: 'ltr', textAlign: 'right' }}
                                    disabled={loading}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>توضیحات غنی آموزشی (فارسی) *</label>
                                <textarea
                                    name="explanation"
                                    rows={5}
                                    placeholder="توضیحات ساختاری و نحوه کاربرد گرامر..."
                                    value={manualForm.explanation}
                                    onChange={handleManualChange}
                                    className={styles.formTextarea}
                                    disabled={loading}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>نمونه جملات انگلیسی (هر کدام در یک خط)</label>
                                <textarea
                                    name="examples"
                                    rows={3}
                                    placeholder="I had gone to school before he called.&#10;They had already left."
                                    value={manualForm.examples}
                                    onChange={handleManualChange}
                                    className={styles.formTextarea}
                                    style={{ direction: 'ltr', textAlign: 'right' }}
                                    disabled={loading}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>نشانگرهای ساختاری سرچ (جداشده با کاما انگلیسی ,)</label>
                                <input
                                    type="text"
                                    name="searchableForms"
                                    placeholder="had, had v-3, had been"
                                    value={manualForm.searchableForms}
                                    onChange={handleManualChange}
                                    className={styles.formInput}
                                    style={{ direction: 'ltr', textAlign: 'right' }}
                                    disabled={loading}
                                />
                            </div>

                            <div className={styles.btnArea}>
                                <button type="submit" className={styles.submitBtn} disabled={loading}>
                                    {loading ? 'در حال ثبت اطلاعات...' : isEditMode ? '✨ ویرایش و به‌روزرسانی' : '💾 ذخیره ساختار گرامری'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </Wrapper>
        </Container>
    );
};

export default GrammarForm;