export interface NodeCostHistoryEntry {
    amount: number;
    currency?: string;
    unit?: string;
    runId?: string;
    at?: string;
    model?: string;
}

function historyKey(entry: NodeCostHistoryEntry): string {
    const runId = String(entry.runId || '').trim();
    if (runId) return `run:${runId}`;
    return `at:${String(entry.at || '')}:${Number(entry.amount || 0)}`;
}

export function mergeNodeCostHistory(
    current?: NodeCostHistoryEntry[] | null,
    incoming?: NodeCostHistoryEntry[] | null,
): NodeCostHistoryEntry[] {
    const byKey = new Map<string, NodeCostHistoryEntry>();
    const ingest = (list?: NodeCostHistoryEntry[] | null) => {
        if (!Array.isArray(list)) return;
        for (const item of list) {
            const amount = Number(item?.amount);
            if (!Number.isFinite(amount) || amount <= 0) continue;
            const entry = { ...item, amount };
            const key = historyKey(entry);
            const previous = byKey.get(key);
            byKey.set(key, previous ? { ...previous, ...entry } : entry);
        }
    };
    ingest(current);
    ingest(incoming);
    return [...byKey.values()].sort((a, b) => String(a.at || '').localeCompare(String(b.at || '')));
}

export function sumNodeCostHistory(history: NodeCostHistoryEntry[]): number {
    return Math.round(history.reduce((sum, entry) => sum + Number(entry.amount || 0), 0) * 1_000_000) / 1_000_000;
}
