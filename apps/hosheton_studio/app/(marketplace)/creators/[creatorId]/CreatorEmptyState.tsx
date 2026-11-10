'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { LuArrowLeft, LuArrowRight, LuMousePointerClick, LuPlus } from 'react-icons/lu';
import styles from './CreatorEmptyState.module.scss';

type Props = {
    name: string;
    isOwnProfile: boolean;
    onCreate: () => void;
};

/**
 * پروفایل بدون قالب: موشن فقط با CSS (هم‌زبان راهنمای «تنظیمات نود»)؛ نشانگر روی خانهٔ خالی وسط
 * ردیف قالب‌ها کلیک می‌کند و همان‌جا یک کارت قالب (کاور، سازنده، دکمهٔ استفاده) «منتشر» می‌شود.
 */
export function CreatorEmptyState({ name, isOwnProfile, onCreate }: Props) {
    const { t, i18n } = useTranslation('marketplace');
    const rtl = i18n.dir(i18n.language) === 'rtl';
    const Arrow = rtl ? LuArrowLeft : LuArrowRight;

    return (
        <div className={styles.empty}>
            <div className={styles.art} aria-hidden>
                <span className={`${styles.tile} ${styles.tileGhost} ${styles.tileStart}`}>
                    <i /><b />
                </span>
                <span className={`${styles.tile} ${styles.tileHero}`}>
                    <LuPlus className={styles.plus} />
                    <span className={styles.card}>
                        <span className={styles.cover}>
                            <span className={styles.sun} />
                            <span className={styles.hill} />
                            <span className={`${styles.hill} ${styles.hillBack}`} />
                        </span>
                        <span className={styles.cardMeta}>
                            <span className={styles.cardAvatar} />
                            <span className={styles.cardName} />
                            <span className={styles.cardUse} />
                        </span>
                    </span>
                    <span className={styles.flash} />
                </span>
                <span className={`${styles.tile} ${styles.tileGhost} ${styles.tileEnd}`}>
                    <i /><b />
                </span>
                <span className={styles.ripple} />
                <span className={styles.burst}>
                    <i /><i /><i /><i /><i /><i /><i /><i />
                </span>
                <LuMousePointerClick className={styles.cursor} />
            </div>

            <p className={styles.title}>
                {isOwnProfile ? t('creator_empty_own_title') : t('creator_empty_title', { name })}
            </p>
            <p className={styles.text}>
                {isOwnProfile ? t('creator_empty_own_text') : t('creator_empty_text')}
            </p>

            <div className={styles.actions}>
                {isOwnProfile ? (
                    <button type="button" className={styles.primary} onClick={onCreate}>
                        <LuPlus size={16} aria-hidden />
                        {t('creator_empty_create')}
                    </button>
                ) : (
                    <Link href="/explore" className={styles.ghost}>
                        {t('creator_empty_browse')}
                        <Arrow size={15} aria-hidden />
                    </Link>
                )}
            </div>
        </div>
    );
}
