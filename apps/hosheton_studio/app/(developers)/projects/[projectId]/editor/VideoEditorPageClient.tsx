'use client';

import { ReactFlowProvider } from '@xyflow/react';
import { MediaStudioProvider } from '@/app/(developers)/projects/context/MediaStudioContext';
import VideoEditor from '@/app/(developers)/projects/[projectId]/newVideoEditor/components/VideoEditor';

type VideoEditorPageClientProps = {
    projectId: string;
};

export default function VideoEditorPageClient({ projectId }: VideoEditorPageClientProps) {
    // ReactFlowProvider is required even outside the workflow canvas: the
    // shared settings panel calls useEdges/useNodesData, which throw without it.
    return (
        <ReactFlowProvider>
            <MediaStudioProvider projectId={projectId}>
                <VideoEditor projectId={projectId} />
            </MediaStudioProvider>
        </ReactFlowProvider>
    );
}
