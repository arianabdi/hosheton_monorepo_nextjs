import { redirect } from 'next/navigation';

type HomePageProps = {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** خانه = Explore؛ query (مثل ?ref= لینک دعوت) در ریدایرکت حفظ می‌شود */
export default async function HomePage({ searchParams }: HomePageProps) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(await searchParams)) {
        for (const item of Array.isArray(value) ? value : [value]) {
            if (item !== undefined) query.append(key, item);
        }
    }
    const qs = query.toString();
    redirect(qs ? `/explore?${qs}` : '/explore');
}
