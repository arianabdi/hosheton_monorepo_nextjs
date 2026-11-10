'use client';

import React from 'react';
import { assetManagementApi, AssetItem } from '../asset-management-api';
import styles from '../AssetManagement.module.scss';

interface QrLabelProps {
    asset: AssetItem;
}

/**
 * برچسب QR دارایی — تولید QR از کد اموال (سمت سرور) و چاپ برچسب
 * از طریق پنجره چاپ مرورگر (window.print).
 */
export default function QrLabel({ asset }: QrLabelProps) {
    const [dataUrl, setDataUrl] = React.useState<string | null>(null);
    const [error, setError] = React.useState(false);

    React.useEffect(() => {
        let mounted = true;
        assetManagementApi
            .getAssetQr(asset._id)
            .then((res) => {
                if (mounted) setDataUrl(res.dataUrl);
            })
            .catch(() => {
                if (mounted) setError(true);
            });
        return () => {
            mounted = false;
        };
    }, [asset._id]);

    return (
        <>
            <div className={styles.qrBox}>
                {dataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className={styles.qrImage} src={dataUrl} alt={`QR ${asset.assetCode}`} width={160} height={160} />
                ) : error ? (
                    <span className={styles.subtitle}>تولید QR ناموفق بود</span>
                ) : (
                    <span className={styles.subtitle}>در حال تولید QR...</span>
                )}
                <div style={{ fontWeight: 700, direction: 'ltr' }}>{asset.assetCode}</div>
                <button type="button" className={styles.secondaryBtn} disabled={!dataUrl} onClick={() => window.print()}>
                    چاپ برچسب
                </button>
            </div>

            {/* فقط هنگام چاپ دیده می‌شود — استایل @media print در SCSS */}
            <div className={styles.printArea}>
                <div className={styles.printLabel}>
                    <h2>{asset.title}</h2>
                    <div className={styles.printCode}>{asset.assetCode}</div>
                    {dataUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={dataUrl} alt={`QR ${asset.assetCode}`} />
                    )}
                    <div className={styles.printBrand}>سیستم مدیریت اموال نسل‌یار</div>
                </div>
            </div>
        </>
    );
}
