'use client';

import React from 'react';
import Link from 'next/link';
import {
    LuBoxes,
    LuCoins,
    LuPackageCheck,
    LuWrench,
    LuShieldAlert,
    LuSearchX,
    LuLayoutGrid,
    LuTags,
    LuMapPin,
    LuHistory,
    LuRefreshCw,
    LuPackagePlus,
    LuChevronLeft,
} from 'react-icons/lu';
import { Container, Wrapper } from '@/app/(main)/layout';
import { ErrorToaster, toFarsiNumber, MoneySeparator } from '@my-workspace/utils';
import { LoadingState } from '@my-workspace/components';
import { assetManagementApi, AssetAuditLog, AssetDashboard, AssetItem } from './asset-management-api';
import {
    ALL_ASSET_STATUSES,
    ASSET_STATUS_BADGE_TONE,
    ASSET_STATUS_LABELS,
    AssetStatus,
} from './asset-management.utils';
import { isoToJalaliString } from './jalali.client';
import { useAssetBaseContext } from './components/useAssetBaseContext';
import ModuleGuide from './components/ModuleGuide';
import { ASSET_GUIDES } from './components/guides';
import styles from './AssetManagement.module.scss';

export default function AssetManagementDashboardPage() {
    const [loading, setLoading] = React.useState(true);
    const [dashboard, setDashboard] = React.useState<AssetDashboard | null>(null);
    const [recentLogs, setRecentLogs] = React.useState<AssetAuditLog[]>([]);
    const [assetMap, setAssetMap] = React.useState<Map<string, AssetItem>>(new Map());
    const { resolveLocationName, resolveCategoryName } = useAssetBaseContext();

    const load = React.useCallback(async () => {
        try {
            setLoading(true);
            const [dash, logs, assetsRes] = await Promise.all([
                assetManagementApi.getDashboard(),
                assetManagementApi.listAuditLogs().catch(() => ({ items: [] as AssetAuditLog[] })),
                assetManagementApi.listAssets({ limit: 500 }).catch(() => ({ items: [] as AssetItem[] })),
            ]);
            setDashboard(dash);
            setRecentLogs((logs.items || []).slice(0, 8));
            const map = new Map<string, AssetItem>();
            for (const asset of assetsRes.items || []) map.set(asset._id, asset);
            setAssetMap(map);
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        load();
    }, [load]);

    const statusCount = (status: AssetStatus) =>
        dashboard?.byStatus.find((s) => s.status === status)?.count || 0;

    const maxStatusCount = Math.max(1, ...(dashboard?.byStatus || []).map((s) => s.count));
    const maxCategoryCount = Math.max(1, ...(dashboard?.byCategory || []).map((c) => c.count));
    const maxLocationCount = Math.max(1, ...(dashboard?.byLocation || []).map((c) => c.count));

    const fmt = (n: number) => toFarsiNumber(MoneySeparator(n));

    return (
        <Container>
            <Wrapper>
                <div className={`${styles.container} ${styles.rtl}`}>
                    <header className={styles.header}>
                        <div>
                            <h1 className={styles.mainTitle}>داشبورد مدیریت اموال</h1>
                            <p className={styles.subtitle}>
                                نمای کلی دارایی‌های سازمان — برای گزارش مدیریتی و پیگیری چرخه تحویل.
                            </p>
                        </div>
                        <div className={styles.headerActions}>
                            <button type="button" className={styles.secondaryBtn} onClick={load} disabled={loading}>
                                <LuRefreshCw size={14} />
                                بروزرسانی
                            </button>
                            <Link href="/asset-management/assets" className={styles.primaryBtn}>
                                <LuPackagePlus size={16} />
                                ثبت دارایی
                            </Link>
                        </div>
                    </header>

                    <ModuleGuide guide={ASSET_GUIDES.dashboard} />

                    {loading ? (
                        <LoadingState />
                    ) : (
                        <>
                            {/* ---------------- KPI ---------------- */}
                            <div className={styles.kpiGrid}>
                                <div className={styles.kpiCard}>
                                    <div className={styles.kpiTop}>
                                        <span className={`${styles.kpiIcon} ${styles.accentBrand}`}>
                                            <LuBoxes size={18} />
                                        </span>
                                    </div>
                                    <div className={styles.kpiValue}>{toFarsiNumber(dashboard?.totalAssets || 0)}</div>
                                    <div className={styles.kpiLabel}>کل دارایی‌ها</div>
                                </div>

                                <div className={styles.kpiCard}>
                                    <div className={styles.kpiTop}>
                                        <span className={`${styles.kpiIcon} ${styles.accentSuccess}`}>
                                            <LuCoins size={18} />
                                        </span>
                                    </div>
                                    <div className={styles.kpiValue}>{fmt(dashboard?.totalValue || 0)}</div>
                                    <div className={styles.kpiLabel}>ارزش خرید (ریال)</div>
                                </div>

                                <Link href="/asset-management/assets?status=assigned" className={styles.kpiCard}>
                                    <div className={styles.kpiTop}>
                                        <span className={`${styles.kpiIcon} ${styles.accentInfo}`}>
                                            <LuPackageCheck size={18} />
                                        </span>
                                        <LuChevronLeft size={14} style={{ opacity: 0.4 }} />
                                    </div>
                                    <div className={styles.kpiValue}>{toFarsiNumber(statusCount('assigned'))}</div>
                                    <div className={styles.kpiLabel}>تحویل‌شده به پرسنل</div>
                                </Link>

                                <Link href="/asset-management/assets?status=in_repair" className={styles.kpiCard}>
                                    <div className={styles.kpiTop}>
                                        <span className={`${styles.kpiIcon} ${styles.accentWarning}`}>
                                            <LuWrench size={18} />
                                        </span>
                                        <LuChevronLeft size={14} style={{ opacity: 0.4 }} />
                                    </div>
                                    <div className={styles.kpiValue}>{toFarsiNumber(statusCount('in_repair'))}</div>
                                    <div className={styles.kpiLabel}>در تعمیر</div>
                                </Link>

                                <Link href="/asset-management/assets?status=lost" className={styles.kpiCard}>
                                    <div className={styles.kpiTop}>
                                        <span className={`${styles.kpiIcon} ${styles.accentDanger}`}>
                                            <LuSearchX size={18} />
                                        </span>
                                        <LuChevronLeft size={14} style={{ opacity: 0.4 }} />
                                    </div>
                                    <div className={styles.kpiValue}>{toFarsiNumber(statusCount('lost'))}</div>
                                    <div className={styles.kpiLabel}>مفقود</div>
                                </Link>

                                <Link href="/asset-management/assets?warranty=soon" className={styles.kpiCard}>
                                    <div className={styles.kpiTop}>
                                        <span className={`${styles.kpiIcon} ${styles.accentWarning}`}>
                                            <LuShieldAlert size={18} />
                                        </span>
                                        <LuChevronLeft size={14} style={{ opacity: 0.4 }} />
                                    </div>
                                    <div className={styles.kpiValue}>
                                        {toFarsiNumber(dashboard?.warrantyExpiringSoon || 0)}
                                    </div>
                                    <div className={styles.kpiLabel}>گارانتی نزدیک به پایان</div>
                                </Link>
                            </div>

                            {/* ---------------- وضعیت‌ها + هشدار گارانتی ---------------- */}
                            <div className={styles.dashGrid}>
                                <div className={styles.dashCard}>
                                    <h3>
                                        <LuLayoutGrid size={16} />
                                        تفکیک بر اساس وضعیت
                                    </h3>
                                    {ALL_ASSET_STATUSES.map((status) => {
                                        const count = statusCount(status);
                                        return (
                                            <Link
                                                key={status}
                                                href={`/asset-management/assets?status=${status}`}
                                                className={styles.dashBarRow}
                                            >
                                                <span className={styles.dashBarLabel}>
                                                    <span className={`${styles.badge} ${styles[ASSET_STATUS_BADGE_TONE[status]]}`}>
                                                        {ASSET_STATUS_LABELS[status]}
                                                    </span>
                                                </span>
                                                <span className={styles.dashBarTrack}>
                                                    <span
                                                        className={styles.dashBarFill}
                                                        style={{ width: `${(count / maxStatusCount) * 100}%` }}
                                                    />
                                                </span>
                                                <span className={styles.dashBarValue}>
                                                    {toFarsiNumber(count)} قلم
                                                </span>
                                            </Link>
                                        );
                                    })}
                                </div>

                                <div className={styles.dashCard}>
                                    <h3>
                                        <LuShieldAlert size={16} />
                                        هشدارها
                                    </h3>
                                    <div className={styles.warrantyAlertBox}>
                                        <div>
                                            <strong>{toFarsiNumber(dashboard?.warrantyExpiringSoon || 0)}</strong>
                                            <span>دستگاه در ۳۰ روز آینده از گارانتی خارج می‌شود</span>
                                        </div>
                                        <Link
                                            href="/asset-management/assets?warranty=soon"
                                            className={styles.smallBtn}
                                        >
                                            مشاهده فهرست
                                        </Link>
                                    </div>
                                    <p className={styles.subtitle} style={{ marginTop: '0.9rem', fontSize: '0.82rem' }}>
                                        پیش از پایان گارانتی، ایرادهای احتمالی دستگاه را اعلام کنید تا هزینه
                                        تعمیر به عهده شرکت گارانتی باشد.
                                    </p>
                                </div>
                            </div>

                            {/* ---------------- گروه‌ها + محل‌ها ---------------- */}
                            <div className={styles.dashGrid}>
                                <div className={styles.dashCard}>
                                    <h3>
                                        <LuTags size={16} />
                                        توزیع بر اساس گروه
                                    </h3>
                                    {(dashboard?.byCategory || []).map((row) => (
                                        <Link
                                            key={row._id}
                                            href={`/asset-management/assets?categoryId=${row._id}`}
                                            className={styles.dashBarRow}
                                        >
                                            <span className={styles.dashBarLabel}>{resolveCategoryName(row._id)}</span>
                                            <span className={styles.dashBarTrack}>
                                                <span
                                                    className={styles.dashBarFill}
                                                    style={{ width: `${(row.count / maxCategoryCount) * 100}%` }}
                                                />
                                            </span>
                                            <span className={styles.dashBarValue}>
                                                {toFarsiNumber(row.count)} قلم
                                            </span>
                                        </Link>
                                    ))}
                                    {(dashboard?.byCategory || []).length === 0 && (
                                        <p className={styles.subtitle}>هنوز دارایی‌ای به گروه‌ها متصل نشده است.</p>
                                    )}
                                </div>

                                <div className={styles.dashCard}>
                                    <h3>
                                        <LuMapPin size={16} />
                                        پراکندگی محل استقرار
                                    </h3>
                                    {(dashboard?.byLocation || []).map((row) => (
                                        <Link
                                            key={row._id}
                                            href={`/asset-management/assets?locationId=${row._id}`}
                                            className={styles.dashBarRow}
                                        >
                                            <span className={styles.dashBarLabel}>{resolveLocationName(row._id)}</span>
                                            <span className={styles.dashBarTrack}>
                                                <span
                                                    className={styles.dashBarFill}
                                                    style={{ width: `${(row.count / maxLocationCount) * 100}%` }}
                                                />
                                            </span>
                                            <span className={styles.dashBarValue}>
                                                {toFarsiNumber(row.count)} قلم
                                            </span>
                                        </Link>
                                    ))}
                                    {(dashboard?.byLocation || []).length === 0 && (
                                        <p className={styles.subtitle}>محل استقراری ثبت نشده است.</p>
                                    )}
                                </div>
                            </div>

                            {/* ---------------- آخرین فعالیت‌ها ---------------- */}
                            <div className={styles.dashCard}>
                                <h3>
                                    <LuHistory size={16} />
                                    آخرین فعالیت‌ها
                                </h3>
                                <div className={styles.activityList}>
                                    {recentLogs.map((log) => {
                                        const asset = assetMap.get(log.assetId);
                                        return (
                                            <div className={styles.activityItem} key={log._id}>
                                                <span className={styles.activityDot} />
                                                <div className={styles.activityBody}>
                                                    <div className={styles.activityTitle}>
                                                        {log.detail || 'بروزرسانی اطلاعات دارایی'}
                                                    </div>
                                                    <div className={styles.activityMeta}>
                                                        {asset ? (
                                                            <Link
                                                                href={`/asset-management/assets/${log.assetId}`}
                                                                className={styles.linkBtn}
                                                            >
                                                                {asset.assetCode} — {asset.title}
                                                            </Link>
                                                        ) : (
                                                            'دارایی'
                                                        )}
                                                        {' · '}
                                                        {isoToJalaliString(log.createdAt)}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {recentLogs.length === 0 && (
                                        <p className={styles.subtitle}>هنوز فعالیتی ثبت نشده است.</p>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </Wrapper>
        </Container>
    );
}
