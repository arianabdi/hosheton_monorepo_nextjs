'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function BlogSettingsRedirectPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/settings/website');
    }, [router]);

    return <p style={{ padding: '2rem' }}>در حال انتقال به تنظیمات وبسایت...</p>;
}
