'use client';

/**
 * انیمیشن «افزودن به قالب»: یک کپی کوچک از تصویر از جای خودش جدا می‌شود، روی یک قوس کوچک می‌شود
 * و «بوم» داخل دکمه‌ی «قالب» می‌افتد؛ دکمه یک تپش کوتاه می‌زند.
 * فقط transform/opacity (روی compositor)؛ با reduced-motion فقط تپش دکمه.
 */
export function flyToTemplateTab(source: Element | null | undefined, imageSrc?: string) {
    if (typeof window === 'undefined') return;
    const target = [...document.querySelectorAll<HTMLElement>('[data-template-tab]')]
        .find((el) => el.getClientRects().length > 0);
    if (!target) return;
    const bump = () => target.animate(
        [{ scale: '1' }, { scale: '1.22' }, { scale: '0.94' }, { scale: '1' }],
        { duration: 380, easing: 'ease-out' },
    );
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const from = source?.getBoundingClientRect();
    if (reduce || !from || !from.width || !from.height) {
        bump();
        return;
    }
    const to = target.getBoundingClientRect();
    // کپی هم‌اندازه‌ی مبدأ، حداکثر ۱۶۰px تا تصاویر بزرگ صفحه را نپوشانند
    const size = Math.min(160, Math.max(from.width, from.height));
    const ratio = from.width / from.height;
    const width = ratio >= 1 ? size : size * ratio;
    const height = ratio >= 1 ? size / ratio : size;
    const startX = from.left + from.width / 2 - width / 2;
    const startY = from.top + from.height / 2 - height / 2;
    const dx = to.left + to.width / 2 - (startX + width / 2);
    const dy = to.top + to.height / 2 - (startY + height / 2);

    const ghost = document.createElement('div');
    ghost.setAttribute('aria-hidden', 'true');
    Object.assign(ghost.style, {
        position: 'fixed',
        left: `${startX}px`,
        top: `${startY}px`,
        width: `${width}px`,
        height: `${height}px`,
        zIndex: '20000',
        pointerEvents: 'none',
        borderRadius: '14px',
        background: imageSrc ? `center / cover no-repeat url("${imageSrc.replace(/"/g, '%22')}")` : 'var(--brand-color, #8b5cf6)',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.28)',
        willChange: 'transform, opacity',
    } satisfies Partial<CSSStyleDeclaration>);
    document.body.appendChild(ghost);

    // قوس: اول کمی بالا و کوچک، بعد شیرجه به مرکز دکمه
    const lift = Math.min(90, Math.abs(dy) * 0.35 + 40);
    const animation = ghost.animate([
        { transform: 'translate(0, 0) scale(1)', opacity: 1, borderRadius: '14px' },
        { transform: `translate(${dx * 0.35}px, ${dy * 0.35 - lift}px) scale(0.55)`, opacity: 1, offset: 0.4 },
        { transform: `translate(${dx}px, ${dy}px) scale(0.08)`, opacity: 0.85, borderRadius: '50%' },
    ], { duration: 620, easing: 'cubic-bezier(0.45, 0, 0.2, 1)' });
    let done = false;
    const finish = () => {
        if (done) return;
        done = true;
        ghost.remove();
        bump();
    };
    animation.onfinish = finish;
    animation.oncancel = () => ghost.remove();
    // تب پس‌زمینه انیمیشن را نگه می‌دارد — کپی هرگز روی صفحه نماند
    window.setTimeout(finish, 900);
}
