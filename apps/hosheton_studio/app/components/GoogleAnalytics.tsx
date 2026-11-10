import Script from 'next/script';

/** شناسه Google Analytics (GA4) استودیو هوشتون */
export const GA_MEASUREMENT_ID = 'G-NBMQBH0EPM';

/**
 * تگ Google Analytics (gtag.js) — یک بار در layout ریشه رندر می‌شود و روی همه صفحات فعال است.
 * جابه‌جایی بین صفحات (بدون رفرش) را خود GA4 با Enhanced measurement ثبت می‌کند.
 */
export default function GoogleAnalytics() {
    return (
        <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} strategy="afterInteractive" />
            <Script id="google-analytics" strategy="afterInteractive">
                {`
                    window.dataLayer = window.dataLayer || [];
                    function gtag(){dataLayer.push(arguments);}
                    gtag('js', new Date());
                    gtag('config', '${GA_MEASUREMENT_ID}');
                `}
            </Script>
        </>
    );
}
