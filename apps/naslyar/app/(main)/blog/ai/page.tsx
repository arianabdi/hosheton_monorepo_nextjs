'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Field, LoadingState } from '@my-workspace/components';
import { ConvertGregorianToJalali, ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import styles from '../Blog.module.scss';
import formStyles from '../components/BlogForm/BlogForm.module.scss';
import BlogSectionGuide from '../components/BlogSectionGuide';
import TableEmptyState from '@/app/(main)/components/TableEmptyState';
import { BLOG_EMPTY_STATES } from '../components/blogGuides';

interface CategoryOption {
    _id: string;
    name: string;
}

interface PromptOption {
    _id: string;
    name: string;
    prompts?: string[];
    extras?: { variables?: Array<{ name: string; label: string }> };
}

interface AiBlogItem {
    _id: string;
    title: string;
    aiGenerationState: string;
    createdAt: string;
    aiPrompt?: { variables?: Record<string, string> };
}

const AI_STATE_LABELS: Record<string, string> = {
    none: 'بدون AI',
    pre_generation: 'پیش‌تولید',
    generating: 'در حال تولید',
    generated: 'تولید شده',
};

export default function BlogAiPage() {
    const router = useRouter();
    const { token } = useAuthStore();
    const { baseUrl, appName } = useAppStore();

    const [categories, setCategories] = useState<CategoryOption[]>([]);
    const [prompts, setPrompts] = useState<PromptOption[]>([]);
    const [selectedPromptId, setSelectedPromptId] = useState('');
    const [blogs, setBlogs] = useState<AiBlogItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [data, setData] = useState<{ title: string; slug: string; categoryId: string; variables: Record<string, string> }>({
        title: '',
        slug: '',
        categoryId: '',
        variables: {},
    });

    const variables = prompts.find((p) => p._id === selectedPromptId)?.extras?.variables || [];

    useEffect(() => {
        if (!token || !appName) return;
        Promise.all([
            axios.get(`${baseUrl}/api/categories/panel?section=post`, {
                headers: { authorization: `Bearer ${token}` },
            }),
            axios.get(`${baseUrl}/api/prompts/panel?section=post`, {
                headers: { authorization: `Bearer ${token}` },
            }),
        ])
            .then(([catRes, promptRes]) => {
                if (catRes.data.statusCode === 200) setCategories(catRes.data.data.categories || []);
                if (promptRes.data.statusCode === 200) {
                    const list: PromptOption[] = promptRes.data.data.prompts || [];
                    setPrompts(list);
                    if (list.length) setSelectedPromptId(list[0]._id);
                }
            })
            .catch(ErrorToaster);
    }, [token, appName, baseUrl]);

    const loadBlogs = async () => {
        if (!selectedPromptId || !token || !appName) return;
        try {
            setIsLoading(true);
            const res = await axios.get(
                `${baseUrl}/api/blog/panel/ai/${selectedPromptId}?section=post`,
                { headers: { authorization: `Bearer ${token}` } }
            );
            if (res.data.statusCode === 200) {
                setBlogs(res.data.data.posts || res.data.data.blogs || []);
            }
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadBlogs();
    }, [selectedPromptId]);

    useEffect(() => {
        const hasGenerating = blogs.some((b) => b.aiGenerationState === 'generating');
        if (!hasGenerating) return;

        const interval = setInterval(() => {
            loadBlogs();
        }, 5000);

        return () => clearInterval(interval);
    }, [blogs, selectedPromptId]);

    const createDraft = async () => {
        if (!token || !appName) return;
        try {
            setIsSubmitting(true);
            const targetPrompt = prompts.find((p) => p._id === selectedPromptId);
            await axios.post(
                `${baseUrl}/api/blog/panel/ai/draft`,
                {
                    title: data.title,
                    slug: data.slug,
                    categoryId: data.categoryId,
                    aiPrompt: {
                        promptId: selectedPromptId,
                        promptName: targetPrompt?.name || '',
                        variables: data.variables,
                    },
                },
                { headers: { authorization: `Bearer ${token}` } }
            );
            SuccessToaster({ message: 'پیش‌نویس ایجاد شد' });
            loadBlogs();
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setIsSubmitting(false);
        }
    };

    const generateBlog = async (blogId: string) => {
        try {
            const res = await axios.post(
                `${baseUrl}/api/blog/panel/ai/new`,
                { blogId },
                { headers: { authorization: `Bearer ${token}` } }
            );
            const jobId = res.data?.data?.jobId;
            SuccessToaster({
                message: jobId
                    ? `تولید در صف قرار گرفت (Job: ${jobId})`
                    : 'تولید محتوا در صف قرار گرفت',
            });
            loadBlogs();
        } catch (e) {
            ErrorToaster(e);
        }
    };

    return (
        <div className={`${styles.container} ${styles.rtl}`}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.mainTitle}>تولید مقاله با AI</h1>
                    <p className={styles.subtitle}>پیش‌نویس بسازید و محتوا را با هوش مصنوعی تولید کنید.</p>
                </div>
                <div className={styles.headerActions}>
                    <Link href="/blog/jobs" className={styles.secondaryBtn}>جاب‌ها</Link>
                    <Link href="/blog" className={styles.secondaryBtn}>بازگشت به لیست</Link>
                </div>
            </header>

            <BlogSectionGuide guideKey="ai" />

            {prompts.length === 0 && !isLoading && (
                <TableEmptyState
                    {...BLOG_EMPTY_STATES.aiPromptsMissing}
                    primaryLabel="ساخت پرامپت"
                    primaryHref="/blog/prompts/new"
                    secondaryLabel="راهنمای پرامپت"
                    secondaryHref="/blog/prompts"
                />
            )}

            {prompts.length > 0 && (
            <div className={formStyles.section} id="ai-draft-form">
                <div className={formStyles.field}>
                    <label>
                        عنوان
                        <Field value={data.title} type="text" className="form-control form-control-sm"
                            onChange={(e) => setData((p) => ({ ...p, title: e }))} />
                    </label>
                </div>
                <div className={formStyles.field}>
                    <label>
                        شناسه (slug)
                        <Field value={data.slug} type="text" className="form-control form-control-sm"
                            onChange={(e) => setData((p) => ({ ...p, slug: e.replace(/[^a-zA-Z0-9-_]/g, '').toLowerCase() }))} />
                    </label>
                </div>
                <div className={formStyles.field}>
                    <label>
                        دسته‌بندی
                        <Field value={data.categoryId} type="select" className="form-control form-control-sm"
                            options={categories.map((c) => ({ label: c.name, value: c._id }))}
                            onChange={(e) => setData((p) => ({ ...p, categoryId: e }))} />
                    </label>
                </div>
                <div className={formStyles.field}>
                    <label>
                        پرامپت
                        <Field value={selectedPromptId} type="select" className="form-control form-control-sm"
                            options={prompts.map((p) => ({ label: p.name, value: p._id }))}
                            onChange={setSelectedPromptId} />
                    </label>
                </div>
                {variables.map((v) => (
                    <div key={v.name} className={formStyles.field}>
                        <label>
                            {v.label}
                            <Field value={data.variables[v.name] || ''} type="text" className="form-control form-control-sm"
                                onChange={(e) => setData((p) => ({
                                    ...p,
                                    variables: { ...p.variables, [v.name]: e },
                                }))} />
                        </label>
                    </div>
                ))}
                <button className={formStyles.submit} disabled={isSubmitting} onClick={createDraft}>
                    ایجاد پیش‌نویس
                </button>
            </div>
            )}

            {prompts.length > 0 && (
            <>
            <h2 className={styles.mainTitle} style={{ fontSize: '1.25rem', marginTop: '2rem' }}>پیش‌نویس‌ها</h2>
            {isLoading ? (
                <LoadingState />
            ) : blogs.length === 0 ? (
                <TableEmptyState
                    {...BLOG_EMPTY_STATES.aiDrafts}
                    primaryLabel="ایجاد پیش‌نویس"
                    onPrimaryClick={() => document.getElementById('ai-draft-form')?.scrollIntoView({ behavior: 'smooth' })}
                />
            ) : (
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>عنوان</th>
                                <th>وضعیت AI</th>
                                <th>تاریخ</th>
                                <th>عملیات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {blogs.map((item) => (
                                <tr key={item._id}>
                                    <td className={styles.modelName}>{item.title}</td>
                                    <td>
                                        <span className={styles.badge}>
                                            {AI_STATE_LABELS[item.aiGenerationState] || item.aiGenerationState}
                                        </span>
                                    </td>
                                    <td className={styles.timeText}>{ConvertGregorianToJalali(item.createdAt)}</td>
                                    <td>
                                        <div className={styles.actionButtonsGap}>
                                            <button className={styles.editBtn} onClick={() => router.push(`/blog/${item._id}`)}>
                                                ویرایش
                                            </button>
                                            <button
                                                className={styles.editBtn}
                                                disabled={item.aiGenerationState === 'generating'}
                                                onClick={() => generateBlog(item._id)}
                                            >
                                                {item.aiGenerationState === 'generating' ? 'در حال تولید...' : 'تولید'}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            </>
            )}
        </div>
    );
}
