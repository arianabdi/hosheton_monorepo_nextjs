import { providersApi } from '@/app/(developers)/projects/lib/providers-api';
import { sanitizeSvg } from './modeIcon';

/**
 * نقشه‌ی لوگوی مدل‌ها (`id:<modelId>` و `name:<lowercase name>` → SVG) — گالری چت و تاریخچه
 * هر دو لازمش دارند؛ یک درخواست برای کل تب، با پاک شدن کش در صورت خطا تا دفعه‌ی بعد دوباره تلاش شود.
 */
let cached: Promise<Map<string, string>> | null = null;

export function loadChatModelIcons(): Promise<Map<string, string>> {
    if (!cached) {
        cached = providersApi.listModels()
            .then((res) => {
                const map = new Map<string, string>();
                for (const model of res.models || []) {
                    const svg = sanitizeSvg(model.iconSvg);
                    if (!svg) continue;
                    if (model._id) map.set(`id:${String(model._id)}`, svg);
                    if (model.name) map.set(`name:${String(model.name).toLowerCase()}`, svg);
                    if (model.displayName) map.set(`name:${String(model.displayName).toLowerCase()}`, svg);
                }
                return map;
            })
            .catch((error) => {
                cached = null;
                throw error;
            });
    }
    return cached;
}
