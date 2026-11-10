'use client';

import { usePathname } from 'next/navigation';
import { isTemplatesHubPath } from './lib/templates-hub-path';
import { TemplatesHubShell } from './components/TemplatesHubShell';

export default function TemplatesLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    if (!isTemplatesHubPath(pathname)) {
        return <>{children}</>;
    }

    return <TemplatesHubShell>{children}</TemplatesHubShell>;
}
