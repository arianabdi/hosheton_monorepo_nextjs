import { createApiClient, unwrapApiData } from '@/app/(developers)/projects/lib/api-client';
import type { AgentChatMessage, AgentCommandPlanItem, AgentEditorSnapshot } from './editor-agent-commands';
import { EDITOR_DESIGN_TOKENS, type EditorDesignTokens } from './agent-design-tokens';
import { AGENT_GUIDE_MD } from './agent-guide';

export type EditorAgentResponse = {
    message: string;
    commands: AgentCommandPlanItem[];
    modelName?: string;
    chargedUsd?: number;
};

export type CaptionSegment = {
    start: number;
    end: number;
    text: string;
};

export type VideoTranscribeResponse = {
    text: string;
    language?: string;
    segments: CaptionSegment[];
    durationSec?: number;
    modelName?: string;
    chargedUsd?: number;
};

export type AgentMediaRef = {
    url: string;
    label?: string;
    type?: string;
};

/** One-shot editor-agent turn: conversation + editor snapshot → message + plan. */
export async function runEditorAgent(
    projectId: string,
    payload: {
        modelId: string;
        providerId?: string;
        messages: AgentChatMessage[];
        editor: AgentEditorSnapshot;
        /** Gallery files mentioned in the turn — the agent may addMedia them. */
        media?: AgentMediaRef[];
        /** Unified design tokens injected into the agent system prompt. */
        design?: EditorDesignTokens;
        /** AGENT_GUIDE markdown injected into the agent system prompt. */
        guide?: string;
    },
): Promise<EditorAgentResponse> {
    const res = await createApiClient().post(
        `/api/studio/media/projects/${projectId}/video-editor/agent`,
        {
            ...payload,
            design: payload.design ?? EDITOR_DESIGN_TOKENS,
            guide: payload.guide ?? AGENT_GUIDE_MD,
        },
    );
    return unwrapApiData<EditorAgentResponse>(res);
}

/** Speech-to-text on a project media file, returning timed caption segments. */
export async function runVideoEditorTranscribe(
    projectId: string,
    payload: {
        mediaUrl: string;
        modelId?: string;
        language?: string;
    },
): Promise<VideoTranscribeResponse> {
    const res = await createApiClient().post(
        `/api/studio/media/projects/${projectId}/video-editor/transcribe`,
        payload,
    );
    return unwrapApiData<VideoTranscribeResponse>(res);
}

// ─── Rollback snapshots (durable restore points per chat turn) ───────────────

export type VideoEditorSnapshotState = {
    version?: number;
    tracks: unknown[];
    canvas?: unknown;
};

export type VideoEditorSnapshot = {
    _id: string;
    projectId: string;
    userId: string;
    label: string;
    clipCount: number;
    state?: VideoEditorSnapshotState;
    createdAt?: string;
};

const SNAPSHOT_BASE = '/api/studio/media';

/** Persist a restore point right BEFORE applying an agent plan. */
export async function createVideoEditorSnapshot(
    projectId: string,
    payload: { label?: string; state: VideoEditorSnapshotState },
): Promise<VideoEditorSnapshot> {
    const res = await createApiClient().post(
        `${SNAPSHOT_BASE}/projects/${projectId}/video-editor/snapshots`,
        payload,
    );
    return unwrapApiData<VideoEditorSnapshot>(res);
}

export async function listVideoEditorSnapshots(projectId: string): Promise<{ snapshots: VideoEditorSnapshot[] }> {
    const res = await createApiClient().get(
        `${SNAPSHOT_BASE}/projects/${projectId}/video-editor/snapshots`,
    );
    return unwrapApiData<{ snapshots: VideoEditorSnapshot[] }>(res);
}

export async function getVideoEditorSnapshot(projectId: string, snapshotId: string): Promise<VideoEditorSnapshot> {
    const res = await createApiClient().get(
        `${SNAPSHOT_BASE}/projects/${projectId}/video-editor/snapshots/${snapshotId}`,
    );
    return unwrapApiData<VideoEditorSnapshot>(res);
}

export async function deleteVideoEditorSnapshot(projectId: string, snapshotId: string): Promise<{ success: boolean }> {
    const res = await createApiClient().delete(
        `${SNAPSHOT_BASE}/projects/${projectId}/video-editor/snapshots/${snapshotId}`,
    );
    return unwrapApiData<{ success: boolean }>(res);
}
