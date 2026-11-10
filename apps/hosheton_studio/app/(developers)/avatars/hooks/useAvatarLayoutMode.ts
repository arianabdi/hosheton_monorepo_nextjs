'use client';

import { useEffect, useState } from 'react';

const DESKTOP_SPLIT_QUERY = '(min-width: 1101px)';

export function useAvatarLayoutMode() {
    const [isDesktopSplit, setIsDesktopSplit] = useState<boolean | null>(null);

    useEffect(() => {
        const media = window.matchMedia(DESKTOP_SPLIT_QUERY);
        const sync = () => setIsDesktopSplit(media.matches);
        sync();
        media.addEventListener('change', sync);
        return () => media.removeEventListener('change', sync);
    }, []);

    return isDesktopSplit;
}
