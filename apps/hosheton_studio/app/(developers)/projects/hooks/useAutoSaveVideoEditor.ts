'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '../lib/api-client';
import { mediaApi } from '../lib/media-api';
import type { Track } from '../[projectId]/newVideoEditor/types/timeline';
import {
    DEFAULT_VIDEO_EDITOR_CANVAS,
    serializeVideoEditor,
    serializeVideoEditorSignature,
    type VideoEditorCanvasSettings,
} from '../lib/video-editor-serializer';

export type VideoEditorSaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

const DEBOUNCE_MS = 700;

export function useAutoSaveVideoEditor(projectId: string) {
    const { t } = useTranslation('projects');
    const [saveStatus, setSaveStatus] = useState<VideoEditorSaveStatus>('idle');
    const [saveError, setSaveError] = useState<string | null>(null);
    const isHydratingRef = useRef(true);
    const saveVersionRef = useRef(0);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const latestRef = useRef<{
        tracks: Track[];
        canvas: VideoEditorCanvasSettings;
        signature: string;
    }>({
        tracks: [],
        canvas: DEFAULT_VIDEO_EDITOR_CANVAS,
        signature: '',
    });
    const lastSavedSignatureRef = useRef('');
    const scheduledSignatureRef = useRef('');
    const inFlightSignatureRef = useRef('');
    const inFlightSinceRef = useRef(0);

    const SAVE_IN_FLIGHT_TIMEOUT_MS = 30_000;

    const clearStaleInFlight = useCallback(() => {
        if (
            inFlightSignatureRef.current
            && inFlightSinceRef.current
            && Date.now() - inFlightSinceRef.current > SAVE_IN_FLIGHT_TIMEOUT_MS
        ) {
            inFlightSignatureRef.current = '';
            inFlightSinceRef.current = 0;
        }
    }, []);

    const finishHydration = useCallback((
        hydratedTracks?: Track[],
        canvas: VideoEditorCanvasSettings = DEFAULT_VIDEO_EDITOR_CANVAS,
    ) => {
        if (hydratedTracks) {
            const signature = JSON.stringify(serializeVideoEditorSignature(hydratedTracks, canvas));
            latestRef.current = { tracks: hydratedTracks, canvas, signature };
            lastSavedSignatureRef.current = signature;
        }
        isHydratingRef.current = false;
        setSaveStatus('idle');
    }, []);

    const flushSave = useCallback(async (
        tracks: Track[],
        canvas: VideoEditorCanvasSettings,
        knownSignature?: string,
    ) => {
        const version = ++saveVersionRef.current;
        const payload = serializeVideoEditor(tracks, canvas);
        const signature = knownSignature || JSON.stringify(serializeVideoEditorSignature(tracks, canvas));
        inFlightSignatureRef.current = signature;
        inFlightSinceRef.current = Date.now();
        setSaveStatus('saving');
        setSaveError(null);

        try {
            await mediaApi.updateVideoEditor(projectId, { videoEditor: payload });

            if (version === saveVersionRef.current) {
                lastSavedSignatureRef.current = signature;
                setSaveStatus('saved');
            }
        } catch (err) {
            if (version === saveVersionRef.current) {
                setSaveStatus('error');
                setSaveError(getApiErrorMessage(err, t('save_timeline_error')));
            }
        } finally {
            if (inFlightSignatureRef.current === signature) {
                inFlightSignatureRef.current = '';
                inFlightSinceRef.current = 0;
            }
        }
    }, [projectId, t]);

    const scheduleSave = useCallback((
        tracks: Track[],
        canvas: VideoEditorCanvasSettings = DEFAULT_VIDEO_EDITOR_CANVAS,
    ) => {
        clearStaleInFlight();
        const signature = JSON.stringify(serializeVideoEditorSignature(tracks, canvas));
        latestRef.current = { tracks, canvas, signature };

        if (isHydratingRef.current) {
            // Record only the mount baseline. Edits made while the project GET is
            // still in flight must remain dirty and be flushed after hydration.
            if (!lastSavedSignatureRef.current) {
                lastSavedSignatureRef.current = signature;
            }
            return;
        }

        if (signature === lastSavedSignatureRef.current && !inFlightSignatureRef.current) {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = null;
            scheduledSignatureRef.current = '';
            setSaveStatus('saved');
            setSaveError(null);
            return;
        }

        if (signature === scheduledSignatureRef.current && debounceRef.current) return;

        saveVersionRef.current += 1;
        setSaveStatus('pending');
        setSaveError(null);
        scheduledSignatureRef.current = signature;

        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(() => {
            debounceRef.current = null;
            scheduledSignatureRef.current = '';
            flushSave(
                latestRef.current.tracks,
                latestRef.current.canvas,
                latestRef.current.signature,
            );
        }, DEBOUNCE_MS);
    }, [flushSave, clearStaleInFlight]);

    const saveNow = useCallback(async () => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
            debounceRef.current = null;
        }
        scheduledSignatureRef.current = '';
        await flushSave(
            latestRef.current.tracks,
            latestRef.current.canvas,
            latestRef.current.signature,
        );
    }, [flushSave]);

    useEffect(() => {
        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, []);

    return {
        saveStatus,
        saveError,
        finishHydration,
        scheduleSave,
        saveNow,
    };
}
