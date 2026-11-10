'use client';

import Link from 'next/link';
import type { AiAvatarProfile } from '@/app/(developers)/projects/types/ai-avatar-api';
import { AvatarIdCardFace } from './AvatarIdCardFace';
import styles from '../avatars.module.scss';

interface AvatarIdCardProps {
    avatar: AiAvatarProfile;
    selected?: boolean;
    onSelect?: (avatarId: string) => void;
}

export function AvatarIdCard({ avatar, selected, onSelect }: AvatarIdCardProps) {
    if (onSelect) {
        return (
            <button
                type="button"
                className={styles.idCardSelectBtn}
                aria-pressed={selected}
                onClick={() => onSelect(avatar._id)}
            >
                <AvatarIdCardFace avatar={avatar} className={styles.idCardInteractive} />
            </button>
        );
    }

    return (
        <Link href={`/avatars/${avatar._id}`} className={styles.idCardLink}>
            <AvatarIdCardFace avatar={avatar} className={styles.idCardInteractive} />
        </Link>
    );
}
