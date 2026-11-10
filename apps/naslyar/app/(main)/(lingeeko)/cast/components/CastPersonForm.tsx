'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Field } from '@my-workspace/components';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import ImageUpload from '@/app/(main)/components/ImageUpload/ImageUpload';
import CastPersonFilms from './CastPersonFilms';
import styles from './CastForm.module.scss';

export interface CastPersonFormData {
    name: string;
    birthYear: string;
    bio: string;
}

interface AvatarImage {
    original: any;
    thumbnail: any;
}

interface Props {
    type: 'actors' | 'directors';
    personId?: string;
}

const emptyForm: CastPersonFormData = {
    name: '',
    birthYear: '',
    bio: '',
};

const normalizeAvatar = (avatar?: AvatarImage | null): AvatarImage | undefined => {
    if (!avatar?.original) return undefined;

    return {
        original: avatar.original,
        thumbnail: avatar.thumbnail || avatar.original,
    };
};

export default function CastPersonForm({ type, personId }: Props) {
    const router = useRouter();
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const isEdit = Boolean(personId);
    const endpoint = type === 'actors' ? 'actors' : 'directors';
    const singular = type === 'actors' ? 'بازیگر' : 'کارگردان';

    const [form, setForm] = useState<CastPersonFormData>(emptyForm);
    const [avatar, setAvatar] = useState<AvatarImage | undefined>(undefined);
    const [pendingAvatar, setPendingAvatar] = useState<AvatarImage | undefined>(undefined);
    const [loading, setLoading] = useState(isEdit);
    const [submitting, setSubmitting] = useState(false);
    const [avatarSaving, setAvatarSaving] = useState(false);

    const authHeaders = useMemo(
        () => ({ authorization: `Bearer ${token}` }),
        [token],
    );

    useEffect(() => {
        if (!isEdit || !personId || !token) return;

        const loadPerson = async () => {
            try {
                setLoading(true);
                const res = await axios.get(`${baseUrl}/api/cast/${endpoint}/${personId}`, {
                    headers: authHeaders,
                });
                const data = res.data?.data;
                if (data) {
                    setForm({
                        name: data.name || '',
                        birthYear: data.birthYear || '',
                        bio: data.bio || '',
                    });
                    setAvatar(normalizeAvatar(data.avatar));
                }
            } catch (err) {
                ErrorToaster(err);
            } finally {
                setLoading(false);
            }
        };

        loadPerson();
    }, [baseUrl, token, personId, isEdit, endpoint, authHeaders]);

    const handleChange = (field: keyof CastPersonFormData, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const saveAvatarToApi = async (targetId: string, upload: AvatarImage) => {
        const normalized = normalizeAvatar(upload);
        if (!normalized) return undefined;

        const res = await axios.post(
            `${baseUrl}/api/cast/${endpoint}/${targetId}/avatar`,
            normalized,
            { headers: authHeaders },
        );

        if (res.data?.statusCode === 200) {
            return normalizeAvatar(res.data.data?.avatar);
        }

        return normalized;
    };

    const handleAvatarUpload = async (upload: AvatarImage | null) => {
        if (!upload) {
            if (isEdit && personId) {
                setAvatarSaving(true);
                try {
                    const res = await axios.delete(
                        `${baseUrl}/api/cast/${endpoint}/${personId}/avatar`,
                        { headers: authHeaders },
                    );
                    if (res.data?.statusCode === 200) {
                        setAvatar(undefined);
                        toast.success('تصویر حذف شد');
                    }
                } catch (err) {
                    ErrorToaster(err);
                } finally {
                    setAvatarSaving(false);
                }
            } else {
                setPendingAvatar(undefined);
                setAvatar(undefined);
            }
            return;
        }

        const normalized = normalizeAvatar(upload);
        if (!normalized) return;

        if (isEdit && personId) {
            setAvatarSaving(true);
            try {
                const savedAvatar = await saveAvatarToApi(personId, normalized);
                setAvatar(savedAvatar);
                toast.success('تصویر پروفایل ذخیره شد');
            } catch (err) {
                ErrorToaster(err);
            } finally {
                setAvatarSaving(false);
            }
            return;
        }

        setPendingAvatar(normalized);
        setAvatar(normalized);
    };

    const handleSubmit = async () => {
        if (!form.name.trim()) {
            ErrorToaster({ message: 'نام الزامی است' });
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                name: form.name.trim(),
                birthYear: form.birthYear.trim() || undefined,
                bio: form.bio.trim() || undefined,
            };

            const res = isEdit
                ? await axios.put(`${baseUrl}/api/cast/${endpoint}/${personId}`, payload, {
                    headers: authHeaders,
                })
                : await axios.post(`${baseUrl}/api/cast/${endpoint}`, payload, {
                    headers: authHeaders,
                });

            if (res.data?.statusCode === 200) {
                if (!isEdit && pendingAvatar && res.data.data?._id) {
                    const savedAvatar = await saveAvatarToApi(res.data.data._id, pendingAvatar);
                    setPendingAvatar(undefined);
                    setAvatar(savedAvatar);
                }

                SuccessToaster({ message: isEdit ? 'تغییرات ذخیره شد' : `${singular} جدید ایجاد شد` });

                if (isEdit) {
                    setAvatar(normalizeAvatar(res.data.data?.avatar) || avatar);
                    router.refresh();
                } else {
                    router.push(`/${endpoint}`);
                }
            }
        } catch (err) {
            ErrorToaster(err);
        } finally {
            setSubmitting(false);
        }
    };

    const currentAvatar = useMemo(
        () => avatar || pendingAvatar,
        [avatar, pendingAvatar],
    );

    if (loading) {
        return <div className={styles.loading}>در حال بارگذاری...</div>;
    }

    return (
        <>
            <div className={styles.formCard} dir="rtl">
                <Field
                    label="نام *"
                    id="name"
                    name="name"
                    type="text"
                    value={form.name}
                    onChange={(v) => handleChange('name', v)}
                    required
                />
                <Field
                    label="سال تولد"
                    id="birthYear"
                    name="birthYear"
                    type="text"
                    value={form.birthYear}
                    onChange={(v) => handleChange('birthYear', v)}
                />

                <div className={styles.uploadBlock}>
                    <ImageUpload
                        label="تصویر پروفایل"
                        currentImage={currentAvatar}
                        onUpload={handleAvatarUpload}
                    />
                    {avatarSaving && <p className={styles.loading}>در حال ذخیره تصویر...</p>}
                </div>

                <Field
                    label="بیوگرافی"
                    id="bio"
                    name="bio"
                    type="textarea"
                    rows={8}
                    value={form.bio}
                    onChange={(v) => handleChange('bio', v)}
                />

                <div className={styles.actions}>
                    <button type="button" className={styles.cancelBtn} onClick={() => router.push(`/${endpoint}`)}>
                        انصراف
                    </button>
                    <button type="button" className={styles.saveBtn} onClick={handleSubmit} disabled={submitting}>
                        {submitting ? 'در حال ذخیره...' : isEdit ? 'ذخیره تغییرات' : `ایجاد ${singular}`}
                    </button>
                </div>
            </div>

            {isEdit && personId && (
                <CastPersonFilms type={type} personId={personId} />
            )}
        </>
    );
}
