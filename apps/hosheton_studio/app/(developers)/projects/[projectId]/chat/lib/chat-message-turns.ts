import type { StudioChatMessage } from '@/app/(developers)/projects/types/media-api';

export type StudioChatTurn = {
    user?: StudioChatMessage;
    assistant?: StudioChatMessage;
};

export function groupStudioChatTurns(messages: StudioChatMessage[]): StudioChatTurn[] {
    const turns: StudioChatTurn[] = [];
    for (const message of messages) {
        if (message.role === 'user') {
            turns.push({ user: message });
            continue;
        }
        const last = turns[turns.length - 1];
        if (last?.user && !last.assistant) {
            last.assistant = message;
        } else {
            turns.push({ assistant: message });
        }
    }
    return turns;
}

export function findFailedChatTurn(
    messages: StudioChatMessage[],
    assistantMessageId: string,
): StudioChatTurn | undefined {
    return groupStudioChatTurns(messages).find((turn) => (
        turn.assistant?.messageId === assistantMessageId
        && turn.assistant.status === 'failed'
        && Boolean(turn.user?.requestSnapshot)
    ));
}

/** نوبت قابل ویرایش مستقل از وضعیت — برای ویرایش پیام‌های کاربر در چت متنی */
export function findEditableChatTurn(
    messages: StudioChatMessage[],
    assistantMessageId: string,
): StudioChatTurn | undefined {
    return groupStudioChatTurns(messages).find((turn) => (
        turn.assistant?.messageId === assistantMessageId
        && Boolean(turn.user?.requestSnapshot)
    ));
}

export async function copyChatText(
    value: string,
    clipboard?: { writeText: (text: string) => Promise<void> },
): Promise<boolean> {
    if (!value || !clipboard) return false;
    await clipboard.writeText(value);
    return true;
}
