'use client';

import React from 'react';
import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { LuArchive, LuPackagePlus } from 'react-icons/lu';
import { Container, Wrapper } from '@/app/(main)/layout';
import { ErrorToaster, SuccessToaster, toFarsiNumber, MoneySeparator } from '@my-workspace/utils';
import { LoadingState, Pagination } from '@my-workspace/components';
import { assetManagementApi, AssetItem } from '../asset-management-api';
import {
    ALL_ASSET_STATUSES,
    ASSET_STATUS_BADGE_TONE,
    ASSET_STATUS_LABELS,
    AssetStatus,
} from '../asset-management.utils';
import { useAssetBaseContext } from '../components/useAssetBaseContext';
import AssetForm from '../components/AssetForm';
import AssetModal from '../components/AssetModal';
import ModuleGuide from '../components/ModuleGuide';
import { ASSET_GUIDES } from '../components/guides';
import FilterBar from '../components/FilterBar';
import RowActionMenu from '../components/RowActionMenu';
import styles from '../AssetManagement.module.scss';

function AssetsPageInner() {
    const searchParams = useSearchParams();
    const { categories, locations, resolveUserName, resolveCategoryName, resolveLocationName } =
        useAssetBaseContext();

    // drill-down از داشبورد: ?status= | ?categoryId= | ?locationId= | ?warranty=soon
    const [filters, setFilters] = React.useState<Record<string, string>>(() => ({
        q: '',
        status: searchParams.get('status') || '',
        categoryId: searchParams.get('categoryId') || '',
        locationId: searchParams.get('locationId') || '',
        warranty: searchParams.get('warranty') === 'soon' ? 'true' : '',
    }));
    const [page, setPage] = React.useState(1);
    const [itemPerPage, setItemPerPage] = React.useState(10);

    const [loading, setLoading] = React.useState(true);
    const [assets, setAssets] = React.useState<AssetItem[]>([]);
    const [totalItems, setTotalItems] = React.useState(0);

    const [modalOpen, setModalOpen] = React.useState(false);
    const [editing, setEditing] = React.useState<AssetItem | null>(null);
    const [saving, setSaving] = React.useState(false);

    const changeFilter = (key: string, value: string) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
        setPage(1);
    };

    const resetFilters = () => {
        setFilters({ q: '', status: '', categoryId: '', locationId: '', warranty: '' });
        setPage(1);
    };

    const load = React.useCallback(async () => {
        try {
            setLoading(true);
            const result = await assetManagementApi.listAssets({
                status: filters.status || undefined,
                categoryId: filters.categoryId || undefined,
                locationId: filters.locationId || undefined,
                warrantyExpiring: filters.warranty === 'true' ? 'true' : undefined,
                q: filters.q.trim() || undefined,
                page,
                limit: itemPerPage,
            });
            setAssets(result?.items || []);
            setTotalItems(result?.totalItems || 0);
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, [filters, page, itemPerPage]);

    React.useEffect(() => {
        load();
    }, [load]);

    const openCreate = () => {
        setEditing(null);
        setModalOpen(true);
    };

    const save = async (body: Record<string, unknown>) => {
        try {
            setSaving(true);
            if (editing) {
                await assetManagementApi.updateAsset(editing._id, body);
                SuccessToaster({ message: 'اطلاعات دارایی بروزرسانی شد' });
            } else {
                const created = await assetManagementApi.createAsset(body);
                SuccessToaster({ message: `دارایی با کد «${created.assetCode}» ثبت شد` });
            }
            setModalOpen(false);
            await load();
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setSaving(false);
        }
    };

    const remove = async (asset: AssetItem) => {
        if (!confirm(`دارایی «${asset.title}» (${asset.assetCode}) حذف شود؟`)) return;
        try {
            await assetManagementApi.deleteAsset(asset._id);
            SuccessToaster({ message: 'دارایی حذف شد' });
            await load();
        } catch (e) {
            ErrorToaster(e);
        }
    };

    return (
        <Container>
            <Wrapper>
                <div className={`${styles.container} ${styles.rtl}`}>
                    <header className={styles.header}>
                        <div>
                            <h1 className={styles.mainTitle}>دارایی‌ها</h1>
                            <p className={styles.subtitle}>
                                شناسنامه کامل اموال — خرید، گارانتی، تحویل‌گیرنده و وضعیت فعلی.
                            </p>
                        </div>
                        <button type="button" className={styles.primaryBtn} onClick={openCreate}>
                            <LuPackagePlus size={16} />
                            دارایی جدید
                        </button>
                    </header>

                    <ModuleGuide guide={ASSET_GUIDES.assets} />

                    <FilterBar
                        fields={[
                            { key: 'q', type: 'search', placeholder: 'جستجو در نام، کد اموال، سریال، برند...' },
                            {
                                key: 'status',
                                type: 'select',
                                allLabel: 'همه وضعیت‌ها',
                                minWidth: 150,
                                options: ALL_ASSET_STATUSES.map((s) => ({ value: s, label: ASSET_STATUS_LABELS[s] })),
                            },
                            {
                                key: 'categoryId',
                                type: 'select',
                                allLabel: 'همه گروه‌ها',
                                minWidth: 150,
                                options: categories.map((c) => ({ value: c._id, label: c.title })),
                            },
                            {
                                key: 'locationId',
                                type: 'select',
                                allLabel: 'همه محل‌ها',
                                minWidth: 150,
                                options: locations.map((l) => ({ value: l._id, label: l.title })),
                            },
                            {
                                key: 'warranty',
                                type: 'select',
                                allLabel: 'همه گارانتی‌ها',
                                minWidth: 170,
                                options: [{ value: 'true', label: 'گارانتی نزدیک به پایان' }],
                            },
                        ]}
                        values={filters}
                        onChange={changeFilter}
                        onReset={resetFilters}
                        resultCount={totalItems}
                        resultLabel="دارایی"
                    />

                    {loading ? (
                        <LoadingState />
                    ) : assets.length === 0 ? (
                        <div className={styles.emptyState}>
                            دارایی‌ای یافت نشد — فیلترها را تغییر دهید یا اولین دارایی خود را ثبت کنید.
                        </div>
                    ) : (
                        <>
                            <div className={styles.tableWrap}>
                                <table className={styles.dataTable}>
                                    <thead>
                                        <tr>
                                            <th>کد اموال</th>
                                            <th>نام دارایی</th>
                                            <th>گروه</th>
                                            <th>وضعیت</th>
                                            <th>تحویل‌گیرنده</th>
                                            <th>محل استقرار</th>
                                            <th>قیمت خرید (ریال)</th>
                                            <th />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {assets.map((asset) => (
                                            <tr key={asset._id}>
                                                <td className={styles.assetCodeCell}>
                                                    <Link href={`/asset-management/assets/${asset._id}`}>
                                                        {asset.assetCode}
                                                    </Link>
                                                </td>
                                                <td style={{ fontWeight: 600 }}>{asset.title}</td>
                                                <td>{resolveCategoryName(asset.categoryId)}</td>
                                                <td>
                                                    <span className={`${styles.badge} ${styles[ASSET_STATUS_BADGE_TONE[asset.status as AssetStatus]]}`}>
                                                        {ASSET_STATUS_LABELS[asset.status as AssetStatus]}
                                                    </span>
                                                </td>
                                                <td>{resolveUserName(asset.custodianUserId)}</td>
                                                <td>{resolveLocationName(asset.locationId)}</td>
                                                <td className={styles.cellLtr}>
                                                    {asset.purchasePrice
                                                        ? toFarsiNumber(MoneySeparator(asset.purchasePrice))
                                                        : '—'}
                                                </td>
                                                <td>
                                                    <RowActionMenu
                                                        rowId={asset._id}
                                                        items={[
                                                            {
                                                                label: 'شناسنامه و Timeline',
                                                                onClick: () =>
                                                                    window.location.assign(
                                                                        `/asset-management/assets/${asset._id}`,
                                                                    ),
                                                            },
                                                            {
                                                                label: 'ویرایش',
                                                                onClick: () => {
                                                                    setEditing(asset);
                                                                    setModalOpen(true);
                                                                },
                                                            },
                                                            {
                                                                label: 'حذف',
                                                                danger: true,
                                                                onClick: () => void remove(asset),
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
                                    totalItems={totalItems}
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
                title={editing ? 'ویرایش دارایی' : 'ثبت دارایی جدید'}
                subtitle={editing ? editing.assetCode : 'کد اموال به‌صورت خودکار تولید می‌شود'}
                icon={<LuPackagePlus size={18} />}
                formId="asset-form"
                submitLabel={editing ? 'ذخیره تغییرات' : 'ثبت دارایی'}
                saving={saving}
                width={760}
            >
                <AssetForm
                    categories={categories}
                    locations={locations}
                    initial={editing}
                    formId="asset-form"
                    onSubmit={save}
                />
            </AssetModal>
        </Container>
    );
}

export default function AssetManagementAssetsPage() {
    return (
        <Suspense fallback={<LoadingState />}>
            <AssetsPageInner />
        </Suspense>
    );
}
