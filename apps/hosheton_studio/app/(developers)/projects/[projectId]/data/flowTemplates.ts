import type { FlowTemplate } from '../types/studio';

const GROUP_STYLE = { width: 480, height: 380 };

export const FLOW_TEMPLATES: FlowTemplate[] = [
    // ─── Test: Seedance 2 Multimodal Video ───────────────────────────────────
    {
        id: 'seedance2-multimodal',
        name: 'Seedance 2 — Multimodal Video',
        nameFa: 'tpl_seedance2_name',
        description: 'tpl_seedance2_desc',
        category: 'character',
        nodes: [
            // Start trigger
            {
                id: 'sm-start',
                type: 'startTrigger',
                position: { x: 40, y: 200 },
                data: { label: 'Start' },
            },
            // Input group
            {
                id: 'sm-group-inputs',
                type: 'customGroup',
                position: { x: 160, y: 40 },
                style: { width: 320, height: 480 },
                data: { label: 'Inputs', groupColor: 'blue' },
                zIndex: -1,
            },
            // Prompt
            {
                id: 'sm-prompt',
                type: 'prompt',
                position: { x: 20, y: 50 },
                parentId: 'sm-group-inputs',
                extent: 'parent' as const,
                data: {
                    label: 'Scene prompt',
                    promptText: 'یک دختر جوان با لباس مدرن در یک کافه شیک، نور گرم، جزئیات واضح، کیفیت سینمایی',
                },
            },
            // Reference video — girl speaking
            {
                id: 'sm-video-ref',
                type: 'assetRef',
                position: { x: 20, y: 210 },
                parentId: 'sm-group-inputs',
                extent: 'parent' as const,
                data: {
                    label: 'Character video (girl speaking)',
                    assetType: 'video',
                    externalUrl: '',
                },
            },
            // Reference image — outfit
            {
                id: 'sm-image-ref',
                type: 'assetRef',
                position: { x: 20, y: 340 },
                parentId: 'sm-group-inputs',
                extent: 'parent' as const,
                data: {
                    label: 'Outfit reference photo',
                    assetType: 'image',
                    externalUrl: '',
                },
            },
            // Video generation node
            {
                id: 'sm-video-gen',
                type: 'textToVideo',
                position: { x: 540, y: 160 },
                data: {
                    label: 'Generate video — Seedance 2',
                    resolution: '720p',
                    aspectRatio: '16:9',
                    duration: 5,
                    generateAudio: false,
                },
            },
            // Final output
            {
                id: 'sm-render',
                type: 'render',
                position: { x: 860, y: 200 },
                data: { label: 'Final output', outputFormat: 'mp4' },
            },
        ],
        edges: [
            { id: 'sm-e-start', source: 'sm-start', target: 'sm-prompt', animated: false },
            { id: 'sm-e-prompt', source: 'sm-prompt', target: 'sm-video-gen', targetHandle: 'prompt-in', animated: true },
            { id: 'sm-e-img', source: 'sm-image-ref', target: 'sm-video-gen', targetHandle: 'ref-in', animated: true },
            { id: 'sm-e-vid', source: 'sm-video-ref', target: 'sm-video-gen', targetHandle: 'ref-in', animated: true },
            { id: 'sm-e-render', source: 'sm-video-gen', target: 'sm-render', animated: true },
        ],
    },

    // ─── Image Generation ────────────────────────────────────────────────────
    {
        id: 'image-gen-basic',
        name: 'Image Generation',
        nameFa: 'tpl_image_gen_name',
        description: 'tpl_image_gen_desc',
        category: 'commercial',
        nodes: [
            {
                id: 'ig-start',
                type: 'startTrigger',
                position: { x: 40, y: 160 },
                data: { label: 'Start' },
            },
            {
                id: 'ig-prompt',
                type: 'prompt',
                position: { x: 220, y: 100 },
                data: { label: 'Prompt', promptText: 'یک مدل زن با لباس مدرن، استودیو، نور نرم، کیفیت بالا' },
            },
            {
                id: 'ig-ref',
                type: 'assetRef',
                position: { x: 220, y: 260 },
                data: { label: 'Reference (optional)', assetType: 'image', externalUrl: '' },
            },
            {
                id: 'ig-gen',
                type: 'textToImage',
                position: { x: 540, y: 140 },
                data: { label: 'Generate image', modelSettings: {} },
            },
            {
                id: 'ig-gallery',
                type: 'resultGallery',
                position: { x: 840, y: 160 },
                data: { label: 'Results gallery' },
            },
        ],
        edges: [
            { id: 'ig-e1', source: 'ig-start', target: 'ig-prompt', animated: false },
            { id: 'ig-e2', source: 'ig-prompt', target: 'ig-gen', targetHandle: 'prompt-in', animated: true },
            { id: 'ig-e3', source: 'ig-ref', target: 'ig-gen', targetHandle: 'ref-in', animated: false },
            { id: 'ig-e4', source: 'ig-gen', target: 'ig-gallery', animated: true },
        ],
    },

    // ─── Text-to-Video (simple) ─────────────────────────────────────────────
    {
        id: 'video-from-text',
        name: 'Text-to-Video',
        nameFa: 'tpl_video_text_name',
        description: 'tpl_video_text_desc',
        category: 'animation',
        nodes: [
            {
                id: 'tv-start',
                type: 'startTrigger',
                position: { x: 40, y: 180 },
                data: { label: 'Start' },
            },
            {
                id: 'tv-prompt',
                type: 'prompt',
                position: { x: 220, y: 140 },
                data: { label: 'Prompt', promptText: 'یک منظره طبیعی زیبا، آبشار، جنگل، نور طلایی غروب' },
            },
            {
                id: 'tv-gen',
                type: 'textToVideo',
                position: { x: 520, y: 140 },
                data: { label: 'Generate video', resolution: '720p', duration: 5 },
            },
            {
                id: 'tv-render',
                type: 'render',
                position: { x: 820, y: 160 },
                data: { label: 'Final output', outputFormat: 'mp4' },
            },
        ],
        edges: [
            { id: 'tv-e1', source: 'tv-start', target: 'tv-prompt', animated: false },
            { id: 'tv-e2', source: 'tv-prompt', target: 'tv-gen', targetHandle: 'prompt-in', animated: true },
            { id: 'tv-e3', source: 'tv-gen', target: 'tv-render', animated: true },
        ],
    },

    // ─── Audio Generation ────────────────────────────────────────────────────
    {
        id: 'audio-gen-basic',
        name: 'Audio Generation',
        nameFa: 'tpl_audio_gen_name',
        description: 'tpl_audio_gen_desc',
        category: 'commercial',
        nodes: [
            {
                id: 'ag-start',
                type: 'startTrigger',
                position: { x: 40, y: 180 },
                data: { label: 'Start' },
            },
            {
                id: 'ag-prompt',
                type: 'prompt',
                position: { x: 220, y: 140 },
                data: { label: 'Prompt', promptText: 'موزیک سینمایی، احساسی، اورکستر، بدون کلام' },
            },
            {
                id: 'ag-gen',
                type: 'musicSfx',
                position: { x: 520, y: 140 },
                data: { label: 'Generate music / SFX', audioMode: 'music' },
            },
        ],
        edges: [
            { id: 'ag-e1', source: 'ag-start', target: 'ag-prompt', animated: false },
            { id: 'ag-e2', source: 'ag-prompt', target: 'ag-gen', animated: true },
        ],
    },
];

export function getFlowTemplate(id: string): FlowTemplate | undefined {
    return FLOW_TEMPLATES.find((t) => t.id === id);
}
