import { permanentRedirect } from 'next/navigation';

/** Old address of the data tab — it is the module's first (root) tab now. */
export default async function LegacyDataPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(await searchParams)) {
        if (typeof v === 'string') params.set(k, v);
    }
    const qs = params.toString();
    permanentRedirect(qs ? `/settings/database?${qs}` : '/settings/database');
}
