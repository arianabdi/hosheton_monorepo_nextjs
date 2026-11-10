import React from 'react';
import styles from './TableTheme.module.scss';
interface TableThemeProps {
    children: React.ReactNode;
    className?: string;
}

const TableTheme: React.FC<TableThemeProps> = ({ ...props }) => {
    return (
        <div {...props} className={`${styles.tableWrapper} ${props.className}`}>
            {props.children}
        </div>
    );
};

export default TableTheme;