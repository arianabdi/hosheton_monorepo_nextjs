export type ModeInputDef = {
    type?: string;
    key?: string;
    label?: string;
    labelFa?: string;
    required?: boolean;
    min?: number;
    max?: number;
    hintFa?: string;
    maxMb?: number;
};

export type ModeMediaKind = 'image' | 'video' | 'audio';

export function isMediaModeInput(input: ModeInputDef | null | undefined) {
    return ['image', 'video', 'audio', 'mask'].includes(String(input?.type || ''));
}

export function modeMediaInputs(inputs?: ModeInputDef[] | null) {
    return (inputs || []).filter((input) => String(input?.key || '').trim() && isMediaModeInput(input));
}

export function modeInputKind(type?: string): ModeMediaKind {
    if (type === 'video') return 'video';
    if (type === 'audio') return 'audio';
    return 'image';
}

export function modeInputAccept(type?: string) {
    const kind = modeInputKind(type);
    if (kind === 'video') return 'video/*';
    if (kind === 'audio') return 'audio/*';
    return 'image/*';
}

export function modeInputMax(input: ModeInputDef) {
    const max = Number(input.max);
    return Number.isFinite(max) && max > 0 ? max : 1;
}

export function modeInputMin(input: ModeInputDef) {
    const min = Number(input.min);
    if (Number.isFinite(min) && min >= 0) return min;
    return input.required === false ? 0 : 1;
}

export function modeInputMaxMb(input?: ModeInputDef | null) {
    const value = Number(input?.maxMb);
    return Number.isFinite(value) && value > 0 ? value : 0;
}

export function modeInputMaxBytes(input?: ModeInputDef | null) {
    const mb = modeInputMaxMb(input);
    return mb > 0 ? mb * 1024 * 1024 : 0;
}

export function attachmentsForInput<T extends { inputKey?: string }>(items: T[], key: string) {
    return items.filter((item) => String(item.inputKey || '').trim() === key);
}

export function modeInputsReady(inputs: ModeInputDef[] | undefined, attachments: Array<{ inputKey?: string }>) {
    return modeMediaInputs(inputs).every((input) => {
        const key = String(input.key || '').trim();
        return attachmentsForInput(attachments, key).length >= modeInputMin(input);
    });
}

export function firstOpenModeInput(
    inputs: ModeInputDef[] | undefined,
    attachments: Array<{ inputKey?: string }>,
    kind: ModeMediaKind,
) {
    return modeMediaInputs(inputs).find((input) => {
        const key = String(input.key || '').trim();
        return modeInputKind(input.type) === kind
            && attachmentsForInput(attachments, key).length < modeInputMax(input);
    }) || null;
}

export function assignInputKeys<T extends { inputKey?: string; type?: string }>(
    items: T[],
    inputs?: ModeInputDef[] | null,
): T[] {
    const slots = modeMediaInputs(inputs);
    if (!slots.length) return items;
    const used = new Map<string, number>();
    const kept: T[] = [];
    const unlabeled: T[] = [];
    for (const item of items) {
        const key = String(item.inputKey || '').trim();
        const slot = slots.find((entry) => String(entry.key) === key);
        if (!slot) {
            unlabeled.push(item);
            continue;
        }
        const count = used.get(key) || 0;
        if (count >= modeInputMax(slot)) {
            unlabeled.push({ ...item, inputKey: '' });
            continue;
        }
        used.set(key, count + 1);
        kept.push({ ...item, inputKey: key });
    }
    for (const item of unlabeled) {
        const kind = item.type === 'video' || item.type === 'audio' ? item.type : 'image';
        const slot = slots.find((entry) => (
            modeInputKind(entry.type) === kind
            && (used.get(String(entry.key)) || 0) < modeInputMax(entry)
        ));
        if (!slot) continue;
        const key = String(slot.key);
        used.set(key, (used.get(key) || 0) + 1);
        kept.push({ ...item, inputKey: key });
    }
    const ordered: T[] = [];
    for (const slot of slots) {
        const key = String(slot.key);
        ordered.push(...kept.filter((item) => item.inputKey === key));
    }
    return ordered;
}

function mediaIdentity(item: { fileId?: string; fileKey?: string; url?: string; assetId?: string }) {
    return String(item.fileId || item.fileKey || item.assetId || item.url || '');
}

export function fillInputKeys<T extends { inputKey?: string; type?: string; fileId?: string; fileKey?: string; url?: string; assetId?: string }>(
    items: T[],
    inputs?: ModeInputDef[] | null,
): T[] {
    const slots = modeMediaInputs(inputs);
    if (!slots.length) return items;
    const assigned = assignInputKeys(items, inputs);
    const byId = new Map<string, T>();
    for (const item of assigned) {
        const id = mediaIdentity(item);
        if (id) byId.set(id, item);
    }
    return items.map((item) => {
        const hit = byId.get(mediaIdentity(item));
        return { ...item, inputKey: hit?.inputKey || '' };
    });
}
