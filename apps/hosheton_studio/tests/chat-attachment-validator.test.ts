import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { TemplatePreviewMedia } from '@/app/(developers)/projects/types/media-api';
import {
    collectAttachmentErrors,
    formatConstraintsReviewFa,
    validateChatAttachments,
    type ModeInputConstraints,
} from '../app/(developers)/projects/[projectId]/chat/lib/chat-attachment-validator.ts';

describe('validateChatAttachments', () => {
    describe('count validation', () => {
        it('should validate minimum image count', () => {
            const constraints: ModeInputConstraints = {
                imageCount: { min: 2 },
            };
            const attachments: TemplatePreviewMedia[] = [
                { url: 'test1.jpg', type: 'image' },
            ];

            const result = validateChatAttachments(attachments, constraints);

            assert.equal(result.valid, false);
            assert.equal(result.errors.length, 1);
            assert.equal(result.errors[0].type, 'image');
            assert.equal(result.errors[0].constraint, 'min');
            // Kind-scoped: no specific attachment, kind marks every image.
            assert.equal(result.errors[0].attachment, undefined);
            assert.equal(result.errors[0].kind, 'image');
        });

        it('should validate maximum video count', () => {
            const constraints: ModeInputConstraints = {
                videoCount: { max: 1 },
            };
            const attachments: TemplatePreviewMedia[] = [
                { url: 'test1.mp4', type: 'video' },
                { url: 'test2.mp4', type: 'video' },
            ];

            const result = validateChatAttachments(attachments, constraints);

            assert.equal(result.valid, false);
            assert.equal(result.errors.length, 1);
            assert.equal(result.errors[0].type, 'video');
            assert.equal(result.errors[0].constraint, 'max');
            assert.equal(result.errors[0].kind, 'video');
        });
    });

    describe('per-file size validation', () => {
        it('should reject a video larger than videoFileSize.max', () => {
            const constraints: ModeInputConstraints = {
                videoFileSize: { max: 5_000 },
            };
            const attachments: TemplatePreviewMedia[] = [
                { url: 'big.mp4', type: 'video', label: 'big.mp4', sizeBytes: 8_000 },
            ];

            const result = validateChatAttachments(attachments, constraints);

            assert.equal(result.valid, false);
            assert.equal(result.errors[0].type, 'size');
            assert.equal(result.errors[0].constraint, 'max');
            assert.equal(result.errors[0].attachment, attachments[0]);
        });

        it('should accept a video within videoFileSize range', () => {
            const constraints: ModeInputConstraints = {
                videoFileSize: { min: 100, max: 10_000 },
            };
            const attachments: TemplatePreviewMedia[] = [
                { url: 'ok.mp4', type: 'video', label: 'ok.mp4', sizeBytes: 2_000 },
            ];

            const result = validateChatAttachments(attachments, constraints);

            assert.equal(result.valid, true);
            assert.equal(result.errors.length, 0);
        });

        it('should validate image and audio file sizes independently', () => {
            const constraints: ModeInputConstraints = {
                imageFileSize: { max: 1_000 },
                audioFileSize: { max: 2_000 },
            };
            const attachments: TemplatePreviewMedia[] = [
                { url: 'photo.jpg', type: 'image', label: 'photo.jpg', sizeBytes: 500 },
                { url: 'clip.mp3', type: 'audio', label: 'clip.mp3', sizeBytes: 3_000 },
            ];

            const result = validateChatAttachments(attachments, constraints);

            assert.equal(result.valid, false);
            assert.equal(result.errors.length, 1);
            assert.equal(result.errors[0].fileName, 'clip.mp3');
            assert.equal(result.errors[0].attachment, attachments[1]);
        });
    });

    describe('per-type total size validation', () => {
        it('should validate sum of video sizes against videoTotalSize', () => {
            const constraints: ModeInputConstraints = {
                videoTotalSize: { max: 10_000 },
            };
            const attachments: TemplatePreviewMedia[] = [
                { url: 'a.mp4', type: 'video', sizeBytes: 6_000 },
                { url: 'b.mp4', type: 'video', sizeBytes: 6_000 },
                { url: 'photo.jpg', type: 'image', sizeBytes: 50_000 },
            ];

            const result = validateChatAttachments(attachments, constraints);

            assert.equal(result.valid, false);
            assert.ok(result.errors.some((error) => error.type === 'size' && error.constraint === 'max'));
            const totalError = result.errors.find((error) => error.kind === 'video' && !error.attachment);
            assert.ok(totalError, 'total size error should be kind-scoped');
        });

        it('should pass when video total is within limit even if images are large', () => {
            const constraints: ModeInputConstraints = {
                videoTotalSize: { max: 20_000 },
                imageTotalSize: { max: 100_000 },
            };
            const attachments: TemplatePreviewMedia[] = [
                { url: 'a.mp4', type: 'video', sizeBytes: 6_000 },
                { url: 'b.mp4', type: 'video', sizeBytes: 6_000 },
                { url: 'photo.jpg', type: 'image', sizeBytes: 50_000 },
            ];

            const result = validateChatAttachments(attachments, constraints);

            assert.equal(result.valid, true);
        });
    });

    describe('duration validation', () => {
        it('should validate minimum video duration', () => {
            const constraints: ModeInputConstraints = {
                videoDuration: { min: 5 },
            };
            const attachments: TemplatePreviewMedia[] = [
                { url: 'test.mp4', type: 'video', label: 'test video', durationSeconds: 3 },
            ];

            const result = validateChatAttachments(attachments, constraints);

            assert.equal(result.valid, false);
            assert.equal(result.errors[0].type, 'duration');
            assert.equal(result.errors[0].constraint, 'min');
            assert.equal(result.errors[0].attachment, attachments[0]);
        });

        it('should validate audio duration', () => {
            const constraints: ModeInputConstraints = {
                audioDuration: { min: 2, max: 30 },
            };
            const attachments: TemplatePreviewMedia[] = [
                { url: 'test.mp3', type: 'audio', label: 'test audio', durationSeconds: 1 },
            ];

            const result = validateChatAttachments(attachments, constraints);

            assert.equal(result.valid, false);
            assert.equal(result.errors[0].type, 'duration');
        });
    });

    describe('format validation', () => {
        it('should reject unsupported image format', () => {
            const constraints: ModeInputConstraints = {
                supportedFormats: {
                    image: ['jpg', 'png'],
                },
            };
            const attachments: TemplatePreviewMedia[] = [
                { url: 'test.gif', type: 'image', label: 'test.gif' },
            ];

            const result = validateChatAttachments(attachments, constraints);

            assert.equal(result.valid, false);
            assert.equal(result.errors[0].type, 'format');
            assert.equal(result.errors[0].attachment, attachments[0]);
            assert.equal(result.errors[0].kind, 'image');
        });

        it('should accept supported video format', () => {
            const constraints: ModeInputConstraints = {
                supportedFormats: {
                    video: ['mp4', 'mov'],
                },
            };
            const attachments: TemplatePreviewMedia[] = [
                { url: 'test.mp4', type: 'video', label: 'test.mp4' },
            ];

            const result = validateChatAttachments(attachments, constraints);

            assert.equal(result.valid, true);
        });
    });

    describe('edge cases', () => {
        it('should handle null constraints', () => {
            const result = validateChatAttachments(
                [{ url: 'test.jpg', type: 'image' }],
                null,
            );
            assert.equal(result.valid, true);
        });

        it('should treat missing sizeBytes as 0 for file size max checks', () => {
            const constraints: ModeInputConstraints = {
                imageFileSize: { max: 5000 },
            };
            const result = validateChatAttachments(
                [{ url: 'test.jpg', type: 'image' }],
                constraints,
            );
            assert.equal(result.valid, true);
        });

        it('should report multiple constraint violations together', () => {
            const result = validateChatAttachments(
                [
                    { url: 'a.gif', type: 'image', label: 'a.gif', sizeBytes: 5_000 },
                    { url: 'b.jpg', type: 'image', label: 'b.jpg', sizeBytes: 5_000 },
                    { url: 'c.jpg', type: 'image', label: 'c.jpg', sizeBytes: 5_000 },
                ],
                {
                    imageCount: { max: 2 },
                    imageTotalSize: { max: 10_000 },
                    supportedFormats: { image: ['jpg', 'png'] },
                },
            );

            assert.equal(result.valid, false);
            assert.ok(result.errors.length >= 2);
        });
    });
});

describe('collectAttachmentErrors', () => {
    it('should combine file-scoped and kind-scoped errors per attachment', () => {
        const constraints: ModeInputConstraints = {
            videoCount: { max: 1 },
            videoTotalSize: { max: 5_000 },
            videoFileSize: { max: 4_000 },
        };
        const bigVideo: TemplatePreviewMedia = { url: 'big.mp4', type: 'video', sizeBytes: 9_000 };
        const smallVideo: TemplatePreviewMedia = { url: 'small.mp4', type: 'video', sizeBytes: 1_000 };

        const result = validateChatAttachments([bigVideo, smallVideo], constraints);
        assert.equal(result.valid, false);

        // big.mp4: its own oversize error (file-scoped) + count + total (kind-scoped).
        const bigErrors = collectAttachmentErrors(result.errors, bigVideo);
        assert.ok(bigErrors.some((error) => error.attachment === bigVideo));
        assert.ok(bigErrors.some((error) => error.kind === 'video' && error.constraint === 'max' && !error.attachment));

        // small.mp4: only the kind-scoped errors.
        const smallErrors = collectAttachmentErrors(result.errors, smallVideo);
        assert.ok(smallErrors.length > 0);
        assert.ok(smallErrors.every((error) => !error.attachment || error.attachment === smallVideo));
    });
});

describe('formatConstraintsReviewFa', () => {
    it('should produce lines for counts, totals, durations and formats', () => {
        const constraints: ModeInputConstraints = {
            videoCount: { max: 2 },
            videoTotalSize: { max: 20_000 },
            videoDuration: { max: 30 },
            supportedFormats: { video: ['mp4'] },
        };
        const review = formatConstraintsReviewFa(
            [{ url: 'clip.mp4', type: 'video', sizeBytes: 6_000, durationSeconds: 12 }],
            constraints,
        );

        assert.equal(review.ok, true);
        assert.ok(review.lines.some((line) => line.text.includes('ویدیوها: 1')));
        assert.ok(review.lines.some((line) => line.text.includes('حجم مجموع ویدیوها')));
        assert.ok(review.lines.some((line) => line.text.includes('مدت ویدیوها')));
        assert.ok(review.lines.some((line) => line.text.includes('فرمت')));
    });

    it('should flag violating lines and set ok to false', () => {
        const constraints: ModeInputConstraints = {
            videoCount: { max: 1 },
            videoTotalSize: { max: 4_000 },
        };
        const review = formatConstraintsReviewFa(
            [
                { url: 'a.mp4', type: 'video', sizeBytes: 6_000 },
                { url: 'b.mp4', type: 'video', sizeBytes: 6_000 },
            ],
            constraints,
        );

        assert.equal(review.ok, false);
        assert.ok(review.lines.some((line) => line.invalid && line.text.includes('ویدیوها: 2')));
        assert.ok(review.lines.some((line) => line.invalid && line.text.includes('حجم مجموع ویدیوها')));
    });

    it('should still show added counts without constraints', () => {
        const review = formatConstraintsReviewFa([{ url: 'a.mp4', type: 'video' }], null);
        assert.deepEqual(review.lines, [
            { text: 'ویدیوها: 1 عدد', invalid: false },
            { text: 'مجموع فایل‌ها: 1 عدد', invalid: false },
        ]);
        assert.equal(review.ok, true);
    });
});
