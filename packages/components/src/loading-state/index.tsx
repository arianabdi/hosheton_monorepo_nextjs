// LoadingStates.tsx

import styles from './loading-state.module.scss';

export function LoadingState() {
    return (
        <div className={styles.loadingContainer}>
            <div className={styles.customSpinner}>
                <Spinner size="sm" color="light" />
            </div>
        </div>
    );
}

export function TableLoadingState() {
    return (
        <div className={styles.tableContainer}>
            <div className={styles.customSpinner}>
                <Spinner size="sm" color="dark" />
            </div>
        </div>
    );
}


interface SpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    color?: 'light' | 'dark' | 'primary';
    className?: string;
}

export function Spinner({ size = 'md', color = 'light', className = '' }: SpinnerProps) {
    return (
        <div
            className={`${styles.spinner} ${styles[size]} ${styles[color]} ${className}`.trim()}
            role="status"
            aria-label="Loading"
        />
    );
}