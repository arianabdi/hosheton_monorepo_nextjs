import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import styles from './ImageUpload.module.scss';
import { useAuthStore } from "@/app/zustand/store/authStore";
import { useAppStore } from "@/app/zustand/store/useAppStore";
import { IoCloseSharp } from "react-icons/io5";
import { uploadFileInChunks } from "@/app/utils/chunkUploader/chunkUploader";
import { ErrorToaster } from "@my-workspace/utils";

interface Props {
    onUpload: (urls: any) => void;
    onRemove?: (id: string) => void | Promise<void>;
    currentImage?: { original: any; thumbnail: any };
    currentImages?: { original: any; thumbnail: any }[];
    label: string;
    multiple?: boolean;
    accept?: string;
    filmId?: string | null;
}

const mapChunkUploadResult = (upload: any) => {
    if (upload?.original && upload?.thumbnail) {
        return upload;
    }

    const original = upload?.original || upload?.fileInfo || upload;
    return {
        original,
        thumbnail: upload?.thumbnail || original,
    };
};

const getImagePreviewUrl = (image?: { key?: string; path?: string }) => {
    // path = storage the file was uploaded to (stays right after a storage switch); key+env only as fallback
    if (image?.path) return image.path;
    if (image?.key && process.env.NEXT_PUBLIC_S3_ENDPOINT) {
        return `${process.env.NEXT_PUBLIC_S3_ENDPOINT}/${image.key}`;
    }
    return '';
};

const ImageUpload: React.FC<Props> = ({
    onUpload,
    onRemove,
    multiple = false,
    currentImage,
    currentImages = [],
    label,
    accept = "image/*",
    filmId,
}) => {
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [preview, setPreview] = useState<string>(getImagePreviewUrl(currentImage?.thumbnail));

    const abortControllerRef = useRef<AbortController | null>(null);
    const isPausedRef = useRef(false);

    useEffect(() => {
        setPreview(getImagePreviewUrl(currentImage?.thumbnail));
    }, [currentImage]);

    const uploadImage = async (file: File) => {
        const { token: activeToken } = useAuthStore.getState();
        const { baseUrl: activeBaseUrl } = useAppStore.getState();

        if (!activeToken || !activeBaseUrl) {
            throw new Error('برای آپلود باید وارد حساب کاربری شوید');
        }

        abortControllerRef.current = new AbortController();
        isPausedRef.current = false;

        const upload = await uploadFileInChunks({
            file,
            token: activeToken,
            baseUrl: activeBaseUrl,
            isPausedRef,
            abortSignal: abortControllerRef.current.signal,
            onProgress: (value) => setProgress(value),
            metadata: {
                mimetype: file.type || 'image/jpeg',
                size: file.size,
                filmId: filmId || undefined,
            },
        });

        if (!upload) {
            throw new Error('آپلود متوقف شد');
        }

        return mapChunkUploadResult(upload);
    };

    const handleFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const filesArray = Array.from(e.target.files);
        setUploading(true);
        setProgress(0);

        try {
            const newUploads = [];

            for (const file of filesArray) {
                const result = await uploadImage(file);
                newUploads.push(result);
            }

            onUpload(newUploads);
            toast.success('عکس‌ها با موفقیت آپلود شدند');
        } catch (err: any) {
            ErrorToaster(err);
            toast.error(err?.message || 'خطا در آپلود عکس‌ها');
        } finally {
            setUploading(false);
            setProgress(0);
            e.target.value = '';
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];

        const previewUrl = URL.createObjectURL(file);
        setPreview(previewUrl);
        setUploading(true);
        setProgress(0);

        try {
            const upload = await uploadImage(file);
            onUpload(upload);
            toast.success(`${label} با موفقیت آپلود شد`);
        } catch (err: any) {
            ErrorToaster(err);
            toast.error(err?.message || `خطا در آپلود ${label.toLowerCase()}`);
            setPreview(getImagePreviewUrl(currentImage?.thumbnail));
        } finally {
            setUploading(false);
            setProgress(0);
            e.target.value = '';
        }
    };

    const clearImage = async () => {
        if (currentImage?.original?._id && onRemove) {
            await onRemove(currentImage.original._id);
        }

        setPreview('');
        onUpload(null);
    };

    return (
        <div className={styles.imageUpload}>
            <label className={styles.label}>{label}</label>

            {
                !multiple ?
                    <div>
                        {(preview || currentImage?.thumbnail) && (
                            <div className={styles.previewContainer}>
                                <img src={preview || getImagePreviewUrl(currentImage?.thumbnail)} alt={label} className={styles.preview} />
                                <button onClick={clearImage} className={styles.clearBtn} type="button" disabled={uploading}>
                                    <IoCloseSharp size={28} color={"#fff"}/>
                                </button>
                            </div>
                        )}
                        {uploading && (
                            <div className={styles.uploadProgress}>
                                <div className={styles.progressBar}>
                                    <div className={styles.progressFill} style={{ width: `${progress}%` }} />
                                </div>
                                <span>{progress}%</span>
                            </div>
                        )}
                        <div className={styles.uploadArea}>
                            <input
                                type="file"
                                accept={accept}
                                onChange={handleFileChange}
                                disabled={uploading}
                                className={styles.fileInput}
                                id={`upload-${label.replace(/\s/g, '')}`}
                            />
                            <label htmlFor={`upload-${label.replace(/\s/g, '')}`} className={styles.uploadLabel}>
                                {uploading ? `در حال آپلود... ${progress}%` : ((preview || currentImage?.thumbnail) ? 'تغییر عکس' : 'انتخاب عکس')}
                            </label>
                        </div>
                    </div> :
                    <div>
                        {currentImages.length > 0 && (
                            <div className={styles.screenshotPreviewGrid}>
                                {currentImages.map((item, index) => (
                                    <div key={item?.original?._id || index} className={styles.previewContainer}>
                                        <img src={`${process.env.NEXT_PUBLIC_S3_ENDPOINT}/${item?.thumbnail?.key}`} alt={`${label}-${index}`} className={styles.screenshotPreview} />
                                        <button onClick={() => onRemove?.(item?.original._id)} className={styles.clearBtn} type="button" disabled={uploading}>
                                            <IoCloseSharp size={20} color={"#fff"}/>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        {uploading && (
                            <div className={styles.uploadProgress}>
                                <div className={styles.progressBar}>
                                    <div className={styles.progressFill} style={{ width: `${progress}%` }} />
                                </div>
                                <span>{progress}%</span>
                            </div>
                        )}
                        <div className={styles.uploadArea}>
                            <input
                                type="file"
                                accept={accept}
                                onChange={handleFilesChange}
                                disabled={uploading}
                                className={styles.fileInput}
                                id={`upload-${label.replace(/\s/g, '')}`}
                                multiple
                            />
                            <label htmlFor={`upload-${label.replace(/\s/g, '')}`} className={styles.uploadLabel}>
                                {uploading ? `در حال آپلود... ${progress}%` : 'انتخاب عکس‌ها'}
                            </label>
                        </div>
                    </div>
            }
        </div>
    );
};

export default ImageUpload;
