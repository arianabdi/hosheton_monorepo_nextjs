export const SERVER_STATUS_LABEL: Record<string, string> = {
    online: 'آنلاین',
    offline: 'آفلاین',
    maintenance: 'تعمیرات',
    unknown: 'نامشخص',
};

export const SERVER_STATUS_TONE: Record<string, 'success' | 'danger' | 'warning' | 'muted'> = {
    online: 'success',
    offline: 'danger',
    maintenance: 'warning',
    unknown: 'muted',
};

export const PROVISION_ACTION_LABEL: Record<string, string> = {
    prepare: 'آماده‌سازی نود',
    install_xray: 'نصب Xray',
    'install-xray': 'نصب Xray',
    install_singbox: 'نصب sing-box',
    'install-singbox': 'نصب sing-box',
    install_wireguard: 'نصب WireGuard',
    'install-wireguard': 'نصب WireGuard',
    sync_config: 'اعمال کانفیگ‌ها',
    sync: 'اعمال کانفیگ‌ها',
    health_check: 'بررسی سلامت',
    health: 'بررسی سلامت',
    uninstall: 'حذف موتور',
    ssh: 'تست SSH',
};

export const RUN_STATUS_LABEL: Record<string, string> = {
    success: 'موفق',
    failed: 'ناموفق',
    running: 'در حال اجرا',
};

export const TIER_LABEL: Record<string, string> = {
    premium: 'پرمیوم',
    free: 'رایگان',
};

export const APP_SCOPE_LABEL: Record<string, string> = {
    vpn: 'VPN',
    dns: 'DNS',
    both: 'هر دو',
    none: 'هیچ‌کدام',
};

/** آیا سرور در بخش داده‌شده مجاز به استفاده است؟ */
export const scopeAllows = (appScope: string | undefined, section: 'vpn' | 'dns') => {
    const scope = appScope || 'vpn';
    return scope === 'both' || scope === section;
};

// ---- MTProto proxy fleet ----

export const MT_PROXY_NODE_STATUS_LABEL: Record<string, string> = {
    pending: 'آماده نصب',
    provisioning: 'در حال نصب',
    active: 'فعال',
    failed: 'خراب',
    disabled: 'غیرفعال',
    retired: 'بازنشسته',
};

export const MT_PROXY_NODE_STATUS_TONE: Record<string, 'success' | 'danger' | 'warning' | 'muted' | 'info'> = {
    pending: 'muted',
    provisioning: 'warning',
    active: 'success',
    failed: 'danger',
    disabled: 'muted',
    retired: 'muted',
};

export const MT_PROXY_EVENT_TYPE_LABEL: Record<string, string> = {
    bulk_import: 'ثبت/ورود گروهی',
    provision_started: 'شروع نصب',
    provision_ok: 'نصب موفق',
    provision_failed: 'نصب ناموفق',
    provision_cancelled: 'توقف نصب',
    health_ok: 'چک سلامت',
    health_failed: 'چک ناموفق',
    node_marked_failed: 'نود خراب شد',
    node_recovered: 'بازیابی نود',
    node_retired: 'بازنشستگی نود',
    node_disabled: 'غیرفعال‌سازی نود',
    node_replaced: 'جایگزینی نود',
    replacement_promoted: 'ارتقای جایگزین',
    pool_degraded: 'کمبود ظرفیت استخر',
    secret_rotated: 'چرخش راز',
    sponsor_set: 'ثبت ad_tag',
    sponsor_registered: 'ثبت در MTProxybot',
    sponsor_applied: 'اعمال اسپانسر',
    sponsor_failed: 'خطای اسپانسری',
    notify_failed: 'خطای اطلاع‌رسانی',
};

export const MT_PROXY_EVENT_LEVEL_LABEL: Record<string, string> = {
    info: 'اطلاع',
    warn: 'هشدار',
    error: 'خطا',
};

export const MT_PROXY_EVENT_LEVEL_TONE: Record<string, 'success' | 'danger' | 'warning' | 'muted'> = {
    info: 'muted',
    warn: 'warning',
    error: 'danger',
};

export function formatBytes(bytes: number): string {
    if (!bytes) return '۰';
    const gb = bytes / 1024 ** 3;
    if (gb >= 1) return `${gb.toFixed(1)} GB`;
    const mb = bytes / 1024 ** 2;
    if (mb >= 1) return `${mb.toFixed(1)} MB`;
    return `${Math.round(bytes / 1024)} KB`;
}
