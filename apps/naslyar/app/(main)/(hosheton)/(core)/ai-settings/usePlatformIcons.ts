'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { ErrorToaster } from '@my-workspace/utils';

export interface PlatformIconItem {
    _id: string;
    name: string;
    iconSvg: string;
}

/** فهرست کتابخانه آیکون‌های عمومی پلتفرم (/api/platform-icons) */
export function usePlatformIcons(token: string | null | undefined, baseUrl: string | null | undefined) {
    const [items, setItems] = useState<PlatformIconItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (!token || !baseUrl) {
                setLoading(false);
                return;
            }
            try {
                const res = await axios.get(`${baseUrl}/api/platform-icons`, {
                    headers: { authorization: `Bearer ${token}` },
                });
                if (!cancelled && res.data.statusCode === 200) {
                    setItems(res.data.data?.items || []);
                }
            } catch (e) {
                if (!cancelled) ErrorToaster(e);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [token, baseUrl]);

    return { items, loading };
}
