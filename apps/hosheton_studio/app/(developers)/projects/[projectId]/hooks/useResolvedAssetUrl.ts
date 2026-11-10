'use client';

import { useEffect, useState } from 'react';
import { resolveFilePublicUrl } from '../../lib/files-api';
import { buildPublicFileUrl } from '../lib/file-url';

interface UseResolvedAssetUrlParams {
    fileId?: string;
    fileKey?: string;
    externalUrl?: string;
    /** @deprecated legacy persisted URL */
    legacyAssetUrl?: string;
}

export function useResolvedAssetUrl({
    fileId = '',
    fileKey = '',
    externalUrl = '',
    legacyAssetUrl = '',
}: UseResolvedAssetUrlParams): string {
    const [url, setUrl] = useState('');

    useEffect(() => {
        let cancelled = false;

        const resolve = async () => {
            const ext = externalUrl.trim();
            if (ext) {
                if (!cancelled) setUrl(ext);
                return;
            }

            const key = fileKey.trim();
            if (key) {
                if (!cancelled) setUrl(buildPublicFileUrl(key));
                return;
            }

            const id = fileId.trim();
            if (id) {
                const resolved = await resolveFilePublicUrl(id);
                if (!cancelled) setUrl(resolved);
                return;
            }

            if (!cancelled) setUrl(legacyAssetUrl.trim());
        };

        resolve();
        return () => { cancelled = true; };
    }, [fileId, fileKey, externalUrl, legacyAssetUrl]);

    return url;
}
