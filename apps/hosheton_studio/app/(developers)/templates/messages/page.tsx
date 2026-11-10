import { redirect } from 'next/navigation';

export default async function TemplatesMessagesRedirect({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const params = await searchParams;
    const qs = new URLSearchParams();
    const conversation = params.conversation;
    const to = params.to;
    if (typeof conversation === 'string') qs.set('conversation', conversation);
    if (typeof to === 'string') qs.set('to', to);
    const suffix = qs.toString();
    redirect(suffix ? `/messages?${suffix}` : '/messages');
}
