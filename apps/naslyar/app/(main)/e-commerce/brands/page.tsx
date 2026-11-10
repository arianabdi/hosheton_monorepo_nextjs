'use client';

import ModuleGuide from '../components/ModuleGuide';
import { ECOMMERCE_GUIDES } from '../components/guides';

import React, { useCallback, useEffect, useState } from 'react';
import { Container, Wrapper } from '@/app/(main)/layout';
import { LoadingState } from '@my-workspace/components';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import styles from '../Ecommerce.module.scss';
import { createBrand, deleteBrand, fetchBrands, updateBrand } from '../e-commerce-api';
import { EcBrand } from '../e-commerce.types';

const EMPTY_FORM = { name: '', nameEn: '', slug: '', logoUrl: '', website: '', country: '', description: '' };

export default function BrandsPage() {
    const [brands, setBrands] = useState<EcBrand[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [form, setForm] = useState({ ...EMPTY_FORM });

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const res: any = await fetchBrands();
            setBrands(res?.brands || []);
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
        if (!form.name.trim()) return;
        try {
            if (editId) {
                await updateBrand(editId, form);
                SuccessToaster({ message: 'برند بروزرسانی شد' });
            } else {
                await createBrand(form);
                SuccessToaster({ message: 'برند ساخته شد' });
            }
            setShowForm(false);
            setEditId(null);
            setForm({ ...EMPTY_FORM });
            load();
        } catch (error) {
            ErrorToaster(error);
        }
    };

    const handleDelete = async (brand: EcBrand) => {
        if (!window.confirm(`برند «${brand.name}» حذف شود؟`)) return;
        try {
            await deleteBrand(brand._id);
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
                            <h1 className={styles.mainTitle}>برندها</h1>
                            <p className={styles.subtitle}>مدیریت برندهای محصولات</p>
                        </div>
                        <button
                            className={styles.primaryBtn}
                            onClick={() => {
                                setForm({ ...EMPTY_FORM });
                                setEditId(null);
                                setShowForm(true);
                            }}
                        >
                            + افزودن برند
                        </button>
                    </header>

                    <ModuleGuide guide={ECOMMERCE_GUIDES.brands} />

                    {loading ? (
                        <LoadingState />
                    ) : brands.length === 0 ? (
                        <div className={styles.emptyState}>برندی ثبت نشده است.</div>
                    ) : (
                        <div className={styles.tableWrap}>
                            <table className={styles.dataTable}>
                                <thead>
                                    <tr>
                                        <th>لوگو</th>
                                        <th>نام</th>
                                        <th>اسلاگ</th>
                                        <th>کشور</th>
                                        <th>وبسایت</th>
                                        <th>عملیات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {brands.map((brand) => (
                                        <tr key={brand._id}>
                                            <td>
                                                {brand.logoUrl ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img src={brand.logoUrl} alt={brand.name} style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'contain' }} />
                                                ) : (
                                                    '—'
                                                )}
                                            </td>
                                            <td style={{ fontWeight: 600 }}>{brand.name}</td>
                                            <td className={styles.cellLtr}>{brand.slug}</td>
                                            <td>{brand.country || '—'}</td>
                                            <td className={styles.cellLtr}>{brand.website || '—'}</td>
                                            <td>
                                                <div className={styles.cellActions}>
                                                    <button
                                                        className={styles.smallBtn}
                                                        onClick={() => {
                                                            setForm({
                                                                name: brand.name || '',
                                                                nameEn: brand.nameEn || '',
                                                                slug: brand.slug || '',
                                                                logoUrl: brand.logoUrl || '',
                                                                website: brand.website || '',
                                                                country: brand.country || '',
                                                                description: brand.description || '',
                                                            });
                                                            setEditId(brand._id);
                                                            setShowForm(true);
                                                        }}
                                                    >
                                                        ویرایش
                                                    </button>
                                                    <button className={styles.deleteBtn} onClick={() => handleDelete(brand)}>حذف</button>
                                                </div>
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
                                <h3 className={styles.modalTitle}>{editId ? 'ویرایش برند' : 'برند جدید'}</h3>
                                <form onSubmit={handleSubmit}>
                                    <div className={styles.formGrid}>
                                        <div className={styles.field}>
                                            <label>نام *</label>
                                            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                                        </div>
                                        <div className={styles.field}>
                                            <label>نام انگلیسی</label>
                                            <input dir="ltr" value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} />
                                        </div>
                                        <div className={styles.field}>
                                            <label>آدرس لوگو</label>
                                            <input dir="ltr" value={form.logoUrl} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} />
                                        </div>
                                        <div className={styles.field}>
                                            <label>وبسایت</label>
                                            <input dir="ltr" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
                                        </div>
                                        <div className={styles.field}>
                                            <label>کشور</label>
                                            <input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className={styles.field}>
                                        <label>توضیحات</label>
                                        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                                    </div>
                                    <div className={styles.formActions}>
                                        <button type="submit" className={styles.primaryBtn}>ذخیره</button>
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
