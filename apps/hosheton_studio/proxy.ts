import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';
import {isAppLanguage} from './app/lib/i18n/config';
import {countryFromRequestHeaders, resolveRequestLanguage} from './app/lib/i18n/geoLanguage';
import {CHOSEN_LANG_COOKIE, GEO_LANG_COOKIE, LANG_COOKIE_MAX_AGE} from './app/lib/i18n/languageCookies';
import {etrSourceMapGuard} from '@my-workspace/utils/src/etrSourceMapGuard';

export function proxy(request: NextRequest) {
    // source map ها فقط برای سرور پایش خطا (با توکن پروژه) — Stack Trace مرورگر به فایل/خط اصلی برمی‌گردد
    const sourceMap = etrSourceMapGuard(request);
    if (sourceMap) return sourceMap;
    if (request.nextUrl.pathname.endsWith('.map')) return NextResponse.next();

    const response = NextResponse.next();

    // کد دعوت (?ref= یا ?referral=) — ۳۰ روز کوکی می‌ماند تا با جابه‌جایی بین همه
    // صفحه‌ها حفظ شود و بعد از ثبت‌نام به دعوت‌کننده متصل گردد
    const refCode = (request.nextUrl.searchParams.get('ref') || request.nextUrl.searchParams.get('referral') || '')
        .trim()
        .toUpperCase();
    if (refCode && /^[A-Z0-9_-]{3,32}$/.test(refCode)) {
        response.cookies.set('ref_code', refCode, {
            path: '/',
            maxAge: 30 * 24 * 60 * 60,
            sameSite: 'lax',
        });
    }

    const chosen = request.cookies.get(CHOSEN_LANG_COOKIE)?.value;
    if (chosen && isAppLanguage(chosen)) {
        return response;
    }

    const country = countryFromRequestHeaders(request.headers);
    const language = resolveRequestLanguage({
        country,
        acceptLanguage: request.headers.get('accept-language'),
    });

    response.cookies.set(GEO_LANG_COOKIE, language, {
        path: '/',
        maxAge: LANG_COOKIE_MAX_AGE,
        sameSite: 'lax',
    });

    return response;
}

export const config = {
    // فایل‌های SEO (sitemap/robots/کلید IndexNow) کوکی نمی‌گیرند تا CDN بتواند کششان کند
    matcher: [
        // = ETR_SOURCEMAP_MATCHER (matcher باید literal باشد — Next آن را ایستا تحلیل می‌کند)
        '/_next/static/:path*.map',
        '/((?!_next/static|_next/image|favicon.ico|seo-files/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|xml|txt)$).*)',
    ],
};
