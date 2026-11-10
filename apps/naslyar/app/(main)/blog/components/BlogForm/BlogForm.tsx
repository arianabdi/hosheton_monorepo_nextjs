'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { ExpandableSection, Field, LoadingState } from '@my-workspace/components';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import ImageUpload from '@/app/(main)/components/ImageUpload/ImageUpload';

import formStyles from './BlogForm.module.scss';
import { GoogleSearchPreviewSEO } from '@/app/(main)/blog/components/GoogleSearchPreviewSEO/GoogleSearchPreviewSEO';
import KeywordManager from '@/app/(main)/blog/components/keywordManager/KeywordManager';
import { SeoAnalyzer } from '@/app/(main)/blog/components/seoAnalyzer/SeoAnalyzer';
import BlogSectionGuide from '@/app/(main)/blog/components/BlogSectionGuide';

interface CategoryOption {
    _id: string;
    name: string;
}

interface ImagePair {
    original: { _id: string; key?: string; path?: string };
    thumbnail: { _id: string; key?: string; path?: string };
}

interface BlogFormState {
    title: string;
    slug: string;
    hidden: boolean;
    author: string;
    content: string;
    categoryId: string;
    status: string;
}

interface BlogFormProps {
    blogId?: string;
}

export default function BlogForm({ blogId }: BlogFormProps) {
    const router = useRouter();
    const isEditing = Boolean(blogId);
    const { token } = useAuthStore();
    const { baseUrl, appName } = useAppStore();

    const [isLoading, setIsLoading] = useState(isEditing);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isImageLoading, setIsImageLoading] = useState(false);
    const [categories, setCategories] = useState<CategoryOption[]>([]);
    const [featuredImage, setFeaturedImage] = useState<ImagePair | null>(null);
    const [content, setContent] = useState('');
    const [keywords, setKeywords] = useState<string[]>([]);
    const [metaDescription, setMetaDescription] = useState('');
    /** پست سیستمی قفل‌شده (قوانین/حریم خصوصی): slug، دسته و نمایش ثابت است و API آن‌ها را نادیده می‌گیرد */
    const [locked, setLocked] = useState(false);
    const [form, setForm] = useState<BlogFormState>({
        title: '',
        slug: '',
        hidden: false,
        author: '',
        content: '',
        categoryId: '',
        status: 'published',
    });

    useEffect(() => {
        if (!token) return;
        axios
            .get(`${baseUrl}/api/categories/panel?section=post`, {
                headers: { authorization: `Bearer ${token}` },
            })
            .then((res) => {
                if (res.data.statusCode === 200) {
                    setCategories(res.data.data.categories || []);
                }
            })
            .catch(ErrorToaster);
    }, [token, baseUrl]);

    useEffect(() => {
        if (!isEditing || !token) return;
        setIsLoading(true);
        axios
            .get(`${baseUrl}/api/blog/panel/${blogId}`, {
                headers: { authorization: `Bearer ${token}` },
            })
            .then((res) => {
                if (res.data.statusCode === 200) {
                    const data = res.data.data;
                    setForm({
                        title: data.title || '',
                        slug: data.slug || '',
                        hidden: data.hidden || false,
                        author: data.author || '',
                        content: data.content || '',
                        categoryId: data.categoryId || '',
                        status: data.status || 'published',
                    });
                    setContent(data.content || '');
                    setLocked(Boolean(data.locked));
                    setMetaDescription(data.seo?.metaDescription || '');
                    setKeywords(data.seo?.keywords || []);
                    if (data.featuredImage?.original?._id) {
                        setFeaturedImage(data.featuredImage);
                    } else if (data.image?._id) {
                        setFeaturedImage({
                            original: data.image,
                            thumbnail: data.thumbnail || data.image,
                        });
                    }
                }
            })
            .catch(ErrorToaster)
            .finally(() => setIsLoading(false));
    }, [isEditing, blogId, token, baseUrl]);

    const handleImageUpload = async (event: ImagePair | null) => {
        try {
            if (!event) {
                setFeaturedImage(null);
                return;
            }

            setIsImageLoading(true);
            if (blogId) {
                const res = await axios.post(`${baseUrl}/api/blog/panel/${blogId}/image`, event, {
                    headers: { authorization: `Bearer ${token}` },
                });
                if (res.data.statusCode === 200) {
                    toast.success('تصویر با موفقیت آپلود و ذخیره شد');
                    setFeaturedImage(res.data.data?.featuredImage || event);
                }
            } else {
                setFeaturedImage(event);
                toast.info('تصویر به صورت موقت انتخاب شد. پس از ذخیره مقاله، نهایی می‌شود.');
            }
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setIsImageLoading(false);
        }
    };

    const handleRemoveImage = async (originalFileId: string) => {
        try {
            setIsImageLoading(true);
            if (blogId) {
                const res = await axios.delete(
                    `${baseUrl}/api/blog/panel/${blogId}/image/${originalFileId}`,
                    { headers: { authorization: `Bearer ${token}` } },
                );
                if (res.data.statusCode === 200) {
                    toast.success('تصویر با موفقیت حذف شد');
                    setFeaturedImage(null);
                }
            } else {
                setFeaturedImage(null);
            }
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setIsImageLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!token) return;
        try {
            setIsSubmitting(true);

            const payload: Record<string, unknown> = {
                ...form,
                content,
                seo: { keywords, metaDescription },
            };

            if (featuredImage?.original?._id) {
                payload.image = featuredImage.original._id;
                payload.thumbnail = featuredImage.thumbnail?._id || featuredImage.original._id;
            }

            const res = isEditing
                ? await axios.put(`${baseUrl}/api/blog/panel/${blogId}`, payload, {
                      headers: { authorization: `Bearer ${token}` },
                  })
                : await axios.post(`${baseUrl}/api/blog`, payload, {
                      headers: { authorization: `Bearer ${token}` },
                  });

            if (res.data.statusCode === 200) {
                SuccessToaster({ message: `مقاله با موفقیت ${isEditing ? 'ویرایش' : 'ایجاد'} شد` });
                router.push('/blog');
            }
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) return <LoadingState />;

    return (
        <div className={`${formStyles.formContainer} ${formStyles.rtl}`}>
            <h1 className={formStyles.formTitle}>{isEditing ? 'ویرایش مقاله' : 'مقاله جدید'}</h1>
            <p className={formStyles.formDescription}>
                عنوان، محتوا و تنظیمات SEO را تکمیل کنید. شناسه (slug) باید فقط شامل حروف انگلیسی، عدد و خط تیره باشد.
            </p>

            <BlogSectionGuide guideKey="newArticle" compact />

            {locked ? (
                <p className={formStyles.lockedNote}>
                    این پست قفل است (صفحهٔ قوانین یا حریم خصوصی سایت). حذف نمی‌شود و آدرس و دسته ندارد؛ در سایت در
                    صفحهٔ «/legal/…» نمایش داده می‌شود. عنوان، متن، وضعیت انتشار و سئو را می‌توانید ویرایش کنید.
                </p>
            ) : null}

            <div className={formStyles.expandableGroup}>
                <ExpandableSection title="محتوا" defaultExpanded>
                    <div className={formStyles.field}>
                        <label>
                            عنوان
                            <Field
                                value={form.title}
                                type="text"
                                className="form-control form-control-sm"
                                onChange={(e) => setForm((prev) => ({ ...prev, title: e }))}
                            />
                        </label>
                    </div>
                    {!locked ? (
                    <>
                    <div className={formStyles.field}>
                        <label>
                            شناسه (slug)
                            <Field
                                value={form.slug}
                                type="text"
                                className="form-control form-control-sm"
                                onChange={(e) => {
                                    const slug = e.replace(/[^a-zA-Z0-9-_]/g, '').replace(/\s+/g, '-').toLowerCase();
                                    setForm((prev) => ({ ...prev, slug }));
                                }}
                            />
                            <span className={formStyles.hint}>مثال: my-amazing-post</span>
                        </label>
                    </div>
                    <div className={formStyles.field}>
                        <label>
                            دسته‌بندی
                            <Field
                                value={form.categoryId}
                                type="select"
                                className="form-control form-control-sm"
                                options={categories.map((c) => ({ label: c.name, value: c._id }))}
                                onChange={(e) => setForm((prev) => ({ ...prev, categoryId: e }))}
                            />
                        </label>
                    </div>
                    </>
                    ) : null}
                    <div className={formStyles.field}>
                        <label>
                            نویسنده
                            <Field
                                value={form.author}
                                type="text"
                                className="form-control form-control-sm"
                                onChange={(e) => setForm((prev) => ({ ...prev, author: e }))}
                            />
                        </label>
                    </div>
                    <div className={formStyles.field}>
                        <label>
                            محتوا
                            <Field
                                value={content}
                                type="editor"
                                className="form-control form-control-sm"
                                onChange={(e) => {
                                    setForm((prev) => ({ ...prev, content: e }));
                                    setContent(e);
                                }}
                            />
                        </label>
                    </div>
                </ExpandableSection>

                <ExpandableSection title="تصویر شاخص">
                    <div className={formStyles.uploadCard}>
                        <ImageUpload
                            label="تصویر شاخص مقاله"
                            filmId={blogId || null}
                            currentImage={featuredImage || undefined}
                            onRemove={handleRemoveImage}
                            onUpload={handleImageUpload}
                        />
                        {isImageLoading && <p className={formStyles.hint}>در حال پردازش تصویر...</p>}
                    </div>
                </ExpandableSection>

                <ExpandableSection title="انتشار">
                    <div className={formStyles.field}>
                        <label>
                            وضعیت
                            <Field
                                value={form.status}
                                type="select"
                                className="form-control form-control-sm"
                                options={[
                                    { label: 'منتشر شده', value: 'published' },
                                    { label: 'پیش‌نویس', value: 'draft' },
                                    { label: 'در انتظار بررسی', value: 'under_review' },
                                    { label: 'در حال ویرایش', value: 'editing' },
                                ]}
                                onChange={(e) => setForm((prev) => ({ ...prev, status: e }))}
                            />
                        </label>
                    </div>
                    {!locked ? (
                    <div className={formStyles.field}>
                        <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <input
                                type="checkbox"
                                checked={!form.hidden}
                                onChange={(e) => setForm((prev) => ({ ...prev, hidden: !e.target.checked }))}
                            />
                            نمایش در سایت (لندینگ)
                        </label>
                        <span className={formStyles.hint}>اگر غیرفعال باشد، مقاله در سایت عمومی نمایش داده نمی‌شود.</span>
                    </div>
                    ) : null}
                </ExpandableSection>

                <ExpandableSection title="SEO">
                    <GoogleSearchPreviewSEO
                        name={appName}
                        title={form.title}
                        url={`https://www.${appName}.com/${form.slug}`}
                        description={metaDescription}
                    />
                    <div className={formStyles.field}>
                        <label>
                            Meta Description
                            <Field
                                value={metaDescription}
                                type="text"
                                className="form-control form-control-sm"
                                onChange={setMetaDescription}
                            />
                        </label>
                    </div>
                    <KeywordManager keywords={keywords} setKeywords={setKeywords} />
                    <SeoAnalyzer
                        title={form.title}
                        domain={appName}
                        content={content}
                        keywords={keywords}
                        metaDescription={metaDescription}
                    />
                </ExpandableSection>
            </div>

            <button type="button" className={formStyles.submit} disabled={isSubmitting} onClick={handleSubmit}>
                {isEditing ? 'ذخیره تغییرات' : 'انتشار مقاله'}
            </button>
        </div>
    );
}
