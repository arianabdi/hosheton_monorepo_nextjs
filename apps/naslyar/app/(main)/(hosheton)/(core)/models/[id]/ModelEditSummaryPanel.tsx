'use client';

import ModelEditSummaryContent, { type ModelEditSummaryContentProps } from './ModelEditSummaryContent';
import styles from './ModelEditSummaryPanel.module.scss';

export type ModelEditSummaryPanelProps = ModelEditSummaryContentProps;

export default function ModelEditSummaryPanel(props: ModelEditSummaryPanelProps) {
    return (
        <aside className={styles.panel} aria-label="خلاصه تنظیمات مدل">
            <div className={styles.panelHeader}>
                <h2 className={styles.title}>خلاصه تنظیمات</h2>
            </div>
            <ModelEditSummaryContent {...props} />
        </aside>
    );
}
