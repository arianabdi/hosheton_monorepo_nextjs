'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useParams, usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { ProjectWorkspaceSwitcher } from '../components/ProjectWorkspaceSwitcher';
import { previewToChatAttachment, StudioExploreGrid } from './chat/explore/StudioExploreGrid';
import {
    useStudioExploreStore,
    writeStudioChatInject,
} from '@/app/zustand/store/useStudioExploreStore';
import { isRtlLanguage } from '@/app/lib/i18n/config';
import styles from './workspace-layout.module.scss';

export default function ProjectWorkspaceLayout({ children }: { children: ReactNode }) {
    const { projectId } = useParams<{ projectId: string }>();
    const pathname = usePathname();
    const { i18n } = useTranslation();
    const open = useStudioExploreStore((s) => s.open);
    const setOpen = useStudioExploreStore((s) => s.setOpen);
    const queueCanvasInsert = useStudioExploreStore((s) => s.queueCanvasInsert);
    const resetExplore = useStudioExploreStore((s) => s.reset);
    const [mounted, setMounted] = useState(false);
    const contentDir = isRtlLanguage(i18n.language) ? 'rtl' : 'ltr';
    const root = `/projects/${projectId}`;
    const inChat = pathname === `${root}/chat` || Boolean(pathname?.startsWith(`${root}/chat/`));

    useEffect(() => {
        if (!open || mounted) return;
        // با انیمیشن toggle دیگر نیازی به تاخیر بلند انیمیشن عرض نیست؛ فقط یک
        // فریم صبر تا محتوا با پاپ هماهنگ ظاهر شود.
        const timer = window.setTimeout(() => setMounted(true), 100);
        return () => window.clearTimeout(timer);
    }, [open, mounted]);

    useEffect(() => {
        setMounted(false);
        resetExplore();
        return () => {
            resetExplore();
        };
    }, [projectId, resetExplore]);

    const applyExplorePrompt = (prompt: string) => {
        if (inChat) {
            writeStudioChatInject(projectId, { prompt });
            setOpen(false);
            return;
        }
        queueCanvasInsert({ kind: 'prompt', promptText: prompt });
    };

    const applyExploreMedia = (media: Parameters<typeof previewToChatAttachment>[0]) => {
        if (inChat) {
            writeStudioChatInject(projectId, { attachments: [previewToChatAttachment(media)] });
            setOpen(false);
            return;
        }
        queueCanvasInsert({ kind: 'assetRef', media });
    };

    return (
        <div className={styles.workspace} dir="ltr">
            <ProjectWorkspaceSwitcher projectId={projectId} />
            <div className={styles.workspaceLayout}>
                <div className={styles.outlet}>
                    {children}
                    <aside
                        className={`${styles.explorePanel} ${open ? styles.open : ''}`}
                        dir="ltr"
                    >
                        <div className={styles.panelContent} dir={contentDir}>
                            {mounted && (
                                <StudioExploreGrid
                                    onUsePrompt={applyExplorePrompt}
                                    onUseAsTemplate={applyExploreMedia}
                                />
                            )}
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
}
