'use client'

import styles from "../chat/portal.module.scss";
import React from "react";
import { motion } from "framer-motion";
import {ConvertDateToCalendarString} from "@my-workspace/utils";
import {AiLogoSelection} from "@/app/(main)/chat/components/AiLogoSelection";


export function HistoryItem({title, index, _id, providerName,icon, modelDisplayName, updatedAt, isSelected, onSelect, ...props}: any) {

    return (
        <motion.div
            key={_id}
            layout
            initial={index === 0 ? { opacity: 0, y: -12 } : false}
            animate={{ opacity: 1, y: 0 }}
        >
            <div {...props} className={`${styles.datasetCard} ${props.className} ${isSelected ? styles.selectedDatasetCard : ''}`} onClick={() => {
                onSelect()
            }}>
                <div className={styles.cardHeader}>
                    <div className={styles.iconAndDate}>
                        {
                            icon ? icon : (!providerName ? '' :
                                <div className={styles.icon}>
                                    <AiLogoSelection name={providerName}/>
                                </div>)

                        }

                        {/*<h6>{providerName} ({modelDisplayName})</h6>*/}
                        <p>{title}</p>
                    </div>
                    {
                        !updatedAt ? '' :
                            <p className={styles.date}>{ConvertDateToCalendarString(updatedAt)}</p>
                    }

                </div>

            </div>
        </motion.div>
    );
}