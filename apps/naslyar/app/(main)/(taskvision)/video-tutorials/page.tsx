'use client';

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useRouter} from 'next/navigation';
import toast from 'react-hot-toast';
import {Container, Wrapper} from '@/app/(main)/layout';
import {useAppStore} from '@/app/zustand/store/useAppStore';
import styles from '../backgrounds/backgrounds.module.scss';
import extra from './video-tutorials.module.scss';
import {
    VideoTutorial,
    VideoTutorialPayload,
    createVideoTutorial,
    deleteVideoTutorial,
    fetchVideoTutorials,
    updateVideoTutorial,
} from '../lib/videoTutorialsApi';

/** بخش‌هایی که فعلا در اپ تسک‌ویژن بنر آموزش دارند — گزینه دلخواه هم هست */
const PAGE_KEY_OPTIONS = [
    {value: 'projects', label: 'projects — صفحه پروژه‌ها'},
    {value: 'support', label: 'support — صفحه پشتیبانی'},
];
const CUSTOM_PAGE_KEY = '__custom__';

interface TutorialForm {
    pageKey: string;
    customPageKey: string;
    eyebrow: string;
    title: string;
    description: string;
    stepsText: string;
    videoUrl: string;
    videoHint: string;
    order: number;
}

const emptyForm: TutorialForm = {
    pageKey: PAGE_KEY_OPTIONS[0].value,
    customPageKey: '',
    eyebrow: '',
    title: '',
    description: '',
    stepsText: '',
    videoUrl: '',
    videoHint: '',
    order: 0,
};

function formFromItem(item: VideoTutorial): TutorialForm {
    const known = PAGE_KEY_OPTIONS.some((opt) => opt.value === item.pageKey);
    return {
        pageKey: known ? item.pageKey : CUSTOM_PAGE_KEY,
        customPageKey: known ? '' : item.pageKey,
        eyebrow: item.eyebrow || '',
        title: item.title || '',
        description: item.description || '',
        stepsText: (item.steps || []).join('\n'),
        videoUrl: item.videoUrl || '',
        videoHint: item.videoHint || '',
        order: typeof item.order === 'number' ? item.order : 0,
    };
}

export default function VideoTutorialsPage() {
    const router = useRouter();
    const {appName} = useAppStore();

    const [items, setItems] = useState<VideoTutorial[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<TutorialForm>(emptyForm);
    const formRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (appName && appName !== 'taskvision') {
            router.replace('/home');
        }
    }, [appName, router]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const {tutorials} = await fetchVideoTutorials();
            setItems(tutorials);
        } catch (e: any) {
            toast.error(e?.message || 'خطا در دریافت آموزش‌ها');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const resolvedPageKey = form.pageKey === CUSTOM_PAGE_KEY ? form.customPageKey.trim() : form.pageKey;
    const isValid = Boolean(resolvedPageKey) && Boolean(form.title.trim());

    function resetForm() {
        setEditingId(null);
        setForm(emptyForm);
    }

    function startEdit(item: VideoTutorial) {
        setEditingId(item._id);
        setForm(formFromItem(item));
        formRef.current?.scrollIntoView({behavior: 'smooth', block: 'start'});
    }

    function buildPayload(): VideoTutorialPayload {
        return {
            pageKey: resolvedPageKey,
            eyebrow: form.eyebrow.trim(),
            title: form.title.trim(),
            description: form.description.trim(),
            steps: form.stepsText.split('\n').map(s => s.trim()).filter(Boolean),
            videoUrl: form.videoUrl.trim(),
            videoHint: form.videoHint.trim(),
            order: Number(form.order) || 0,
        };
    }

    async function handleSubmit() {
        if (!isValid || saving) return;
        setSaving(true);
        try {
            if (editingId) {
                await updateVideoTutorial(editingId, buildPayload());
                toast.success('آموزش بروزرسانی شد');
            } else {
                await createVideoTutorial({...buildPayload(), isEnabled: true});
                toast.success('آموزش اضافه شد');
            }
            resetForm();
            await load();
        } catch (e: any) {
            toast.error(e?.message || 'خطا در ذخیره آموزش');
        } finally {
            setSaving(false);
        }
    }

    async function handleToggle(item: VideoTutorial) {
        try {
            await updateVideoTutorial(item._id, {isEnabled: !item.isEnabled});
            setItems(prev => prev.map(t => t._id === item._id ? {...t, isEnabled: !t.isEnabled} : t));
        } catch (e: any) {
            toast.error(e?.message || 'خطا در تغییر وضعیت');
        }
    }

    async function handleDelete(item: VideoTutorial) {
        if (!window.confirm(`آموزش «${item.title}» حذف شود؟`)) return;
        try {
            await deleteVideoTutorial(item._id);
            toast.success('آموزش حذف شد');
            if (editingId === item._id) resetForm();
            setItems(prev => prev.filter(t => t._id !== item._id));
        } catch (e: any) {
            toast.error(e?.message || 'خطا در حذف آموزش');
        }
    }

    return (
        <Container>
            <Wrapper>
                <div className={styles.container}>
                    <div>
                        <h1 className={styles.mainTitle}>آموزش‌های ویدیویی TaskVision</h1>
                        <p className={styles.subtitle}>
                            بنر آموزش (متن، مراحل و ویدیو) بالای صفحات اپ تسک‌ویژن از این‌جا مدیریت می‌شود.
                            برای هر بخش (pageKey) می‌توانید آموزش ثبت کنید، فعال/غیرفعالش کنید یا متن‌هایش را
                            ویرایش کنید. هر بخشی که حداقل یک آموزش فعال داشته باشد، بنرش بالای همان صفحه
                            نمایش داده می‌شود.
                        </p>
                    </div>

                    <section className={styles.formCard} ref={formRef}>
                        <h2 className={styles.sectionTitle}>
                            {editingId ? 'ویرایش آموزش' : 'افزودن آموزش جدید'}
                        </h2>
                        <div className={styles.formGrid}>
                            <label className={styles.field}>
                                <span className={styles.fieldLabel}>بخش (pageKey) *</span>
                                <select
                                    className={styles.input}
                                    value={form.pageKey}
                                    onChange={e => setForm({...form, pageKey: e.target.value})}
                                >
                                    {PAGE_KEY_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                    <option value={CUSTOM_PAGE_KEY}>سایر (کلید دلخواه)</option>
                                </select>
                            </label>
                            {form.pageKey === CUSTOM_PAGE_KEY && (
                                <label className={styles.field}>
                                    <span className={styles.fieldLabel}>کلید دلخواه بخش *</span>
                                    <input
                                        className={styles.input}
                                        dir="ltr"
                                        value={form.customPageKey}
                                        onChange={e => setForm({...form, customPageKey: e.target.value.replace(/\s+/g, '_')})}
                                        placeholder="مثلا board"
                                    />
                                </label>
                            )}
                            <label className={styles.field}>
                                <span className={styles.fieldLabel}>عنوان کوچک بالای بنر</span>
                                <input
                                    className={styles.input}
                                    value={form.eyebrow}
                                    onChange={e => setForm({...form, eyebrow: e.target.value})}
                                    placeholder="مثلا شروع سریع"
                                />
                            </label>
                            <label className={styles.field}>
                                <span className={styles.fieldLabel}>عنوان *</span>
                                <input
                                    className={styles.input}
                                    value={form.title}
                                    onChange={e => setForm({...form, title: e.target.value})}
                                    placeholder="مثلا کار تیمی را از پراکندگی نجات دهید"
                                />
                            </label>
                            <label className={styles.field}>
                                <span className={styles.fieldLabel}>ترتیب نمایش</span>
                                <input
                                    className={styles.input}
                                    type="number"
                                    dir="ltr"
                                    value={form.order}
                                    onChange={e => setForm({...form, order: Number(e.target.value)})}
                                />
                            </label>
                        </div>
                        <div className={styles.formGrid} style={{marginTop: 12}}>
                            <label className={styles.field}>
                                <span className={styles.fieldLabel}>توضیح</span>
                                <textarea
                                    className={`${styles.input} ${extra.textarea}`}
                                    value={form.description}
                                    onChange={e => setForm({...form, description: e.target.value})}
                                    placeholder="متن معرفی این بخش"
                                />
                            </label>
                            <label className={styles.field}>
                                <span className={styles.fieldLabel}>مراحل آموزش (هر مرحله در یک خط)</span>
                                <textarea
                                    className={`${styles.input} ${extra.textarea}`}
                                    value={form.stepsText}
                                    onChange={e => setForm({...form, stepsText: e.target.value})}
                                    placeholder={'پروژه بسازید\nاعضا را دعوت کنید\nتسک‌ها را جلو ببرید'}
                                />
                            </label>
                        </div>
                        <div className={styles.formGrid} style={{marginTop: 12}}>
                            <label className={styles.field}>
                                <span className={styles.fieldLabel}>آدرس ویدیو (یوتیوب یا فایل مستقیم)</span>
                                <input
                                    className={styles.input}
                                    dir="ltr"
                                    value={form.videoUrl}
                                    onChange={e => setForm({...form, videoUrl: e.target.value})}
                                    placeholder="https://www.youtube.com/watch?v=..."
                                />
                            </label>
                            <label className={styles.field}>
                                <span className={styles.fieldLabel}>توضیح کوتاه روی پوستر ویدیو</span>
                                <input
                                    className={styles.input}
                                    value={form.videoHint}
                                    onChange={e => setForm({...form, videoHint: e.target.value})}
                                    placeholder="مثلا ببینید چطور پروژه را راه می‌اندازید"
                                />
                            </label>
                        </div>
                        <p className={extra.hint}>
                            اگر ویدیو وارد نشود، بنر فقط با متن و مراحل نمایش داده می‌شود. لینک یوتیوب به‌صورت
                            embed پخش می‌شود و سایر لینک‌ها به‌عنوان فایل ویدیویی مستقیم پخش می‌شوند.
                        </p>
                        <div className={styles.formActions}>
                            {editingId && (
                                <button type="button" className={extra.cancelBtn} onClick={resetForm}>
                                    انصراف
                                </button>
                            )}
                            <button
                                type="button"
                                className={styles.submitBtn}
                                onClick={handleSubmit}
                                disabled={!isValid || saving}
                            >
                                {saving ? 'در حال ذخیره...' : (editingId ? 'ذخیره تغییرات' : 'افزودن آموزش')}
                            </button>
                        </div>
                    </section>

                    <section>
                        <h2 className={styles.sectionTitle}>آموزش‌های ثبت‌شده ({items.length})</h2>
                        {loading ? (
                            <p className={styles.emptyState}>در حال دریافت...</p>
                        ) : items.length === 0 ? (
                            <p className={styles.emptyState}>هنوز آموزشی ثبت نشده است.</p>
                        ) : (
                            <div className={styles.list}>
                                {items.map(item => (
                                    <article key={item._id} className={styles.item}>
                                        <div className={styles.itemInfo}>
                                            <h3 className={styles.itemTitle}>
                                                <span className={extra.pageKeyBadge}>{item.pageKey}</span>
                                                {item.title}
                                                {!item.isEnabled && <span className={styles.inactiveBadge}>غیرفعال</span>}
                                            </h3>
                                            {item.description && (
                                                <span className={styles.itemUrl} style={{whiteSpace: 'normal'}}>
                                                    {item.description}
                                                </span>
                                            )}
                                            {item.videoUrl ? (
                                                <code className={styles.itemUrl} dir="ltr">{item.videoUrl}</code>
                                            ) : (
                                                <span className={extra.noVideoBadge}>بدون ویدیو</span>
                                            )}
                                            {(item.steps?.length || 0) > 0 && (
                                                <span className={styles.orderBadge}>{item.steps!.length} مرحله</span>
                                            )}
                                            {typeof item.order === 'number' && (
                                                <span className={styles.orderBadge}>ترتیب: {item.order}</span>
                                            )}
                                        </div>
                                        <div className={styles.itemActions}>
                                            <button
                                                type="button"
                                                className={styles.secondaryBtn}
                                                onClick={() => handleToggle(item)}
                                            >
                                                {item.isEnabled ? 'غیرفعال کن' : 'فعال کن'}
                                            </button>
                                            <button
                                                type="button"
                                                className={styles.secondaryBtn}
                                                onClick={() => startEdit(item)}
                                            >
                                                ویرایش
                                            </button>
                                            <button
                                                type="button"
                                                className={styles.deleteBtn}
                                                onClick={() => handleDelete(item)}
                                            >
                                                حذف
                                            </button>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            </Wrapper>
        </Container>
    );
}
