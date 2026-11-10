import axios from 'axios';
import {useAuthStore} from '@/app/zustand/store/authStore';
import {useAppStore} from '@/app/zustand/store/useAppStore';

/**
 * والپیپرهای بورد TaskVision — دسته‌ها و تصاویر (API: my-workspace-api/apps/taskvision/src/board-background):
 *   GET    /api/taskboard/backgrounds/admin           همه‌ی دسته‌ها با والپیپرها (با غیرفعال‌ها)
 *   POST   /api/taskboard/backgrounds/categories      {title, order?, isActive?}
 *   PUT    /api/taskboard/backgrounds/categories/:id
 *   DELETE /api/taskboard/backgrounds/categories/:id  (والپیپرهای دسته هم حذف می‌شوند)
 *   POST   /api/taskboard/backgrounds/wallpapers      {categoryId, title, imageUrl, darkImageUrl?, isAnimated?, order?, isActive?}
 *   PUT    /api/taskboard/backgrounds/wallpapers/:id
 *   DELETE /api/taskboard/backgrounds/wallpapers/:id
 *
 * کاربران TaskVision دسته‌های فعال را در پنجره انتخاب پس‌زمینه بورد (دسته «تصویر») می‌بینند.
 */

export interface BoardWallpaper {
    _id: string;
    categoryId: string;
    title: string;
    imageUrl: string;
    darkImageUrl?: string;
    isAnimated?: boolean;
    order?: number;
    isActive: boolean;
}

export interface WallpaperCategory {
    _id: string;
    title: string;
    order?: number;
    isActive: boolean;
    wallpapers: BoardWallpaper[];
}

export type WallpaperCategoryPayload = Partial<Pick<WallpaperCategory, 'title' | 'order' | 'isActive'>>;
export type WallpaperPayload = Partial<Omit<BoardWallpaper, '_id'>>;

/** فرمت‌های سبک مجاز — هم‌خوان با سرور (board-background.service.ts) */
export const WALLPAPER_ACCEPT = 'image/png,image/webp,image/gif,image/apng,image/avif,image/jpeg';
export const ANIMATED_EXTENSIONS = ['gif', 'apng'];

function config() {
    const {token} = useAuthStore.getState();
    const {baseUrl} = useAppStore.getState();
    return {
        base: `${baseUrl || process.env.NEXT_PUBLIC_API_URL}/api/taskboard/backgrounds`,
        options: {headers: {authorization: `Bearer ${token}`, 'Content-Type': 'application/json'}},
    };
}

function unwrap<T>(res: { data?: { statusCode?: number; data?: T; message?: string } }, fallback: string): T {
    if (res.data?.statusCode === 200 || res.data?.statusCode === 201) return res.data.data as T;
    throw new Error(res.data?.message || fallback);
}

export async function fetchWallpaperCategories(): Promise<WallpaperCategory[]> {
    const {base, options} = config();
    const data = unwrap<{ categories: WallpaperCategory[] }>(await axios.get(`${base}/admin`, options), 'خطا در دریافت والپیپرها');
    return data?.categories || [];
}

export async function saveWallpaperCategory(id: string | null, payload: WallpaperCategoryPayload) {
    const {base, options} = config();
    const res = id
        ? await axios.put(`${base}/categories/${id}`, payload, options)
        : await axios.post(`${base}/categories`, payload, options);
    return unwrap(res, 'خطا در ذخیره‌ی دسته');
}

export async function deleteWallpaperCategory(id: string) {
    const {base, options} = config();
    return unwrap(await axios.delete(`${base}/categories/${id}`, options), 'خطا در حذف دسته');
}

export async function saveWallpaper(id: string | null, payload: WallpaperPayload) {
    const {base, options} = config();
    const res = id
        ? await axios.put(`${base}/wallpapers/${id}`, payload, options)
        : await axios.post(`${base}/wallpapers`, payload, options);
    return unwrap(res, 'خطا در ذخیره‌ی والپیپر');
}

export async function deleteWallpaper(id: string) {
    const {base, options} = config();
    return unwrap(await axios.delete(`${base}/wallpapers/${id}`, options), 'خطا در حذف والپیپر');
}
