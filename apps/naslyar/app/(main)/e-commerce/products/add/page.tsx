'use client';

import ModuleGuide from '../../components/ModuleGuide';
import { ECOMMERCE_GUIDES } from '../../components/guides';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Container, Wrapper } from '@/app/(main)/layout';
import { LoadingState } from '@my-workspace/components';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import styles from '../../Ecommerce.module.scss';
import { createProduct, fetchBrands, fetchCategories, fetchProduct, updateProduct } from '../../e-commerce-api';
import { EcBrand, EcCategory, EcProduct, EcProductType, PRODUCT_TYPE_LABELS } from '../../e-commerce.types';

const EMPTY_FORM = {
    titleFa: '',
    titleEn: '',
    slug: '',
    skuPrefix: '',
    productType: 'simple' as EcProductType,
    status: 'draft',
    visibility: 'public',
    shortDescription: '',
    description: '',
    brandId: '',
    price: '',
    salePrice: '',
    weight: '',
    seoTitle: '',
    metaDescription: '',
    moadianIdentifier: '',
    subscriptionPlanId: '',
    images: '',
};

export default function ProductFormPage() {
    const params = useParams();
    const router = useRouter();
    const editId = (params as any)?.id as string | undefined;

    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [categoryIds, setCategoryIds] = useState<string[]>([]);
    const [variants, setVariants] = useState<any[]>([]);
    const [brands, setBrands] = useState<EcBrand[]>([]);
    const [categories, setCategories] = useState<EcCategory[]>([]);
    const [loading, setLoading] = useState(editId ? true : false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const [brandRes, categoryRes] = await Promise.all([
                    fetchBrands() as any,
                    fetchCategories() as any,
                ]);
                setBrands(brandRes?.brands || []);
                setCategories(categoryRes?.categories || []);

                if (editId) {
                    const res: any = await fetchProduct(editId);
                    const product: EcProduct = res?.product;
                    if (product) {
                        setForm({
                            titleFa: product.titleFa || '',
                            titleEn: product.titleEn || '',
                            slug: product.slug || '',
                            skuPrefix: product.skuPrefix || '',
                            productType: product.productType,
                            status: product.status,
                            visibility: product.visibility || 'public',
                            shortDescription: product.shortDescription || '',
                            description: product.description || '',
                            brandId: product.brandId || '',
                            price: product.price ? String(product.price) : '',
                            salePrice: product.salePrice ? String(product.salePrice) : '',
                            weight: product.weight ? String(product.weight) : '',
                            seoTitle: product.seoTitle || '',
                            metaDescription: product.metaDescription || '',
                            moadianIdentifier: product.moadianIdentifier || '',
                            subscriptionPlanId: product.subscriptionPlanId || '',
                            images: (product.images || []).join('\n'),
                        });
                        setCategoryIds(product.categoryIds || []);
                        setVariants(product.variants || []);
                    }
                }
            } catch (error) {
                ErrorToaster(error);
            } finally {
                setLoading(false);
            }
        })();
    }, [editId]);

    const setField = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

    const addVariant = () =>
        setVariants((prev) => [...prev, { sku: '', price: '', salePrice: '', costPrice: '', weight: '', isActive: true }]);

    const updateVariant = (index: number, key: string, value: any) =>
        setVariants((prev) => prev.map((v, i) => (i === index ? { ...v, [key]: value } : v)));

    const removeVariant = (index: number) => setVariants((prev) => prev.filter((_, i) => i !== index));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.titleFa.trim()) {
            ErrorToaster(new Error('نام محصول الزامی است'));
            return;
        }
        try {
            setSaving(true);
            const body: any = {
                ...form,
                price: parseInt(form.price.replace(/\D/g, ''), 10) || 0,
                salePrice: parseInt(form.salePrice.replace(/\D/g, ''), 10) || 0,
                weight: Number(form.weight) || 0,
                images: form.images.split('\n').map((s) => s.trim()).filter(Boolean),
                categoryIds,
                variants: variants.map((v) => ({
                    ...v,
                    price: Number(v.price) || 0,
                    salePrice: Number(v.salePrice) || 0,
                    costPrice: Number(v.costPrice) || 0,
                    weight: Number(v.weight) || 0,
                })),
                subscriptionPlanId: form.subscriptionPlanId || null,
            };
            if (editId) {
                await updateProduct(editId, body);
                SuccessToaster({ message: 'محصول بروزرسانی شد' });
            } else {
                await createProduct(body);
                SuccessToaster({ message: 'محصول ساخته شد' });
            }
            router.push('/e-commerce/products');
        } catch (error) {
            ErrorToaster(error);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <Container>
                <Wrapper>
                    <div className={`${styles.container} ${styles.rtl}`}>
                        <LoadingState />
                    </div>
                </Wrapper>
            </Container>
        );
    }

    return (
        <Container>
            <Wrapper>
                <div className={`${styles.container} ${styles.rtl}`}>
                    <Link className={styles.backLink} href="/e-commerce/products">← بازگشت به محصولات</Link>
                    <header className={styles.header}>
                        <div>
                            <h1 className={styles.mainTitle}>{editId ? 'ویرایش محصول' : 'افزودن محصول جدید'}</h1>
                            <p className={styles.subtitle}>اطلاعات اصلی، قیمت، دسته‌بندی و واریانت‌های محصول را تکمیل کنید</p>
                        </div>
                    </header>

                    <ModuleGuide guide={ECOMMERCE_GUIDES.productForm} />

                    <form onSubmit={handleSubmit}>
                        <div className={styles.sectionCard}>
                            <h3>اطلاعات اصلی</h3>
                            <div className={styles.formGrid}>
                                <div className={styles.field}>
                                    <label>نام فارسی *</label>
                                    <input value={form.titleFa} onChange={(e) => setField('titleFa', e.target.value)} required />
                                </div>
                                <div className={styles.field}>
                                    <label>نام انگلیسی</label>
                                    <input dir="ltr" value={form.titleEn} onChange={(e) => setField('titleEn', e.target.value)} />
                                </div>
                                <div className={styles.field}>
                                    <label>اسلاگ (URL)</label>
                                    <input dir="ltr" placeholder="خالی بگذارید تا خودکار ساخته شود" value={form.slug} onChange={(e) => setField('slug', e.target.value)} />
                                </div>
                                <div className={styles.field}>
                                    <label>پیشوند SKU</label>
                                    <input dir="ltr" value={form.skuPrefix} onChange={(e) => setField('skuPrefix', e.target.value)} />
                                </div>
                                <div className={styles.field}>
                                    <label>نوع محصول</label>
                                    <select value={form.productType} onChange={(e) => setField('productType', e.target.value)}>
                                        {(Object.keys(PRODUCT_TYPE_LABELS) as EcProductType[]).map((t) => (
                                            <option key={t} value={t}>{PRODUCT_TYPE_LABELS[t]}</option>
                                        ))}
                                    </select>
                                    {form.productType === 'subscription' && (
                                        <span className={styles.fieldHint}>
                                            برای محصولات اشتراکی، پلن مرتبط را از بخش اشتراک انتخاب کنید.
                                        </span>
                                    )}
                                </div>
                                <div className={styles.field}>
                                    <label>وضعیت</label>
                                    <select value={form.status} onChange={(e) => setField('status', e.target.value)}>
                                        <option value="draft">پیش‌نویس</option>
                                        <option value="published">منتشر شده</option>
                                        <option value="hidden">مخفی</option>
                                        <option value="archived">بایگانی</option>
                                    </select>
                                </div>
                                <div className={styles.field}>
                                    <label>برند</label>
                                    <select value={form.brandId} onChange={(e) => setField('brandId', e.target.value)}>
                                        <option value="">بدون برند</option>
                                        {brands.map((b) => (
                                            <option key={b._id} value={b._id}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className={styles.field}>
                                    <label>شناسه کالا (سامانه مودیان)</label>
                                    <input dir="ltr" value={form.moadianIdentifier} onChange={(e) => setField('moadianIdentifier', e.target.value)} />
                                </div>
                            </div>
                            <div className={styles.field}>
                                <label>دسته‌بندی‌ها</label>
                                <select
                                    multiple
                                    value={categoryIds}
                                    onChange={(e) => setCategoryIds(Array.from(e.target.selectedOptions, (o) => o.value))}
                                    style={{ minHeight: 110 }}
                                >
                                    {categories.map((c) => (
                                        <option key={c._id} value={c._id}>{c.name}</option>
                                    ))}
                                </select>
                                <span className={styles.fieldHint}>با Ctrl می‌توانید چند دسته انتخاب کنید.</span>
                            </div>
                            <div className={styles.field}>
                                <label>توضیح کوتاه</label>
                                <input value={form.shortDescription} onChange={(e) => setField('shortDescription', e.target.value)} />
                            </div>
                            <div className={styles.field}>
                                <label>توضیحات کامل</label>
                                <textarea value={form.description} onChange={(e) => setField('description', e.target.value)} />
                            </div>
                            <div className={styles.field}>
                                <label>تصاویر (هر خط یک آدرس)</label>
                                <textarea dir="ltr" value={form.images} onChange={(e) => setField('images', e.target.value)} />
                            </div>
                        </div>

                        <div className={styles.sectionCard}>
                            <h3>قیمت و ارسال</h3>
                            <div className={styles.formGrid}>
                                <div className={styles.field}>
                                    <label>قیمت پایه (تومان)</label>
                                    <input dir="ltr" inputMode="numeric" value={form.price} onChange={(e) => setField('price', e.target.value)} />
                                </div>
                                <div className={styles.field}>
                                    <label>قیمت ویژه (تومان)</label>
                                    <input dir="ltr" inputMode="numeric" value={form.salePrice} onChange={(e) => setField('salePrice', e.target.value)} />
                                </div>
                                <div className={styles.field}>
                                    <label>وزن (گرم)</label>
                                    <input dir="ltr" inputMode="numeric" value={form.weight} onChange={(e) => setField('weight', e.target.value)} />
                                </div>
                            </div>
                        </div>

                        <div className={styles.sectionCard}>
                            <h3>
                                واریانت‌ها {variants.length > 0 && <span style={{ opacity: 0.6, fontSize: '0.8rem' }}>({variants.length} عدد)</span>}
                            </h3>
                            <p className={styles.fieldHint} style={{ marginTop: 0 }}>
                                برای محصولات متغیر (سایز/رنگ و...) هر ترکیب را یک واریانت با SKU مستقل ثبت کنید.
                            </p>
                            {variants.map((variant, index) => (
                                <div key={index} className={styles.formGrid} style={{ alignItems: 'end', borderBottom: '1px dashed var(--plan-card-border-color)', paddingBottom: '0.75rem' }}>
                                    <div className={styles.field}>
                                        <label>SKU</label>
                                        <input dir="ltr" value={(variant.sku as string) || ''} onChange={(e) => updateVariant(index, 'sku', e.target.value)} />
                                    </div>
                                    <div className={styles.field}>
                                        <label>بارکد</label>
                                        <input dir="ltr" value={(variant.barcode as string) || ''} onChange={(e) => updateVariant(index, 'barcode', e.target.value)} />
                                    </div>
                                    <div className={styles.field}>
                                        <label>قیمت (تومان)</label>
                                        <input dir="ltr" inputMode="numeric" value={String(variant.price ?? '')} onChange={(e) => updateVariant(index, 'price', e.target.value)} />
                                    </div>
                                    <div className={styles.field}>
                                        <label>قیمت ویژه (تومان)</label>
                                        <input dir="ltr" inputMode="numeric" value={String(variant.salePrice ?? '')} onChange={(e) => updateVariant(index, 'salePrice', e.target.value)} />
                                    </div>
                                    <div className={styles.field} style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
                                        <button type="button" className={styles.deleteBtn} onClick={() => removeVariant(index)}>
                                            حذف
                                        </button>
                                    </div>
                                </div>
                            ))}
                            <button type="button" className={styles.secondaryBtn} onClick={addVariant}>
                                + افزودن واریانت
                            </button>
                        </div>

                        <div className={styles.sectionCard}>
                            <h3>سئو</h3>
                            <div className={styles.formGrid}>
                                <div className={styles.field}>
                                    <label>عنوان سئو</label>
                                    <input value={form.seoTitle} onChange={(e) => setField('seoTitle', e.target.value)} />
                                </div>
                                <div className={styles.field}>
                                    <label>توضیحات متا</label>
                                    <input value={form.metaDescription} onChange={(e) => setField('metaDescription', e.target.value)} />
                                </div>
                            </div>
                        </div>

                        <div className={styles.formActions}>
                            <button type="submit" className={styles.primaryBtn} disabled={saving}>
                                {saving ? 'در حال ذخیره...' : editId ? 'ذخیره تغییرات' : 'ساخت محصول'}
                            </button>
                            <Link className={styles.secondaryBtn} href="/e-commerce/products">انصراف</Link>
                        </div>
                    </form>
                </div>
            </Wrapper>
        </Container>
    );
}
