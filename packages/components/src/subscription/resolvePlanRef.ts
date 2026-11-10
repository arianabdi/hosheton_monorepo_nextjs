// Mongo populate می‌تواند planId/planPriceId را آبجکت یا رشته برگرداند؛
// این هلپر فقط آبجکتِ populate شده را برمی‌گرداند تا از فیلدهایش (name، price و...) استفاده شود.
export function resolvePlanRef<T extends object>(ref: T | string | null | undefined): T | undefined {
    if (!ref || typeof ref === 'string') return undefined;
    return ref;
}
