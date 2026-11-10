'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { SuccessToaster } from '@my-workspace/utils';
import { notifyError } from '@/app/lib/errors';
import { LuCamera, LuInfo, LuPlus, LuTrash2 } from 'react-icons/lu';
import { ModalHelper, ModalBody, ModalFooter, ModalHeader } from '@my-workspace/components';
import {
    FaInstagram,
    FaTelegramPlane,
    FaTiktok,
    FaBehance,
    FaDribbble,
    FaYoutube,
} from 'react-icons/fa';
import { SiAparat } from 'react-icons/si';
import VerificationSettingsPanel from '../verification/VerificationSettingsPanel';
import styles from './profile.module.scss';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { mapApiUserToProfile } from '@/app/lib/user-roles';
import {
    resolvePictureUrl,
    uploadProfileImageInChunks,
    UserPicture,
} from './lib/uploadProfileImage';

const MAX_BIO_LENGTH = 200;
const API_URL = process.env.NEXT_PUBLIC_API_URL;

const SOCIAL_PLATFORMS = [
    'instagram',
    'telegram',
    'tiktok',
    'behance',
    'dribbble',
    'youtube',
    'aparat',
    'bale',
    'rubika',
] as const;

type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];
type SocialLinks = Partial<Record<SocialPlatform, string>>;
type SocialRow = { platform: SocialPlatform; value: string };

const DEFAULT_SOCIAL: SocialPlatform[] = ['instagram', 'telegram'];

function buildSocialRows(saved?: SocialLinks): SocialRow[] {
    const values = saved || {};
    return SOCIAL_PLATFORMS
        .filter((platform) => DEFAULT_SOCIAL.includes(platform) || Boolean(values[platform]?.trim()))
        .map((platform) => ({ platform, value: values[platform] || '' }));
}

function SocialPlatformIcon({ platform }: { platform: SocialPlatform }) {
    switch (platform) {
        case 'instagram':
            return <FaInstagram />;
        case 'telegram':
            return <FaTelegramPlane />;
        case 'tiktok':
            return <FaTiktok />;
        case 'behance':
            return <FaBehance />;
        case 'dribbble':
            return <FaDribbble />;
        case 'youtube':
            return <FaYoutube />;
        case 'aparat':
            return <SiAparat />;
        default:
            return <span>{platform.charAt(0).toUpperCase()}</span>;
    }
}

interface ProfileUser {
    _id?: string;
    fullName?: string;
    email?: string;
    mobile?: string;
    picture?: UserPicture;
    metadata?: {
        bio?: string;
        social?: SocialLinks & { x?: string };
    };
    email_verified?: boolean;
    mobile_verified?: boolean;
}

export default function ProfileSettingsPanel() {
    const { t } = useTranslation('settings');
    const { t: tc } = useTranslation('common');
    const router = useRouter();
    const { token, logout: authLogout } = useAuthStore();
    const { setProfile } = useAppStore();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [bio, setBio] = useState('');
    const [socialRows, setSocialRows] = useState<SocialRow[]>(buildSocialRows());
    const [picture, setPicture] = useState<UserPicture | undefined>();
    const [avatarPreview, setAvatarPreview] = useState('');
    const [deleteOpen, setDeleteOpen] = useState(false);

    const avatarInputRef = useRef<HTMLInputElement>(null);

    const authHeaders = { authorization: `Bearer ${token}` };

    const applyUserToForm = (user: ProfileUser) => {
        setFullName(user.fullName || '');
        setEmail(user.email || '');
        setBio(user.metadata?.bio || '');
        setSocialRows(buildSocialRows(user.metadata?.social));
        setPicture(user.picture);
        setAvatarPreview(resolvePictureUrl(user.picture));
    };

    const loadProfile = useCallback(async () => {
        if (!token) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const res = await axios.get(`${API_URL}/api/user`, { headers: authHeaders });
            const user: ProfileUser = res.data?.data?.user;

            if (user) {
                applyUserToForm(user);
                setProfile({
                    ...mapApiUserToProfile(user as Record<string, unknown>),
                    avatar: resolvePictureUrl(user.picture),
                });
            }
        } catch (error) {
            notifyError(error);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        loadProfile();
    }, [loadProfile]);

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !token) return;

        if (!file.type.startsWith('image/')) {
            toast.error(t('image_only'));
            return;
        }

        const previewUrl = URL.createObjectURL(file);
        setAvatarPreview(previewUrl);
        setUploadingAvatar(true);
        setUploadProgress(0);

        try {
            const uploadedPicture = await uploadProfileImageInChunks(
                file,
                token,
                setUploadProgress,
            );
            setPicture(uploadedPicture);
            setAvatarPreview(resolvePictureUrl(uploadedPicture));
            toast.success(t('avatar_uploaded'));
        } catch (error) {
            if (error instanceof Error && error.message === 'UPLOAD_ABORTED') {
                toast.error(t('upload_aborted'));
            } else {
                notifyError(error);
            }
            setAvatarPreview(resolvePictureUrl(picture));
        } finally {
            setUploadingAvatar(false);
            setUploadProgress(0);
            if (avatarInputRef.current) avatarInputRef.current.value = '';
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;

        if (!fullName.trim()) {
            toast.error(t('full_name_required'));
            return;
        }

        if (!email.trim()) {
            toast.error(t('email_required'));
            return;
        }

        try {
            setSaving(true);
            const payload: Record<string, unknown> = {
                fullName: fullName?.trim(),
                email: email?.trim(),
                metadata: {
                    bio: bio?.trim(),
                    social: Object.fromEntries(
                        SOCIAL_PLATFORMS.map((platform) => [
                            platform,
                            socialRows.find((row) => row.platform === platform)?.value.trim() || '',
                        ]),
                    ),
                },
            };

            if (picture) {
                payload.picture = picture;
            }

            const res = await axios.patch(`${API_URL}/api/user`, payload, { headers: authHeaders });
            if(res.data.statusCode === 200){
                const user: ProfileUser = res.data?.data?.user;

                if (user) {
                    applyUserToForm(user);
                    setProfile({
                        ...mapApiUserToProfile(user as Record<string, unknown>),
                        avatar: resolvePictureUrl(user.picture),
                    });
                }

                SuccessToaster({message: t('saved')});
            }
        } catch (error) {
            notifyError(error);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!token) return;

        try {
            setDeleting(true);
            await axios.delete(`${API_URL}/api/user`, { headers: authHeaders });
            toast.success(t('deleted'));
            await authLogout();
            router.push('/login');
        } catch (error) {
            notifyError(error);
        } finally {
            setDeleting(false);
        }
    };

    const updateSocialValue = (platform: SocialPlatform, value: string) => {
        setSocialRows((current) => current.map((row) => (
            row.platform === platform ? { ...row, value } : row
        )));
    };

    const removeSocialRow = (platform: SocialPlatform) => {
        setSocialRows((current) => current.filter((row) => row.platform !== platform));
    };

    const addSocialRow = (platform: SocialPlatform) => {
        setSocialRows((current) => (
            current.some((row) => row.platform === platform)
                ? current
                : [...current, { platform, value: '' }]
        ));
    };

    const remainingSocial = SOCIAL_PLATFORMS.filter(
        (platform) => !socialRows.some((row) => row.platform === platform),
    );

    const bioRemaining = MAX_BIO_LENGTH - bio.length;

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loadingState}>{t('loading_profile')}</div>
            </div>
        );
    }

    return (
        // عنوان و توضیح در هدر تب‌های صفحه creator است
        <div className={styles.container}>

            <form onSubmit={handleSave} className={styles.form}>
                <div className={styles.sectionTitle}>{t('public_profile')}</div>

                <div className={styles.row}>
                    <span className={styles.label}>{t('avatar')} *</span>
                    <div className={styles.field}>
                        <div className={styles.avatarUploadWrapper}>
                            <label className={styles.avatarPreview} title={t('upload_photo')}>
                                {avatarPreview ? (
                                    <img src={avatarPreview} alt={t('avatar_alt')} className={styles.avatarImage} />
                                ) : (
                                    <span className={styles.avatarInitial}>
                                        {(fullName.trim().charAt(0) || '?').toUpperCase()}
                                    </span>
                                )}
                                <span className={styles.avatarOverlay} aria-hidden>
                                    <LuCamera size={18} />
                                </span>
                                <input
                                    ref={avatarInputRef}
                                    type="file"
                                    accept="image/*"
                                    hidden
                                    disabled={uploadingAvatar || saving}
                                    onChange={handleAvatarChange}
                                />
                            </label>
                            <div className={styles.avatarActions}>
                                <button
                                    type="button"
                                    className={styles.secondaryBtn}
                                    disabled={uploadingAvatar || saving}
                                    onClick={() => avatarInputRef.current?.click()}
                                >
                                    {uploadingAvatar ? tc('upload_progress', { progress: uploadProgress }) : t('upload_photo')}
                                </button>
                                {uploadingAvatar ? (
                                    <div className={styles.progressBar}>
                                        <div className={styles.progressFill} style={{ width: `${uploadProgress}%` }} />
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </div>
                </div>

                <div className={styles.row}>
                    <label className={styles.label} htmlFor="profile-full-name">{t('full_name')} *</label>
                    <div className={styles.field}>
                        <input
                            id="profile-full-name"
                            type="text"
                            className={styles.input}
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            disabled={saving}
                        />
                    </div>
                </div>

                <div className={styles.row}>
                    <label className={styles.label} htmlFor="profile-email">{t('email')} *</label>
                    <div className={styles.field}>
                        <input
                            id="profile-email"
                            type="email"
                            dir="ltr"
                            className={styles.input}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={saving}
                        />
                        {/* تأیید ایمیل فعلاً غیرفعال است — فقط یک خط وضعیت، نه فرم غیرفعال */}
                        <p className={styles.fieldNote}>
                            <LuInfo size={13} aria-hidden />
                            {t('verify_email_unavailable')}
                        </p>
                    </div>
                </div>

                <div className={styles.row}>
                    <label className={styles.label} htmlFor="profile-bio">{t('about')} *</label>
                    <div className={styles.field}>
                        <textarea
                            id="profile-bio"
                            rows={4}
                            className={styles.textarea}
                            value={bio}
                            maxLength={MAX_BIO_LENGTH}
                            onChange={(e) => setBio(e.target.value)}
                            disabled={saving}
                            placeholder={t('about_placeholder')}
                        />
                        <span className={`${styles.counter} ${bioRemaining <= 20 ? styles.counterLow : ''}`}>
                            {tc('chars_left', { count: bioRemaining })}
                        </span>
                    </div>
                </div>

                <div className={styles.row}>
                    <span className={styles.label}>{t('social')}</span>
                    <div className={`${styles.field} ${styles.socialList}`}>
                        {socialRows.map((row) => (
                            <div className={styles.socialRow} key={row.platform}>
                                <div className={styles.socialInputWrapper}>
                                    <span className={styles.socialIcon} title={t(`social_${row.platform}`)}>
                                        <SocialPlatformIcon platform={row.platform} />
                                    </span>
                                    <input
                                        type="text"
                                        className={styles.input}
                                        value={row.value}
                                        onChange={(e) => updateSocialValue(row.platform, e.target.value)}
                                        disabled={saving}
                                        placeholder={`${t(`social_${row.platform}`)} — ${t('social_placeholder')}`}
                                        aria-label={t(`social_${row.platform}`)}
                                        dir="ltr"
                                    />
                                </div>
                                {/* اینستاگرام و تلگرام ردیف‌های پیش‌فرض‌اند و بعد از ذخیره برمی‌گردند؛ دکمه حذف فقط برای بقیه معنا دارد */}
                                {!DEFAULT_SOCIAL.includes(row.platform) && (
                                    <button
                                        type="button"
                                        className={styles.socialRemoveBtn}
                                        onClick={() => removeSocialRow(row.platform)}
                                        disabled={saving}
                                        aria-label={t('remove_social')}
                                        title={t('remove_social')}
                                    >
                                        <LuTrash2 size={15} />
                                    </button>
                                )}
                            </div>
                        ))}

                        {remainingSocial.length > 0 && (
                            <label className={styles.addSocialSelect}>
                                <LuPlus size={15} />
                                <span>{t('add_social_network')}</span>
                                <select
                                    value=""
                                    disabled={saving}
                                    aria-label={t('add_social_network')}
                                    onChange={(event) => {
                                        const next = event.target.value as SocialPlatform;
                                        if (SOCIAL_PLATFORMS.includes(next)) addSocialRow(next);
                                    }}
                                >
                                    <option value="">{t('add_social_network')}</option>
                                    {remainingSocial.map((platform) => (
                                        <option key={platform} value={platform}>
                                            {t(`social_${platform}`)}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        )}
                    </div>
                </div>

                <div className={styles.formActions}>
                    <button type="submit" className={styles.saveBtn} disabled={saving || uploadingAvatar}>
                        {saving ? tc('saving') : t('save_profile')}
                    </button>
                </div>
            </form>

            <div className={styles.verificationEmbed}>
                <VerificationSettingsPanel accountFullName={fullName} />
            </div>

            <div className={styles.deleteAccountSection}>
                <div>
                    <div className={styles.deleteTitle}>{t('delete_account')}</div>
                    <p className={styles.deleteDescription}>{t('delete_account_desc')}</p>
                </div>
                <button
                    type="button"
                    className={styles.deleteBtn}
                    onClick={() => setDeleteOpen(true)}
                    disabled={deleting || saving}
                >
                    {t('delete_permanent')}
                </button>
            </div>

            <ModalHelper
                open={deleteOpen}
                onClose={() => { if (!deleting) setDeleteOpen(false); }}
                size="sm"
                sheetTitle={t('delete_account')}
                closeOnOverlayClick={!deleting}
                component={deleteOpen ? (
                    <>
                        <ModalHeader>{t('delete_account')}</ModalHeader>
                        <ModalBody>
                            <p className={styles.deleteConfirmText}>{t('delete_confirm')}</p>
                        </ModalBody>
                        <ModalFooter>
                            <button
                                type="button"
                                className={styles.secondaryBtn}
                                onClick={() => setDeleteOpen(false)}
                                disabled={deleting}
                            >
                                {tc('cancel')}
                            </button>
                            <button
                                type="button"
                                className={styles.dangerBtn}
                                onClick={() => void handleDeleteAccount()}
                                disabled={deleting}
                            >
                                {deleting ? tc('deleting') : t('delete_permanent')}
                            </button>
                        </ModalFooter>
                    </>
                ) : null}
            />
        </div>
    );
}
