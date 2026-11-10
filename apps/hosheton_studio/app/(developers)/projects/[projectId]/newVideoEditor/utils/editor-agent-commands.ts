/**
 * Structured command protocol shared by the AI editor chat (frontend) and the
 * video-editor agent endpoint (backend). The LLM must answer with a JSON body
 * `{ "message": string, "commands": AgentCommand[] }` where every command
 * matches one of the variants below; the editor applies them locally.
 */

export type AgentMediaKind = 'video' | 'image' | 'audio';

export type AgentTextStylePatch = {
    fontFamily?: string;
    fontSize?: number;
    color?: string;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    align?: 'left' | 'center' | 'right';
    backgroundColor?: string;
    backgroundOpacity?: number;
    glowColor?: string;
    glowBlur?: number;
    strokeColor?: string;
    strokeWidth?: number;
    motion?: 'none' | 'fadeIn' | 'slideUp' | 'pop' | 'typewriter';
    motionDuration?: number;
    exitMotion?: 'none' | 'fadeOut' | 'slideOutDown' | 'slideOutUp' | 'shrinkOut';
    exitMotionDuration?: number;
};

export type AgentClipAnimMotion =
    | { motion: 'none' | 'fadeIn' | 'slideUp' | 'slideLeft' | 'slideRight' | 'zoomIn' | 'bounceIn'; duration?: number }
    | null;

export type AgentClipAnimLoop =
    | { kind: 'none' | 'float' | 'pulse' | 'sway' | 'shake'; amplitude?: number; speed?: number }
    | null;

/** Inline motion spec carried directly on add commands (self-contained elements). */
export type AgentClipAnimationSpec = {
    enter?: AgentClipAnimMotion;
    exit?: AgentClipAnimMotion;
    loop?: AgentClipAnimLoop;
};

/** Normalized position/size patch the agent may attach to add commands. */
export type AgentFramePatch = {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    rotation?: number;
};

export type AgentCommand =
    | { type: 'addMedia'; url: string; mediaType: AgentMediaKind; title?: string; startTime?: number; duration?: number; trackId?: string; frame?: AgentFramePatch; animation?: AgentClipAnimationSpec }
    | { type: 'moveClip'; clipId: string; startTime: number; trackId?: string }
    | { type: 'nudgeClip'; clipId: string; delta: number }
    | { type: 'trimClip'; clipId: string; trimStart?: number; duration?: number }
    | { type: 'deleteClip'; clipId: string }
    | { type: 'splitClip'; clipId: string; atTime: number }
    | { type: 'setClipFrame'; clipId: string; x?: number; y?: number; width?: number; height?: number }
    | { type: 'scaleClip'; clipId: string; scale: number }
    | { type: 'resetClipFrame'; clipId: string }
    | { type: 'addTextClip'; text: string; title?: string; startTime?: number; duration?: number; style?: AgentTextStylePatch; frame?: AgentFramePatch }
    | { type: 'setTextStyle'; clipId: string; text?: string; style?: AgentTextStylePatch }
    | { type: 'setClipAnimation'; clipId: string; enter?: AgentClipAnimMotion; exit?: AgentClipAnimMotion; loop?: AgentClipAnimLoop }
    | { type: 'addTransition'; afterClipId: string; duration?: number; intensity?: number; curve?: 'linear' | 'smooth' | 'easeIn' | 'easeOut' }
    | { type: 'setCanvas'; preset?: '16:9' | '9:16' | '1:1' | '4:3'; width?: number; height?: number }
    | { type: 'addTrack'; trackType: 'video' | 'audio' }
    | { type: 'deleteTrack'; trackId: string }
    | { type: 'updateTrack'; trackId: string; muted?: boolean; hidden?: boolean; locked?: boolean }
    | { type: 'seek'; time: number }
    | { type: 'play' }
    | { type: 'pause' }
    | { type: 'selectClip'; clipId: string };

/**
 * A command as it appears in an agent plan: the raw command plus the
 * checklist metadata the model attaches (a human summary per step).
 */
export type AgentCommandPlanItem = AgentCommand & {
    /** One short line in the user's language — the checklist label. */
    summary?: string;
    /** Client-side id used for checklist selection (assigned by the panel). */
    id?: string;
};

export type AgentCommandResult = {
    type: string;
    ok: boolean;
    detail?: string;
};

/** Editor state summary sent alongside each chat turn. */
export type AgentEditorSnapshot = {
    canvas: { width: number; height: number };
    currentTime: number;
    totalDuration: number;
    isPlaying: boolean;
    selectedClipId: string | null;
    tracks: Array<{
        id: string;
        title: string;
        type: string;
        muted: boolean;
        hidden: boolean;
        locked: boolean;
        clips: Array<{
            id: string;
            title: string;
            type: string;
            mediaType?: string;
            startTime: number;
            duration: number;
            trimStart: number;
            sourceDuration?: number;
            hasSource: boolean;
            frame?: { x: number; y: number; width: number; height: number };
            text?: string;
        }>;
    }>;
};

export type AgentChatMessage = {
    role: 'user' | 'assistant';
    content: string;
};

export type AgentCommandParseResult = {
    message: string;
    /** Commands keep any extra fields the model attached (summary, …). */
    commands: AgentCommandPlanItem[];
};

/** Tolerant parser for the agent JSON body (handles ```json fences etc.). */
export function parseAgentResponse(raw: string): AgentCommandParseResult {
    const text = String(raw || '').trim();
    if (!text) return { message: '', commands: [] };

    let candidate = text;
    const fence = candidate.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence?.[1]) candidate = fence[1].trim();

    const parse = (value: string): AgentCommandParseResult | null => {
        try {
            const parsed = JSON.parse(value) as { message?: unknown; commands?: unknown };
            if (!parsed || typeof parsed !== 'object') return null;
            const message = typeof parsed.message === 'string' ? parsed.message : '';
            const commands = Array.isArray(parsed.commands)
                ? (parsed.commands as unknown[]).filter((item): item is AgentCommandPlanItem => (
                    !!item && typeof item === 'object' && typeof (item as { type?: unknown }).type === 'string'
                ))
                : [];
            return { message, commands };
        } catch {
            return null;
        }
    };

    const direct = parse(candidate);
    if (direct) return direct;

    // Fallback: first {...} block that parses (models sometimes prefix prose).
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start >= 0 && end > start) {
        const sliced = parse(candidate.slice(start, end + 1));
        if (sliced) return sliced;
    }

    // Plain text answer without commands.
    return { message: text, commands: [] };
}
