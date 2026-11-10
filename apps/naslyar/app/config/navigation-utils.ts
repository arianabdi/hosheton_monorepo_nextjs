import type { NavItem } from './navigation';
import { hasPermission, filterNavByPermissions, getPermissionKeyForPath } from './permission-catalog';

export { hasPermission, filterNavByPermissions, getPermissionKeyForPath };

/** Resolve app variant for legacy sessions that only stored appName. */
export function resolveAppVariant(appVariant: string, baseUrl: string, appName: string): string {
    if (appVariant) return appVariant;
    if (appName !== 'hosheton') return appName;

    const url = baseUrl.toLowerCase();
    if (url.includes('3379') || url.includes('studio')) return 'hosheton_studio';
    if (url.includes('3378') || url.includes('bot.')) return 'hosheton_bot';
    if (url.includes('3377') || url.includes('chat.')) return 'hosheton_chat';
    if (url.includes('3027') || url.includes('blogger')) return 'hosheton_blogger';
    return appName;
}

export function isNavItemVisible(
    item: Pick<NavItem, 'allowedApps' | 'allowedVariants'>,
    appName: string,
    appVariant: string,
    baseUrl = '',
): boolean {
    const variant = resolveAppVariant(appVariant, baseUrl, appName);
    const appsOk =
        !item.allowedApps?.length || item.allowedApps.includes(appName);
    const variantsOk =
        !item.allowedVariants?.length || item.allowedVariants.includes(variant);
    return appsOk && variantsOk;
}

/**
 * فیلتر آیتم‌های منو بر اساس اپ/واریانت.
 * اگر همه زیرمنی‌های یک آیتم فیلتر شوند، خود آیتم هم حذف می‌شود
 * (والدی که فقط زیرمنو دارد نباید به شکل لینک تنها باقی بماند).
 */
export function filterNavItemsByApp<T extends NavItem>(
    items: T[],
    appName: string,
    appVariant: string,
    baseUrl = '',
): T[] {
    return items
        .filter((item) => isNavItemVisible(item, appName, appVariant, baseUrl))
        .map((item) => {
            if (!item.subItems?.length) return item;
            const subItems = item.subItems.filter((sub) =>
                isNavItemVisible(sub, appName, appVariant, baseUrl),
            );
            return subItems.length ? {...item, subItems} : null;
        })
        .filter((item): item is T => item !== null);
}
