'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ExpandableSection, Field, LoadingState } from '@my-workspace/components';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { TbCursorText, TbPrompt } from 'react-icons/tb';
import { MdDataObject, MdOutlineInfo } from 'react-icons/md';
import styles from '../createPrompts.module.scss';
import formStyles from '../../components/BlogForm/BlogForm.module.scss';
import listStyles from '../../Blog.module.scss';
import { extractVariables } from '../utils/extractVariablesFromPrompt';
import BlogSectionGuide from '../../components/BlogSectionGuide';

interface PromptFormProps {
    promptId?: string;
}

export default function PromptForm({ promptId }: PromptFormProps) {
    const router = useRouter();
    const isEditing = Boolean(promptId);
    const { token } = useAuthStore();
    const { baseUrl } = useAppStore();

    const [isLoading, setIsLoading] = useState(isEditing);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [variables, setVariables] = useState<Array<{ name: string; label: string }>>([]);
    const [prompts, setPrompts] = useState<string[]>(['']);
    const [data, setData] = useState({ name: '', slug: '', variables: '', rules: '' });

    useEffect(() => {
        if (!isEditing || !token) return;
        setIsLoading(true);
        axios
            .get(`${baseUrl}/api/prompts/panel/${promptId}`, {
                headers: { authorization: `Bearer ${token}` },
            })
            .then((res) => {
                if (res.data.statusCode === 200) {
                    const payload = res.data.data;
                    setData({
                        name: payload.name || '',
                        slug: payload.slug || '',
                        variables: payload.variables || '',
                        rules: payload.rules || '',
                    });
                    setPrompts(payload.prompts?.length ? payload.prompts : ['']);
                }
            })
            .catch(ErrorToaster)
            .finally(() => setIsLoading(false));
    }, [isEditing, promptId, token, baseUrl]);

    useEffect(() => {
        setVariables(data.variables ? extractVariables(data.variables) : []);
    }, [data.variables]);

    const handleSubmit = async () => {
        if (!token) return;
        try {
            setIsSubmitting(true);
            const payload = {
                ...data,
                prompts: prompts.filter((p) => p.trim()),
                section: 'post',
                extras: { variables },
            };

            const res = isEditing
                ? await axios.put(`${baseUrl}/api/prompts/panel/${promptId}`, payload, {
                      headers: { authorization: `Bearer ${token}` },
                  })
                : await axios.post(`${baseUrl}/api/prompts/panel`, payload, {
                      headers: { authorization: `Bearer ${token}` },
                  });

            if (res.data.statusCode === 200) {
                SuccessToaster({ message: `پرامپت با موفقیت ${isEditing ? 'ویرایش' : 'ایجاد'} شد` });
                router.push('/blog/prompts');
            }
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) return <LoadingState />;

    return (
        <div className={`${listStyles.container} ${listStyles.rtl}`}>
            <header className={listStyles.header}>
                <div>
                    <h1 className={listStyles.mainTitle}>{isEditing ? 'ویرایش پرامپت' : 'پرامپت جدید'}</h1>
                    <p className={listStyles.subtitle}>قواعد، متغیرها و بخش‌بندی پرامپت‌های تولید محتوا با AI.</p>
                </div>
                <Link href="/blog/prompts" className={listStyles.secondaryBtn}>بازگشت</Link>
            </header>

            <BlogSectionGuide guideKey="newPrompt" compact />

            <div className={formStyles.expandableGroup}>
                <ExpandableSection title="اطلاعات کلی" defaultExpanded icon={<TbCursorText className={styles.icon} />}>
                    <div className={styles.customInput}>
                        <Field
                            label={'عنوان'}
                            value={data.name}
                            type="text"
                            className="form-control form-control-sm"
                            onChange={(e) => setData((p) => ({ ...p, name: e }))}
                        />
                    </div>
                    <div className={styles.customInput}>
                        <Field
                            label={'شناسه'}
                            value={data.slug}
                            type="text"
                            disabled={isEditing}
                            className="form-control form-control-sm"
                            onChange={(e) => {
                                const slug = e.replace(/[^a-zA-Z0-9-_]/g, '').replace(/\s+/g, '-').toLowerCase();
                                setData((p) => ({ ...p, slug }));
                            }}
                        />
                        <div className={formStyles.hint}>
                            <MdOutlineInfo size={18} /> شناسه فقط با حروف انگلیسی و خط تیره — مثال: my-prompt-slug
                        </div>
                    </div>
                </ExpandableSection>

                <ExpandableSection title="قواعد و متغیرها" icon={<MdDataObject className={styles.icon} />}>
                    <div className={styles.customInput}>
                        <Field
                            label={'قواعد'}
                            value={data.rules}
                            type="textarea"
                            rows={10}
                            className={`form-control form-control-sm ${styles.customTextarea}`}
                            onChange={(e) => setData((p) => ({ ...p, rules: e }))}
                        />
                    </div>
                    <div className={styles.customInput}>
                        <Field
                            style={{
                                textAlign: "left",
                                direction: "ltr"
                            }}
                            label={'متغیر ها'}
                            value={data.variables}
                            type="textarea"
                            rows={10}
                            className={`form-control form-control-sm ${styles.customTextarea}`}
                            onChange={(e) => setData((p) => ({ ...p, variables: e }))}
                        />
                        <div className={formStyles.hint}>
                            مثال متغیر: {`{{ name:title, label:"عنوان" }}`}
                        </div>
                    </div>
                    {variables.length > 0 ? (
                        <div className={styles.variables}>
                            {variables.map((v, i) => (
                                <div key={`${i}-variable-item`} className={styles.variableItemContainer}>
                                    <div className={styles.variableItemIndex}>{i + 1}</div>
                                    <div className={styles.variableItem}>
                                        <p><span>عنوان ورودی</span><span>{v.label}</span></p>
                                        <p><span>نام متغیر</span><span>{v.name}</span></p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : null}
                </ExpandableSection>

                <ExpandableSection title="بخش‌بندی پرامپت‌ها" icon={<TbPrompt className={styles.icon} />}>
                    {prompts.map((prompt, index) => (
                        <div key={index} className={styles.customInput}>
                            <Field
                                label={'پرامپت'}
                                value={prompt}
                                type="textarea"
                                rows={10}
                                className={`form-control form-control-sm ${styles.customTextarea}`}
                                onChange={(e) => setPrompts((prev) => prev.map((p, i) => (i === index ? e : p)))}
                            />
                            {prompts.length > 1 && (
                                <button type="button" className={listStyles.deleteBtn} onClick={() => setPrompts((prev) => prev.filter((_, i) => i !== index))}>
                                    حذف
                                </button>
                            )}
                        </div>
                    ))}
                    <button type="button" className={listStyles.secondaryBtn} onClick={() => setPrompts((prev) => [...prev, ''])}>
                        + افزودن پرامپت
                    </button>
                </ExpandableSection>
            </div>

            <button type="button" className={formStyles.submit} disabled={isSubmitting} onClick={handleSubmit}>
                {isEditing ? 'ذخیره تغییرات' : 'ایجاد پرامپت'}
            </button>
        </div>
    );
}
