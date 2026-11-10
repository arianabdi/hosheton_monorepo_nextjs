'use client'

import styles from '../GoogleSearchPreviewSEO/GoogleSearchPreviewSEO.module.scss';
import { FiMoreVertical } from 'react-icons/fi';

interface GoogleSearchPreviewSEOProps {
    title: string;
    name: string;
    url: string;
    description: string;
}

export function GoogleSearchPreviewSEO({ title, name, url, description }: GoogleSearchPreviewSEOProps) {
    return (
        <div className={styles.preview}>
            <div className={styles.header}>
                <div className={styles.logo} />
                <div className={styles.nameAndUrl}>
                    <p className={styles.name}>{name}</p>
                    <div className={styles.urlContainer}>
                        <p className={styles.url}>{url}</p>
                        <FiMoreVertical size={14} color="var(--body-text-color)" />
                    </div>
                </div>
            </div>
            <h3 className={styles.title}>{title}</h3>
            <p className={styles.description}>{description}</p>
        </div>
    );
}
