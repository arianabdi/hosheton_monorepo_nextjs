import { fetchUpstream, notFound } from '../../seo-proxy';

export const dynamic = 'force-dynamic';

/**
 * /{key}.txt — فایل تایید مالکیت IndexNow؛ متن فایل باید دقیقاً خود کلید باشد.
 * هر .txt دیگری در ریشه (که کلید فعال نیست) 404 می‌گیرد.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ key: string }> }): Promise<Response> {
    const { key } = await params;
    const upstream = await fetchUpstream('/indexnow-key');
    if (upstream.kind !== 'ok') return notFound();
    try {
        const json = (await upstream.res.json()) as { data?: { key?: string } };
        if (!json?.data?.key || json.data.key !== key) return notFound();
    } catch {
        return notFound();
    }
    return new Response(key, {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
    });
}
