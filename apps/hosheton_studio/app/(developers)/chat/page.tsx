'use client';

import { ChatSessionProvider } from '@/app/(developers)/projects/[projectId]/chat/ChatSessionContext';
import PersonalChatView from './PersonalChatView';
import styles from './PersonalChat.module.scss';
import {BadgedImage} from "@/app/(developers)/chat/components/BadgedImage/BadgedImage";

export default function PersonalChatPage() {
    return (
        <div className={styles.pageRoot}>
            <ChatSessionProvider scope={{ kind: 'personal' }}>
                <PersonalChatView layout="page" />
            </ChatSessionProvider>
        </div>
    );
}
