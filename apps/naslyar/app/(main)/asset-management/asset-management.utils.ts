/**
 * ثابت‌ها، لیبل‌های فارسی و رنگ badgeهای ماژول مدیریت اموال
 */

export type AssetStatus =
    | 'in_stock'
    | 'assigned'
    | 'in_repair'
    | 'lost'
    | 'surplus'
    | 'decommissioned';

export const ASSET_STATUS_LABELS: Record<AssetStatus, string> = {
    in_stock: 'موجود در انبار',
    assigned: 'تحویل‌شده',
    in_repair: 'در تعمیر',
    lost: 'مفقود',
    surplus: 'مازاد',
    decommissioned: 'اسقاط‌شده',
};

/** توーン رنگ هر وضعیت — کلاس‌های badge استاندارد ماژول (badgeSuccess/badgeInfo/...) */
export const ASSET_STATUS_BADGE_TONE: Record<AssetStatus, string> = {
    in_stock: 'badgeSuccess',
    assigned: 'badgeInfo',
    in_repair: 'badgeWarning',
    lost: 'badgeDanger',
    surplus: 'badgeMuted',
    decommissioned: 'badgeMuted',
};

export const ALL_ASSET_STATUSES = Object.keys(ASSET_STATUS_LABELS) as AssetStatus[];

export type AssetLocationType = 'warehouse' | 'branch' | 'room' | 'vehicle' | 'project' | 'other';

export const ASSET_LOCATION_TYPE_LABELS: Record<AssetLocationType, string> = {
    warehouse: 'انبار',
    branch: 'شعبه',
    room: 'اتاق تجهیزات',
    vehicle: 'خودرو',
    project: 'پروژه',
    other: 'سایر',
};

export const ALL_LOCATION_TYPES = Object.keys(ASSET_LOCATION_TYPE_LABELS) as AssetLocationType[];

export const ASSET_ASSIGNMENT_TYPE_LABELS: Record<string, string> = {
    issue: 'تحویل',
    return: 'برگشت',
    transfer: 'انتقال',
    location_change: 'جابه‌جایی محل',
};

export const ASSET_AUDIT_ACTION_LABELS: Record<string, string> = {
    create: 'ایجاد دارایی',
    update: 'ویرایش اطلاعات',
    assign: 'تحویل',
    return: 'برگشت',
    transfer: 'انتقال',
    location_change: 'جابه‌جایی محل',
    status_change: 'تغییر وضعیت',
    delete: 'حذف',
};

/** لیبل فارسی فیلدهای شناسنامه — برای نمایش تغییرات در Audit Log */
export const ASSET_FIELD_LABELS: Record<string, string> = {
    title: 'نام دارایی',
    assetCode: 'کد اموال',
    model: 'مدل',
    brand: 'برند',
    serialNumber: 'شماره سریال',
    categoryId: 'گروه',
    locationId: 'محل استقرار',
    unit: 'واحد سازمانی',
    custodianUserId: 'تحویل‌گیرنده',
    status: 'وضعیت',
    invoiceNumber: 'شماره فاکتور',
    contractNumber: 'شماره قرارداد',
    supplier: 'تأمین‌کننده',
    purchaseDate: 'تاریخ خرید',
    commissioningDate: 'تاریخ بهره‌برداری',
    purchasePrice: 'قیمت خرید',
    warrantyCompany: 'شرکت گارانتی',
    warrantyContractNumber: 'شماره قرارداد گارانتی',
    warrantyStartDate: 'شروع گارانتی',
    warrantyEndDate: 'پایان گارانتی',
    description: 'توضیحات',
};
