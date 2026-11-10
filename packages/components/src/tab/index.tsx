import React from "react";
import styles from './tab.module.scss'

export function TabButtons({tabs, handleTabClick,useFullWidth, activeTab, ...props}: any) {
    return (
        <div {...props} className={styles.tabButtons}>
            <div className={styles.tabButtonsContainer} style={{width: useFullWidth ? "100%" : "inherit", ...props.tabButtonsContainerStyles}}>
                {
                    tabs.map((tab: any, index: any) => {
                        return(
                            <button
                                key={`tab_button_${index}`}
                                disabled={tab.disabled}
                                onClick={() => handleTabClick(tab.name)}
                                className={activeTab === tab.name ? styles.active : ''}
                                style={{flex: useFullWidth ? 1 : "inherit"}}
                            >
                                {tab.label}
                            </button>
                        )
                    })
                }
            </div>
        </div>
    )
}


export function TabContent({children, ...props}: any) {
    return (
        <div {...props} className={styles.TabContent}>
            {children}
        </div>
    )
}
