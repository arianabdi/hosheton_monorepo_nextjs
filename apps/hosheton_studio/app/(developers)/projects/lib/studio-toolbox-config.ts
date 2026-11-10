import type { ComponentType } from 'react';
import { RiImageLine, RiMicLine, RiVidicon2Line } from 'react-icons/ri';
import { LuTextCursorInput } from 'react-icons/lu';
import { CgAttachment } from 'react-icons/cg';

export const STUDIO_TOOLBOX_NODE_TYPES = [
    'prompt',
    'assetRef',
    'textToImage',
    'textToVideo',
    'musicSfx',
] as const;

export type StudioToolboxNodeType = (typeof STUDIO_TOOLBOX_NODE_TYPES)[number];

export const STUDIO_TOOLBOX_GROUP_LABEL_KEY = 'content_group';
export const STUDIO_TOOLBOX_INPUT_GROUP_LABEL_KEY = 'inputs_group';

export const STUDIO_TOOLBOX_ICONS: Record<StudioToolboxNodeType, ComponentType<{ className?: string; size?: number }>> = {
    prompt: LuTextCursorInput,
    assetRef: CgAttachment,
    textToImage: RiImageLine,
    textToVideo: RiVidicon2Line,
    musicSfx: RiMicLine,
};

export const STUDIO_TOOLBOX_SHORTCUTS: {
    type: StudioToolboxNodeType;
    titleKey: string;
}[] = [
    { type: 'textToImage', titleKey: 'generate_image' },
    { type: 'textToVideo', titleKey: 'generate_video' },
    { type: 'musicSfx', titleKey: 'generate_music' },
];

export const STUDIO_TOOLBOX_INPUT_SHORTCUTS: {
    type: StudioToolboxNodeType;
    titleKey: string;
}[] = [
    { type: 'prompt', titleKey: 'prompt_node' },
    { type: 'assetRef', titleKey: 'asset_ref' },
];
