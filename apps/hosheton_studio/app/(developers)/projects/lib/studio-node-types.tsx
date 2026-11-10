'use client';

import type { NodeTypes } from '@xyflow/react';
import {
    StartTriggerNode, NoteNode,
    PromptNode, AssetRefNode, AvatarRefNode,
    TextToImageNode, TextToVideoNode, AiAvatarNode, MusicSfxNode,
    ResultGalleryNode, RenderOutputNode,
    CustomGroupNode, LegacyFallbackNode,
} from '../[projectId]/components/CustomNodes/CustomNodes';

export const STUDIO_NODE_TYPES: NodeTypes = {
    startTrigger: StartTriggerNode,
    note: NoteNode,
    prompt: PromptNode,
    assetRef: AssetRefNode,
    avatarRef: AvatarRefNode,
    textToImage: TextToImageNode,
    textToVideo: TextToVideoNode,
    aiAvatar: AiAvatarNode,
    musicSfx: MusicSfxNode,
    resultGallery: ResultGalleryNode,
    render: RenderOutputNode,
    customGroup: CustomGroupNode,
    imageToVideo: LegacyFallbackNode,
    imageToImage: LegacyFallbackNode,
    upscale: LegacyFallbackNode,
    removeBackground: LegacyFallbackNode,
    faceSwap: LegacyFallbackNode,
    lipSync: LegacyFallbackNode,
    voiceClone: LegacyFallbackNode,
    textToSpeech: LegacyFallbackNode,
    videoToVideo: LegacyFallbackNode,
    characterSwap: LegacyFallbackNode,
    unknown: LegacyFallbackNode,
};
