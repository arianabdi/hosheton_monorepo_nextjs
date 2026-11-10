/**
 * Fixes legacy AI generation URLs that incorrectly prepended the bucket name again:
 *   {PUBLIC_BASE}/{BUCKET}/images/{APP}/file  →  {PUBLIC_BASE}/images/{APP}/file
 *
 * Does NOT touch assetRef / chunk-upload URLs:
 *   {PUBLIC_BASE}/{APP}/images/file
 */
export function sanitizeLegacyStorageUrl(url: string): string {
    if (!url) return url;

    const publicBase = (
        process.env.NEXT_PUBLIC_S3_PUBLIC_BASE
        || process.env.NEXT_PUBLIC_S3_COMPATIBLE_STORAGE_ENDPOINT_PUBLIC_URL
        || ''
    ).replace(/\/+$/, '');

    if (!publicBase || !url.startsWith(`${publicBase}/`)) return url;

    // Bucket is the segment after the last colon in Contabo public base (tenant:bucket)
    const bucketMatch = publicBase.match(/:([^:/]+)$/);
    const bucket = bucketMatch?.[1];
    if (!bucket) return url;

    const rest = url.slice(publicBase.length + 1);
    const parts = rest.split('/');

    // Broken AI layout only: {bucket}/{images|videos|audios}/{appName}/{file…}
    if (
        parts.length >= 4
        && parts[0] === bucket
        && (parts[1] === 'images' || parts[1] === 'videos' || parts[1] === 'audios')
    ) {
        return `${publicBase}/${parts.slice(1).join('/')}`;
    }

    return url;
}

/** Build public object URL from S3 key using env base (Contabo tenant path). */
export function buildPublicFileUrl(key: string): string {
    if (!key) return '';
    const normalizedKey = key.replace(/^\/+/, '');
    const publicBase =
        process.env.NEXT_PUBLIC_S3_PUBLIC_BASE
        || process.env.NEXT_PUBLIC_S3_COMPATIBLE_STORAGE_ENDPOINT_PUBLIC_URL
        || '';
    if (!publicBase) return '';
    return `${publicBase.replace(/\/+$/, '')}/${normalizedKey}`;
}
