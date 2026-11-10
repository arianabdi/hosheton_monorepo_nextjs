'use client';

import { LuMousePointerClick } from 'react-icons/lu';
import styles from './ExploreEmptyHint.module.scss';

const CHIPS = [0, 1, 2] as const;
const TILES = [0, 1, 2, 3, 4, 5, 6, 7] as const;

type Props = {
    title: string;
    text: string;
    /** دکمهٔ «نمایش همهٔ قالب‌ها» — فقط وقتی فیلتری فعال است */
    actionLabel?: string;
    onAction?: () => void;
};

/**
 * حالت خالی اکسپلور — هم‌سبک موشن تنظیمات نود و گالری (project-view.module.scss → .emptyHint*):
 * نشانگر روی یک چیپ دسته کلیک می‌کند (موج + آبی می‌شود)، کارت‌های گرید masonry یکی‌یکی «بار» می‌شوند
 * ولی خالی می‌مانند، و ذره‌بین وسط گرید سر تکان می‌دهد و «?» نشان می‌دهد: قالبی پیدا نشد.
 */
export function ExploreEmptyHint({ title, text, actionLabel, onAction }: Props) {
    return (
        <div className={styles.empty}>
            <div className={styles.art} aria-hidden>
                {CHIPS.map((i) => <span key={`chip-${i}`} className={styles.chip} />)}
                {TILES.map((i) => <span key={`tile-${i}`} className={styles.tile} />)}
                <span className={styles.lens}>
                    <span className={styles.glass}><em>?</em></span>
                    <i className={styles.handle} />
                </span>
                <span className={styles.ripple} />
                <LuMousePointerClick className={styles.cursor} />
            </div>
            <p className={styles.title}>{title}</p>
            <p className={styles.text}>{text}</p>
            {actionLabel && onAction ? (
                <button type="button" className={styles.action} onClick={onAction}>{actionLabel}</button>
            ) : null}
        </div>
    );
}
