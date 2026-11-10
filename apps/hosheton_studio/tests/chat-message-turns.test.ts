import assert from 'node:assert/strict';
import test from 'node:test';
import type { StudioChatMessage } from '../app/(developers)/projects/types/media-api';
import { copyChatText, findFailedChatTurn, groupStudioChatTurns } from '../app/(developers)/projects/[projectId]/chat/lib/chat-message-turns.ts';

const snapshot = {
    promptText: 'original prompt',
    attachments: [],
    mentionRefs: [],
    mediaKind: 'image',
    settings: { providerId: 'provider-1', modelId: 'model-1' },
};

test('groups user and assistant messages into stable turns', () => {
    const messages = [
        { messageId: 'u1', role: 'user', content: 'one', requestSnapshot: snapshot },
        { messageId: 'a1', role: 'assistant', content: 'done', status: 'complete' },
        { messageId: 'u2', role: 'user', content: 'two', requestSnapshot: snapshot },
        { messageId: 'a2', role: 'assistant', content: 'failed', status: 'failed' },
    ] as StudioChatMessage[];

    const turns = groupStudioChatTurns(messages);
    assert.equal(turns.length, 2);
    assert.equal(turns[1].user?.messageId, 'u2');
    assert.equal(turns[1].assistant?.messageId, 'a2');
});

test('only failed turns with a request snapshot are actionable', () => {
    const messages = [
        { messageId: 'u1', role: 'user', content: 'one', requestSnapshot: snapshot },
        { messageId: 'a1', role: 'assistant', content: 'failed', status: 'failed' },
        { messageId: 'u2', role: 'user', content: 'two' },
        { messageId: 'a2', role: 'assistant', content: 'failed', status: 'failed' },
        { messageId: 'u3', role: 'user', content: 'three', requestSnapshot: snapshot },
        { messageId: 'a3', role: 'assistant', content: 'done', status: 'complete' },
    ] as StudioChatMessage[];

    assert.equal(findFailedChatTurn(messages, 'a1')?.user?.messageId, 'u1');
    assert.equal(findFailedChatTurn(messages, 'a2'), undefined);
    assert.equal(findFailedChatTurn(messages, 'a3'), undefined);
});

test('copies message text and reports clipboard availability', async () => {
    let copied = '';
    const clipboard = {
        writeText: async (value: string) => {
            copied = value;
        },
    };

    assert.equal(await copyChatText('prompt text', clipboard), true);
    assert.equal(copied, 'prompt text');
    assert.equal(await copyChatText('prompt text'), false);
});
