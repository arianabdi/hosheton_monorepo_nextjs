'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { LuArrowRight } from 'react-icons/lu';
import { AvatarDetailPanel } from '../components/AvatarDetailPanel';
import styles from '../avatars.module.scss';

export default function AvatarDetailPage() {
    const { t } = useTranslation('avatars');
    const params = useParams();
    const avatarId = String(params.id ?? '');

    return (
        <div className={`${styles.avatarsPage} ${styles.avatarsPageFull}`}>
            <header className={styles.mobileDetailHeader}>
                <Link href="/avatars" className={styles.backLink}>
                    <LuArrowRight size={18} />
                    {t('back_to_list')}
                </Link>
            </header>

            <AvatarDetailPanel avatarId={avatarId} />
        </div>
    );
}
