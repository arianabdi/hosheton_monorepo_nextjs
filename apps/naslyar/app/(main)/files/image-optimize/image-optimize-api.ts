import axios from 'axios';

export interface ImageOptimizeSettings {
    enabled: boolean;
    maxEdgePx: number;
    quality: number;
}

export async function getImageOptimizeSettings(baseUrl: string, token: string): Promise<ImageOptimizeSettings> {
    const res = await axios.get(`${baseUrl}/api/studio/media/image-optimize/settings`, {
        headers: { authorization: `Bearer ${token}` },
    });
    if (res?.data?.statusCode !== 200) {
        throw new Error(res?.data?.message || 'دریافت تنظیمات ناموفق بود');
    }
    return res.data.data;
}

export async function saveImageOptimizeSettings(
    baseUrl: string,
    token: string,
    settings: ImageOptimizeSettings,
): Promise<ImageOptimizeSettings> {
    const res = await axios.put(`${baseUrl}/api/studio/media/image-optimize/settings`, settings, {
        headers: { authorization: `Bearer ${token}` },
    });
    if (res?.data?.statusCode !== 200) {
        throw new Error(res?.data?.message || 'ذخیره تنظیمات ناموفق بود');
    }
    return res.data.data;
}
