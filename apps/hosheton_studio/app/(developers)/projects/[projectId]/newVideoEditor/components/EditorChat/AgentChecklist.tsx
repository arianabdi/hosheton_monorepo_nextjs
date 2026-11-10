'use client';

import React from 'react';
import { LuCheck, LuLoaderCircle, LuUndo2, LuX } from 'react-icons/lu';
import type { AgentCommandPlanItem, AgentCommandResult } from '../../utils/editor-agent-commands';
import styles from './AgentChecklist.module.scss';

const COMMAND_LABELS: Record<string, string> = {
    addMedia: 'addMedia',
    moveClip: 'moveClip',
    nudgeClip: 'nudgeClip',
    trimClip: 'trimClip',
    deleteClip: 'deleteClip',
    splitClip: 'splitClip',
    setClipFrame: 'setClipFrame',
    scaleClip: 'scaleClip',
    resetClipFrame: 'resetClipFrame',
    addTextClip: 'addTextClip',
    setTextStyle: 'setTextStyle',
    setClipAnimation: 'setClipAnimation',
    addTransition: 'addTransition',
    setCanvas: 'setCanvas',
    addTrack: 'addTrack',
    deleteTrack: 'deleteTrack',
    updateTrack: 'updateTrack',
    seek: 'seek',
    play: 'play',
    pause: 'pause',
    selectClip: 'selectClip',
};

type AgentChecklistProps = {
    commands: AgentCommandPlanItem[];
    /** Per-command execution results — present once the plan was applied. */
    results?: AgentCommandResult[] | null;
    selectedIds: string[];
    onToggle: (id: string) => void;
    onToggleAll: () => void;
    onConfirm: () => void;
    onRevert?: (() => void) | null;
    applying?: boolean;
    reverting?: boolean;
    applied?: boolean;
    reverted?: boolean;
    /** i18n already resolved by the parent — keeps this component dumb. */
    labels: {
        title: string;
        selectAll: (count: number) => string;
        apply: (count: number) => string;
        applying: string;
        applied: string;
        revert: string;
        reverting: string;
        reverted: string;
        noSnapshot: string;
    };
};

export default function AgentChecklist({
    commands,
    results,
    selectedIds,
    onToggle,
    onToggleAll,
    onConfirm,
    onRevert,
    applying = false,
    reverting = false,
    applied = false,
    reverted = false,
    labels,
}: AgentChecklistProps) {
    const pendingCount = applied ? 0 : selectedIds.length;
    const allSelected = !applied && commands.length > 0 && selectedIds.length === commands.length;
    const locked = applied || reverted || reverting;

    return (
        <div className={`${styles.plan} ${reverted ? styles.planReverted : ''}`}>
            <div className={styles.planHeader}>
                <span className={styles.planTitle}>{labels.title}</span>
                {!applied && !reverted && (
                    <button
                        type="button"
                        className={styles.selectAllBtn}
                        onClick={onToggleAll}
                        disabled={applying}
                    >
                        <input type="checkbox" checked={allSelected} readOnly tabIndex={-1} />
                        <span>{labels.selectAll(commands.length)}</span>
                    </button>
                )}
                {applied && <span className={styles.appliedTag}>{labels.applied}</span>}
                {reverted && <span className={styles.revertedTag}>{labels.reverted}</span>}
            </div>

            <div className={styles.planItems}>
                {commands.map((command, index) => {
                    const commandId = command.id || `cmd-${index}`;
                    const checked = selectedIds.includes(commandId);
                    const result = results?.[index];
                    return (
                        <label
                            key={commandId}
                            className={`${styles.item} ${locked ? styles.itemLocked : ''}`}
                        >
                            {!locked && (
                                <input
                                    type="checkbox"
                                    checked={checked}
                                    disabled={applying}
                                    onChange={() => onToggle(commandId)}
                                />
                            )}
                            {locked && (
                                <span className={`${styles.lockIcon} ${result && !result.ok ? styles.lockFail : ''}`}>
                                    {reverted
                                        ? <LuUndo2 />
                                        : result
                                            ? (result.ok ? <LuCheck /> : <LuX />)
                                            : <LuCheck />}
                                </span>
                            )}
                            <span className={styles.itemText}>
                                {command.summary || COMMAND_LABELS[command.type] || command.type}
                            </span>
                            {!locked && (
                                <span className={styles.itemType}>{COMMAND_LABELS[command.type] || command.type}</span>
                            )}
                            {locked && result && !result.ok && (
                                <span className={styles.failTag} title={result.detail || ''}>
                                    {COMMAND_LABELS[result.type] || result.type}
                                </span>
                            )}
                        </label>
                    );
                })}
            </div>

            {!applied && !reverted && (
                <button
                    type="button"
                    className={styles.confirmBtn}
                    disabled={pendingCount === 0 || applying}
                    onClick={onConfirm}
                >
                    {applying ? <LuLoaderCircle className={styles.spinner} /> : <LuCheck />}
                    <span>{applying ? labels.applying : labels.apply(pendingCount)}</span>
                </button>
            )}

            {applied && !reverted && onRevert && (
                <button
                    type="button"
                    className={styles.revertBtn}
                    disabled={reverting}
                    onClick={onRevert ?? undefined}
                >
                    {reverting ? <LuLoaderCircle className={styles.spinner} /> : <LuUndo2 />}
                    <span>{reverting ? labels.reverting : labels.revert}</span>
                </button>
            )}
        </div>
    );
}
