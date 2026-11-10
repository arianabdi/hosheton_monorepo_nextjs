'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LoadingState } from '@my-workspace/components';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { Container, Wrapper } from '@/app/(main)/layout';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { uploadFileInChunks } from '@/app/utils/chunkUploader/chunkUploader';
import parentStyles from '@/app/(main)/marketing/Marketing.module.scss';
import tabStyles from '@/app/(main)/marketing/automation/Automation.module.scss';
import hrStyles from '@/app/(main)/management/hr/Hr.module.scss';
import { personaApi, type PersonaInput } from '../../../lib/persona-api';
import { getHoshetonStudioApiBase } from '../../../lib/studio-api-base';
import { normalizeUploadPair } from '../../../lib/template-media';
import TagKeyPicker from '../../templates/review/TagKeyPicker';
import localStyles from '../Personas.module.scss';

const BASE = '/projects/personas';

const EMPTY: PersonaInput = {
    fullName: '',
    username: '',
    gender: '',
    bio: '',
    instagram: '',
    avatar: '',
    note: '',
    tagKeys: [],
    isActive: true,
};

/** فرم افزودن/ویرایش کاربر نمایشی — همان چیزهایی که روی پروفایل عمومی استودیو دیده می‌شود */
export default function PersonaForm({ personaId }: { personaId?: string }) {
    const router = useRouter();
    const { token } = useAuthStore();
    const isEdit = Boolean(personaId);
    const [form, setForm] = useState<PersonaInput>(EMPTY);
    const [loading, setLoading] = useState(isEdit);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState<number | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!personaId) return;
        let active = true;
        personaApi.list()
            .then((rows) => {
                if (!active) return;
                const row = rows.find((item) => item._id === personaId);
                if (!row) {
                    ErrorToaster({ message: 'این کاربر نمایشی پیدا نشد.' });
                    return;
                }
                setForm({
                    fullName: row.fullName,
                    username: row.username,
                    gender: row.gender === 'male' || row.gender === 'female' ? row.gender : '',
                    bio: row.bio,
                    instagram: row.instagram,
                    avatar: row.avatar,
                    note: row.note,
                    tagKeys: row.tagKeys || [],
                    isActive: row.isActive,
                });
            })
            .catch((e) => ErrorToaster(e))
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => {
            active = false;
        };
    }, [personaId]);

    const set = <K extends keyof PersonaInput>(key: K, value: PersonaInput[K]) => setForm((prev) => ({ ...prev, [key]: value }));

    const uploadAvatar = async (file: File | undefined) => {
        if (!file || !token) return;
        if (!file.type.startsWith('image/')) {
            ErrorToaster({ message: 'فقط فایل تصویری.' });
            return;
        }
        setUploading(0);
        try {
            const result = await uploadFileInChunks({
                file,
                token,
                baseUrl: getHoshetonStudioApiBase(),
                isPausedRef: { current: false },
                onProgress: (value: number) => setUploading(value),
                metadata: { mimetype: file.type, size: file.size },
            });
            const media = normalizeUploadPair(result);
            if (!media?.url) throw new Error('upload failed');
            set('avatar', media.url);
        } catch {
            ErrorToaster({ message: 'آپلود عکس ناموفق بود.' });
        } finally {
            setUploading(null);
        }
    };

    const submit = async () => {
        if (!form.fullName.trim()) {
            ErrorToaster({ message: 'نام الزامی است.' });
            return;
        }
        if (form.username && !/^[a-z0-9._]{3,30}$/.test(form.username)) {
            ErrorToaster({ message: 'نام کاربری فقط حروف انگلیسی کوچک، عدد، نقطه و _ (۳ تا ۳۰ نویسه).' });
            return;
        }
        setSaving(true);
        try {
            if (isEdit && personaId) await personaApi.update(personaId, form);
            else await personaApi.create(form);
            SuccessToaster({ message: isEdit ? 'ذخیره شد' : 'کاربر نمایشی ساخته شد' });
            router.push(BASE);
        } catch (e) {
            ErrorToaster(e);
            setSaving(false);
        }
    };

    return (
        <Container>
            <Wrapper>
                <div className={`${parentStyles.container} ${parentStyles.rtl}`}>
                    <header className={parentStyles.header}>
                        <div>
                            <h1 className={parentStyles.mainTitle}>{isEdit ? 'ویرایش کاربر نمایشی' : 'افزودن کاربر نمایشی'}</h1>
                            <p className={parentStyles.subtitle}>پروفایلی که کاربران در استودیو می‌بینند؛ فقط ادمین‌ها می‌دانند ساختگی است.</p>
                        </div>
                        <Link href={BASE} className={tabStyles.smallBtn}>بازگشت به فهرست</Link>
                    </header>

                    <section className={hrStyles.formGuideCard}>
                        <p>
                            این حساب رمز و موبایل ندارد و کسی با آن وارد نمی‌شود. نام، عکس و بیو را طوری بنویسید که مثل یک
                            سازندهٔ واقعی به نظر برسد. بعد از ذخیره، این شخص در انتخابگر «منتشرکننده» فرم قالب (پنل و استودیو) می‌آید.
                        </p>
                    </section>

                    {loading ? (
                        <LoadingState />
                    ) : (
                        <div className={parentStyles.formCard}>
                            <h3 className={parentStyles.formSectionTitle}>پروفایل عمومی</h3>
                            <div className={parentStyles.field}>
                                <label>عکس پروفایل</label>
                                <div className={localStyles.avatarField}>
                                    {form.avatar ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={form.avatar} alt="" className={localStyles.avatarPreview} />
                                    ) : (
                                        <span className={localStyles.avatarPlaceholder}>{form.fullName.charAt(0) || '?'}</span>
                                    )}
                                    <input
                                        ref={fileRef}
                                        type="file"
                                        accept="image/*"
                                        className={localStyles.fileInput}
                                        onChange={(e) => {
                                            void uploadAvatar(e.target.files?.[0]);
                                            e.target.value = '';
                                        }}
                                    />
                                    <button type="button" className={tabStyles.smallBtn} disabled={uploading !== null} onClick={() => fileRef.current?.click()}>
                                        {uploading !== null ? `در حال آپلود… ${uploading}%` : form.avatar ? 'تعویض عکس' : 'آپلود عکس'}
                                    </button>
                                    {form.avatar ? (
                                        <button type="button" className={tabStyles.smallBtn} onClick={() => set('avatar', '')}>حذف عکس</button>
                                    ) : null}
                                </div>
                                <p className={hrStyles.fieldHint}>عکس مربعی واقعی‌نما (نه لوگو). بدون عکس، حرف اول نام نمایش داده می‌شود.</p>
                            </div>

                            <div className={hrStyles.formRow}>
                                <div className={parentStyles.field}>
                                    <label>نام و نام خانوادگی *</label>
                                    <input value={form.fullName} onChange={(e) => set('fullName', e.target.value)} placeholder="مثلاً سارا محمدی" />
                                    <p className={hrStyles.fieldHint}>همین نام زیر قالب‌ها، در پروفایل و در پیام‌ها دیده می‌شود.</p>
                                </div>
                                <div className={parentStyles.field}>
                                    <label>نام کاربری</label>
                                    <input
                                        dir="ltr"
                                        value={form.username}
                                        onChange={(e) => set('username', e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ''))}
                                        placeholder="sara.mhd"
                                    />
                                    <p className={hrStyles.fieldHint}>حروف انگلیسی کوچک، عدد، نقطه و _ — باید در کل کاربران یکتا باشد.</p>
                                </div>
                            </div>

                            <div className={hrStyles.formRow}>
                                <div className={parentStyles.field}>
                                    <label>جنسیت</label>
                                    <select value={form.gender} onChange={(e) => set('gender', e.target.value as PersonaInput['gender'])}>
                                        <option value="">— مشخص نشده —</option>
                                        <option value="female">زن</option>
                                        <option value="male">مرد</option>
                                    </select>
                                    <p className={hrStyles.fieldHint}>برای داشتن ترکیب متعادل زن و مرد در اکسپلور.</p>
                                </div>
                                <div className={parentStyles.field}>
                                    <label>اینستاگرام</label>
                                    <input dir="ltr" value={form.instagram} onChange={(e) => set('instagram', e.target.value.trim())} placeholder="https://instagram.com/…" />
                                    <p className={hrStyles.fieldHint}>اختیاری؛ فقط اگر صفحهٔ واقعی دارید. خالی بماند بهتر از لینک ساختگی است.</p>
                                </div>
                            </div>

                            <div className={parentStyles.field}>
                                <label>بیو</label>
                                <textarea
                                    className={hrStyles.textarea}
                                    rows={3}
                                    maxLength={300}
                                    value={form.bio}
                                    onChange={(e) => set('bio', e.target.value)}
                                    placeholder="عکاس پرتره و عاشق نور طبیعی…"
                                />
                                <p className={hrStyles.fieldHint}>یکی دو جمله با لحن خودمانی، مرتبط با نوع قالب‌هایی که به نامش منتشر می‌کنید.</p>
                            </div>

                            <h3 className={parentStyles.formSectionTitle} style={{ marginTop: '1.25rem' }}>حوزهٔ کاری</h3>
                            <div className={parentStyles.field}>
                                <label>تگ‌هایی که این شخص در آن‌ها کار می‌کند</label>
                                <TagKeyPicker value={form.tagKeys} onChange={(keys) => set('tagKeys', keys)} />
                                <p className={hrStyles.fieldHint}>
                                    از «دسته‌بندی تگ‌ها» (مثلاً جواهرات). وقتی قالبی با یکی از این تگ‌ها — یا تگ والد یا زیرشاخه‌اش —
                                    ثبت می‌شود، این شخص در انتخابگر «منتشرکننده» پیشنهاد می‌شود. خالی = حوزهٔ مشخصی ندارد و فقط برای
                                    قالب بی‌تگ (یا حوزه‌ای که هیچ‌کس ندارد) می‌آید.
                                </p>
                            </div>

                            <h3 className={parentStyles.formSectionTitle} style={{ marginTop: '1.25rem' }}>داخلی (فقط ادمین)</h3>
                            <div className={hrStyles.formRow}>
                                <div className={parentStyles.field}>
                                    <label>یادداشت</label>
                                    <input value={form.note} onChange={(e) => set('note', e.target.value)} placeholder="مثلاً پرتره، نور طبیعی" />
                                    <p className={hrStyles.fieldHint}>سبک یا حوزهٔ این پرسونا تا قالب مناسب به نامش منتشر شود. جایی نمایش داده نمی‌شود.</p>
                                </div>
                                {isEdit ? (
                                    <div className={parentStyles.field}>
                                        <label>وضعیت</label>
                                        <select value={form.isActive ? '1' : '0'} onChange={(e) => set('isActive', e.target.value === '1')}>
                                            <option value="1">فعال</option>
                                            <option value="0">غیرفعال</option>
                                        </select>
                                        <p className={hrStyles.fieldHint}>غیرفعال = در انتخابگر منتشرکننده نمی‌آید؛ قالب‌ها و گفتگوهای قبلی می‌مانند.</p>
                                    </div>
                                ) : null}
                            </div>

                            <div className={hrStyles.formNoteBox}>
                                بعد از ذخیره پروفایل در <code dir="ltr">/creators/&lt;id&gt;</code> استودیو دیده می‌شود (فقط اگر قالب منتشرشده داشته باشد
                                در اکسپلور می‌آید) و پیام‌هایی که به او داده شود در صفحهٔ پیام‌های استودیو برای همهٔ ادمین‌ها می‌آید.
                            </div>

                            <div className={tabStyles.inlineActions} style={{ marginTop: '1.25rem' }}>
                                <button type="button" className={parentStyles.primaryBtn} disabled={saving || uploading !== null} onClick={submit}>
                                    {saving ? 'در حال ذخیره…' : isEdit ? 'ذخیره تغییرات' : 'ساخت کاربر نمایشی'}
                                </button>
                                <Link href={BASE} className={tabStyles.smallBtn}>انصراف</Link>
                            </div>
                        </div>
                    )}
                </div>
            </Wrapper>
        </Container>
    );
}
