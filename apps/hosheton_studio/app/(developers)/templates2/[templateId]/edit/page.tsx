import { redirect } from 'next/navigation';

export default async function Templates2EditRedirect({
    params,
}: {
    params: Promise<{ templateId: string }>;
}) {
    const { templateId } = await params;
    redirect(`/templates/${templateId}/edit`);
}
