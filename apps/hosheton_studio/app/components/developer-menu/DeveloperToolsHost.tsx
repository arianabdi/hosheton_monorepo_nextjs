'use client';

import { useAppStore } from '@/app/zustand/store/useAppStore';
import { canUseDeveloperTools } from '@/app/lib/user-roles';
import { useDeveloperToolsStore } from '@/app/zustand/store/useDeveloperToolsStore';
import { DeveloperToolsPanel } from '@/app/(developers)/projects/[projectId]/components/DeveloperToolsPanel';

/**
 * میزبان گلوبال Developer Tools Panel — در layout نصب می‌شود
 * و از منوی کنار سایدبار / دکمهٔ ریل پروژه باز می‌شود.
 */
export default function DeveloperToolsHost() {
    const roles = useAppStore((state) => state.roles);
    const open = useDeveloperToolsStore((state) => state.open);
    const closeDeveloperTools = useDeveloperToolsStore((state) => state.closeDeveloperTools);

    if (!canUseDeveloperTools(roles)) return null;

    return (
        <DeveloperToolsPanel
            open={open}
            onClose={closeDeveloperTools}
        />
    );
}
