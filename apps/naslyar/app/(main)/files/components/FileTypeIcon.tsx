import { fileBadgeColor, fileExtLabel } from '../file-utils';
import type { FileManagerFile } from '../files.types';
import styles from './FileTypeIcon.module.scss';

export default function FileTypeIcon({ file }: { file: FileManagerFile }) {
    const label = fileExtLabel(file);
    return (
        <span className={styles.fileTypeIcon} style={{ background: fileBadgeColor(file) }} aria-hidden>
            <span className={styles.fileTypeFold} />
            <span className={`${styles.fileTypeLabel} ${label.length > 3 ? styles.fileTypeLabelLong : ''}`}>{label}</span>
        </span>
    );
}
