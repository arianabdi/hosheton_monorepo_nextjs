import { fetchUpstream, notFound, unavailable, xmlResponse } from '../../seo-proxy';

export const dynamic = 'force-dynamic';

const FILE_NAME = /^[a-z0-9][a-z0-9-]*-\d+\.xml$/;

/** /sitemaps/{group}-{n}.xml — فایل‌های گروه‌ها؛ ایندکس دقیقاً به همین مسیرها اشاره می‌کند */
export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }): Promise<Response> {
    const { name } = await params;
    if (!FILE_NAME.test(name || '')) return notFound();
    const upstream = await fetchUpstream(`/files/${encodeURIComponent(name)}`);
    if (upstream.kind === 'not-found') return notFound();
    if (upstream.kind === 'unavailable') return unavailable();
    return xmlResponse(await upstream.res.text(), upstream.res.headers.get('last-modified'));
}
