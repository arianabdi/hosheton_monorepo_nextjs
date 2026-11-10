/** آیکون «زاویه و نور»: کره با مدار و دوربین — همان SVG مود در API */
export function AngleStudioGlyph({ size = 16, className }: { size?: number; className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width={size}
            height={size}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden
        >
            <circle cx="11" cy="13" r="7.5" />
            <ellipse cx="11" cy="13" rx="7.5" ry="2.8" />
            <path d="M11 5.5c1.9 2 2.8 4.6 2.8 7.5s-.9 5.5-2.8 7.5" />
            <rect x="15.5" y="2.5" width="6" height="4.4" rx="1.3" />
            <circle cx="18.5" cy="4.7" r=".9" fill="currentColor" stroke="none" />
        </svg>
    );
}
