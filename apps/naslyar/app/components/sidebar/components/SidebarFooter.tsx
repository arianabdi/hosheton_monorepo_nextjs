'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import styles from './SidebarFooter.module.scss';

export default function SidebarFooter() {
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const [latestVersion, setLatestVersion] = useState<string | null>(null);

    useEffect(() => {
        if (!token || !baseUrl) return;

        axios
            .get(`${baseUrl}/api/changelog?limit=1&page=1`, {
                headers: { authorization: `Bearer ${token}` },
            })
            .then((res) => {
                if (res.data.statusCode === 200) {
                    const version = res.data.data?.items?.[0]?.version;
                    setLatestVersion(version || null);
                }
            })
            .catch(() => {
                setLatestVersion(null);
            });
    }, [baseUrl, token]);

    return (
        <footer className={styles.footer}>
            <p>© {new Date().getFullYear()} پنل مدیریت</p>
            <Link href="/settings/changelog" className={styles.versionLink}>
                {latestVersion ? `نسخه ${latestVersion}` : 'بدون نسخه'}
            </Link>
        </footer>
    );
}
