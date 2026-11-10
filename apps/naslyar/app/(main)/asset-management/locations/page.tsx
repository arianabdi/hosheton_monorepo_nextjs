'use client';

import React from 'react';
import { LuMapPin, LuPlus } from 'react-icons/lu';
import { Container, Wrapper } from '@/app/(main)/layout';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { LoadingState, Pagination } from '@my-workspace/components';
import { assetManagementApi, AssetLocation } from '../asset-management-api';
import { ALL_LOCATION_TYPES, ASSET_LOCATION_TYPE_LABELS, AssetLocationType } from '../asset-management.utils';
import AssetModal from '../components/AssetModal';
import ModuleGuide from '../components/ModuleGuide';
import { ASSET_GUIDES } from '../components/guides';
import FilterBar from '../components/FilterBar';
import RowActionMenu from '../components/RowActionMenu';
import styles from '../AssetManagement.module.scss';

interface LocationFormState {
    title: string;
    type: string;
    address: string;
}

const emptyForm = (): LocationFormState => ({ title: '', type: 'other', address: '' });

export default function AssetLocationsPage() {
    const [loading, setLoading] = React.useState(true);
    const [locations, setLocations] = React.useState<AssetLocation[]>([]);
    const [modalOpen, setModalOpen] = React.useState(false);
    const [editing, setEditing] = React.useState<AssetLocation | null>(null);
    const [form, setForm] = React.useState<LocationFormState>(emptyForm);
    const [saving, setSaving] = React.useState(false);

    // فیلتر و صفحه‌بندی سمت کلاینت
    const [filters, setFilters] = React.useState<Record<string, string>>({ q: '', type: '' });
    const [page, setPage] = React.useState(1);
    const [itemPerPage, setItemPerPage] = React.useState(10);

    const load = React.useCallback(async () => {
        try {
            setLoading(true);
            const result = await assetManagementApi.listLocations();
            setLocations(result?.items || []);
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
        const q = filters.q.trim().toLowerCase();
        return locations.filter((l) => {
            const matchQ =
                !q || l.title?.toLowerCase().includes(q) || l.address?.toLowerCase().includes(q);
            const matchType = !filters.type || l.type === filters.type;
            return matchQ && matchType;
        });
    }, [locations, filters]);

    const paged = React.useMemo(() => {
        const start = (page - 1) * itemPerPage;
        return filtered.slice(start, start + itemPerPage);
    }, [filtered, page, itemPerPage]);

    const openCreate = () => {
        setEditing(null);
        setForm(emptyForm());
        setModalOpen(true);
    };

    const openEdit = (location: AssetLocation) => {
        setEditing(location);
        setForm({
            title: location.title || '',
            type: location.type || 'other',
            address: location.address || '',
        });
        setModalOpen(true);
    };

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title.trim()) {
            ErrorToaster(new Error('عنوان محل الزامی است'));
            return;
        }
        try {
            setSaving(true);
            if (editing) {
                await assetManagementApi.updateLocation(editing._id, { ...form });
                SuccessToaster({ message: 'محل استقرار بروزرسانی شد' });
            } else {
                await assetManagementApi.createLocation({ ...form });
                SuccessToaster({ message: 'محل استقرار ساخته شد' });
            }
            setModalOpen(false);
            await load();
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setSaving(false);
        }
    };

    const remove = async (location: AssetLocation) => {
        if (!confirm(`محل «${location.title}» حذف شود؟`)) return;
        try {
            await assetManagementApi.deleteLocation(location._id);
            SuccessToaster({ message: 'محل استقرار حذف شد' });
            await load();
        } catch (e) {
            ErrorToaster(e);
        }
    };

    const formContent = (
        <form id="location-form" className={styles.modalForm} onSubmit={save}>
            <div className={styles.formGrid}>
                <div className={styles.field}>
                    <label>عنوان محل *</label>
                    <input
                        type="text"
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        placeholder="مثال: انبار مرکزی"
                    />
                </div>
                <div className={styles.field}>
                    <label>نوع محل</label>
                    <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                        {ALL_LOCATION_TYPES.map((t) => (
                            <option key={t} value={t}>
                                {ASSET_LOCATION_TYPE_LABELS[t]}
                            </option>
                        ))}
                    </select>
                </div>
                <div className={`${styles.field} ${styles.full}`}>
                    <label>آدرس</label>
                    <input
                        type="text"
                        value={form.address}
                        onChange={(e) => setForm({ ...form, address: e.target.value })}
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
                            <h1 className={styles.mainTitle}>محل‌های استقرار</h1>
                            <p className={styles.subtitle}>
                                انبار مرکزی، شعب، اتاق‌های تجهیزات، خودروها و پروژه‌ها — محل فیزیکی نگهداری دارایی‌ها.
                            </p>
                        </div>
                        <button type="button" className={styles.primaryBtn} onClick={openCreate}>
                            <LuPlus size={16} />
                            محل جدید
                        </button>
                    </header>

                    <ModuleGuide guide={ASSET_GUIDES.locations} />

                    <FilterBar
                        fields={[
                            { key: 'q', type: 'search', placeholder: 'جستجو در عنوان یا آدرس...' },
                            {
                                key: 'type',
                                type: 'select',
                                allLabel: 'همه انواع',
                                minWidth: 150,
                                options: ALL_LOCATION_TYPES.map((t) => ({
                                    value: t,
                                    label: ASSET_LOCATION_TYPE_LABELS[t as AssetLocationType],
                                })),
                            },
                        ]}
                        values={filters}
                        onChange={(key, value) => {
                            setFilters((prev) => ({ ...prev, [key]: value }));
                            setPage(1);
                        }}
                        onReset={() => {
                            setFilters({ q: '', type: '' });
                            setPage(1);
                        }}
                        resultCount={filtered.length}
                        resultLabel="محل"
                    />

                    {loading ? (
                        <LoadingState />
                    ) : paged.length === 0 ? (
                        <div className={styles.emptyState}>
                            محلی یافت نشد — محل‌های فیزیکی نگهداری دارایی‌ها را تعریف کنید.
                        </div>
                    ) : (
                        <>
                            <div className={styles.tableWrap}>
                                <table className={styles.dataTable}>
                                    <thead>
                                        <tr>
                                            <th>عنوان</th>
                                            <th>نوع</th>
                                            <th>آدرس</th>
                                            <th />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paged.map((location) => (
                                            <tr key={location._id}>
                                                <td style={{ fontWeight: 600 }}>{location.title}</td>
                                                <td>
                                                    <span className={`${styles.badge} ${styles.badgeType}`}>
                                                        {ASSET_LOCATION_TYPE_LABELS[location.type] || location.type}
                                                    </span>
                                                </td>
                                                <td>{location.address || '—'}</td>
                                                <td>
                                                    <RowActionMenu
                                                        rowId={location._id}
                                                        items={[
                                                            {
                                                                label: 'ویرایش',
                                                                onClick: () => openEdit(location),
                                                            },
                                                            {
                                                                label: 'حذف',
                                                                danger: true,
                                                                onClick: () => void remove(location),
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
                title={editing ? 'ویرایش محل استقرار' : 'محل استقرار جدید'}
                subtitle={editing ? editing.title : 'انبار، شعبه، اتاق تجهیزات، خودرو یا پروژه'}
                icon={<LuMapPin size={18} />}
                formId="location-form"
                submitLabel={editing ? 'ذخیره تغییرات' : 'ساخت محل'}
                saving={saving}
                width={600}
            >
                {formContent}
            </AssetModal>
        </Container>
    );
}
