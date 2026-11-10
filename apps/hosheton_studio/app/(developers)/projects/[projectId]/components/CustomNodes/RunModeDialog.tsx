'use client';

import { useEffect, useMemo, useState } from 'react';
import {useTranslation} from 'react-i18next';
import { LuGitBranch, LuPlay } from 'react-icons/lu';
import { CostConfirmModal, type CostConfirmSummary } from '@/app/(developers)/components/CostConfirmModal/CostConfirmModal';
import { mediaApi } from '../../../lib/media-api';
import type { CostEstimatePayload, CostEstimateResult } from '../../../components/CostEstimatePanel';
import type { StudioChatMediaKind } from '../../../types/media-api';
import { useMediaStudio } from '../../../context/MediaStudioContext';

export type RunMode = 'isolated' | 'pipeline';

interface RunModeDialogProps {
    open: boolean;
    nodeId?: string;
    nodeLabel?: string;
    onSelect: (mode: RunMode) => void;
    onClose: () => void;
}

const NODE_KIND: Record<string, StudioChatMediaKind> = {
    textToImage: 'image',
    textToVideo: 'video',
    aiAvatar: 'video',
    musicSfx: 'audio',
};

function summarizePayload(payload: CostEstimatePayload): CostConfirmSummary {
    const metrics = (payload.runtimeMetrics || {}) as Record<string, unknown>;
    return {
        kind: NODE_KIND[String(payload.nodeType || '')] ?? 'image',
        modelLabel: payload.modelId,
        promptLength: payload.promptLength ?? 0,
        images: Number(metrics.inputImageCount) || 0,
        videos: Number(metrics.inputVideoCount) || 0,
        audios: Number(metrics.inputAudioCount) || 0,
        // «زاویه و نور»: هر نما یک خروجی
        ...(payload.unitCount && payload.unitCount > 1 ? { outputs: payload.unitCount } : {}),
    };
}

/** تأیید اجرای نود — همان پنجره رسید چت (CostConfirmModal) + انتخاب «کل زنجیره» */
export function RunModeDialog({ open, nodeId, nodeLabel, onSelect, onClose }: RunModeDialogProps) {
    const {t} = useTranslation('projects');
    const { getNodeCostPayload } = useMediaStudio();
    const [estimate, setEstimate] = useState<CostEstimateResult | null>(null);
    const [loadingCost, setLoadingCost] = useState(false);
    const [costError, setCostError] = useState<string | null>(null);

    // نودهای بدون مدل/قیمت (منطق، رندر و…) رسید ندارند
    const payload = useMemo(
        () => (open && nodeId ? getNodeCostPayload(nodeId) : null),
        [open, nodeId, getNodeCostPayload],
    );
    const billable = Boolean(payload?.modelId);

    useEffect(() => {
        setEstimate(null);
        setCostError(null);
        if (!payload?.modelId) {
            setLoadingCost(false);
            return;
        }

        // TODO: Add validation for connected inputs against model constraints
        // (similar to chat attachment validation). When implemented, use
        // human-readable units via formatBytes/formatBytesFa from
        // chat-attachment-validator.ts for any size/duration validation errors.

        let cancelled = false;
        setLoadingCost(true);

        mediaApi.estimateCost(payload)
            .then((data) => {
                if (!cancelled) setEstimate(data);
            })
            .catch(() => {
                if (!cancelled) setCostError(t('cost_unavailable'));
            })
            .finally(() => {
                if (!cancelled) setLoadingCost(false);
            });

        return () => {
            cancelled = true;
        };
    }, [payload, t]);

    return (
        <CostConfirmModal
            open={open}
            estimate={estimate}
            loading={loadingCost}
            error={costError}
            summary={payload ? summarizePayload(payload) : null}
            // اجرای workflow اول از بودجه پروژه کسر می‌شود (مثل چت پروژه)
            showWallet={false}
            noEstimate={!billable}
            icon={billable ? undefined : <LuPlay size={18} />}
            title={t('confirm_run')}
            subtitle={nodeLabel ? t('run_named', {label: nodeLabel}) : t('run_this_node')}
            confirmLabel={t('isolated_node')}
            confirmIcon={<LuPlay aria-hidden />}
            note={billable ? undefined : t('isolated_node_hint')}
            alternateAction={{
                label: t('full_chain'),
                hint: t('full_chain_hint'),
                icon: <LuGitBranch />,
                onClick: () => onSelect('pipeline'),
            }}
            onConfirm={() => onSelect('isolated')}
            onCancel={onClose}
        />
    );
}
