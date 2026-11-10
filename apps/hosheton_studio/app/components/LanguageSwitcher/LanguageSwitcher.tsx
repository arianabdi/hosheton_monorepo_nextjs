'use client';

import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {ModalHelper} from '@my-workspace/components';
import {useAppStore} from '@/app/zustand/store/useAppStore';
import {SUPPORTED_LANGUAGES, type AppLanguage} from '@/app/lib/i18n/config';
import {syncLanguage} from '@/app/lib/i18n/provider';
import styles from './LanguageSwitcher.module.scss';
import {MdLanguage} from 'react-icons/md';

type LanguagePickerPanelProps = {
    onSelected?: () => void;
};

export function LanguagePickerPanel({onSelected}: LanguagePickerPanelProps) {
    const {t} = useTranslation('common');
    const lang = useAppStore((s) => s.lang);
    const setLanguage = useAppStore((s) => s.setLanguage);

    function selectLanguage(code: AppLanguage) {
        setLanguage(code);
        syncLanguage(code);
        onSelected?.();
    }

    return (
        <div className={styles.pickerShell}>
            <div className={styles.pickerTitle}>{t('language')}</div>
            <div className={styles.pickerPanel}>
                {SUPPORTED_LANGUAGES.map((item) => (
                    <button
                        key={item.code}
                        type="button"
                        className={`${styles.pickerItem} ${item.code === lang ? styles.active : ''}`}
                        onClick={() => selectLanguage(item.code)}
                    >
                        <span>{item.nativeLabel}</span>
                        <span className={styles.code}>{item.code.toUpperCase()}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}

export default function LanguageSwitcher({compact = false}: {compact?: boolean; embedded?: boolean}) {
    const {t} = useTranslation('common');
    const lang = useAppStore((s) => s.lang);
    const [open, setOpen] = useState(false);

    const current = SUPPORTED_LANGUAGES.find((l) => l.code === lang) || SUPPORTED_LANGUAGES[0];

    return (
        <div className={styles.wrap}>
            <button
                type="button"
                className={styles.trigger}
                onClick={() => setOpen(true)}
                aria-label={t('language')}
            >
                <MdLanguage size={18}/>
                {!compact && <span>{current.nativeLabel}</span>}
            </button>
            <ModalHelper
                open={open}
                onClose={() => setOpen(false)}
                hideCloseBtn
                size="sm"
                sheetTitle={t('language')}
                props={{
                    style: {
                        background: 'var(--input-background-color)',
                        color: 'var(--body-text-color)',
                    },
                }}
                component={<LanguagePickerPanel onSelected={() => setOpen(false)} />}
            />
        </div>
    );
}
