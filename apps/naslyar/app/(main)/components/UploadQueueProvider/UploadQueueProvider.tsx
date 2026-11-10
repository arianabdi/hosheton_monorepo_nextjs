'use client';

import { useEffect } from 'react';
import { useUploadQueueStore } from '@/app/zustand/store/useUploadQueueStore';
import UploadQueueSidebar from '@/app/(main)/components/UploadQueueSidebar/UploadQueueSidebar';

export default function UploadQueueProvider({ children }: { children: React.ReactNode }) {
    const hydrate = useUploadQueueStore((state) => state.hydrate);
    const isHydrated = useUploadQueueStore((state) => state.isHydrated);

    useEffect(() => {
        if (!isHydrated) {
            void hydrate();
        }
    }, [hydrate, isHydrated]);

    return (
        <>
            {children}
            <UploadQueueSidebar />
        </>
    );
}
