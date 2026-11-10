/**
 * ResizeObserver که callback را در فریم بعد (requestAnimationFrame) و یک‌بار برای چند تغییر پشت‌سرهم اجرا می‌کند.
 *
 * اگر callback خودش اندازهٔ چیزی را که observe شده عوض کند (style، فونت، padding، CSS var)، مرورگر در همان
 * فریم دوباره اعلان می‌دهد و خطای «ResizeObserver loop completed with undelivered notifications» می‌سازد.
 * با تعویق به فریم بعد این حلقه شکسته می‌شود. برای callback هایی که فقط setState می‌کنند لازم نیست.
 *
 *   useLayoutEffect(() => observeResize(dock, () => scroll.style.setProperty('--h', `${dock.offsetHeight}px`)), []);
 */
export function observeResize(targets: Element | null | undefined | Array<Element | null | undefined>, callback: () => void): () => void {
    const elements = (Array.isArray(targets) ? targets : [targets]).filter((el): el is Element => Boolean(el));
    if (!elements.length || typeof ResizeObserver === 'undefined') return () => undefined;

    let frame = 0;
    const observer = new ResizeObserver(() => {
        if (frame) return;
        frame = requestAnimationFrame(() => {
            frame = 0;
            callback();
        });
    });
    elements.forEach((el) => observer.observe(el));
    return () => {
        if (frame) cancelAnimationFrame(frame);
        observer.disconnect();
    };
}
