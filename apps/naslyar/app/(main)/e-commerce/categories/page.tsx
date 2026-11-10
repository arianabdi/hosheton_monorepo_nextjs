'use client';

import ModuleGuide from '../components/ModuleGuide';
import { ECOMMERCE_GUIDES } from '../components/guides';

import React, { useCallback, useEffect, useState } from 'react';
import { Container, Wrapper } from '@/app/(main)/layout';
import { LoadingState } from '@my-workspace/components';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import styles from '../Ecommerce.module.scss';
import { createCategory, deleteCategory, fetchCategoryTree, updateCategory } from '../e-commerce-api';
import { EcCategory } from '../e-commerce.types';

const EMPTY_FORM = { name: '', slug: '', nameEn: '', parentId: '', order: '0', image: '' };

export default function CategoriesPage() {
    const [tree, setTree] = useState<EcCategory[]>([]);
    const [flat, setFlat] = useState<EcCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [form, setForm] = useState({ ...EMPTY_FORM });

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const res: any = await fetchCategoryTree();
            setTree(res?.tree || []);
            // لیست تخت برای دراپ‌داون والد
            const flatten = (nodes: EcCategory[], depth = 0): any[] =>
                nodes.flatMap((n) => [{ ...n, depth }, ...flatten(n.children || [], depth + 1)]);
            setFlat(flatten(res?.tree || []));
        } catch (error) {
            ErrorToaster(error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const openCreate = () => {
        setForm({ ...EMPTY_FORM });
        setEditId(null);
        setShowForm(true);
    };

    const openEdit = (category: EcCategory) => {
        setForm({
            name: category.name || '',
            slug: category.slug || '',
            nameEn: category.nameEn || '',
            parentId: category.parentId || '',
            order: String(category.order ?? 0),
            image: category.image || '',
        });
        setEditId(category._id);
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) return;
        try {
            const body = { ...form, order: Number(form.order) || 0, parentId: form.parentId || null };
            if (editId) {
                await updateCategory(editId, body);
                SuccessToaster({ message: 'دسته‌بندی بروزرسانی شد' });
            } else {
                await createCategory(body);
                SuccessToaster({ message: 'دسته‌بندی ساخته شد' });
            }
            setShowForm(false);
            load();
        } catch (error) {
            ErrorToaster(error);
        }
    };

    const handleDelete = async (category: EcCategory) => {
        if (!window.confirm(`دسته «${category.name}» حذف شود؟`)) return;
        try {
            await deleteCategory(category._id);
            SuccessToaster({ message: 'حذف شد' });
            load();
        } catch (error) {
            ErrorToaster(error);
        }
    };

    const renderNode = (node: EcCategory, depth = 0): React.ReactNode => (
        <React.Fragment key={node._id}>
            <tr>
                <td style={{ paddingRight: `${0.75 + depth * 1.25}rem` }}>
                    {depth > 0 && <span style={{ opacity: 0.4 }}>└ </span>}
                    <span style={{ fontWeight: depth === 0 ? 700 : 500 }}>{node.name}</span>
                    <span className={styles.cellLtr} style={{ opacity: 0.6, fontSize: '0.72rem', marginRight: '0.5rem' }}>
                        {node.slug}
                    </span>
                </td>
                <td>{node.isActive === false ? 'غیرفعال' : 'فعال'}</td>
                <td>
                    <div className={styles.cellActions}>
                        <button className={styles.smallBtn} onClick={() => openEdit(node)}>ویرایش</button>
                        <button className={styles.deleteBtn} onClick={() => handleDelete(node)}>حذف</button>
                    </div>
                </td>
            </tr>
            {(node.children || []).map((child) => renderNode(child, depth + 1))}
        </React.Fragment>
    );

    return (
        <Container>
            <Wrapper>
                <div className={`${styles.container} ${styles.rtl}`}>
                    <header className={styles.header}>
                        <div>
                            <h1 className={styles.mainTitle}>دسته‌بندی محصولات</h1>
                            <p className={styles.subtitle}>ساختار درختی نامحدود دسته‌بندی‌های فروشگاه</p>
                        </div>
                        <button className={styles.primaryBtn} onClick={openCreate}>+ افزودن دسته</button>
                    </header>

                    <ModuleGuide guide={ECOMMERCE_GUIDES.categories} />

                    {loading ? (
                        <LoadingState />
                    ) : tree.length === 0 ? (
                        <div className={styles.emptyState}>هنوز دسته‌بندی‌ای ساخته نشده است.</div>
                    ) : (
                        <div className={styles.tableWrap}>
                            <table className={styles.dataTable}>
                                <thead>
                                    <tr>
                                        <th>نام</th>
                                        <th>وضعیت</th>
                                        <th>عملیات</th>
                                    </tr>
                                </thead>
                                <tbody>{tree.map((node) => renderNode(node))}</tbody>
                            </table>
                        </div>
                    )}

                    {showForm && (
                        <div className={styles.modalOverlay} onClick={() => setShowForm(false)}>
                            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                                <h3 className={styles.modalTitle}>{editId ? 'ویرایش دسته‌بندی' : 'دسته‌بندی جدید'}</h3>
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
                                            <label>اسلاگ</label>
                                            <input dir="ltr" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
                                        </div>
                                        <div className={styles.field}>
                                            <label>والد</label>
                                            <select value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })}>
                                                <option value="">— بدون والد (ریشه) —</option>
                                                {flat
                                                    .filter((c) => c._id !== editId)
                                                    .map((c) => (
                                                        <option key={c._id} value={c._id}>
                                                            {'— '.repeat((c as any).depth || 0)}{c.name}
                                                        </option>
                                                    ))}
                                            </select>
                                        </div>
                                        <div className={styles.field}>
                                            <label>ترتیب نمایش</label>
                                            <input dir="ltr" type="number" value={form.order} onChange={(e) => setForm({ ...form, order: e.target.value })} />
                                        </div>
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
