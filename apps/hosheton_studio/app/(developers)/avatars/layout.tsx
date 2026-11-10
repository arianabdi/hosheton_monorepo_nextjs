'use client';

import { usePathname } from 'next/navigation';
import { AvatarWorkspace } from './components/AvatarWorkspace';
import { useAvatarLayoutMode } from './hooks/useAvatarLayoutMode';
import { isAvatarSplitRoute } from './avatar-workspace-url';

export default function AvatarsLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isDesktopSplit = useAvatarLayoutMode();

    if (isDesktopSplit === true && isAvatarSplitRoute(pathname)) {
        return <AvatarWorkspace />;
    }

    return children;
}
