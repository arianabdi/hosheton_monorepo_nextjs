import assert from 'node:assert/strict';
import test from 'node:test';
import {
    createStudioMediaId,
    mediaListKey,
    mentionToken,
    normalizeAssetRefData,
    selectedAssetsForEdge,
    uniqueGalleryFiles,
} from '../app/(developers)/projects/lib/studio-media.ts';

test('normalizes legacy single asset data into a stable assets array', () => {
    const first = normalizeAssetRefData({
        fileId: 'file-42',
        fileKey: 'uploads/reference.png',
        fileName: 'Reference',
        assetType: 'image',
    });
    const second = normalizeAssetRefData({
        fileId: 'file-42',
        fileKey: 'uploads/reference.png',
        fileName: 'Reference',
        assetType: 'image',
    });

    assert.equal(first.length, 1);
    assert.equal(first[0].id, second[0].id);
    assert.equal(first[0].type, 'image');
    assert.equal(first[0].label, 'Reference');
    assert.equal(first[0].id, createStudioMediaId('file-42'));
});

test('edge selection applies target type before manual asset ids', () => {
    const source = {
        id: 'asset',
        type: 'assetRef',
        position: { x: 0, y: 0 },
        data: {
            assets: [
                { id: 'img-1', type: 'image', label: 'Image 1' },
                { id: 'img-2', type: 'image', label: 'Image 2' },
                { id: 'vid-1', type: 'video', label: 'Video 1' },
            ],
        },
    };
    const edge = {
        id: 'edge',
        source: 'asset',
        target: 'generation',
        targetHandle: 'img-ref',
        data: { assetSelection: { mode: 'manual', assetIds: ['img-2', 'vid-1'] } },
    };

    assert.deepEqual(
        selectedAssetsForEdge(source, edge).map((item) => item.id),
        ['img-2'],
    );
});

test('mention token strips delimiter characters and preserves stable id', () => {
    assert.equal(
        mentionToken({ assetId: 'media-123', label: 'Hero [front]' }),
        '@[Hero front](asset:media-123)',
    );
});

test('unique gallery files collapse the same url from multiple nodes', () => {
    const unique = uniqueGalleryFiles([
        { url: 'https://cdn.example/video.mp4', type: 'video', nodeId: 'a', nodeLabel: 'A', nodeType: 'videoGen', projectId: 'p1', projectTitle: 'One', source: 'generated' },
        { url: 'https://cdn.example/video.mp4', type: 'video', nodeId: 'b', nodeLabel: 'B', nodeType: 'assetRef', projectId: 'p1', projectTitle: 'One', source: 'upload', thumbnailUrlLarge: 'https://cdn.example/thumb.jpg' },
        { url: 'https://cdn.example/other.mp4', type: 'video', nodeId: 'c', nodeLabel: 'C', nodeType: 'videoGen', projectId: 'p2', projectTitle: 'Two', source: 'generated' },
    ]);

    assert.equal(unique.length, 2);
    assert.equal(unique[0].url, 'https://cdn.example/video.mp4');
    assert.equal(unique[0].thumbnailUrlLarge, 'https://cdn.example/thumb.jpg');
    assert.equal(mediaListKey(unique[0], 0) !== mediaListKey(unique[1], 1), true);
});
