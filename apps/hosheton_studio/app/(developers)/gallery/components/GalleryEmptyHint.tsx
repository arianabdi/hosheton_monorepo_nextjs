'use client';

import { useTranslation } from 'react-i18next';
import styles from './GalleryEmptyHint.module.scss';

const TILES = [0, 1, 2, 3, 4, 5] as const;

/** حالت خالی گالری — هم‌سبک موشن تنظیمات نود: ذره‌بین روی خانه‌های خالی گرید گالری می‌گردد
    (هر خانه زیرش روشن می‌شود) و آخر وسط می‌ایستد، سر تکان می‌دهد و «?» نشان می‌دهد: چیزی پیدا نشد. */
export function GalleryEmptyHint({ text }: { text: string }) {
    const { t } = useTranslation('projects');

    return (
        <div className={styles.empty}>
            <div className={styles.art} aria-hidden>
                {TILES.map((i) => <span key={i} className={styles.tile} />)}
                <span className={styles.lens}>
                    <span className={styles.glass}><em>?</em></span>
                    <i className={styles.handle} />
                </span>
            </div>
            <p className={styles.title}>{text}</p>
            <p className={styles.text}>{t('gallery_empty_hint')}</p>
        </div>
    );
}
