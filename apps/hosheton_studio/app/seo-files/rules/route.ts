import { fetchUpstream, getSiteUrl } from '../seo-proxy';

export const dynamic = 'force-dynamic';

/**
 * حداقل قوانین امن وقتی robots.txt توسط ماژول مدیریت نمی‌شود یا API در دسترس نیست —
 * robots.txt هرگز نباید 5xx بدهد (گوگل آن را «همه‌چیز ممنوع» موقت تعبیر می‌کند).
 */
const FALLBACK_DISALLOW = [
    '/api/',
    '/login',
    '/register',
    '/otp',
    '/sms-code',
    '/complete-profile',
    '/home',
    '/starter',
    '/chat',
    '/projects',
    '/templates',
    '/assets',
    '/avatars',
    '/messages',
    '/notifications',
    '/wallet',
    '/usage',
    '/payment',
    '/support',
    '/saved',
    '/workspaces',
    '/settings',
];

/** /robots.txt — از تنظیمات ماژول سایت‌مپ (Disallow + خط Sitemap) */
export async function GET(): Promise<Response> {
    const upstream = await fetchUpstream('/robots.txt');
    if (upstream.kind === 'ok') {
        return new Response(await upstream.res.text(), {
            status: 200,
            headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=1800, s-maxage=1800' },
        });
    }

    const body = [
        'User-agent: *',
        ...FALLBACK_DISALLOW.map((path) => `Disallow: ${path}`),
        '',
        `Sitemap: ${getSiteUrl()}/sitemap.xml`,
        '',
    ].join('\n');
    return new Response(body, {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=600' },
    });
}
