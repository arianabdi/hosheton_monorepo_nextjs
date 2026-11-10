import type { EdgeTypeOption } from '../../../types/node-catalog';

const iconProps = {
    width: 22,
    height: 22,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
};

export function EdgeTypeIcon({ type }: { type: EdgeTypeOption }) {
    switch (type) {
        case 'straight':
            return (
                <svg {...iconProps}>
                    <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
            );
        case 'step':
            return (
                <svg {...iconProps}>
                    <polyline points="5 17 5 11 11 11 11 7 17 7" />
                </svg>
            );
        case 'smoothstep':
            return (
                <svg {...iconProps}>
                    <path d="M5 17 V11 Q5 11 8 11 H11 Q14 11 14 8 V5" />
                </svg>
            );
        case 'default':
            return (
                <svg {...iconProps}>
                    <path d="M5 17 C5 17 8 6 12 6 C16 6 19 17 19 17" />
                </svg>
            );
        case 'simplebezier':
            return (
                <svg {...iconProps}>
                    <path d="M5 17 Q12 5 19 17" />
                </svg>
            );
        default:
            return null;
    }
}
