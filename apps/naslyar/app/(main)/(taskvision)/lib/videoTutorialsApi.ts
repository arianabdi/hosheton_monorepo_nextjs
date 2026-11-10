import axios from 'axios';
import {useAuthStore} from '@/app/zustand/store/authStore';
import {useAppStore} from '@/app/zustand/store/useAppStore';

/**
 * قرارداد API آموزش‌های ویدیویی بخش‌های UI تسک‌ویژن:
 *   GET    /api/video-tutorial?pageKey=&limit=&page=  (ادمین) → {statusCode: 200, data: {tutorials, totalItems}}
 *   POST   /api/video-tutorial                        (ادمین) بدنه: {pageKey, eyebrow?, title, description?, steps?, videoUrl?, videoHint?, isEnabled?, order?}
 *   PUT    /api/video-tutorial/:id                    (ادمین) بروزرسانی — همه فیلدها اختیاری
 *   DELETE /api/video-tutorial/:id                    (ادمین) حذف نرم
 *
 * نمایش در اپ تسک‌ویژن از اندپوینت عمومی GET /api/video-tutorial/public/:pageKey انجام می‌شود
 * (فقط رکوردهای isEnabled). pageKey همان بخش UI است؛ مثلا projects یا support.
 */

export interface VideoTutorial {
    _id: string;
    pageKey: string;
    eyebrow?: string;
    title: string;
    description?: string;
    steps?: string[];
    videoUrl?: string;
    videoHint?: string;
    isEnabled: boolean;
    order?: number;
    createdAt?: string;
}

export interface VideoTutorialPayload {
    pageKey: string;
    eyebrow?: string;
    title: string;
    description?: string;
    steps?: string[];
    videoUrl?: string;
    videoHint?: string;
    isEnabled?: boolean;
    order?: number;
}

function getRequestConfig() {
    const {token} = useAuthStore.getState();
    const {baseUrl} = useAppStore.getState();
    return {
        baseUrl: baseUrl || process.env.NEXT_PUBLIC_API_URL,
        headers: {
            authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    };
}

export async function fetchVideoTutorials(params?: {pageKey?: string; page?: number; limit?: number}): Promise<{tutorials: VideoTutorial[]; totalItems: number}> {
    const {baseUrl, headers} = getRequestConfig();
    const res = await axios.get(`${baseUrl}/api/video-tutorial`, {headers, params});
    if (res.data?.statusCode === 200) {
        return {tutorials: res.data?.data?.tutorials || [], totalItems: res.data?.data?.totalItems || 0};
    }
    throw new Error(res.data?.message || 'خطا در دریافت آموزش‌ها');
}

export async function createVideoTutorial(payload: VideoTutorialPayload): Promise<VideoTutorial> {
    const {baseUrl, headers} = getRequestConfig();
    const res = await axios.post(`${baseUrl}/api/video-tutorial`, payload, {headers});
    if (res.data?.statusCode === 200 || res.data?.statusCode === 201) {
        return res.data?.data;
    }
    throw new Error(res.data?.message || 'خطا در افزودن آموزش');
}

export async function updateVideoTutorial(id: string, payload: Partial<VideoTutorialPayload>): Promise<VideoTutorial> {
    const {baseUrl, headers} = getRequestConfig();
    const res = await axios.put(`${baseUrl}/api/video-tutorial/${id}`, payload, {headers});
    if (res.data?.statusCode === 200) {
        return res.data?.data;
    }
    throw new Error(res.data?.message || 'خطا در بروزرسانی آموزش');
}

export async function deleteVideoTutorial(id: string): Promise<void> {
    const {baseUrl, headers} = getRequestConfig();
    const res = await axios.delete(`${baseUrl}/api/video-tutorial/${id}`, {headers});
    if (res.data?.statusCode !== 200) {
        throw new Error(res.data?.message || 'خطا در حذف آموزش');
    }
}
