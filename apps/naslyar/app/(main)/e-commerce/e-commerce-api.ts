// app/(main)/e-commerce/e-commerce-api.ts
// لایه ارتباط با API ای‌کامرس — همه درخواست‌ها به api/ecommerce
import axios from 'axios';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';

export function getEcommerceApiConfig() {
    const { baseUrl } = useAppStore.getState();
    const { token } = useAuthStore.getState();
    return {
        baseUrl: baseUrl || process.env.NEXT_PUBLIC_API_URL || '',
        headers: {
            authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    };
}

const BASE = '/api/ecommerce';

async function request<T = any>(method: 'get' | 'post' | 'put' | 'delete', path: string, body?: any, params?: any): Promise<T> {
    const { baseUrl, headers } = getEcommerceApiConfig();
    const res = await axios.request({
        method,
        url: `${baseUrl}${BASE}${path}`,
        data: body,
        params,
        headers,
    });
    if (res.data?.statusCode && res.data.statusCode !== 200) {
        throw new Error(res.data.message || 'خطا در ارتباط با سرور');
    }
    return res.data?.data as T;
}

// ============================ Dashboard ============================

export const fetchDashboard = () => request('get', '/dashboard');

// ============================ Products ============================

export const fetchProducts = (params?: { search?: string; status?: string; productType?: string; page?: number; limit?: number }) =>
    request('get', '/products', undefined, params);
export const fetchProduct = (id: string) => request('get', `/products/${id}`);
export const createProduct = (body: any) => request('post', '/products', body);
export const updateProduct = (id: string, body: any) => request('put', `/products/${id}`, body);
export const deleteProduct = (id: string) => request('delete', `/products/${id}`);

// ============================ Categories / Brands ============================

export const fetchCategories = () => request('get', '/categories');
export const fetchCategoryTree = () => request('get', '/categories/tree');
export const createCategory = (body: any) => request('post', '/categories', body);
export const updateCategory = (id: string, body: any) => request('put', `/categories/${id}`, body);
export const deleteCategory = (id: string) => request('delete', `/categories/${id}`);

export const fetchBrands = (params?: { search?: string }) => request('get', '/brands', undefined, params);
export const createBrand = (body: any) => request('post', '/brands', body);
export const updateBrand = (id: string, body: any) => request('put', `/brands/${id}`, body);
export const deleteBrand = (id: string) => request('delete', `/brands/${id}`);

// ============================ Inventory ============================

export const fetchWarehouses = () => request('get', '/warehouses');
export const createWarehouse = (body: any) => request('post', '/warehouses', body);
export const updateWarehouse = (id: string, body: any) => request('put', `/warehouses/${id}`, body);
export const deleteWarehouse = (id: string) => request('delete', `/warehouses/${id}`);

export const fetchInventoryLevels = (params?: { warehouseId?: string; variantId?: string }) =>
    request('get', '/inventory/levels', undefined, params);
export const adjustInventory = (body: { variantId: string; warehouseId: string; quantity: number; type?: string; note?: string }) =>
    request('post', '/inventory/adjust', body);
export const transferInventory = (body: {
    variantId: string;
    fromWarehouseId: string;
    toWarehouseId: string;
    quantity: number;
    note?: string;
}) => request('post', '/inventory/transfer', body);
export const fetchInventoryTransactions = (params?: { variantId?: string; warehouseId?: string; type?: string }) =>
    request('get', '/inventory/transactions', undefined, params);

// ============================ Orders ============================

export const fetchOrders = (params?: { status?: string; paymentStatus?: string; search?: string; customerId?: string; page?: number; limit?: number }) =>
    request('get', '/orders', undefined, params);
export const fetchOrder = (id: string) => request('get', `/orders/${id}`);
export const updateOrderStatus = (id: string, status: string) => request('put', `/orders/${id}/status`, { status });
export const addOrderNote = (id: string, note: string, type = 'internal') =>
    request('post', `/orders/${id}/notes`, { note, type });
export const recordOrderPayment = (
    id: string,
    body: { amount: number; gateway: string; status?: string; refId?: string },
) => request('post', `/orders/${id}/payments`, body);
export const createShipment = (
    orderId: string,
    body: { carrierId?: string; carrier?: string; carrierName?: string; trackingNumber?: string; cost?: number },
) => request('post', `/orders/${orderId}/shipments`, body);
export const updateShipmentStatus = (
    id: string,
    body: { status: string; eventTitle?: string; eventDescription?: string },
) => request('put', `/shipments/${id}/status`, body);

// ============================ Customers ============================

export const fetchCustomers = (params?: { search?: string; type?: string }) =>
    request('get', '/customers', undefined, params);
export const fetchCustomer = (id: string) => request('get', `/customers/${id}`);
export const createCustomer = (body: any) => request('post', '/customers', body);
export const updateCustomer = (id: string, body: any) => request('put', `/customers/${id}`, body);
export const deleteCustomer = (id: string) => request('delete', `/customers/${id}`);

// ============================ Coupons / Gift Cards ============================

export const fetchCoupons = () => request('get', '/coupons');
export const createCoupon = (body: any) => request('post', '/coupons', body);
export const updateCoupon = (id: string, body: any) => request('put', `/coupons/${id}`, body);
export const deleteCoupon = (id: string) => request('delete', `/coupons/${id}`);

export const fetchGiftCards = () => request('get', '/gift-cards');
export const createGiftCard = (body: any) => request('post', '/gift-cards', body);
export const updateGiftCard = (id: string, body: any) => request('put', `/gift-cards/${id}`, body);
export const deleteGiftCard = (id: string) => request('delete', `/gift-cards/${id}`);

// ============================ Wishlist / Reviews / Loyalty ============================

export const fetchWishlists = (params?: { customerId?: string }) => request('get', '/wishlists', undefined, params);

export const fetchReviews = (params?: { status?: string; productId?: string }) =>
    request('get', '/reviews', undefined, params);
export const updateReviewStatus = (id: string, status: string) => request('put', `/reviews/${id}/status`, { status });
export const deleteReview = (id: string) => request('delete', `/reviews/${id}`);

export const fetchLoyaltyTransactions = (params?: { customerId?: string }) =>
    request('get', '/loyalty/transactions', undefined, params);
export const createLoyaltyTransaction = (body: { customerId: string; type: string; points: number; note?: string }) =>
    request('post', '/loyalty/transactions', body);

// ============================ Returns / Refunds ============================

export const fetchReturns = (params?: { status?: string }) => request('get', '/returns', undefined, params);
export const updateReturnStatus = (id: string, status: string, inspectionNote?: string) =>
    request('put', `/returns/${id}/status`, { status, inspectionNote });

export const fetchRefunds = () => request('get', '/refunds');
export const createRefund = (body: { orderId: string; amount: number; method?: string; note?: string }) =>
    request('post', '/refunds', body);
export const completeRefund = (id: string, reference?: string) => request('post', `/refunds/${id}/complete`, { reference });

// ============================ Organizations (B2B) ============================

export const fetchOrganizations = (params?: { search?: string }) => request('get', '/organizations', undefined, params);
export const createOrganization = (body: any) => request('post', '/organizations', body);
export const updateOrganization = (id: string, body: any) => request('put', `/organizations/${id}`, body);
export const deleteOrganization = (id: string) => request('delete', `/organizations/${id}`);
export const addOrganizationBuyer = (id: string, customerId: string) =>
    request('post', `/organizations/${id}/buyers`, { customerId });
export const removeOrganizationBuyer = (id: string, buyerId: string) =>
    request('delete', `/organizations/${id}/buyers/${buyerId}`);

// ============================ Shipping ============================

export const fetchShippingZones = () => request('get', '/shipping/zones');
export const createShippingZone = (body: any) => request('post', '/shipping/zones', body);
export const updateShippingZone = (id: string, body: any) => request('put', `/shipping/zones/${id}`, body);
export const deleteShippingZone = (id: string) => request('delete', `/shipping/zones/${id}`);

export const fetchShippingMethods = (params?: { zoneId?: string }) =>
    request('get', '/shipping/methods', undefined, params);
export const createShippingMethod = (body: any) => request('post', '/shipping/methods', body);
export const updateShippingMethod = (id: string, body: any) => request('put', `/shipping/methods/${id}`, body);
export const deleteShippingMethod = (id: string) => request('delete', `/shipping/methods/${id}`);

// ============================ Settings ============================

export const fetchEcommerceSettings = () => request('get', '/settings');
export const updateEcommerceSettings = (body: any) => request('put', '/settings', body);

// ============================ Carriers (شرکت‌های حمل‌ونقل داینامیک) ============================

export const fetchCarriers = (params?: { isActive?: string }) => request('get', '/carriers', undefined, params);
export const fetchCarrier = (id: string) => request('get', `/carriers/${id}`);
export const createCarrier = (body: any) => request('post', '/carriers', body);
export const updateCarrier = (id: string, body: any) => request('put', `/carriers/${id}`, body);
export const deleteCarrier = (id: string) => request('delete', `/carriers/${id}`);

// ============================ Reports ============================

export const fetchReportOverview = (days: number) => request('get', '/reports/overview', undefined, { days });
export const fetchReportSales = (days: number) => request('get', '/reports/sales', undefined, { days });
export const fetchReportCustomers = (days: number) => request('get', '/reports/customers', undefined, { days });
export const fetchReportProducts = (days: number) => request('get', '/reports/products', undefined, { days });
export const fetchReportMarketing = (days: number) => request('get', '/reports/marketing', undefined, { days });
export const fetchReportFinance = (days: number) => request('get', '/reports/finance', undefined, { days });
export const fetchReportOperations = (days: number) => request('get', '/reports/operations', undefined, { days });
