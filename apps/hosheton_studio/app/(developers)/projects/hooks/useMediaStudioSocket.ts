'use client';

import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { Node } from '@xyflow/react';
import { useAuthStore } from '@/app/zustand/store/authStore';
import type { StudioNodeData } from '../[projectId]/types/studio';
import type { MediaJobLog, MediaRun } from '../types/media-api';
import { sanitizeLegacyStorageUrl } from '../[projectId]/lib/file-url';
import { publishRunLifecycle } from '../lib/run-lifecycle-events';
import { mergeNodeCostHistory, sumNodeCostHistory } from '../lib/node-cost-history';
import { acquireStudioSocket } from '../lib/createStudioSocket';


interface NodeUpdatePayload {
    nodeId: string;
    status?: string;
    output?: {
        images?: string[];
        imageUrl?: string;
        videoUrl?: string;
        audioUrl?: string;
        videos?: string[];
        mediaThumbs?: Record<string, {
            thumbnailUrlLarge?: string;
            width?: number;
            height?: number;
            aspectRatio?: number;
        }>;
        durationSeconds?: number;
        videoDurationSeconds?: number;
        audioDurationSeconds?: number;
        width?: number;
        height?: number;
        count?: number;
        batchCount?: number;
        generatingIndex?: number;
        tileErrors?: (string | null)[];
        error?: string;
        cost?: { amount: number; currency: string; unit: string } | null;
        totalCost?: number;
        costHistory?: Array<{
            amount: number;
            currency?: string;
            unit?: string;
            runId?: string;
            at?: string;
            model?: string;
        }>;
    };
}

interface NodeProgressPayload {
    runId: string;
    nodeId: string;
    progress: number;
    status?: string;
}

interface RunEventPayload {
    runId?: string;
    projectId?: string;
    status?: string;
    error?: string;
    executionOrder?: string[];
    nodeResults?: Record<string, NodeUpdatePayload['output'] & { status?: string; error?: string }>;
    finalOutput?: Record<string, unknown>;
}

interface UseMediaStudioSocketOptions {
    onJobLog?: (log: MediaJobLog) => void;
    onNodeRunFinished?: (nodeId: string) => void;
    onRunFailed?: () => void;
    onProcessError?: (error: import('../types/process-errors').ProcessErrorItem) => void;
    onSocketConnectionChange?: (connected: boolean) => void;
    onProviderLog?: (payload: { action: 'created' | 'updated'; log: Record<string, unknown> }) => void;
}

function mapNodeStatus(status?: string): StudioNodeData['status'] | undefined {
    if (!status) return undefined;
    const normalized = status.toLowerCase();
    if (normalized === 'running') return 'running';
    if (normalized === 'error') return 'error';
    if (normalized === 'success') return 'success';
    if (normalized === 'idle') return 'idle';
    return undefined;
}

function resolveNodeStatus(
    mappedStatus: StudioNodeData['status'] | undefined,
    currentStatus: StudioNodeData['status'] | undefined,
    output?: NodeUpdatePayload['output'],
): StudioNodeData['status'] {
    const normalized = mappedStatus ?? currentStatus ?? 'idle';
    if (normalized === 'success' || normalized === 'error') return normalized;
    if (output?.error) return 'error';
    return normalized;
}

function isTerminalStatus(status?: StudioNodeData['status']): boolean {
    return status === 'success' || status === 'error';
}

function normalizeRunStatus(status?: string): MediaRun['status'] | undefined {
    if (
        status === 'PENDING'
        || status === 'RUNNING'
        || status === 'COMPLETED'
        || status === 'FAILED'
        || status === 'CANCELLED'
    ) {
        return status;
    }
    return undefined;
}

export function useMediaStudioSocket(
    projectId: string,
    setNodes: React.Dispatch<React.SetStateAction<Node[]>>,
    options?: UseMediaStudioSocketOptions,
) {
    const token = useAuthStore((s) => s.token);
    const { t } = useTranslation('projects');
    const optionsRef = useRef(options);
    const tRef = useRef(t);

    useEffect(() => {
        optionsRef.current = options;
    }, [options]);

    useEffect(() => {
        tRef.current = t;
    }, [t]);

    useEffect(() => {
        if (!projectId || !token) return;

        // Shared studio socket — chat, canvas, comments and the wallet listener
        // multiplex this single connection; room membership is ref-counted.
        const handle = acquireStudioSocket(token);
        if (!handle) return;
        const socket = handle.socket;

        handle.joinRoom('project', projectId);

        const notifyRunFinished = (nodeId: string, status?: StudioNodeData['status']) => {
            if (isTerminalStatus(status)) {
                optionsRef.current?.onNodeRunFinished?.(nodeId);
            }
        };

        const applyNodeUpdate = (payload: NodeUpdatePayload) => {
            if (!payload.nodeId) return;

            const output = payload.output;
            const mappedStatus = mapNodeStatus(payload.status);
            let resolvedStatus: StudioNodeData['status'] = 'idle';

            setNodes((nds) => nds.map((n) => {
                if (n.id !== payload.nodeId) return n;
                const data = n.data as StudioNodeData;
                const nextStatus = resolveNodeStatus(mappedStatus, data.status, output);
                resolvedStatus = nextStatus;

                const patch: Partial<StudioNodeData> = { status: nextStatus };

                if (output?.images) patch.images = output.images.map((u) => sanitizeLegacyStorageUrl(String(u)));
                if (output?.imageUrl) patch.imageUrl = sanitizeLegacyStorageUrl(output.imageUrl);
                if (output?.videoUrl) patch.videoUrl = sanitizeLegacyStorageUrl(output.videoUrl);
                if (output?.audioUrl) patch.audioUrl = output.audioUrl;
                if (output?.videos) patch.videos = output.videos.map((u) => sanitizeLegacyStorageUrl(String(u)));
                if (output?.mediaThumbs && typeof output.mediaThumbs === 'object') {
                    const remapped: NonNullable<StudioNodeData['mediaThumbs']> = { ...(data.mediaThumbs || {}) };
                    for (const [url, meta] of Object.entries(output.mediaThumbs)) {
                        const key = sanitizeLegacyStorageUrl(url);
                        if (!key || !meta) continue;
                        remapped[key] = {
                            ...remapped[key],
                            ...meta,
                            thumbnailUrlLarge: meta.thumbnailUrlLarge
                                ? sanitizeLegacyStorageUrl(meta.thumbnailUrlLarge)
                                : meta.thumbnailUrlLarge,
                        };
                    }
                    patch.mediaThumbs = remapped;
                }
                const duration = Number(
                    output?.durationSeconds
                    ?? output?.videoDurationSeconds
                    ?? output?.audioDurationSeconds,
                );
                const width = Number(output?.width);
                const height = Number(output?.height);
                if (Number.isFinite(duration) && duration > 0) {
                    patch.mediaMetadata = {
                        ...(data.mediaMetadata || {}),
                        durationSeconds: duration,
                    };
                    if (output?.videoUrl) patch.videoDurationSeconds = duration;
                    if (output?.audioUrl) patch.audioDurationSeconds = duration;
                }
                if ((Number.isFinite(width) && width > 0) || (Number.isFinite(height) && height > 0)) {
                    patch.mediaMetadata = {
                        ...(patch.mediaMetadata || data.mediaMetadata || {}),
                        ...(Number.isFinite(width) && width > 0 ? { width } : {}),
                        ...(Number.isFinite(height) && height > 0 ? { height } : {}),
                    };
                }
                if (output?.images || output?.imageUrl || output?.videoUrl || output?.audioUrl) {
                    const nextMedia = {
                        images: output.images?.map((u) => sanitizeLegacyStorageUrl(String(u))).join('\u0000') ?? '',
                        imageUrl: output.imageUrl ? sanitizeLegacyStorageUrl(output.imageUrl) : '',
                        videoUrl: output.videoUrl ? sanitizeLegacyStorageUrl(output.videoUrl) : '',
                        audioUrl: output.audioUrl ? String(output.audioUrl) : '',
                    };
                    const currentMedia = {
                        images: Array.isArray(data.images) ? data.images.join('\u0000') : '',
                        imageUrl: data.imageUrl ?? '',
                        videoUrl: data.videoUrl ?? '',
                        audioUrl: data.audioUrl ?? '',
                    };
                    // Only bust the preview cache when new media actually arrived, so
                    // repeated status/progress ticks don't mutate node data every time.
                    if (
                        nextMedia.images !== currentMedia.images
                        || nextMedia.imageUrl !== currentMedia.imageUrl
                        || nextMedia.videoUrl !== currentMedia.videoUrl
                        || nextMedia.audioUrl !== currentMedia.audioUrl
                    ) {
                        patch.previewCacheKey = Date.now();
                    }
                }
                if (typeof output?.batchCount === 'number') patch.batchCount = output.batchCount;
                if (typeof output?.generatingIndex === 'number') patch.generatingIndex = output.generatingIndex;
                if (output?.tileErrors) patch.tileErrors = output.tileErrors;
                if (output?.cost !== undefined) patch.cost = output.cost;
                const nextHistory = mergeNodeCostHistory(data.costHistory, output?.costHistory);
                if (nextHistory.length) {
                    patch.costHistory = nextHistory;
                    patch.totalCost = typeof output?.totalCost === 'number' && output.totalCost > sumNodeCostHistory(nextHistory)
                        ? output.totalCost
                        : sumNodeCostHistory(nextHistory);
                } else if (typeof output?.totalCost === 'number') {
                    patch.totalCost = output.totalCost;
                }

                if (output?.error || nextStatus === 'error') {
                    patch.runError = output?.error || data.runError || tRef.current('node_failed');
                    patch.progress = undefined;
                } else if (nextStatus === 'success') {
                    patch.runError = undefined;
                    patch.progress = 100;
                }

                return { ...n, data: { ...data, ...patch } };
            }));

            notifyRunFinished(payload.nodeId, resolvedStatus);
        };

        const applyNodeProgress = (payload: NodeProgressPayload) => {
            if (!payload.nodeId) return;
            setNodes((nds) => nds.map((n) => {
                if (n.id !== payload.nodeId) return n;
                const data = n.data as StudioNodeData;
                return {
                    ...n,
                    data: {
                        ...data,
                        status: data.status === 'success' || data.status === 'error' ? data.status : 'running',
                        progress: payload.progress,
                    },
                };
            }));
        };

        const applyRunFailed = (payload: RunEventPayload) => {
            if (payload.status !== 'FAILED') return;
            const message = payload.error || tRef.current('pipeline_failed');
            const finishedIds: string[] = [];
            setNodes((nds) => nds.map((n) => {
                const data = n.data as StudioNodeData;
                if (data.status !== 'running') return n;
                finishedIds.push(n.id);
                return {
                    ...n,
                    data: {
                        ...data,
                        status: 'error',
                        runError: message,
                        progress: undefined,
                    },
                };
            }));
            finishedIds.forEach((id) => optionsRef.current?.onNodeRunFinished?.(id));
            optionsRef.current?.onRunFailed?.();
        };

        const handleConnect = () => optionsRef.current?.onSocketConnectionChange?.(true);
        const handleDisconnect = () => optionsRef.current?.onSocketConnectionChange?.(false);

        const handleRunStatus = (payload: RunEventPayload) => {
            const status = normalizeRunStatus(payload.status);
            if (status && payload.runId) {
                publishRunLifecycle({
                    projectId: payload.projectId || projectId,
                    runId: payload.runId,
                    status,
                    errorMessage: payload.error,
                    executionOrder: payload.executionOrder,
                    nodeResults: payload.nodeResults,
                    finalOutput: payload.finalOutput,
                });
            }
            applyRunFailed(payload);
        };
        const handleJobLog = (payload: MediaJobLog) => {
            optionsRef.current?.onJobLog?.(payload);

            if (payload.level === 'error') {
                const message = payload.errorDetail?.message || payload.message;
                if (payload.nodeId) {
                    setNodes((nds) => nds.map((n) => {
                        if (n.id !== payload.nodeId) return n;
                        const data = n.data as StudioNodeData;
                        return {
                            ...n,
                            data: {
                                ...data,
                                status: 'error',
                                runError: message,
                                runErrorStage: payload.stage,
                                progress: undefined,
                            },
                        };
                    }));
                    notifyRunFinished(payload.nodeId, 'error');
                }
                optionsRef.current?.onProcessError?.({
                    id: payload._id || `${payload.runId}-${payload.nodeId || 'run'}-${payload.createdAt || Date.now()}`,
                    nodeId: payload.nodeId,
                    nodeType: payload.nodeType,
                    runId: payload.runId,
                    message: '',
                    error: message,
                    timestamp: payload.createdAt || new Date().toISOString(),
                });
            }
        };
        const handleProviderLog = (payload: { action: 'created' | 'updated'; log: Record<string, unknown> }) => {
            optionsRef.current?.onProviderLog?.(payload);
        };

        const handleRunComplete = (payload: RunEventPayload) => {
            const runStatus = normalizeRunStatus(payload.status);
            if (runStatus && payload.runId) {
                publishRunLifecycle({
                    projectId: payload.projectId || projectId,
                    runId: payload.runId,
                    status: runStatus,
                    errorMessage: payload.error,
                    executionOrder: payload.executionOrder,
                    nodeResults: payload.nodeResults,
                    finalOutput: payload.finalOutput,
                });
            }

            if (payload.status === 'FAILED') {
                optionsRef.current?.onRunFailed?.();
                if (payload.error) {
                    optionsRef.current?.onProcessError?.({
                        id: `run-failed-${payload.runId || Date.now()}`,
                        runId: payload.runId,
                        message: '',
                        error: payload.error,
                        timestamp: new Date().toISOString(),
                    });
                }
            }

            if (!payload.nodeResults) return;
            for (const [nodeId, output] of Object.entries(payload.nodeResults)) {
                const raw = String(output?.status || '').toLowerCase();
                const status: StudioNodeData['status'] | undefined =
                    raw === 'error' || output?.error
                        ? 'error'
                        : raw === 'success'
                            ? 'success'
                            : raw === 'running'
                                ? 'running'
                                : payload.status === 'FAILED'
                                    ? 'error'
                                    : undefined;
                if (status) {
                    applyNodeUpdate({ nodeId, output, status });
                }
            }
        };

        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);
        socket.on('node:update', applyNodeUpdate);
        socket.on('node:progress', applyNodeProgress);
        socket.on('run:status', handleRunStatus);
        socket.on('job:log', handleJobLog);
        socket.on('developer:provider-log', handleProviderLog);
        socket.on('run:complete', handleRunComplete);

        return () => {
            // The socket outlives this canvas (shared + ref-counted) — without
            // off() every project switch / remount stacks another set of
            // handlers and replays the same events into stale state.
            socket.off('connect', handleConnect);
            socket.off('disconnect', handleDisconnect);
            socket.off('node:update', applyNodeUpdate);
            socket.off('node:progress', applyNodeProgress);
            socket.off('run:status', handleRunStatus);
            socket.off('job:log', handleJobLog);
            socket.off('developer:provider-log', handleProviderLog);
            socket.off('run:complete', handleRunComplete);
            optionsRef.current?.onSocketConnectionChange?.(false);
            handle.leaveRoom('project', projectId);
            handle.release();
        };
    }, [projectId, token, setNodes]);
}
