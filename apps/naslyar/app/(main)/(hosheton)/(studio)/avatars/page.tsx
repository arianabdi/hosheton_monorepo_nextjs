'use client';

import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { LuRefreshCw, LuDownload, LuUserPlus, LuX } from 'react-icons/lu';
import { ErrorToaster, SuccessToaster, toFarsiNumber } from '@my-workspace/utils';
import { LoadingState, Pagination } from '@my-workspace/components';
import ImageUpload from '@/app/(main)/components/ImageUpload/ImageUpload';
import {
    avatarAdminApi,
    type ApprovedAvatar,
    type ApprovedAvatarDetail,
    type BytePlusRemoteAsset,
} from '../lib/avatar-admin-api';
import styles from '../projects/nodes/Providers.module.scss';

function AvatarThumb({
    src,
    alt,
    width,
    height,
    onClick,
    className,
    style,
}: {
    src: string;
    alt: string;
    width: number;
    height: number;
    onClick?: () => void;
    className?: string;
    style?: CSSProperties;
}) {
    const trimmed = String(src || '').trim();
    if (!trimmed) return null;

    // Plain <img>: next/image optimizer rejects Contabo paths (":" in key) and unknown BytePlus CDNs.
    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={trimmed}
            alt={alt}
            width={width}
            height={height}
            loading="lazy"
            decoding="async"
            className={className}
            style={{
                width,
                height,
                objectFit: 'cover',
                display: 'block',
                ...style,
            }}
            onClick={onClick}
        />
    );
}

function resolveUploadPublicUrl(upload: { original?: any; thumbnail?: any } | null): string {
    if (!upload) return '';
    const file = upload.original || upload.thumbnail || upload;
    // The API returns the URL on the storage the file was really uploaded to (admin storage
    // setting); NEXT_PUBLIC_S3_ENDPOINT is a fixed env base and goes stale after a switch.
    const stored = String(file?.path || file?.url || '').trim();
    if (stored) return stored;
    if (file?.key && process.env.NEXT_PUBLIC_S3_ENDPOINT) {
        return `${process.env.NEXT_PUBLIC_S3_ENDPOINT}/${file.key}`;
    }
    return '';
}

function collectPersonPhotos(detail: ApprovedAvatarDetail | ApprovedAvatar | null) {
    if (!detail) return [] as Array<{ key: string; url: string; label: string; status?: string; assetUri?: string }>;

    const fromAssets = (detail.assets || []).map((asset, index) => {
        const url = String(asset.sourceUrl || '').trim();
        return {
            key: String(asset.assetId || asset.assetUri || `asset-${index}`),
            url,
            label: asset.name || asset.assetId || `عکس ${index + 1}`,
            status: asset.status,
            assetUri: asset.assetUri,
        };
    });

    if (fromAssets.length) return fromAssets;

    return (detail.sourceImageUrls || [])
        .map((url, index) => ({
            key: `source-${index}`,
            url,
            label: `عکس ${index + 1}`,
            status: undefined,
            assetUri: undefined,
        }))
        .filter((item) => item.url);
}

export default function ApprovedAvatarsPage() {
    const [items, setItems] = useState<ApprovedAvatar[]>([]);
    const [remoteAssets, setRemoteAssets] = useState<BytePlusRemoteAsset[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [search, setSearch] = useState('');
    const [pagination, setPagination] = useState({
        itemPerPage: 12,
        currentPage: 1,
        totalItems: 0,
    });

    const [showCreate, setShowCreate] = useState(false);
    const [userQuery, setUserQuery] = useState('');
    const [userOptions, setUserOptions] = useState<Array<{ _id: string; fullName?: string; email?: string; username?: string }>>([]);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [charName, setCharName] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [remoteAssetId, setRemoteAssetId] = useState('');
    const [creating, setCreating] = useState(false);
    const [assignAvatarId, setAssignAvatarId] = useState('');
    const [assignUserId, setAssignUserId] = useState('');
    const [previewSavingId, setPreviewSavingId] = useState('');

    const [detailOpen, setDetailOpen] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detail, setDetail] = useState<ApprovedAvatarDetail | null>(null);
    const [lightboxUrl, setLightboxUrl] = useState('');

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const res = await avatarAdminApi.listApproved({
                search: search || undefined,
                page: pagination.currentPage,
                limit: pagination.itemPerPage,
            });
            setItems(res.avatars ?? []);
            setPagination((prev) => ({ ...prev, totalItems: res.total ?? 0 }));
        } catch (error) {
            setItems([]);
            ErrorToaster(error);
        } finally {
            setLoading(false);
        }
    }, [search, pagination.currentPage, pagination.itemPerPage]);

    useEffect(() => {
        load();
    }, [load]);

    const openPersonDetail = async (avatarId: string) => {
        try {
            setDetailOpen(true);
            setDetailLoading(true);
            setDetail(null);
            const data = await avatarAdminApi.getById(avatarId);
            setDetail(data);
        } catch (error) {
            ErrorToaster(error);
            setDetailOpen(false);
        } finally {
            setDetailLoading(false);
        }
    };

    const loadRemote = async () => {
        try {
            const res = await avatarAdminApi.listBytePlusAssets();
            setRemoteAssets(res.assets ?? []);
            SuccessToaster({ message: `${toFarsiNumber(res.totalAssets)} asset از ModelArk خوانده شد` });
        } catch (error) {
            ErrorToaster(error);
        }
    };

    const handleSync = async () => {
        try {
            setSyncing(true);
            const res = await avatarAdminApi.syncFromBytePlus();
            SuccessToaster({
                message: `همگام‌سازی: ${toFarsiNumber(res.imported)} جدید، ${toFarsiNumber(res.updated)} به‌روز`,
            });
            await load();
        } catch (error) {
            ErrorToaster(error);
        } finally {
            setSyncing(false);
        }
    };

    const searchUsers = async (q: string) => {
        setUserQuery(q);
        if (q.trim().length < 2) {
            setUserOptions([]);
            return;
        }
        try {
            const users = await avatarAdminApi.searchUsers(q.trim());
            setUserOptions(users);
        } catch {
            setUserOptions([]);
        }
    };

    const handleCreate = async () => {
        if (!selectedUserId || !charName.trim()) {
            ErrorToaster({ message: 'کاربر و نام کاراکتر الزامی است.' });
            return;
        }
        if (!remoteAssetId && !imageUrl.trim()) {
            ErrorToaster({ message: 'آدرس عکس یا Asset ID از BytePlus لازم است.' });
            return;
        }

        try {
            setCreating(true);
            await avatarAdminApi.createForUser({
                userId: selectedUserId,
                name: charName.trim(),
                sourceImageUrls: imageUrl.trim() ? [imageUrl.trim()] : undefined,
                byteplusAssetId: remoteAssetId || undefined,
            });
            SuccessToaster({ message: 'کاراکتر برای کاربر ثبت شد' });
            setShowCreate(false);
            setCharName('');
            setImageUrl('');
            setRemoteAssetId('');
            setSelectedUserId('');
            await load();
        } catch (error) {
            ErrorToaster(error);
        } finally {
            setCreating(false);
        }
    };

    const handleAssign = async () => {
        if (!assignAvatarId || !assignUserId) {
            ErrorToaster({ message: 'آواتار و کاربر را انتخاب کنید.' });
            return;
        }
        try {
            await avatarAdminApi.assignUser(assignAvatarId, assignUserId);
            SuccessToaster({ message: 'مالک آواتار به‌روز شد' });
            setAssignAvatarId('');
            setAssignUserId('');
            await load();
        } catch (error) {
            ErrorToaster(error);
        }
    };

    const handlePreviewUpload = async (avatarId: string, upload: any) => {
        const previewImageUrl = resolveUploadPublicUrl(upload);
        const previewFileKey = String(upload?.original?.key || upload?.key || '').trim();
        if (!previewImageUrl && !previewFileKey) {
            ErrorToaster({ message: 'آپلود عکس پرسنلی ناموفق بود.' });
            return;
        }
        try {
            setPreviewSavingId(avatarId);
            const updated = await avatarAdminApi.updatePreview(avatarId, {
                previewImageUrl: previewImageUrl || undefined,
                previewFileKey: previewFileKey || undefined,
            });
            setItems((prev) =>
                prev.map((item) =>
                    item._id === avatarId
                        ? { ...item, previewImageUrl: updated.previewImageUrl || previewImageUrl }
                        : item,
                ),
            );
            if (detail?._id === avatarId) {
                setDetail((prev) =>
                    prev
                        ? { ...prev, previewImageUrl: updated.previewImageUrl || previewImageUrl }
                        : prev,
                );
            }
            SuccessToaster({ message: 'عکس پرسنلی داشبورد ذخیره شد' });
        } catch (error) {
            ErrorToaster(error);
        } finally {
            setPreviewSavingId('');
        }
    };

    const personPhotos = collectPersonPhotos(detail);

    return (
        <div className={`${styles.container} ${styles.rtl}`}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.mainTitle}>آواتارهای تاییدشده (Real-person)</h1>
                    <p className={styles.subtitle}>
                        روی هر شخص کلیک کنید تا عکس‌های گروه BytePlus را ببینید. عکس پرسنلی داشبورد جداست.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Link href="/avatars/review" className={styles.secondaryBtn}>صف بررسی API Key</Link>
                    <button type="button" className={styles.secondaryBtn} onClick={() => void loadRemote()}>
                        خواندن از ModelArk
                    </button>
                    <button type="button" className={styles.secondaryBtn} disabled={syncing} onClick={() => void handleSync()}>
                        <LuDownload size={16} /> {syncing ? '…' : 'همگام‌سازی BytePlus'}
                    </button>
                    <button type="button" className={styles.primaryBtn} onClick={() => setShowCreate(true)}>
                        <LuUserPlus size={16} /> ساخت کاراکتر برای کاربر
                    </button>
                    <button type="button" className={styles.secondaryBtn} onClick={() => load()}>
                        <LuRefreshCw size={16} /> بروزرسانی
                    </button>
                </div>
            </header>

            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <input
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setPagination((p) => ({ ...p, currentPage: 1 }));
                    }}
                    placeholder="جستجوی نام شخص / گروه…"
                    style={{ flex: 1, borderRadius: 8, padding: 10, border: '1px solid var(--border-color)' }}
                />
            </div>

            {showCreate && (
                <div className={styles.card} style={{ marginBottom: 16 }}>
                    <h3 style={{ marginTop: 0 }}>ثبت کاراکتر / real-person برای کاربر</h3>
                    <div style={{ display: 'grid', gap: 12 }}>
                        <div>
                            <label>جستجوی کاربر</label>
                            <input
                                value={userQuery}
                                onChange={(e) => void searchUsers(e.target.value)}
                                placeholder="نام، ایمیل یا یوزرنیم"
                                style={{ width: '100%', borderRadius: 8, padding: 10, border: '1px solid var(--border-color)' }}
                            />
                            {userOptions.length > 0 && (
                                <select
                                    value={selectedUserId}
                                    onChange={(e) => setSelectedUserId(e.target.value)}
                                    style={{ width: '100%', marginTop: 8, borderRadius: 8, padding: 10 }}
                                >
                                    <option value="">انتخاب کاربر</option>
                                    {userOptions.map((u) => (
                                        <option key={u._id} value={u._id}>
                                            {u.fullName || u.username || u.email} — {u.email || u._id}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                        <div>
                            <label>نام شخص (نام گروه)</label>
                            <input
                                value={charName}
                                onChange={(e) => setCharName(e.target.value)}
                                style={{ width: '100%', borderRadius: 8, padding: 10, border: '1px solid var(--border-color)' }}
                            />
                        </div>
                        <div>
                            <label>URL عکس character sheet (برای draft جدید)</label>
                            <input
                                value={imageUrl}
                                onChange={(e) => setImageUrl(e.target.value)}
                                placeholder="https://…"
                                style={{ width: '100%', borderRadius: 8, padding: 10, border: '1px solid var(--border-color)' }}
                            />
                        </div>
                        <div>
                            <label>یا Asset ID فعال از BytePlus</label>
                            <select
                                value={remoteAssetId}
                                onChange={(e) => setRemoteAssetId(e.target.value)}
                                style={{ width: '100%', borderRadius: 8, padding: 10 }}
                            >
                                <option value="">— اختیاری —</option>
                                {remoteAssets.map((a) => (
                                    <option key={a.assetId} value={a.assetId}>
                                        {a.name || a.assetId} ({a.status})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button type="button" className={styles.primaryBtn} disabled={creating} onClick={() => void handleCreate()}>
                                ذخیره
                            </button>
                            <button type="button" className={styles.secondaryBtn} onClick={() => setShowCreate(false)}>
                                انصراف
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className={styles.card} style={{ marginBottom: 16 }}>
                <h3 style={{ marginTop: 0 }}>اختصاص مالک</h3>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <select
                        value={assignAvatarId}
                        onChange={(e) => setAssignAvatarId(e.target.value)}
                        style={{ minWidth: 220, borderRadius: 8, padding: 10 }}
                    >
                        <option value="">انتخاب آواتار</option>
                        {items.map((a) => (
                            <option key={a._id} value={a._id}>{a.name}</option>
                        ))}
                    </select>
                    <input
                        value={assignUserId}
                        onChange={(e) => setAssignUserId(e.target.value)}
                        placeholder="UserId مالک جدید"
                        style={{ minWidth: 260, borderRadius: 8, padding: 10, border: '1px solid var(--border-color)' }}
                    />
                    <button type="button" className={styles.secondaryBtn} onClick={() => void handleAssign()}>
                        اختصاص
                    </button>
                </div>
            </div>

            {loading ? (
                <LoadingState />
            ) : items.length === 0 ? (
                <div className={styles.emptyStateBox}>
                    آواتار فعالی نیست. «همگام‌سازی BytePlus» یا «ساخت کاراکتر» را بزنید.
                </div>
            ) : (
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>پیش‌نمایش پرسنلی</th>
                                <th>نام شخص</th>
                                <th>مالک</th>
                                <th>Group / Assets</th>
                                <th>وضعیت</th>
                                <th>آپلود عکس داشبورد</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item) => (
                                <tr
                                    key={item._id}
                                    onClick={() => void openPersonDetail(item._id)}
                                    style={{ cursor: 'pointer' }}
                                    title="مشاهده عکس‌های این شخص"
                                >
                                    <td>
                                        {item.previewImageUrl ? (
                                            <AvatarThumb
                                                src={item.previewImageUrl}
                                                alt={item.name}
                                                width={56}
                                                height={56}
                                                style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8 }}
                                            />
                                        ) : '—'}
                                    </td>
                                    <td>
                                        <strong>{item.name}</strong>
                                        <div className={styles.subtitle} style={{ margin: 0, fontSize: 12 }}>
                                            کلیک برای دیدن عکس‌ها
                                        </div>
                                    </td>
                                    <td>
                                        {item.owner?.fullName || item.owner?.email || item.owner?.username || item.userId}
                                    </td>
                                    <td style={{ maxWidth: 220, wordBreak: 'break-all', fontSize: 12 }}>
                                        {item.byteplusGroupId
                                            ? `group: ${item.byteplusGroupId}`
                                            : item.byteplusAssetUri || '—'}
                                    </td>
                                    <td>{item.status}</td>
                                    <td
                                        style={{ minWidth: 180 }}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <ImageUpload
                                            label={previewSavingId === item._id ? 'در حال ذخیره…' : 'عکس پرسنلی'}
                                            currentImage={
                                                item.previewImageUrl
                                                    ? {
                                                        original: { path: item.previewImageUrl },
                                                        thumbnail: { path: item.previewImageUrl },
                                                    }
                                                    : undefined
                                            }
                                            onUpload={(upload) => void handlePreviewUpload(item._id, upload)}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p className={styles.subtitle} style={{ margin: 0 }}>
                    {toFarsiNumber(pagination.totalItems)} آواتار
                </p>
                <Pagination
                    itemPerPage={pagination.itemPerPage}
                    currentPage={pagination.currentPage}
                    totalItems={pagination.totalItems}
                    rtl
                    paginate={(pageNumber) => setPagination((prev) => ({ ...prev, currentPage: pageNumber }))}
                    setRowsPerPage={(rows) =>
                        setPagination((prev) => ({ ...prev, itemPerPage: rows, currentPage: 1 }))
                    }
                />
            </div>

            {detailOpen && (
                <div
                    role="dialog"
                    aria-modal="true"
                    onClick={() => setDetailOpen(false)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.45)',
                        zIndex: 1000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 16,
                    }}
                >
                    <div
                        className={styles.card}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            width: 'min(920px, 100%)',
                            maxHeight: '90vh',
                            overflow: 'auto',
                            margin: 0,
                            position: 'relative',
                        }}
                    >
                        <button
                            type="button"
                            className={styles.secondaryBtn}
                            onClick={() => setDetailOpen(false)}
                            style={{ position: 'absolute', top: 12, left: 12 }}
                            aria-label="بستن"
                        >
                            <LuX size={16} />
                        </button>

                        {detailLoading || !detail ? (
                            <LoadingState />
                        ) : (
                            <>
                                <h3 style={{ marginTop: 0 }}>{detail.name}</h3>
                                <p className={styles.subtitle}>
                                    مالک: {detail.owner?.fullName || detail.owner?.email || detail.userId}
                                    {detail.byteplusGroupId ? ` — group: ${detail.byteplusGroupId}` : ''}
                                </p>

                                {detail.previewImageUrl && (
                                    <div style={{ marginBottom: 16 }}>
                                        <div className={styles.subtitle} style={{ marginBottom: 8 }}>عکس پرسنلی داشبورد</div>
                                        <AvatarThumb
                                            src={detail.previewImageUrl}
                                            alt="پیش‌نمایش داشبورد"
                                            width={96}
                                            height={96}
                                            onClick={() => setLightboxUrl(detail.previewImageUrl || '')}
                                            style={{
                                                width: 96,
                                                height: 96,
                                                objectFit: 'cover',
                                                borderRadius: 10,
                                                cursor: 'zoom-in',
                                            }}
                                        />
                                    </div>
                                )}

                                <div className={styles.subtitle} style={{ marginBottom: 8 }}>
                                    عکس‌های گروه ({toFarsiNumber(personPhotos.length)})
                                </div>
                                {personPhotos.length === 0 ? (
                                    <div className={styles.emptyStateBox}>عکسی برای این شخص ثبت نشده است.</div>
                                ) : (
                                    <div
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                                            gap: 12,
                                        }}
                                    >
                                        {personPhotos.map((photo) => (
                                            <button
                                                key={photo.key}
                                                type="button"
                                                onClick={() => photo.url && setLightboxUrl(photo.url)}
                                                style={{
                                                    border: '1px solid var(--border-color)',
                                                    borderRadius: 10,
                                                    overflow: 'hidden',
                                                    padding: 0,
                                                    background: 'transparent',
                                                    cursor: photo.url ? 'zoom-in' : 'default',
                                                    textAlign: 'right',
                                                }}
                                            >
                                                {photo.url ? (
                                                    <AvatarThumb
                                                        src={photo.url}
                                                        alt={photo.label}
                                                        width={140}
                                                        height={140}
                                                        style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }}
                                                    />
                                                ) : (
                                                    <div
                                                        style={{
                                                            height: 140,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            background: 'var(--surface-muted, #f3f4f6)',
                                                            fontSize: 12,
                                                            padding: 8,
                                                        }}
                                                    >
                                                        بدون پیش‌نمایش
                                                    </div>
                                                )}
                                                <div style={{ padding: 8, fontSize: 12 }}>
                                                    <div>{photo.label}</div>
                                                    {photo.status && <div className={styles.subtitle} style={{ margin: 0 }}>{photo.status}</div>}
                                                    {photo.assetUri && (
                                                        <div className={styles.subtitle} style={{ margin: 0, wordBreak: 'break-all' }}>
                                                            {photo.assetUri}
                                                        </div>
                                                    )}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}

            {lightboxUrl && (
                <div
                    role="dialog"
                    aria-modal="true"
                    onClick={() => setLightboxUrl('')}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.8)',
                        zIndex: 1100,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 16,
                    }}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={lightboxUrl}
                        alt=""
                        onClick={(e) => e.stopPropagation()}
                        style={{ maxWidth: '96vw', maxHeight: '92vh', borderRadius: 8, objectFit: 'contain' }}
                    />
                </div>
            )}
        </div>
    );
}
