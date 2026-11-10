import assert from 'node:assert/strict';
import test from 'node:test';
import type { Node } from '@xyflow/react';
import {
    getPreferredTargetHandle,
    getSourceOutputKind,
    getTargetAcceptedKinds,
    hasConnectedPrompt,
    isValidStudioConnection,
    nodeRequiresConnectedPrompt,
} from '../app/(developers)/projects/lib/studio-connections.ts';

const node = (id: string, type: string, data: Record<string, unknown> = {}) => ({
    id,
    type,
    data,
    position: { x: 0, y: 0 },
}) as Node;

test('maps source outputs to strict target input kinds', () => {
    const prompt = node('prompt', 'prompt');
    const image = node('image', 'textToImage');
    const video = node('video', 'textToVideo');
    const audio = node('audio', 'musicSfx');
    const avatar = node('avatar', 'avatarRef');
    const defaultAsset = node('default-asset', 'assetRef');
    const target = node('target', 'textToVideo');
    const nodes = [prompt, image, video, audio, avatar, defaultAsset, target];

    assert.equal(isValidStudioConnection({ source: 'prompt', target: 'target', targetHandle: 'prompt-in' }, nodes), true);
    assert.equal(isValidStudioConnection({ source: 'image', target: 'target', targetHandle: 'img-ref' }, nodes), true);
    assert.equal(isValidStudioConnection({ source: 'default-asset', target: 'target', targetHandle: 'img-ref' }, nodes), true);
    assert.equal(isValidStudioConnection({ source: 'video', target: 'target', targetHandle: 'vid-ref' }, nodes), true);
    assert.equal(isValidStudioConnection({ source: 'audio', target: 'target', targetHandle: 'audio-in' }, nodes), true);
    assert.equal(isValidStudioConnection({ source: 'avatar', target: 'target', targetHandle: 'avatar-in' }, nodes), true);
    assert.equal(isValidStudioConnection({ source: 'image', target: 'target', targetHandle: 'prompt-in' }, nodes), false);
    assert.equal(isValidStudioConnection({ source: 'avatar', target: 'target', targetHandle: 'img-ref' }, nodes), false);
});

test('preserves legacy aliases and contextual ref-in semantics', () => {
    assert.deepEqual(getTargetAcceptedKinds(node('image-target', 'textToImage'), 'ref'), ['image']);
    assert.deepEqual(getTargetAcceptedKinds(node('image-target', 'textToImage'), 'ref-in'), ['image']);
    assert.deepEqual(getTargetAcceptedKinds(node('avatar-target', 'aiAvatar'), 'ref-in'), ['avatar']);
});

test('textToVideo ref-in is a unified input for every file type', () => {
    const videoTarget = node('video-target', 'textToVideo');
    assert.deepEqual(getTargetAcceptedKinds(videoTarget, 'ref-in'), ['image', 'video', 'audio', 'avatar']);

    const prompt = node('prompt', 'prompt');
    const image = node('image', 'textToImage');
    const video = node('video', 'textToVideo');
    const audio = node('audio', 'musicSfx');
    const avatar = node('avatar', 'avatarRef');
    const mixedAsset = node('mixed-asset', 'assetRef', {
        assets: [
            { id: 'a1', type: 'image', url: 'https://example.com/a.jpg' },
            { id: 'a2', type: 'video', url: 'https://example.com/b.mp4' },
            { id: 'a3', type: 'audio', url: 'https://example.com/c.mp3' },
        ],
    });
    const nodes = [prompt, image, video, audio, avatar, mixedAsset, videoTarget];

    assert.equal(isValidStudioConnection({ source: 'image', target: 'video-target', targetHandle: 'ref-in' }, nodes), true);
    assert.equal(isValidStudioConnection({ source: 'video', target: 'video-target', targetHandle: 'ref-in' }, nodes), true);
    assert.equal(isValidStudioConnection({ source: 'audio', target: 'video-target', targetHandle: 'ref-in' }, nodes), true);
    assert.equal(isValidStudioConnection({ source: 'avatar', target: 'video-target', targetHandle: 'ref-in' }, nodes), true);
    assert.equal(isValidStudioConnection({ source: 'image', target: 'video-target', targetHandle: 'vid-ref' }, nodes), false);
});

test('prefers the unified ref-in handle when targeting textToVideo', () => {
    const image = node('image', 'textToImage');
    const video = node('video', 'textToVideo');
    const audio = node('audio', 'musicSfx');
    const avatar = node('avatar', 'avatarRef');
    const videoTarget = node('video-target', 'textToVideo');
    const imageTarget = node('image-target', 'textToImage');

    assert.equal(getPreferredTargetHandle(image, videoTarget), 'ref-in');
    assert.equal(getPreferredTargetHandle(video, videoTarget), 'ref-in');
    assert.equal(getPreferredTargetHandle(audio, videoTarget), 'ref-in');
    assert.equal(getPreferredTargetHandle(avatar, videoTarget), 'ref-in');
    assert.equal(getPreferredTargetHandle(image, imageTarget), 'ref-in');
    assert.equal(getPreferredTargetHandle(video, imageTarget), 'vid-ref');
});

test('keeps default handles meaningful for control and output nodes', () => {
    const start = node('start', 'startTrigger');
    const prompt = node('prompt', 'prompt');
    const image = node('image', 'textToImage');
    const generator = node('generator', 'textToVideo');
    const gallery = node('gallery', 'resultGallery');
    const render = node('render', 'render');

    assert.equal(getSourceOutputKind(start), 'control');
    assert.equal(isValidStudioConnection({ source: 'start', target: 'generator', targetHandle: null }, [start, generator]), true);
    assert.equal(isValidStudioConnection({ source: 'start', target: 'prompt', targetHandle: 'prompt-in' }, [start, prompt]), true);
    assert.equal(isValidStudioConnection({ source: 'image', target: 'gallery', targetHandle: null }, [image, gallery]), true);
    assert.equal(isValidStudioConnection({ source: 'image', target: 'render', targetHandle: null }, [image, render]), true);
    assert.equal(getPreferredTargetHandle(image, generator), 'ref-in');
    assert.equal(getPreferredTargetHandle(image, gallery), undefined);
});

test('generation nodes require a connected prompt handle', () => {
    assert.equal(nodeRequiresConnectedPrompt('textToImage'), true);
    assert.equal(nodeRequiresConnectedPrompt('textToVideo'), true);
    assert.equal(nodeRequiresConnectedPrompt('musicSfx'), true);
    assert.equal(nodeRequiresConnectedPrompt('aiAvatar'), true);
    assert.equal(nodeRequiresConnectedPrompt('render'), false);
    assert.equal(nodeRequiresConnectedPrompt('prompt'), false);

    const edges = [
        { id: 'e1', source: 'prompt', target: 'image', targetHandle: 'prompt-in' },
        { id: 'e2', source: 'asset', target: 'image', targetHandle: 'ref-in' },
    ];
    assert.equal(hasConnectedPrompt('image', edges as never), true);
    assert.equal(hasConnectedPrompt('video', edges as never), false);
    assert.equal(hasConnectedPrompt('image', [
        { id: 'e3', source: 'asset', target: 'image', targetHandle: 'ref-in' },
    ] as never), false);
});

