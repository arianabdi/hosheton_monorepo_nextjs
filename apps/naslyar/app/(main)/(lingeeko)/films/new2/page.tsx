'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import axios from 'axios';

import styles from './FilmForm.module.scss';
import { Field } from "@my-workspace/components";
import VideoFilesManager from "@/app/(main)/components/VideoFilesManager/VideoFilesManager";
import SubtitleFilesManager from "@/app/(main)/components/SubtitleFilesManager/SubtitleFilesManager";
import { Container, Wrapper } from "@/app/(main)/layout";
import { useAppStore } from "@/app/zustand/store/useAppStore";
import { useAuthStore } from "@/app/zustand/store/authStore";
import {ErrorToaster, SuccessToaster} from "@my-workspace/utils";
import ImageUpload from "@/app/(main)/components/ImageUpload/ImageUpload";
import ActorsDirectorsManager from "@/app/(main)/components/ActorsDirectorsManager/ActorsDirectorsManager";
import { useUploadQueueStore } from '@/app/zustand/store/useUploadQueueStore';

export type ContentType = 'MOVIE' | 'SERIES';

export interface Episode {
    _id: string;
    title: string;
    duration: number;
    thumbnail?: any;
    videoFiles: any[];
    subtitleFiles: any[];
}

export interface Season {
    _id: string;
    seasonNumber: number;
    episodes: Episode[];
    isExpanded?: boolean;
}

export interface Film {
    _id?: string;
    contentType: ContentType;
    name: string;
    slug: string;
    description: string;
    imdbGrade: number;
    category: string;
    duration: number;
    screenshots?: any[];
    banner?: any;
    cover?: any;
    actors: any[];
    directors: any[];
    videoFiles: any[];
    subtitleFiles: any[];
    seasons: Season[];
}

const FilmForm2: React.FC = () => {
    const router = useRouter();
    const params = useParams();
    const { id } = params;
    const isNew = !id;
    const filmId = !id ? null : (id as string);

    const { token } = useAuthStore();
    const { baseUrl } = useAppStore();

    const [selectedEpisodes, setSelectedEpisodes] = useState<string[]>([]);
    const [film, setFilm] = useState<Film>({
        contentType: 'MOVIE', name: '', slug: '', description: '', imdbGrade: 0, category: '', duration: 0,
        actors: [], directors: [], videoFiles: [], subtitleFiles: [], seasons: []
    });
    const [expand, setExpand] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);
    const lastCompletedFilmId = useUploadQueueStore((state) => state.lastCompletedFilmId);

    const loadFilm = async (silent = false) => {
        if (isNew || !filmId) return;
        // اگر سیستم بی‌صدا (silent) آپدیت شود، دیگر کل فرم ناپدید نمی‌شود و اسکرول بالا نمی‌پرد
        if (!silent) setFetching(true);
        try {
            const response = await axios.get(`${baseUrl}/api/films/${filmId}`,
                {headers: { authorization: `Bearer ${token}` }});
            if (response.data.statusCode === 200) {
                setFilm(response.data.data);
            }
        } catch (err) {

            ErrorToaster(err)
            console.log('خطا در دریافت اطلاعات محتوا از سرور');
        } finally {
            setFetching(false);
        }
    };

    useEffect(() => {
        loadFilm(false);
    }, [filmId, isNew]);

    useEffect(() => {
        if (lastCompletedFilmId && lastCompletedFilmId === filmId) {
            loadFilm(true);
        }
    }, [lastCompletedFilmId, filmId]);

    const handleChange = (field: keyof Film, value: any) => {
        setFilm(prev => ({ ...prev, [field]: value }));
    };

    const toggleContentType = (type: ContentType) => {
        setFilm(prev => ({ ...prev, contentType: type }));
    };

    const handleEpisodeTitleChange = (seasonId: string, episodeId: string, newTitle: string) => {
        setFilm(prev => ({
            ...prev,
            seasons: prev?.seasons.map(s => s._id === seasonId ? {
                ...s,
                episodes: s.episodes.map(e => e._id === episodeId ? { ...e, title: newTitle } : e)
            } : s)
        }));
    };

    const addSeason = async () => {
        const newSeason: Season = {
            _id: `temp-${Date.now()}`,
            seasonNumber: (film.seasons?.length || 0) + 1,
            episodes: [],
            isExpanded: true
        };

        try {
            setLoading(true);
            const res =await axios.put(`${baseUrl}/api/films/${filmId}/season/add`, newSeason,
                {headers: { authorization: `Bearer ${token}` }});

            if(res.data.statusCode === 200){
                setFilm(res.data.data);
                console.log('فصل با موفقیت اضافه شد');
                SuccessToaster({message: 'فصل با موفقیت اضافه شد'})
                setLoading(false);
            }
        } catch (err) {

            ErrorToaster(err)
            console.log('خطا در افزودن فصل');
            setLoading(false);
        }
    };

    const deleteSeason =async (seasonId: string) => {
        if (confirm('آیا از حذف این فصل و تمام قسمت‌های آن مطمئن هستید؟')) {

            const updatedFilm = {
                ...film,
                seasons: film?.seasons?.filter(s => s._id !== seasonId)
            };

            try {
                setLoading(true);
                const res =await axios.put(`${baseUrl}/api/films/${filmId}/season/delete/${seasonId}`, updatedFilm,
                    {headers: { authorization: `Bearer ${token}` }});

                if(res.data.statusCode === 200){
                    setFilm(res.data.data);
                    console.log('فصل با موفقیت حذف شد');
                    SuccessToaster({message: 'فصل با موفقیت حذف شد'})
                    setLoading(false);
                }
            } catch (err) {

                ErrorToaster(err)
                console.log('خطا در ذخیره قسمت جدید');
                setLoading(false);
            }
        }
    };

    const toggleSeasonExpand = (seasonId: string) => {
        setFilm(prev => ({
            ...prev,
            seasons: prev?.seasons?.map(s => s._id === seasonId ? { ...s, isExpanded: !s.isExpanded } : s)
        }));
    };

    const addEpisode = async (seasonId: string) => {
        const season = film.seasons?.find(s => s._id === seasonId);
        const episodeNumber = (season?.episodes?.length || 0) + 1;
        const newEpisode: Episode = {
            _id: `temp-ep-${Date.now()}`,
            title: `قسمت ${episodeNumber}`,
            duration: 45,
            videoFiles: [],
            subtitleFiles: []
        };

        try {
            setLoading(true);
            const res =await axios.put(`${baseUrl}/api/films/${filmId}/episode/add/${seasonId}`, newEpisode,
                {headers: { authorization: `Bearer ${token}` }});

            if(res.data.statusCode === 200){
                setFilm(res.data.data);
                console.log('قسمت جدید ذخیره شد');
                SuccessToaster({message: 'قسمت جدید ذخیره شد'})

                setLoading(false);
            }
        } catch (err) {

            ErrorToaster(err)
            console.log('خطا در ذخیره قسمت جدید');

            setLoading(false);
        }
    };

    const deleteEpisode =async (seasonId: string, episodeId: string) => {
        if (confirm('از حذف این قسمت مطمئن هستید؟')) {

            const updatedFilm = {
                ...film,
                seasons: film?.seasons?.map(s =>
                    s._id === seasonId ? { ...s, episodes: s.episodes.filter(e => e._id !== episodeId)} : s
                )
            };

            try {
                setLoading(true);
                const res =await axios.put(`${baseUrl}/api/films/${filmId}/episode/delete/${seasonId}/${episodeId}`, updatedFilm,
                    {headers: { authorization: `Bearer ${token}` }});

                if(res.data.statusCode === 200){
                    setFilm(res.data.data);
                    console.log('قسمت با موفقیت حذف شد');
                    SuccessToaster({message: 'قسمت با موفقیت حذف شد'})
                    setLoading(false);
                }
            } catch (err) {
                console.log('خطا در حذف اپیزود');
                ErrorToaster(err)
                setLoading(false);
            }
        }



    };

    const toggleEpisodeSelection = (episodeId: string) => {
        setSelectedEpisodes(prev =>
            prev.includes(episodeId) ? prev.filter(id => id !== episodeId) : [...prev, episodeId]
        );
    };

    const handleDeleteFilm = async () => {
        if (!confirm('هشدار: آیا از حذف کل این محتوا مطمئن هستید؟ این عملیات غیرقابل بازگشت است.')) return;
        try {
            await axios.delete(`${baseUrl}/api/films/${filmId}`,
                {headers: { authorization: `Bearer ${token}` }});
            console.log('محتوا با موفقیت حذف شد.');
            SuccessToaster({message: 'محتوا با موفقیت حذف شد'})
            router.push('/films');
        } catch (err) {

            ErrorToaster(err)
            console.log('خطا در حذف محتوا');
        }
    };

    const saveFilm = async () => {
        if (!film.name || !film.slug || !film.category) {

            ErrorToaster({message: 'لطفا فیلدهای اجباری ستاره‌دار را تکمیل کنید'})
            return ;
        }

        setLoading(true);
        try {
            if (isNew) {
                const response = await axios.post(`${baseUrl}/api/films`, film,
                    {headers: { authorization: `Bearer ${token}` }});
                console.log('محتوای جدید با موفقیت ایجاد شد');
                SuccessToaster({message: 'محتوای جدید با موفقیت ایجاد شد'})
                router.push(`/films/${response.data.data?._id || response.data._id}`);
            } else {
                await axios.put(`${baseUrl}/api/films/${filmId}`, film,
                    {headers: { authorization: `Bearer ${token}` }});
                console.log('تغییرات با موفقیت در سرور ذخیره شد');
                SuccessToaster({message: 'تغییرات با موفقیت در سرور ذخیره شد'})
            }
        } catch (err: any) {
            console.log(err.response?.data?.message || 'خطا در ذخیره‌سازی اطلاعات');
            ErrorToaster(err)
        } finally {
            setLoading(false);
        }
    };

    // لودینگ اولیه صفحه (فقط یک‌بار در ابتدای ورود اتفاق می‌افتد)
    if (fetching && film.name === '') return (
        <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
        </div>
    );
    const handleMultipleImagesUpload = async (field: 'screenshots', imagesArray: any[]) => {
        try {
            setLoading(true);
            if (filmId) {
                // ارسال آرایه کامل تصاویر به بک‌اند
                const res = await axios.post(`${baseUrl}/api/films/${filmId}/${field}`, { screenshots: imagesArray.filter(i=> i !== null) }, {
                    headers: { "authorization": `Bearer ${token}` },
                });
                if (res.data.statusCode === 200) {

                    toast.success('اسکرین‌شات‌ها با موفقیت ذخیره شدند');
                    setFilm(prev => ({ ...prev, [field]: res.data.data[field] }));
                }
            } else {

                // ذخیره موقت در استیت برای فیلم‌هایی که هنوز ساختارشان در دیتابیس ایجاد نشده
                setFilm(prev => ({ ...prev, [field]: imagesArray }));
                toast.info('تصاویر به صورت موقت انتخاب شدند. پس از ذخیره فیلم، نهایی می‌شود.');
            }
        } catch (err: any) {
            ErrorToaster(err, '');
        } finally {
            setLoading(false);
        }
    };

    const handleImageUpload = async (field: 'banner' | 'cover', event: { original: any, thumbnail: any } | null) => {
        try {
            if (!event) {
                setFilm(prev => ({ ...prev, [field]: null }));
                return;
            }

            setLoading(true);
            if (filmId) {
                const res = await axios.post(`${baseUrl}/api/films/${filmId}/${field}`, event, {
                    headers: { "authorization": `Bearer ${token}` },
                });
                if (res.data.statusCode === 200) {
                    toast.success('تصویر با موفقیت آپلود و ذخیره شد');
                    setFilm(prev => ({ ...prev, [field]: res.data.data?.[field] || event }));
                }
            } else {
                setFilm(prev => ({ ...prev, [field]: event }));
                toast.info('تصویر به صورت موقت انتخاب شد. پس از ذخیره فیلم، نهایی می‌شود.');
            }
        } catch (err: any) {
            ErrorToaster(err, '');
        } finally {
            setLoading(false);
        }
    };

    async function handleRemoveImage(id, type) {
        try {
            setLoading(true);
            if (filmId) {
                const res = await axios.delete(`${baseUrl}/api/films/${filmId}/${type}/${id}`, {
                    headers: { "authorization": `Bearer ${token}` },
                });
                if (res.data.statusCode === 200) {
                    toast.success('تصویر با موفقیت حذف شد');
                    setFilm(prev => ({ ...prev, [type]: res.data?.data[type] }));
                    setLoading(false);

                }
            }
        } catch (err: any) {
            ErrorToaster(err, '');
            setLoading(false);
        } finally {
        }
    }

    return (
        <Container>
            <Wrapper>
                <div dir="rtl" className={styles.editorContainer}>
                    {/* یک نوار وضعیت لودینگ پس‌زمینه کوچک بدون حذف کردن کل صفحه */}
                    {fetching && <div className={styles.topMiniProgressBar}>در حال به‌روزرسانی اطلاعات لیست...</div>}

                    <header className={styles.editorHeader}>
                        <div className={styles.headerInfo}>
                            <h1 className={styles.title}>{isNew ? 'ثبت محتوای جدید' : `ویرایش: ${film.name}`}</h1>
                        </div>
                        <div className={styles.headerActions}>
                            {!isNew && (
                                <button onClick={handleDeleteFilm} className={styles.btnDanger}>
                                    🗑 حذف محتوا
                                </button>
                            )}
                            <button onClick={() => router.push('/films')} className={styles.backBtn}>
                                بازگشت ←
                            </button>
                        </div>
                    </header>

                    <div className={styles.typeSelectorGroup}>
                        <h3 className={styles.blockTitle}>نوع محتوا را مشخص کنید:</h3>
                        <div className={styles.radioGroup}>
                            <label className={`${styles.radioCard} ${film.contentType === 'MOVIE' ? styles.active : ''}`}>
                                <input type="radio" checked={film.contentType === 'MOVIE'} onChange={() => toggleContentType('MOVIE')} />
                                🎬 فیلم سینمایی (تک قسمتی)
                            </label>
                            <label className={`${styles.radioCard} ${film.contentType === 'SERIES' ? styles.active : ''}`}>
                                <input type="radio" checked={film.contentType === 'SERIES'} onChange={() => toggleContentType('SERIES')} />
                                📺 سریال (فصل و قسمت)
                            </label>
                        </div>
                    </div>

                    <div className={styles.formSection}>
                        <h3 className={styles.blockTitle}>اطلاعات پایه‌ای</h3>

                        <div className={styles.formContainer}>
                            <div className={styles.gridThreeCols}>
                                <Field label="نام محتوا *" id="name" name="name" type="text" value={film.name} onChange={(v) => handleChange('name', v)} required />
                                <Field label="شناسه یکتا (Slug) *" id="slug" name="slug" type="text" value={film.slug} onChange={(v) => handleChange('slug', v)} required />
                                <Field label="دسته‌بندی / ژانر *" id="category" name="category" type="text" value={film.category} onChange={(v) => handleChange('category', v)} required />
                            </div>
                            <Field label="توضیحات و خلاصه" id="description" name="description" type="textarea" rows={18} value={film.description} onChange={(v) => handleChange('description', v)} />

                            <div className={styles.gridThreeCols}>
                                <Field label="نمره IMDB" id="imdbGrade" name="imdbGrade" type="number" value={film.imdbGrade} onChange={(v) => handleChange('imdbGrade', parseFloat(v))} step={0.1} />

                                {film.contentType === 'MOVIE' && (
                                    <Field label="مدت زمان (دقیقه)" id="duration" name="duration" type="number" value={film.duration} onChange={(v) => handleChange('duration', parseInt(v))} />
                                )}
                            </div>
                        </div>

                    </div>

                    <div className={styles.formSection}>
                        <h3 className={styles.blockTitle}>کاور و پوستر</h3>
                        <div className={styles.imageGrid}>
                            <div className={styles.uploadCard}>
                                <ImageUpload
                                    label="تصویر بنر (عریض)"
                                    filmId={filmId}
                                    currentImage={film.banner}
                                    onRemove={(id) => handleRemoveImage(id, 'banner')}
                                    onUpload={(e) => handleImageUpload('banner', e)}
                                />
                            </div>
                            <div className={styles.uploadCard}>
                                <ImageUpload
                                    label="تصویر کاور (پوستر)"
                                    filmId={filmId}
                                    currentImage={film.cover}
                                    onRemove={(id) => handleRemoveImage(id, 'cover')}
                                    onUpload={(e) => handleImageUpload('cover', e)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className={styles.formSection}>
                        <h3 className={styles.blockTitle}>اسکرین شات ها</h3>
                        <div className={styles.imagesGrid}>
                            <ImageUpload
                                multiple={true}
                                filmId={filmId}
                                label="اسکرین شات"
                                onRemove={async (id)=>{await handleRemoveImage(id, 'screenshots')}}
                                currentImages={film.screenshots || []}
                                onUpload={async (uploadedImages) => {
                                    await handleMultipleImagesUpload('screenshots', uploadedImages)
                                }}
                            />
                        </div>
                    </div>

                    {filmId && (
                        <div className={styles.formSection}>
                            <h3 className={styles.blockTitle}>هنرمندان و عوامل</h3>
                            <div className={styles.managerWrapper}>
                                <ActorsDirectorsManager
                                    filmId={filmId}
                                    type="actors"
                                    existing={film.actors}
                                    onUpdate={() => loadFilm(true)}
                                />
                                <ActorsDirectorsManager
                                    filmId={filmId}
                                    type="directors"
                                    existing={film.directors}
                                    onUpdate={() => loadFilm(true)}
                                />
                            </div>
                        </div>
                    )}

                    {film.contentType === 'MOVIE' && (
                        <div className={styles.formSection}>
                            <h3 className={styles.blockTitle}>منابع دیجیتال (مخصوص فیلم)</h3>
                            {!filmId ? (
                                <p className={styles.emptyState}>ابتدا محتوا را ذخیره کنید، سپس فایل‌های ویدیو و زیرنویس را مدیریت کنید.</p>
                            ) : (
                                <div className={styles.filesGrid}>
                                    <div className={styles.episodeRowContainer}>
                                        <div className={styles.episodeRow}>
                                            <div className={styles.thumbnailWrapper}>
                                                <img src={film.cover?.thumbnail || film.banner?.thumbnail || '/default-thumb.jpg'} alt="Thumb" />
                                            </div>
                                            <div className={styles.episodeInfo}>
                                                <span className={styles.epTitle}>{film.name}</span>
                                                <div className={styles.epMeta}>
                                                    <span className={styles.metaDuration}>{film.duration}:00</span>
                                                    <span className={styles.metaId}>{film._id}</span>
                                                </div>
                                            </div>
                                            <div className={styles.episodeControls}>
                                                <button
                                                    className={styles.controlBtn}
                                                    onClick={() => setExpand(prev => ({ ...prev, [`subtitle_${filmId}`]: !prev[`subtitle_${filmId}`] }))}
                                                >
                                                    زیرنویس‌ها ({film.subtitleFiles?.length || 0})
                                                </button>
                                                <button
                                                    className={styles.controlBtn}
                                                    onClick={() => setExpand(prev => ({ ...prev, [`video_quality_${filmId}`]: !prev[`video_quality_${filmId}`] }))}
                                                >
                                                    ویدیوها ({film.videoFiles?.length || 0})
                                                </button>
                                            </div>
                                        </div>

                                        {expand[`subtitle_${filmId}`] && (
                                            <SubtitleFilesManager
                                                id={filmId}
                                                filmId={filmId}
                                                subtitles={film.subtitleFiles}
                                                onUpdate={() => loadFilm(true)}
                                            />
                                        )}
                                        {expand[`video_quality_${filmId}`] && (
                                            <VideoFilesManager
                                                id={filmId}
                                                filmId={filmId}
                                                filmName={film.name}
                                                contentType={film.contentType}
                                                videos={film.videoFiles}
                                                onUpdate={() => loadFilm(true)}
                                            />
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {film.contentType === 'SERIES' && (
                        <div className={styles.seriesManagerContainer}>
                            <div className={styles.seriesManagerHeader}>
                                <h3 className={styles.blockTitle}>مدیریت فصل‌ها و قسمت‌ها</h3>
                                {filmId && (
                                    <div className={styles.bulkActions}>
                                        {selectedEpisodes.length > 0 && (
                                            <button className={styles.bulkBtn}>ویرایش گروهی ({selectedEpisodes.length})</button>
                                        )}
                                        <button onClick={addSeason} className={styles.addBtn}>+ افزودن فصل جدید</button>
                                    </div>
                                )}
                            </div>

                            {!filmId ? (
                                <p className={styles.emptyState}>ابتدا محتوا را ذخیره کنید، سپس فصل‌ها و قسمت‌ها را مدیریت کنید.</p>
                            ) : (
                            <div className={styles.treeViewport}>
                                {film?.seasons?.map((season) => (
                                    <div key={season._id} className={styles.sectionGroup}>
                                        <div className={styles.stickyHeader}>
                                            <div className={styles.headerTitleGroup} onClick={() => toggleSeasonExpand(season._id)}>
                                                <span className={`${styles.arrow} ${season.isExpanded ? styles.expanded : ''}`}>❯</span>
                                                <span className={styles.headerTitle}>فصل {season.seasonNumber}</span>
                                                <span className={styles.episodeCountBadge}> {season.episodes.length} قسمت</span>
                                            </div>
                                            <div className={styles.seasonActions}>
                                                <button onClick={() => addEpisode(season._id)} className={styles.actionBtnSuccess}>+ افزودن قسمت</button>
                                                <button onClick={() => deleteSeason(season._id)} className={styles.actionBtnDanger}>حذف فصل</button>
                                            </div>
                                        </div>

                                        {season.isExpanded && (
                                            <div className={styles.sectionContent}>
                                                {season.episodes.length === 0 ? (
                                                    <p className={styles.emptyState}>هنوز قسمتی برای این فصل ثبت نشده است.</p>
                                                ) : (
                                                    <div className={styles.episodesList}>
                                                        {season.episodes.map(ep => (
                                                            <div key={`container_${ep._id}`} className={styles.episodeRowContainer}>
                                                                <div className={styles.episodeRow}>
                                                                    <div className={styles.checkboxWrapper}>
                                                                        <input type="checkbox" checked={selectedEpisodes.includes(ep._id)} onChange={() => toggleEpisodeSelection(ep._id)} />
                                                                    </div>
                                                                    <div className={styles.thumbnailWrapper}>
                                                                        <img src={ep.thumbnail || '/default-thumb.jpg'} alt="Thumb" />
                                                                    </div>
                                                                    <div className={styles.episodeInfo}>
                                                                        <a className={styles.epTitle}>
                                                                            {expand[`edit_${ep._id}`] ? (
                                                                                <input
                                                                                    type='text'
                                                                                    value={ep.title}
                                                                                    onChange={(e) => handleEpisodeTitleChange(season._id, ep._id, e.target.value)}
                                                                                    className={styles.inlineInput}
                                                                                />
                                                                            ) : ep.title}
                                                                        </a>
                                                                        <div className={styles.epMeta}>
                                                                            <span className={styles.metaDuration}>{ep.duration}:00</span>
                                                                            <span className={styles.metaId}>{ep._id}</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className={styles.episodeControls}>
                                                                        <button className={styles.controlBtn} onClick={() => setExpand(prev => ({ ...prev, [`edit_${ep._id}`]: !prev[`edit_${ep._id}`] }))}>ویرایش</button>
                                                                        <button className={styles.controlBtn} onClick={() => setExpand(prev => ({ ...prev, [`subtitle_${ep._id}`]: !prev[`subtitle_${ep._id}`] }))}>زیرنویس‌ها ({ep.subtitleFiles?.length || 0})</button>
                                                                        <button className={styles.controlBtn} onClick={() => setExpand(prev => ({ ...prev, [`video_quality_${ep._id}`]: !prev[`video_quality_${ep._id}`] }))}>ویدیوها ({ep.videoFiles?.length || 0})</button>
                                                                        <button onClick={() => deleteEpisode(season._id, ep._id)} className={styles.controlBtnDanger}>🗑</button>
                                                                    </div>
                                                                </div>

                                                                {expand[`subtitle_${ep._id}`] && (
                                                                    <div>
                                                                        <SubtitleFilesManager
                                                                            id={ep._id}
                                                                            filmId={filmId}
                                                                            episodeId={ep._id}
                                                                            seasonId={season._id}
                                                                            subtitles={ep.subtitleFiles || []}
                                                                            onUpdate={() => loadFilm(true)}
                                                                        />
                                                                    </div>
                                                                )}
                                                                {expand[`video_quality_${ep._id}`] && (
                                                                    <div>
                                                                        <VideoFilesManager
                                                                            id={ep._id}
                                                                            filmId={filmId}
                                                                            filmName={film.name}
                                                                            contentType={film.contentType}
                                                                            episodeId={ep._id}
                                                                            seasonId={season._id}
                                                                            episodeTitle={ep.title}
                                                                            videos={ep.videoFiles || []}
                                                                            onUpdate={() => loadFilm(true)}
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                            )}
                        </div>
                    )}

                    <footer className={styles.editorActions}>
                        <button onClick={saveFilm} disabled={loading} className={styles.saveButton}>
                            {loading ? 'در حال پردازش...' : '💾 ذخیره تغییرات محتوا'}
                        </button>
                    </footer>
                </div>
            </Wrapper>
        </Container>
    );
};

export default FilmForm2;