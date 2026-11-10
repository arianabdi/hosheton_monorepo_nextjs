'use client'

import React from 'react';

import styles from './DeveloperBox.module.scss';
import {BiWrench} from "react-icons/bi";
import {useTranslation} from 'react-i18next';
import {useRouter} from "next/navigation";

interface DeveloperPanelProps {
    onBtnClick?: () => void;
}

const DeveloperBox: React.FC<DeveloperPanelProps> = ({ }) => {

    const router = useRouter()
    const { t } = useTranslation('common');
    return (
        <div className={styles.card}>
            {/* بخش آیکون */}
            <div className={styles.iconWrapper}>
                <BiWrench size={24} color={"#fff"} />
            </div>

            {/* عنوان */}
            <h3 className={styles.title}>{t('developers_panel')}</h3>

            {/* توضیحات */}
            <p className={styles.description}>
                {t('developers_desc')}
            </p>

            {/* دکمه اکشن */}
            <button className={styles.button} onClick={()=>{router.push('/starter')}}>
                {t('get_api_key')}
            </button>
        </div>
    );
};

export default DeveloperBox;