'use client';
import React, { useState, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import styles from './SubtitleFilesManager.module.scss';
import { handleUpload } from "@/app/utils/uploadFile";
import { useAuthStore } from "@/app/zustand/store/authStore";
import {ErrorToaster, toFarsiNumber} from "@my-workspace/utils";
import {uploadFileInChunks} from "@/app/utils/chunkUploader/chunkUploader";
import {useAppStore} from "@/app/zustand/store/useAppStore";

interface SubtitleFile {
    _id: string;
    language: string;
    fileId: string;
    filePath: string;
}

interface Props {
    id: string; // شناسه منحصربه‌فرد برای این کامپوننت (مثلا شناسه اپیزود یا سیزن)
    filmId: any;
    seasonId?: any;
    episodeId?: any;
    contentType?: 'MOVIE' | 'SERIES';
    subtitles: SubtitleFile[];
    onUpdate: () => void;
}

const LANGUAGES_MAP: Record<string, { code: string; label: string }> = {
    english: { code: "en", label: "English" },
    german: { code: "de", label: "German" },
    french: { code: "fr", label: "French" },
    spanish: { code: "es", label: "Spanish" },
    turkish: { code: "tr", label: "Turkish" },
    japanese: { code: "ja", label: "Japanese" },
    russian: { code: "ru", label: "Russian" },
    chinese: { code: "zh", label: "Chinese" },
    hindi: { code: "hi", label: "Hindi" },
    arabic: { code: "ar", label: "Arabic" },
    persian: { code: "fa", label: "Persian" },
    italian: { code: "it", label: "Italian" }
};

const CHUNK_SIZE = 5 * 1024 * 1024; // سایز هر تکه: ۵ مگابایت



export default function SubtitleFilesManager({
         id,
         filmId,
         subtitles = [],
         contentType = 'MOVIE',
         seasonId,
         episodeId,
         onUpdate
     }: Props) {
    const { token } = useAuthStore();
    const { baseUrl } = useAppStore();
    const [language, setLanguage] = useState('');
    const [languageCode, setLanguageCode] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [progress, setProgress] = useState(0);

    const abortControllerRef = useRef<AbortController | null>(null);
    const isPausedRef = useRef(false);



    // ساخت یک ID منحصربه‌فرد داینامیک برای جلوگیری از تداخل المان‌های DOM در صفحات تو در تو
    const inputUniqueId = `subtitle-file-input-${id || episodeId || seasonId || Math.random().toString(36).substring(2, 9)}`;

    const handleLanguageChange = (val: string) => {
        setLanguage(val);
        const matched = LANGUAGES_MAP[val.toLowerCase()];
        setLanguageCode(matched ? matched.code : '');
    };

    const handleAddSubtitle = async () => {
        if (!filmId) return toast.error('لطفا ابتدا مشخصات فیلم را وارد کنید');
        if (!language || !file) return toast.error('لطفا زبان و فایل زیرنویس را مشخص کنید');

        setUploading(true);
        setIsPaused(false);
        isPausedRef.current = false;
        abortControllerRef.current = new AbortController();

        try {
            const upload = await uploadFileInChunks({
                file,
                token,
                baseUrl,
                isPausedRef,
                abortSignal: abortControllerRef.current.signal,
                onProgress: (p) => setProgress(p),
                metadata: {
                    language: languageCode,
                    filmId,
                    seasonId: seasonId || undefined,
                    episodeId: episodeId || undefined,
                    mimetype: file.type || 'text/plain',
                    size: file.size,
                }
            });

            if (upload) {
                const targetFileId = upload?.fileInfo?._id || upload?.original?._id || upload?._id;

                await axios.post(`${baseUrl}/api/films/${filmId}/subtitles`, {
                    language,
                    languageCode,
                    fileId: targetFileId,
                    seasonId: seasonId || null,
                    episodeId: episodeId || null,
                }, {
                    headers: { authorization: `Bearer ${token}` },
                });

                toast.success('زیرنویس با موفقیت اضافه شد');
                setLanguage('');
                setFile(null);
                setProgress(0);
                onUpdate();
            }
        } catch (err: any) {
            toast.error('اشکال در افزودن فایل زیرنویس');
        } finally {
            setUploading(false);
        }
    };

    const handlePauseUpload = () => {
        setIsPaused(true);
        isPausedRef.current = true;
        setUploading(false);
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
    };

    const handleDelete = async (subId: string, lang: string) => {
        if (!confirm(`آیا از حذف زیرنویس ${lang} مطمئن هستید؟`)) return;
        try {
            // آدرس‌دهی شرطی برای حذف بر اساس نوع محتوا (فیلم یا اپیزود سریال)
            const deleteUrl = contentType === 'MOVIE'
                ? `${baseUrl}/api/films/${filmId}/subtitles/${subId}`
                : `${baseUrl}/api/films/${filmId}/subtitles/${seasonId}/${episodeId}/${subId}`;

            await axios.delete(deleteUrl, {
                headers: { authorization: `Bearer ${token}` },
            });
            toast.success('زیرنویس با موفقیت حذف شد');
            onUpdate();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'حذف زیرنویس با مشکل مواجه شد');
        }
    };

    return (
        <div className={`${styles.wrapper} ${!filmId ? styles.disabled : ''}`}>
            <div className={styles.header}>
                <h4>فایل‌های زیرنویس <span>({toFarsiNumber(subtitles.length) || "۰"})</span></h4>
                {!filmId && <span className={styles.alertText}>ابتدا اطلاعات فیلم را ثبت کنید</span>}
            </div>
            {subtitles.length > 0 && (
                <div className={styles.tagCloud}>
                    {subtitles.map(sub => (
                        <div key={sub._id} className={styles.subTag} title={`ID: ${sub.fileId}`}>
                            <div className={styles.tagContent}>
                                <span className={styles.tagLang}>{sub.language}</span>
                                <span className={styles.tagSize}>{sub._id}</span>
                            </div>
                            <button onClick={() => handleDelete(sub._id, sub.language)} className={styles.tagDelete}>✕</button>
                        </div>
                    ))}
                </div>
            )}

            <div className={styles.actionRow}>
                <input
                    type="text"
                    disabled={!filmId || uploading}
                    placeholder="زبان"
                    value={language}
                    onChange={e => handleLanguageChange(e.target.value)}
                    className={styles.input}
                    list={`sub-languages-${inputUniqueId}`}
                />
                <datalist id={`sub-languages-${inputUniqueId}`}>
                    {Object.values(LANGUAGES_MAP).map(item => <option key={item.label} value={item.label} />)}
                </datalist>

                <div className={styles.uploadZone}>
                    <input
                        type="file"
                        id={inputUniqueId}
                        accept=".srt,.vtt,.txt,.ass"
                        onChange={e => setFile(e.target.files?.[0] || null)}
                        disabled={!filmId || uploading}
                        className={styles.hiddenInput}
                    />
                    <label htmlFor={inputUniqueId} className={styles.uploadLabel}>
                        {file ? (
                            <span className={styles.previewInfo} title={file.name}>
                                📝 {file.name.length > 15 ? `${file.name.substring(0, 15)}...` : file.name}
                            </span>
                        ) : (
                            <span>📁 انتخاب فایل زیرنویس...</span>
                        )}
                    </label>
                    {file && !uploading && (
                        <button className={styles.clearFile} onClick={() => setFile(null)}>✕</button>
                    )}
                </div>

                {!uploading && !isPaused && (
                    <button
                        onClick={handleAddSubtitle}
                        disabled={!filmId || !file }
                        className={styles.submitBtn}
                    >
                        آپلود
                    </button>
                )}

                {uploading && (
                    <button onClick={handlePauseUpload} className={`${styles.submitBtn} ${styles.pauseBtn}`}>
                        توقف آپلود
                    </button>
                )}

                {!uploading && isPaused && (
                    <button onClick={handleAddSubtitle} className={`${styles.submitBtn} ${styles.resumeBtn}`}>
                        ادامه آپلود
                    </button>
                )}
            </div>







        </div>
    );
}