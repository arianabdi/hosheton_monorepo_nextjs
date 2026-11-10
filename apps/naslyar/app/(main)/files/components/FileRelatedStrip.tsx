'use client';

import { formatFileSize } from '@my-workspace/utils';
import { filePreviewUrl, relatedFileLabel } from '../file-utils';
import type { FileManagerFile } from '../files.types';
import styles from '../Files.module.scss';

export default function FileRelatedStrip({
    files,
    onOpen,
    max = 4,
}: {
    files?: FileManagerFile[];
    onOpen: (file: FileManagerFile) => void;
    /** حداکثر تعداد بندانگشتی؛ بقیه با «+N» */
    max?: number;
}) {
    if (!files?.length) return null;
    const shown = files.slice(0, max);
    const extra = files.length - shown.length;
    return (
        <div className={styles.relatedRow} onClick={(event) => event.stopPropagation()}>
            {shown.map((file) => {
                const preview = filePreviewUrl(file);
                return (
                    <button
                        key={file._id}
                        type="button"
                        className={styles.relatedThumb}
                        title={`${relatedFileLabel(file)} · ${formatFileSize(file.size)}`}
                        onClick={() => onOpen(file)}
                    >
                        {preview ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={preview} alt={relatedFileLabel(file)} />
                        ) : (
                            <span>{relatedFileLabel(file).slice(0, 1)}</span>
                        )}
                    </button>
                );
            })}
            {extra > 0 && <span className={styles.relatedMore}>+{extra}</span>}
        </div>
    );
}
