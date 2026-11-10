'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { LuHistory, LuQrCode, LuArrowLeftRight, LuPackagePlus, LuPackageCheck, LuPencil, LuArrowRightFromLine } from 'react-icons/lu';
import { Container, Wrapper } from '@/app/(main)/layout';
import { ErrorToaster, SuccessToaster, toFarsiNumber, MoneySeparator } from '@my-workspace/utils';
import { LoadingState } from '@my-workspace/components';
import { assetManagementApi, AssetItem, AssetTimelineEvent } from '../../asset-management-api';
import { ASSET_STATUS_BADGE_TONE, ASSET_STATUS_LABELS, AssetStatus } from '../../asset-management.utils';
import { isoToJalaliString } from '../../jalali.client';
import { useAssetBaseContext } from '../../components/useAssetBaseContext';
import CustodyTimeline from '../../components/CustodyTimeline';
import QrLabel from '../../components/QrLabel';
import AssignmentModal, { AssignmentMode, MODE_TITLES } from '../../components/AssignmentModal';
import AssetForm from '../../components/AssetForm';
import AssetModal from '../../components/AssetModal';
import ModuleGuide from '../../components/ModuleGuide';
import { ASSET_GUIDES } from '../../components/guides';
import styles from '../../AssetManagement.module.scss';

export default function AssetDetailPage() {
    const params = useParams<{ id: string }>();
    const assetId = params?.id;

    const { categories, locations, resolveUserName, resolveLocationName, resolveCategoryName } = useAssetBaseContext();

    const [loading, setLoading] = React.useState(true);
    const [asset, setAsset] = React.useState<AssetItem | null>(null);
    const [events, setEvents] = React.useState<AssetTimelineEvent[]>([]);

    const [modalMode, setModalMode] = React.useState<AssignmentMode | null>(null);
    const [editOpen, setEditOpen] = React.useState(false);
    const [saving, setSaving] = React.useState(false);

    const load = React.useCallback(async () => {
        if (!assetId) return;
        try {
            setLoading(true);
            const result = await assetManagementApi.getAssetTimeline(assetId);
            setAsset(result.asset);
            setEvents(result.events || []);
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, [assetId]);

    React.useEffect(() => {
        load();
    }, [load]);

    const runAction = async (mode: AssignmentMode, body: Record<string, unknown>) => {
        if (!asset) return;
        try {
            setSaving(true);
            if (mode === 'assign') {
                await assetManagementApi.assignAsset(asset._id, body as { toUserId: string });
                SuccessToaster({ message: 'دارایی تحویل داده شد' });
            } else if (mode === 'return') {
                await assetManagementApi.returnAsset(asset._id, body);
                SuccessToaster({ message: 'دارایی به انبار برگشت داده شد' });
            } else if (mode === 'transfer') {
                await assetManagementApi.transferAsset(asset._id, body);
                SuccessToaster({ message: 'انتقال ثبت شد' });
            } else if (mode === 'status') {
                await assetManagementApi.changeAssetStatus(asset._id, body as { status: AssetStatus });
                SuccessToaster({ message: 'وضعیت دارایی تغییر کرد' });
            }
            setModalMode(null);
            await load();
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setSaving(false);
        }
    };

    const saveEdit = async (body: Record<string, unknown>) => {
        if (!asset) return;
        try {
            setSaving(true);
            await assetManagementApi.updateAsset(asset._id, body);
            SuccessToaster({ message: 'اطلاعات دارایی بروزرسانی شد' });
            setEditOpen(false);
            await load();
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setSaving(false);
        }
    };

    if (loading && !asset) {
        return (
            <Container>
                <Wrapper>
                    <LoadingState />
                </Wrapper>
            </Container>
        );
    }

    if (!asset) {
        return (
            <Container>
                <Wrapper>
                    <div className={`${styles.container} ${styles.rtl}`}>
                        <p className={styles.subtitle}>دارایی یافت نشد.</p>
                    </div>
                </Wrapper>
            </Container>
        );
    }

    const infoRow = (label: string, value: React.ReactNode) => (
        <div className={styles.infoRow}>
            <span className={styles.infoLabel}>{label}</span>
            <span className={styles.infoValue}>{value ?? '—'}</span>
        </div>
    );

    return (
        <Container>
            <Wrapper>
                <div className={`${styles.container} ${styles.rtl}`}>
                    <header className={styles.header}>
                        <div className={styles.detailHeader}>
                            <div>
                                <div className={styles.titleRow}>
                                    <h1 className={styles.mainTitle}>{asset.title}</h1>
                                    <span className={`${styles.badge} ${styles[ASSET_STATUS_BADGE_TONE[asset.status as AssetStatus]]}`}>
                                        {ASSET_STATUS_LABELS[asset.status as AssetStatus]}
                                    </span>
                                </div>
                                <p className={styles.subtitle}>
                                    کد اموال: <span style={{ direction: 'ltr', unicodeBidi: 'embed', fontWeight: 700 }}>{asset.assetCode}</span>
                                    {asset.serialNumber ? ` — سریال: ${asset.serialNumber}` : ''}
                                </p>
                            </div>
                        </div>
                        <div className={styles.detailActions}>
                            <Link href="/asset-management/assets" className={styles.secondaryBtn}>
                                ← بازگشت به فهرست
                            </Link>
                            {asset.status === 'in_stock' || asset.status === 'surplus' ? (
                                <button
                                    type="button"
                                    className={styles.primaryBtn}
                                    onClick={() => setModalMode('assign')}
                                >
                                    <LuPackagePlus size={15} />
                                    تحویل به کارمند
                                </button>
                            ) : null}
                            {asset.status === 'assigned' ? (
                                <button
                                    type="button"
                                    className={styles.primaryBtn}
                                    onClick={() => setModalMode('return')}
                                >
                                    <LuPackageCheck size={15} />
                                    برگشت به انبار
                                </button>
                            ) : null}
                            {asset.status !== 'decommissioned' && asset.status !== 'lost' ? (
                                <button
                                    type="button"
                                    className={styles.secondaryBtn}
                                    onClick={() => setModalMode('transfer')}
                                >
                                    <LuArrowLeftRight size={15} />
                                    انتقال
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className={styles.secondaryBtn}
                                    disabled
                                    title="دارایی اسقاط‌شده یا مفقود قابل انتقال نیست"
                                >
                                    <LuArrowLeftRight size={15} />
                                    انتقال
                                </button>
                            )}
                            <button
                                type="button"
                                className={styles.secondaryBtn}
                                onClick={() => setEditOpen(true)}
                            >
                                <LuPencil size={15} />
                                ویرایش
                            </button>
                        </div>
                    </header>

                    <ModuleGuide guide={ASSET_GUIDES.assetDetail} />

                    <div className={styles.sectionCard}>
                        <h3>شناسنامه دارایی</h3>
                        <div className={styles.overviewGrid}>
                            <div>
                                {infoRow('گروه', resolveCategoryName(asset.categoryId))}
                                {infoRow('برند / سازنده', asset.brand || '—')}
                                {infoRow('مدل', asset.model || '—')}
                                {infoRow('شماره سریال', asset.serialNumber || '—')}
                                {infoRow('محل استقرار', resolveLocationName(asset.locationId))}
                                {infoRow('واحد سازمانی', asset.unit || '—')}
                                {infoRow('تحویل‌گیرنده فعلی', resolveUserName(asset.custodianUserId))}
                                {infoRow('وضعیت', ASSET_STATUS_LABELS[asset.status as AssetStatus])}
                            </div>
                            <div>
                                {infoRow(
                                    'قیمت خرید',
                                    asset.purchasePrice
                                        ? `${toFarsiNumber(MoneySeparator(asset.purchasePrice))} ریال`
                                        : '—',
                                )}
                                {infoRow('تاریخ خرید', isoToJalaliString(asset.purchaseDate) || '—')}
                                {infoRow('تاریخ بهره‌برداری', isoToJalaliString(asset.commissioningDate) || '—')}
                                {infoRow('شماره فاکتور', asset.invoiceNumber || '—')}
                                {infoRow('شماره قرارداد', asset.contractNumber || '—')}
                                {infoRow('تأمین‌کننده', asset.supplier || '—')}
                                {infoRow('شرکت گارانتی', asset.warrantyCompany || '—')}
                                {infoRow('پایان گارانتی', isoToJalaliString(asset.warrantyEndDate) || '—')}
                            </div>
                        </div>
                        {asset.description ? (
                            <p className={styles.subtitle} style={{ marginTop: '0.75rem', fontSize: '0.85rem' }}>
                                {asset.description}
                            </p>
                        ) : null}
                    </div>

                    <div className={styles.dashGrid}>
                        <div className={styles.dashCard}>
                            <h3>
                                <LuQrCode size={16} />
                                برچسب QR
                            </h3>
                            <QrLabel asset={asset} />
                        </div>

                        <div className={styles.dashCard}>
                            <h3>
                                <LuHistory size={16} />
                                تاریخچه دارایی (Timeline)
                            </h3>
                            <CustodyTimeline
                                events={events}
                                resolveUserName={resolveUserName}
                                resolveLocationName={resolveLocationName}
                            />
                        </div>
                    </div>
                </div>
            </Wrapper>
            {modalMode && (
                <AssetModal
                    open={!!modalMode}
                    onClose={() => setModalMode(null)}
                    title={MODE_TITLES[modalMode]}
                    subtitle={`${asset.assetCode} — ${asset.title}`}
                    icon={
                        modalMode === 'assign' ? (
                            <LuPackagePlus size={18} />
                        ) : modalMode === 'return' ? (
                            <LuPackageCheck size={18} />
                        ) : modalMode === 'transfer' ? (
                            <LuArrowRightFromLine size={18} />
                        ) : (
                            <LuArrowLeftRight size={18} />
                        )
                    }
                    formId="assignment-form"
                    submitLabel={MODE_TITLES[modalMode]}
                    saving={saving}
                    width={600}
                >
                    <AssignmentModal
                        mode={modalMode}
                        asset={asset}
                        locations={locations}
                        formId="assignment-form"
                        onSubmit={(body) => runAction(modalMode, body)}
                    />
                </AssetModal>
            )}
            <AssetModal
                open={editOpen}
                onClose={() => setEditOpen(false)}
                title="ویرایش دارایی"
                subtitle={asset.assetCode}
                icon={<LuPencil size={18} />}
                formId="asset-edit-form"
                submitLabel="ذخیره تغییرات"
                saving={saving}
                width={760}
            >
                <AssetForm
                    categories={categories}
                    locations={locations}
                    initial={asset}
                    formId="asset-edit-form"
                    onSubmit={saveEdit}
                />
            </AssetModal>
        </Container>
    );
}
