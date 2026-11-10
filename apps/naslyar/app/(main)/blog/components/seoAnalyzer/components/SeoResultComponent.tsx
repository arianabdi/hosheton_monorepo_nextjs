'use client';

import styles from './ReadabilityResults.module.scss';
import { COLOR_MAP } from '../utils/colorMap';
import { FiEye } from 'react-icons/fi';
import { Tooltip } from 'react-tooltip';
import React, { useState } from 'react';
import { ImEye } from 'react-icons/im';
import { BsInfoLg } from 'react-icons/bs';
import { ModalHelper } from '@my-workspace/components';

interface SeoResultItem {
    rule: string;
    message: string;
    level: string;
    value?: string | number;
    description?: string;
    detail?: React.ReactNode;
    showView?: boolean;
    type?: string;
}

interface SeoResultComponentProps {
    results: SeoResultItem[];
}

const SeoResultComponent = ({ results }: SeoResultComponentProps) => {
    const [modalComponent, setModalComponent] = useState<React.ReactNode>(<div>empty</div>);
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <>
            <ModalHelper
                open={isModalOpen}
                onOpen={() => setIsModalOpen(true)}
                onClose={() => setIsModalOpen(false)}
                component={modalComponent}
            />
            <div className={styles.container}>
                <div className={styles.resultsBox}>
                    {results.map((item, index) => (
                        <div key={`${item.type}-${index}`} className={styles.resultItem}>
                            <span className={`${styles.bullet} ${COLOR_MAP[item.level]}`} />
                            <div className={styles.content}>
                                <a href="#" className={styles.ruleName} onClick={(e) => e.preventDefault()}>
                                    {item.rule}
                                </a>
                                : <span className={styles.message}>{item.message}</span>
                                {item.value !== undefined && (
                                    <span className={styles.message}>({item.value})</span>
                                )}
                                {item.description && (
                                    <BsInfoLg
                                        className="my-anchor-element"
                                        data-tooltip-id={`${item.type}-${index}`}
                                        color="var(--body-text-color)"
                                        size={18}
                                    />
                                )}
                            </div>
                            {item.detail && (
                                <div className={styles.see}>
                                    <ImEye
                                        color="var(--body-text-color)"
                                        size={18}
                                        onClick={() => {
                                            setModalComponent(<div className={styles.seeContainer}>{item.detail}</div>);
                                            setIsModalOpen(true);
                                        }}
                                    />
                                </div>
                            )}
                            {item.showView && <FiEye className={styles.eyeIcon} size={16} />}
                        </div>
                    ))}
                </div>
                <Tooltip className={styles.seoTooltip} anchorSelect=".my-anchor-element" place="top" />
            </div>
        </>
    );
};

export default SeoResultComponent;
