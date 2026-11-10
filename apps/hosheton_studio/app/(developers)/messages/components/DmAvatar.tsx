'use client';

import styles from '../Messages.module.scss';

type Props = {
    name: string;
    src?: string;
    online?: boolean;
    size?: 'md' | 'sm' | 'lg';
};

/** آواتار طرف گفتگو + نقطهٔ سبز آنلاین */
export function DmAvatar({ name, src, online, size = 'md' }: Props) {
    const sizeClass = size === 'sm' ? styles.avatarSm : size === 'lg' ? styles.avatarLg : '';
    return (
        <span className={`${styles.avatarWrap} ${sizeClass}`}>
            {src ? (
                <img src={src} alt="" className={styles.avatar} />
            ) : (
                <span className={styles.avatarFallback} aria-hidden>{(name || '?').trim().charAt(0)}</span>
            )}
            {online && <i className={styles.onlineDot} aria-hidden />}
        </span>
    );
}
