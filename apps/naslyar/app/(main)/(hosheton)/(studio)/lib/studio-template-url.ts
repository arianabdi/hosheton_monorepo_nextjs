export function getHoshetonStudioTemplateViewUrl(templateId: string): string {
    const base = process.env.NEXT_PUBLIC_HOSHETON_STUDIO_URL || 'http://localhost:3009';
    return `${base.replace(/\/$/, '')}/templates/${templateId}/view`;
}

/** Base URL of the public studio marketplace (explore) site. */
export function getHoshetonStudioPublicUrl(): string {
    return (process.env.NEXT_PUBLIC_HOSHETON_STUDIO_URL || 'http://localhost:3009').replace(/\/$/, '');
}
