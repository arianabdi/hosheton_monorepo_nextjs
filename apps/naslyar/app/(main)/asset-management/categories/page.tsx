'use client';

import React from 'react';
import { LuTags, LuPlus, LuPencil, LuTrash2 } from 'react-icons/lu';
import { Container, Wrapper } from '@/app/(main)/layout';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { LoadingState, Pagination } from '@my-workspace/components';
import { assetManagementApi, AssetCategory } from '../asset-management-api';
import { useAssetBaseContext } from '../components/useAssetBaseContext';
import AssetModal from '../components/AssetModal';
import ModuleGuide from '../components/ModuleGuide';
import { ASSET_GUIDES } from '../components/guides';
import FilterBar from '../components/FilterBar';
import RowActionMenu from '../components/RowActionMenu';
import { isoToJalaliString } from '../jalali.client';
import styles from '../AssetManagement.module.scss';

interface CategoryFormState {
    title: string;
    code: string;
    description: string;
}

const emptyForm = (): CategoryFormState => ({ title: '', code: '', description: '' });

export default function AssetCategoriesPage() {
    const { reload } = useAssetBaseContext();
    const [loading, setLoading] = React.useState(true);
    const [categories, setCategories] = React.useState<AssetCategory[]>([]);
    const [modalOpen, setModalOpen] = React.useState(false);
    const [editing, setEditing] = React.useState<AssetCategory | null>(null);
    const [form, setForm] = React.useState<CategoryFormState>(emptyForm);
    const [saving, setSaving] = React.useState(false);

    // فیلتر و صفحه‌بندی سمت کلاینت
    const [search, setSearch] = React.useState('');
    const [page, setPage] = React.useState(1);
    const [itemPerPage, setItemPerPage] = React.useState(10);

    const load = React.useCallback(async () => {
        try {
            setLoading(true);
            const result = await assetManagementApi.listCategories();
            setCategories(result?.items || []);
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        load();
    }, [load]);

    const filtered = React.useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return categories;
        return categories.filter(
            (c) => c.title?.toLowerCase().includes(q) || c.code?.toLowerCase().includes(q),
        );
    }, [categories, search]);

    const paged = React.useMemo(() => {
        const start = (page - 1) * itemPerPage;
        return filtered.slice(start, start + itemPerPage);
    }, [filtered, page, itemPerPage]);

    const openCreate = () => {
        setEditing(null);
        setForm(emptyForm());
        setModalOpen(true);
    };

    const openEdit = (category: AssetCategory) => {
        setEditing(category);
        setForm({
            title: category.title || '',
            code: category.code || '',
            description: category.description || '',
        });
        setModalOpen(true);
    };

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title.trim()) {
            ErrorToaster(new Error('عنوان گروه الزامی است'));
            return;
        }
        try {
            setSaving(true);
            if (editing) {
                await assetManagementApi.updateCategory(editing._id, { ...form });
                SuccessToaster({ message: 'گروه بروزرسانی شد' });
            } else {
                await assetManagementApi.createCategory({ ...form });
                SuccessToaster({ message: 'گروه ساخته شد' });
            }
            setModalOpen(false);
            reload();
            await load();
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setSaving(false);
        }
    };

    const remove = async (category: AssetCategory) => {
        if (!confirm(`گروه «${category.title}» حذف شود؟`)) return;
        try {
            await assetManagementApi.deleteCategory(category._id);
            SuccessToaster({ message: 'گروه حذف شد' });
            reload();
            await load();
        } catch (e) {
            ErrorToaster(e);
        }
    };

    const formContent = (
        <form id="category-form" className={styles.modalForm} onSubmit={save}>
            <div className={styles.formGrid}>
                <div className={styles.field}>
                    <label>عنوان گروه *</label>
                    <input
                        type="text"
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        placeholder="مثال: لپ‌تاپ"
                    />
                </div>
                <div className={styles.field}>
                    <label>پیشوند کد اموال</label>
                    <input
                        type="text"
                        dir="ltr"
                        value={form.code}
                        onChange={(e) => setForm({ ...form, code: e.target.value })}
                        placeholder="IT-LAP"
                    />
                    <span className={styles.fieldHint}>
                        حروف لاتین/عدد/خط تیره — کد اموال به‌شکل IT-LAP-00001 ساخته می‌شود
                    </span>
                </div>
                <div className={`${styles.field} ${styles.full}`}>
                    <label>توضیحات</label>
                    <input
                        type="text"
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
                </div>
            </div>
        </form>
    );

    return (
        <Container>
            <Wrapper>
                <div className={`${styles.container} ${styles.rtl}`}>
                    <header className={styles.header}>
                        <div>
                            <h1 className={styles.mainTitle}>گروه‌های دارایی</h1>
                            <p className={styles.subtitle}>
                                دسته‌بندی اموال — پیشوند کد هر گروه مبنای شماره‌گذاری خودکار کد اموال است.
                            </p>
                        </div>
                        <button type="button" className={styles.primaryBtn} onClick={openCreate}>
                            <LuPlus size={16} />
                            گروه جدید
                        </button>
                    </header>

                    <ModuleGuide guide={ASSET_GUIDES.categories} />

                    <FilterBar
                        fields={[
                            { key: 'q', type: 'search', placeholder: 'جستجو در عنوان یا پیشوند کد...' },
                        ]}
                        values={{ q: search }}
                        onChange={(_key, value) => {
                            setSearch(value);
                            setPage(1);
                        }}
                        onReset={() => {
                            setSearch('');
                            setPage(1);
                        }}
                        resultCount={filtered.length}
                        resultLabel="گروه"
                    />

                    {loading ? (
                        <LoadingState />
                    ) : paged.length === 0 ? (
                        <div className={styles.emptyState}>
                            گروهی یافت نشد — برای ثبت دارایی، اول گروه‌های مورد نیاز خود را بسازید.
                        </div>
                    ) : (
                        <>
                            <div className={styles.tableWrap}>
                                <table className={styles.dataTable}>
                                    <thead>
                                        <tr>
                                            <th>عنوان</th>
                                            <th>پیشوند کد</th>
                                            <th>توضیحات</th>
                                            <th>تاریخ ایجاد</th>
                                            <th />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paged.map((category) => (
                                            <tr key={category._id}>
                                                <td style={{ fontWeight: 600 }}>{category.title}</td>
                                                <td className={styles.cellLtr}>
                                                    <span className={`${styles.badge} ${styles.badgeType}`}>
                                                        {category.code || '—'}
                                                    </span>
                                                </td>
                                                <td>{category.description || '—'}</td>
                                                <td className={styles.cellLtr}>
                                                    {isoToJalaliString(category.createdAt) || '—'}
                                                </td>
                                                <td>
                                                    <RowActionMenu
                                                        rowId={category._id}
                                                        items={[
                                                            {
                                                                label: 'ویرایش',
                                                                onClick: () => openEdit(category),
                                                            },
                                                            {
                                                                label: 'حذف',
                                                                danger: true,
                                                                onClick: () => void remove(category),
                                                            },
                                                        ]}
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className={styles.paginationSpace}>
                                <Pagination
                                    itemPerPage={itemPerPage}
                                    currentPage={page}
                                    totalItems={filtered.length}
                                    setRowsPerPage={(rows: number) => {
                                        setItemPerPage(rows);
                                        setPage(1);
                                    }}
                                    paginate={(pageNumber: number) => setPage(pageNumber)}
                                    rtl
                                />
                            </div>
                        </>
                    )}
                </div>
            </Wrapper>
            <AssetModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editing ? 'ویرایش گروه' : 'گروه جدید'}
                subtitle={editing ? editing.title : 'پیشوند کد گروه، مبنای کد اموال است'}
                icon={<LuTags size={18} />}
                formId="category-form"
                submitLabel={editing ? 'ذخیره تغییرات' : 'ساخت گروه'}
                saving={saving}
                width={600}
            >
                {formContent}
            </AssetModal>
        </Container>
    );
}
