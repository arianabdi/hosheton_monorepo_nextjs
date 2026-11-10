'use client';

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import styles from '../../TelegramBots.module.scss';
import type { TelegramBotNodeData, TelegramBotNodeType } from '../../telegram-bots.types';

export interface FlowNodeData extends TelegramBotNodeData {
    nodeType: TelegramBotNodeType;
    [key: string]: unknown;
}

const NODE_GROUP_CLASS: Partial<Record<TelegramBotNodeType, string>> = {
    start: styles.nodeStart,
    sendMessage: styles.nodeMessage,
    sendPhoto: styles.nodeMessage,
    sendDocument: styles.nodeMessage,
    inlineKeyboard: styles.nodeMessage,
    replyKeyboard: styles.nodeMessage,
    condition: styles.nodeLogic,
    switch: styles.nodeLogic,
    waitInput: styles.nodeInput,
    httpRequest: styles.nodeAction,
};

export function nodeHandles(type: TelegramBotNodeType, data: TelegramBotNodeData): string[] {
    switch (type) {
        case 'condition':
            return ['true', 'false'];
        case 'switch':
            return [...(data.cases ?? []).map((c) => c.id), 'default'];
        case 'inlineKeyboard':
            return (data.buttons ?? []).map((_, i) => `btn-${i}`);
        default:
            return ['next'];
    }
}

export default function FlowNode({ data, selected }: { data: FlowNodeData; selected?: boolean }) {
    const { nodeType, ...nodeData } = data;
    const handles = nodeHandles(nodeType, nodeData);

    const summary =
        nodeData.text || nodeData.inputPrompt || nodeData.photoUrl || nodeData.fileUrl || nodeData.url ||
        (nodeData.variable ? `{{${nodeData.variable}}}` : '') ||
        (nodeType === 'start' ? `/${nodeData.command || 'start'}` : '');

    return (
        <div className={`${styles.flowNode} ${NODE_GROUP_CLASS[nodeType] ?? ''} ${selected ? styles.flowNodeSelected : ''}`}>
            <strong>{nodeData.label || nodeType}</strong>
            {summary ? <span>{summary}</span> : null}
            {handles.map((h) => (
                <Handle key={h} id={h} type="target" position={Position.Right} style={{ visibility: 'hidden' }} />
            ))}
            {handles.map((h) => (
                <Handle key={`out-${h}`} id={h} type="source" position={Position.Left} style={{ background: '#3b82f6' }} />
            ))}
        </div>
    );
}
