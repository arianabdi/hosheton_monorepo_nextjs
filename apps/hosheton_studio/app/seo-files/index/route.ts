import { fetchUpstream, notFound, unavailable, xmlResponse } from '../seo-proxy';

export const dynamic = 'force-dynamic';

/** /sitemap.xml — فایل ایندکس سایت‌مپ (لینک همه فایل‌های گروه‌ها روی همین دامنه) */
export async function GET(): Promise<Response> {
    const upstream = await fetchUpstream('/index.xml');
    if (upstream.kind === 'not-found') return notFound();
    if (upstream.kind === 'unavailable') return unavailable();
    return xmlResponse(await upstream.res.text());
}
