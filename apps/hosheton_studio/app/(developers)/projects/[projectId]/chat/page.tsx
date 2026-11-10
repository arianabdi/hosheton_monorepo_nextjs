'use client';

import { useParams } from 'next/navigation';
import PersonalChatView from '@/app/(developers)/chat/PersonalChatView';
import { ChatSessionProvider } from '@/app/(developers)/projects/[projectId]/chat/ChatSessionContext';
import styles from '@/app/(developers)/chat/PersonalChat.module.scss';

export default function ProjectChatPage() {
    const { projectId } = useParams<{ projectId: string }>();
    return (
        <div className={styles.pageRoot}>
            <ChatSessionProvider projectId={projectId}>
                <PersonalChatView layout="page" showGallery={false} historyVariant="panel" />
            </ChatSessionProvider>
        </div>
    );
}
