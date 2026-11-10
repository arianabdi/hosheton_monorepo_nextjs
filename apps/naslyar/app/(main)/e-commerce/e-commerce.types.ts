// app/(main)/e-commerce/e-commerce.types.ts
// تایپ‌ها و برچسب‌های فارسی ماژول ای‌کامرس

export interface EcVariant {
    _id?: string;
    productId?: string;
    sku?: string;
    barcode?: string;
    price?: number;
    salePrice?: number;
    costPrice?: number;
    weight?: number;
    image?: string;
    isDefault?: boolean;
    isActive?: boolean;
    options?: { attributeId?: string; attributeValueId?: string; label?: string }[];
    quantity?: number; // در پاسخ‌های join شده
}

export interface EcProduct {
    _id: string;
    titleFa: string;
    titleEn?: string;
    slug: string;
    skuPrefix?: string;
    productType: EcProductType;
    status: EcProductStatus;
    visibility?: string;
    shortDescription?: string;
    description?: string;
    brandId?: string | null;
    brandName?: string;
    categoryIds?: string[];
    images?: string[];
    tags?: string[];
    seoTitle?: string;
    metaDescription?: string;
    price?: number;
    salePrice?: number;
    variants?: EcVariant[];
    subscriptionPlanId?: string | null;
    moadianIdentifier?: string;
    weight?: number;
    publishedAt?: string | null;
    createdAt?: string;
}

export type EcProductType =
    | 'simple'
    | 'variable'
    | 'bundle'
    | 'composite'
    | 'digital'
    | 'service'
    | 'booking'
    | 'subscription'
    | 'gift_card';

export type EcProductStatus = 'draft' | 'published' | 'archived' | 'hidden';

export const PRODUCT_TYPE_LABELS: Record<EcProductType, string> = {
    simple: 'ساده',
    variable: 'متغیر',
    bundle: 'پکیج',
    composite: 'ترکیبی',
    digital: 'دانلودی',
    service: 'خدمت',
    booking: 'رزرو',
    subscription: 'اشتراک',
    gift_card: 'کارت هدیه',
};

export const PRODUCT_STATUS_LABELS: Record<EcProductStatus, string> = {
    draft: 'پیش‌نویس',
    published: 'منتشر شده',
    archived: 'بایگانی',
    hidden: 'مخفی',
};

export type EcOrderStatus =
    | 'draft'
    | 'pending_payment'
    | 'paid'
    | 'processing'
    | 'packed'
    | 'shipped'
    | 'delivered'
    | 'cancelled'
    | 'returned'
    | 'refunded';

export const ORDER_STATUS_LABELS: Record<EcOrderStatus, string> = {
    draft: 'پیش‌سفارش',
    pending_payment: 'در انتظار پرداخت',
    paid: 'پرداخت شده',
    processing: 'در حال آماده‌سازی',
    packed: 'بسته‌بندی شده',
    shipped: 'ارسال شده',
    delivered: 'تحویل شده',
    cancelled: 'لغو شده',
    returned: 'مرجوع شده',
    refunded: 'بازپرداخت شده',
};

/** رنگ بج هر وضعیت سفارش */
export const ORDER_STATUS_TONE: Record<EcOrderStatus, 'success' | 'info' | 'warning' | 'danger' | 'muted'> = {
    draft: 'muted',
    pending_payment: 'warning',
    paid: 'success',
    processing: 'info',
    packed: 'info',
    shipped: 'info',
    delivered: 'success',
    cancelled: 'danger',
    returned: 'warning',
    refunded: 'muted',
};

export type EcPaymentStatus = 'unpaid' | 'partially_paid' | 'paid' | 'refunded';

export const PAYMENT_STATUS_LABELS: Record<EcPaymentStatus, string> = {
    unpaid: 'پرداخت نشده',
    partially_paid: 'پرداخت جزئی',
    paid: 'پرداخت شده',
    refunded: 'بازپرداخت شده',
};

export interface EcOrderItem {
    _id?: string;
    productId?: string;
    variantId?: string | null;
    title: string;
    sku?: string;
    image?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    options?: { label: string }[];
    selectedAddons?: { groupTitle: string; optionLabel: string; priceModifier: number }[];
}

export interface EcShippingAddress {
    receiverName?: string;
    receiverMobile?: string;
    province?: string;
    city?: string;
    district?: string;
    street?: string;
    plaque?: string;
    unit?: string;
    postalCode?: string;
}

export interface EcOrder {
    _id: string;
    orderNumber: string;
    customerId: string;
    customerName?: string;
    status: EcOrderStatus;
    paymentStatus: EcPaymentStatus;
    items: EcOrderItem[];
    subtotal: number;
    discountAmount: number;
    shippingCost: number;
    taxAmount: number;
    grandTotal: number;
    currency?: string;
    taxRate?: number;
    couponCode?: string;
    shippingMethodName?: string;
    shippingAddress?: EcShippingAddress;
    customerNote?: string;
    moadianUid?: string;
    createdAt?: string;
}

export interface EcOrderNote {
    _id: string;
    orderId: string;
    note: string;
    type: 'internal' | 'customer' | 'system';
    createdAt?: string;
}

export interface EcPayment {
    _id: string;
    orderId: string;
    amount: number;
    status: 'pending' | 'authorized' | 'captured' | 'failed' | 'refunded' | 'partially_refunded';
    gateway: string;
    refId?: string;
    authority?: string;
    paidAt?: string | null;
    createdAt?: string;
}

export interface EcShipment {
    _id: string;
    orderId: string;
    carrier: string;
    carrierName?: string;
    trackingNumber?: string;
    status: 'pending' | 'preparing' | 'in_transit' | 'delivered' | 'returned' | 'failed';
    cost?: number;
    shippedAt?: string | null;
    deliveredAt?: string | null;
    events?: { title: string; description: string; occurredAt: string }[];
    createdAt?: string;
}

export const SHIPMENT_STATUS_LABELS: Record<EcShipment['status'], string> = {
    pending: 'در انتظار',
    preparing: 'در حال آماده‌سازی',
    in_transit: 'در مسیر',
    delivered: 'تحویل شده',
    returned: 'مرجوع شده',
    failed: 'ناموفق',
};

export const CARRIER_LABELS: Record<string, string> = {
    post: 'پست',
    tipax: 'تیپاکس',
    chapar: 'چاپار',
    alopeik: 'الوپیک',
    snapbox: 'اسنپ‌باکس',
    mahex: 'ماهکس',
    freight: 'باربری',
    custom: 'سایر',
};

export const GATEWAY_LABELS: Record<string, string> = {
    zarinpal: 'زرین‌پال',
    zibal: 'زیبال',
    idpay: 'آیدی‌پی',
    nextpay: 'نکست‌پی',
    wallet: 'کیف پول',
    cod: 'پرداخت در محل',
    manual: 'دستی',
};

export interface EcCategory {
    _id: string;
    name: string;
    slug: string;
    nameEn?: string;
    parentId?: string | null;
    path?: string;
    order?: number;
    image?: string;
    isActive?: boolean;
    children?: EcCategory[];
    createdAt?: string;
}

export interface EcBrand {
    _id: string;
    name: string;
    slug: string;
    nameEn?: string;
    logoUrl?: string;
    description?: string;
    website?: string;
    country?: string;
    isActive?: boolean;
    createdAt?: string;
}

export interface EcWarehouse {
    _id: string;
    name: string;
    code: string;
    city?: string;
    address?: string;
    phone?: string;
    isDefault?: boolean;
    isActive?: boolean;
}

export interface EcInventoryLevel {
    _id: string;
    variantId: string;
    warehouseId: string;
    warehouseName?: string;
    sku?: string;
    productTitle?: string;
    quantity: number;
    reserved: number;
    lowStockThreshold?: number;
}

export interface EcInventoryTransaction {
    _id: string;
    variantId: string;
    warehouseId: string;
    type: string;
    quantity: number;
    balanceAfter: number;
    note?: string;
    createdAt?: string;
}

export interface EcCustomer {
    _id: string;
    firstName: string;
    lastName: string;
    mobile: string;
    email?: string;
    type: 'individual' | 'legal';
    nationalCode?: string;
    companyName?: string;
    companyId?: string;
    economicCode?: string;
    registrationNumber?: string;
    tags?: string[];
    notes?: string;
    walletBalance?: number;
    loyaltyPoints?: number;
    totalOrdersCount?: number;
    totalSpent?: number;
    createdAt?: string;
}

export const CUSTOMER_TYPE_LABELS: Record<EcCustomer['type'], string> = {
    individual: 'حقیقی',
    legal: 'حقوقی',
};

export interface EcCoupon {
    _id: string;
    code: string;
    title?: string;
    type: 'percentage' | 'fixed' | 'free_shipping';
    value: number;
    maxDiscountAmount?: number;
    minOrderAmount?: number;
    usageLimit?: number;
    usedCount?: number;
    perCustomerLimit?: number;
    startsAt?: string | null;
    endsAt?: string | null;
    isActive?: boolean;
    createdAt?: string;
}

export const COUPON_TYPE_LABELS: Record<EcCoupon['type'], string> = {
    percentage: 'درصدی',
    fixed: 'مبلغ ثابت',
    free_shipping: 'ارسال رایگان',
};

export interface EcGiftCard {
    _id: string;
    code: string;
    amount: number;
    balance: number;
    customerId?: string | null;
    status: 'active' | 'used' | 'expired' | 'disabled';
    expiresAt?: string | null;
    createdAt?: string;
}

export const GIFT_CARD_STATUS_LABELS: Record<EcGiftCard['status'], string> = {
    active: 'فعال',
    used: 'استفاده شده',
    expired: 'منقضی',
    disabled: 'غیرفعال',
};

export interface EcReview {
    _id: string;
    productId: string;
    customerId: string;
    rating: number;
    title?: string;
    comment: string;
    status: 'pending' | 'approved' | 'rejected';
    createdAt?: string;
}

export const REVIEW_STATUS_LABELS: Record<EcReview['status'], string> = {
    pending: 'در انتظار بررسی',
    approved: 'تایید شده',
    rejected: 'رد شده',
};

export interface EcWishlist {
    _id: string;
    customerId: string;
    title: string;
    productIds: string[];
    isPublic?: boolean;
    shareToken?: string;
    createdAt?: string;
}

export interface EcLoyaltyTransaction {
    _id: string;
    customerId: string;
    type: 'earn' | 'spend' | 'expire' | 'bonus' | 'refund';
    points: number;
    balanceAfter?: number;
    note?: string;
    createdAt?: string;
}

export const LOYALTY_TYPE_LABELS: Record<EcLoyaltyTransaction['type'], string> = {
    earn: 'کسب امتیاز',
    spend: 'خرج امتیاز',
    expire: 'انقضا',
    bonus: 'جایزه',
    refund: 'بازگشت',
};

export interface EcOrganization {
    _id: string;
    name: string;
    nationalId?: string;
    economicCode?: string;
    registrationNumber?: string;
    phone?: string;
    email?: string;
    address?: string;
    creditLimit?: number;
    creditUsed?: number;
    paymentTermDays?: number;
    discountPercent?: number;
    buyerIds?: string[];
    status: 'active' | 'pending' | 'suspended';
    createdAt?: string;
}

export const ORGANIZATION_STATUS_LABELS: Record<EcOrganization['status'], string> = {
    active: 'فعال',
    pending: 'در انتظار تایید',
    suspended: 'معلق',
};

export type EcReturnStatus =
    | 'requested'
    | 'approved'
    | 'rejected'
    | 'received'
    | 'inspected'
    | 'refunded'
    | 'cancelled';

export const RETURN_STATUS_LABELS: Record<EcReturnStatus, string> = {
    requested: 'ثبت شده',
    approved: 'تایید شده',
    rejected: 'رد شده',
    received: 'دریافت شده',
    inspected: 'بازرسی شده',
    refunded: 'بازپرداخت شده',
    cancelled: 'لغو شده',
};

export interface EcReturnRequest {
    _id: string;
    requestNumber: string;
    orderId: string;
    customerId: string;
    items: { productId?: string; variantId?: string | null; title: string; quantity: number; reason?: string }[];
    reason?: string;
    status: EcReturnStatus;
    inspectionNote?: string;
    createdAt?: string;
}

export interface EcShippingZone {
    _id: string;
    name: string;
    provinces?: string[];
    cities?: string[];
    postalCodePrefixes?: string[];
    isActive?: boolean;
    createdAt?: string;
}

export interface EcShippingMethod {
    _id: string;
    name: string;
    zoneId: string;
    type: 'flat' | 'weight_based' | 'price_based' | 'free' | 'express' | 'pickup';
    baseCost?: number;
    perUnitCost?: number;
    freeAbove?: number;
    estimatedDays?: number;
    minOrderAmount?: number;
    isActive?: boolean;
    createdAt?: string;
}

export const SHIPPING_METHOD_TYPE_LABELS: Record<EcShippingMethod['type'], string> = {
    flat: 'هزینه ثابت',
    weight_based: 'بر اساس وزن',
    price_based: 'بر اساس مبلغ',
    free: 'ارسال رایگان',
    express: 'ارسال سریع',
    pickup: 'تحویل حضوری',
};

export interface EcRefund {
    _id: string;
    orderId: string;
    amount: number;
    method: 'gateway' | 'wallet' | 'manual';
    status: 'pending' | 'completed' | 'failed';
    reference?: string;
    note?: string;
    createdAt?: string;
}

export interface EcSettings {
    _id?: string;
    orderNumberPrefix?: string;
    orderNumberIncludeJalaliYear?: boolean;
    currency?: string;
    vatPercent?: number;
    taxEnabled?: boolean;
    defaultWarehouseId?: string | null;
    lowStockThreshold?: number;
    reservationTtlMinutes?: number;
    guestCheckoutEnabled?: boolean;
}

export interface EcDashboardData {
    stats: {
        totalRevenue: number;
        ordersCount: number;
        customersCount: number;
        productsCount: number;
        vatPercent?: number;
    };
    salesSeries: { _id: string; revenue: number; count: number }[];
    topProducts: { _id: string; title: string; totalQuantity: number; totalRevenue: number }[];
    recentOrders: EcOrder[];
    lowStockItems: EcInventoryLevel[];
}

// ============================ Helpers ============================

export function formatToman(value?: number): string {
    if (value === undefined || value === null) return '۰';
    return value.toLocaleString('fa-IR');
}

export function formatDate(value?: string | null): string {
    if (!value) return '—';
    try {
        return toFaDigits(new Date(value).toLocaleDateString('fa-IR'));
    } catch {
        return '—';
    }
}

export function toFaDigits(input: string | number): string {
    return String(input).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
}
