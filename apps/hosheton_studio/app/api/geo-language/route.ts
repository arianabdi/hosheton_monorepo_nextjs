import {NextRequest, NextResponse} from 'next/server';
import {countryFromRequestHeaders, resolveRequestLanguage} from '@/app/lib/i18n/geoLanguage';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

function clientIp(request: NextRequest): string | null {
    const forwarded = request.headers.get('x-forwarded-for');
    const raw =
        forwarded?.split(',')[0]?.trim() ||
        request.headers.get('cf-connecting-ip') ||
        request.headers.get('x-real-ip') ||
        request.headers.get('x-client-ip');
    if (!raw) return null;
    if (raw.startsWith('[')) {
        const end = raw.indexOf(']');
        return end > 0 ? raw.slice(1, end) : raw;
    }
    if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(raw)) {
        return raw.replace(/:\d+$/, '');
    }
    return raw;
}

function isPrivateIp(ip: string): boolean {
    const v4 = ip.startsWith('::ffff:') ? ip.slice(7) : ip;
    if (v4 === '127.0.0.1' || v4 === '0.0.0.0' || v4 === 'localhost' || ip === '::1') return true;
    if (v4.startsWith('10.') || v4.startsWith('192.168.') || v4.startsWith('169.254.')) return true;
    if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(v4)) return true;
    return false;
}

async function lookupCountryFromIp(ip: string | null): Promise<string | null> {
    if (!ip || isPrivateIp(ip)) return null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    try {
        const url = `https://ipwho.is/${encodeURIComponent(ip)}?fields=success,country_code`;
        const res = await fetch(url, {cache: 'no-store', signal: controller.signal});
        if (res.ok) {
            const data = (await res.json()) as {success?: boolean; country_code?: string};
            if (data?.success && data.country_code) return data.country_code;
        }
    } catch {
        // fall through to secondary lookup
    } finally {
        clearTimeout(timer);
    }

    const controller2 = new AbortController();
    const timer2 = setTimeout(() => controller2.abort(), 2500);
    try {
        const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/country_code/`, {
            cache: 'no-store',
            signal: controller2.signal,
        });
        if (!res.ok) return null;
        const text = (await res.text()).trim().toUpperCase();
        return /^[A-Z]{2}$/.test(text) ? text : null;
    } catch {
        return null;
    } finally {
        clearTimeout(timer2);
    }
}

export async function GET(request: NextRequest) {
    const headerCountry = countryFromRequestHeaders(request.headers);
    const country = headerCountry || (await lookupCountryFromIp(clientIp(request)));
    const language = resolveRequestLanguage({
        country,
        acceptLanguage: request.headers.get('accept-language'),
    });

    return NextResponse.json(
        {language, country: country || null},
        {headers: {'Cache-Control': 'private, max-age=300'}},
    );
}
