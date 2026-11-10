import { useState, useCallback } from 'react';
import { Track } from '../types/timeline';

function cloneTracks(tracks: Track[]): Track[] {
    return JSON.parse(JSON.stringify(tracks)) as Track[];
}

type HistoryState = {
    past: Track[][];
    present: Track[];
    future: Track[][];
};

export function useTimelineHistory(initialTracks: Track[]) {
    const [history, setHistory] = useState<HistoryState>({
        past: [],
        present: initialTracks,
        future: [],
    });

    /** Discrete edit — pushes current state to undo stack. */
    const setTracks = useCallback((action: Track[] | ((prev: Track[]) => Track[])) => {
        setHistory((prevHistory) => {
            const nextPresent = typeof action === 'function'
                ? action(prevHistory.present)
                : action;
            if (nextPresent === prevHistory.present) return prevHistory;

            return {
                past: [...prevHistory.past, cloneTracks(prevHistory.present)],
                present: nextPresent,
                future: [],
            };
        });
    }, []);

    /** Live preview during drag/scrub — does not push undo steps. */
    const setTracksSilent = useCallback((action: Track[] | ((prev: Track[]) => Track[])) => {
        setHistory((prevHistory) => {
            const nextPresent = typeof action === 'function'
                ? action(prevHistory.present)
                : action;
            if (nextPresent === prevHistory.present) return prevHistory;
            return { ...prevHistory, present: nextPresent };
        });
    }, []);

    /** Call once at the start of a continuous gesture (clip move, trim). */
    const beginHistoryGesture = useCallback(() => {
        setHistory((prevHistory) => ({
            past: [...prevHistory.past, cloneTracks(prevHistory.present)],
            present: prevHistory.present,
            future: [],
        }));
    }, []);

    const undo = useCallback(() => {
        setHistory((prev) => {
            if (prev.past.length === 0) return prev;
            const previous = prev.past[prev.past.length - 1];
            const newPast = prev.past.slice(0, prev.past.length - 1);

            return {
                past: newPast,
                present: cloneTracks(previous),
                future: [cloneTracks(prev.present), ...prev.future],
            };
        });
    }, []);

    const redo = useCallback(() => {
        setHistory((prev) => {
            if (prev.future.length === 0) return prev;
            const next = prev.future[0];
            const newFuture = prev.future.slice(1);

            return {
                past: [...prev.past, cloneTracks(prev.present)],
                present: cloneTracks(next),
                future: newFuture,
            };
        });
    }, []);

    const resetTracks = useCallback((nextTracks: Track[]) => {
        setHistory({
            past: [],
            present: cloneTracks(nextTracks),
            future: [],
        });
    }, []);

    return {
        tracks: history.present,
        setTracks,
        setTracksSilent,
        beginHistoryGesture,
        resetTracks,
        undo,
        redo,
        canUndo: history.past.length > 0,
        canRedo: history.future.length > 0,
    };
}
