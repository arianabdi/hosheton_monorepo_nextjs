import VideoEditorPageClient from '@/app/(developers)/projects/[projectId]/editor/VideoEditorPageClient';

type EditorPageProps = {
    params: Promise<{ projectId: string }>;
};

export default async function EditorPage({ params }: EditorPageProps) {
    const { projectId } = await params;

    return (
        <main style={{ height: '100%', minHeight: 0 }}>
            <VideoEditorPageClient projectId={projectId} />
        </main>
    );
}
