'use client';

import Link from 'next/link';
import { LuCompass } from 'react-icons/lu';
import { useTranslation } from 'react-i18next';
import styles from './ExploreSidebarButton.module.scss';
import {RxLightningBolt} from "react-icons/rx";

export default function ExploreSidebarButton() {
    const { t } = useTranslation('menu');
    const { t: tc } = useTranslation('common');
    return (
        <Link href="/explore" className={styles.btn}>
            <span className={styles.iconWrap}>
                <RxLightningBolt size={20} />
            </span>
            <span className={styles.text}>
                <strong>{t('explore')}</strong>
                <small>{tc('view_projects')}</small>
            </span>
        </Link>
    );
}
