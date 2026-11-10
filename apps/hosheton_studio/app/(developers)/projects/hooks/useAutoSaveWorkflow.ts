'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Edge, Node } from '@xyflow/react';
import { getApiErrorMessage } from '../lib/api-client';
import { mediaApi } from '../lib/media-api';
import { serializeWorkflow, serializeWorkflowSignature } from '../lib/workflow-serializer';

export type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

const DEBOUNCE_MS = 700;

type PreparedWorkflow = { nodes: Node[]; edges: Edge[] };
type BeforeWorkflowSave = (
    nodes: Node[],
    edges: Edge[],
) => Promise<PreparedWorkflow | null> | PreparedWorkflow | null;

export function useAutoSaveWorkflow(
    projectId: string,
    projectTitle: string,
    beforeSave?: BeforeWorkflowSave,
) {
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
    const [saveError, setSaveError] = useState<string | null>(null);
    const isHydratingRef = useRef(true);
    const saveVersionRef = useRef(0);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const latestRef = useRef<{ nodes: Node[]; edges: Edge[]; signature: string }>({
        nodes: [],
        edges: [],
        signature: '',
    });
    const lastSavedSignatureRef = useRef('');
    const scheduledSignatureRef = useRef('');
    const inFlightSignatureRef = useRef('');
    const inFlightSinceRef = useRef(0);

    // A hanging save request must not block the pipeline forever: if it stays
    // in-flight past this budget, we treat it as stale so newer saves proceed.
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

    const finishHydration = useCallback(() => {
        isHydratingRef.current = false;
        setSaveStatus('idle');
    }, []);

    const flushSave = useCallback(async (nodes: Node[], edges: Edge[], knownSignature?: string) => {
        const prepared = beforeSave ? await beforeSave(nodes, edges) : { nodes, edges };
        if (!prepared) {
            setSaveStatus('idle');
            return;
        }
        const preparedChanged = prepared.nodes !== nodes || prepared.edges !== edges;
        const version = ++saveVersionRef.current;
        const payload = serializeWorkflow(prepared.nodes, prepared.edges);
        const signature = !preparedChanged && knownSignature
            ? knownSignature
            : JSON.stringify({
                title: projectTitle,
                ...serializeWorkflowSignature(prepared.nodes, prepared.edges),
            });
        inFlightSignatureRef.current = signature;
        inFlightSinceRef.current = Date.now();
        setSaveStatus('saving');
        setSaveError(null);

        try {
            await mediaApi.updateWorkflow(projectId, {
                title: projectTitle,
                ...payload,
            });

            if (version === saveVersionRef.current) {
                lastSavedSignatureRef.current = signature;
                setSaveStatus('saved');
            }
        } catch (err) {
            if (version === saveVersionRef.current) {
                setSaveStatus('error');
                setSaveError(getApiErrorMessage(err, 'Save failed'));
            }
        } finally {
            if (inFlightSignatureRef.current === signature) {
                inFlightSignatureRef.current = '';
                inFlightSinceRef.current = 0;
            }
        }
    }, [projectId, projectTitle, beforeSave]);

    const scheduleSave = useCallback((nodes: Node[], edges: Edge[]) => {
        clearStaleInFlight();
        const signature = JSON.stringify({ title: projectTitle, ...serializeWorkflowSignature(nodes, edges) });
        latestRef.current = { nodes, edges, signature };

        if (isHydratingRef.current) {
            lastSavedSignatureRef.current = signature;
            return;
        }

        if (
            signature === lastSavedSignatureRef.current
            && !inFlightSignatureRef.current
        ) {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = null;
            scheduledSignatureRef.current = '';
            setSaveStatus('saved');
            setSaveError(null);
            return;
        }

        if (signature === scheduledSignatureRef.current && debounceRef.current) return;

        // Invalidate an older in-flight response as soon as newer content exists.
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
                latestRef.current.nodes,
                latestRef.current.edges,
                latestRef.current.signature,
            );
        }, DEBOUNCE_MS);
    }, [flushSave, projectTitle, clearStaleInFlight]);

    const saveNow = useCallback(async () => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
            debounceRef.current = null;
        }
        scheduledSignatureRef.current = '';
        await flushSave(
            latestRef.current.nodes,
            latestRef.current.edges,
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
        isHydratingRef,
        finishHydration,
        scheduleSave,
        saveNow,
    };
}
