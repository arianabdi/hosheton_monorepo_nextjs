import { redirect } from 'next/navigation';

/** مسیر قدیمی — به /subscription/plans منتقل شد */
export default async function LegacySubscriptionRedirect({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    redirect(`/subscription/plans/${id}`);
}
